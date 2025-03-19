/* src/features/subreddit-analysis/components/analysis-card.tsx */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  Shield, 
  Type, 
  TrendingUp, 
  Brain, 
  Activity, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Save,
  Target,
  BookmarkPlus,
  MessageSquare,
  ArrowBigUp,
  ExternalLink,
  Image
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { HeatmapChart } from '../../../components/HeatmapChart';
import { AnalysisResult, SavedSubreddit } from '../types';
import SaveToProjectModal from '../../../components/SaveToProjectModal';
import RedditImage from '../../../components/RedditImage';
import { redditApi } from '../../../lib/redditApi';

interface AnalysisCardProps {
  analysis: AnalysisResult;
  mode?: 'new' | 'saved';
  onSaveComplete?: () => void;
  isAnalyzing?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ 
  analysis, 
  mode = 'new',
  onSaveComplete,
  isAnalyzing = false,
  isLoading,
  error
}) => {
  const [showDetailedRules, setShowDetailedRules] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setError] = useState<string | null>(null);
  const [saveAttempts, setSaveAttempts] = useState(0);
  const [subredditId, setSubredditId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Update validation to be more comprehensive, but safely check for existence
  if (!analysis || 
      !analysis.analysis || 
      !analysis.info || 
      !analysis.analysis.postingLimits?.contentRestrictions || 
      !analysis.analysis.marketingFriendliness?.score || 
      !analysis.analysis.contentStrategy?.recommendedTypes) {
    
    console.warn('Analysis data validation failed:', {
      hasAnalysis: !!analysis,
      hasAnalysisData: !!analysis?.analysis,
      hasInfo: !!analysis?.info,
      hasContentRestrictions: !!analysis?.analysis?.postingLimits?.contentRestrictions,
      hasScore: !!analysis?.analysis?.marketingFriendliness?.score,
      hasRecommendedTypes: !!analysis?.analysis?.contentStrategy?.recommendedTypes
    });
    
    return (
      <div className="bg-[#111111] rounded-lg shadow-xl overflow-hidden p-4">
        <div className="text-red-400 space-y-2">
          <div className="font-medium">Error: Analysis data is incomplete</div>
          <ul className="text-sm list-disc list-inside">
            {!analysis && <li>Missing analysis data entirely</li>}
            {!analysis?.analysis && <li>Missing analysis object</li>}
            {!analysis?.info && <li>Missing subreddit info</li>}
            {analysis?.analysis && !analysis?.analysis?.postingLimits?.contentRestrictions && 
              <li>Missing posting limits or restrictions</li>}
            {analysis?.analysis && !analysis?.analysis?.marketingFriendliness?.score && 
              <li>Missing marketing friendliness score</li>}
            {analysis?.analysis && !analysis?.analysis?.contentStrategy?.recommendedTypes && 
              <li>Missing content strategy</li>}
          </ul>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error('Authentication error: ' + userError.message);
      if (!user) throw new Error('Not authenticated');

      // First, insert or update the subreddit
      const { data: subredditData, error: subredditError } = await supabase
        .from('subreddits')
        .upsert({
          name: analysis.info.name,
          subscriber_count: analysis.info.subscribers,
          active_users: analysis.info.active_users,
          marketing_friendly_score: analysis.analysis.marketingFriendliness.score,
          allowed_content: analysis.analysis.contentStrategy.recommendedTypes,
          posting_requirements: {
            restrictions: analysis.analysis.postingLimits.contentRestrictions,
            recommendations: analysis.analysis.postingLimits.bestTimeToPost
          },
          posting_frequency: {
            timing: analysis.analysis.postingLimits.bestTimeToPost.map(time => ({
              hour: parseInt(time.split(':')[0]),
              timezone: 'UTC'
            })),
            postTypes: analysis.analysis.contentStrategy.recommendedTypes
          },
          best_practices: analysis.analysis.contentStrategy.dos,
          rules_summary: analysis.info.rules ? JSON.stringify(analysis.info.rules) : null,
          title_template: analysis.analysis.titleTemplates?.patterns?.[0] || null,
          last_analyzed_at: new Date().toISOString(),
          analysis_data: {
            info: analysis.info,
            posts: analysis.posts,
            analysis: analysis.analysis
          }
        }, {
          onConflict: 'name'
        })
        .select();

      if (subredditError) throw new Error('Database error: ' + subredditError.message);
      
      if (!subredditData || subredditData.length === 0) {
        throw new Error('Failed to save subreddit data: No data returned');
      }

      const savedSubreddit = subredditData[0];
      setSubredditId(savedSubreddit.id);

      // Check if already saved
      const { data: existingSave } = await supabase
        .from('saved_subreddits')
        .select('id')
        .eq('user_id', user.id)
        .eq('subreddit_id', savedSubreddit.id)
        .maybeSingle();
        
      setIsSaved(!!existingSave);
      
      // Show the save modal
      setShowSaveModal(true);
      setSaveAttempts(0);
      
      if (onSaveComplete) {
        onSaveComplete();
      }
      
      return savedSubreddit.id;
    } catch (err) {
      console.error('Error saving subreddit:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save subreddit';
      setError(errorMessage);
      setSaveAttempts(prev => prev + 1);
      return null;
    } finally {
      setSaving(false);
    }
  };
  
  const saveToList = async () => {
    try {
      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Not authenticated');

      if (!subredditId) {
        const savedId = await handleSave();
        if (!savedId) throw new Error('Failed to save subreddit');
      }

      // Then, create the saved_subreddits entry with user_id
      const { error: savedError } = await supabase
        .from('saved_subreddits')
        .upsert({
          user_id: user.id,
          subreddit_id: subredditId,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,subreddit_id'
        });

      if (savedError) throw savedError;

      setIsSaved(true);
      return subredditId;
    } catch (err) {
      console.error('Error saving to list:', err);
      throw err;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getContentTypeBadgeStyle = (type: string) => {
    const styles: Record<string, string> = {
      text: "bg-[#2B543A] text-white",
      image: "bg-[#8B6D3F] text-white",
      link: "bg-[#4A3B69] text-white",
      video: "bg-[#1E3A5F] text-white"
    };
    return `${styles[type.toLowerCase()] || "bg-gray-600"} px-2.5 py-0.5 rounded-full text-xs font-medium`;
  };

  return (
    <div className="bg-[#111111] rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <h1 className="text-xl md:text-2xl font-semibold">r/{analysis.info.name}</h1>
            <div className="flex items-center gap-2 text-sm md:text-base text-gray-400">
              <Users className="h-4 w-4" />
              <span>{formatNumber(analysis.info.subscribers)}</span>
              <Activity className="h-4 w-4 ml-2" />
              <span>{formatNumber(analysis.info.active_users)} online</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {mode === 'new' && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#2B543A] hover:bg-[#1F3C2A] text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BookmarkPlus size={18} />
                {saving ? 'Saving...' : 'Save Subreddit'}
              </button>
            )}
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#C69B7B] to-[#E6B17E] text-white text-sm font-medium">
              {analysis.analysis.marketingFriendliness.score}% Marketing-Friendly
            </span>
          </div>
        </div>
        {saveError && (
          <div className="mt-4 p-3 bg-red-900/30 text-red-400 rounded-md text-sm">
            <div className="font-medium">Error saving analysis:</div>
            <div className="mt-1">{saveError}</div>
            {saveAttempts > 0 && saveAttempts < 3 && (
              <button
                onClick={handleSave}
                className="mt-2 text-[#C69B7B] hover:text-[#B38A6A] transition-colors"
              >
                Retry Save
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 space-y-8">
        {/* Marketing Friendliness Score */}
        <div>
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Marketing Difficulty</span>
            <span>Marketing Friendly</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-4xl font-bold">{analysis.analysis.marketingFriendliness.score}%</div>
            <div className="flex-1">
              <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${analysis.analysis.marketingFriendliness.score}%`,
                    backgroundColor: analysis.analysis.marketingFriendliness.score >= 80 ? '#4CAF50' :
                                   analysis.analysis.marketingFriendliness.score >= 60 ? '#FFA726' :
                                   '#EF5350'
                  }}
                />
              </div>
              <div className="mt-2 text-sm text-gray-400">
                {analysis.analysis.marketingFriendliness.reasons[0]}
              </div>
            </div>
          </div>
        </div>

        {/* Remove duplicate Community Stats section and update the header stats */}
        <div className="flex items-center gap-2 text-sm md:text-base">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Users className="h-4 w-4" />
            <span>{formatNumber(analysis.info.subscribers)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 ml-4">
            <Activity className="h-4 w-4" />
            <span>{formatNumber(analysis.info.active_users)} online</span>
          </div>
        </div>

        {/* Best Posting Times */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#C69B7B]" />
            <h3 className="font-medium">Best Posting Times</h3>
          </div>
          {analysis.posts && analysis.posts.length > 0 ? (
            <HeatmapChart posts={analysis.posts} />
          ) : (
            <ul className="space-y-2 text-gray-400 text-sm">
              {analysis.analysis.postingLimits.bestTimeToPost.map((time, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#C69B7B]">•</span>
                  <span>{time}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Posting Requirements */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#C69B7B]" />
              <h3 className="font-medium">Posting Requirements</h3>
            </div>
            <ul className="space-y-2 text-gray-400 text-sm">
              {analysis.analysis.postingLimits.contentRestrictions.map((restriction, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#C69B7B]">•</span>
                  <span>{restriction}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Content Types */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Type className="h-5 w-5 text-[#C69B7B]" />
              <h3 className="font-medium">Allowed Content</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.analysis.contentStrategy.recommendedTypes.map((type) => (
                <span 
                  key={type}
                  className={getContentTypeBadgeStyle(type)}
                >
                  {type}
                </span>
              ))}
            </div>
          </div>

          {/* Best Practices */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#C69B7B]" />
              <h3 className="font-medium">Best Practices</h3>
            </div>
            <ul className="space-y-2 text-gray-400 text-sm">
              {analysis.analysis.contentStrategy.dos?.map((practice, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#C69B7B]">•</span>
                  <span>{practice}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Game Plan */}
        {analysis.analysis.gamePlan && (
          <div className="bg-[#0A0A0A] rounded-lg overflow-hidden border border-gray-800 text-sm md:text-base">
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-[#C69B7B]" />
                <h3 className="font-medium">Game Plan</h3>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {/* Title Template */}
              {analysis.analysis.titleTemplates && (
                <div>
                  <h4 className="text-sm text-gray-400 mb-3">Title Template</h4>
                  <div className="bg-[#111111] rounded-lg p-4 border border-gray-800">
                    <code className="text-emerald-400 font-mono block mb-3">
                      {analysis.analysis.titleTemplates.patterns[0]}
                    </code>
                    <div className="text-sm text-gray-400">
                      <div className="mb-2">Example:</div>
                      {analysis.analysis.titleTemplates.examples.map((example, index) => (
                        <div key={index} className="text-white">{example}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm text-gray-400 mb-3">Immediate Actions</h4>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    {analysis.analysis.gamePlan.immediate.map((action, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-[#C69B7B]">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm text-gray-400 mb-3">Short-term Strategy</h4>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    {analysis.analysis.gamePlan.shortTerm.map((action, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-[#C69B7B]">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Long-term Strategy */}
              {analysis.analysis.gamePlan.longTerm && analysis.analysis.gamePlan.longTerm.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm text-gray-400 mb-3">Long-term Strategy</h4>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    {analysis.analysis.gamePlan.longTerm.map((action, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-[#C69B7B]">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Do's and Don'ts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm text-gray-400 mb-3">Do's</h4>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    {analysis.analysis.contentStrategy.dos?.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-emerald-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm text-gray-400 mb-3">Don'ts</h4>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    {analysis.analysis.contentStrategy.donts?.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-red-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Rules Analysis */}
        {analysis.info.rules && (
          <div className="space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#C69B7B]" />
              <h3 className="font-medium">Subreddit Rules</h3>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDetailedRules(!showDetailedRules);
                }}
                className="ml-auto text-gray-400 hover:text-white"
              >
                {showDetailedRules ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
            {showDetailedRules && (
              <div className="bg-[#0A0A0A] rounded-lg p-4 border border-gray-800">
                {analysis.info.rules.map((rule: any, index: number) => (
                  <div key={index} className="mb-4 last:mb-0">
                    <h4 className="font-medium mb-1">Rule {index + 1}: {rule.title}</h4>
                    <p className="text-sm text-gray-400">{rule.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* View Subreddit Link */}
        {mode === 'saved' && (
          <div className="mt-6">
            <a
              href={`https://reddit.com/r/${analysis.info.name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#C69B7B] hover:text-[#B38A6A] transition-colors inline-flex items-center gap-2"
            >
              View all posts in r/{analysis.info.name}
              <ChevronRight size={16} />
            </a>
          </div>
        )}
      </div>

      {/* Post Gallery Section */}
      <div className="p-4 md:p-6 border-t border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Top Posts in r/{analysis.info.name}</h2>
          <a 
            href={`https://reddit.com/r/${analysis.info.name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#C69B7B] hover:text-[#B38A6A] flex items-center gap-1.5"
          >
            View all <ExternalLink size={14} />
          </a>
        </div>
        
        <PostGallery posts={analysis.posts} subredditName={analysis.info.name} />
      </div>
      
      {/* Footer */}
      <div className="p-4 md:p-6 flex justify-between items-start">
        <h2 className="text-xl font-bold">Subreddit Analysis</h2>
      </div>
      
      {/* Save to Project Modal */}
      {showSaveModal && subredditId && (
        <SaveToProjectModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          subredditId={subredditId}
          subredditName={analysis.info.name}
          onSaveToList={saveToList}
          isSaved={isSaved}
        />
      )}
    </div>
  );
};

interface PostGalleryProps {
  posts: Array<{
    title: string;
    score: number;
    num_comments: number;
    created_utc: number;
  }>;
  subredditName: string;
}

interface RedditPostWithImages {
  id: string;
  title: string;
  score: number;
  num_comments: number;
  created_utc: number;
  url: string;
  thumbnail: string | null;
  preview_url: string | null;
}

const PostGallery: React.FC<PostGalleryProps> = ({ posts, subredditName }) => {
  const [enrichedPosts, setEnrichedPosts] = useState<RedditPostWithImages[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get top posts by score
  const topPosts = [...posts]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  
  // Fetch real post data with images from Reddit API
  useEffect(() => {
    const fetchPostsWithImages = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get actual posts from Reddit API with thumbnails
        const redditPosts = await redditApi.getSubredditPosts(
          subredditName, 
          'top', // Get top posts
          16, // Fetch more than we need in case some don't have images
          'month' // Recent posts from the last month
        );
        
        // Filter posts that have thumbnails or preview images
        const postsWithImages = redditPosts
          .filter(post => post.thumbnail || post.preview_url || isImageUrl(post.url))
          .slice(0, 8); // Limit to 8 posts
          
        setEnrichedPosts(postsWithImages);
      } catch (err) {
        console.error('Error fetching subreddit posts:', err);
        setError('Failed to load post images');
        
        // Create fallback posts with no images
        setEnrichedPosts(topPosts.map(post => ({
          id: `fallback-${post.created_utc}`,
          title: post.title,
          score: post.score,
          num_comments: post.num_comments,
          created_utc: post.created_utc,
          url: `https://reddit.com/r/${subredditName}`, // Link to subreddit
          thumbnail: null,
          preview_url: null
        })));
      } finally {
        setIsLoading(false);
      }
    };
    
    if (subredditName && posts.length > 0) {
      fetchPostsWithImages();
    }
  }, [subredditName, posts]);
  
  // Check if URL is an image
  const isImageUrl = (url?: string): boolean => {
    if (!url) return false;
    return /\.(jpe?g|png|gif|webp)$/i.test(url);
  };
    
  // Function to get post image URL
  const getPostImageUrl = (post: RedditPostWithImages): string | null => {
    if (post.preview_url) return post.preview_url;
    if (post.thumbnail) return post.thumbnail;
    
    // Check if the post URL is an image
    if (post.url && isImageUrl(post.url)) {
      return post.url;
    }
    
    // Generate a deterministic placeholder based on post title
    const hash = post.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(post.title)}&backgroundColor=${hue},80,20&radius=8`;
  };
  
  // Function to format time since post
  const formatTimeSince = (timestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const seconds = now - timestamp;
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
    
    return new Date(timestamp * 1000).toLocaleDateString();
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-pulse bg-gray-800 h-6 w-40 mb-6 rounded"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="flex flex-col bg-[#0A0A0A] rounded-lg overflow-hidden border border-gray-800 h-64">
              <div className="relative aspect-video bg-gray-800 animate-pulse"></div>
              <div className="p-3 flex-1">
                <div className="h-4 bg-gray-800 rounded animate-pulse mb-2"></div>
                <div className="h-4 bg-gray-800 rounded animate-pulse w-3/4"></div>
                <div className="mt-auto pt-4 flex justify-between">
                  <div className="h-3 bg-gray-800 rounded animate-pulse w-10"></div>
                  <div className="h-3 bg-gray-800 rounded animate-pulse w-10"></div>
                  <div className="h-3 bg-gray-800 rounded animate-pulse w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Show error message if API failed
  if (error && enrichedPosts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="flex justify-center mb-4">
          <Image size={48} className="text-gray-500" />
        </div>
        <div className="text-gray-400">
          {error}. Using cached post data instead.
        </div>
      </div>
    );
  }
  
  // If no posts available
  if (!enrichedPosts || enrichedPosts.length === 0) {
    return (
      <div className="text-gray-400 text-center py-8">
        No posts available for this subreddit.
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {enrichedPosts.map((post, index) => (
        <a 
          key={post.id || index} 
          href={post.url || `https://reddit.com/r/${subredditName}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex flex-col bg-[#0A0A0A] rounded-lg overflow-hidden border border-gray-800 
                    hover:border-[#2B543A] transition-colors duration-200 h-full"
        >
          <div className="relative aspect-video bg-[#111111] overflow-hidden">
            <RedditImage 
              src={getPostImageUrl(post) || ''}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="p-3 flex-1 flex flex-col">
            <h3 className="text-sm font-medium line-clamp-2 mb-2">{post.title}</h3>
            
            <div className="mt-auto flex justify-between text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <ArrowBigUp size={14} />
                <span>{post.score >= 10000 ? `${(post.score / 1000).toFixed(1)}k` : post.score}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare size={14} />
                <span>{post.num_comments}</span>
              </div>
              <div>{formatTimeSince(post.created_utc)}</div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};

export default AnalysisCard; 