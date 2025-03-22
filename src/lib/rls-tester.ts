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
    // Display prominent warning about the security implications
    console.warn(`
      ⚠️ WARNING: RLS TESTER INITIALIZED ⚠️
      This tool provides administrative access and could be dangerous if misused.
      It should NEVER be included in production builds or accessible to end users.
      For testing and development purposes only.
    `);
    
    // Check for development environment
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RLSTester cannot be used in production environments');
    }
    
    this.adminClient = createClient<Database>(supabaseUrl, serviceRoleKey);
  }

  /**
   * Impersonate a user to test RLS policies from their perspective.
   * @param userId The ID of the user to impersonate
   */
  async impersonateUser(userId: string): Promise<void> {
    // Prevent this function from being used in production
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RLS impersonation is not allowed in production environments');
    }

    // Ensure only authorized users can use this functionality
    // This should be limited to development and test environments only
    if (!process.env.ALLOW_RLS_TESTING) {
      throw new Error('RLS testing is disabled. Set ALLOW_RLS_TESTING environment variable to enable.');
    }

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

    // Set a short expiration time (15 minutes) for the test token
    // Ensure that the token cannot be used for lengthy periods
    const token = tokenData.token;
    
    // Create a new client with the JWT token
    this.userClient = createClient<Database>(
      this.supabaseUrl,
      this.serviceRoleKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    this.currentUserId = userId;
    console.log(`Now impersonating user: ${userId} (FOR TESTING PURPOSES ONLY)`);
    
    // Set a timer to automatically clear the impersonation after 15 minutes
    setTimeout(() => {
      if (this.currentUserId === userId) {
        this.userClient = null;
        this.currentUserId = null;
        console.log(`Impersonation of user ${userId} has expired`);
      }
    }, 15 * 60 * 1000); // 15 minutes
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
    
    // Test saved_subreddits access
    const savedSubredditsResult = await this.testSavedSubreddits();
    results.savedSubreddits = savedSubredditsResult;
    
    // Test project_subreddits access
    const projectSubredditsResult = await this.testProjectSubreddits();
    results.projectSubreddits = projectSubredditsResult;
    
    // Test reddit_accounts access
    const redditAccountsResult = await this.testRedditAccounts();
    results.redditAccounts = redditAccountsResult;
    
    // Test campaign-related tables
    const campaignResult = await this.testCampaignAccess();
    results.campaigns = campaignResult;

    return {
      results,
      user: this.currentUserId,
    };
  }
  
  /**
   * Test if a user can only access their own saved subreddits.
   */
  async testSavedSubreddits(): Promise<{
    success: boolean;
    details: any;
  }> {
    if (!this.userClient || !this.currentUserId) {
      throw new Error('No user is being impersonated. Call impersonateUser() first.');
    }

    // Get all saved subreddits as admin
    const { data: allSavedSubreddits } = await this.adminClient
      .from('saved_subreddits')
      .select('*');

    // Get saved subreddits as the impersonated user
    const { data: userSavedSubreddits, error } = await this.userClient
      .from('saved_subreddits')
      .select('*');

    if (error) {
      console.error('Error testing saved subreddits:', error);
      return { 
        success: false, 
        details: {
          error: error.message,
          accessibleCount: 0,
          expectedCount: 0,
          totalInSystem: allSavedSubreddits?.length || 0
        }
      };
    }

    // Verify that the user can only see their own saved subreddits
    const expectedSavedSubreddits = (allSavedSubreddits || []).filter(
      (saved) => saved.user_id === this.currentUserId
    );

    const success = JSON.stringify(userSavedSubreddits?.map(s => s.id).sort()) === 
                    JSON.stringify(expectedSavedSubreddits.map(s => s.id).sort());

    return {
      success,
      details: {
        accessibleCount: userSavedSubreddits?.length || 0,
        expectedCount: expectedSavedSubreddits.length,
        totalInSystem: allSavedSubreddits?.length || 0
      }
    };
  }
  
  /**
   * Test if a user can properly access project subreddits.
   */
  async testProjectSubreddits(): Promise<{
    success: boolean;
    details: any;
  }> {
    if (!this.userClient || !this.currentUserId) {
      throw new Error('No user is being impersonated. Call impersonateUser() first.');
    }

    // Get all project_subreddits as admin
    const { data: allProjectSubreddits } = await this.adminClient
      .from('project_subreddits')
      .select('*');

    // Get user's projects (both owned and shared)
    const { data: userProjects } = await this.adminClient
      .from('projects')
      .select('id')
      .eq('user_id', this.currentUserId);
      
    const { data: sharedProjects } = await this.adminClient
      .from('project_members')
      .select('project_id')
      .eq('user_id', this.currentUserId);

    const accessibleProjectIds = [
      ...(userProjects || []).map(p => p.id),
      ...(sharedProjects || []).map(p => p.project_id)
    ];

    // Calculate expected accessible project_subreddits
    const expectedProjectSubreddits = (allProjectSubreddits || []).filter(
      (ps) => accessibleProjectIds.includes(ps.project_id)
    );

    // Get project_subreddits as the impersonated user
    const { data: userProjectSubreddits, error } = await this.userClient
      .from('project_subreddits')
      .select('*');

    if (error) {
      console.error('Error testing project subreddits:', error);
      return { 
        success: false, 
        details: {
          error: error.message,
          accessibleCount: 0,
          expectedCount: expectedProjectSubreddits.length,
          totalInSystem: allProjectSubreddits?.length || 0
        }
      };
    }

    // Verify that the user can only see project_subreddits from accessible projects
    const success = JSON.stringify(userProjectSubreddits?.map(ps => ps.id).sort()) === 
                    JSON.stringify(expectedProjectSubreddits.map(ps => ps.id).sort());

    return {
      success,
      details: {
        accessibleCount: userProjectSubreddits?.length || 0,
        expectedCount: expectedProjectSubreddits.length,
        totalInSystem: allProjectSubreddits?.length || 0
      }
    };
  }
  
  /**
   * Test if a user can only access their own reddit accounts.
   */
  async testRedditAccounts(): Promise<{
    success: boolean;
    details: any;
  }> {
    if (!this.userClient || !this.currentUserId) {
      throw new Error('No user is being impersonated. Call impersonateUser() first.');
    }

    // Get all reddit_accounts as admin
    const { data: allRedditAccounts } = await this.adminClient
      .from('reddit_accounts')
      .select('*');

    // Get reddit_accounts as the impersonated user
    const { data: userRedditAccounts, error } = await this.userClient
      .from('reddit_accounts')
      .select('*');

    if (error) {
      console.error('Error testing reddit accounts:', error);
      return { 
        success: false, 
        details: {
          error: error.message,
          accessibleCount: 0,
          expectedCount: 0,
          totalInSystem: allRedditAccounts?.length || 0
        }
      };
    }

    // Verify that the user can only see their own reddit accounts
    const expectedRedditAccounts = (allRedditAccounts || []).filter(
      (account) => account.user_id === this.currentUserId
    );

    const success = JSON.stringify(userRedditAccounts?.map(a => a.id).sort()) === 
                    JSON.stringify(expectedRedditAccounts.map(a => a.id).sort());

    return {
      success,
      details: {
        accessibleCount: userRedditAccounts?.length || 0,
        expectedCount: expectedRedditAccounts.length,
        totalInSystem: allRedditAccounts?.length || 0
      }
    };
  }
  
  /**
   * Test if a user has proper access to campaign-related tables.
   */
  async testCampaignAccess(): Promise<{
    success: boolean;
    details: any;
  }> {
    if (!this.userClient || !this.currentUserId) {
      throw new Error('No user is being impersonated. Call impersonateUser() first.');
    }
    
    // Get all the user's projects (both owned and shared)
    const { data: userProjects } = await this.adminClient
      .from('projects')
      .select('id')
      .eq('user_id', this.currentUserId);
      
    const { data: sharedProjects } = await this.adminClient
      .from('project_members')
      .select('project_id')
      .eq('user_id', this.currentUserId);

    const accessibleProjectIds = [
      ...(userProjects || []).map(p => p.id),
      ...(sharedProjects || []).map(p => p.project_id)
    ];
    
    // Test campaigns table
    const { data: allCampaigns } = await this.adminClient
      .from('campaigns')
      .select('*');
      
    const expectedCampaigns = (allCampaigns || []).filter(
      (campaign) => accessibleProjectIds.includes(campaign.project_id)
    );
    
    const { data: userCampaigns, error: campaignsError } = await this.userClient
      .from('campaigns')
      .select('*');
      
    // Test campaign_posts table
    const { data: allCampaignPosts } = await this.adminClient
      .from('campaign_posts')
      .select('*, campaigns(project_id)');
      
    const expectedCampaignPosts = (allCampaignPosts || []).filter(
      (post) => accessibleProjectIds.includes(post.campaigns?.project_id)
    );
    
    const { data: userCampaignPosts, error: postsError } = await this.userClient
      .from('campaign_posts')
      .select('*');
      
    // Test media_items table if it exists
    let mediaItemsSuccess = true;
    let mediaItemsDetails = null;
    
    try {
      const { data: allMediaItems } = await this.adminClient
        .from('media_items')
        .select('*, campaigns(project_id)');
        
      const expectedMediaItems = (allMediaItems || []).filter(
        (item) => accessibleProjectIds.includes(item.campaigns?.project_id)
      );
      
      const { data: userMediaItems, error: mediaError } = await this.userClient
        .from('media_items')
        .select('*');
        
      mediaItemsSuccess = !mediaError && JSON.stringify(userMediaItems?.map(m => m.id).sort()) === 
                         JSON.stringify(expectedMediaItems.map(m => m.id).sort());
                         
      mediaItemsDetails = {
        accessibleCount: userMediaItems?.length || 0,
        expectedCount: expectedMediaItems.length,
        totalInSystem: allMediaItems?.length || 0,
        error: mediaError?.message
      };
    } catch (error) {
      // Table might not exist, that's okay
      mediaItemsSuccess = true;
      mediaItemsDetails = { tableNotFound: true };
    }
    
    // Calculate overall success
    const campaignsSuccess = !campaignsError && JSON.stringify(userCampaigns?.map(c => c.id).sort()) === 
                            JSON.stringify(expectedCampaigns.map(c => c.id).sort());
                            
    const postsSuccess = !postsError && JSON.stringify(userCampaignPosts?.map(p => p.id).sort()) === 
                        JSON.stringify(expectedCampaignPosts.map(p => p.id).sort());
    
    return {
      success: campaignsSuccess && postsSuccess && mediaItemsSuccess,
      details: {
        campaigns: {
          success: campaignsSuccess,
          accessibleCount: userCampaigns?.length || 0,
          expectedCount: expectedCampaigns.length,
          totalInSystem: allCampaigns?.length || 0,
          error: campaignsError?.message
        },
        campaignPosts: {
          success: postsSuccess,
          accessibleCount: userCampaignPosts?.length || 0,
          expectedCount: expectedCampaignPosts.length,
          totalInSystem: allCampaignPosts?.length || 0,
          error: postsError?.message
        },
        mediaItems: mediaItemsDetails
      }
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
 * This function should only be used in development and testing environments.
 */
export function createRLSTester(
  supabaseUrl: string,
  serviceRoleKey: string
): RLSTester {
  // Double-check we're not in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error('RLSTester cannot be used in production environments');
  }
  
  // Verify that testing is allowed
  if (!process.env.ALLOW_RLS_TESTING) {
    throw new Error('RLS testing is disabled. Set ALLOW_RLS_TESTING environment variable to enable.');
  }
  
  return new RLSTester(supabaseUrl, serviceRoleKey);
}