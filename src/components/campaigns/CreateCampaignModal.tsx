import React from 'react';
import { useCampaigns } from '../../contexts/CampaignContext';
import { CreateCampaignDto, ScheduleType } from '../../features/campaigns/types';
import Modal from '../Modal';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';
import { useModalState } from '../../hooks/useModalState';

interface CreateCampaignModalProps {
  onClose: () => void;
  onCreated: () => void;
  isOpen: boolean;
}

const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { createCampaign } = useCampaigns();
  
  // Use our custom hook to manage modal state
  const {
    state: { name, description, scheduleType, isActive },
    updateField,
    error,
    setError,
    isSubmitting,
    setIsSubmitting
  } = useModalState({
    name: '',
    description: '',
    scheduleType: 'one-time' as ScheduleType,
    isActive: true
  }, isOpen);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Campaign name is required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const campaign: CreateCampaignDto = {
        name: name.trim(),
        description: description.trim(),
        schedule_type: scheduleType,
        is_active: isActive
      };
      
      await createCampaign(campaign);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while creating the campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-[#111111] p-6 rounded-lg shadow-md border border-[#222222]">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Create Campaign</h2>
            <p className="text-gray-400 text-sm mt-1">Set up a new posting campaign</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-[#1A1A1A] rounded-full transition-all duration-200"
            aria-label="Close"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          {error && (
            <div className="p-3 bg-red-900/30 text-red-400 rounded-lg text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-200 mb-1.5">
              Campaign Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md shadow-sm text-gray-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#C69B7B] focus:border-[#C69B7B]"
              placeholder="Enter campaign name"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-200 mb-1.5">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md shadow-sm text-gray-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#C69B7B] focus:border-[#C69B7B]"
              placeholder="Describe your campaign (optional)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">
              Schedule Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => updateField('scheduleType', 'one-time')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  scheduleType === 'one-time'
                    ? 'bg-[#C69B7B] text-white'
                    : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#252525] border border-[#333333]'
                }`}
              >
                One-time
              </button>
              <button
                type="button"
                onClick={() => updateField('scheduleType', 'recurring')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  scheduleType === 'recurring'
                    ? 'bg-[#C69B7B] text-white'
                    : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#252525] border border-[#333333]'
                }`}
              >
                Recurring
              </button>
              <button
                type="button"
                onClick={() => updateField('scheduleType', 'ai-optimized')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  scheduleType === 'ai-optimized'
                    ? 'bg-[#C69B7B] text-white'
                    : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#252525] border border-[#333333]'
                }`}
              >
                AI Optimized
              </button>
            </div>
            <p className="mt-1.5 text-sm text-gray-400">
              {scheduleType === 'one-time'
                ? 'Schedule posts for specific dates and times'
                : scheduleType === 'recurring'
                ? 'Automatically post at regular intervals'
                : 'Let AI determine the best times to post based on subreddit analysis'}
            </p>
          </div>
          
          <div className="flex items-center mt-2">
            <input
              id="isActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => updateField('isActive', e.target.checked)}
              className="h-4 w-4 text-[#C69B7B] bg-[#1A1A1A] border-[#333333] rounded focus:ring-[#C69B7B] focus:ring-offset-0"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-200">
              Activate campaign immediately
            </label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-5 mt-5 border-t border-[#222222]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-[#1A1A1A] border border-[#333333] rounded-md shadow-sm hover:bg-[#252525] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B] focus:ring-offset-2 focus:ring-offset-[#0A0A0A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-[#C69B7B] border border-transparent rounded-md shadow-sm hover:bg-[#B38A6A] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B] focus:ring-offset-2 focus:ring-offset-[#0A0A0A] disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateCampaignModal;