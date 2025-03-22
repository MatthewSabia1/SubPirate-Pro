import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCampaigns } from '../../contexts/CampaignContext';
import PostList from '../../components/campaigns/PostList';
import CreatePostModal from '../../components/campaigns/CreatePostModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FeatureGate } from '../../components/FeatureGate';
import { AlertCircle, Plus, Calendar, Trash2, ToggleLeft, Image } from 'lucide-react';

const CampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    currentCampaign, 
    campaignPosts, 
    loading, 
    error, 
    fetchCampaignById, 
    fetchCampaignPosts,
    updateCampaign,
    deleteCampaign
  } = useCampaigns();
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCampaignById(id);
      fetchCampaignPosts(id);
    }
  }, [id, fetchCampaignById, fetchCampaignPosts]);

  const handleCreatePost = () => {
    setIsCreatePostModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreatePostModalOpen(false);
  };

  const handlePostCreated = () => {
    if (id) {
      fetchCampaignPosts(id);
    }
    setIsCreatePostModalOpen(false);
  };

  const handleToggleActive = async () => {
    if (currentCampaign && id) {
      await updateCampaign(id, {
        is_active: !currentCampaign.is_active
      });
    }
  };

  const handleDeleteCampaign = async () => {
    if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }
    
    if (id) {
      try {
        await deleteCampaign(id);
        navigate('/campaigns');
      } catch (err) {
        console.error('Error deleting campaign:', err);
      }
    }
  };

  if (loading && !currentCampaign) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (!currentCampaign && !loading) {
    return (
      <div className="p-6 bg-[#0A0A0A]">
        <div className="bg-[#111111] rounded-lg shadow-md p-6 border border-[#222222]">
          <h2 className="text-xl font-semibold mb-3 text-white">Campaign Not Found</h2>
          <p className="mb-4 text-gray-400">The campaign you're looking for doesn't exist or has been deleted.</p>
          <button
            onClick={() => navigate('/campaigns')}
            className="bg-[#C69B7B] hover:bg-[#B38A6A] text-white font-medium px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-2"
          >
            <Calendar size={16} />
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#0A0A0A]">
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 text-red-400 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {currentCampaign && (
        <>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">{currentCampaign.name}</h1>
              <p className="text-gray-400">{currentCampaign.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <FeatureGate feature="campaigns">
                <button
                  onClick={handleToggleActive}
                  className={`px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-2 ${
                    currentCampaign.is_active
                      ? 'bg-[#2B543A]/30 text-[#4CAF50] hover:bg-[#2B543A]/50 border border-[#2B543A]/50'
                      : 'bg-[#111111] text-gray-400 hover:bg-[#1A1A1A] border border-[#333333]'
                  }`}
                >
                  <ToggleLeft size={16} />
                  {currentCampaign.is_active ? 'Active' : 'Inactive'}
                </button>
              </FeatureGate>
              <FeatureGate feature="campaigns">
                <Link
                  to="/campaigns/media"
                  className="bg-[#1A1A1A] hover:bg-[#252525] text-white font-medium px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-2 border border-[#333333]"
                >
                  <Image size={16} />
                  Media Library
                </Link>
              </FeatureGate>
              <FeatureGate feature="campaigns">
                <button
                  onClick={handleCreatePost}
                  className="bg-[#C69B7B] hover:bg-[#B38A6A] text-white font-medium px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-2"
                >
                  <Plus size={16} />
                  Create Post
                </button>
              </FeatureGate>
              <FeatureGate feature="campaigns">
                <button
                  onClick={handleDeleteCampaign}
                  className="bg-red-600/80 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </FeatureGate>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#111111] rounded-lg p-6 border border-[#222222] hover:border-[#333333] transition-colors">
              <h3 className="font-medium text-xl mb-2 text-gray-300">Schedule Type</h3>
              <p className="text-lg font-semibold capitalize text-white">
                {currentCampaign.schedule_type.replace('-', ' ')}
              </p>
            </div>
            <div className="bg-[#111111] rounded-lg p-6 border border-[#222222] hover:border-[#333333] transition-colors">
              <h3 className="font-medium text-xl mb-2 text-gray-300">Posts</h3>
              <p className="text-3xl font-semibold text-[#C69B7B]">{campaignPosts.length}</p>
            </div>
            <div className="bg-[#111111] rounded-lg p-6 border border-[#222222] hover:border-[#333333] transition-colors">
              <h3 className="font-medium text-xl mb-2 text-gray-300">Created</h3>
              <p className="text-lg font-semibold text-white">
                {new Date(currentCampaign.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">Posts</h2>
            {campaignPosts.length === 0 ? (
              <div className="bg-[#111111] rounded-lg p-8 text-center border border-[#222222]">
                <p className="text-gray-400 mb-4">No posts scheduled for this campaign yet.</p>
                <button
                  onClick={handleCreatePost}
                  className="bg-[#C69B7B] hover:bg-[#B38A6A] text-white font-medium px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-2 mx-auto"
                >
                  <Plus size={16} />
                  Create Your First Post
                </button>
              </div>
            ) : (
              <PostList posts={campaignPosts} />
            )}
          </div>
        </>
      )}

      <CreatePostModal
        isOpen={isCreatePostModalOpen}
        campaignId={id || ''}
        onClose={handleCloseModal}
        onCreated={handlePostCreated}
      />
    </div>
  );
};

export default CampaignDetailPage;