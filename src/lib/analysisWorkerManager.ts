/* src/lib/analysisWorkerManager.ts */

import { AnalysisResult } from './analysis';

// Define types
export type AnalysisTask = {
  id: string;
  subreddit: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  result?: AnalysisResult;
  error?: string;
  progress: number;
  queuedAt: number;
  startedAt?: number;
  completedAt?: number;
};

type WorkerMessage = {
  type: string;
  task?: AnalysisTask;
  error?: string;
  result?: AnalysisResult;
  queue?: AnalysisTask[];
  id?: string;
  analysisId?: string;
  data?: any;
};

type AnalysisCallback = (result: AnalysisResult) => void;
type ErrorCallback = (error: string) => void;
type ProgressCallback = (task: AnalysisTask) => void;
type QueueCallback = (queue: AnalysisTask[]) => void;

// The worker manager class - Singleton
class AnalysisWorkerManager {
  private sharedWorker: SharedWorker | null = null;
  private port: MessagePort | null = null;
  private callbacks: Map<string, AnalysisCallback> = new Map();
  private errorCallbacks: Set<ErrorCallback> = new Set();
  private progressCallbacks: Set<ProgressCallback> = new Set();
  private queueCallbacks: Set<QueueCallback> = new Set();
  private tasks: AnalysisTask[] = [];
  private isInitialized = false;
  
  // Keep a static instance to ensure we have only one worker
  private static instance: AnalysisWorkerManager | null = null;

  constructor() {
    // Singleton pattern
    if (AnalysisWorkerManager.instance) {
      return AnalysisWorkerManager.instance;
    }
    
    AnalysisWorkerManager.instance = this;
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined' || this.isInitialized) return;
    
    try {
      // Create a SharedWorker instead of a regular Worker
      this.sharedWorker = new SharedWorker(
        new URL('./analysisSharedWorker.ts', import.meta.url), 
        { type: 'module', name: 'analysis-worker' }
      );
      
      this.port = this.sharedWorker.port;
      
      this.port.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, analysisId, data, error, task, queue } = event.data;
        
        switch (type) {
          case 'basicAnalysis':
          case 'complete':
            if (analysisId && data) {
              const callback = this.callbacks.get(analysisId);
              if (callback) {
                callback(data);
                // Only delete the callback on complete, not on basicAnalysis
                if (type === 'complete') {
                  this.callbacks.delete(analysisId);
                }
              }
              
              // Find task by ID and update it
              const taskIndex = this.tasks.findIndex(t => t.id === analysisId);
              if (taskIndex >= 0) {
                this.tasks[taskIndex] = { 
                  ...this.tasks[taskIndex],
                  status: type === 'complete' ? 'completed' : 'processing',
                  result: type === 'complete' ? data : undefined,
                  progress: type === 'complete' ? 100 : 50,
                  completedAt: type === 'complete' ? Date.now() : undefined
                };
                
                this.notifyProgressListeners(this.tasks[taskIndex]);
              }
            }
            break;
            
          case 'progress':
            if (analysisId && data) {
              // Find task by ID
              const taskIndex = this.tasks.findIndex(t => t.id === analysisId);
              if (taskIndex >= 0) {
                this.tasks[taskIndex] = { 
                  ...this.tasks[taskIndex],
                  status: 'processing',
                  progress: data.progress
                };
                
                this.notifyProgressListeners(this.tasks[taskIndex]);
              }
            }
            break;
            
          case 'error':
            if (analysisId && error) {
              // Find task by ID
              const taskIndex = this.tasks.findIndex(t => t.id === analysisId);
              if (taskIndex >= 0) {
                this.tasks[taskIndex] = { 
                  ...this.tasks[taskIndex],
                  status: 'failed',
                  error: error,
                  completedAt: Date.now()
                };
                
                this.notifyProgressListeners(this.tasks[taskIndex]);
              }
              
              this.notifyErrorListeners(error);
            } else if (error) {
              this.notifyErrorListeners(error);
            }
            break;
            
          // Support for legacy worker message types
          case 'queued':
            if (task) {
              this.tasks.push(task);
              this.notifyQueueListeners();
            }
            break;
            
          case 'completed':
            if (task && task.result) {
              const callback = this.callbacks.get(task.id);
              if (callback) {
                callback(task.result);
                this.callbacks.delete(task.id);
              }
              
              const taskIndex = this.tasks.findIndex(t => t.id === task.id);
              if (taskIndex >= 0) {
                this.tasks[taskIndex] = { ...task };
                this.notifyProgressListeners(task);
              }
            }
            break;
            
          case 'failed':
            if (task && task.error) {
              const taskIndex = this.tasks.findIndex(t => t.id === task.id);
              if (taskIndex >= 0) {
                this.tasks[taskIndex] = { ...task };
                this.notifyProgressListeners(task);
              }
              
              this.notifyErrorListeners(task.error);
            }
            break;
            
          case 'queueStatus':
            if (queue) {
              this.tasks = [...queue];
              this.notifyQueueListeners();
            }
            break;
        }
      };
      
