import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, Image, Link as LinkIcon, Send, Type, X, AlertCircle } from 'lucide-react';
import { useCampaigns } from '../../contexts/CampaignContext';
import { supabase } from '../../lib/supabase';
import { ContentType, CreateCampaignPostDto } from '../../features/campaigns/types';
import Modal from '../Modal';
import { RedditPostingService } from '../../features/campaigns/services/reddit';
import { useModalState } from '../../hooks/useModalState';

interface CreatePostModalProps {
  campaignId: string;
  onClose: () => void;
  onCreated: () => void;
  isOpen: boolean;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ campaignId, onClose, onCreated, isOpen }) => {
  const { createCampaignPost, mediaItems, fetchMediaItems } = useCampaigns();
  
  // Configure default values for form fields
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };
  
  const getDefaultTime = () => {
    const hours = 12;
    const minutes = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };
  
  // Use our custom hook to manage form state
  const {
    state: {
      title,
      content,
      contentType,
      redditAccountId,
      subredditId,
      subredditInput,
      scheduledDate,
      scheduledTime,
      intervalHours,
      mediaItemId,
      useAiTitle,
      useAiTiming,
      isRecurring
    },
    updateField,
    error,
    setError,
    isSubmitting,
    setIsSubmitting
  } = useModalState({
    title: '',
    content: '',
    contentType: 'text' as ContentType,
    redditAccountId: '',
    subredditId: '',
    subredditInput: '',
    scheduledDate: getTomorrowDate(),
    scheduledTime: getDefaultTime(),
    intervalHours: '' as number | '',
    mediaItemId: '',
    useAiTitle: false,
    useAiTiming: false,
    isRecurring: false
  }, isOpen);
  
  const [subreddits, setSubreddits] = useState<{ id: string; name: string }[]>([]);
  const [filteredSubreddits, setFilteredSubreddits] = useState<{ id: string; name: string }[]>([]);
  const [showSubredditDropdown, setShowSubredditDropdown] = useState(false);
  const [redditAccounts, setRedditAccounts] = useState<{ id: string; username: string }[]>([]);

  // Fetch necessary data on modal open
  useEffect(() => {
    if (isOpen) {
      // Fetch media items
      fetchMediaItems();
      
      // Fetch Reddit accounts
      fetchRedditAccounts();
      
      // Fetch subreddits
      fetchSubreddits();
    }
  }, [isOpen, fetchMediaItems]);
  
  // Fetch Reddit accounts
  const fetchRedditAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('reddit_accounts')
        .select('id, username')
        .eq('is_active', true);
      
      if (error) throw error;
      setRedditAccounts(data || []);
    } catch (err) {
      console.error('Error fetching Reddit accounts:', err);
    }
  };
  
  // Filter subreddits based on input
  useEffect(() => {
    if (subredditInput) {
      const filtered = subreddits.filter(sub => 
        sub.name.toLowerCase().includes(subredditInput.toLowerCase())
      );
      setFilteredSubreddits(filtered);
    } else {
      setFilteredSubreddits(subreddits);
    }
  }, [subredditInput, subreddits]);

  const handleContentTypeChange = (type: ContentType) => {
    updateField('contentType', type);
  };

  const handleSubredditSelect = (id: string, name: string) => {
    updateField('subredditId', id);
    updateField('subredditInput', name);
    setShowSubredditDropdown(false);
  };

  const toggleAiTitle = () => {
    updateField('useAiTitle', !useAiTitle);
    if (!useAiTitle) {
      // When enabling AI title, clear the manual title
      updateField('title', '');
    }
  };

  const toggleAiTiming = () => {
    updateField('useAiTiming', !useAiTiming);
    if (!useAiTiming) {
      // When enabling AI timing, clear the manual scheduling
      // We'll keep the default date and time as fallback values
      // but we'll let the AI service determine the actual values
    }
  };

  const toggleRecurring = () => {
    const newValue = !isRecurring;
    updateField('isRecurring', newValue);
    
    if (!newValue) {
      // When disabling recurring, clear interval
      updateField('intervalHours', '');
    } else {
      // When enabling recurring, set default interval (24 hours)
      updateField('intervalHours', 24);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!redditAccountId) {
      setError('Please select a Reddit account');
      return;
    }
    
    if (!subredditId) {
      setError('Please select a subreddit');
      return;
    }
    
    if (!useAiTitle && !title.trim()) {
      setError('Please enter a title or use AI title generation');
      return;
    }
    
    if (contentType === 'text' && !content.trim()) {
      setError('Please enter content for your text post');
      return;
    }
    
    if (contentType === 'link' && !content.trim()) {
      setError('Please enter a URL for your link post');
      return;
    }
    
    if (contentType === 'image' && !mediaItemId) {
      setError('Please select an image for your post');
      return;
    }
    
    if (!useAiTiming && (!scheduledDate || !scheduledTime)) {
      setError('Please set a scheduled date and time or use AI timing');
      return;
    }
    
    if (isRecurring && (!intervalHours || intervalHours < 1)) {
      setError('Please set a valid interval for recurring posts (minimum 1 hour)');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      let scheduledFor: string;
      
      if (useAiTiming) {
        // Simulate AI determining the optimal time (24 hours from now)
        const optimalTime = await RedditPostingService.getOptimalPostingTime(subredditId);
        scheduledFor = optimalTime.toISOString();
      } else {
        // Combine date and time for scheduled_for
        // Ensure we create valid ISO date with timezone info 
        const dateObj = new Date(`${scheduledDate}T${scheduledTime}:00`);
        if (isNaN(dateObj.getTime())) {
          throw new Error('Invalid date or time format');
        }
        scheduledFor = dateObj.toISOString();
      }
      
      // If using AI title, generate one (this is a placeholder)
      let finalTitle = title;
      if (useAiTitle) {
        finalTitle = await RedditPostingService.generateAiTitle(subredditId, content);
      }
      
      const post: CreateCampaignPostDto = {
        campaign_id: campaignId,
        reddit_account_id: redditAccountId,
        subreddit_id: subredditId,
        title: finalTitle,
        content_type: contentType,
        content: content,
        scheduled_for: scheduledFor,
        use_ai_title: useAiTitle,
        use_ai_timing: useAiTiming
      };
      
      // Add optional fields
      if (isRecurring && intervalHours) {
        post.interval_hours = Number(intervalHours);
      }
      
      if (contentType === 'image' && mediaItemId) {
        post.media_item_id = mediaItemId;
      }
      
      await createCampaignPost(post);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while creating the post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-[#111111] p-6 rounded-lg shadow-md border border-[#222222] max-w-4xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Create New Post</h2>
            <p className="text-gray-400 text-sm mt-1">Schedule a new post for your campaign</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-[#1A1A1A] rounded-full transition-all duration-200"
            aria-label="Close"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-900/30 text-red-400 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account & Subreddit Selection */}
            <div className="space-y-4">
              <div>
                <label htmlFor="redditAccount" className="block text-sm font-medium text-gray-200 mb-1.5">
                  Reddit Account *
                </label>
                <select
                  id="redditAccount"
                  value={redditAccountId}
                  onChange={(e) => updateField('redditAccountId', e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md shadow-sm text-gray-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#C69B7B] focus:border-[#C69B7B]"
                  required
                >
                  <option value="">Select an account</option>
                  {redditAccounts.map(account => (
                    <option key={account.id} value={account.id}>u/{account.username}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="subreddit" className="block text-sm font-medium text-gray-200 mb-1.5">
                  Subreddit *
                </label>
                <div className="relative">
                  <input
                    id="subreddit"
                    type="text"
                    value={subredditInput}
                    onChange={(e) => {
                      updateField('subredditInput', e.target.value);
                      setShowSubredditDropdown(true);
                    }}
                    onClick={() => setShowSubredditDropdown(true)}
                    placeholder="Search for a subreddit"
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md shadow-sm text-gray-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#C69B7B] focus:border-[#C69B7B] pr-10"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown size={16} className="text-gray-400" />
                  </div>
                  
                  {showSubredditDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-[#1A1A1A] border border-[#333333] rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredSubreddits.length > 0 ? (
                        filteredSubreddits.map(sub => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleSubredditSelect(sub.id, sub.name)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[#252525] transition-all duration-200"
                          >
                            r/{sub.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-gray-400">No subreddits found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Post Type & Content */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1.5">
                  Content Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleContentTypeChange('text')}
                    className={`px-4 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all duration-200 ${
                      contentType === 'text'
                        ? 'bg-[#C69B7B] text-white'
                        : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#252525] border border-[#333333]'
                    }`}
                  >
                    <Type size={16} />
                    <span>Text</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleContentTypeChange('link')}
                    className={`px-4 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all duration-200 ${
                      contentType === 'link'
                        ? 'bg-[#C69B7B] text-white'
                        : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#252525] border border-[#333333]'
                    }`}
                  >
                    <LinkIcon size={16} />
                    <span>Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleContentTypeChange('image')}
                    className={`px-4 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all duration-200 ${
                      contentType === 'image'
                        ? 'bg-[#C69B7B] text-white'
                        : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#252525] border border-[#333333]'
                    }`}
                  >
                    <Image size={16} />
                    <span>Image</span>
                  </button>
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  id="useAiTitle"
                  type="checkbox"
                  checked={useAiTitle}
                  onChange={toggleAiTitle}
                  className="h-4 w-4 text-[#C69B7B] bg-[#1A1A1A] border-[#333333] rounded focus:ring-[#C69B7B] focus:ring-offset-0"
                />
                <label htmlFor="useAiTitle" className="ml-2 block text-sm text-gray-200">
                  Use AI to generate title
                </label>
              </div>
            </div>
          </div>
          
          {/* Post Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-200 mb-1.5">
              Post Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => updateField('title', e.target.value)}
              disabled={useAiTitle}
              className={`w-full bg-[#1A1A1A] border border-[#333333] rounded-md shadow-sm text-gray-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#C69B7B] focus:border-[#C69B7B] ${
                useAiTitle ? 'bg-[#111111] opacity-75' : ''
              }`}
              placeholder={useAiTitle ? 'AI will generate a title' : 'Enter post title'}
              required={!useAiTitle}
            />
          </div>
          
          {/* Content area based on content type */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-200 mb-1.5">
              {contentType === 'text' ? 'Post Content *' : contentType === 'link' ? 'URL *' : 'Select Image *'}
            </label>
            
            {contentType === 'text' ? (
              <textarea
                id="content"
                value={content}
                onChange={(e) => updateField('content', e.target.value)}
                rows={5}
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md shadow-sm text-gray-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#C69B7B] focus:border-[#C69B7B]"
                placeholder="Enter your post content"
                required
              />
            ) : contentType === 'link' ? (
              <input
                id="content"
                type="url"
                value={content}
                onChange={(e) => updateField('content', e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md shadow-sm text-gray-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#C69B7B] focus:border-[#C69B7B]"
                placeholder="https://example.com/your-link"
                required
              />
            ) : (
              <div className="space-y-3">
                <select
                  id="mediaItem"
                  value={mediaItemId}
                  onChange={(e) => updateField('mediaItemId', e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md shadow-sm text-gray-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#C69B7B] focus:border-[#C69B7B]"
                  required
                >
                  <option value="">Select an image</option>
                  {mediaItems.map(item => (
                    <option key={item.id} value={item.id}>{item.filename}</option>
                  ))}
                </select>
                
                {mediaItems.length === 0 && (
                  <div className="p-3 bg-[#1A1A1A] rounded-md text-sm text-gray-400">
                    No images available. Please upload images in the Media Library.
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Scheduling Section */}
          <div className="border-t border-[#222222] pt-5 mt-6">
            <h3 className="text-lg font-medium text-white mb-4">Post Scheduling</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center mb-2">
                  <input
                    id="useAiTiming"
                    type="checkbox"
                    checked={useAiTiming}
                    onChange={toggleAiTiming}
                    className="h-4 w-4 text-[#C69B7B] bg-[#1A1A1A] border-[#333333] rounded focus:ring-[#C69B7B] focus:ring-offset-0"
                  />
                  <label htmlFor="useAiTiming" className="ml-2 block text-sm text-gray-200">
                    Use AI to optimize posting time
                  </label>
                </div>
                
                {!useAiTiming && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-200 mb-1.5">
                        Date *
                      </label>
                      <div className="relative">
                        <input
                          id="scheduledDate"
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => updateField('scheduledDate', e.target.value)}
                          className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md shadow-sm text-gray-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#C69B7B] focus:border-[#C69B7B] pr-10"
                          required
                        />
                        <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-200 mb-1.5">
                        Time *
                      </label>
                      <input
                        id="scheduledTime"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => updateField('scheduledTime', e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md shadow-sm text-gray-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#C69B7B] focus:border-[#C69B7B]"
                        required
                      />
                    </div>
                  </div>
                )}
                
                {useAiTiming && (
                  <div className="p-3 bg-[#1A1A1A] border border-[#333333] rounded-md text-sm text-gray-300">
                    AI will determine the optimal time to post based on subreddit activity analysis.
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center mb-2">
                  <input
                    id="isRecurring"
                    type="checkbox"
                    checked={isRecurring}
                    onChange={toggleRecurring}
                    className="h-4 w-4 text-[#C69B7B] bg-[#1A1A1A] border-[#333333] rounded focus:ring-[#C69B7B] focus:ring-offset-0"
                  />
                  <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-200">
                    Repeat post at regular intervals
                  </label>
                </div>
                
                {isRecurring && (
                  <div>
                    <label htmlFor="intervalHours" className="block text-sm font-medium text-gray-200 mb-1.5">
                      Repeat every * (hours)
                    </label>
                    <select
                      id="intervalHours"
                      value={intervalHours}
                      onChange={(e) => updateField('intervalHours', Number(e.target.value))}
                      className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md shadow-sm text-gray-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#C69B7B] focus:border-[#C69B7B]"
                      required={isRecurring}
                    >
                      <option value="24">24 hours (once daily)</option>
                      <option value="48">48 hours (every 2 days)</option>
                      <option value="72">72 hours (every 3 days)</option>
                      <option value="168">168 hours (weekly)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-5 mt-5 border-t border-[#222222]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-[#1A1A1A] border border-[#333333] rounded-md shadow-sm hover:bg-[#252525] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B] focus:ring-offset-2 focus:ring-offset-[#0A0A0A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-[#C69B7B] border border-transparent rounded-md shadow-sm hover:bg-[#B38A6A] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B] focus:ring-offset-2 focus:ring-offset-[#0A0A0A] disabled:opacity-50 flex items-center"
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Post'}
              <Send size={16} className="ml-2" />
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreatePostModal;