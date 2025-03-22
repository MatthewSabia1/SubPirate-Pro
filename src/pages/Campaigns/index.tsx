import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCampaigns } from '../../contexts/CampaignContext';
import CampaignList from '../../components/campaigns/CampaignList';
import CreateCampaignModal from '../../components/campaigns/CreateCampaignModal';
import { Campaign, CampaignWithPosts } from '../../features/campaigns/types';
import { useFeatureAccess } from '../../contexts/FeatureAccessContext';
import { FeatureGate } from '../../components/FeatureGate';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Plus, Image } from 'lucide-react';

const CampaignsPage: React.FC = () => {
  const { campaigns, loading, error, fetchCampaigns } = useCampaigns();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { hasAccess } = useFeatureAccess();

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreateCampaign = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleCampaignCreated = () => {
    fetchCampaigns();
    setIsCreateModalOpen(false);
  };

  // Calculate total posts across all campaigns
  const getTotalPosts = (): number => {
    return campaigns.reduce((sum, campaign) => {
      // Check if the campaign has posts property and it's an array
      const postsCount = (campaign as CampaignWithPosts).posts?.length || 0;
      return sum + postsCount;
    }, 0);
  };

  if (loading && campaigns.length === 0) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <LoadingSpinner size={48} />
      </div>
    );
  }
  
  // Display a message if there's an error with the database tables
  if (error && error.includes("not yet fully set up")) {
    return (
      <div className="p-8">
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                {error}
              </p>
              <p className="mt-2 text-sm text-amber-700">
                The database tables for the Campaigns feature need to be created. Please run the migration script at <code className="bg-amber-100 p-1 rounded">/migrations/campaigns_feature.sql</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#0A0A0A] text-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Campaigns</h1>
          <p className="text-gray-400 mt-1">Schedule and automate your Reddit posts</p>
        </div>
        <div className="flex gap-3">
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
              onClick={handleCreateCampaign}
              className="bg-[#C69B7B] hover:bg-[#B38A6A] text-white font-medium px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-2"
            >
              <Plus size={16} />
              Create Campaign
            </button>
          </FeatureGate>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#111111] rounded-lg p-6 border border-[#222222] hover:border-[#333333] transition-colors">
          <h3 className="font-medium text-xl mb-2 text-gray-300">Active Campaigns</h3>
          <p className="text-3xl font-semibold text-[#C69B7B]">
            {campaigns.filter(c => c.is_active).length}
          </p>
        </div>
        <div className="bg-[#111111] rounded-lg p-6 border border-[#222222] hover:border-[#333333] transition-colors">
          <h3 className="font-medium text-xl mb-2 text-gray-300">Total Posts</h3>
          <p className="text-3xl font-semibold text-[#2B543A]">
            {getTotalPosts()}
          </p>
        </div>
        <div className="bg-[#111111] rounded-lg p-6 border border-[#222222] hover:border-[#333333] transition-colors">
          <h3 className="font-medium text-xl mb-2 text-gray-300">Media Library</h3>
          <p className="text-xl font-semibold">
            <Link to="/campaigns/media" className="text-[#C69B7B] hover:text-[#B38A6A] flex items-center transition-colors">
              View Library 
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </p>
        </div>
      </div>

      {!hasAccess('campaigns') ? (
        <div className="bg-[#111111] rounded-lg p-6 border border-[#222222] mb-6">
          <h2 className="text-xl font-semibold mb-3 text-gray-200">Unlock Campaigns</h2>
          <p className="mb-4 text-gray-400">
            Upgrade to a premium plan to automate your Reddit posting and schedule campaigns.
          </p>
          <Link
            to="/pricing"
            className="inline-block bg-[#C69B7B] hover:bg-[#B38A6A] text-white font-medium px-4 py-2 rounded-md transition-all duration-200 flex items-center w-fit gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            View Pricing
          </Link>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-[#111111] rounded-lg p-8 text-center border border-[#222222]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <h2 className="text-xl font-semibold mb-3 text-gray-200">No Campaigns Yet</h2>
          <p className="text-gray-400 mb-6">
            Create your first campaign to start automating your Reddit posting.
          </p>
          <button
            onClick={handleCreateCampaign}
            className="bg-[#C69B7B] hover:bg-[#B38A6A] text-white font-medium px-6 py-3 rounded-md transition-all duration-200 flex items-center mx-auto gap-2"
          >
            <Plus size={16} />
            Create Your First Campaign
          </button>
        </div>
      ) : (
        <CampaignList campaigns={campaigns} />
      )}

      <CreateCampaignModal 
        isOpen={isCreateModalOpen} 
        onClose={handleCloseModal} 
        onCreated={handleCampaignCreated} 
      />
    </div>
  );
};

export default CampaignsPage;