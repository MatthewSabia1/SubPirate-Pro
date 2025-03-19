/// <reference lib="webworker" />

import { SubredditInfo, SubredditPost } from './reddit';
import { AnalysisResult, AnalysisProgress } from './analysis';

interface WorkerMessage {
  info: SubredditInfo;
  posts: SubredditPost[];
  analysisId: string;
}

declare const self: SharedWorkerGlobalScope;

// Track active analyses to prevent race conditions
const activeAnalyses = new Set<string>();
// Store active port and timeout mappings 
const portAnalysisMap = new Map<MessagePort, Set<string>>();
const analysisTimeouts = new Map<string, number>();
// Maximum analysis time (5 minutes)
const MAX_ANALYSIS_TIME = 5 * 60 * 1000;

interface ExtendedWorkerMessage {
  info?: SubredditInfo;
  posts?: SubredditPost[];
  analysisId: string;
  type?: 'cancel';
}

self.onconnect = (e: MessageEvent) => {
  const port = e.ports[0];
  
  // Initialize port tracking
  portAnalysisMap.set(port, new Set<string>());
  
  // Clean up when port is closed
  port.onclose = () => {
    // Get analyses associated with this port
    const portAnalyses = portAnalysisMap.get(port);
    if (portAnalyses) {
      // Remove each analysis from the active set
      portAnalyses.forEach(analysisId => {
        activeAnalyses.delete(analysisId);
        
        // Clear any timeouts
        const timeoutId = analysisTimeouts.get(analysisId);
        if (timeoutId) {
          clearTimeout(timeoutId);
          analysisTimeouts.delete(analysisId);
        }
      });
      
      // Remove port from mapping
      portAnalysisMap.delete(port);
    }
  };
  
  port.onmessage = async (event: MessageEvent<ExtendedWorkerMessage>) => {
    const { info, posts, analysisId, type } = event.data;
    
    // Handle cancellation messages
    if (type === 'cancel') {
      if (activeAnalyses.has(analysisId)) {
        activeAnalyses.delete(analysisId);
        
        // Clear any timeouts
        const timeoutId = analysisTimeouts.get(analysisId);
        if (timeoutId) {
          clearTimeout(timeoutId);
          analysisTimeouts.delete(analysisId);
        }
        
        // Remove from port tracking
        const portAnalyses = portAnalysisMap.get(port);
        if (portAnalyses) {
          portAnalyses.delete(analysisId);
        }
        
        port.postMessage({
          type: 'error',
          analysisId,
          error: 'Analysis cancelled'
        });
      }
      return;
    }
    
    // Handle standard analysis requests
    if (!info || !posts) {
      port.postMessage({
        type: 'error',
        analysisId,
        error: 'Invalid message format: missing info or posts'
      });
      return;
    }
    
    try {
      // Check if this analysis is already running
      if (activeAnalyses.has(analysisId)) {
        port.postMessage({
          type: 'error',
          analysisId,
          error: 'An analysis with this ID is already in progress'
        });
        return;
      }
      
      // Register this analysis as active
      activeAnalyses.add(analysisId);
      
      // Track this analysis with the port
      const portAnalyses = portAnalysisMap.get(port);
      if (portAnalyses) {
        portAnalyses.add(analysisId);
      }
      
      // Set a maximum timeout for this analysis
      const timeoutId = setTimeout(() => {
        // If analysis is still running after MAX_ANALYSIS_TIME, cancel it
        if (activeAnalyses.has(analysisId)) {
          activeAnalyses.delete(analysisId);
          
          // Remove from port tracking
          const portAnalyses = portAnalysisMap.get(port);
          if (portAnalyses) {
            portAnalyses.delete(analysisId);
          }
          
          port.postMessage({
            type: 'error',
            analysisId,
            error: 'Analysis timeout: operation took too long'
          });
        }
        
        // Clear the timeout record
        analysisTimeouts.delete(analysisId);
      }, MAX_ANALYSIS_TIME);
      
      // Store the timeout ID
      analysisTimeouts.set(analysisId, timeoutId as unknown as number);
      
      // Send initial progress
      port.postMessage({ 
        type: 'progress', 
        analysisId, 
        data: { progress: 0, message: 'Starting analysis...', indeterminate: false } 
      });

      // Basic analysis first (fast metrics)
      const basicMetrics: AnalysisResult = {
        info: {
          ...info,
          rules: info.rules.map(rule => ({
            ...rule,
            marketingImpact: 'medium' as const
          }))
        },
        posts: posts.map(post => ({
          title: post.title,
          score: post.score,
          num_comments: post.num_comments,
          created_utc: post.created_utc
        })),
        analysis: {
          marketingFriendliness: {
            score: 0.7,
            reasons: ['Initial analysis'],
            recommendations: ['Preliminary recommendation']
          },
          postingLimits: {
            frequency: posts.length / 30,
            bestTimeToPost: ['9:00 AM EST'],
            contentRestrictions: []
          },
          contentStrategy: {
            recommendedTypes: ['text', 'image'],
            topics: ['general'],
            style: 'casual',
            dos: ['Be engaging'],
            donts: ['Avoid spam']
          },
          titleTemplates: {
            patterns: ['[Topic] Discussion'],
            examples: ['Example Title'],
            effectiveness: 0.8
          },
          strategicAnalysis: {
            strengths: ['Active community'],
            weaknesses: ['Areas to improve'],
            opportunities: ['Growth potential'],
            risks: ['Competition']
          },
          gamePlan: {
            immediate: ['Start engaging'],
            shortTerm: ['Build presence'],
            longTerm: ['Establish authority']
          }
        }
      };

      port.postMessage({
        type: 'basicAnalysis',
        analysisId,
        data: basicMetrics
      });

      // Simulate deeper analysis with progress updates
      for (let i = 1; i <= 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        port.postMessage({
          type: 'progress',
          analysisId,
          data: { progress: i * 20, message: `Processing phase ${i}...`, indeterminate: false }
        });
      }

      // Final analysis result - in a real implementation, this would be more detailed
      const result: AnalysisResult = {
        ...basicMetrics,
        analysis: {
          ...basicMetrics.analysis,
          marketingFriendliness: {
            score: 0.85,
            reasons: ['High engagement rate', 'Active moderation', 'Relevant topics'],
            recommendations: ['Post during peak hours', 'Focus on quality content', 'Engage with comments']
          },
          contentStrategy: {
            ...basicMetrics.analysis.contentStrategy,
            topics: ['Trending topics', 'Community interests', 'Current events'],
            dos: ['Research before posting', 'Follow community guidelines', 'Add value to discussions'],
            donts: ['Avoid self-promotion', 'Don\'t spam', 'Don\'t ignore feedback']
          }
        }
      };

      port.postMessage({
        type: 'complete',
        analysisId,
        data: result
      });
      
      // Cleanup after completion
      activeAnalyses.delete(analysisId);
      
      // Clear any timeouts
      const completionTimeoutId = analysisTimeouts.get(analysisId);
      if (completionTimeoutId) {
        clearTimeout(completionTimeoutId);
        analysisTimeouts.delete(analysisId);
      }
      
      // Remove from port tracking
      const completionPortAnalyses = portAnalysisMap.get(port);
      if (completionPortAnalyses) {
        completionPortAnalyses.delete(analysisId);
      }
    } catch (err: any) {
      port.postMessage({
        type: 'error',
        analysisId,
        error: err.message || 'Unknown error during analysis'
      });
      
      // Cleanup after error
      activeAnalyses.delete(analysisId);
      
      // Clear any timeouts
      const errorTimeoutId = analysisTimeouts.get(analysisId);
      if (errorTimeoutId) {
        clearTimeout(errorTimeoutId);
        analysisTimeouts.delete(analysisId);
      }
      
      // Remove from port tracking
      const errorPortAnalyses = portAnalysisMap.get(port);
      if (errorPortAnalyses) {
        errorPortAnalyses.delete(analysisId);
      }
    }
  };

  port.start();
}; 