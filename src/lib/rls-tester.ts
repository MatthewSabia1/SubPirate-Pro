import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

/**
 * Utility for testing Row-Level Security policies.
 * This tool allows you to impersonate different users and run queries to verify
 * that RLS policies are working correctly.
 */
export class RLSTester {
  private adminClient: SupabaseClient<Database>;
  private userClient: SupabaseClient<Database> | null = null;
  private currentUserId: string | null = null;

  /**
   * Create a new RLS tester.
   * @param supabaseUrl The URL of your Supabase instance
   * @param serviceRoleKey The service role key (admin access)
   */
  constructor(
    private supabaseUrl: string,
    private serviceRoleKey: string
  ) {
    this.adminClient = createClient<Database>(supabaseUrl, serviceRoleKey);
  }

  /**
   * Impersonate a user to test RLS policies from their perspective.
   * @param userId The ID of the user to impersonate
   */
  async impersonateUser(userId: string): Promise<void> {
    // Verify the user exists first
    const { data: user, error } = await this.adminClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error(`User with ID ${userId} not found: ${error?.message}`);
    }

    // Create a JWT token with the user's ID
    const { data: tokenData, error: tokenError } = await this.adminClient.rpc(
      'create_impersonation_jwt',
      { user_id: userId }
    );

    if (tokenError || !tokenData) {
      throw new Error(`Failed to create impersonation token: ${tokenError?.message}`);
    }

    // Create a new client with the JWT token
    this.userClient = createClient<Database>(
      this.supabaseUrl,
      this.serviceRoleKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${tokenData.token}`,
          },
        },
      }
    );

    this.currentUserId = userId;
    console.log(`Now impersonating user: ${userId}`);
  }

  /**
   * Test if a user can access their own projects.
   */
  async testUserProjects(): Promise<{
    success: boolean;
    userProjects: any[];
    allProjects: any[];
  }> {
    if (!this.userClient || !this.currentUserId) {
      throw new Error('No user is being impersonated. Call impersonateUser() first.');
    }

    // Get all projects as admin
    const { data: allProjects } = await this.adminClient
      .from('projects')
      .select('*');

    // Get projects as the impersonated user
    const { data: userProjects, error } = await this.userClient
      .from('projects')
      .select('*');

    if (error) {
      console.error('Error testing user projects:', error);
      return { success: false, userProjects: [], allProjects: allProjects || [] };
    }

    // Verify that the user can only see their own projects
    const expectedProjects = (allProjects || []).filter(
      (project) => project.user_id === this.currentUserId
    );

    const success = JSON.stringify(userProjects?.map(p => p.id).sort()) === 
                   JSON.stringify(expectedProjects.map(p => p.id).sort());

    return {
      success,
      userProjects: userProjects || [],
      allProjects: allProjects || [],
    };
  }

  /**
   * Test if a user can access shared projects.
   */
  async testSharedProjects(): Promise<{
    success: boolean;
    sharedProjects: any[];
    expectedSharedProjects: any[];
  }> {
    if (!this.userClient || !this.currentUserId) {
      throw new Error('No user is being impersonated. Call impersonateUser() first.');
    }

    // Get projects where the user is a member
    const { data: memberships } = await this.adminClient
      .from('project_members')
      .select('project_id')
      .eq('user_id', this.currentUserId);

    const sharedProjectIds = (memberships || []).map((m) => m.project_id);

    // Get these projects as admin to compare
    const { data: expectedSharedProjects } = await this.adminClient
      .from('projects')
      .select('*')
      .in('id', sharedProjectIds);

    // Get all projects as the impersonated user
    const { data: userProjects, error } = await this.userClient
      .from('projects')
      .select('*');

    if (error) {
      console.error('Error testing shared projects:', error);
      return { 
        success: false, 
        sharedProjects: [], 
        expectedSharedProjects: expectedSharedProjects || [] 
      };
    }

    // Filter to only the shared projects
    const sharedProjects = (userProjects || []).filter(
      (project) => project.user_id !== this.currentUserId
    );

    // Verify that all expected shared projects are accessible
    const success = sharedProjectIds.every((id) =>
      sharedProjects.some((p) => p.id === id)
    );

    return {
      success,
      sharedProjects,
      expectedSharedProjects: expectedSharedProjects || [],
    };
  }

  /**
   * Test a comprehensive set of RLS policies for a user.
   */
  async runComprehensiveTests(): Promise<{
    results: Record<string, { success: boolean; details: any }>;
    user: string;
  }> {
    if (!this.userClient || !this.currentUserId) {
      throw new Error('No user is being impersonated. Call impersonateUser() first.');
    }

    const results: Record<string, { success: boolean; details: any }> = {};

    // Test projects access
    const projectsResult = await this.testUserProjects();
    results.projects = {
      success: projectsResult.success,
      details: {
        accessibleCount: projectsResult.userProjects.length,
        ownedCount: projectsResult.allProjects.filter(
          (p) => p.user_id === this.currentUserId
        ).length,
        totalProjectsInSystem: projectsResult.allProjects.length,
      },
    };

    // Test shared projects access
    const sharedProjectsResult = await this.testSharedProjects();
    results.sharedProjects = {
      success: sharedProjectsResult.success,
      details: {
        accessibleSharedCount: sharedProjectsResult.sharedProjects.length,
        expectedSharedCount: sharedProjectsResult.expectedSharedProjects.length,
      },
    };

    // Test project members access
    const { data: ownedProjects } = await this.adminClient
      .from('projects')
      .select('id')
      .eq('user_id', this.currentUserId);

    const ownedProjectIds = (ownedProjects || []).map((p) => p.id);

    const { data: allMembers } = await this.adminClient
      .from('project_members')
      .select('*');

    const { data: userVisibleMembers, error: membersError } = await this.userClient
      .from('project_members')
      .select('*');

    results.projectMembers = {
      success: !membersError,
      details: {
        accessibleCount: userVisibleMembers?.length || 0,
        totalInSystem: allMembers?.length || 0,
        error: membersError?.message,
      },
    };

    return {
      results,
      user: this.currentUserId,
    };
  }

  /**
   * Run RLS tests for multiple users and compare the results.
   * @param userIds Array of user IDs to test
   */
  async testMultipleUsers(userIds: string[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    for (const userId of userIds) {
      await this.impersonateUser(userId);
      results[userId] = await this.runComprehensiveTests();
    }

    return results;
  }
}

/**
 * Create a new RLS tester instance.
 */
export function createRLSTester(
  supabaseUrl: string,
  serviceRoleKey: string
): RLSTester {
  return new RLSTester(supabaseUrl, serviceRoleKey);
}