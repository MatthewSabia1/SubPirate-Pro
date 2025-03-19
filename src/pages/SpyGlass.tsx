import React, { useState, useEffect, useRef } from 'react';
import { Search, Telescope, Bookmark, BookmarkPlus, FolderPlus, ChevronDown, ChevronUp, ExternalLink, AlertTriangle, Check, Users, MessageCircle, Calendar, Activity, History } from 'lucide-react';
import { redditApi, SubredditFrequency } from '../lib/redditApi';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProgressBar from '../components/ProgressBar';
import AddToProjectModal from '../components/AddToProjectModal';
import CreateProjectModal from '../components/CreateProjectModal';
import SaveToProjectModal from '../components/SaveToProjectModal';
import FrequentSearches from '../components/FrequentSearches';
import RedditImage from '../components/RedditImage';
import { useCallback } from 'react';
import { getSubredditInfo, getSubredditPosts } from '../lib/reddit';
import { analyzeSubredditData } from '../lib/analysis';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error';
  timestamp: number;
}

interface AnalysisProgress {
  status: string;
  progress: number;
  indeterminate: boolean;
}

interface SaveStatus {
  subreddits: Partial<Record<string, {
    type: 'success' | 'error';
    message: string;
    saving: boolean;
    saved: boolean;
  }>>;
}

