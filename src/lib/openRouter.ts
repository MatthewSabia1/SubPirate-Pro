import axios from 'axios';
import type { SubredditPost } from './reddit';
import { SYSTEM_PROMPT, ANALYSIS_PROMPT } from '../features/subreddit-analysis/lib/prompts';

const MODEL = 'nvidia/llama-3.1-nemotron-70b-instruct:free';
const API_URL = '/api/openrouter/analyze-subreddit';

interface SubredditAnalysisInput {
  name: string;
  title: string;
  description: string;
  rules: {
    title: string;
    description: string;
    priority: number;
    marketingImpact: 'high' | 'medium' | 'low';
  }[];
  content_categories: string[];
  posting_requirements: {
    karma_required: boolean;
    account_age_required: boolean;
    manual_approval: boolean;
  };
  allowed_content_types: string[];
}

interface AIAnalysisOutput {
  postingLimits: {
    frequency: number;
    bestTimeToPost: string[];
    contentRestrictions: string[];
  };
  titleTemplates: {
    patterns: string[];
    examples: string[];
    effectiveness: number;
  };
  contentStrategy: {
    recommendedTypes: string[];
    topics: string[];
    style: string;
    dos: string[];
    donts: string[];
  };
  strategicAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    risks: string[];
  };
  marketingFriendliness: {
    score: number;
    reasons: string[];
    recommendations: string[];
  };
  gamePlan: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

export class AIAnalysisError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'AIAnalysisError';
  }
}

const systemPrompt = `You are an expert Reddit marketing analyst. Your task is to analyze subreddit rules and content requirements to determine marketing potential. Focus ONLY on:

1. Rule Analysis:
   - How restrictive are the rules regarding marketing/promotion?
   - What content types are allowed/prohibited?
   - Are there specific formatting requirements?

2. Title Requirements:
   - Required formats (e.g. [Tags], specific prefixes)
   - Prohibited patterns
   - Length restrictions
   - Example templates that comply with rules

3. Content Restrictions:
   - Allowed media types
   - Required content elements
   - Prohibited content types
   - Quality requirements

DO NOT consider engagement metrics, subscriber counts, or activity levels. Base your analysis purely on how permissive or restrictive the subreddit's rules and requirements are for marketing activities.

Your response must be valid JSON matching the AIAnalysisOutput interface.`;

function calculatePostingFrequency(posts: SubredditPost[]): { frequency: number; bestTimes: string[] } {
  return {
    frequency: 1,
    bestTimes: ['Morning', 'Afternoon', 'Evening']
  };
}

function analyzeContentTypes(posts: SubredditPost[]): string[] {
  const types = new Set<string>();
  
  posts.forEach(post => {
    if (post.selftext) types.add('text');
    if (post.url.match(/\.(jpg|jpeg|png|gif)$/i)) types.add('image');
    if (post.url.match(/\.(mp4|webm)$/i)) types.add('video');
    if (post.url.match(/^https?:\/\//) && !post.url.match(/\.(jpg|jpeg|png|gif|mp4|webm)$/i)) {
      types.add('link');
    }
  });

  return Array.from(types);
}

function generateTitleTemplates(posts: SubredditPost[]): {
  patterns: string[];
  examples: string[];
} {
  return {
    patterns: [
      'Descriptive Title',
      'Question Format Title?',
      '[Topic] - Description'
    ],
    examples: [
      'The Complete Guide to Getting Started',
      'What Are Your Best Tips for Success?',
      '[Discussion] How to Improve Your Content'
    ]
  };
}

function generateContentStrategy(input: SubredditAnalysisInput, posts: SubredditPost[]): {
  recommendedTypes: string[];
  topics: string[];
  style: string;
  dos: string[];
  donts: string[];
} {
  // Analyze successful content types
  const contentTypes = analyzeContentTypes(posts);
  // Analyze post performance by type
  const performanceByType = new Map<string, number>();
  posts.forEach(post => {
    const type = post.selftext ? 'text' : 
                post.preview_url ? 'image' : 'link';
    const score = post.score + post.num_comments;
    performanceByType.set(type, (performanceByType.get(type) || 0) + score);
  });

  // Sort content types by performance
  const sortedTypes = Array.from(performanceByType.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type);

  // Extract key topics and themes
  const topPosts = posts.sort((a, b) => b.score - a.score).slice(0, 10);
  const topics = extractTopics(topPosts);

  // Determine content style based on community analysis
  const style = determineContentStyle(input, posts);

  // Generate specific best practices
  const dos = [
    `Post during peak engagement hours: ${formatTimeRanges(input.engagement_metrics.peak_hours)}`,
    `Focus on ${sortedTypes[0]} content with ${style.toLowerCase()} approach`,
    `Include community-specific keywords: ${topics.slice(0, 3).join(', ')}`,
    'Engage actively in post comments within first 2 hours',
    'Follow community formatting guidelines'
  ];

  // Generate restrictions based on rules and data
  const donts = [
    ...input.rules
      .filter(r => r.marketingImpact === 'high')
      .map(r => `Avoid ${r.title.toLowerCase()}`),
    'No excessive self-promotion or spam',
    'Avoid posting during low-activity hours',
    'Don\'t use clickbait or misleading titles',
    'Don\'t ignore community feedback'
  ].slice(0, 5);

  return {
    recommendedTypes: sortedTypes.length > 0 ? sortedTypes : (contentTypes.length ? contentTypes : ['text']),
    topics,
    style,
    dos,
    donts
  };
}

function generateGamePlan(input: SubredditAnalysisInput): AIAnalysisOutput['gamePlan'] {
  // Analyze posting patterns
  const postingPatterns = analyzePostingPatterns(input.historical_posts);
  
  // Analyze rule impact
  const ruleImpact = analyzeRuleImpact(input.rules);
  
  // Generate immediate actions based on current state
  const immediate = [
    `Optimize posting schedule for ${postingPatterns.bestDays.join(', ')} at ${postingPatterns.bestTimes.join(', ')}`,
    `Focus on ${ruleImpact.allowedTypes.join(' and ')} content formats`,
    `Build credibility through ${input.engagement_metrics.avg_comments > input.engagement_metrics.avg_score ? 'community discussions' : 'valuable insights'}`
  ];

  // Generate short-term strategy
  const shortTerm = [
    `Develop a content calendar focusing on ${postingPatterns.frequency} posts per day`,
    `Create templates for ${ruleImpact.allowedTypes[0]} posts that align with community guidelines`,
    `Build relationships with active community members through meaningful interactions`
  ];

  // Generate long-term strategy
  const longTerm = [
    'Establish thought leadership through consistent, high-quality contributions',
    'Create a recognizable brand voice that resonates with the community',
    'Develop a network of supporters through genuine engagement'
  ];

  return {
    immediate,
    shortTerm,
    longTerm
  };
}

// Helper functions
function extractTopics(posts: SubredditPost[]): string[] {
  const wordFreq: Record<string, number> = {};
  const stopwords = new Set(["the", "and", "a", "to", "of", "in", "is", "it", "that", "for", "on", "with", "as", "at", "by", "an", "be", "i", "you", "this", "are", "from"]);
  
  posts.forEach(post => {
    post.title.toLowerCase()
      .split(/\W+/)
      .filter(word => word && !stopwords.has(word))
      .forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
  });

  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

function determineContentStyle(input: SubredditAnalysisInput, posts: SubredditPost[]): string {
  const avgComments = input.engagement_metrics.avg_comments;
  const avgScore = input.engagement_metrics.avg_score;
  const hasDiscussions = posts.some(p => p.num_comments > p.score * 2);
  
  if (avgComments > avgScore * 1.5) {
    return 'Discussion-focused and interactive';
  } else if (hasDiscussions) {
    return 'Balanced mix of information and discussion';
  } else {
    return 'Informative and value-driven';
  }
}

function formatTimeRanges(hours: number[]): string {
  return hours.map(hour => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}${period}`;
  }).join(', ');
}

function analyzePostingPatterns(posts: SubredditPost[]): {
  frequency: number;
  bestDays: string[];
  bestTimes: string[];
} {
  const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const postsByDay = new Map<string, number>();
  const postsByHour = new Map<number, number>();

  posts.forEach(post => {
    const date = new Date(post.created_utc * 1000);
    const day = dayMap[date.getDay()];
    const hour = date.getHours();

    postsByDay.set(day, (postsByDay.get(day) || 0) + 1);
    postsByHour.set(hour, (postsByHour.get(hour) || 0) + 1);
  });

  const bestDays = Array.from(postsByDay.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([day]) => day);

  const bestTimes = Array.from(postsByHour.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}${period}`;
    });

  return {
    frequency: Math.ceil(posts.length / 7),
    bestDays,
    bestTimes
  };
}

function analyzeRuleImpact(rules: SubredditAnalysisInput['rules']): {
  allowedTypes: string[];
  restrictions: string[];
  marketingImpact: 'high' | 'medium' | 'low';
} {
  const contentRestrictions = rules
    .filter(r => r.marketingImpact === 'high')
    .map(r => r.title);

  const defaultTypes = ['text', 'link'];
  const restrictedTypes = new Set<string>();

  rules.forEach(rule => {
    const description = rule.description.toLowerCase();
    if (description.includes('image') && description.includes('not allowed')) {
      restrictedTypes.add('image');
    }
    if (description.includes('video') && description.includes('not allowed')) {
      restrictedTypes.add('video');
    }
  });

  const allowedTypes = defaultTypes.filter(type => !restrictedTypes.has(type));

  const marketingImpact = rules.filter(r => r.marketingImpact === 'high').length > 2 ? 'high' :
                         rules.filter(r => r.marketingImpact === 'medium').length > 3 ? 'medium' : 'low';

  return {
    allowedTypes,
    restrictions: contentRestrictions,
    marketingImpact
  };
}

function calculateMarketingScore(rules: any[]): number {
  let score = 75; // Start with neutral score
  
  // Count restrictive rules
  const highImpactRules = rules.filter((r: any) => r.marketingImpact === 'high').length;
  const mediumImpactRules = rules.filter((r: any) => r.marketingImpact === 'medium').length;
  
  // Deduct points for restrictive rules
  score -= (highImpactRules * 10);
  score -= (mediumImpactRules * 5);
  
  return Math.max(0, Math.min(100, score));
}

// Add this type for better type safety
interface MarketingScoreFactors {
  communitySize: number;
  activityRatio: number;
  engagement: number;
  contentFlexibility: number;
  activityFrequency: number;
}

// Add interface for database schema compatibility
export interface SubredditDBRecord {
  id: string;
  name: string;
  subscriber_count: number;
  active_users: number;
  marketing_friendly_score: number;
  posting_requirements: {
    restrictions: string[];
    bestTimes: string[];
    bestDays?: string[];
  };
  posting_frequency: {
    frequency: number;
    recommendedTypes: string[];
  };
  allowed_content: string[];
  best_practices: string[];
  rules_summary: string | null;
  title_template: string | null;
  last_analyzed_at: string;
  created_at: string;
  updated_at: string;
  icon_img: string | null;
  community_icon: string | null;
  total_posts_24h: number;
  last_post_sync: string | null;
  analysis_data: AIAnalysisOutput;
}

