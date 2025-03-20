import React from 'react';
import { CampaignPost } from '../../features/campaigns/types';
import { Clock, Link as LinkIcon, FileText, Image, RefreshCcw, Calendar, MessageCircle, Activity } from 'lucide-react';

interface PostListProps {
  posts: CampaignPost[];
}

const PostList: React.FC<PostListProps> = ({ posts }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-[#8B6D3F]/20 text-[#FFB74D] border border-[#8B6D3F]/30';
      case 'posted':
        return 'bg-[#2B543A]/20 text-[#4CAF50] border border-[#2B543A]/30';
      case 'failed':
        return 'bg-red-900/20 text-red-400 border border-red-900/30';
      default:
        return 'bg-[#1A1A1A] text-gray-400 border border-[#333333]';
    }
  };

  const renderContentPreview = (post: CampaignPost) => {
    if (post.content_type === 'image') {
      // For image posts, show a small preview of the image
      return (
        <div className="w-12 h-12 bg-[#1A1A1A] rounded-lg overflow-hidden flex-shrink-0 border border-[#333333]">
          {post.content && (
            <img src={post.content} alt="Preview" className="w-full h-full object-cover" />
          )}
          {!post.content && <Image size={20} className="w-full h-full p-3 text-[#C69B7B]" />}
        </div>
      );
    } else if (post.content_type === 'link') {
      // For link posts, show a link icon
      return (
        <div className="w-12 h-12 bg-[#1A1A1A] rounded-lg flex items-center justify-center flex-shrink-0 border border-[#333333]">
          <LinkIcon size={20} className="text-[#C69B7B]" />
        </div>
      );
    } else {
      // For text posts, show a text icon
      return (
        <div className="w-12 h-12 bg-[#1A1A1A] rounded-lg flex items-center justify-center flex-shrink-0 border border-[#333333]">
          <FileText size={20} className="text-[#C69B7B]" />
        </div>
      );
    }
  };

  return (
    <div className="overflow-hidden bg-[#111111] rounded-lg border border-[#222222]">
      <div className="divide-y divide-[#222222]">
        {posts.map(post => (
          <div key={post.id} className="p-4 hover:bg-[#1A1A1A] transition-all duration-200">
            <div className="flex items-start gap-4">
              {renderContentPreview(post)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-200 truncate">{post.title}</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadgeClasses(post.status)}`}>
                    {post.status}
                  </span>
                </div>
                
                <div className="mt-1">
                  <p className="text-sm text-gray-400 truncate">
                    {post.content_type === 'text' 
                      ? post.content.length > 100 
                        ? `${post.content.substring(0, 100)}...` 
                        : post.content
                      : post.content_type === 'link'
                        ? post.content
                        : 'Image post'}
                  </p>
                </div>
                
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {post.status === 'scheduled' && (
                      <span className="flex items-center gap-1">
                        <Calendar size={14} className="text-gray-400" />
                        {formatDate(post.scheduled_for)}
                      </span>
                    )}
                    
                    {post.status === 'posted' && post.posted_at && (
                      <span className="flex items-center gap-1">
                        <Activity size={14} className="text-[#4CAF50]" />
                        {formatDate(post.posted_at)}
                      </span>
                    )}
                    
                    {post.status === 'failed' && post.posted_at && (
                      <span className="flex items-center gap-1">
                        <Activity size={14} className="text-red-400" />
                        Failed on {formatDate(post.posted_at)}
                      </span>
                    )}
                    
                    {post.interval_hours && (
                      <span className="flex items-center gap-1">
                        <RefreshCcw size={14} className="text-[#C69B7B]" />
                        Every {post.interval_hours}h
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {post.use_ai_title && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#4A3B69]/20 text-[#BB86FC] border border-[#4A3B69]/30">
                        AI Title
                      </span>
                    )}
                    
                    {post.use_ai_timing && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#C69B7B]/20 text-[#C69B7B] border border-[#C69B7B]/30">
                        AI Timing
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PostList;