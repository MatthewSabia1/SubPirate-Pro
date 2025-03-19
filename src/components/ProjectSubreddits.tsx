import React, { useState, useEffect } from 'react';
import { Download, FolderPlus, X, ChevronDown, ChevronUp, Search, Calendar, Users, Activity, Send, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getSubredditInfo, getSubredditPosts, cleanRedditImageUrl } from '../lib/reddit';
import { analyzeSubredditData, AnalysisResult } from '../lib/analysis';
import AddToProjectModal from './AddToProjectModal';
import AnalysisCard from '../features/subreddit-analysis/components/analysis-card';
import RedditImage from './RedditImage';

interface ProjectSubreddit {
  id: string;
  subreddit: {
    id: string;
    name: string;
    subscriber_count: number;
    active_users: number;
    marketing_friendly_score: number;
    allowed_content: string[];
    icon_img: string | null;
    community_icon: string | null;
    analysis_data: AnalysisData | null;
  };
  created_at: string;
}

interface ProjectSubredditsProps {
  projectId: string;
}

interface PostCount {
  subreddit_id: string;
  total_posts_24h: number;
}

interface SubredditCounts {
  [key: string]: number;
}

interface DatabaseSubreddit {
  id: string;
  name: string;
  subscriber_count: number;
  active_users: number;
  marketing_friendly_score: number;
  allowed_content: string[];
  icon_img: string | null;
  community_icon: string | null;
  analysis_data: AnalysisData | null;
}

interface DatabaseProjectSubreddit {
  id: string;
  created_at: string;
  subreddit: DatabaseSubreddit;
}

