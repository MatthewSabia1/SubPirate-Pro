import React, { useState, useEffect } from 'react';
import { useCampaigns } from '../contexts/CampaignContext';
import { MediaTag } from '../features/campaigns/types';
import { Pencil, Trash2, Save, X, AlertCircle, Tag as TagIcon } from 'lucide-react';

interface TagManagerProps {
  onClose: () => void;
  className?: string;
}

const TagManager: React.FC<TagManagerProps> = ({ onClose, className = '' }) => {
  const { tags, createTag, updateTag, deleteTag } = useCampaigns();
  const [error, setError] = useState<string | null>(null);
  const [tagList, setTagList] = useState<MediaTag[]>([]);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Default tag color
  const DEFAULT_COLOR = '#808080';
  
  // Load and sort tags
  useEffect(() => {
    const sortedTags = [...tags].sort((a, b) => a.name.localeCompare(b.name));
    setTagList(sortedTags);
  }, [tags]);
  
  const handleEditTag = (tag: MediaTag) => {
    setEditingTag(tag.id);
    setEditName(tag.name);
    setError(null);
  };
  
  const handleCancelEdit = () => {
    setEditingTag(null);
    setEditName('');
    setError(null);
  };
  
  const handleSaveEdit = async (tagId: string) => {
    try {
      if (editName.trim().length === 0) {
        setError('Tag name cannot be empty');
        return;
      }
      
      if (editName.trim().length > 30) {
        setError('Tag name cannot exceed 30 characters');
        return;
      }
      
      await updateTag(tagId, {
        name: editName.trim()
      });
      
      setEditingTag(null);
      setEditName('');
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update tag');
      }
    }
  };
  
  const handleDeleteTag = async (tagId: string) => {
    try {
      // Ask for confirmation
      if (!window.confirm('Are you sure you want to delete this tag? It will be removed from all media items.')) {
        return;
      }
      
      await deleteTag(tagId);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to delete tag');
      }
    }
  };
  
  const handleCreateTag = async () => {
    try {
      if (newTagName.trim().length === 0) {
        setError('Tag name cannot be empty');
        return;
      }
      
      if (newTagName.trim().length > 30) {
        setError('Tag name cannot exceed 30 characters');
        return;
      }
      
      await createTag({
        name: newTagName.trim(),
        color: DEFAULT_COLOR
      });
      
      setNewTagName('');
      setIsCreating(false);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create tag');
      }
    }
  };
  
  return (
    <div className={`bg-[#111111] border border-[#222222] rounded-lg shadow-md overflow-hidden ${className}`}>
      <div className="flex justify-between items-center p-4 border-b border-[#222222]">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <TagIcon size={20} className="text-[#C69B7B]" />
          Tag Manager
        </h2>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-[#2A2A2A] rounded-full"
        >
          <X size={20} className="text-gray-400" />
        </button>
      </div>
      
      {error && (
        <div className="m-4 p-3 bg-red-900/30 border border-red-600/30 text-red-400 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="p-4">
        {isCreating ? (
          <div className="mb-4 p-3 bg-[#1A1A1A] rounded-lg">
            <h3 className="text-gray-200 font-medium mb-2 flex items-center gap-1.5">
              <TagIcon size={16} className="text-[#C69B7B]" />
              Create New Tag
            </h3>
            
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1">Tag name</label>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="w-full bg-[#111111] border border-[#333333] rounded p-2 text-gray-200 focus:outline-none focus:border-[#C69B7B]"
                placeholder="Enter tag name"
                autoFocus
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewTagName('');
                  setError(null);
                }}
                className="px-3 py-1.5 bg-[#222222] hover:bg-[#333333] text-gray-300 text-sm rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTag}
                className="px-3 py-1.5 bg-[#C69B7B] hover:bg-[#B38A6A] text-white text-sm rounded"
              >
                Create Tag
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="mb-4 w-full py-2 border border-dashed border-[#333333] rounded-lg bg-[#1A1A1A] text-[#C69B7B] flex items-center justify-center gap-1.5 hover:bg-[#222222] transition-colors"
          >
            <TagIcon size={16} />
            <span>Create New Tag</span>
          </button>
        )}
        
        <div className="bg-[#1A1A1A] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#111111] border-b border-[#222222]">
              <tr>
                <th className="py-2 px-4 text-left text-xs font-medium text-gray-400">Tag</th>
                <th className="py-2 px-4 text-right text-xs font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]">
              {tagList.length > 0 ? (
                tagList.map(tag => (
                  <tr key={tag.id} className="hover:bg-[#222222]">
                    <td className="py-2 px-4">
                      {editingTag === tag.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-[#111111] border border-[#333333] rounded p-1.5 text-gray-200 focus:outline-none focus:border-[#C69B7B]"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <TagIcon size={16} className="text-[#C69B7B]" />
                          <span className="text-gray-200">{tag.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      {editingTag === tag.id ? (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 bg-[#111111] hover:bg-[#222222] rounded"
                          >
                            <X size={16} className="text-gray-400" />
                          </button>
                          <button
                            onClick={() => handleSaveEdit(tag.id)}
                            className="p-1 bg-[#111111] hover:bg-[#222222] rounded"
                          >
                            <Save size={16} className="text-[#C69B7B]" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleEditTag(tag)}
                            className="p-1 bg-[#111111] hover:bg-[#222222] rounded"
                          >
                            <Pencil size={16} className="text-gray-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteTag(tag.id)}
                            className="p-1 bg-[#111111] hover:bg-red-600/20 rounded"
                          >
                            <Trash2 size={16} className="text-gray-400 hover:text-red-400" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="py-4 px-4 text-center text-gray-400">
                    No tags created yet. Create your first tag above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TagManager;