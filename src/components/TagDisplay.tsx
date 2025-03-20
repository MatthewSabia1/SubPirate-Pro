import React from 'react';
import { MediaTag } from '../features/campaigns/types';
import { X, Tag as TagIcon } from 'lucide-react';

type Size = 'sm' | 'md' | 'lg';

interface TagDisplayProps {
  tags: MediaTag[];
  onRemove?: (tagId: string) => void;
  size?: Size;
  limit?: number;
  showCount?: boolean;
  className?: string;
  tagClassName?: string;
}

const TagDisplay: React.FC<TagDisplayProps> = ({
  tags,
  onRemove,
  size = 'md',
  limit,
  showCount = false,
  className = '',
  tagClassName = ''
}) => {
  if (!tags || tags.length === 0) return null;
  
  // Sort tags alphabetically
  const sortedTags = [...tags].sort((a, b) => a.name.localeCompare(b.name));
  
  // Limit the number of displayed tags if specified
  const displayedTags = limit && sortedTags.length > limit
    ? sortedTags.slice(0, limit)
    : sortedTags;
  
  // Get the number of hidden tags
  const hiddenCount = limit && sortedTags.length > limit
    ? sortedTags.length - limit
    : 0;
  
  // Get size classes
  const getSizeClasses = (size: Size): string => {
    switch (size) {
      case 'sm': return 'text-xs px-1.5 py-0.5 gap-1';
      case 'lg': return 'text-sm px-3 py-1 gap-2';
      case 'md':
      default: return 'text-xs px-2 py-0.5 gap-1.5';
    }
  };
  
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {displayedTags.map(tag => {
        const sizeClasses = getSizeClasses(size);
        
        return (
          <div
            key={tag.id}
            className={`inline-flex items-center rounded-md ${sizeClasses} bg-[#1A1A1A] text-[#C69B7B] ${tagClassName}`}
            title={tag.name}
          >
            <span>{tag.name}</span>
            {onRemove && (
              <X 
                size={size === 'sm' ? 12 : size === 'lg' ? 16 : 14}
                className="cursor-pointer hover:text-white transition-colors"
                onClick={() => onRemove(tag.id)}
                aria-label={`Remove ${tag.name} tag`}
                title={`Remove ${tag.name}`}
              />
            )}
          </div>
        );
      })}
      
      {hiddenCount > 0 && (
        <div 
          className="inline-flex items-center rounded-md bg-[#1A1A1A] text-gray-300 px-2 py-0.5 text-xs border border-[#333333] hover:bg-[#222222] transition-colors"
          title={`${hiddenCount} more tags not shown`}
        >
          {showCount ? `+${hiddenCount} more` : <TagIcon size={12} />}
        </div>
      )}
    </div>
  );
};

export default TagDisplay;