/* src/features/subreddit-analysis/components/subreddit-analyzer.tsx */

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import AnalysisCard from './analysis-card';
import { AnalysisResult } from '../types';
import { analysisWorkerManager, AnalysisTask } from '../../../lib/analysisWorkerManager';

interface FormData {
  subreddit: string;
}

export const SubredditAnalyzer: React.FC = () => {
  const { register, handleSubmit, reset } = useForm<FormData>();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [queue, setQueue] = useState<AnalysisTask[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisTask | null>(null);

  // Register listeners for worker events
  useEffect(() => {
    const unsubscribeProgress = analysisWorkerManager.onProgress((task) => {
      if (task.status === 'processing') {
        setIsAnalyzing(true);
        setActiveAnalysis(task);
      } else if (task.status === 'completed' && task.result) {
        setIsAnalyzing(false);
        setAnalysis(task.result);
        setActiveAnalysis(null);
      } else if (task.status === 'failed') {
        setIsAnalyzing(false);
        setError(task.error || 'Analysis failed');
        setActiveAnalysis(null);
      }
    });

    const unsubscribeError = analysisWorkerManager.onError((errorMsg) => {
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    });

    const unsubscribeQueue = analysisWorkerManager.onQueueUpdate((updatedQueue) => {
      setQueue(updatedQueue);
    });

    // Get initial queue status
    analysisWorkerManager.getQueueStatus();

    return () => {
      unsubscribeProgress();
      unsubscribeError();
      unsubscribeQueue();
    };
  }, []);

  const onSubmit: SubmitHandler<FormData> = (data: FormData) => {
    setError(null);
    
    // Handle the analysis via worker
    analysisWorkerManager.analyzeSubreddit(data.subreddit, (result) => {
      setAnalysis(result);
      setIsAnalyzing(false);
    });
    
    // Clear the form
    reset();
  };

  const handleSaveComplete = () => {
    // Show a success message
    setSaveSuccess(true);
    
    // Hide the success message after a few seconds
    setTimeout(() => {
      setSaveSuccess(false);
    }, 5000);
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} className="mb-4">
        <input
          type="text"
          placeholder="Enter subreddit name"
          {...register('subreddit', { required: true })}
          className="border p-2 mr-2"
        />
        <button 
          type="submit" 
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          disabled={queue.length >= 5}
        >
          Analyze
        </button>
        
        {queue.length >= 5 && (
          <p className="text-yellow-500 text-sm mt-2">
            Maximum queue size reached (5). Please wait for analyses to complete.
          </p>
        )}
      </form>
      
      {/* Queue display */}
      {queue.length > 0 && (
        <div className="mb-4 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Analysis Queue ({queue.length}/5)</h3>
          <div className="space-y-2">
            {queue.map((task) => (
              <div key={task.id} className="flex items-center">
                <div className="w-2/3">
                  <p className="text-sm">
                    r/{task.subreddit} 
                    <span className="ml-2 text-xs text-gray-400">
                      {new Date(task.queuedAt).toLocaleTimeString()}
                    </span>
                  </p>
                </div>
                <div className="w-1/3">
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        task.status === 'failed' ? 'bg-red-500' : 
                        task.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-right mt-1">
                    {task.status === 'queued' ? 'Queued' : 
                     task.status === 'processing' ? 'Processing' : 
                     task.status === 'completed' ? 'Completed' : 'Failed'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-800/30 text-red-400 rounded-md">
          {error}
        </div>
      )}
      
      {isAnalyzing && !analysis && (
        <div className="mb-4 p-3 bg-blue-800/30 text-blue-400 rounded-md">
          Analyzing r/{activeAnalysis?.subreddit || ''}... ({activeAnalysis?.progress || 0}%)
        </div>
      )}
      
      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-800/30 text-green-400 rounded-md">
          Analysis saved successfully! You can find it in your saved list.
        </div>
      )}
      
      {analysis && (
        <div onClick={e => e.stopPropagation()}>
          <AnalysisCard 
            analysis={analysis} 
            mode={saveSuccess ? "saved" : "new"} 
            isAnalyzing={isAnalyzing}
            onSaveComplete={handleSaveComplete}
          />
        </div>
      )}
    </div>
  );
};