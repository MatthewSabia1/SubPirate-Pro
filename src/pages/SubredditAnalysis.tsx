import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  Target, 
  Gamepad2, 
  BookOpen, 
  Bookmark, 
  BookmarkCheck,
  BookmarkPlus,
  Shield,
  ChevronDown,
  ChevronUp,
  Type,
  TrendingUp,
  Brain,
  Activity
} from 'lucide-react';
import SaveToProjectModal from '../components/SaveToProjectModal';
import { AnalysisResult, AnalysisProgress } from '../lib/analysis';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAnalysis } from '../contexts/AnalysisContext';
import { RedditAPI } from '../lib/redditApi';

interface SubredditAnalysisProps {
  analysis?: AnalysisResult | null;
}

// Early in the file, add type definitions for the map callback parameters
type Restriction = string;
type PostingTime = string;

function SubredditAnalysis({ analysis: initialAnalysis }: SubredditAnalysisProps) {
  const auth = useAuth();
  if (!auth) throw new Error('AuthContext not available');
  
  // Get URL parameter
  const { subreddit: subredditParam } = useParams<{ subreddit: string }>();
  const [subreddit, setSubreddit] = useState<string | null>(subredditParam || null);
  
  // State
  const [error, setError] = useState<string | null>(null);
  const [localAnalysis, setLocalAnalysis] = useState<AnalysisResult | null>(initialAnalysis || null);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({ 
    status: '', 
    progress: 0, 
    indeterminate: false 
  });
  const [showDetailedRules, setShowDetailedRules] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [subredditId, setSubredditId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  
  // Get access to our global analysis context
  const { analyzeSubreddit, queue, currentTask, lastCompletedAnalysis } = useAnalysis();
  
  // When we get a completed analysis from the worker context, update our local state
  useEffect(() => {
    if (lastCompletedAnalysis && 
        lastCompletedAnalysis.info.name.toLowerCase() === subreddit?.toLowerCase()) {
      setLocalAnalysis(lastCompletedAnalysis);
      setAnalysisProgress({ 
        status: 'Analysis complete', 
        progress: 100, 
        indeterminate: false 
      });
    }
  }, [lastCompletedAnalysis, subreddit]);
  
  // Update progress from the current task
  useEffect(() => {
    if (currentTask && currentTask.subreddit.toLowerCase() === subreddit?.toLowerCase()) {
      setAnalysisProgress({
        status: `Analyzing r/${currentTask.subreddit}... (${currentTask.status})`,
        progress: currentTask.progress,
        indeterminate: false
      });
    }
  }, [currentTask, subreddit]);

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

  const getMarketingImpactStyle = (impact: 'high' | 'medium' | 'low') => {
    const styles = {
      high: "bg-gradient-to-r from-red-500 to-rose-600",
      medium: "bg-gradient-to-r from-amber-500 to-amber-600",
      low: "bg-gradient-to-r from-emerald-500 to-emerald-600"
    };
    return `${styles[impact]} text-white px-4 py-1.5 rounded-full text-sm font-medium`;
  };

  const isValidAnalysis = (analysis: unknown): analysis is AnalysisResult => {
    return analysis !== null &&
           typeof analysis === 'object' &&
           'info' in (analysis as any) &&
           'analysis' in (analysis as any) &&
           'posts' in (analysis as any);
  };

  // Start or restart analysis when subreddit changes
  useEffect(() => {
    if (!auth?.user?.id) {
      setError('Please sign in to analyze subreddits');
      return;
    }

    if (!subreddit) {
      setError('Please enter a subreddit name');
      return;
    }

    // Check IndexedDB and localStorage for cached results
    const { getAnalysisForSubreddit } = useAnalysis();
    
    getAnalysisForSubreddit(subreddit)
      .then(result => {
        if (result && isValidAnalysis(result)) {
          setLocalAnalysis(result);
          setAnalysisProgress({ 
            status: 'Loaded from cache', 
            progress: 100, 
            indeterminate: false 
          });
          return true; // Return true to indicate we found a cached result
        }
        return false; // Return false to indicate we need to perform a new analysis
      })
      .then(foundInCache => {
        if (!foundInCache) {
          // Start a new analysis if not found in cache
          analyzeSubreddit(subreddit);
        }
      })
      .catch(err => {
        console.error('Error checking for cached analysis:', err);
        // Fall back to starting a new analysis
        analyzeSubreddit(subreddit);
      });
      
    // Return early - the promises above will handle loading the analysis
    return;
  }, [auth?.user?.id, subreddit, analyzeSubreddit, getAnalysisForSubreddit]);

  // Check if the subreddit is already saved
  useEffect(() => {
    if (!localAnalysis || !auth?.user?.id) return;

    // Check if subreddit exists in database and get its ID
    async function getOrCreateSubredditId() {
      try {
        if (!localAnalysis) return;

        // Use upsert to handle race conditions
        const { data: upsertedSubreddit, error: upsertError } = await supabase
          .from('subreddits')
          .upsert(
            {
              name: localAnalysis.info.name,
              subscriber_count: localAnalysis.info.subscribers,
              active_users: localAnalysis.info.active_users,
              marketing_friendly_score: localAnalysis.analysis.marketingFriendliness.score,
              posting_requirements: {
                restrictions: localAnalysis.analysis.contentStrategy.donts,
                bestTimes: localAnalysis.analysis.postingLimits.bestTimeToPost
              },
              posting_frequency: {
                frequency: localAnalysis.analysis.postingLimits.frequency,
                recommendedTypes: localAnalysis.analysis.contentStrategy.recommendedTypes
              },
              best_practices: localAnalysis.analysis.contentStrategy.dos,
              rules_summary: localAnalysis.info.rules ? JSON.stringify(localAnalysis.info.rules) : null,
              title_template: localAnalysis.analysis.titleTemplates ? localAnalysis.analysis.titleTemplates.patterns[0] : null,
              last_analyzed_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              onConflict: 'name'
            }
          )
          .select();

        if (upsertError) throw upsertError;
        if (!upsertedSubreddit || !upsertedSubreddit[0]) throw new Error('No data returned');

        setSubredditId(upsertedSubreddit[0].id);

        // Check if user has already saved this subreddit
        const { data: savedData, error: savedError } = await supabase
          .from('saved_subreddits')
          .select('*')
          .eq('user_id', auth.user.id)
          .eq('subreddit_id', upsertedSubreddit[0].id)
          .maybeSingle();

        if (savedError) throw savedError;
        setIsSaved(Boolean(savedData));
      } catch (error) {
        console.error('Error checking subreddit saved status:', error);
      }
    }

    getOrCreateSubredditId();
  }, [localAnalysis, auth?.user?.id]);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!auth?.user?.id || !subredditId) return;

    try {
      setSavingState('saving');

      const { error } = await supabase
        .from('saved_subreddits')
        .upsert(
          {
            user_id: auth.user.id,
            subreddit_id: subredditId,
            created_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id,subreddit_id'
          }
        );

      if (error) throw error;
      setIsSaved(true);
      setSavingState('idle');
    } catch (error) {
      console.error('Error saving subreddit:', error);
      setSavingState('error');
      setTimeout(() => setSavingState('idle'), 3000);
    }
  };

  // Display a loading state while analyzing
  const isAnalyzing = Boolean(currentTask) && currentTask?.status === 'processing' && 
                     currentTask?.subreddit.toLowerCase() === subreddit?.toLowerCase();
  
  if (isAnalyzing && !localAnalysis) {
    return (
      <div className="bg-[#111111] rounded-lg p-8 text-center">
        <div className="text-gray-400">
          <p className="mb-4">Analyzing r/{subreddit}...</p>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-[#C69B7B] h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${analysisProgress.progress}%` }}
            ></div>
          </div>
          <p className="mt-4 text-sm">{analysisProgress.status}</p>
        </div>
        
        {/* Queue information */}
        {queue.length > 1 && (
          <div className="mt-8 text-left">
            <h3 className="text-lg font-medium mb-2">Analysis Queue</h3>
            <ul className="space-y-2">
              {queue.map((task) => (
                <li key={task.id} className="flex items-center justify-between">
                  <span className="text-sm">r/{task.subreddit}</span>
                  <span className="text-xs text-gray-500">
                    {task.status === 'queued' ? 'Waiting...' : 
                     task.status === 'processing' ? `${task.progress}%` :
                     task.status === 'completed' ? 'Done' : 'Failed'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#111111] rounded-lg p-8">
        <div className="flex items-center justify-center gap-2 text-red-400">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!localAnalysis) {
    return null;
  }

  const {
    info,
    analysis: {
      marketingFriendliness,
      postingLimits,
      contentStrategy,
      titleTemplates,
      gamePlan,
      strategicAnalysis
    }
  } = localAnalysis;

  return (
    <div className="bg-[#111111] rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <h1 className="text-xl md:text-2xl font-semibold">r/{info.name}</h1>
            <div className="flex items-center gap-2 text-sm md:text-base text-gray-400">
              <Users className="h-4 w-4" />
              <span>{formatNumber(info.subscribers)}</span>
              <Activity className="h-4 w-4 ml-2" />
              <span>{formatNumber(info.active_users)} online</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSaveModal(true)}
              disabled={savingState === 'saving'}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                isSaved 
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <BookmarkPlus size={20} />
              {savingState === 'saving' ? 'Saving...' : isSaved ? 'Save to Project' : 'Save Subreddit'}
            </button>
            
            {/* Save to Project Modal */}
            {showSaveModal && subredditId && (
              <SaveToProjectModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                subredditId={subredditId}
                subredditName={info.name}
                onSaveToList={handleSave}
                isSaved={isSaved}
              />
            )}
            
            {showSaveModal && !subredditId && (
              <SaveToProjectModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                subredditId=""
                subredditName={info.name}
                onSaveToList={handleSave}
                isSaved={isSaved}
              />
            )}
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#C69B7B] to-[#E6B17E] text-white text-sm font-medium">
              {marketingFriendliness.score}% Marketing-Friendly
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-8">
        {/* Marketing Friendliness Meter */}
        <div>
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Marketing Difficulty</span>
            <span>Marketing Friendly</span>
          </div>
          <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
            <div className="h-full transition-all duration-500" style={{
              width: `${marketingFriendliness.score}%`,
              backgroundColor: marketingFriendliness.score >= 75 ? '#4CAF50' :
                             marketingFriendliness.score >= 50 ? '#FFA726' :
                             marketingFriendliness.score >= 25 ? '#F57C00' :
                             '#EF5350'
            }} />
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-gray-400">{marketingFriendliness.reasons[0]}</span>
            <span className={
              marketingFriendliness.score >= 75 ? 'text-green-500' :
              marketingFriendliness.score >= 50 ? 'text-yellow-500' :
              marketingFriendliness.score >= 25 ? 'text-orange-500' :
              'text-red-500'
            }>
              {marketingFriendliness.score >= 75 ? 'Very Marketing-Friendly' :
               marketingFriendliness.score >= 50 ? 'Marketing-Friendly' :
               marketingFriendliness.score >= 25 ? 'Marketing with Caution' :
               'Marketing Restricted'}
            </span>
          </div>
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
              {postingLimits.contentRestrictions.map((restriction: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#C69B7B]">•</span>
                  <span>{restriction}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Best Posting Times */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#C69B7B]" />
              <h3 className="font-medium">Best Posting Times</h3>
            </div>
            <ul className="space-y-2 text-gray-400 text-sm">
              {postingLimits.bestTimeToPost.map((time: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#C69B7B]">•</span>
                  <span>{time}</span>
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
              {contentStrategy.recommendedTypes.map((type) => (
                <span 
                  key={type}
                  className={`px-3 py-1 rounded-full text-sm ${getContentTypeBadgeStyle(type)}`}
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
              {contentStrategy.dos.map((practice, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#C69B7B]">•</span>
                  <span>{practice}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Game Plan */}
        <div className="bg-[#0A0A0A] rounded-lg overflow-hidden border border-gray-800 text-sm md:text-base">
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-[#C69B7B]" />
              <h3 className="font-medium">Game Plan</h3>
            </div>
          </div>

          <div className="p-4 space-y-6">
            {/* Title Template */}
            <div>
              <h4 className="text-sm text-gray-400 mb-3">Title Template</h4>
              <div className="bg-[#111111] rounded-lg p-4 border border-gray-800">
                <code className="text-emerald-400 font-mono block mb-3">
                  {titleTemplates.patterns[0]}
                </code>
                <div className="text-sm text-gray-400">
                  <div className="mb-2">Example:</div>
                  {titleTemplates.examples.map((example, index) => (
                    <div key={index} className="text-white">{example}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm text-gray-400 mb-3">Immediate Actions</h4>
                <ul className="space-y-2 text-gray-300 text-sm">
                  {gamePlan.immediate.map((action, index) => (
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
                  {gamePlan.shortTerm.map((action, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-[#C69B7B]">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Do's and Don'ts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm text-gray-400 mb-3">Do's</h4>
                <ul className="space-y-2 text-gray-300 text-sm">
                  {contentStrategy.dos.map((item, index) => (
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
                  {contentStrategy.donts.map((item, index) => (
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

        {/* Detailed Rules Analysis */}
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
          {showDetailedRules && info.rules && (
            <div className="bg-[#0A0A0A] rounded-lg p-4 border border-gray-800">
              {info.rules.map((rule: any, index: number) => (
                <div key={index} className="mb-4 last:mb-0">
                  <h4 className="font-medium mb-1">Rule {index + 1}: {rule.title}</h4>
                  <p className="text-sm text-gray-400">{rule.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SubredditAnalysis;