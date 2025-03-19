/* src/contexts/AnalysisContext.tsx */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { AnalysisResult } from '../lib/analysis';
import { analysisWorkerManager, AnalysisTask } from '../lib/analysisWorkerManager';
import analysisIdb from '../lib/analysisIdb';

interface AnalysisContextType {
  queue: AnalysisTask[];
  currentTask: AnalysisTask | null;
  lastCompletedAnalysis: AnalysisResult | null;
  analyzeSubreddit: (subreddit: string) => void;
  clearQueue: () => void;
  isAnalyzing: boolean;
  error: string | null;
  getAnalysisForSubreddit: (subreddit: string) => Promise<AnalysisResult | null>;
}

const AnalysisContext = createContext<AnalysisContextType | null>(null);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<AnalysisTask[]>([]);
  const [currentTask, setCurrentTask] = useState<AnalysisTask | null>(null);
  const [lastCompletedAnalysis, setLastCompletedAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize and load data on mount
  useEffect(() => {
    // First try to load from IndexedDB
    const loadFromIdb = async () => {
      try {
        // We don't know which subreddit to load, so we'll wait for an explicit request
        console.log('IndexedDB initialized for analysis storage');
      } catch (e) {
        console.error('Failed to initialize IndexedDB:', e);
        
        // Fall back to localStorage
        try {
          const savedAnalysis = localStorage.getItem('lastCompletedAnalysis');
          if (savedAnalysis) {
            setLastCompletedAnalysis(JSON.parse(savedAnalysis));
          }
        } catch (e) {
          console.error('Failed to parse saved analysis from localStorage:', e);
        }
      }
    };
    
    loadFromIdb();
    
    // Set up event handlers for worker communication
    const unsubscribeProgress = analysisWorkerManager.onProgress((task) => {
      if (task.status === 'processing') {
        setCurrentTask(task);
      } else if (task.status === 'completed' && task.result) {
        setLastCompletedAnalysis(task.result);
        
        // Save to IndexedDB
        analysisIdb.saveAnalysis(task).catch(err => {
          console.error('Failed to save analysis to IndexedDB:', err);
          
          // Fall back to localStorage
          localStorage.setItem(`analysis:${task.subreddit}`, JSON.stringify(task.result));
          localStorage.setItem('lastCompletedAnalysis', JSON.stringify(task.result));
        });
        
        setCurrentTask(null);
      }
    });
    
    const unsubscribeQueue = analysisWorkerManager.onQueueUpdate((updatedQueue) => {
      setQueue(updatedQueue);
    });
    
    const unsubscribeError = analysisWorkerManager.onError((errorMsg) => {
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    });
    
    // Get initial queue status
    analysisWorkerManager.getQueueStatus();
    
    return () => {
      unsubscribeProgress();
      unsubscribeQueue();
      unsubscribeError();
    };
  }, []);
  
  const analyzeSubreddit = useCallback((subreddit: string) => {
    setError(null);
    
    // First check if we have this analysis in IndexedDB
    analysisIdb.getAnalysisBySubreddit(subreddit)
      .then(result => {
        if (result) {
          console.log('Using cached analysis from IndexedDB');
          setLastCompletedAnalysis(result);
          return;
        }
        
        // Not in IndexedDB, check localStorage as fallback
        try {
          const cachedResult = localStorage.getItem(`analysis:${subreddit}`);
          if (cachedResult) {
            const parsed = JSON.parse(cachedResult);
            if (parsed) {
              console.log('Using cached analysis from localStorage');
              setLastCompletedAnalysis(parsed);
              return;
            }
          }
        } catch (e) {
          console.error('Error parsing cached analysis:', e);
        }
        
        // Not found in cache, start a new analysis
        console.log('Starting new analysis for', subreddit);
        analysisWorkerManager.analyzeSubreddit(subreddit, (result) => {
          setLastCompletedAnalysis(result);
          
          // Save to both IndexedDB and localStorage for redundancy
          const task: AnalysisTask = {
            id: `manual-${Date.now()}`,
            subreddit,
            status: 'completed',
            result,
            progress: 100,
            queuedAt: Date.now(),
            completedAt: Date.now()
          };
          
          analysisIdb.saveAnalysis(task).catch(err => {
            console.error('Failed to save analysis to IndexedDB:', err);
          });
          
          localStorage.setItem(`analysis:${subreddit}`, JSON.stringify(result));
          localStorage.setItem('lastCompletedAnalysis', JSON.stringify(result));
        });
      })
      .catch(err => {
        console.error('Error checking IndexedDB for analysis:', err);
        
        // Fall back to starting new analysis
        analysisWorkerManager.analyzeSubreddit(subreddit, (result) => {
          setLastCompletedAnalysis(result);
          localStorage.setItem(`analysis:${subreddit}`, JSON.stringify(result));
          localStorage.setItem('lastCompletedAnalysis', JSON.stringify(result));
        });
      });
  }, []);
  
  const getAnalysisForSubreddit = useCallback(async (subreddit: string): Promise<AnalysisResult | null> => {
    try {
      // First check IndexedDB
      const result = await analysisIdb.getAnalysisBySubreddit(subreddit);
      if (result) {
        return result;
      }
      
      // Check localStorage as fallback
      const cachedResult = localStorage.getItem(`analysis:${subreddit}`);
      if (cachedResult) {
        try {
          return JSON.parse(cachedResult);
        } catch (e) {
          console.error('Error parsing cached analysis from localStorage:', e);
        }
      }
      
      return null;
    } catch (err) {
      console.error('Error retrieving analysis:', err);
      return null;
    }
  }, []);
  
  const clearQueue = useCallback(() => {
    analysisWorkerManager.clearQueue();
  }, []);
  
  const isAnalyzing = useMemo(() => {
    return currentTask !== null || queue.some(task => task.status === 'processing');
  }, [currentTask, queue]);
  
  const value = useMemo(() => ({
    queue,
    currentTask,
    lastCompletedAnalysis,
    analyzeSubreddit,
    clearQueue,
    isAnalyzing,
    error,
    getAnalysisForSubreddit
  }), [queue, currentTask, lastCompletedAnalysis, analyzeSubreddit, clearQueue, isAnalyzing, error, getAnalysisForSubreddit]);
  
  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
}