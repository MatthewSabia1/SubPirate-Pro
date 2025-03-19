import React from 'react';
import { useAnalysis } from '../contexts/AnalysisContext';
import { Activity } from 'lucide-react';

const AnalysisStatusIndicator: React.FC = () => {
  const { queue, currentTask, isAnalyzing } = useAnalysis();
  
  if (!isAnalyzing || queue.length === 0) {
    return null;
  }
  
  // Get information about the current task
  const activeTask = currentTask || queue.find(task => task.status === 'processing');
  const queuedCount = queue.filter(task => task.status === 'queued').length;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-[#111111] rounded-lg shadow-lg p-4 border border-[#333333] max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-5 w-5 text-[#C69B7B] animate-pulse" />
        <h4 className="font-medium">Analysis in Progress</h4>
      </div>
      
      {activeTask && (
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Analyzing r/{activeTask.subreddit}</span>
            <span className="text-[#C69B7B]">{activeTask.progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-[#C69B7B] h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${activeTask.progress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {queuedCount > 0 && (
        <div className="text-xs text-gray-400">
          {queuedCount} more in queue
        </div>
      )}
    </div>
  );
};

export default AnalysisStatusIndicator;