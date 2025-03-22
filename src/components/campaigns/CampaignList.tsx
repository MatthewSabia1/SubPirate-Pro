import React from 'react';
import { Link } from 'react-router-dom';
import { Campaign } from '../../features/campaigns/types';
import { Calendar, ChevronRight } from 'lucide-react';

interface CampaignListProps {
  campaigns: Campaign[];
}

const CampaignList: React.FC<CampaignListProps> = ({ campaigns }) => {
  return (
    <div className="bg-[#111111] rounded-lg shadow-md border border-[#222222] overflow-hidden">
      <div className="divide-y divide-[#222222]">
        {campaigns.map(campaign => (
          <Link
            key={campaign.id}
            to={`/campaigns/${campaign.id}`}
            className="block p-5 hover:bg-[#1A1A1A] transition-all duration-200"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-lg text-gray-200 truncate">{campaign.name}</h3>
                <p className="text-gray-400 text-sm mt-1 line-clamp-1">{campaign.description}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                    campaign.is_active
                      ? 'bg-[#2B543A]/30 text-[#4CAF50] border border-[#2B543A]/50'
                      : 'bg-[#1A1A1A] text-gray-400 border border-[#333333]'
                  }`}>
                    {campaign.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#C69B7B]/20 text-[#C69B7B] border border-[#C69B7B]/30 capitalize">
                    {campaign.schedule_type.replace('-', ' ')}
                  </span>
                </div>
              </div>
              <div className="flex justify-between sm:justify-start items-center sm:ml-4 mt-3 sm:mt-0">
                <div className="text-gray-400 text-sm text-left sm:text-right flex items-center gap-1">
                  <Calendar size={14} className="text-[#C69B7B]" />
                  <div>{new Date(campaign.created_at).toLocaleDateString()}</div>
                </div>
                <ChevronRight size={16} className="ml-2 text-[#C69B7B]" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CampaignList;