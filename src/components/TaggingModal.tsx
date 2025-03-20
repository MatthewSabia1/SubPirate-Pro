import React, { useState, useEffect } from 'react';
import { X, Tag as TagIcon, Plus, Minus } from 'lucide-react';
import { MediaTag } from '../features/campaigns/types';
import TagSelector from './TagSelector';
import TagDisplay from './TagDisplay';

interface TaggingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  currentTags: MediaTag[];
  allTags: MediaTag[];
  onAddTag: (tagId: string) => Promise<void>;
  onRemoveTag: (tagId: string) => Promise<void>;
}

const TaggingModal: React.FC<TaggingModalProps> = ({
  isOpen,
  onClose,
  selectedCount,
  currentTags,
  allTags,
  onAddTag,
  onRemoveTag
}) => {
  const [selectedTags, setSelectedTags] = useState<MediaTag[]>([]);
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedTags([]);
      setMode('add');
      setError(null);
    }
  }, [isOpen]);
  
  const availableTags = mode === 'add'
    // For add mode, show tags that aren't already on all selected items
    ? allTags.filter(tag => !currentTags.some(t => t.id === tag.id))
    // For remove mode, only show tags that are on at least some selected items
    : currentTags;
  
  const handleSubmit = async () => {
    if (selectedTags.length === 0) {
      setError('Please select at least one tag');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Process each selected tag
      for (const tag of selectedTags) {
        if (mode === 'add') {
          await onAddTag(tag.id);
        } else {
          await onRemoveTag(tag.id);
        }
      }
      
      // Close modal on success
      onClose();
    } catch (err) {
      setError('Failed to update tags');
      console.error('Error updating tags:', err);
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111111] rounded-lg max-w-md w-full flex flex-col">
        <div className="p-4 border-b border-[#222222] flex justify-between items-center">
          <h3 className="font-semibold text-lg flex items-center gap-2 text-white">
            <TagIcon size={18} className="text-[#C69B7B]" aria-hidden="true" />
            {mode === 'add' ? 'Add Tags' : 'Remove Tags'}
          </h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-[#1A1A1A] rounded-full transition-all duration-200"
            title="Close"
            aria-label="Close dialog"
          >
            <X size={20} className="text-gray-400 hover:text-white" />
          </button>
        </div>
        
        <div className="p-4">
          <p className="text-gray-300 mb-4">
            {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
          </p>
          
          <div className="mb-4">
            <div className="flex space-x-1 bg-[#1A1A1A] p-1 rounded-md w-fit mb-3">
              <button
                className={`px-3 py-1 rounded-md flex items-center gap-1.5 text-sm ${
                  mode === 'add' ? 'bg-[#C69B7B] text-white' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setMode('add')}
              >
                <Plus size={16} />
                Add Tags
              </button>
              <button
                className={`px-3 py-1 rounded-md flex items-center gap-1.5 text-sm ${
                  mode === 'remove' ? 'bg-[#C69B7B] text-white' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setMode('remove')}
              >
                <Minus size={16} />
                Remove Tags
              </button>
            </div>
            
            {mode === 'add' && currentTags.length > 0 && (
              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-1">Current Tags</label>
                <TagDisplay tags={currentTags} size="sm" />
              </div>
            )}
            
            <label className="block text-xs text-gray-400 mb-1">
              {mode === 'add' ? 'Select Tags to Add' : 'Select Tags to Remove'}
            </label>
            
            <div className="relative z-50 min-w-[200px]">
              <TagSelector
                selectedTags={selectedTags}
                onChange={setSelectedTags}
                placeholder={`Select tags to ${mode}...`}
                allowCreate={mode === 'add'}
                maxHeight={150}
              />
            </div>
            
            {error && (
              <div className="mt-2 text-sm text-red-400">
                {error}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 border-t border-[#222222] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333333] text-gray-300 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isProcessing || selectedTags.length === 0}
            className="px-4 py-2 bg-[#C69B7B] hover:bg-[#B38A6A] text-white rounded-md flex items-center gap-1.5 disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : (
              <>
                {mode === 'add' ? (
                  <>
                    <Plus size={16} />
                    Add Tags
                  </>
                ) : (
                  <>
                    <Minus size={16} />
                    Remove Tags
                  </>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaggingModal;