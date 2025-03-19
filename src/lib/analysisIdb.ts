// src/lib/analysisIdb.ts
// A simple IndexedDB wrapper for persisting analysis results

import { AnalysisResult } from './analysis';
import { AnalysisTask } from './analysisWorkerManager';

const DB_NAME = 'analysis-storage';
const STORE_NAME = 'results';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

// Initialize the database
export function initializeDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = (event) => {
      db = request.result;
      resolve();
    };
    
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

// Save an analysis result
export function saveAnalysis(task: AnalysisTask): Promise<void> {
  if (!db) {
    return initializeDb().then(() => saveAnalysis(task));
  }
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.put({
        id: task.id,
        subreddit: task.subreddit,
        result: task.result,
        timestamp: Date.now()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

// Get an analysis result by subreddit name
export function getAnalysisBySubreddit(subreddit: string): Promise<AnalysisResult | null> {
  if (!db) {
    return initializeDb().then(() => getAnalysisBySubreddit(subreddit));
  }
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      // Since we don't have an index on subreddit, we need to scan all records
      const request = store.openCursor();
      let result: AnalysisResult | null = null;
      let latestTimestamp = 0;
      
      request.onsuccess = (event) => {
        const cursor = request.result;
        if (cursor) {
          const record = cursor.value;
          if (record.subreddit.toLowerCase() === subreddit.toLowerCase() && 
              record.timestamp > latestTimestamp && 
              record.result) {
            result = record.result;
            latestTimestamp = record.timestamp;
          }
          cursor.continue();
        } else {
          resolve(result);
        }
      };
      
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

// Get the latest analysis task for a subreddit
export function getLatestTaskForSubreddit(subreddit: string): Promise<AnalysisTask | null> {
  if (!db) {
    return initializeDb().then(() => getLatestTaskForSubreddit(subreddit));
  }
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      // Since we don't have an index on subreddit, we need to scan all records
      const request = store.openCursor();
      let latestTask: AnalysisTask | null = null;
      let latestTimestamp = 0;
      
      request.onsuccess = (event) => {
        const cursor = request.result;
        if (cursor) {
          const record = cursor.value;
          if (record.subreddit.toLowerCase() === subreddit.toLowerCase() && 
              record.timestamp > latestTimestamp) {
            latestTask = {
              id: record.id,
              subreddit: record.subreddit,
              status: 'completed',
              result: record.result,
              progress: 100,
              queuedAt: record.timestamp,
              completedAt: record.timestamp
            };
            latestTimestamp = record.timestamp;
          }
          cursor.continue();
        } else {
          resolve(latestTask);
        }
      };
      
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

// Initialize the database when this module loads
initializeDb().catch(err => {
  console.error('Failed to initialize IndexedDB:', err);
});

export default {
  initializeDb,
  saveAnalysis,
  getAnalysisBySubreddit,
  getLatestTaskForSubreddit
};