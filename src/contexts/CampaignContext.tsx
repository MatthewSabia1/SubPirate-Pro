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
  loading: boolean;
  error: string | null;
  fetchCampaigns: () => Promise<void>;
  fetchCampaignById: (id: string) => Promise<void>;
  fetchCampaignPosts: (campaignId: string) => Promise<void>;
  fetchMediaItems: () => Promise<void>;
  createCampaign: (campaign: CreateCampaignDto) => Promise<Campaign>;
  updateCampaign: (id: string, updates: UpdateCampaignDto) => Promise<Campaign>;
  deleteCampaign: (id: string) => Promise<void>;
  createCampaignPost: (post: CreateCampaignPostDto) => Promise<CampaignPost>;
  updateCampaignPost: (id: string, updates: UpdateCampaignPostDto) => Promise<CampaignPost>;
  deleteCampaignPost: (id: string) => Promise<void>;
  uploadMedia: (file: File) => Promise<MediaItem>;
  deleteMedia: (id: string) => Promise<void>;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export const CampaignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [campaignPosts, setCampaignPosts] = useState<CampaignPost[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
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

  // Load campaigns when the user changes
  useEffect(() => {
    if (user && !tablesNotFound) {
      // Only attempt to fetch if tables haven't been determined to be missing
      fetchCampaigns();
      fetchMediaItems();
    } else {
      setCampaigns([]);
      setCurrentCampaign(null);
      setCampaignPosts([]);
      setMediaItems([]);
    }
  }, [user, fetchCampaigns, fetchMediaItems, tablesNotFound]);

  return (
    <CampaignContext.Provider
      value={{
        campaigns,
        currentCampaign,
        campaignPosts,
        mediaItems,
        loading,
        error,
        fetchCampaigns,
        fetchCampaignById,
        fetchCampaignPosts,
        fetchMediaItems,
        createCampaign,
        updateCampaign,
        deleteCampaign,
        createCampaignPost,
        updateCampaignPost,
        deleteCampaignPost,
        uploadMedia,
        deleteMedia
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