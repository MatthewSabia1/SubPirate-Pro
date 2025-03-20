import React, { useState, useRef, useEffect } from 'react';
import { useCampaigns } from '../contexts/CampaignContext';
import { MediaTag, CreateTagDto } from '../features/campaigns/types';
import { X, Plus, ChevronDown, Check, Tag as TagIcon } from 'lucide-react';

interface TagSelectorProps {
  selectedTags: MediaTag[];
  onChange: (tags: MediaTag[]) => void;
  allowCreate?: boolean;
  placeholder?: string;
  maxHeight?: number;
  disabled?: boolean;
  className?: string;
}

const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onChange,
  allowCreate = true,
  placeholder = 'Select tags...',
  maxHeight = 300,
  disabled = false,
  className = ''
}) => {
  const { tags, createTag } = useCampaigns();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Default color for tag creation
  const DEFAULT_COLOR = '#808080';
  
  // Filter tags that match the search input and are not already selected
  const filteredTags = tags
    .filter(tag => 
      !selectedTags.some(t => t.id === tag.id) && 
      tag.name.toLowerCase().includes(inputValue.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  
  // Close the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setInputValue('');
        setIsCreatingTag(false);
        setError(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Focus the input when opening the dropdown
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  
  const handleToggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setInputValue('');
      setIsCreatingTag(false);
      setError(null);
    }
  };
  
  const handleRemoveTag = (tagId: string) => {
    if (!disabled) {
      onChange(selectedTags.filter(tag => tag.id !== tagId));
    }
  };
  
  const handleSelectTag = (tag: MediaTag) => {
    onChange([...selectedTags, tag]);
    setInputValue('');
    setIsOpen(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setError(null);
  };
  
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setInputValue('');
    } else if (e.key === 'Enter' && inputValue.trim() && allowCreate && !isCreatingTag) {
      e.preventDefault();
      // Check if the tag already exists
      const existingTag = tags.find(
        tag => tag.name.toLowerCase() === inputValue.trim().toLowerCase()
      );
      
      if (existingTag) {
        // If it exists and is not selected, select it
        if (!selectedTags.some(t => t.id === existingTag.id)) {
          handleSelectTag(existingTag);
        } else {
          setError(`Tag "${existingTag.name}" is already selected`);
        }
      } else {
        // If it doesn't exist, start the tag creation process
        handleCreateTag();
      }
    }
  };
  
  const handleCreateTag = async () => {
    try {
      if (inputValue.trim().length === 0) {
        setError('Tag name cannot be empty');
        return;
      }
      
      if (inputValue.trim().length > 30) {
        setError('Tag name cannot exceed 30 characters');
        return;
      }
      
      const newTag: CreateTagDto = {
        name: inputValue.trim(),
        color: DEFAULT_COLOR
      };
      
      const createdTag = await createTag(newTag);
      handleSelectTag(createdTag);
      setIsCreatingTag(false);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create tag');
      }
    }
  };
  
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div 
        className={`min-h-[40px] px-2 py-1 border ${isOpen ? 'border-[#C69B7B]' : 'border-[#333333]'} ${disabled ? 'bg-[#111111] opacity-60' : 'bg-[#1A1A1A]'} rounded-md cursor-pointer flex flex-wrap items-center gap-1`}
        onClick={handleToggleDropdown}
      >
        {selectedTags.length === 0 ? (
          <span className="text-gray-400 py-1 px-1">{placeholder}</span>
        ) : (
          <>
            {selectedTags.map(tag => (
              <div
                key={tag.id}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-sm bg-[#1A1A1A] text-[#C69B7B]"
              >
                <span>{tag.name}</span>
                {!disabled && (
                  <X 
                    size={14} 
                    className="hover:text-white cursor-pointer" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(tag.id);
                    }}
                  />
                )}
              </div>
            ))}
          </>
        )}
        
        {!disabled && (
          <div className="ml-auto flex items-center">
            <ChevronDown size={16} className="text-gray-400" aria-hidden="true" />
          </div>
        )}
      </div>
      
      {isOpen && (
        <div 
          className="absolute z-50 w-full mt-1 border border-[#333333] bg-[#1A1A1A] rounded-md shadow-xl overflow-visible flex flex-col"
          style={{ maxHeight: `${maxHeight}px`, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.1)' }}
        >
          <div className="p-2 border-b border-[#222222]">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder="Search or create tag..."
              className="w-full bg-[#111111] border border-[#333333] rounded p-1.5 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#C69B7B]"
            />
            {error && <div className="text-red-400 text-xs mt-1">{error}</div>}
          </div>
          
          <div className="overflow-y-auto max-h-[150px] z-50">
            {filteredTags.length > 0 ? (
              <div className="py-1">
                {filteredTags.map(tag => (
                  <div
                    key={tag.id}
                    className="px-3 py-2 hover:bg-[#222222] cursor-pointer flex items-center gap-2 text-sm text-gray-200"
                    onClick={() => handleSelectTag(tag)}
                  >
                    <TagIcon size={14} className="text-[#C69B7B]" />
                    <span>{tag.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              inputValue.trim() && allowCreate ? (
                <div 
                  className="px-3 py-2 hover:bg-[#222222] cursor-pointer flex items-center gap-2 text-sm"
                  onClick={handleCreateTag}
                >
                  <Plus size={14} className="text-[#C69B7B]" />
                  <span className="text-[#C69B7B]">Create tag "{inputValue}"</span>
                </div>
              ) : (
                <div className="px-3 py-2 text-gray-500 text-center text-sm">
                  {inputValue ? 'No matching tags' : 'Type to search or create tags'}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagSelector;