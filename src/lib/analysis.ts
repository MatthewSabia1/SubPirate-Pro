import { SubredditInfo, SubredditPost } from './reddit';
import { analyzeSubreddit, AIAnalysisError } from './openRouter';

export interface AnalysisProgress {
  status: string;
  progress: number;
  indeterminate: boolean;
}

export interface AnalysisResult {
  info: SubredditInfo & {
    rules: Array<{
      title: string;
      description: string;
      marketingImpact: 'high' | 'medium' | 'low';
    }>;
  };
  posts: Array<{
    title: string;
    score: number;
    num_comments: number;
    created_utc: number;
  }>;
  analysis: {
    marketingFriendliness: {
      score: number;
      reasons: string[];
      recommendations: string[];
    };
    postingLimits: {
      frequency: number;
      bestTimeToPost: string[];
      contentRestrictions: string[];
    };
    contentStrategy: {
      recommendedTypes: string[];
      topics: string[];
      style: string;
      dos: string[];
      donts: string[];
    };
    titleTemplates: {
      patterns: string[];
      examples: string[];
      effectiveness: number;
    };
    strategicAnalysis: {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      risks: string[];
    };
    gamePlan: {
      immediate: string[];
      shortTerm: string[];
      longTerm: string[];
    };
  };
}

interface SubredditAnalysisInput {
  name: string;
  title: string;
  subscribers: number;
  active_users: number;
  description: string;
  posts_per_day: number;
  historical_posts: SubredditPost[];
  engagement_metrics: {
    avg_comments: number;
    avg_score: number;
    peak_hours: number[];
    interaction_rate: number;
    posts_per_hour: number[];
  };
  rules: Array<{
    title: string;
    description: string;
    priority: number;
    marketingImpact: 'high' | 'medium' | 'low';
  }>;
}

function calculateEngagementMetrics(posts: SubredditPost[]) {
  const totalPosts = posts.length;
  if (totalPosts === 0) return null;

  const avgComments = posts.reduce((sum, post) => sum + post.num_comments, 0) / totalPosts;
  const avgScore = posts.reduce((sum, post) => sum + post.score, 0) / totalPosts;
  
  // Calculate posts per hour
  const postTimes = posts.map(post => new Date(post.created_utc * 1000).getHours());
  const hourCounts = new Array(24).fill(0);
  postTimes.forEach(hour => hourCounts[hour]++);
  
  // Find peak hours (hours with most posts)
  const maxPosts = Math.max(...hourCounts);
  const peakHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .filter(({ count }) => count >= maxPosts * 0.8)
    .map(({ hour }) => hour);

  const interactionRate = (avgComments + avgScore) / totalPosts;

  return {
    avg_comments: avgComments,
    avg_score: avgScore,
    peak_hours: peakHours,
    interaction_rate: interactionRate,
    posts_per_hour: hourCounts
  };
}

function analyzeRuleMarketingImpact(rule: { title: string; description: string }): 'high' | 'medium' | 'low' {
  const text = `${rule.title} ${rule.description}`.toLowerCase();
  
  // High impact keywords indicate significant marketing restrictions
  const highImpactKeywords = [
    'no promotion',
    'no advertising',
    'no marketing',
    'no self-promotion',
    'no solicitation',
    'spam is not allowed',
    'zero tolerance',
    'will be removed immediately',
    'permanent ban'
  ];

  // Medium impact keywords indicate partial restrictions
  const mediumImpactKeywords = [
    'limited promotion',
    'restricted advertising',
    'promotional guidelines',
    'approval required',
    'permission needed',
    'follow ratio',
    'self-promotion rules',
    'promotional content guidelines',
    'advertising guidelines'
  ];
  
  // Low impact phrases that indicate lenient policies
  const lowImpactPhrases = [
    'occasional self-promotion',
    'self-promotion allowed',
    'promotion thread',
    'promotion friday',
    'self-promotion sunday',
    'weekly promotion'
  ];

  // First check for explicitly allowed promotion
  if (lowImpactPhrases.some(phrase => text.includes(phrase))) {
    return 'low';
  }
  
  // Check for high impact restrictions next
  // Use more precise matching to avoid false positives
  if (highImpactKeywords.some(keyword => {
    // More precise matching
    return text.includes(keyword) ||
           // Match variations like "promotions are not allowed"
           (keyword.includes('no ') && 
            text.includes(keyword.replace('no ', '')) && 
            (text.includes('not allowed') || text.includes('prohibited') || text.includes('forbidden')));
  })) {
    return 'high';
  }

  // Then check for medium impact restrictions
  if (mediumImpactKeywords.some(keyword => text.includes(keyword))) {
    return 'medium';
  }

  // Default to low impact if no explicit restrictions found
  // This change makes the system more optimistic by default
  return 'low';
}

function prepareAnalysisInput(info: SubredditInfo, posts: SubredditPost[]): SubredditAnalysisInput {
  const engagement = calculateEngagementMetrics(posts);
  if (!engagement) {
    throw new Error('Not enough post data for analysis');
  }

  const historicalPosts = posts.map(post => ({
    ...post,
    engagement_rate: (post.score + post.num_comments) / engagement.interaction_rate
  }));

  // Analyze marketing impact for each rule
  const rulesWithImpact = info.rules.map(rule => ({
    ...rule,
    marketingImpact: analyzeRuleMarketingImpact(rule)
  }));
  
  // Extract top performing posts for title templates
  const topPosts = [...posts]
    .sort((a, b) => (b.score + b.num_comments) - (a.score + a.num_comments))
    .slice(0, 5)
    .map(post => post.title);

  return {
    name: info.name,
    title: info.title,
    subscribers: info.subscribers,
    active_users: info.active_users,
    description: info.description,
    posts_per_day: posts.length / 7, // Assuming posts are from last 7 days
    historical_posts: historicalPosts,
    engagement_metrics: engagement,
    top_post_titles: topPosts, // Added for better title template generation
    rules: rulesWithImpact.map((rule, index) => ({
      title: rule.title,
      description: rule.description,
      priority: index + 1,
      marketingImpact: rule.marketingImpact
    }))
  };
}

function formatBestPostingTimes(peakHours: number[]): string[] {
  return peakHours.map(hour => {
    const period = hour < 12 ? 'AM' : 'PM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:00 ${period} - ${formattedHour}:59 ${period}`;
  });
}

function getRecommendedContentTypes(posts: SubredditPost[]): string[] {
  const types = new Set<string>();
  
  posts.forEach(post => {
    if (post.selftext.length > 0) types.add('text');
    if (post.url.match(/\.(jpg|jpeg|png|gif)$/i)) types.add('image');
    if (post.url.match(/\.(mp4|webm)$/i)) types.add('video');
    if (post.url.match(/^https?:\/\//) && !post.url.match(/\.(jpg|jpeg|png|gif|mp4|webm)$/i)) {
      types.add('link');
    }
  });

  return Array.from(types);
}

function calculateMarketingScore(input: SubredditAnalysisInput): number {
  let factors: { name: string; score: number; weight: number; }[] = [];
  
  // Start with a higher baseline score - more optimistic assessment
  const baselineScore = 70;
  
  // Factor 1: Rule Flexibility (0-40 points) - most important factor for marketing
  // Analyze rules for marketing restrictions
  const totalRules = input.rules.length;
  const highImpactRules = input.rules.filter(r => r.marketingImpact === 'high').length;
  const mediumImpactRules = input.rules.filter(r => r.marketingImpact === 'medium').length;
  const lowImpactRules = input.rules.filter(r => r.marketingImpact === 'low').length;
  
  // Calculate rule flexibility score
  let ruleFlexibilityScore = 40; // Start with max score
  
  // No rules is a good sign for marketing
  if (totalRules === 0) {
    ruleFlexibilityScore = 40; 
  } else {
    // Reduce penalties for restrictive rules to be more optimistic
    const highImpactPenalty = Math.min(highImpactRules * 5, 20); // Reduced from 8 to 5 points per rule, cap at 20 (was 30)
    const mediumImpactPenalty = Math.min(mediumImpactRules * 2, 10); // Reduced from 3 to 2 points per rule, cap at 10 (was 15)
    
    // Increase bonus for explicitly permissive rules
    const lowImpactBonus = Math.min(lowImpactRules * 3, 15); // Increased from 2 to 3 points, cap at 15 (was 10)
    
    ruleFlexibilityScore = Math.max(0, ruleFlexibilityScore - highImpactPenalty - mediumImpactPenalty + lowImpactBonus);
  }
  
  factors.push({ name: 'Rule Flexibility', score: ruleFlexibilityScore, weight: 40 });

  // Factor 2: Moderator Activity (0-30 points)
  // Reduced penalties for active communities
  let moderationScore = 30;
  
  // Reduced penalty for post frequency - active communities shouldn't be heavily penalized
  const postsPerDay = input.posts_per_day;
  const moderationActivityPenalty = Math.min(Math.sqrt(postsPerDay) * 1.2, 10); // Reduced from 2 to 1.2 multiplier, cap at 10 (was 15)
  
  // Less penalty for active users
  const activeUserRatio = input.subscribers > 0 ? (input.active_users / input.subscribers) : 0;
  const activeModPenalty = Math.min(activeUserRatio * 70, 10); // Reduced from 100 to 70 multiplier, cap at 10 (was 15)
  
  moderationScore = Math.max(0, moderationScore - moderationActivityPenalty - activeModPenalty);
  factors.push({ name: 'Moderation Activity', score: moderationScore, weight: 30 });

  // Factor 3: Community Engagement (0-30 points)
  // More engaged communities are viewed more positively
  const avgEngagement = input.engagement_metrics.avg_score + (input.engagement_metrics.avg_comments);
  
  // More generous logarithmic scale
  const engagementLog = Math.log10(avgEngagement + 1);
  // Increased multiplier to value engagement more highly
  const engagementScore = Math.min(engagementLog * 12, 30); // Increased from 10 to 12 multiplier
  
  factors.push({ name: 'Community Engagement', score: engagementScore, weight: 30 });

  // Calculate weighted average - use direct addition instead of multiplication to avoid compound penalties
  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
  const weightedScore = factors.reduce((sum, factor) => sum + (factor.score * (factor.weight / totalWeight)), 0);
  
  // Apply final adjustments - more additive approach instead of multiplicative
  let finalScore = baselineScore + ((weightedScore - 50) * 0.8);

  // Increased bonuses
  // Bonus for small communities (easier to market in)
  if (input.subscribers < 10000) {
    finalScore += 8; // Increased from 5 to 8
  }
  
  // Bonus for communities with explicitly marketing-friendly rules
  if (lowImpactRules > 0 && highImpactRules === 0) {
    finalScore += 15; // Increased from 10 to 15
  }
  
  // Reduced penalty
  // Penalty for communities with no posting history (unproven)
  if (input.posts_per_day === 0) {
    finalScore -= 5; // Reduced from 10 to 5
  }
  
  // Minimum score floor for communities without explicit anti-marketing rules
  if (highImpactRules === 0 && finalScore < 40) {
    finalScore = 40;
  }

  // Ensure score is between 15 and 100
  return Math.max(15, Math.min(100, Math.round(finalScore)));
}

function extractCommonTopics(posts: SubredditPost[]): string[] {
  // More efficient algorithm that doesn't concatenate all titles
  const wordCounts: Record<string, number> = {};
  
  // Process each title individually
  for (const post of posts) {
    const words = post.title.toLowerCase().split(/\W+/);
    
    // Use a Set to count each word only once per title
    const uniqueWords = new Set(words.filter(word => word.length > 3));
    
    // Update global counts
    for (const word of uniqueWords) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  }

  // Get top 5 most common meaningful words
  return Object.entries(wordCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
}

function extractTitlePatterns(posts: SubredditPost[]): string[] {
  if (!posts || posts.length === 0) {
    return ["Title format: \"[Topic/Subject] + Description\""];
  }

  // Get the top posts by engagement for pattern analysis
  const topPosts = [...posts]
    .sort((a, b) => (b.score + b.num_comments) - (a.score + a.num_comments))
    .slice(0, 20);
  
  // Define more specific pattern matchers with stricter criteria
  const patternMatchers = [
    { 
      pattern: 'Question format: "What/How/Why..."', 
      keywords: ['what', 'how', 'why', '?'], 
      test: (title: string) => 
        (title.includes('?') && (title.toLowerCase().startsWith('what') || 
                                title.toLowerCase().startsWith('how') || 
                                title.toLowerCase().startsWith('why')))
    },
    { 
      pattern: 'List format: "X ways to..."', 
      keywords: ['ways to', 'tips for', 'steps to', 'top ', 'best '], 
      test: (title: string) => 
        /\d+\s+(?:ways|tips|steps|reasons|things|ideas)/i.test(title)
    },
    { 
      pattern: 'Guide format: "How to..."', 
      keywords: ['how to', 'guide to', 'tutorial', 'learn'], 
      test: (title: string) => 
        title.toLowerCase().includes('how to') || 
        title.toLowerCase().includes('guide') || 
        title.toLowerCase().includes('tutorial')
    },
    { 
      pattern: 'Discussion format: "Thoughts on..."', 
      keywords: ['thoughts on', 'opinion', 'discuss'], 
      test: (title: string) => 
        title.toLowerCase().includes('thoughts') || 
        title.toLowerCase().includes('opinion') || 
        title.toLowerCase().includes('discuss')
    },
    { 
      pattern: 'News format: "[Breaking] Event happens..."', 
      keywords: ['breaking', 'announced', 'released', 'launches', 'reveals'], 
      test: (title: string) => 
        /breaking|announced|released|launches|revealed|update/i.test(title)
    },
    { 
      pattern: 'Story format: "I finally got/did X..."', 
      keywords: ['finally', 'just got', 'i got', 'my new', 'after years'], 
      test: (title: string) => 
        /i\s+(?:finally|just|got|did|made|created)/i.test(title)
    },
    {
      pattern: 'Image showcase: "[Pic] Look at this..."',
      keywords: ['pic', 'photo', 'image', 'look at', 'check out'],
      test: (title: string) => 
        /\[pic\]|\[photo\]|check out|look at this/i.test(title)
    },
    {
      pattern: 'Request format: "Looking for recommendations..."',
      keywords: ['looking for', 'need help', 'recommend', 'suggestion'],
      test: (title: string) => 
        /looking for|need help with|can anyone recommend|suggestions for/i.test(title)
    }
  ];

  // Create counters for each pattern
  const patternCounts = patternMatchers.map(p => ({ pattern: p.pattern, count: 0, examples: [] as string[] }));
  
  // Analyze patterns in top posts 
  for (const post of topPosts) {
    const title = post.title;
    
    // Use the more precise test function for each pattern
    for (let i = 0; i < patternMatchers.length; i++) {
      if (patternMatchers[i].test(title)) {
        patternCounts[i].count++;
        if (patternCounts[i].examples.length < 2) {
          patternCounts[i].examples.push(title);
        }
      }
    }
  }

  // If no specific pattern is dominant, generate a custom pattern based on common elements
  let customPattern = null;
  
  if (topPosts.length >= 5) {
    // Look for common starting words
    const startWords: Record<string, number> = {};
    topPosts.forEach(post => {
      const firstWord = post.title.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (firstWord && firstWord.length > 1) {
        startWords[firstWord] = (startWords[firstWord] || 0) + 1;
      }
    });
    
    const commonStart = Object.entries(startWords)
      .filter(([_word, count]) => count >= 3)
      .sort(([_a, countA], [_b, countB]) => countB - countA)
      .map(([word]) => word)[0];
    
    // Look for common symbols/structures
    const hasSquareBrackets = topPosts.filter(p => p.title.includes('[') && p.title.includes(']')).length > 3;
    const hasParentheses = topPosts.filter(p => p.title.includes('(') && p.title.includes(')')).length > 3;
    const hasColons = topPosts.filter(p => p.title.includes(':')).length > 3;
    
    // Generate custom pattern if we have enough commonalities
    if (commonStart || hasSquareBrackets || hasParentheses || hasColons) {
      let formatElements = [];
      
      if (hasSquareBrackets) formatElements.push('[Tag]');
      if (commonStart) formatElements.push(`Start with "${commonStart}"`);
      if (hasColons) formatElements.push('Use a colon to separate topics');
      if (hasParentheses) formatElements.push('(Add context in parentheses)');
      
      if (formatElements.length > 0) {
        customPattern = ` "${formatElements.join(' + ')}"`;
      }
    }
  }
  
  // Sort patterns by frequency
  patternCounts.sort((a, b) => b.count - a.count);
  
  // Get patterns that appear in at least 15% of posts (stricter threshold)
  const threshold = Math.max(2, topPosts.length * 0.15);
  let matchedPatterns = patternCounts
    .filter(({ count }) => count >= threshold)
    .map(({ pattern }) => pattern);
  
  // Add custom pattern if we created one
  if (customPattern && matchedPatterns.length < 2) {
    matchedPatterns.unshift(customPattern);
  }
  
  // Always ensure we have at least one pattern
  if (matchedPatterns.length === 0) {
    // If all else fails, use the top 5 posts to create an example-based pattern
    const topTitles = topPosts.slice(0, 5).map(p => p.title);
    
    // Extract common elements from titles
    const averageLength = topTitles.reduce((sum, title) => sum + title.length, 0) / topTitles.length;
    const hasPunctuation = topTitles.filter(t => /[?!.]/.test(t)).length > 2;
    
    let styleDescription = "Concise, ";
    if (averageLength > 100) styleDescription = "Detailed, ";
    
    if (hasPunctuation) styleDescription += "with punctuation";
    else styleDescription += "direct statements";
    
    matchedPatterns = [`Popular format: "${styleDescription} focusing on specific ${getSubredditTopic(topPosts)}"`];
  }
  
  return matchedPatterns.slice(0, 2); // Return at most 2 patterns
}

// Helper function to extract a topic from post titles
function getSubredditTopic(posts: SubredditPost[]): string {
  if (!posts || posts.length === 0) return "topics";
  
  // Create a map of word frequencies
  const wordCounts: Record<string, number> = {};
  const stopWords = new Set(['the', 'and', 'for', 'this', 'that', 'with', 'you', 'not', 'have', 'are', 'what', 'how', 'why']);
  
  posts.forEach(post => {
    const words = post.title.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));
    
    const uniqueWords = new Set(words);
    uniqueWords.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
  });
  
  // Find the most common substantive words
  const topWords = Object.entries(wordCounts)
    .sort(([_wordA, countA], [_wordB, countB]) => countB - countA)
    .slice(0, 3)
    .map(([word]) => word);
  
  if (topWords.length === 0) return "topics";
  if (topWords.length === 1) return topWords[0];
  return `${topWords[0]}/${topWords[1]}`;
}

