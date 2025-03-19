/* src/lib/analysisWorker.ts */

// This worker handles background analysis of subreddits
// It can continue processing even when the user navigates away from the page

type AnalysisTask = {
  id: string;
  subreddit: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  progress: number;
  queuedAt: number;
  startedAt?: number;
  completedAt?: number;
};

// Our analysis queue
let queue: AnalysisTask[] = [];
const MAX_QUEUE_SIZE = 5;
let isProcessing = false;

// In-memory storage for completed analyses
// In a real app, you'd use IndexedDB for persistence
const completedAnalyses: Record<string, any> = {};

// Process the next item in the queue
async function processNextInQueue() {
  if (isProcessing || queue.length === 0) return;
  
  isProcessing = true;
  const task = queue.find(t => t.status === 'queued');
  
  if (!task) {
    isProcessing = false;
    return;
  }
  
  try {
    // Update task status
    task.status = 'processing';
    task.startedAt = Date.now();
    task.progress = 10;
    self.postMessage({ type: 'progress', task });
    
    // Make the API request
    const response = await fetch(`/api/analyze/${task.subreddit}`);
    
    task.progress = 50;
    self.postMessage({ type: 'progress', task });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    task.progress = 75;
    self.postMessage({ type: 'progress', task });
    
    const result = await response.json();
    
    // Store the result and update status
    task.result = result;
    task.status = 'completed';
    task.completedAt = Date.now();
    task.progress = 100;
    completedAnalyses[task.id] = result;
    
    // Notify the main thread
    self.postMessage({ type: 'completed', task });
  } catch (error) {
    // Handle errors
    task.status = 'failed';
    task.error = error instanceof Error ? error.message : 'Unknown error';
    task.completedAt = Date.now();
    
    // Notify the main thread
    self.postMessage({ type: 'failed', task });
  } finally {
    // Update the queue
    isProcessing = false;
    queue = queue.filter(t => t.id !== task.id || t.status === 'queued');
    
    // Process the next task if there are any
    if (queue.some(t => t.status === 'queued')) {
      setTimeout(processNextInQueue, 1000);
    }
  }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'enqueue':
      if (queue.length >= MAX_QUEUE_SIZE) {
        self.postMessage({ 
          type: 'error', 
          error: `Queue limit reached (max ${MAX_QUEUE_SIZE}). Please wait for current analyses to complete.` 
        });
        return;
      }
      
      // Check if this subreddit is already in the queue
      if (queue.some(t => t.subreddit === data.subreddit && t.status === 'queued')) {
        self.postMessage({ 
          type: 'error', 
          error: `Subreddit '${data.subreddit}' is already in the analysis queue.` 
        });
        return;
      }
      
      // Check if we have a completed analysis for this subreddit
      if (completedAnalyses[data.subreddit]) {
        self.postMessage({ 
          type: 'cached', 
          result: completedAnalyses[data.subreddit] 
        });
        return;
      }
      
      // Create a new task
      const task: AnalysisTask = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        subreddit: data.subreddit,
        status: 'queued',
        progress: 0,
        queuedAt: Date.now()
      };
      
      // Add to queue
      queue.push(task);
      self.postMessage({ type: 'queued', task });
      
      // Start processing if not already processing
      if (!isProcessing) {
        processNextInQueue();
      }
      break;
      
    case 'getQueue':
      self.postMessage({ type: 'queueStatus', queue });
      break;
      
    case 'getResult':
      const result = completedAnalyses[data.id];
      if (result) {
        self.postMessage({ type: 'result', id: data.id, result });
      } else {
        self.postMessage({ 
          type: 'error', 
          error: `No result found for ID: ${data.id}` 
        });
      }
      break;
      
    case 'clearQueue':
      queue = queue.filter(t => t.status !== 'queued');
      self.postMessage({ type: 'queueStatus', queue });
      break;
  }
});

// Export an empty object to satisfy TypeScript
export {};