export async function analyzeSubreddit(input: SubredditAnalysisInput): Promise<AIAnalysisOutput> {
  try {
    const response = await axios.post(API_URL, {
      data: input,
      systemPrompt: SYSTEM_PROMPT,
      responseFormat: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            postingLimits: {
              type: 'object',
              properties: {
                frequency: { type: 'number' },
                bestTimeToPost: { type: 'array', items: { type: 'string' } },
                contentRestrictions: { type: 'array', items: { type: 'string' } }
              },
              required: ['frequency', 'bestTimeToPost', 'contentRestrictions']
            },
            titleTemplates: {
              type: 'object',
              properties: {
                patterns: { type: 'array', items: { type: 'string' } },
                examples: { type: 'array', items: { type: 'string' } },
                effectiveness: { type: 'number' }
              },
              required: ['patterns', 'examples', 'effectiveness']
            },
            contentStrategy: {
              type: 'object',
              properties: {
                recommendedTypes: { type: 'array', items: { type: 'string' } },
                topics: { type: 'array', items: { type: 'string' } },
                style: { type: 'string' },
                dos: { type: 'array', items: { type: 'string' } },
                donts: { type: 'array', items: { type: 'string' } }
              },
              required: ['recommendedTypes', 'topics', 'style', 'dos', 'donts']
            },
            strategicAnalysis: {
              type: 'object',
              properties: {
                strengths: { type: 'array', items: { type: 'string' } },
                weaknesses: { type: 'array', items: { type: 'string' } },
                opportunities: { type: 'array', items: { type: 'string' } },
                risks: { type: 'array', items: { type: 'string' } }
              },
              required: ['strengths', 'weaknesses', 'opportunities', 'risks']
            },
            marketingFriendliness: {
              type: 'object',
              properties: {
                score: { type: 'number' },
                reasons: { type: 'array', items: { type: 'string' } },
                recommendations: { type: 'array', items: { type: 'string' } }
              },
              required: ['score', 'reasons', 'recommendations']
            },
            gamePlan: {
              type: 'object',
              properties: {
                immediate: { type: 'array', items: { type: 'string' } },
                shortTerm: { type: 'array', items: { type: 'string' } },
                longTerm: { type: 'array', items: { type: 'string' } }
              },
              required: ['immediate', 'shortTerm', 'longTerm']
            }
          },
          required: ['postingLimits', 'titleTemplates', 'contentStrategy', 'strategicAnalysis', 'marketingFriendliness', 'gamePlan']
        }
      }
    });

    if (response.status !== 200) {
      throw new AIAnalysisError(
        `Analysis failed with status: ${response.status}`, 
        response.status
      );
    }

    const result = response.data.choices?.[0]?.message?.content;
    
    if (!result) {
      throw new AIAnalysisError('Invalid response format from analysis server');
    }

    return validateAndTransformOutput(result);
  } catch (error) {
    console.error('Subreddit analysis error:', error);
    
    if (error instanceof AIAnalysisError) {
      throw error;
    }
    
    throw new AIAnalysisError(
      error.response?.data?.error || error.message || 'Unknown error during analysis'
    );
  }
}

