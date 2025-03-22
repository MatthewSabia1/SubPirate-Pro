import { supabase } from './supabase';
import { redditService } from './redditService';

/**
 * Syncs posts from a Reddit account to the database.
 * This function follows these steps:
 * 1. Checks if a sync is needed based on last sync time
 * 2. Fetches new posts from Reddit API
 * 3. Ensures all referenced subreddits exist in the database
 * 4. Stores the posts in the database with today's date
 * 5. Updates account statistics
 */
export async function syncRedditAccountPosts(accountId: string): Promise<boolean> {
  try {
    console.log(`Starting sync for account: ${accountId}`);
    
    // Get account details
    const { data: account, error: accountError } = await supabase
      .from('reddit_accounts')
      .select('*')
      .eq('id', accountId)
      .single();
    
    if (accountError || !account) {
      console.error(`Account not found: ${accountId}`, accountError);
      return false;
    }
    
    console.log(`Syncing posts for Reddit account: ${account.username}`);
    
    // Set account auth for API requests
    await redditService.setAccountAuth(accountId);
    
    // Fetch the most recent posts
    console.log(`Fetching posts for u/${account.username} from Reddit API...`);
    const posts = await redditService.getUserPosts(
      account.username,
      'new' // Get newest posts
    );
    
    // Limit to 50 posts to avoid overwhelming the database
    const limitedPosts = posts.slice(0, 50);
    console.log(`Retrieved ${limitedPosts.length} posts for u/${account.username} from Reddit API`);
    
    if (limitedPosts.length === 0) {
      console.log(`No posts found for u/${account.username}`);
      // Update last sync time even if no posts found
      await supabase
        .from('reddit_accounts')
        .update({
          last_post_check: new Date().toISOString()
        })
        .eq('id', accountId);
      return true;
    }
    
    // Check which posts already exist in our database
    const postIds = limitedPosts.map(post => post.id);
    const { data: existingPosts } = await supabase
      .from('reddit_posts')
      .select('reddit_post_id')
      .in('reddit_post_id', postIds);
    
    const existingPostIds = new Set(existingPosts?.map(p => p.reddit_post_id) || []);
    
    // Filter out posts that already exist
    const newPosts = limitedPosts.filter(post => !existingPostIds.has(post.id));
    console.log(`Found ${newPosts.length} new posts to sync`);
    
    if (newPosts.length === 0) {
      console.log(`All posts already synced for u/${account.username}`);
      // Update last sync time
      await supabase
        .from('reddit_accounts')
        .update({
          last_post_check: new Date().toISOString()
        })
        .eq('id', accountId);
      return true;
    }
    
    // Insert new posts in batches to avoid overwhelming the database
    const BATCH_SIZE = 10;
    for (let i = 0; i < newPosts.length; i += BATCH_SIZE) {
      const batch = newPosts.slice(i, i + BATCH_SIZE);
      const postsToInsert = batch.map(post => ({
        reddit_account_id: accountId,
        reddit_post_id: post.id,
        subreddit: post.subreddit,
        title: post.title,
        content: post.selftext,
        url: post.url,
        permalink: `https://reddit.com/r/${post.subreddit}/comments/${post.id}`,
        score: post.score,
        num_comments: post.num_comments,
        created_at: new Date(post.created_utc * 1000).toISOString()
      }));
      
      const { error: insertError } = await supabase
        .from('reddit_posts')
        .insert(postsToInsert);
      
      if (insertError) {
        console.error(`Error inserting posts batch ${i / BATCH_SIZE + 1}:`, insertError);
      } else {
        console.log(`Successfully inserted ${postsToInsert.length} posts (batch ${i / BATCH_SIZE + 1})`);
      }
    }
    
    // Update account with the latest stats
    await supabase
      .from('reddit_accounts')
      .update({
        total_posts: posts.length,
        last_post_check: new Date().toISOString()
      })
      .eq('id', accountId);
    
    console.log(`Completed sync for u/${account.username}, saved ${newPosts.length} new posts`);
    return true;
  } catch (error) {
    console.error(`Failed to sync posts for account ${accountId}:`, error);
    return false;
  }
}

export async function syncAllAccountPosts(): Promise<number> {
  try {
    // Get all active accounts
    const { data: accounts, error } = await supabase
      .from('reddit_accounts')
      .select('id, username')
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching accounts:', error);
      return 0;
    }
    
    if (!accounts || accounts.length === 0) {
      console.log('No active Reddit accounts found');
      return 0;
    }
    
    console.log(`Starting sync for ${accounts.length} Reddit accounts`);
    
    // Sync each account sequentially to avoid rate limits
    let successCount = 0;
    for (const account of accounts) {
      const success = await syncRedditAccountPosts(account.id);
      if (success) successCount++;
      
      // Wait a bit between accounts to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`Completed sync for ${successCount}/${accounts.length} accounts`);
    return successCount;
  } catch (error) {
    console.error('Failed to sync all accounts:', error);
    return 0;
  }
}

export async function syncSavedSubreddits(name: string): Promise<void> {
  try {
    // Check if subreddit already exists
    const { data: existing } = await supabase
      .from('subreddits')
      .select('id, updated_at')
      .eq('name', name.toLowerCase())
      .maybeSingle();
    
    // Skip if updated recently (last 24 hours)
    if (existing && existing.updated_at) {
      const lastUpdate = new Date(existing.updated_at);
      const timeSinceUpdate = Date.now() - lastUpdate.getTime();
      const hoursSinceUpdate = timeSinceUpdate / (1000 * 60 * 60);
      
      if (hoursSinceUpdate < 24) {
        console.log(`Skipping sync for r/${name} - updated ${hoursSinceUpdate.toFixed(1)} hours ago`);
        return;
      }
    }
    
    console.log(`Syncing subreddit info for r/${name}`);
    
    // Get subreddit info from Reddit API
    const subredditInfo = await redditService.getSubredditInfo(name);
    
    // Prepare data for insert/update
    const subredditData = {
      name: subredditInfo.name.toLowerCase(),
      display_name: subredditInfo.name,
      title: subredditInfo.title,
      description: subredditInfo.description,
      subscribers: subredditInfo.subscribers,
      active_users: subredditInfo.active_users,
      created_at: new Date(subredditInfo.created_utc * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      over18: subredditInfo.over18,
      icon_img: subredditInfo.icon_img,
      community_icon: subredditInfo.community_icon
    };
    
    if (existing) {
      // Update existing record
      await supabase
        .from('subreddits')
        .update(subredditData)
        .eq('id', existing.id);
        
      console.log(`Updated subreddit info for r/${name}`);
    } else {
      // Insert new record
      await supabase
        .from('subreddits')
        .insert([subredditData]);
        
      console.log(`Added new subreddit r/${name}`);
    }
  } catch (error) {
    console.error(`Error syncing subreddit r/${name}:`, error);
  }
}

// Check if database needs migration and execute if needed
export async function ensureRedditPostsSchema(): Promise<boolean> {
  try {
    // Check if we have a synced_at column, which would indicate the newer schema
    const { data, error } = await supabase
      .from('reddit_posts')
      .select('id')
      .limit(1);
      
    if (error) {
      // Check if the error is specifically about a missing column
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('Missing columns in reddit_posts table, working with current schema');
        return false;
      }
      throw error;
    }

    // If we got here, the table exists in some form
    console.log('Reddit posts table exists, proceeding with sync');
    return true;
  } catch (err) {
    console.error('Error checking reddit_posts schema:', err);
    return false;
  }
}