function SpyGlass() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [frequencies, setFrequencies] = useState<SubredditFrequency[]>([]);
  const [expandedSubreddit, setExpandedSubreddit] = useState<string | undefined>(undefined);
  const [selectedSubreddit, setSelectedSubreddit] = useState<{id: string; name: string} | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [currentSubreddit, setCurrentSubreddit] = useState<{id: string; name: string} | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ subreddits: {} });
  const [savingAll, setSavingAll] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [notificationQueue, setNotificationQueue] = useState<Notification[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Process notification queue with proper typing
  useEffect(() => {
    const timer = setInterval(() => {
      setNotificationQueue(prev => {
        // Remove notifications older than 3 seconds
        const now = Date.now();
        return prev.filter(n => now - n.timestamp < 3000);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Cleanup save status on unmount
  useEffect(() => {
    return () => {
      setSaveStatus({ subreddits: {} });
      setSavingAll(false);
    };
  }, []);

  // Clear save status when username changes
  useEffect(() => {
    setSaveStatus({ subreddits: {} });
  }, [username]);

  const trackSearch = async (username: string) => {
    try {
      // Get the user's avatar URL from Reddit
      const userInfo = await redditApi.getUserInfo(username);
      const avatarUrl = userInfo?.avatar_url || null;

      // Track the search
      await supabase.rpc('increment_search_count', {
        p_username: username,
        p_avatar_url: avatarUrl
      });
    } catch (err) {
      console.error('Error tracking search:', err);
    }
  };

  const handleAnalyze = async (e: React.FormEvent | Event) => {
    if (e) {
      e.preventDefault();
    }
    
    // Don't proceed if already loading or no username
    if (!username.trim() || loading) return;

    // Set loading state and clear previous data
    setLoading(true);
    setError(null);
    setFrequencies([]);
    setProgress({
      status: 'Validating username...',
      progress: 20,
      indeterminate: false
    });

    try {
      const cleanUsername = redditApi.parseUsername(username.trim());
      if (!cleanUsername) {
        throw new Error('Please enter a valid Reddit username');
      }

      // Track the search after validation
      await trackSearch(cleanUsername);

      setProgress({
        status: 'Fetching user posts...',
        progress: 40,
        indeterminate: false
      });

      // First verify the user exists
      const userResponse = await fetch(`https://www.reddit.com/user/${cleanUsername}/about.json`);
      if (!userResponse.ok) {
        if (userResponse.status === 404) {
          throw new Error(`User ${cleanUsername} not found`);
        } else if (userResponse.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a few minutes.');
        } else if (userResponse.status >= 500) {
          throw new Error('Reddit servers are having issues. Please try again later.');
        }
        throw new Error(`Failed to fetch user data (${userResponse.status})`);
      }

      const posts = await redditApi.getUserPosts(cleanUsername);
      if (!Array.isArray(posts)) {
        throw new Error('Invalid response from Reddit API');
      }
      
      if (posts.length === 0) {
        throw new Error('No posts found for this user');
      }

      setProgress({
        status: 'Analyzing posting patterns...',
        progress: 80,
        indeterminate: false
      });

      // Filter out any posts where subreddit name matches a username pattern
      const validPosts = posts.filter(post => 
        post.subreddit && // ensure subreddit exists
        !post.subreddit.toLowerCase().startsWith('u_') && 
        post.subreddit.toLowerCase() !== cleanUsername.toLowerCase()
      );

      if (validPosts.length === 0) {
        throw new Error('No valid subreddit posts found for analysis');
      }

      const frequencies = await redditApi.analyzePostFrequency(validPosts);
      if (!Array.isArray(frequencies) || frequencies.length === 0) {
        throw new Error('Failed to analyze posting patterns');
      }

      setFrequencies(frequencies);
      addNotification(`Successfully analyzed ${frequencies.length} subreddits`, 'success');

      setProgress({
        status: 'Analysis complete!',
        progress: 100,
        indeterminate: false
      });
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const saveSubreddit = async (subredditName: string) => {
    try {
      if (!user) {
        throw new Error('Please sign in to save subreddits');
      }

      // First check if this subreddit is already saved by the user
      const { data: existingSaved } = await supabase
        .from('saved_subreddits_with_icons')
        .select('*')
        .eq('name', subredditName)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingSaved) {
        setSaveStatus(prev => ({
          subreddits: {
            ...prev.subreddits,
            [subredditName]: {
              type: 'success',
              message: 'Already saved',
              saving: false,
              saved: true
            }
          }
        }));
        return existingSaved;
      }

      // Find the frequency data for this subreddit
      const frequencyData = frequencies.find(f => f.name === subredditName);
      if (!frequencyData) {
        throw new Error('Subreddit data not found in analysis results');
      }

      // Set initial saving state
      setSaveStatus(prev => ({
        subreddits: {
          ...prev.subreddits,
          [subredditName]: {
            type: 'success',
            message: 'Saving to database...',
            saving: true,
            saved: false
          }
        }
      }));

      // Save to database using the existing frequency data
      const { data: savedSubreddit, error: upsertError } = await supabase
        .from('subreddits')
        .upsert({
          name: frequencyData.name,
          subscriber_count: frequencyData.subscribers,
          active_users: frequencyData.active_users,
          marketing_friendly_score: 0, // Will be calculated later during analysis
          posting_requirements: {
            allowedTypes: [],
            restrictions: [],
            recommendations: []
          },
          posting_frequency: {
            postTypes: [],
            timing: [],
            topics: []
          },
          allowed_content: [],
          best_practices: [],
          rules_summary: '',
          last_analyzed_at: new Date().toISOString(),
          icon_img: frequencyData.icon_img,
          community_icon: frequencyData.community_icon
        }, {
          onConflict: 'name',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (upsertError) throw upsertError;
      if (!savedSubreddit) throw new Error('Failed to save subreddit data');

      // Save to user's list if not already saved
      const { error: savedError } = await supabase
        .from('saved_subreddits')
        .upsert({
          subreddit_id: savedSubreddit.id,
          user_id: user.id,
          last_post_at: null
        })
        .select();

      if (savedError) throw savedError;
      return savedSubreddit;
    } catch (err) {
      console.error('Error saving subreddit:', err);
      throw err;
    }
  };

  const clearSaveStatus = useCallback((subredditName: string) => {
    setSaveStatus(prev => {
      const { [subredditName]: removed, ...rest } = prev.subreddits;
      return { subreddits: rest };
    });
  }, []);

  const handleSaveSubreddit = async (subredditName: string) => {
    const key = 'save_' + subredditName;
    if (!user || savingAll || saveStatus.subreddits[key]?.saving) return;

    setSaveStatus(prev => ({
      subreddits: {
        ...prev.subreddits,
        [key]: {
          type: 'success',
          message: 'Starting save...',
          saving: true,
          saved: false
        }
      }
    }));

    try {
      const subreddit = await saveSubreddit(subredditName);
      setCurrentSubreddit({
        id: subreddit.id,
        name: subreddit.name
      });
      setShowSaveModal(true);
      
      setSaveStatus(prev => ({
        subreddits: {
          ...prev.subreddits,
          [key]: {
            type: 'success',
            message: 'Ready to save',
            saving: false,
            saved: true
          }
        }
      }));

      // Clear status after showing modal
      setTimeout(() => {
        setSaveStatus(prev => {
          const { [key]: _, ...rest } = prev.subreddits;
          return { subreddits: rest };
        });
      }, 1000);
    } catch (err) {
      setSaveStatus(prev => ({
        subreddits: {
          ...prev.subreddits,
          [key]: {
            type: 'error',
            message: err instanceof Error ? err.message : 'Failed to save',
            saving: false,
            saved: false
          }
        }
      }));

      // Clear error status after delay
      setTimeout(() => {
        setSaveStatus(prev => {
          const { [key]: _, ...rest } = prev.subreddits;
          return { subreddits: rest };
        });
      }, 3000);
    }
  };

  const handleAddToProject = async (subredditName: string) => {
    const key = 'add_' + subredditName;
    if (!user || savingAll || saveStatus.subreddits[key]?.saving) return;

    setSaveStatus(prev => ({
      subreddits: {
        ...prev.subreddits,
        [key]: {
          type: 'success',
          message: 'Starting addition...',
          saving: true,
          saved: false
        }
      }
    }));
    
    try {
      const subreddit = await saveSubreddit(subredditName);
      setSelectedSubreddit({
        id: subreddit.id,
        name: subreddit.name
      });

      setSaveStatus(prev => ({
        subreddits: {
          ...prev.subreddits,
          [key]: {
            type: 'success',
            message: 'Ready to add to project',
            saving: false,
            saved: true
          }
        }
      }));

      // Clear status after modal is shown
      setTimeout(() => {
        setSaveStatus(prev => {
          const { [key]: _, ...rest } = prev.subreddits;
          return { subreddits: rest };
        });
      }, 1000);
    } catch (err) {
      setSaveStatus(prev => ({
        subreddits: {
          ...prev.subreddits,
          [key]: {
            type: 'error',
            message: err instanceof Error ? err.message : 'Failed to add to project',
            saving: false,
            saved: false
          }
        }
      }));

      setTimeout(() => {
        setSaveStatus(prev => {
          const { [key]: _, ...rest } = prev.subreddits;
          return { subreddits: rest };
        });
      }, 3000);
    }
  };

  const handleSaveAll = async () => {
    if (savingAll || !username) return;
    setSavingAll(true);
    setShowCreateProject(true);
  };

  const handleCreateProject = async (projectData: { 
    name: string; 
    description: string | null; 
    image_url: string | null 
  }) => {
    setSaveStatus({ subreddits: {} });
    setShowCreateProject(false);
    
    try {
      // Create new project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: projectData.name,
          description: projectData.description,
          image_url: projectData.image_url,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (projectError) throw projectError;
      if (!project) throw new Error('Failed to create project');

      // Save all subreddits
      // Save subreddits sequentially to avoid overwhelming the API
      const savedSubreddits = [];
      for (const freq of frequencies) {
        const subreddit = await saveSubreddit(freq.name);
        
        // Add to project
        await supabase
          .from('project_subreddits')
          .insert({
            project_id: project.id,
            subreddit_id: subreddit.id
          });

        savedSubreddits.push(subreddit);
      }

      setSaveStatus({
        subreddits: {
          all: {
            type: 'success',
            message: `Saved ${savedSubreddits.length} subreddits to new project`,
            saving: false,
            saved: true
          }
        }
      });

      // Navigate to new project
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setSaveStatus({
        subreddits: {
          all: {
            type: 'error',
            message: 'Failed to save subreddits to project',
            saving: false,
            saved: false
          }
        }
      });
    } finally {
      setSavingAll(false);
      setShowCreateProject(false);
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

  const getSubredditIcon = (freq: SubredditFrequency) => {
    // Use community icon first if available
    if (freq.community_icon) {
      return freq.community_icon;
    }
    
    // Fallback to icon_img if available
    if (freq.icon_img) {
      return freq.icon_img;
    }
    
    // Final fallback to generated placeholder
    return `https://api.dicebear.com/7.x/shapes/svg?seed=${freq.name}&backgroundColor=111111&radius=12`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const handleFrequentSearchClick = async (clickedUsername: string) => {
    // Don't proceed if already loading
    if (loading) return;

    // Set loading state and clear previous data
    setLoading(true);
    setError(null);
    setFrequencies([]);
    
    // Set the progress state
    setProgress({
      status: 'Validating username...',
      progress: 20,
      indeterminate: false
    });

    try {
      const cleanUsername = redditApi.parseUsername(clickedUsername.trim());
      if (!cleanUsername) {
        throw new Error('Please enter a valid Reddit username');
      }

      // Set the username in state
      setUsername(cleanUsername);

      // Track the search after validation
      await trackSearch(cleanUsername);

      setProgress({
        status: 'Fetching user posts...',
        progress: 40,
        indeterminate: false
      });

      // First verify the user exists
      const userResponse = await fetch(`https://www.reddit.com/user/${cleanUsername}/about.json`);
      if (!userResponse.ok) {
        throw new Error(`User ${cleanUsername} not found`);
      }

      const posts = await redditApi.getUserPosts(cleanUsername);
      if (posts.length === 0) {
        throw new Error('No posts found for this user');
      }

      setProgress({
        status: 'Analyzing posting patterns...',
        progress: 80,
        indeterminate: false
      });

      // Filter out any posts where subreddit name matches a username pattern
      const validPosts = posts.filter(post => 
        !post.subreddit.toLowerCase().startsWith('u_') && 
        post.subreddit.toLowerCase() !== cleanUsername.toLowerCase()
      );

      const frequencies = await redditApi.analyzePostFrequency(validPosts);
      setFrequencies(frequencies);

      setProgress({
        status: 'Analysis complete!',
        progress: 100,
        indeterminate: false
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze user');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const addNotification = (message: string, type: 'success' | 'error' = 'success') => {
    const notification: Notification = {
      id: Math.random().toString(36).substring(7),
      message,
      type,
      timestamp: Date.now()
    };
    setNotificationQueue(prev => [...prev, notification]);
  };

  // Update error handling to use notification system
  const handleError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    setError(message);
    addNotification(message, 'error');
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">SpyGlass</h1>
        <p className="text-gray-400">
          Analyze any Reddit user's posting patterns and discover their most active subreddits
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-[#0f0f0f] rounded-lg p-6 mb-8">
          <form onSubmit={handleAnalyze} className="flex gap-4">
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Reddit username (e.g., username, u/username, or profile URL)"
                className="w-full text-sm md:text-base bg-[#111111] border border-[#222222] rounded-lg pl-3 pr-10 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#C69B7B] focus:outline-none"
                disabled={loading}
              />
              <Telescope className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>
            <button 
              type="submit" 
              className="primary flex items-center gap-2 whitespace-nowrap text-sm md:text-base"
              disabled={loading}
            >
              <Telescope size={16} />
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </form>
        </div>

        {/* Frequent Searches */}
        <FrequentSearches 
          onUsernameClick={handleFrequentSearchClick}
        />

        {/* Results Section */}
        {(progress || frequencies.length > 0) && (
          <div className="bg-[#0f0f0f] rounded-lg overflow-hidden">
            {/* Progress Bar */}
            {progress && (
              <div className="p-4 border-b border-[#222222]">
                <ProgressBar 
                  progress={progress.progress}
                  status={progress.status}
                  indeterminate={progress.indeterminate}
                />
              </div>
            )}

            {/* Results */}
            {frequencies.length > 0 && (
              <>
                <div className="p-4 border-b border-[#222222] flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Found {frequencies.length} frequently posted subreddits
                  </div>
                  <button
                    onClick={handleSaveAll}
                    className="primary flex items-center gap-2 h-9 px-4 text-sm"
                    disabled={savingAll || !username}
                  >
                    <FolderPlus size={16} />
                    {savingAll ? 'Saving...' : 'Save All to New Project'}
                  </button>
                </div>

                <div className="divide-y divide-[#222222]">
                  {frequencies.map((freq) => (
                    <div key={freq.name}>
                      <div 
                        onClick={() => setExpandedSubreddit(
                          expandedSubreddit === freq.name ? undefined : freq.name
                        )}
                        className="p-4 hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] overflow-hidden flex-shrink-0">
                              <RedditImage 
                                src={getSubredditIcon(freq)}
                                alt={freq.name}
                                className="w-full h-full object-cover"
                                fallbackSrc={`https://api.dicebear.com/7.x/shapes/svg?seed=${freq.name}&backgroundColor=111111&radius=12`}
                              />
                            </div>
                            <div>
                              <a 
                                href={`https://reddit.com/r/${freq.name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-[15px] hover:text-[#C69B7B] transition-colors inline-flex items-center gap-2"
                                onClick={(e) => e.stopPropagation()} // Prevent card expansion when clicking link
                              >
                                r/{freq.name}
                                <ExternalLink size={14} className="text-gray-400" />
                              </a>
                              <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                                <div className="flex items-center gap-1">
                                  <Users size={14} />
                                  <span>{formatNumber(freq.subscribers)}</span>
                                </div>
                                {freq.active_users > 0 && (
                                  <>
                                    <span className="text-gray-600">•</span>
                                    <div className="flex items-center gap-1 text-emerald-400">
                                      <Activity size={14} />
                                      <span>{formatNumber(freq.active_users)} online</span>
                                    </div>
                                  </>
                                )}
                                <span className="text-gray-600">•</span>
                                <span>{freq.count} posts</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleSaveSubreddit(freq.name)}
                              className={`secondary flex items-center gap-2 py-2 px-3 text-sm whitespace-nowrap disabled:opacity-50 ${
                                saveStatus.subreddits['save_' + freq.name]?.saved ? 'bg-green-900/20 text-green-400 hover:bg-green-900/30' : ''
                              }`}
                              title="Save Subreddit"
                              disabled={!user || savingAll || saveStatus.subreddits['save_' + freq.name]?.saving}
                            >
                              <div className="w-5 flex justify-center">
                                {saveStatus.subreddits['save_' + freq.name]?.saving ? (
                                  <div className="animate-spin text-lg">⚬</div>
                                ) : saveStatus.subreddits['save_' + freq.name]?.saved ? (
                                  <Check size={16} className="text-green-400" />
                                ) : (
                                  <BookmarkPlus size={16} />
                                )}
                              </div>
                              <span className="text-center">
                                {saveStatus.subreddits['save_' + freq.name]?.saving 
                                  ? 'Saving...' 
                                  : 'Save Subreddit'}
                              </span>
                            </button>
                            <button
                              onClick={() => handleAddToProject(freq.name)}
                              className={`secondary flex items-center gap-2 py-2 px-3 text-sm whitespace-nowrap disabled:opacity-50 ${
                                saveStatus.subreddits['add_' + freq.name]?.saved ? 'bg-[#2B543A]/20 text-[#4CAF50] hover:bg-[#2B543A]/30' : ''
                              }`}
                              title={saveStatus.subreddits['add_' + freq.name]?.saved ? 'Added to Project' : 'Add to Project'}
                              disabled={!user || savingAll || saveStatus.subreddits['add_' + freq.name]?.saving}
                            >
                              <div className="w-5 flex justify-center">
                                {saveStatus.subreddits['add_' + freq.name]?.saving ? (
                                  <div className="animate-spin text-lg">⚬</div>
                                ) : (
                                  <FolderPlus size={16} className={saveStatus.subreddits['add_' + freq.name]?.saved ? 'text-[#4CAF50]' : ''} />
                                )}
                              </div>
                              <span className="text-center">
                                {saveStatus.subreddits['add_' + freq.name]?.saving 
                                  ? 'Adding...' 
                                  : 'Add to Project'}
                              </span>
                            </button>
                            <div className="text-gray-400 p-2">
                              {expandedSubreddit === freq.name ? (
                                <ChevronUp size={20} />
                              ) : (
                                <ChevronDown size={20} />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {expandedSubreddit === freq.name && (
                        <div className="border-t border-[#222222] bg-[#0A0A0A] divide-y divide-[#222222]">
                          {freq.lastPosts.map((post) => (
                            <div key={post.id} className="p-4 hover:bg-[#111111] transition-colors">
                              <div className="flex items-start gap-4">
                                {(post.preview_url || post.thumbnail) ? (
                                  <div className="w-20 h-20 rounded-md overflow-hidden bg-[#111111]">
                                    <RedditImage 
                                      src={post.preview_url || post.thumbnail || ''}
                                      alt={post.title}
                                      className="w-full h-full object-cover"
                                      fallbackSrc={getSubredditIcon(freq)}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-20 h-20 rounded-md bg-[#111111] flex items-center justify-center">
                                    <RedditImage 
                                      src={getSubredditIcon(freq)}
                                      alt={freq.name}
                                      className="w-12 h-12 object-cover"
                                      fallbackSrc={`https://api.dicebear.com/7.x/shapes/svg?seed=${freq.name}&backgroundColor=111111`}
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <a
                                    href={post.url}
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
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 text-red-400 rounded-lg flex items-center gap-2">
          <AlertTriangle size={20} className="shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="fixed top-4 right-4 z-50 pointer-events-none">
        {Object.entries(saveStatus.subreddits)
          .filter(([_, status]) => !!status && !status.saving)
          .slice(0, 1)
          .map(([key, status]) => {
            const s = status!; // non-null as filtered
            return (
              <div 
                key={key}
                className={`p-4 ${
                  s.type === 'success' 
                    ? 'bg-green-900/30 text-green-400' 
                    : 'bg-red-900/30 text-red-400'
                } rounded-lg flex items-center gap-2 backdrop-blur-sm shadow-lg animate-fade-in`}
              >
                {s.type === 'success' ? (
                  <Check size={20} className="shrink-0" />
                ) : (
                  <AlertTriangle size={20} className="shrink-0" />
                )}
                <p>
                  {key !== 'all' ? (
                    <>
                      <span className="font-medium">r/{key}:</span>{' '}
                      {s.message}
                    </>
                  ) : (
                    s.message
                  )}
                </p>
              </div>
            );
          })}
      </div>

      {selectedSubreddit && (
        <AddToProjectModal
          isOpen={true}
          onClose={() => setSelectedSubreddit(null)}
          subredditId={selectedSubreddit.id}
          subredditName={selectedSubreddit.name}
        />
      )}
      
      {currentSubreddit && (
        <SaveToProjectModal
          isOpen={showSaveModal}
          onClose={() => {
            setShowSaveModal(false);
            setCurrentSubreddit(null);
          }}
          subredditId={currentSubreddit.id}
          subredditName={currentSubreddit.name}
          onSaveToList={async () => {
            // Already saved in handleSaveSubreddit
            return Promise.resolve();
          }}
          isSaved={true}
        />
      )}

      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => {
          setShowCreateProject(false);
          setSavingAll(false);
        }}
        onSubmit={handleCreateProject}
        defaultName={username ? `${username}'s Subreddits` : ''}
        defaultDescription={username ? `Subreddits analyzed from u/${username}'s posting history` : ''}
      />
    </div>
  );
}

export default SpyGlass;