function validateAndTransformOutput(result: unknown): AIAnalysisOutput {
  let parsedResult: any = result;
  
  try {
    // Handle string results that might be markdown-formatted
    if (typeof parsedResult === 'string') {
      const markdownMatch = parsedResult.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (markdownMatch) {
        try {
          parsedResult = JSON.parse(markdownMatch[1].trim());
        } catch (jsonErr) {
          console.error('Failed to parse JSON from markdown block:', jsonErr);
        }
      }
      
      if (typeof parsedResult === 'string') {
        try {
          parsedResult = JSON.parse(parsedResult);
        } catch (err) {
          console.error('Failed to parse result string:', err);
        }
      }
    }

    const output: AIAnalysisOutput = {
      postingLimits: {
        frequency: parsedResult?.postingLimits?.frequency || 1,
        bestTimeToPost: ['Morning', 'Afternoon', 'Evening'],
        contentRestrictions: Array.isArray(parsedResult?.postingLimits?.contentRestrictions)
          ? parsedResult.postingLimits.contentRestrictions
          : ['Follow subreddit rules']
      },
      titleTemplates: {
        patterns: Array.isArray(parsedResult?.titleTemplates?.patterns)
          ? parsedResult.titleTemplates.patterns
          : extractTitlePatterns(parsedResult?.rules || []),
        examples: Array.isArray(parsedResult?.titleTemplates?.examples)
          ? parsedResult.titleTemplates.examples
          : generateTitleExamples(parsedResult?.titleTemplates?.patterns || []),
        effectiveness: 75 // Default since we're not using engagement metrics
      },
      contentStrategy: {
        recommendedTypes: Array.isArray(parsedResult?.contentStrategy?.recommendedTypes)
          ? parsedResult.contentStrategy.recommendedTypes
          : ['text'],
        topics: Array.isArray(parsedResult?.contentStrategy?.topics)
          ? parsedResult.contentStrategy.topics
          : ['General Discussion'],
        style: parsedResult?.contentStrategy?.style || 'Professional and informative',
        dos: Array.isArray(parsedResult?.contentStrategy?.dos)
          ? parsedResult.contentStrategy.dos
          : ['Follow posting guidelines', 'Maintain high quality'],
        donts: Array.isArray(parsedResult?.contentStrategy?.donts)
          ? parsedResult.contentStrategy.donts
          : ['Avoid excessive promotion', 'Don\'t spam']
      },
      strategicAnalysis: {
        strengths: Array.isArray(parsedResult?.strategicAnalysis?.strengths)
          ? parsedResult.strategicAnalysis.strengths
          : ['Clear posting guidelines'],
        weaknesses: Array.isArray(parsedResult?.strategicAnalysis?.weaknesses)
          ? parsedResult.strategicAnalysis.weaknesses
          : ['Content restrictions'],
        opportunities: Array.isArray(parsedResult?.strategicAnalysis?.opportunities)
          ? parsedResult.strategicAnalysis.opportunities
          : ['Rule-compliant content'],
        risks: Array.isArray(parsedResult?.strategicAnalysis?.risks)
          ? parsedResult.strategicAnalysis.risks
          : ['Rule violations']
      },
      marketingFriendliness: {
        score: typeof parsedResult?.marketingFriendliness?.score === 'number'
          ? Math.min(100, Math.max(0, parsedResult.marketingFriendliness.score))
          : calculateMarketingScore(parsedResult?.rules || []),
        reasons: Array.isArray(parsedResult?.marketingFriendliness?.reasons)
          ? parsedResult.marketingFriendliness.reasons
          : ['Based on rule analysis'],
        recommendations: Array.isArray(parsedResult?.marketingFriendliness?.recommendations)
          ? parsedResult.marketingFriendliness.recommendations
          : ['Follow posting guidelines']
      },
      gamePlan: {
        immediate: Array.isArray(parsedResult?.gamePlan?.immediate)
          ? parsedResult.gamePlan.immediate
          : ['Review all rules'],
        shortTerm: Array.isArray(parsedResult?.gamePlan?.shortTerm)
          ? parsedResult.gamePlan.shortTerm
          : ['Develop compliant content'],
        longTerm: Array.isArray(parsedResult?.gamePlan?.longTerm)
          ? parsedResult.gamePlan.longTerm
          : ['Build trusted presence']
      }
    };

    return output;
  } catch (error) {
    console.error('Error validating output:', error);
    throw new AIAnalysisError('Failed to validate AI response');
  }
}

function extractTitlePatterns(rules: any[]): string[] {
  const patterns = new Set<string>();
  const ruleText = Array.isArray(rules) ? rules.join(' ').toLowerCase() : '';

  if (ruleText.includes('[') && ruleText.includes(']')) {
    patterns.add('[Category/Topic] Your Title');
  }
  
  if (ruleText.includes('flair')) {
    patterns.add('Title with Required Flair');
  }

  if (patterns.size === 0) {
    patterns.add('Descriptive Title');
    patterns.add('Question Format Title?');
    patterns.add('[Topic] - Description');
  }

  return Array.from(patterns);
}

function generateTitleExamples(patterns: string[]): string[] {
  return patterns.map(pattern => {
    if (pattern.includes('[Category/Topic]')) {
      return '[Discussion] How to Improve Your Content';
    }
    if (pattern.includes('Question')) {
      return 'What Are Your Best Tips for Success?';
    }
    if (pattern.includes('Descriptive')) {
      return 'The Complete Guide to Getting Started';
    }
    return 'Professional Guide: Best Practices';
  });
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}