import React, { useEffect, useState, useRef } from 'react';
import { useCampaigns } from '../../contexts/CampaignContext';
import { MediaItem } from '../../features/campaigns/types';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FeatureGate } from '../../components/FeatureGate';
import { 
  UploadCloud, 
  Grid, 
  List, 
  Table as TableIcon, 
  Filter, 
  Search, 
  Trash2, 
  Download, 
  XCircle, 
  Check, 
  CheckSquare, 
  Eye, 
  X, 
  AlertCircle,
  Info,
  Tag as TagIcon,
  Tags as TagsIcon
} from 'lucide-react';
import TagDisplay from '../../components/TagDisplay';
import TagSelector from '../../components/TagSelector';
import TagManager from '../../components/TagManager';
import TaggingModal from '../../components/TaggingModal';

type ViewMode = 'grid' | 'list' | 'table';

interface FilterOptions {
  search: string;
  fileType: string;
  dateRange: string;
  sortBy: 'newest' | 'oldest' | 'name' | 'size';
  tags: string[]; // Array of tag IDs to filter by
}

const defaultFilters: FilterOptions = {
  search: '',
  fileType: 'all',
  dateRange: 'all',
  sortBy: 'newest',
  tags: []
};

const MediaLibraryPage: React.FC = () => {
  const { 
    mediaItems, 
    tags,
    loading, 
    error, 
    fetchMediaItems, 
    fetchTags,
    uploadMedia, 
    deleteMedia,
    addTagToMediaItem,
    removeTagFromMediaItem,
    addTagsToMediaItems,
    removeTagFromMediaItems
  } = useCampaigns();
  
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isTaggingModalOpen, setIsTaggingModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMediaItems();
    fetchTags();
  }, [fetchMediaItems, fetchTags]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Reset previous upload errors
      setUploadError(null);
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setUploadError('Please select an image file (JPG, PNG, GIF, or WebP)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('File size must be less than 5MB');
        return;
      }
      
      setIsUploading(true);
      
      // Simulate upload progress with a more realistic pattern
      let progressSteps = [10, 20, 35, 50, 65, 80, 90];
      let currentStepIndex = 0;
      
      const progressInterval = setInterval(() => {
        if (currentStepIndex < progressSteps.length) {
          setUploadProgress(progressSteps[currentStepIndex]);
          currentStepIndex++;
        } else {
          clearInterval(progressInterval);
        }
      }, 400);
      
      try {
        await uploadMedia(file);
        setUploadProgress(100);
        setTimeout(() => {
          setUploadProgress(0);
          setIsUploading(false);
        }, 500);
      } catch (err: any) {
        console.error('Upload error:', err);
        setUploadError(err.message || 'Failed to upload image');
        setIsUploading(false);
        setUploadProgress(0);
      } finally {
        clearInterval(progressInterval);
        // Reset the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleMediaClick = (media: MediaItem, e: React.MouseEvent) => {
    // If in select mode, toggle selection instead of opening preview
    if (selectMode) {
      toggleSelection(media.id, e);
      return;
    }
    
    setSelectedMedia(media);
  };

  const handleClosePreview = () => {
    setSelectedMedia(null);
  };

  // Handle keyboard events for preview modal (escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedMedia) {
        handleClosePreview();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMedia]);

  const handleDeleteMedia = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this media item? This cannot be undone.')) {
      return;
    }
    
    try {
      await deleteMedia(id);
      if (selectedMedia?.id === id) {
        setSelectedMedia(null);
      }
      // Remove from selected items if it was selected
      if (selectedItems.has(id)) {
        const newSelection = new Set(selectedItems);
        newSelection.delete(id);
        setSelectedItems(newSelection);
      }
    } catch (err) {
      console.error('Error deleting media:', err);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedItems.size} selected item(s)? This cannot be undone.`)) {
      return;
    }
    
    try {
      // Delete all selected items
      for (const id of Array.from(selectedItems)) {
        await deleteMedia(id);
      }
      
      // Clear selection
      setSelectedItems(new Set());
      
      // Close preview if the selected media was deleted
      if (selectedMedia && selectedItems.has(selectedMedia.id)) {
        setSelectedMedia(null);
      }
    } catch (err) {
      console.error('Error deleting selected media:', err);
    }
  };

  const toggleSelection = (id: string, e?: React.MouseEvent) => {
    // Prevent event bubbling if event is provided
    e?.stopPropagation();
    
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  const toggleAllSelection = () => {
    if (selectedItems.size === filteredMediaItems.length) {
      // If all are selected, deselect all
      setSelectedItems(new Set());
    } else {
      // Otherwise, select all
      setSelectedItems(new Set(filteredMediaItems.map(item => item.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedItems(new Set());
  };
  
  // Tag management for a single media item
  const handleAddTagToMedia = async (mediaItemId: string, tagId: string) => {
    try {
      await addTagToMediaItem(mediaItemId, tagId);
    } catch (err) {
      console.error('Error adding tag to media item:', err);
    }
  };
  
  const handleRemoveTagFromMedia = async (mediaItemId: string, tagId: string) => {
    try {
      await removeTagFromMediaItem(mediaItemId, tagId);
    } catch (err) {
      console.error('Error removing tag from media item:', err);
    }
  };
  
  // Bulk tag management for selected items
  const handleAddTagToSelected = async (tagId: string) => {
    if (selectedItems.size === 0) return;
    
    try {
      await addTagsToMediaItems(Array.from(selectedItems), tagId);
    } catch (err) {
      console.error('Error adding tag to selected items:', err);
    }
  };
  
  const handleRemoveTagFromSelected = async (tagId: string) => {
    if (selectedItems.size === 0) return;
    
    try {
      await removeTagFromMediaItems(Array.from(selectedItems), tagId);
    } catch (err) {
      console.error('Error removing tag from selected items:', err);
    }
  };
  
  // Filter by tags - adds or removes a tag from the filter
  const toggleTagFilter = (tagId: string) => {
    setFilters(prev => {
      const currentTags = [...prev.tags];
      const tagIndex = currentTags.indexOf(tagId);
      
      if (tagIndex >= 0) {
        // Remove tag from filter
        currentTags.splice(tagIndex, 1);
      } else {
        // Add tag to filter
        currentTags.push(tagId);
      }
      
      return {
        ...prev,
        tags: currentTags
      };
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  };

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };
  
  // Apply filters to get filtered media items
  const filteredMediaItems = mediaItems
    .filter(item => {
      // Apply search filter
      if (filters.search && !item.filename.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      // Apply file type filter
      if (filters.fileType !== 'all') {
        if (filters.fileType === 'image' && !item.media_type.startsWith('image/')) {
          return false;
        } else if (filters.fileType === 'jpeg' && item.media_type !== 'image/jpeg') {
          return false;
        } else if (filters.fileType === 'png' && item.media_type !== 'image/png') {
          return false;
        } else if (filters.fileType === 'gif' && item.media_type !== 'image/gif') {
          return false;
        }
      }
      
      // Apply date range filter
      if (filters.dateRange !== 'all') {
        const date = new Date(item.uploaded_at);
        const now = new Date();
        
        if (filters.dateRange === 'today') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (date < today) {
            return false;
          }
        } else if (filters.dateRange === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          if (date < weekAgo) {
            return false;
          }
        } else if (filters.dateRange === 'month') {
          const monthAgo = new Date();
          monthAgo.setMonth(now.getMonth() - 1);
          if (date < monthAgo) {
            return false;
          }
        }
      }
      
      // Apply tag filter
      if (filters.tags.length > 0) {
        // If no tags array or empty, and we're filtering by tags, exclude the item
        if (!item.tags || item.tags.length === 0) {
          return false;
        }
        
        // Check if the item has at least one of the selected tag IDs
        const hasMatchingTag = filters.tags.some(tagId => 
          item.tags?.some(tag => tag.id === tagId)
        );
        
        if (!hasMatchingTag) {
          return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      // Apply sorting
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
        case 'oldest':
          return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
        case 'name':
          return a.filename.localeCompare(b.filename);
        case 'size':
          return b.file_size - a.file_size;
        default:
          return 0;
      }
    });

  if (loading && mediaItems.length === 0) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  const renderGridView = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {filteredMediaItems.map(media => (
        <div
          key={media.id}
          className={`relative group cursor-pointer overflow-hidden ${
            selectedItems.has(media.id) 
              ? 'ring-2 ring-[#C69B7B] rounded-lg'
              : 'border border-[#333333] rounded-lg'
          }`}
          onClick={(e) => handleMediaClick(media, e)}
        >
          <div className="aspect-square overflow-hidden bg-[#1A1A1A]">
            <img
              src={media.url}
              alt={media.filename}
              className="w-full h-full object-cover transition-all duration-200 group-hover:scale-105"
            />
          </div>
          
          {/* Selection checkbox or icon */}
          <div className="absolute top-2 left-2 z-10">
            {selectMode && (
              <div 
                className={`w-6 h-6 rounded-md flex items-center justify-center border-2 ${
                  selectedItems.has(media.id) 
                    ? 'bg-[#C69B7B] border-[#C69B7B]' 
                    : 'bg-[#000000]/80 border-white/60 hover:border-white'
                }`}
              >
                {selectedItems.has(media.id) && <Check size={16} className="text-white" />}
              </div>
            )}
          </div>
          
          {/* Media info and actions */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex flex-col justify-between p-2">
            {/* Top actions */}
            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {!selectMode && (
                <div className="flex gap-1">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelection(media.id);
                      setSelectMode(true);
                    }}
                    className="w-7 h-7 rounded-full bg-[#000000]/70 hover:bg-[#222222]/90 flex items-center justify-center text-white"
                    title="Select"
                  >
                    <CheckSquare size={14} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMedia(media);
                    }}
                    className="w-7 h-7 rounded-full bg-[#000000]/70 hover:bg-[#222222]/90 flex items-center justify-center text-white"
                    title="Preview"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              )}
            </div>
            
            {/* Bottom info and actions */}
            <div className="w-full">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/70 rounded p-1.5 mt-1">
                <p className="text-white text-xs truncate">{media.filename}</p>
                
                {/* Tags */}
                {media.tags && media.tags.length > 0 && (
                  <div className="mt-1 mb-1.5">
                    <TagDisplay 
                      tags={media.tags} 
                      size="sm" 
                      limit={2}
                      showCount={true}
                    />
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-300 text-xs">{Math.round(media.file_size / 1024)} KB</span>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const selectedSet = new Set([media.id]);
                        setSelectedItems(selectedSet);
                        setIsTaggingModalOpen(true);
                      }}
                      className="w-6 h-6 rounded-full bg-[#222222] hover:bg-[#C69B7B] flex items-center justify-center text-white transition-colors shadow-sm"
                      title="Manage Tags"
                    >
                      <TagIcon size={12} />
                    </button>
                    <a
                      href={media.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-6 h-6 rounded-full bg-[#222222] hover:bg-[#C69B7B] flex items-center justify-center text-white transition-colors shadow-sm"
                      title="Download"
                    >
                      <Download size={12} />
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMedia(media.id);
                      }}
                      className="w-6 h-6 rounded-full bg-[#222222] hover:bg-red-600 flex items-center justify-center text-white transition-colors shadow-sm"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="divide-y divide-[#222222]">
      {filteredMediaItems.map(media => (
        <div
          key={media.id}
          className={`p-3 hover:bg-[#1A1A1A] transition-all duration-200 flex items-center gap-3 ${
            selectedItems.has(media.id) ? 'bg-[#1A1A1A]' : ''
          }`}
          onClick={(e) => handleMediaClick(media, e)}
        >
          <div className="flex-shrink-0">
            {selectMode ? (
              <div 
                className={`w-5 h-5 rounded flex items-center justify-center border-2 ${
                  selectedItems.has(media.id) 
                    ? 'bg-[#C69B7B] border-[#C69B7B]' 
                    : 'bg-[#111111] border-[#666666] hover:border-white'
                }`}
                onClick={(e) => toggleSelection(media.id, e)}
                title={selectedItems.has(media.id) ? 'Deselect item' : 'Select item'}
              >
                {selectedItems.has(media.id) ? <Check size={12} className="text-white" /> : <div className="w-3 h-3 bg-[#333333] rounded-sm"></div>}
              </div>
            ) : (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelection(media.id);
                  setSelectMode(true);
                }}
                className="w-5 h-5 rounded-full bg-[#222222] hover:bg-[#333333] flex items-center justify-center text-gray-300 hover:text-white"
                title="Select"
              >
                <CheckSquare size={12} />
              </button>
            )}
          </div>
          
          <div className="w-12 h-12 bg-[#1A1A1A] rounded-lg overflow-hidden flex-shrink-0 border border-[#333333]">
            <img src={media.url} alt={media.filename} className="w-full h-full object-cover" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{media.filename}</p>
            <p className="text-xs text-gray-400">{Math.round(media.file_size / 1024)} KB • {new Date(media.uploaded_at).toLocaleDateString()}</p>
            {media.tags && media.tags.length > 0 && (
              <div className="mt-1">
                <TagDisplay 
                  tags={media.tags} 
                  size="sm" 
                  limit={3}
                  showCount={true}
                />
              </div>
            )}
          </div>
          
          <div className="flex-shrink-0 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMedia(media);
              }}
              className="w-8 h-8 rounded bg-[#222222] hover:bg-[#303030] flex items-center justify-center text-gray-200 hover:text-white transition-colors border border-[#333333] shadow-sm"
              title="Preview"
            >
              <Eye size={16} />
            </button>
            <a
              href={media.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded bg-[#222222] hover:bg-[#303030] flex items-center justify-center text-gray-200 hover:text-white transition-colors border border-[#333333] shadow-sm"
              title="Download"
            >
              <Download size={16} />
            </a>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteMedia(media.id);
              }}
              className="w-8 h-8 rounded bg-[#222222] hover:bg-red-600 flex items-center justify-center text-gray-200 hover:text-white transition-colors border border-[#333333] shadow-sm"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full table-auto">
        <thead className="bg-[#111111] border-b border-[#222222]">
          <tr>
            <th className="px-3 py-2 text-left">
              {selectMode ? (
                <div 
                  className={`w-5 h-5 rounded flex items-center justify-center border-2 cursor-pointer ${
                    selectedItems.size === filteredMediaItems.length 
                      ? 'bg-[#C69B7B] border-[#C69B7B]' 
                      : 'bg-[#111111] border-[#666666] hover:border-white'
                  }`}
                  onClick={toggleAllSelection}
                  title={selectedItems.size === filteredMediaItems.length ? "Deselect all" : "Select all"}
                  aria-label={selectedItems.size === filteredMediaItems.length ? "Deselect all items" : "Select all items"}
                >
                  {selectedItems.size === filteredMediaItems.length ? <Check size={12} className="text-white" /> : <div className="w-3 h-3 bg-[#333333] rounded-sm"></div>}
                </div>
              ) : (
                <span className="text-xs font-medium text-gray-400"></span>
              )}
            </th>
            <th className="px-3 py-2 text-left">
              <span className="text-xs font-medium text-gray-400">Preview</span>
            </th>
            <th className="px-3 py-2 text-left">
              <span className="text-xs font-medium text-gray-400">Filename</span>
            </th>
            <th className="px-3 py-2 text-left">
              <span className="text-xs font-medium text-gray-400">Type</span>
            </th>
            <th className="px-3 py-2 text-left">
              <span className="text-xs font-medium text-gray-400">Size</span>
            </th>
            <th className="px-3 py-2 text-left">
              <span className="text-xs font-medium text-gray-400">Uploaded</span>
            </th>
            <th className="px-3 py-2 text-right">
              <span className="text-xs font-medium text-gray-400">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#222222]">
          {filteredMediaItems.map(media => (
            <tr key={media.id} className="hover:bg-[#1A1A1A] transition-all duration-200">
              <td className="px-3 py-2">
                {selectMode ? (
                  <div 
                    className={`w-5 h-5 rounded flex items-center justify-center border-2 cursor-pointer ${
                      selectedItems.has(media.id) 
                        ? 'bg-[#C69B7B] border-[#C69B7B]' 
                        : 'bg-[#111111] border-[#666666] hover:border-white'
                    }`}
                    onClick={() => toggleSelection(media.id)}
                    title={selectedItems.has(media.id) ? 'Deselect item' : 'Select item'}
                  >
                    {selectedItems.has(media.id) ? <Check size={12} className="text-white" /> : <div className="w-3 h-3 bg-[#333333] rounded-sm"></div>}
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      toggleSelection(media.id);
                      setSelectMode(true);
                    }}
                    className="w-5 h-5 rounded-full bg-[#222222] hover:bg-[#333333] flex items-center justify-center text-gray-300 hover:text-white"
                    title="Select"
                  >
                    <CheckSquare size={12} />
                  </button>
                )}
              </td>
              <td className="px-3 py-2">
                <div className="w-10 h-10 bg-[#1A1A1A] rounded overflow-hidden">
                  <img src={media.url} alt={media.filename} className="w-full h-full object-cover" />
                </div>
              </td>
              <td className="px-3 py-2">
                <span className="text-sm text-white">{media.filename}</span>
                {media.tags && media.tags.length > 0 && (
                  <div className="mt-1">
                    <TagDisplay 
                      tags={media.tags} 
                      size="sm" 
                      limit={2}
                      showCount={true}
                    />
                  </div>
                )}
              </td>
              <td className="px-3 py-2">
                <span className="text-sm text-gray-300">{media.media_type.split('/')[1]}</span>
              </td>
              <td className="px-3 py-2">
                <span className="text-sm text-gray-300">{Math.round(media.file_size / 1024)} KB</span>
              </td>
              <td className="px-3 py-2">
                <span className="text-sm text-gray-300">{new Date(media.uploaded_at).toLocaleDateString()}</span>
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => setSelectedMedia(media)}
                    className="w-8 h-8 rounded bg-[#222222] hover:bg-[#303030] flex items-center justify-center text-gray-200 hover:text-white transition-colors border border-[#333333] shadow-sm"
                    title="Preview"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const selectedSet = new Set([media.id]);
                      setSelectedItems(selectedSet);
                      setIsTaggingModalOpen(true);
                    }}
                    className="w-8 h-8 rounded bg-[#222222] hover:bg-[#303030] flex items-center justify-center text-gray-200 hover:text-white transition-colors border border-[#333333] shadow-sm"
                    title="Manage Tags"
                  >
                    <TagIcon size={16} />
                  </button>
                  <a
                    href={media.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded bg-[#222222] hover:bg-[#303030] flex items-center justify-center text-gray-200 hover:text-white transition-colors border border-[#333333] shadow-sm"
                    title="Download"
                  >
                    <Download size={16} />
                  </a>
                  <button
                    onClick={() => handleDeleteMedia(media.id)}
                    className="w-8 h-8 rounded bg-[#222222] hover:bg-red-600 flex items-center justify-center text-gray-200 hover:text-white transition-colors border border-[#333333] shadow-sm"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-6 bg-[#0A0A0A]">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Media Library</h1>
          <FeatureGate feature="campaigns">
            <div className="flex gap-2">
              <button
                onClick={() => setIsTagManagerOpen(true)}
                className="bg-[#1A1A1A] hover:bg-[#252525] text-white font-medium px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-2 border border-[#333333]"
              >
                <TagsIcon size={16} />
                Manage Tags
              </button>
              <button
                onClick={handleFileSelect}
                disabled={isUploading}
                className="bg-[#C69B7B] hover:bg-[#B38A6A] text-white font-medium px-4 py-2 rounded-md transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
              >
                <UploadCloud size={16} />
                {isUploading ? 'Uploading...' : 'Upload Media'}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
          </FeatureGate>
        </div>
        <p className="text-gray-400 mt-1">Manage your media assets for campaigns</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-600/30 text-red-400 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {uploadError && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-600/30 text-red-400 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span><strong>Upload Error:</strong> {uploadError}</span>
        </div>
      )}

      {isUploading && (
        <div className="mb-6">
          <div className="h-2 w-full bg-[#1A1A1A] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C69B7B] transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-400 mt-1">Uploading: {uploadProgress}%</p>
        </div>
      )}

      {/* Toolbar and filters */}
      <div className="bg-[#111111] rounded-lg border border-[#222222] p-3 mb-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          {/* View options */}
          <div className="flex items-center gap-3">
            <div className="bg-[#0A0A0A] p-1 rounded-md flex">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-[#1A1A1A] text-white' : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]/50'}`}
                title="Grid view"
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-[#1A1A1A] text-white' : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]/50'}`}
                title="List view"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md ${viewMode === 'table' ? 'bg-[#1A1A1A] text-white' : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]/50'}`}
                title="Table view"
              >
                <TableIcon size={16} />
              </button>
            </div>
            
            <div className="h-6 border-r border-[#333333]"></div>
            
            {/* Selection actions */}
            {selectMode ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300">{selectedItems.size} selected</span>
                {selectedItems.size > 0 && (
                  <>
                    <button
                      onClick={() => setIsTaggingModalOpen(true)}
                      className="px-3 py-1 bg-[#222222] hover:bg-[#303030] text-gray-200 hover:text-white text-sm rounded-md transition-colors flex items-center gap-1 shadow-sm"
                      title="Manage tags for selected items"
                    >
                      <TagIcon size={14} />
                      Tags
                    </button>
                    <button
                      onClick={handleDeleteSelected}
                      className="px-3 py-1 bg-red-600/80 hover:bg-red-600 text-white text-sm rounded-md transition-colors flex items-center gap-1"
                      title="Delete selected items"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </>
                )}
                <button
                  onClick={exitSelectMode}
                  className="p-1.5 bg-[#222222] hover:bg-[#303030] text-gray-200 rounded-md transition-colors shadow-sm"
                  title="Cancel selection"
                  aria-label="Exit select mode"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSelectMode(true)}
                className="px-3 py-1.5 bg-[#222222] hover:bg-[#303030] text-gray-200 hover:text-white text-sm rounded-md transition-colors flex items-center gap-1 shadow-sm"
                title="Select multiple items"
              >
                <CheckSquare size={14} />
                Select
              </button>
            )}
          </div>

          {/* Search and filter options */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input 
                type="text"
                value={filters.search}
                onChange={handleSearchChange}
                placeholder="Search media..."
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md text-gray-200 py-1.5 px-3 pr-9 focus:outline-none focus:ring-1 focus:ring-[#C69B7B] focus:border-[#C69B7B]"
                aria-label="Search media"
              />
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            </div>
            
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2 rounded-md border ${isFilterOpen ? 'bg-[#1A1A1A] border-[#C69B7B] text-[#C69B7B]' : 'bg-[#1A1A1A] border-[#333333] text-gray-300 hover:text-white'}`}
              title="Filter media"
              aria-label="Toggle filters"
              aria-expanded={isFilterOpen}
            >
              <Filter size={16} />
            </button>
          </div>
        </div>
        
        {/* Extended filter options */}
        {isFilterOpen && (
          <div className="mt-3 pt-3 border-t border-[#222222] space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">File Type</label>
                <select
                  value={filters.fileType}
                  onChange={(e) => handleFilterChange('fileType', e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md text-gray-200 py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-[#C69B7B] focus:border-[#C69B7B]"
                >
                  <option value="all">All Types</option>
                  <option value="image">All Images</option>
                  <option value="jpeg">JPEG</option>
                  <option value="png">PNG</option>
                  <option value="gif">GIF</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md text-gray-200 py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-[#C69B7B] focus:border-[#C69B7B]"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value as any)}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md text-gray-200 py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-[#C69B7B] focus:border-[#C69B7B]"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="size">Size (Largest First)</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="px-4 py-1.5 bg-[#1A1A1A] hover:bg-[#252525] text-gray-300 hover:text-white text-sm rounded-md transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            </div>
            
            {/* Tag filtering */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs text-gray-400">Filter by Tags</label>
                <button
                  onClick={() => setIsTagManagerOpen(true)}
                  className="text-xs text-[#C69B7B] hover:underline flex items-center gap-1"
                >
                  <TagsIcon size={12} />
                  Manage Tags
                </button>
              </div>
              
              {tags.length > 0 ? (
                <div className="bg-[#1A1A1A] border border-[#333333] rounded-md p-2 min-h-[40px] flex flex-wrap gap-1">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTagFilter(tag.id)}
                      className={`px-2 py-0.5 rounded-md text-xs flex items-center gap-1 transition-colors ${
                        filters.tags.includes(tag.id)
                          ? 'bg-[#C69B7B] text-white'
                          : 'bg-[#1A1A1A] text-[#C69B7B]'
                      }`}
                    >
                      {tag.name}
                      {filters.tags.includes(tag.id) && (
                        <X size={12} />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-[#1A1A1A] border border-[#333333] rounded-md p-2 text-gray-400 text-sm">
                  No tags created yet
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      {filteredMediaItems.length === 0 ? (
        <div className="bg-[#111111] rounded-lg shadow-lg p-8 text-center border border-[#222222]">
          {mediaItems.length === 0 ? (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1A1A1A] mb-4">
                <Info size={28} className="text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold mb-3 text-white">No Media Yet</h2>
              <p className="text-gray-400 mb-6">
                Upload images to use in your Reddit campaigns.
              </p>
              <button
                onClick={handleFileSelect}
                className="bg-[#C69B7B] hover:bg-[#B38A6A] text-white font-medium px-6 py-3 rounded-md transition-all duration-200 flex items-center gap-2 mx-auto"
              >
                <UploadCloud size={16} />
                Upload Your First Image
              </button>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1A1A1A] mb-4">
                <Filter size={28} className="text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold mb-3 text-white">No Results Found</h2>
              <p className="text-gray-400 mb-6">
                No media found with your current filters. Try adjusting your search criteria.
              </p>
              <button
                onClick={resetFilters}
                className="bg-[#C69B7B] hover:bg-[#B38A6A] text-white font-medium px-6 py-3 rounded-md transition-all duration-200 flex items-center gap-2 mx-auto"
              >
                Reset Filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-[#111111] rounded-lg shadow-md p-4 border border-[#222222]">
          {viewMode === 'grid' && renderGridView()}
          {viewMode === 'list' && renderListView()}
          {viewMode === 'table' && renderTableView()}
        </div>
      )}

      {/* Media Preview Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#222222] flex justify-between items-center">
              <h3 className="font-semibold text-lg truncate text-white">{selectedMedia.filename}</h3>
              <button 
                onClick={handleClosePreview}
                className="p-1 hover:bg-[#1A1A1A] rounded-full transition-all duration-200"
              >
                <XCircle size={20} className="text-gray-400 hover:text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-[#0A0A0A] p-4">
              <img
                src={selectedMedia.url}
                alt={selectedMedia.filename}
                className="max-w-full max-h-[60vh] object-contain"
              />
            </div>
            <div className="p-4 border-t border-[#222222] bg-[#0F0F0F]">
              {/* Tags */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-gray-300">Tags</h4>
                  <button 
                    onClick={() => {
                      const selectedSet = new Set([selectedMedia.id]);
                      setSelectedItems(selectedSet);
                      setIsTaggingModalOpen(true);
                    }}
                    className="text-xs text-[#C69B7B] hover:underline flex items-center gap-1"
                  >
                    <TagIcon size={12} />
                    Manage Tags
                  </button>
                </div>
                
                {selectedMedia.tags && selectedMedia.tags.length > 0 ? (
                  <TagDisplay 
                    tags={selectedMedia.tags} 
                    size="md"
                    onRemove={(tagId) => handleRemoveTagFromMedia(selectedMedia.id, tagId)}
                  />
                ) : (
                  <p className="text-sm text-gray-500">No tags assigned to this media item</p>
                )}
              </div>
              
              <div className="flex flex-wrap gap-4 justify-between items-center">
                <div>
                  <p className="text-sm text-gray-400">
                    Uploaded: {new Date(selectedMedia.uploaded_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-400">
                    Size: {Math.round(selectedMedia.file_size / 1024)} KB
                  </p>
                  <p className="text-sm text-gray-400">
                    Type: {selectedMedia.media_type}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={selectedMedia.url}
                    download={selectedMedia.filename}
                    className="bg-[#1A1A1A] hover:bg-[#252525] text-white font-medium px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-2 border border-[#333333]"
                  >
                    <Download size={16} />
                    Download
                  </a>
                  <FeatureGate feature="campaigns">
                    <button
                      onClick={() => handleDeleteMedia(selectedMedia.id)}
                      className="bg-red-600/80 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </FeatureGate>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tag Manager Modal */}
      {isTagManagerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh]">
            <TagManager
              onClose={() => setIsTagManagerOpen(false)}
              className="max-h-[90vh] overflow-y-auto"
            />
          </div>
        </div>
      )}
      
      {/* Tagging Modal - for bulk tagging selected items */}
      <TaggingModal
        isOpen={isTaggingModalOpen}
        onClose={() => setIsTaggingModalOpen(false)}
        selectedCount={selectedItems.size}
        currentTags={
          // Find common tags among all selected items
          selectedItems.size === 1 && Array.from(selectedItems)[0]
            ? (mediaItems.find(item => item.id === Array.from(selectedItems)[0])?.tags || [])
            : []
        }
        allTags={tags}
        onAddTag={handleAddTagToSelected}
        onRemoveTag={handleRemoveTagFromSelected}
      />
    </div>
  );
};

export default MediaLibraryPage;