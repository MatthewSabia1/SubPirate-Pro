import React, { useState, useEffect, useRef } from 'react';
import { Users, AlertTriangle, Trash2, MessageCircle, Star, Activity, ExternalLink, Upload, X, ChevronDown, ChevronUp, Calendar, Shield, BadgeCheck, ArrowLeftRight, EyeOff, ImageOff, RefreshCcw, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { redditService, SubredditPost } from '../lib/redditService';
import { syncRedditAccountPosts } from '../lib/redditSync';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import RedditImage from '../components/RedditImage';
import { useNavigate } from 'react-router-dom';
import { getRedditPostShareLink } from '../lib/reddit';
import { getGeneratedAvatarUrl, getAccountAvatarUrl } from '../lib/redditOAuth';
import { getCachedPosts, cachePosts, hasFreshCache, getCacheAge, clearCache } from '../lib/postCache';

interface RedditAccount {
  id: string;
  username: string;
  karma_score?: number;
  link_karma?: number;
  comment_karma?: number;
  awardee_karma?: number;
  awarder_karma?: number;
  total_karma?: number;
  total_posts?: number;
  posts_today: number;
  avatar_url?: string;
  is_gold?: boolean;
  is_mod?: boolean;
  verified?: boolean;
  has_verified_email?: boolean;
  created_utc?: string;
  last_post_check: string;
  last_karma_check: string;
  refreshing?: boolean;
  posts?: {
    recent: SubredditPost[];
    top: SubredditPost[];
  };
}

function RedditAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<RedditAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<RedditAccount | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState<string | null>(null);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'recent' | 'top'>('recent');
  const [loadingPosts, setLoadingPosts] = useState(false);
  const initialLoadRef = useRef(false);

  // Refresh single account data
  const refreshAccountData = async (account: RedditAccount, isUserTriggered: boolean = false) => {
    if (!account || account.refreshing) return;
    
    // Skip refresh for currently viewed account unless explicitly requested by user
    if (!isUserTriggered && expandedAccount === account.id) {
      return;
    }

    // Clear cache if user manually triggered refresh
    if (isUserTriggered) {
      clearCache(account.id);
    }

    setAccounts(prev => prev.map(a => 
      a.id === account.id ? { ...a, refreshing: true } : a
    ));

    try {
      // Get user info from Reddit API
      const userInfo = await redditService.getUserInfo(account.username);
      
      // Get posts using the redditService with different sort orders
      const [recentPosts, topPosts] = await Promise.all([
        redditService.getUserPosts(account.username, 'new'),
        redditService.getUserPosts(account.username, 'top')
      ]);
      
      // Calculate posts made in the last 24 hours (for display only)
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const postsToday = recentPosts.filter(p => new Date(p.created_utc * 1000) >= oneDayAgo).length;

      // Update database
      const { error } = await supabase
        .from('reddit_accounts')
        .update({
          karma_score: userInfo?.total_karma || 0,
          avatar_url: userInfo?.avatar_url || null,
          total_posts: recentPosts.length,
          posts_today: postsToday,
          last_karma_check: new Date().toISOString(),
          last_post_check: new Date().toISOString()
        })
        .eq('id', account.id);

      if (error) throw error;

      const posts = {
        recent: recentPosts,
        top: topPosts
      };
      
      // Store the posts in cache
      cachePosts(account.id, posts);

      // Update local state
      setAccounts(prev => prev.map(a => 
        a.id === account.id ? { 
          ...a, 
          refreshing: false,
          karma_score: userInfo?.total_karma || 0,
          avatar_url: userInfo?.avatar_url || null,
          total_posts: recentPosts.length,
          posts_today: postsToday,
          last_karma_check: new Date().toISOString(),
          last_post_check: new Date().toISOString(),
          posts: posts
        } : a
      ));
    } catch (err) {
      console.error(`Error refreshing data for ${account.username}:`, err);
      setAccounts(prev => prev.map(a => 
        a.id === account.id ? { ...a, refreshing: false } : a
      ));
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);
  
  // Refresh all accounts when component mounts
  useEffect(() => {
    // Only run this effect if we have accounts and haven't done the initial load yet
    if (accounts.length > 0 && !initialLoadRef.current) {
      // Set the flag so this only runs once
      initialLoadRef.current = true;
      console.log(`Starting batch refresh for ${accounts.length} accounts on initial load`);
      // Process 2 accounts at a time
      batchProcessAccounts(accounts, 2);
    }
  }, [accounts.length]);

  // Process accounts in batches to avoid rate limiting
  const batchProcessAccounts = (accountsToProcess: RedditAccount[], batchSize: number = 2) => {
    if (accountsToProcess.length === 0) return;
    
    const processNextBatch = async (startIndex: number) => {
      if (startIndex >= accountsToProcess.length) return;
      
      const endIndex = Math.min(startIndex + batchSize, accountsToProcess.length);
      const currentBatch = accountsToProcess.slice(startIndex, endIndex);
      
      console.log(`Processing batch of ${currentBatch.length} accounts (${startIndex+1}-${endIndex} of ${accountsToProcess.length})`);
      
      // Process current batch
      await Promise.all(
        currentBatch.map(account => {
          // Skip the account if it's currently being viewed by the user
          if (expandedAccount === account.id) {
            console.log(`Skipping batch refresh for account ${account.username} as it's currently being viewed`);
            return Promise.resolve();
          }
          
          return syncRedditAccountPosts(account.id)
            .then(() => refreshAccountData(account))
            .catch(err => console.error(`Error processing account ${account.username}:`, err));
        })
      );
      
      // Add a delay between batches to avoid rate limiting
      setTimeout(() => {
        processNextBatch(endIndex);
      }, 3000); // 3 second delay between batches
    };
    
    // Start processing from the first batch
    processNextBatch(0);
  };

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('reddit_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAccounts(data || []);
      
      // Don't immediately fetch additional data here
      // Let the batchProcessAccounts handle it after initial render
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to load Reddit accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    if (connecting) return;

    setConnecting(true);
    setAddError(null);

    try {
      // Generate a random state string for security
      const state = Math.random().toString(36).substring(7);
      
      // Store state in session storage to verify on callback
      sessionStorage.setItem('reddit_oauth_state', state);

      // Construct the OAuth URL with expanded scopes
      const params = new URLSearchParams({
        client_id: import.meta.env.VITE_REDDIT_APP_ID,
        response_type: 'code',
        state,
        redirect_uri: `${window.location.origin}/auth/reddit/callback`,
        duration: 'permanent',
        scope: [
          'identity',
          'read',
          'submit',
          'subscribe',
          'history',
          'mysubreddits',
          'privatemessages',
          'save',
          'vote',
          'edit',
          'flair',
          'report'
        ].join(' ')
      });

      // Redirect to Reddit's OAuth page
      window.location.href = `https://www.reddit.com/api/v1/authorize?${params}`;
    } catch (err) {
      console.error('Error initiating Reddit OAuth:', err);
      setAddError(err instanceof Error ? err.message : 'Failed to connect Reddit account');
      setConnecting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteAccount) return;

    try {
      // Delete avatar if exists and is a valid URL
      if (deleteAccount.avatar_url && typeof deleteAccount.avatar_url === 'string') {
        const avatarPath = deleteAccount.avatar_url.split('/').slice(-2).join('/');
        await supabase.storage
          .from('user_images')
          .remove([avatarPath]);
      }

      // Delete account
      const { error } = await supabase
        .from('reddit_accounts')
        .delete()
        .eq('id', deleteAccount.id);

      if (error) throw error;
      setAccounts(prev => prev.filter(a => a.id !== deleteAccount.id));
      setDeleteAccount(null);
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Failed to delete Reddit account');
    }
  };

  const handleAvatarUpload = async (accountId: string, file: File) => {
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be smaller than 2MB');
      return;
    }

    setUploadingAvatar(accountId);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/reddit_accounts/${accountId}/${Date.now()}.${fileExt}`;

      const account = accounts.find(a => a.id === accountId);
      if (account?.avatar_url) {
        const oldPath = account.avatar_url.split('/user_images/')[1];
        await supabase.storage
          .from('user_images')
          .remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('user_images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user_images')
        .getPublicUrl(fileName);

      // Update account
      const { error: updateError } = await supabase
        .from('reddit_accounts')
        .update({ avatar_url: publicUrl })
        .eq('id', accountId);

      if (updateError) throw updateError;

      // Update local state
      setAccounts(prev => prev.map(a => 
        a.id === accountId ? { ...a, avatar_url: publicUrl } : a
      ));
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError('Failed to upload avatar');
    } finally {
      setUploadingAvatar(null);
    }
  };

  const handleDeleteAvatar = async (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account?.avatar_url) return;

    try {
      setUploadingAvatar(accountId);

      const filePath = account.avatar_url.split('/user_images/')[1];
      const { error: deleteError } = await supabase.storage
        .from('user_images')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase
        .from('reddit_accounts')
        .update({ avatar_url: undefined })
        .eq('id', accountId);

      if (updateError) throw updateError;

      setAccounts(prev => prev.map(a => 
        a.id === accountId ? { ...a, avatar_url: undefined } : a
      ));
    } catch (err) {
      console.error('Error deleting avatar:', err);
      setError('Failed to delete avatar');
    } finally {
      setUploadingAvatar(null);
    }
  };

  const loadAccountPosts = async (account: RedditAccount) => {
    if (loadingPosts) return;
    
    try {
      setLoadingPosts(true);
      
      // First, check if we have fresh cached posts
      const cachedPosts = getCachedPosts(account.id);
      
      if (cachedPosts) {
        console.log(`Using cached posts for ${account.username} (${getCacheAge(account.id)})`);
        
        // Update the account in state with the cached posts
        setAccounts(prev => prev.map(a => 
          a.id === account.id ? {
            ...a,
            posts: cachedPosts
          } : a
        ));
        
        return; // Exit early, no need to fetch from API
      }
      
      console.log(`No fresh cache found for ${account.username}, fetching from API...`);
      
      // If no fresh cache, fetch posts using the redditService
      const [recentPosts, topPosts] = await Promise.all([
        redditService.getUserPosts(account.username, 'new'),
        redditService.getUserPosts(account.username, 'top')
      ]);
      
      const posts = {
        recent: recentPosts,
        top: topPosts
      };
      
      // Store the posts in cache
      cachePosts(account.id, posts);
      
      // Update the account in state with the posts
      setAccounts(prev => prev.map(a => 
        a.id === account.id ? {
          ...a,
          posts: posts
        } : a
      ));
    } catch (err) {
      console.error(`Error loading posts for ${account.username}:`, err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const toggleAccountExpansion = async (accountId: string) => {
    if (expandedAccount === accountId) {
      setExpandedAccount(null);
      setActiveTab('recent');
      return;
    }

    setExpandedAccount(accountId);
    setActiveTab('recent');
    const account = accounts.find(a => a.id === accountId);
    
    if (account) {
      // Check if we have posts data already in memory
      if (account.posts) {
        console.log(`Using in-memory posts data for ${account.username}`);
        return; // Use existing data in memory
      }
      
      // Load posts (this function already checks cache first)
      await loadAccountPosts(account);
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading Reddit accounts...</div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-[1200px] mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2">Reddit Accounts</h1>
            <p className="text-gray-400">
              Connect and manage your Reddit accounts
            </p>
          </div>
          <button
            onClick={handleAddAccount}
            disabled={connecting}
            className={`bg-orange-600 hover:bg-orange-500 text-white font-medium py-2 px-4 rounded flex items-center space-x-2 transition-colors ${
              connecting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {connecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Users size={20} />
                <span>Connect Reddit Account</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-900/30 text-red-400 rounded-lg flex items-center gap-2">
            <AlertTriangle size={20} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {addError && (
          <div className="bg-red-900/50 text-red-100 p-4 rounded mb-6">
            {addError}
          </div>
        )}

        {/* Accounts List */}
        <div className="bg-[#0f0f0f] rounded-lg overflow-hidden">
          <div className="hidden md:grid grid-cols-[auto_1fr_120px_120px_120px_80px] gap-4 p-4 border-b border-[#222222] text-sm text-gray-400">
            <div className="pl-2">Account</div>
            <div></div>
            <div className="text-center">Karma</div>
            <div className="text-center">Total Posts</div>
            <div className="text-center">Posts Today</div>
            <div className="text-right pr-2">Actions</div>
          </div>

          <div className="divide-y divide-[#222222]">
            {accounts.map((account) => (
              <div 
                key={account.id}
                className="md:grid md:grid-cols-[auto_1fr_120px_120px_120px_80px] gap-4 p-4 hover:bg-[#1A1A1A] transition-colors"
              >
                <div className="relative group">
                  <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] overflow-hidden">
                    <RedditImage 
                      src={getAccountAvatarUrl(account)}
                      alt={`u/${account.username}`}
                      className="w-full h-full object-cover"
                      fallbackSrc={getGeneratedAvatarUrl(account.username)}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAvatarUpload(account.id, file);
                          }}
                          disabled={uploadingAvatar === account.id}
                        />
                        <Upload 
                          size={16} 
                          className="text-white hover:text-[#C69B7B] transition-colors"
                        />
                      </label>
                      {account.avatar_url && (
                        <button
                          onClick={() => handleDeleteAvatar(account.id)}
                          className="text-white hover:text-red-400 transition-colors"
                          disabled={uploadingAvatar === account.id}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    {uploadingAvatar === account.id && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="animate-spin text-lg">⚬</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <a 
                    href={`https://reddit.com/user/${account.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[15px] hover:text-[#C69B7B] transition-colors inline-flex items-center gap-2 mb-1"
                  >
                    u/{account.username}
                    {account.is_gold && (
                      <span className="text-amber-400" title="Reddit Premium">
                        <Star size={14} />
                      </span>
                    )}
                    {account.is_mod && (
                      <span className="text-green-400" title="Moderator">
                        <Shield size={14} />
                      </span>
                    )}
                    {account.verified && (
                      <span className="text-blue-400" title="Verified">
                        <BadgeCheck size={14} />
                      </span>
                    )}
                    <ExternalLink size={14} className="text-gray-400" />
                  </a>
                  <div className="flex items-center gap-4 md:hidden mt-2">
                    <div className="flex items-center gap-1 text-amber-400" title="Total Karma">
                      <Star size={14} />
                      <span className="text-sm">{account.total_karma || account.karma_score || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400" title="Total Posts">
                      <MessageCircle size={14} />
                      <span className="text-sm">{account.total_posts || '—'}</span>
                    </div>
                    <div className={`flex items-center gap-1 ${(account.posts_today ?? 0) > 0 ? 'text-emerald-400' : 'text-gray-400'}`} title="Posts Today">
                      <Activity size={14} />
                      <span className="text-sm">{account.posts_today ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex items-center justify-center gap-1 text-amber-400" title={`Link: ${account.link_karma || 0}\nComment: ${account.comment_karma || 0}\nAwardee: ${account.awardee_karma || 0}\nAwarder: ${account.awarder_karma || 0}`}>
                  <Star size={16} />
                  <span>{account.total_karma || account.karma_score || '—'}</span>
                </div>

                <div className="hidden md:flex items-center justify-center gap-1 text-gray-400">
                  <MessageCircle size={16} />
                  <span>{account.total_posts || '—'}</span>
                </div>

                <div className={`hidden md:flex items-center justify-center gap-1 ${(account.posts_today ?? 0) > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                  <Activity size={16} />
                  <span>{account.posts_today ?? 0}</span>
                </div>

                <div className="absolute md:static top-4 right-4">
                  <button
                    onClick={() => toggleAccountExpansion(account.id)}
                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"
                    title={expandedAccount === account.id ? "Hide Posts" : "Show Posts"}
                  >
                    {expandedAccount === account.id ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteAccount(account)}
                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"
                    title="Remove Account"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                {/* Expanded Posts Section */}
                {expandedAccount === account.id && (
                  <div className="col-span-6 border-t border-[#222222] bg-[#0f0f0f] mt-4 -mx-4 px-4">
                    {/* Tabs */}
                    <div className="flex gap-4 py-4">
                      <button
                        onClick={() => setActiveTab('recent')}
                        className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${
                          activeTab === 'recent'
                            ? 'bg-[#C69B7B] text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Most Recent
                      </button>
                      <button
                        onClick={() => setActiveTab('top')}
                        className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${
                          activeTab === 'top'
                            ? 'bg-[#C69B7B] text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Top Posts
                      </button>
                      <button
                        onClick={() => refreshAccountData(account, true)}
                        disabled={account.refreshing}
                        className={`text-sm px-3 py-1 rounded-full flex items-center gap-2 transition-colors
                          ${account.refreshing 
                            ? 'bg-gray-800 text-gray-400 cursor-not-allowed' 
                            : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
                          }`}
                      >
                        <RefreshCcw size={14} className={account.refreshing ? 'animate-spin' : ''} />
                        {account.refreshing ? 'Refreshing...' : 'Refresh'}
                      </button>
                      {hasFreshCache(account.id) && (
                        <div className="text-xs text-gray-500 flex items-center ml-auto">
                          <Clock size={12} className="mr-1" />
                          Data from {getCacheAge(account.id)}
                        </div>
                      )}
                    </div>

                    {/* Posts List */}
                    {loadingPosts ? (
                      <div className="py-8 text-center text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#C69B7B] mx-auto mb-4"></div>
                        <p>Loading posts...</p>
                      </div>
                    ) : account.posts ? (
                      account.posts[activeTab].length > 0 ? (
                        <div className="divide-y divide-[#222222]">
                          {account.posts[activeTab].map((post) => (
                            <div key={post.id} className="py-4 hover:bg-[#111111] transition-colors">
                              <div className="flex items-start gap-4">
                                {(post.preview_url || post.thumbnail) ? (
                                  <RedditImage 
                                    src={post.preview_url || post.thumbnail || getAccountAvatarUrl(account)}
                                    alt=""
                                    className="w-20 h-20 rounded-md object-cover bg-[#111111]"
                                    fallbackSrc={getGeneratedAvatarUrl(account.username)}
                                  />
                                ) : (
                                  <div className="w-20 h-20 rounded-md bg-[#111111] flex items-center justify-center">
                                    <RedditImage 
                                      src={getAccountAvatarUrl(account)}
                                      alt=""
                                      className="w-12 h-12"
                                      fallbackSrc={getGeneratedAvatarUrl(account.username)}
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <a
                                    href={`https://reddit.com${post.url.startsWith('/r/') ? '' : '/r/' + post.subreddit}/comments/${post.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[15px] font-medium hover:text-[#C69B7B] transition-colors line-clamp-2 mb-2"
                                  >
                                    {post.title}
                                  </a>
                                  <div className="flex items-center gap-4 text-sm text-gray-400">
                                    <div className="flex items-center gap-1">
                                      <Users size={14} />
                                      <span>{post.score} points</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MessageCircle size={14} />
                                      <span>{post.num_comments} comments</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Calendar size={14} />
                                      <span>{formatDate(post.created_utc)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-gray-400">
                          <p>No {activeTab === 'recent' ? 'recent' : 'top'} posts found</p>
                          <p className="text-sm mt-2">Try refreshing the data or checking another tab</p>
                        </div>
                      )
                    ) : (
                      <div className="py-8 text-center text-gray-400">
                        <AlertTriangle size={24} className="mx-auto mb-4" />
                        <p>Failed to load posts</p>
                        <button 
                          onClick={() => refreshAccountData(account, true)}
                          className="mt-4 px-4 py-2 bg-[#1A1A1A] hover:bg-[#252525] rounded text-sm"
                        >
                          Try Again
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {accounts.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                No Reddit accounts connected yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteAccount}
        onClose={() => setDeleteAccount(null)}
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-1">Remove Reddit Account</h2>
          <p className="text-gray-400 text-sm mb-6">
            Are you sure you want to remove u/{deleteAccount?.username}? This action cannot be undone.
          </p>

          <div className="flex gap-2">
            <button 
              onClick={handleDeleteAccount}
              className="primary flex-1 text-sm md:text-base"
            >
              Remove Account
            </button>
            <button 
              onClick={() => setDeleteAccount(null)}
              className="secondary text-sm md:text-base"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default RedditAccounts;