function ProjectSubreddits({ projectId }: ProjectSubredditsProps) {
  const [subreddits, setSubreddits] = useState<ProjectSubreddit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [expandedSubreddit, setExpandedSubreddit] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedSubreddit, setSelectedSubreddit] = useState<{id: string; name: string} | null>(null);
  const [postCounts, setPostCounts] = useState<Record<string, number | null>>({});

  // Function to refresh subreddit data
  const refreshSubredditData = async (subreddit: ProjectSubreddit['subreddit']) => {
    try {
      console.log(`Refreshing data for r/${subreddit.name}...`);
      const info = await getSubredditInfo(subreddit.name);
      
      if (info) {
        console.log(`Updated data for r/${subreddit.name}:`, {
          subscribers: info.subscribers,
          active_users: info.active_users
        });
        
        // Update the subreddit in the database with new data
        const { error } = await supabase
          .from('subreddits')
          .update({
            subscriber_count: info.subscribers,
            active_users: info.active_users,
            icon_img: info.icon_img,
            community_icon: info.community_icon
          })
          .eq('id', subreddit.id);

        if (error) {
          console.error(`Error updating r/${subreddit.name} in database:`, error);
          return null;
        }

        // Update local state
        setSubreddits(prev => prev.map(s => {
          if (s.subreddit.id === subreddit.id) {
            return {
              ...s,
              subreddit: {
                ...s.subreddit,
                subscriber_count: info.subscribers,
                active_users: info.active_users,
                icon_img: info.icon_img,
                community_icon: info.community_icon
              }
            };
          }
          return s;
        }));
      }
      
      return info;
    } catch (err) {
      console.error(`Error refreshing data for r/${subreddit.name}:`, err);
      return null;
    }
  };

  useEffect(() => {
    fetchProjectSubreddits();
    fetchPostCounts();
  }, [projectId]);

  // Add effect to refresh subreddit data periodically
  useEffect(() => {
    if (subreddits.length === 0) return;

    // Refresh data for all subreddits
    const refreshAll = async () => {
      for (const projectSubreddit of subreddits) {
        await refreshSubredditData(projectSubreddit.subreddit);
      }
    };

    refreshAll();

    // Set up interval to refresh every hour
    const interval = setInterval(refreshAll, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [subreddits.length]);

  // New effect: when subreddits update, fetch their post counts
  useEffect(() => {
    if (subreddits.length > 0) {
      fetchPostCounts();
    }
  }, [subreddits]);

  const fetchPostCounts = async () => {
    try {
      if (subreddits.length === 0) return;

      // Get post counts for all subreddits
      const { data, error } = await supabase
        .rpc('get_subreddit_post_counts', {
          subreddit_ids: subreddits.map(s => s.subreddit.id)
        });

      if (error) throw error;

      // Convert to record format
      const counts = (data as PostCount[] || []).reduce<SubredditCounts>((acc, { subreddit_id, total_posts_24h }) => ({
        ...acc,
        [subreddit_id]: total_posts_24h
      }), {});

      setPostCounts(counts);
    } catch (err) {
      console.error('Error fetching post counts:', err);
    }
  };

  const getSubredditIcon = (subreddit: ProjectSubreddit['subreddit']): string => {
    // Use community icon first if available
    if (subreddit.community_icon) {
      return subreddit.community_icon;
    }
    // Fallback to icon_img if available
    if (subreddit.icon_img) {
      return subreddit.icon_img;
    }
    // Final fallback to generated placeholder
    return `https://api.dicebear.com/7.x/shapes/svg?seed=${subreddit.name}&backgroundColor=111111&radius=12`;
  };

  const fetchProjectSubreddits = async () => {
    try {
      const { data, error } = await supabase
        .from('project_subreddits')
        .select(`
          id,
          created_at,
          subreddit:subreddits (
            id,
            name,
            subscriber_count,
            active_users,
            marketing_friendly_score,
            allowed_content,
            icon_img,
            community_icon,
            analysis_data
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Debug log with proper type casting
      const debugData = (data as unknown as DatabaseProjectSubreddit[])?.map(item => {
        const subredditData = Array.isArray(item.subreddit) ? item.subreddit[0] : item.subreddit;
        return {
          name: subredditData.name,
          icon_img: subredditData.icon_img,
          community_icon: subredditData.community_icon
        };
      });
      console.log('Fetched project subreddits:', debugData);
      
      // Transform the data to match the ProjectSubreddit interface
      const transformedData = (data as unknown as DatabaseProjectSubreddit[]).map(item => {
        // Handle case where 'subreddit' might be returned as an array
        const subredditData = Array.isArray(item.subreddit) ? item.subreddit[0] : item.subreddit;
        return {
          id: item.id,
          created_at: item.created_at,
          subreddit: {
            id: subredditData.id,
            name: subredditData.name,
            subscriber_count: subredditData.subscriber_count,
            active_users: subredditData.active_users,
            marketing_friendly_score: subredditData.marketing_friendly_score,
            allowed_content: subredditData.allowed_content,
            icon_img: subredditData.icon_img,
            community_icon: subredditData.community_icon,
            analysis_data: subredditData.analysis_data
          }
        };
      });

      setSubreddits(transformedData);
    } catch (err) {
      console.error('Error fetching project subreddits:', err);
      setError('Failed to load project subreddits');
    } finally {
      setLoading(false);
    }
  };

  const removeProjectSubreddit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_subreddits')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSubreddits(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error removing subreddit:', err);
      setError('Failed to remove subreddit');
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

  const toggleSubredditExpansion = async (subredditName: string) => {
    if (expandedSubreddit === subredditName) {
      setExpandedSubreddit(null);
      setAnalysisResult(null);
      return;
    }

    setExpandedSubreddit(subredditName);
    setAnalyzing(true);

    try {
      // Try to load from localStorage first
      const cached = localStorage.getItem(`analysis:${subredditName}`);
      if (cached) {
        setAnalysisResult(JSON.parse(cached));
        setAnalyzing(false);
        return;
      }

      // If no cache, perform analysis
      const [info, posts] = await Promise.all([
        getSubredditInfo(subredditName),
        getSubredditPosts(subredditName, 'top', 500, 'month')
      ]);

      const result = await analyzeSubredditData(
        info,
        posts,
        () => {} // Progress updates not needed here
      );

      setAnalysisResult(result);
      
      // Cache the result
      localStorage.setItem(
        `analysis:${subredditName}`,
        JSON.stringify(result)
      );
    } catch (err) {
      console.error('Error analyzing subreddit:', err);
      setError('Failed to analyze subreddit');
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredSubreddits = subreddits
    .filter(s => s.subreddit.name.toLowerCase().includes(filterText.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return a.subreddit.name.localeCompare(b.subreddit.name);
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading project subreddits...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter by name..."
            className="search-input w-full h-12 md:h-10 bg-[#111111] rounded-md"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
          className="bg-[#111111] border-none rounded-md px-4 h-12 md:h-10 focus:ring-1 focus:ring-[#333333] min-w-[140px]"
        >
          <option value="date">Date Added</option>
          <option value="name">Name</option>
        </select>
      </div>

      {/* Subreddits Table */}
      <div className="bg-[#111111] rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_auto_80px_200px] gap-4 px-6 py-4 border-b border-[#222222] text-sm text-gray-400">
          <div className="hidden md:block">Subreddit</div>
          <div className="hidden md:block">Community Stats</div>
          <div className="hidden md:block">Marketing-Friendly</div>
          <div className="hidden md:block">Content Types</div>
          <div className="hidden md:block text-center">Posts</div>
          <div className="hidden md:block text-right">Actions</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-[#222222]">
          {filteredSubreddits.map((saved) => (
            <div key={saved.id}>
              <div 
                onClick={() => toggleSubredditExpansion(saved.subreddit.name)}
                className="flex flex-col md:grid md:grid-cols-[2fr_1.5fr_1fr_auto_80px_200px] gap-4 p-4 md:px-6 md:py-4 items-start md:items-center hover:bg-[#1A1A1A] transition-colors cursor-pointer"
              >
                {/* Subreddit Name with Icon */}
                <div className="flex items-center gap-3 w-full min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] overflow-hidden flex-shrink-0">
                    <RedditImage 
                      src={getSubredditIcon(saved.subreddit)}
                      alt={saved.subreddit.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="font-medium truncate">
                    r/{saved.subreddit.name}
                  </div>
                </div>

                {/* Community Stats */}
                <div className="hidden md:flex flex-col text-sm mt-2 lg:mt-0">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Users size={14} />
                    <span>{formatNumber(saved.subreddit.subscriber_count)}</span>
                  </div>
                  {saved.subreddit.active_users > 0 && (
                    <div className="flex items-center gap-1.5 text-emerald-400 mt-1">
                      <Activity size={14} />
                      <span>{formatNumber(saved.subreddit.active_users)} online</span>
                    </div>
                  )}
                </div>

                {/* Marketing Score */}
                <div className="w-full mt-2 md:mt-0">
                  <div className="w-full max-w-[100px] h-2 bg-[#222222] rounded-full overflow-hidden">
                    <div className="h-full" style={{
                      width: `${saved.subreddit.marketing_friendly_score}%`,
                      backgroundColor: saved.subreddit.marketing_friendly_score >= 80 ? '#4CAF50' :
                                     saved.subreddit.marketing_friendly_score >= 60 ? '#FFA726' :
                                     '#EF5350'
                    }} />
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {saved.subreddit.marketing_friendly_score}%
                  </div>
                </div>

                {/* Content Types */}
                <div className="flex flex-wrap gap-1 mt-2 md:mt-0 min-w-0">
                  {saved.subreddit.allowed_content.map((type) => (
                    <span 
                      key={type}
                      className={`px-2 py-1 text-xs rounded ${getContentTypeBadgeStyle(type)}`}
                    >
                      {type}
                    </span>
                  ))}
                </div>

                {/* Posts Count */}
                <div className="flex items-center gap-1 mt-2 md:mt-0 justify-center">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-gray-400">{postCounts[saved.subreddit.id] || 0}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 md:mt-0 md:justify-end w-full md:w-auto">
                  <a
                    href={`https://reddit.com/r/${saved.subreddit.name}/submit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="bg-[#1A1A1A] hover:bg-[#252525] text-gray-200 flex items-center gap-2 h-9 px-4 text-sm whitespace-nowrap rounded-md transition-colors border border-[#333333]"
                    title="Post to Subreddit"
                  >
                    <Send size={16} className="text-gray-400" />
                    <span>Post</span>
                  </a>
                  <div className="flex items-center gap-1 ml-2">
                    <button 
                      className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"
                      title="Remove from Project"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeProjectSubreddit(saved.id);
                      }}
                    >
                      <X size={20} />
                    </button>
                    <div className="text-gray-400 p-2">
                      {expandedSubreddit === saved.subreddit.name ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Analysis Section */}
              {expandedSubreddit === saved.subreddit.name && (
                <div className="border-t border-[#222222] bg-[#0A0A0A] p-6" onClick={e => e.stopPropagation()}>
                  {saved.subreddit.analysis_data ? (
                    <>
                      <AnalysisCard 
                        analysis={saved.subreddit.analysis_data}
                        mode="saved"
                      />
                      <div className="mt-6">
                        <a
                          href={`https://reddit.com/r/${saved.subreddit.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#C69B7B] hover:text-[#B38A6A] transition-colors inline-flex items-center gap-2"
                        >
                          View all posts in r/{saved.subreddit.name}
                          <ChevronRight size={16} />
                        </a>
                      </div>
                    </>
                  ) : analyzing ? (
                    <div className="text-center py-8 text-gray-400">
                      Analyzing subreddit...
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      No analysis data available
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedSubreddit && (
        <AddToProjectModal
          isOpen={true}
          onClose={() => setSelectedSubreddit(null)}
          subredditId={selectedSubreddit.id}
          subredditName={selectedSubreddit.name}
        />
      )}
    </div>
  );
}

export default ProjectSubreddits;