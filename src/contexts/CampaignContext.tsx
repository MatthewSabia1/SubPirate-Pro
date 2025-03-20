import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { campaignApi } from '../features/campaigns/lib/api';
import { 
  Campaign, 
  CampaignPost, 
  MediaItem, 
  CreateCampaignDto, 
  CreateCampaignPostDto,
  UpdateCampaignDto,
  UpdateCampaignPostDto
} from '../features/campaigns/types';
import { handleCampaignError } from '../features/campaigns/services/errors';
import { useAuth } from './AuthContext';

interface CampaignContextType {
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  campaignPosts: CampaignPost[];
  mediaItems: MediaItem[];
  tags: MediaTag[];
  campaignTagPreferences: CampaignTagPreference[];
  loading: boolean;
  error: string | null;
  
  // Campaign methods
  fetchCampaigns: () => Promise<void>;
  fetchCampaignById: (id: string) => Promise<void>;
  createCampaign: (campaign: CreateCampaignDto) => Promise<Campaign>;
  updateCampaign: (id: string, updates: UpdateCampaignDto) => Promise<Campaign>;
  deleteCampaign: (id: string) => Promise<void>;
  
  // Campaign post methods
  fetchCampaignPosts: (campaignId: string) => Promise<void>;
  createCampaignPost: (post: CreateCampaignPostDto) => Promise<CampaignPost>;
  updateCampaignPost: (id: string, updates: UpdateCampaignPostDto) => Promise<CampaignPost>;
  deleteCampaignPost: (id: string) => Promise<void>;
  
  // Media methods
  fetchMediaItems: () => Promise<void>;
  fetchMediaItemsByTag: (tagId: string) => Promise<MediaItem[]>;
  uploadMedia: (file: File) => Promise<MediaItem>;
  deleteMedia: (id: string) => Promise<void>;
  
  // Tag methods
  fetchTags: () => Promise<void>;
  createTag: (tag: CreateTagDto) => Promise<MediaTag>;
  updateTag: (id: string, updates: UpdateTagDto) => Promise<MediaTag>;
  deleteTag: (id: string) => Promise<void>;
  
  // Media-tag relationship methods
  addTagToMediaItem: (mediaItemId: string, tagId: string) => Promise<void>;
  removeTagFromMediaItem: (mediaItemId: string, tagId: string) => Promise<void>;
  addTagsToMediaItems: (mediaItemIds: string[], tagId: string) => Promise<void>;
  removeTagFromMediaItems: (mediaItemIds: string[], tagId: string) => Promise<void>;
  
  // Campaign tag preferences
  fetchCampaignTagPreferences: (campaignId: string) => Promise<void>;
  setCampaignTagPreference: (campaignId: string, tagId: string, weight: number) => Promise<void>;
  removeCampaignTagPreference: (campaignId: string, tagId: string) => Promise<void>;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export const CampaignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [campaignPosts, setCampaignPosts] = useState<CampaignPost[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [tags, setTags] = useState<MediaTag[]>([]);
  const [campaignTagPreferences, setCampaignTagPreferences] = useState<CampaignTagPreference[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Flag to track if we've already determined the tables don't exist
  const [tablesNotFound, setTablesNotFound] = useState<boolean>(false);

  // Helper function to check if the error is a "table does not exist" error
  const isTableNotFoundError = (err: any): boolean => {
    return (
      err?.status === 404 || 
      err?.code === "PGRST116" || 
      (typeof err?.message === 'string' && 
       (err.message.includes('relation') && err.message.includes('does not exist')))
    );
  };

  // Fetch all campaigns
  const fetchCampaigns = useCallback(async () => {
    if (!user || tablesNotFound) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await campaignApi.getCampaigns();
      setCampaigns(data);
    } catch (err) {
      if (isTableNotFoundError(err)) {
        console.warn("Campaigns table not found. The database migration needs to be run.");
        setCampaigns([]);
        setTablesNotFound(true);
        setError("The campaigns feature is not yet fully set up. Please run the database migration.");
      } else {
        setError(handleCampaignError(err));
      }
    } finally {
      setLoading(false);
    }
  }, [user, tablesNotFound]);

  // Fetch a specific campaign by ID
  const fetchCampaignById = useCallback(async (id: string) => {
    if (!user || tablesNotFound) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await campaignApi.getCampaignById(id);
      setCurrentCampaign(data);
    } catch (err) {
      if (isTableNotFoundError(err)) {
        console.warn("Campaigns table not found. The database migration needs to be run.");
        setCurrentCampaign(null);
        setTablesNotFound(true);
        setError("The campaigns feature is not yet fully set up. Please run the database migration.");
      } else {
        setError(handleCampaignError(err));
      }
    } finally {
      setLoading(false);
    }
  }, [user, tablesNotFound]);

