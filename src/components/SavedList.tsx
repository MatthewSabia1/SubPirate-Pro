import React, { useState, useEffect } from 'react';
import { Download, FolderPlus, X, ChevronDown, ChevronUp, Search, Calendar, Users, Activity, RefreshCw, Send, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AnalysisCard from '../features/subreddit-analysis/components/analysis-card';
import AddToProjectModal from '../components/AddToProjectModal';
import { AnalysisResult } from '../lib/analysis';
import { useAuth } from '../contexts/AuthContext';
import PostStatsModal from '../components/PostStatsModal';

// Interface for saved subreddit data
interface SavedSubreddit {
  id: string;
  subreddit_id: string;
  name: string;
  created_at: string;
  subscriber_count: number;
  active_users: number;
  marketing_friendly_score: number;
  allowed_content: string[];
  icon_img: string | null;
  community_icon: string | null;
  analysis_data: AnalysisResult | null;
}

// Interface for post count data from Supabase RPC
interface PostCount {
  subreddit_id: string;
  total_posts_24h: number;
}

function SavedList() {
  const [savedSubreddits, setSavedSubreddits] = useState<SavedSubreddit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [expandedSubreddit, setExpandedSubreddit] = useState<string | null>(null);
  const [selectedSubreddit, setSelectedSubreddit] = useState<{ id: string; name: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandLoading, setExpandLoading] = useState(false);
  const [postCounts, setPostCounts] = useState<Record<string, number>>({}); // Single declaration
  const { user } = useAuth();

  // Fetch saved subreddits when user changes
  useEffect(() => {
    if (user) {
      console.log('User authenticated, fetching saved subreddits...'); // Debug log
      fetchSavedSubreddits();
    }
  }, [user]);

  // Fetch post counts when saved subreddits change
  useEffect(() => {
    if (user && savedSubreddits.length > 0) {
      fetchPostCounts();
    }
  }, [user, savedSubreddits]);

  const fetchSavedSubreddits = async () => {
    try {
      console.log('Starting to fetch saved subreddits...'); // Debug log
      const { data, error } = await supabase
        .from('saved_subreddits_with_icons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Fetched subreddits data:', {
        count: data?.length || 0,
        hasAnalysisData: data?.filter(s => !!s.analysis_data).length || 0
      }); // Detailed debug log
      
      setSavedSubreddits(data || []);
    } catch (err) {
      console.error('Error fetching saved subreddits:', err);
      setError('Failed to load saved subreddits');
    } finally {
      setLoading(false);
    }
  };

  const fetchPostCounts = async () => {
    try {
      if (!user || savedSubreddits.length === 0) return;

      const subredditIds = savedSubreddits.map(s => s.subreddit_id);
      const { data, error } = await supabase.rpc('get_subreddit_post_counts', {
        subreddit_ids: subredditIds,
      });

      if (error) throw error;

      // Convert array of results to a record
      const counts = (data as PostCount[] || []).reduce<Record<string, number>>(
        (acc, { subreddit_id, total_posts_24h }) => ({
          ...acc,
          [subreddit_id]: total_posts_24h,
        }),
        {}
      );

      setPostCounts(counts);
    } catch (err) {
      console.error('Error fetching post counts:', err);
      setError('Failed to load post counts');
    }
  };

  const handleRefreshStats = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetchPostCounts();
    } catch (err) {
      console.error('Error refreshing stats:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Subreddit', 'Subscribers', 'Active Users', 'Marketing Score', 'Content Types', 'Posts', 'Date Added'];
    const rows = savedSubreddits.map(s => [
      s.name,
      s.subscriber_count,
      s.active_users,
      `${s.marketing_friendly_score}%`,
      s.allowed_content.join(', '),
      postCounts[s.subreddit_id] || 0,
      new Date(s.created_at).toLocaleDateString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'saved_subreddits.csv';
    link.click();
  };

  const toggleSubredditExpansion = async (saved: SavedSubreddit) => {
    const newExpandedName = expandedSubreddit === saved.name ? null : saved.name;
    setExpandedSubreddit(newExpandedName);
    
    // If we're expanding and there's no analysis data, try to fetch it
    if (newExpandedName && !saved.analysis_data) {
      setExpandLoading(true);
      try {
        console.log(`Fetching analysis data for ${saved.name}...`);
        const { data, error } = await supabase
          .from('subreddits')
          .select('analysis_data')
          .eq('id', saved.subreddit_id)
          .single();

        if (error) throw error;
        
        if (data?.analysis_data) {
          console.log(`Analysis data found for ${saved.name}`);
          setSavedSubreddits(prev => prev.map(s => 
            s.id === saved.id 
              ? { ...s, analysis_data: data.analysis_data }
              : s
          ));
        } else {
          console.log(`No analysis data found for ${saved.name}`);
        }
      } catch (err) {
        console.error('Error fetching analysis data:', err);
        setError('Failed to load analysis data');
      } finally {
        setExpandLoading(false);
      }
    }
  };

  const removeSavedSubreddit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_subreddits_with_icons')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setSavedSubreddits(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error removing saved subreddit:', err);
      setError('Failed to remove subreddit');
    }
  };

  const filteredSubreddits = savedSubreddits
    .filter(s => s.name.toLowerCase().includes(filterText.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return a.name.localeCompare(b.name);
    });

  console.log('Filtered subreddits:', filteredSubreddits); // Debug log for filtered data

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getContentTypeBadge = (type: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      text: { bg: 'bg-[#2B543A]', text: 'text-white' },
      image: { bg: 'bg-[#8B6D3F]', text: 'text-white' },
      link: { bg: 'bg-[#4A3B69]', text: 'text-white' },
      video: { bg: 'bg-[#1E3A5F]', text: 'text-white' },
    };
    const style = styles[type.toLowerCase()] || { bg: 'bg-gray-600', text: 'text-white' };
    return `${style.bg} ${style.text} px-2.5 py-1 rounded-full text-xs font-medium`;
  };

  const getSubredditIcon = (subreddit: SavedSubreddit) => {
    if (subreddit.community_icon) {
      return subreddit.community_icon;
    }
    if (subreddit.icon_img) {
      return subreddit.icon_img;
    }
    return `https://api.dicebear.com/7.x/shapes/svg?seed=${subreddit.name}&backgroundColor=111111&radius=12`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading saved subreddits...</div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold">Saved Subreddits</h1>
          <p className="text-gray-400 mt-2">Track and manage your saved subreddits</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshStats}
            className="secondary flex items-center gap-2 text-sm md:text-base"
            disabled={refreshing}
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden md:inline">Refresh Stats</span>
            <span className="md:hidden">Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="secondary flex items-center gap-2 text-sm md:text-base"
          >
            <Download size={20} />
            <span className="hidden md:inline">Export CSV</span>
            <span className="md:hidden">Export</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-900/30 text-red-400 rounded-lg">{error}</div>
      )}

      <div className="space-y-6">
        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Filter by name..."
              className="search-input w-full h-10 rounded-md"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'date' | 'name')}
            className="bg-[#050505] border-none rounded-md px-4 h-10 focus:ring-1 focus:ring-[#333333] min-w-[140px]"
          >
            <option value="date">Date Added</option>
            <option value="name">Name</option>
          </select>
        </div>

        {/* Subreddits Table */}
        <div className="bg-[#0f0f0f] rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="hidden lg:grid grid-cols-[minmax(200px,2fr)_minmax(150px,1.5fr)_minmax(100px,1fr)_minmax(200px,auto)_80px_220px] gap-4 px-6 py-4 border-b border-[#222222] text-sm text-gray-400">
            <div>Subreddit</div>
            <div>Community Stats</div>
            <div>Marketing-Friendly</div>
            <div className="hidden xl:block">Content Types</div>
            <div className="text-center">Posts</div>
            <div className="text-right">Actions</div>
          </div>
          
          {/* Mobile Header - Only shows on small screens */}
          <div className="lg:hidden flex justify-between items-center px-4 py-3 border-b border-[#222222] text-sm text-gray-400">
            <div>Subreddit</div>
            <div>Details</div>
          </div>

          <div className="divide-y divide-[#222222]">
            {filteredSubreddits.map(saved => (
              <div key={saved.id}>
                <div
                  onClick={() => toggleSubredditExpansion(saved)}
                  className="flex flex-col lg:grid lg:grid-cols-[minmax(200px,2fr)_minmax(150px,1.5fr)_minmax(100px,1fr)_minmax(200px,auto)_80px_220px] gap-4 p-4 lg:px-6 lg:py-4 items-start lg:items-center hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                >
                  {/* Subreddit Name & Icon */}
                  <div className="flex items-center gap-3 w-full min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] overflow-hidden flex-shrink-0">
                      <img
                        src={getSubredditIcon(saved)}
                        alt={`r/${saved.name}`}
                        className="w-full h-full object-cover"
                        onError={e => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${saved.name}&backgroundColor=111111&radius=12`;
                        }}
                      />
                    </div>
                    <div className="font-medium truncate">r/{saved.name}</div>
                  </div>

                  {/* Community Stats */}
                  <div className="flex flex-col text-sm mt-2 lg:mt-0">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Users size={14} />
                      <span>{formatNumber(saved.subscriber_count)}</span>
                    </div>
                    {saved.active_users > 0 && (
                      <div className="flex items-center gap-1.5 text-emerald-400 mt-1">
                        <Activity size={14} />
                        <span className="hidden xs:inline">{formatNumber(saved.active_users)} online</span>
                        <span className="xs:hidden">{formatNumber(saved.active_users)}</span>
                      </div>
                    )}
                  </div>

                  {/* Marketing Score */}
                  <div className="w-full mt-2 lg:mt-0">
                    <div className="w-full max-w-[100px] h-2 bg-[#222222] rounded-full overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${saved.marketing_friendly_score}%`,
                          backgroundColor:
                            saved.marketing_friendly_score >= 80
                              ? '#4CAF50'
                              : saved.marketing_friendly_score >= 60
                              ? '#FFA726'
                              : '#EF5350',
                        }}
                      />
                    </div>
                    <div className="text-sm text-gray-400 mt-1">{saved.marketing_friendly_score}%</div>
                  </div>

                  {/* Content Types */}
                  <div className="hidden sm:flex xl:flex flex-wrap gap-1 mt-2 lg:mt-0 min-w-0 w-full overflow-hidden">
                    {saved.allowed_content.map((type, index) => (
                      <span
                        key={type}
                        className={`inline-flex items-center shrink-0 ${getContentTypeBadge(type)} whitespace-nowrap`}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                  
                  {/* Mobile Content Types - Shows first content type and count */}
                  <div className="sm:hidden flex items-center gap-1 mt-2">
                    {saved.allowed_content.length > 0 && (
                      <>
                        <span className={`inline-flex items-center shrink-0 ${getContentTypeBadge(saved.allowed_content[0])} whitespace-nowrap`}>
                          {saved.allowed_content[0]}
                        </span>
                        {saved.allowed_content.length > 1 && (
                          <span className="text-xs text-gray-400">
                            +{saved.allowed_content.length - 1} more
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Posts Count */}
                  <div className="flex items-center justify-center mt-2 lg:mt-0">
                    <div
                      className={`flex items-center gap-1 ${
                        (postCounts[saved.subreddit_id] || 0) > 0 ? 'text-emerald-400' : 'text-gray-400'
                      }`}
                    >
                      <PostStatsModal
                        subredditId={saved.subreddit_id}
                        className="inline-block"
                        fetchPostCounts={fetchPostCounts}
                      >
                        <div className="flex items-center gap-1">
                          <Calendar size={16} />
                          <span>{postCounts[saved.subreddit_id] || 0}</span>
                        </div>
                      </PostStatsModal>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 mt-4 lg:mt-0 justify-end w-full lg:w-auto">
                    <a
                      href={`https://reddit.com/r/${saved.name}/submit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => {
                        e.stopPropagation();
                        e.preventDefault();
                        window.open(`https://reddit.com/r/${saved.name}/submit`, '_blank');
                      }}
                      className="bg-[#1A1A1A] hover:bg-[#252525] text-gray-200 flex items-center gap-2 h-9 px-4 text-sm whitespace-nowrap rounded-md transition-colors border border-[#333333]"
                      title="Post to Subreddit"
                    >
                      <Send size={16} className="text-gray-400" />
                      <span>Post</span>
                    </a>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedSubreddit({
                            id: saved.subreddit_id,
                            name: saved.name,
                          });
                        }}
                        className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"
                        title="Add to Project"
                      >
                        <FolderPlus size={20} />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          removeSavedSubreddit(saved.id);
                        }}
                        className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"
                        title="Remove from List"
                      >
                        <X size={20} />
                      </button>
                      <div className="text-gray-400 p-2">
                        {expandedSubreddit === saved.name ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>
                </div>

                {expandedSubreddit === saved.name && (
                  <div className="border-t border-[#222222] bg-[#0A0A0A] p-4 lg:p-6">
                    {saved.analysis_data ? (
                      <>
                        <AnalysisCard analysis={saved.analysis_data} mode="saved" />
                        <div className="mt-6">
                          <a
                            href={`https://reddit.com/r/${saved.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#C69B7B] hover:text-[#B38A6A] transition-colors inline-flex items-center gap-2"
                          >
                            View all posts in r/{saved.name}
                            <ChevronRight size={16} />
                          </a>
                        </div>
                      </>
                    ) : expandLoading ? (
                      <div className="text-center py-6">
                        <div className="text-gray-400">Loading analysis data...</div>
                      </div>
                    ) : (
                      <div className="text-center py-6 space-y-4">
                        <div className="text-gray-400">
                          Analysis data is incomplete or unavailable.
                        </div>
                        <a
                          href={`https://reddit.com/r/${saved.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-[#2B543A] hover:bg-[#1F3C2A] text-white rounded-md transition-colors text-sm inline-block"
                        >
                          View Subreddit
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
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

export default SavedList;