function calculateTitleEffectiveness(posts: SubredditPost[]): number {
  if (!posts.length) return 0;

  // Calculate average engagement
  const avgEngagement = posts.reduce((sum, post) => 
    sum + post.score + post.num_comments, 0
  ) / posts.length;

  // Find posts with above average engagement
  const highEngagementPosts = posts.filter(post => 
    post.score + post.num_comments > avgEngagement
  );

  // Return percentage of high engagement posts
  return Math.round((highEngagementPosts.length / posts.length) * 100);
}

// Interface for SubredditAnalysisInput
interface SubredditAnalysisInput {
  name: string;
  title: string;
  subscribers: number;
  active_users: number;
  description: string;
  posts_per_day: number;
  historical_posts: any[];
  engagement_metrics: {
    avg_comments: number;
    avg_score: number;
    peak_hours: number[];
    interaction_rate: number;
    posts_per_hour: number[];
  };
  top_post_titles?: string[]; // Added for title template generation
  rules: Array<{
    title: string;
    description: string;
    priority: number;
    marketingImpact: 'high' | 'medium' | 'low';
  }>;
}

export async function analyzeSubredditData(
  info: SubredditInfo,
  posts: SubredditPost[],
  onProgress: (progress: AnalysisProgress) => void,
  onBasicAnalysisReady?: (result: AnalysisResult) => void
): Promise<AnalysisResult> {
  let basicResult: AnalysisResult | null = null;
  let aiAnalysisStarted = false;

  try {
    // Phase 1: Immediate Basic Analysis
    onProgress({ status: 'Calculating basic metrics...', progress: 20, indeterminate: false });

    // Handle case of no posts
    if (!posts.length) {
      basicResult = {
        info: {
          ...info,
          rules: info.rules.map(rule => ({
            ...rule,
            marketingImpact: analyzeRuleMarketingImpact(rule)
          }))
        },
        posts: [],
        analysis: {
          marketingFriendliness: {
            score: 50,
            reasons: ['New or inactive subreddit - not enough data for detailed analysis'],
            recommendations: ['Start by creating high-quality content to build engagement']
          },
          postingLimits: {
            frequency: 0,
            bestTimeToPost: ['No posting pattern established yet'],
            contentRestrictions: info.rules.map(rule => rule.description)
          },
          contentStrategy: {
            recommendedTypes: ['text', 'image', 'link'],
            topics: [],
            style: 'Focus on building community engagement',
            dos: [
              'Create initial content to set the tone',
              'Engage with any early subscribers',
              'Cross-promote in related subreddits'
            ],
            donts: [
              'Avoid spamming to grow quickly',
              'Don\'t post low-quality content'
            ]
          },
          titleTemplates: {
            patterns: [],
            examples: [],
            effectiveness: 0
          },
          strategicAnalysis: {
            strengths: [`${formatNumber(info.subscribers)} subscribers base`],
            weaknesses: ['Limited posting history'],
            opportunities: ['Fresh start to build community'],
            risks: ['May need time to gain traction']
          },
          gamePlan: {
            immediate: [
              'Create welcome/introduction post',
              'Set up subreddit rules and guidelines',
              'Design subreddit appearance'
            ],
            shortTerm: [
              'Post regular content to build activity',
              'Engage with early subscribers',
              'Cross-promote appropriately'
            ],
            longTerm: [
              'Build moderator team',
              'Develop content calendar',
              'Create community events'
            ]
          }
        }
      };

      if (onBasicAnalysisReady) {
        onBasicAnalysisReady(basicResult);
      }
      
      onProgress({ status: 'Basic analysis complete for new subreddit', progress: 100, indeterminate: false });
      return basicResult;
    }

    const scoredPosts = posts.map(post => ({
      ...post,
      engagement_score: (post.score * 0.75 + post.num_comments * 0.25)
    }));

    // Optimize post filtering
    const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let recentPosts = scoredPosts.filter(post => post.created_utc * 1000 > oneMonthAgo);
    if (recentPosts.length < 50) {
      recentPosts = scoredPosts;
    }
    const topPosts = recentPosts
      .sort((a, b) => b.engagement_score - a.engagement_score)
      .slice(0, 500);
    const basicAnalysisPosts = topPosts.slice(0, 100);

    onProgress({ status: 'Processing engagement metrics...', progress: 35, indeterminate: false });

    const input = prepareAnalysisInput(info, basicAnalysisPosts);
    let engagement = calculateEngagementMetrics(topPosts) || {
      avg_comments: 0,
      avg_score: 0,
      peak_hours: [9, 12, 15, 18],
      interaction_rate: 0,
      posts_per_hour: new Array(24).fill(0)
    };

    onProgress({ status: 'Generating basic insights...', progress: 45, indeterminate: false });

    // Immediately calculate and return basic metrics
    basicResult = {
      info: {
        ...info,
        rules: info.rules.map(rule => ({
          ...rule,
          marketingImpact: analyzeRuleMarketingImpact(rule)
        }))
      },
      posts: topPosts.map(post => ({
        title: post.title,
        score: post.score,
        num_comments: post.num_comments,
        created_utc: post.created_utc
      })),
      analysis: {
        marketingFriendliness: {
          score: calculateMarketingScore(input),
          reasons: [
            `Community size: ${formatNumber(info.subscribers)} members`,
            `Activity level: ${formatNumber(info.active_users)} active users`,
            `Engagement rate: ${Math.round(engagement.interaction_rate)} interactions per post`
          ],
          recommendations: [
            'Follow posting guidelines and rules',
            'Match community engagement patterns',
            'Maintain consistent posting schedule'
          ]
        },
        postingLimits: {
          frequency: input.posts_per_day,
          bestTimeToPost: formatBestPostingTimes(engagement.peak_hours),
          contentRestrictions: info.rules
            .filter(rule => analyzeRuleMarketingImpact(rule) !== 'low')
            .map(rule => rule.description)
        },
        contentStrategy: {
          recommendedTypes: getRecommendedContentTypes(topPosts),
          topics: extractCommonTopics(topPosts),
          style: 'Match successful post formats',
          dos: [
            `Post during peak hours: ${formatBestPostingTimes(engagement.peak_hours)[0]}`,
            `Target ${Math.round(engagement.avg_comments)} or more comments per post`,
            'Follow community posting patterns'
          ],
          donts: [
            ...info.rules
              .filter(rule => analyzeRuleMarketingImpact(rule) === 'high')
              .map(rule => rule.title),
            'Avoid low-effort content',
            'Respect posting frequency limits'
          ]
        },
        titleTemplates: {
          patterns: extractTitlePatterns(topPosts),
          examples: topPosts
            .slice(0, 3)
            .map(post => post.title)
            .filter(title => title.length > 10), // Filter out very short titles
          effectiveness: calculateTitleEffectiveness(topPosts)
        },
        strategicAnalysis: {
          strengths: [
            `Active community: ${formatNumber(info.active_users)} online users`,
            `Regular activity: ${Math.round(input.posts_per_day)} posts per day`,
            'Established posting patterns'
          ],
          weaknesses: [
            'Competition for visibility',
            'Need to maintain engagement',
            'Content quality standards'
          ],
          opportunities: [
            'Peak posting time optimization',
            'Content type diversification',
            'Community engagement potential'
          ],
          risks: [
            'Rule violation penalties',
            'Engagement fluctuations',
            'Content saturation'
          ]
        },
        gamePlan: {
          immediate: [
            'Study top performing content',
            'Plan content calendar',
            'Prepare posting templates'
          ],
          shortTerm: [
            'Build posting consistency',
            'Track engagement metrics',
            'Refine content strategy'
          ],
          longTerm: [
            'Establish community presence',
            'Optimize posting schedule',
            'Scale successful formats'
          ]
        }
      }
    };

    // Immediately notify with basic analysis
    if (onBasicAnalysisReady) {
      onBasicAnalysisReady(basicResult);
    }

    onProgress({ status: 'Basic analysis complete, starting AI analysis...', progress: 50, indeterminate: false });

    // Phase 2: Detailed AI Analysis
    aiAnalysisStarted = true;
    
    // Run AI analysis with retries and timeout
    const aiAnalysis = await (async () => {
      const MAX_RETRIES = 2;
      const RETRY_DELAY = 2000;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          onProgress({ 
            status: attempt > 0 ? `Retrying AI analysis (attempt ${attempt + 1})...` : 'Running AI analysis...', 
            progress: 55 + (attempt * 5), 
            indeterminate: false 
          });

          return await analyzeSubreddit(input);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempt)));
            continue;
          }
        }
      }

      throw lastError || new Error('AI analysis failed after retries');
    })();

    onProgress({ status: 'AI analysis complete, finalizing recommendations...', progress: 80, indeterminate: false });

    // Merge AI analysis details into the basic result
    // Process title templates to ensure consistent formatting
    let finalTitleTemplates;
    
    if (aiAnalysis.titleTemplates && 
        aiAnalysis.titleTemplates.patterns && 
        aiAnalysis.titleTemplates.patterns.length > 0) {
      
      // Use AI-generated templates but ensure proper formatting
      const aiPatterns = aiAnalysis.titleTemplates.patterns;
      const firstPattern = aiPatterns[0];
      
      // Make sure pattern follows "Format: Example" structure
      const formattedPattern = firstPattern.includes("format:") || firstPattern.includes("Format:") 
        ? firstPattern 
        : `Title format: "${firstPattern}"`;
      
      finalTitleTemplates = {
        patterns: [formattedPattern],
        examples: aiAnalysis.titleTemplates.examples || basicResult.analysis.titleTemplates.examples,
        effectiveness: aiAnalysis.titleTemplates.effectiveness || basicResult.analysis.titleTemplates.effectiveness
      };
    } else {
      // Fall back to the basic analysis title templates
      finalTitleTemplates = basicResult.analysis.titleTemplates;
    }
    
    const finalResult: AnalysisResult = {
      ...basicResult,
      analysis: {
        ...basicResult.analysis,
        marketingFriendliness: {
          score: Math.round(aiAnalysis.marketingFriendliness.score),
          reasons: aiAnalysis.marketingFriendliness.reasons,
          recommendations: aiAnalysis.marketingFriendliness.recommendations
        },
        postingLimits: {
          ...basicResult.analysis.postingLimits,
          contentRestrictions: aiAnalysis.postingLimits.contentRestrictions
        },
        contentStrategy: {
          ...basicResult.analysis.contentStrategy,
          topics: aiAnalysis.contentStrategy.topics,
          style: aiAnalysis.contentStrategy.style,
          dos: aiAnalysis.contentStrategy.dos,
          donts: aiAnalysis.contentStrategy.donts
        },
        titleTemplates: finalTitleTemplates,
        strategicAnalysis: aiAnalysis.strategicAnalysis,
        gamePlan: aiAnalysis.gamePlan
      }
    };

    onProgress({ status: 'Analysis complete!', progress: 100, indeterminate: false });
    return finalResult;

  } catch (error) {
    console.error('Analysis error:', error);

    // If we have basic results but AI analysis failed, return basic results with error status
    if (basicResult && aiAnalysisStarted) {
      onProgress({ 
        status: 'Basic analysis complete, but detailed AI analysis failed. Using basic insights only.', 
        progress: 100, 
        indeterminate: false 
      });
      return {
        ...basicResult,
        analysis: {
          ...basicResult.analysis,
          marketingFriendliness: {
            ...basicResult.analysis.marketingFriendliness,
            recommendations: [
              ...basicResult.analysis.marketingFriendliness.recommendations,
              'Note: Detailed AI analysis failed. These are preliminary recommendations only.'
            ]
          }
        }
      };
    }

    // Otherwise, propagate the error
    if (error instanceof AIAnalysisError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new Error(error.message || 'Failed to analyze subreddit data');
    }
    throw new Error('Failed to analyze subreddit data');
  }
}

// Helper function to format numbers (used in the analysis)
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}