      // Handle shared worker errors
      this.port.onmessageerror = (error) => {
        this.notifyErrorListeners(`Worker message error: ${error.toString()}`);
      };
      
      // Start the port
      this.port.start();
      
      // Register error handler on the SharedWorker
      this.sharedWorker.onerror = (error) => {
        this.notifyErrorListeners(`Worker error: ${error.message}`);
      };
      
      this.isInitialized = true;
      console.log('SharedWorker initialized successfully');
    } catch (error) {
      console.error('Failed to initialize shared worker:', error);
    }
  }

  public analyzeSubreddit(subreddit: string, callback: AnalysisCallback): void {
    if (!this.port) {
      this.initialize();
      if (!this.port) {
        this.notifyErrorListeners('SharedWorker not available. Browser may not support web workers.');
        return;
      }
    }
    
    const taskId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.callbacks.set(taskId, callback);
    
    // Create a new task for local tracking
    const newTask: AnalysisTask = {
      id: taskId,
      subreddit: subreddit,
      status: 'queued',
      progress: 0,
      queuedAt: Date.now()
    };
    
    // Add to tasks and notify listeners
    this.tasks.push(newTask);
    this.notifyQueueListeners();
    
    // Send to the shared worker
    this.port.postMessage({
      analysisId: taskId,
      info: { name: subreddit, subscribers: 0, active_users: 0, rules: [] },
      posts: []
    });
    
    // Also get real data from the server
    fetch(`/api/analyze/${subreddit}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }
        return response.json();
      })
      .then(result => {
        // Store the result and update status
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex >= 0) {
          this.tasks[taskIndex] = { 
            ...this.tasks[taskIndex],
            status: 'completed',
            result: result,
            progress: 100,
            completedAt: Date.now()
          };
          
          // Notify listeners
          this.notifyProgressListeners(this.tasks[taskIndex]);
          
          // Execute the callback
          callback(result);
        }
      })
      .catch(error => {
        // Find task by ID
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex >= 0) {
          this.tasks[taskIndex] = { 
            ...this.tasks[taskIndex],
            status: 'failed',
            error: error.message || 'Unknown error',
            completedAt: Date.now()
          };
          
          this.notifyProgressListeners(this.tasks[taskIndex]);
        }
        
        this.notifyErrorListeners(error.message || 'Unknown error');
      });
  }

  public getQueueStatus(): void {
    // Just use the local queue state
    this.notifyQueueListeners();
  }
  
  public clearQueue(): void {
    // Remove all queued tasks
    this.tasks = this.tasks.filter(task => task.status !== 'queued');
    this.notifyQueueListeners();
  }
  
  public onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => {
      this.progressCallbacks.delete(callback);
    };
  }
  
  public onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => {
      this.errorCallbacks.delete(callback);
    };
  }
  
  public onQueueUpdate(callback: QueueCallback): () => void {
    this.queueCallbacks.add(callback);
    // Initial callback with current state
    callback([...this.tasks]);
    return () => {
      this.queueCallbacks.delete(callback);
    };
  }
  
  private notifyProgressListeners(task: AnalysisTask): void {
    this.progressCallbacks.forEach(callback => callback(task));
  }
  
  private notifyErrorListeners(error: string): void {
    this.errorCallbacks.forEach(callback => callback(error));
  }
  
  private notifyQueueListeners(): void {
    this.queueCallbacks.forEach(callback => callback([...this.tasks]));
  }
}

// Create a singleton instance
export const analysisWorkerManager = new AnalysisWorkerManager();