  // Fetch posts for a campaign
  const fetchCampaignPosts = useCallback(async (campaignId: string) => {
    if (!user || tablesNotFound) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await campaignApi.getCampaignPosts(campaignId);
      setCampaignPosts(data);
    } catch (err) {
      if (isTableNotFoundError(err)) {
        console.warn("Campaign posts table not found. The database migration needs to be run.");
        setCampaignPosts([]);
        setTablesNotFound(true);
        setError("The campaigns feature is not yet fully set up. Please run the database migration.");
      } else {
        setError(handleCampaignError(err));
      }
    } finally {
      setLoading(false);
    }
  }, [user, tablesNotFound]);

  // Fetch media items
  const fetchMediaItems = useCallback(async () => {
    if (!user || tablesNotFound) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await campaignApi.getMediaItems();
      setMediaItems(data);
    } catch (err) {
      if (isTableNotFoundError(err)) {
        console.warn("Media items table not found. The database migration needs to be run.");
        setMediaItems([]);
        setTablesNotFound(true);
        setError("The campaigns feature is not yet fully set up. Please run the database migration.");
      } else {
        setError(handleCampaignError(err));
      }
    } finally {
      setLoading(false);
    }
  }, [user, tablesNotFound]);
  
  // Fetch media items by tag
  const fetchMediaItemsByTag = async (tagId: string): Promise<MediaItem[]> => {
    if (!user) throw new Error('User not authenticated');
    if (tablesNotFound) throw new Error('The campaigns feature is not yet fully set up. Please run the database migration.');
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await campaignApi.getMediaItemsByTag(tagId);
      return data;
    } catch (err) {
      const errorMsg = handleCampaignError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch tags
  const fetchTags = useCallback(async () => {
    if (!user || tablesNotFound) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await campaignApi.getTags();
      setTags(data);
    } catch (err) {
      if (isTableNotFoundError(err)) {
        console.warn("Media tags table not found. The database migration needs to be run.");
        setTags([]);
        setTablesNotFound(true);
        setError("The tagging feature is not yet fully set up. Please run the database migration.");
      } else {
        setError(handleCampaignError(err));
      }
    } finally {
      setLoading(false);
    }
  }, [user, tablesNotFound]);

  // Create a new campaign
  const createCampaign = async (campaign: CreateCampaignDto): Promise<Campaign> => {
    if (!user) throw new Error('User not authenticated');
    if (tablesNotFound) throw new Error('The campaigns feature is not yet fully set up. Please run the database migration.');
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await campaignApi.createCampaign(campaign);
      setCampaigns(prev => [...prev, data]);
      return data;
    } catch (err) {
      const errorMsg = handleCampaignError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Update an existing campaign
  const updateCampaign = async (id: string, updates: UpdateCampaignDto): Promise<Campaign> => {
    if (!user) throw new Error('User not authenticated');
    if (tablesNotFound) throw new Error('The campaigns feature is not yet fully set up. Please run the database migration.');
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await campaignApi.updateCampaign(id, updates);
      setCampaigns(prev => prev.map(c => c.id === id ? data : c));
      if (currentCampaign?.id === id) {
        setCurrentCampaign(data);
      }
      return data;
    } catch (err) {
      const errorMsg = handleCampaignError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Delete a campaign
  const deleteCampaign = async (id: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    if (tablesNotFound) throw new Error('The campaigns feature is not yet fully set up. Please run the database migration.');
    
    setLoading(true);
    setError(null);
    
    try {
      await campaignApi.deleteCampaign(id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
      if (currentCampaign?.id === id) {
        setCurrentCampaign(null);
      }
    } catch (err) {
      const errorMsg = handleCampaignError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Create a campaign post
  const createCampaignPost = async (post: CreateCampaignPostDto): Promise<CampaignPost> => {
    if (!user) throw new Error('User not authenticated');
    if (tablesNotFound) throw new Error('The campaigns feature is not yet fully set up. Please run the database migration.');
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await campaignApi.createCampaignPost(post);
      setCampaignPosts(prev => [...prev, data]);
      return data;
    } catch (err) {
      const errorMsg = handleCampaignError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Update a campaign post
  const updateCampaignPost = async (id: string, updates: UpdateCampaignPostDto): Promise<CampaignPost> => {
    if (!user) throw new Error('User not authenticated');
    if (tablesNotFound) throw new Error('The campaigns feature is not yet fully set up. Please run the database migration.');
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await campaignApi.updateCampaignPost(id, updates);
      setCampaignPosts(prev => prev.map(p => p.id === id ? data : p));
      return data;
    } catch (err) {
      const errorMsg = handleCampaignError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Delete a campaign post
  const deleteCampaignPost = async (id: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    if (tablesNotFound) throw new Error('The campaigns feature is not yet fully set up. Please run the database migration.');
    
    setLoading(true);
    setError(null);
    
    try {
      await campaignApi.deleteCampaignPost(id);
      setCampaignPosts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      const errorMsg = handleCampaignError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Upload media
  const uploadMedia = async (file: File): Promise<MediaItem> => {
    if (!user) throw new Error('User not authenticated');
    if (tablesNotFound) throw new Error('The campaigns feature is not yet fully set up. Please run the database migration.');
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await campaignApi.uploadMedia(file);
      setMediaItems(prev => [...prev, data]);
      return data;
    } catch (err: any) {
      // Provide more specific error messages for storage errors
      let errorMsg = '';
      
      if (err?.message?.includes('storage/bucket-not-found')) {
        errorMsg = 'Storage bucket not found. The "campaign-media" bucket needs to be created.';
      } else if (err?.message?.includes('storage/unauthorized')) {
        errorMsg = 'Unauthorized to access storage. Please check your permissions.';
      } else if (err?.message?.includes('storage/object-too-large')) {
        errorMsg = 'File is too large. Maximum size is 5MB.';
      } else if (err?.message?.includes('storage/invalid-mime-type')) {
        errorMsg = 'Invalid file type. Please upload an image (JPG, PNG, GIF, or WebP).';
      } else if (err?.message?.includes('violates row-level security policy') || 
                 (err?.error === 'Unauthorized' && err?.message?.includes('row-level security'))) {
        errorMsg = 'Row-level security policy violation. Please ensure your user account has the correct permissions.';
      } else if (err?.message?.includes('User not authenticated')) {
        errorMsg = 'You must be signed in to upload media.';
      } else {
        errorMsg = handleCampaignError(err);
      }
      
      console.error('Media upload error:', err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Delete media
  const deleteMedia = async (id: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    if (tablesNotFound) throw new Error('The campaigns feature is not yet fully set up. Please run the database migration.');
    
    setLoading(true);
    setError(null);
    
    try {
      await campaignApi.deleteMedia(id);
      setMediaItems(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      const errorMsg = handleCampaignError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  // Tag management methods
  const createTag = async (tag: CreateTagDto): Promise<MediaTag> => {
    if (!user) throw new Error('User not authenticated');
    if (tablesNotFound) throw new Error('The tagging feature is not yet fully set up. Please run the database migration.');
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await campaignApi.createTag(tag);
      setTags(prev => [...prev, data]);
      return data;
    } catch (err) {
      const errorMsg = handleCampaignError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  const updateTag = async (id: string, updates: UpdateTagDto): Promise<MediaTag> => {
    if (!user) throw new Error('User not authenticated');
    if (tablesNotFound) throw new Error('The tagging feature is not yet fully set up. Please run the database migration.');
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await campaignApi.updateTag(id, updates);
      setTags(prev => prev.map(t => t.id === id ? data : t));
      return data;
    } catch (err) {
      const errorMsg = handleCampaignError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  const deleteTag = async (id: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    if (tablesNotFound) throw new Error('The tagging feature is not yet fully set up. Please run the database migration.');
    
    setLoading(true);
    setError(null);
    
    try {
      await campaignApi.deleteTag(id);
      setTags(prev => prev.filter(t => t.id !== id));
      
      // Also update media items that have this tag
      setMediaItems(prev => prev.map(item => {
        if (item.tags && item.tags.some(tag => tag.id === id)) {
          return {
            ...item,
            tags: item.tags.filter(tag => tag.id !== id)
          };
        }
        return item;
      }));
    } catch (err) {
      const errorMsg = handleCampaignError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  // Media-tag relationship methods
  const addTagToMediaItem = async (mediaItemId: string, tagId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    if (tablesNotFound) throw new Error('The tagging feature is not yet fully set up. Please run the database migration.');
    
    setLoading(true);
    setError(null);
    
    try {
      await campaignApi.addTagToMediaItem(mediaItemId, tagId);
      
      // Find the tag and update the media item
      const tag = tags.find(t => t.id === tagId);
      if (tag) {
        setMediaItems(prev => prev.map(item => {
          if (item.id === mediaItemId) {
            const currentTags = item.tags || [];
            // Check if tag already exists
            if (!currentTags.some(t => t.id === tagId)) {
              return {
                ...item,
                tags: [...currentTags, tag]
              };
            }
          }
          return item;
        }));
      }
    } catch (err) {
      const errorMsg = handleCampaignError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  const removeTagFromMediaItem = async (mediaItemId: string, tagId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    if (tablesNotFound) throw new Error('The tagging feature is not yet fully set up. Please run the database migration.');
    
    setLoading(true);
    setError(null);
    
    try {
      await campaignApi.removeTagFromMediaItem(mediaItemId, tagId);
      
      // Update the media item
      setMediaItems(prev => prev.map(item => {
        if (item.id === mediaItemId && item.tags) {
          return {
            ...item,
            tags: item.tags.filter(tag => tag.id !== tagId)
          };
        }
        return item;
      }));
    } catch (err) {
      const errorMsg = handleCampaignError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  const addTagsToMediaItems = async (mediaItemIds: string[], tagId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    if (tablesNotFound) throw new Error('The tagging feature is not yet fully set up. Please run the database migration.');
    
    setLoading(true);
    setError(null);
    
    try {
      await campaignApi.addTagsToMediaItems(mediaItemIds, tagId);
      
      // Find the tag and update all the media items
      const tag = tags.find(t => t.id === tagId);
      if (tag) {
        setMediaItems(prev => prev.map(item => {
          if (mediaItemIds.includes(item.id)) {
            const currentTags = item.tags || [];
            // Check if tag already exists
            if (!currentTags.some(t => t.id === tagId)) {
              return {
                ...item,
                tags: [...currentTags, tag]
              };
            }
          }
          return item;
        }));
      }
    } catch (err) {
      const errorMsg = handleCampaignError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  const removeTagFromMediaItems = async (mediaItemIds: string[], tagId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    if (tablesNotFound) throw new Error('The tagging feature is not yet fully set up. Please run the database migration.');
    
    setLoading(true);
    setError(null);
    
    try {
      await campaignApi.removeTagFromMediaItems(mediaItemIds, tagId);
      
      // Update all the media items
      setMediaItems(prev => prev.map(item => {
        if (mediaItemIds.includes(item.id) && item.tags) {
          return {
            ...item,
            tags: item.tags.filter(tag => tag.id !== tagId)
          };
        }
        return item;
      }));
    } catch (err) {
      const errorMsg = handleCampaignError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  // Campaign tag preferences
  const fetchCampaignTagPreferences = async (campaignId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    if (tablesNotFound) throw new Error('The tagging feature is not yet fully set up. Please run the database migration.');
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await campaignApi.getCampaignTagPreferences(campaignId);
      setCampaignTagPreferences(data);
    } catch (err) {
      if (isTableNotFoundError(err)) {
        console.warn("Campaign tag preferences table not found. The database migration needs to be run.");
        setCampaignTagPreferences([]);
        setTablesNotFound(true);
        setError("The tagging feature is not yet fully set up. Please run the database migration.");
      } else {
        setError(handleCampaignError(err));
      }
    } finally {
      setLoading(false);
    }
  };
  
  const setCampaignTagPreference = async (campaignId: string, tagId: string, weight: number): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    if (tablesNotFound) throw new Error('The tagging feature is not yet fully set up. Please run the database migration.');
    
    setLoading(true);
    setError(null);
    
    try {
      await campaignApi.setCampaignTagPreference(campaignId, tagId, weight);
      
      // Find the tag
      const tag = tags.find(t => t.id === tagId);
      
      // Update preferences state
      setCampaignTagPreferences(prev => {
        const existing = prev.find(p => p.campaign_id === campaignId && p.tag_id === tagId);
        if (existing) {
          // Update existing preference
          return prev.map(p => 
            p.campaign_id === campaignId && p.tag_id === tagId 
              ? { ...p, weight } 
              : p
          );
        } else {
          // Add new preference
          const newPreference: CampaignTagPreference = {
            id: 'temp-id-' + Date.now(), // Will be replaced by the real ID eventually
            campaign_id: campaignId,
            tag_id: tagId,
            weight,
            created_at: new Date().toISOString(),
            tag: tag
          };
          return [...prev, newPreference];
        }
      });
    } catch (err) {
      const errorMsg = handleCampaignError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  const removeCampaignTagPreference = async (campaignId: string, tagId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    if (tablesNotFound) throw new Error('The tagging feature is not yet fully set up. Please run the database migration.');
    
    setLoading(true);
    setError(null);
    
    try {
      await campaignApi.removeCampaignTagPreference(campaignId, tagId);
      setCampaignTagPreferences(prev => 
        prev.filter(p => !(p.campaign_id === campaignId && p.tag_id === tagId))
      );
    } catch (err) {
      const errorMsg = handleCampaignError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Load campaigns when the user changes
  useEffect(() => {
    if (user && !tablesNotFound) {
      // Only attempt to fetch if tables haven't been determined to be missing
      fetchCampaigns();
      fetchMediaItems();
      fetchTags();
    } else {
      setCampaigns([]);
      setCurrentCampaign(null);
      setCampaignPosts([]);
      setMediaItems([]);
      setTags([]);
      setCampaignTagPreferences([]);
    }
  }, [user, fetchCampaigns, fetchMediaItems, fetchTags, tablesNotFound]);

  return (
    <CampaignContext.Provider
      value={{
        campaigns,
        currentCampaign,
        campaignPosts,
        mediaItems,
        tags,
        campaignTagPreferences,
        loading,
        error,
        
        // Campaign methods
        fetchCampaigns,
        fetchCampaignById,
        createCampaign,
        updateCampaign,
        deleteCampaign,
        
        // Campaign post methods
        fetchCampaignPosts,
        createCampaignPost,
        updateCampaignPost,
        deleteCampaignPost,
        
        // Media methods
        fetchMediaItems,
        fetchMediaItemsByTag,
        uploadMedia,
        deleteMedia,
        
        // Tag methods
        fetchTags,
        createTag,
        updateTag,
        deleteTag,
        
        // Media-tag relationship methods
        addTagToMediaItem,
        removeTagFromMediaItem,
        addTagsToMediaItems,
        removeTagFromMediaItems,
        
        // Campaign tag preferences
        fetchCampaignTagPreferences,
        setCampaignTagPreference,
        removeCampaignTagPreference
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
};

// Custom hook to use the campaign context
export const useCampaigns = () => {
  const context = useContext(CampaignContext);
  if (context === undefined) {
    throw new Error('useCampaigns must be used within a CampaignProvider');
  }
  return context;
};