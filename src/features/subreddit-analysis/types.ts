import { AnalysisResult } from '../../lib/analysis';

// Re-export the official analysis types
export type { AnalysisResult };

// Derived types used only in this feature
export interface SavedSubreddit {
  id: string;
  name: string;
  subscriber_count: number;
  active_users: number;
  marketing_friendly_score: number;
  allowed_content: string[];
  posting_requirements: {
    restrictions: string[];
    bestTimes: string[];
  };
  posting_frequency: {
    frequency: number;
    recommendedTypes: string[];
  };
  best_practices: string[];
  rules_summary: string;
  title_template: string;
  last_analyzed_at: string;
  analysis_data: AnalysisResult;
}