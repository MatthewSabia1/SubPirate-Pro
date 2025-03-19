/* src/features/subreddit-analysis/lib/api.ts */

import { AnalysisResult } from '../types';

/**
 * Analyzes a subreddit and returns detailed metrics and recommendations
 */
export async function analyzeSubreddit(subreddit: string): Promise<AnalysisResult> {
  const response = await fetch(`/api/analyze/${subreddit}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return await response.json();
} 