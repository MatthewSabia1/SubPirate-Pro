import React, { useState, useEffect } from 'react';
import { Bookmark, Plus, X, Search } from 'lucide-react';
import Modal from './Modal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ErrorMessage from './ui/error-message';
import SuccessMessage from './ui/success-message';
import { isSupabaseError, handleDbError } from '../lib/supabase.types';

interface Project {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
}

interface SaveToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subredditId: string;
  subredditName: string;
  onSaveToList: () => Promise<void>;
  isSaved: boolean;
}

function SaveToProjectModal({ 
  isOpen, 
  onClose, 
  subredditId, 
  subredditName, 
  onSaveToList,
  isSaved 
}: SaveToProjectModalProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToListOnly = async () => {
    if (isSaved) {
      setSaveSuccess('Already saved to your list');
      setTimeout(() => {
        setSaveSuccess(null);
        onClose();
      }, 1500);
      return;
    }

    setSaving(true);
    try {
      await onSaveToList();
      setSaveSuccess('Saved to your list');
      setTimeout(() => {
        setSaveSuccess(null);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error saving to list:', err);
      setError('Failed to save to list');
      setSaving(false);
    }
  };

  const handleAddToProject = async (projectId: string) => {
    setSaving(true);
    setError(null);
    try {
      // First, make sure it's saved to the user's list
      if (!isSaved) {
        await onSaveToList();
      }

      // Check if subreddit is already in project
      const { data: existing, error: checkError } = await supabase
        .from('project_subreddits')
        .select('id')
        .eq('project_id', projectId)
        .eq('subreddit_id', subredditId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        setError('This subreddit is already in the selected project');
        setSaving(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('project_subreddits')
        .insert({
          project_id: projectId,
          subreddit_id: subredditId
        });

      if (insertError) {
        if (insertError.code === '23505') { // Unique constraint violation
          setError('This subreddit is already in the selected project');
        } else if (insertError.code === '23503') { // Foreign key violation
          setError('Failed to add subreddit. Please try saving it first.');
        } else {
          throw insertError;
        }
        setSaving(false);
        return;
      }

      // Show success message before closing
      setSaveSuccess('Added to project successfully');
      setTimeout(() => {
        setSaveSuccess(null);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error adding to project:', err);
      if (isSupabaseError(err)) {
        if (err.code === '23505') {
          setError('This subreddit is already in the project');
        } else if (err.code === '23503') {
          setError('Failed to add subreddit. Please try saving it first.');
        } else {
          setError(handleDbError(err));
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to add subreddit to project');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setSaving(true);
    setError(null);
    try {
      // First, make sure it's saved to the user's list
      if (!isSaved) {
        await onSaveToList();
      }

      // Check if a project with this name already exists for the user
      const { data: existingProject } = await supabase
        .from('projects')
        .select('id')
        .eq('name', newProjectName.trim())
        .eq('user_id', user?.id)
        .maybeSingle();

      if (existingProject) {
        setError('A project with this name already exists');
        setSaving(false);
        return;
      }

      // Create new project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || null,
          user_id: user?.id
        })
        .select('id')
        .single();

      if (projectError) {
        if (projectError.code === '23505') { // Unique constraint violation
          setError('A project with this name already exists');
          return;
        }
        throw projectError;
      }
      
      if (!project) throw new Error('Failed to create project');

      // Add subreddit to new project
      const { error: addError } = await supabase
        .from('project_subreddits')
        .insert({
          project_id: project.id,
          subreddit_id: subredditId
        });

      if (addError) {
        // Handle different error cases
        if (addError.code === '23505') { // Unique constraint violation
          setError('This subreddit is already in the project');
        } else if (addError.code === '23503') { // Foreign key violation
          // Cleanup the created project
          await supabase
            .from('projects')
            .delete()
            .eq('id', project.id);
          setError('Failed to add subreddit to project. Please try saving it first.');
        } else {
          // Cleanup the created project for other errors
          await supabase
            .from('projects')
            .delete()
            .eq('id', project.id);
          throw addError;
        }
        setSaving(false);
        return;
      }

      setSaveSuccess('Project created and subreddit added');
      setTimeout(() => {
        setSaveSuccess(null);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error creating project:', err);
      
      if (isSupabaseError(err)) {
        if (err.code === '23505') {
          setError('A project with this name already exists');
        } else if (err.code === '23503') {
          setError('Failed to add subreddit to project. Please try saving it first.');
        } else {
          setError(handleDbError(err));
        }
      } else if (err instanceof Error && err.message?.includes('foreign key')) {
        setError('Invalid subreddit or project reference');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create project');
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const getProjectImage = (project: Project) => {
    if (project.image_url) return project.image_url;
    return `https://api.dicebear.com/7.x/shapes/svg?seed=${project.name}&backgroundColor=111111`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-1">Save Subreddit</h2>
        <p className="text-gray-400 text-sm mb-6">
          Save r/{subredditName} to your list or add to a project
        </p>

        <ErrorMessage
          message={error}
          className="mb-6"
        />

        <SuccessMessage
          message={saveSuccess}
          className="mb-6"
        />

        {/* Save to List Only button */}
        <div className="mb-6">
          <button
            onClick={handleSaveToListOnly}
            disabled={saving || isSaved}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-colors ${
              isSaved 
                ? 'bg-opacity-50 cursor-not-allowed bg-[#2B543A] text-white'
                : 'bg-[#2B543A] hover:bg-[#1F3C2A] text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            <Bookmark size={20} />
            {isSaved ? 'Already Saved to List' : 'Save to List Only'}
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#111111] px-4 text-sm text-gray-400">OR ADD TO PROJECT</span>
          </div>
        </div>

        {showNewProjectForm ? (
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project Name</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name"
                required
                className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B543A] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description (Optional)</label>
              <input
                type="text"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Enter project description"
                className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B543A] focus:border-transparent"
              />
            </div>

            <div className="flex gap-2">
              <button 
                type="submit" 
                className="flex-1 bg-[#2B543A] hover:bg-[#1F3C2A] text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={saving || !newProjectName.trim()}
              >
                {saving ? 'Creating...' : 'Create & Add'}
              </button>
              <button 
                type="button"
                className="py-2 px-4 border border-gray-600 hover:bg-gray-800 text-gray-300 rounded-md transition-colors"
                onClick={() => setShowNewProjectForm(false)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  className="w-full px-3 py-2 pl-10 bg-[#0f0f0f] border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B543A] focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
              </div>
              <button
                onClick={() => setShowNewProjectForm(true)}
                className="h-10 px-4 rounded-md bg-[#0f0f0f] hover:bg-[#1A1A1A] text-[#ffffff] flex items-center gap-2 transition-colors border border-gray-700"
              >
                <Plus size={20} />
                New
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-400">
                Loading projects...
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {searchQuery ? 'No matching projects found' : 'No projects found'}
              </div>
            ) : (
              <div className="bg-[#0f0f0f] rounded-lg overflow-hidden border border-gray-700">
                <div className="divide-y divide-[#222222]">
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center gap-4 p-4 hover:bg-[#1A1A1A] transition-colors text-[#ffffff]"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#0f0f0f] overflow-hidden flex-shrink-0">
                        <img 
                          src={getProjectImage(project)}
                          alt={project.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${project.name}&backgroundColor=0f0f0f`;
                          }}
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-[15px] text-white">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-gray-400 truncate">
                            {project.description}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleAddToProject(project.id)}
                        disabled={saving}
                        className="bg-[#2B543A] hover:bg-[#1F3C2A] text-white h-8 px-3 rounded-md flex items-center justify-center transition-colors flex-shrink-0"
                        title="Add to this project"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default SaveToProjectModal;