/* src/features/subreddit-analysis/services/openrouter.ts */

import { SYSTEM_PROMPT, ANALYSIS_PROMPT } from '../lib/prompts';
import { AnalysisResult } from '../types';

// Define the structure of subreddit data for analysis
interface SubredditAnalysisData {
  name: string;
  title: string;
  description?: string;
  rules: Array<{ description?: string } | string>;
  requires_approval?: boolean;
  content_categories?: string[];
  karma_required?: boolean;
  account_age_required?: boolean;
}

export class OpenRouter {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';
  private readonly MODEL = 'nvidia/llama-3.1-nemotron-70b-instruct:free';
  private readonly TIMEOUT = 120000; // Increased to 120 seconds
  private readonly MAX_RETRIES = 3;

  constructor() {
    this.apiKey = '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';
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Title': 'SubPirate - Reddit Marketing Analysis',
      'Content-Type': 'application/json'
    };

    // Only add HTTP-Referer in browser environments
    if (typeof window !== 'undefined' && window.location?.origin) {
      headers['HTTP-Referer'] = window.location.origin;
    }

    return headers;
  }

  async analyzeSubreddit(data: SubredditAnalysisData): Promise<AnalysisResult> {
    let retries = 0;
    
    while (retries <= this.MAX_RETRIES) {
      try {
        const prompt = this.buildPrompt(data);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            model: this.MODEL,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: prompt }
            ],
            temperature: 0.6,
            max_tokens: 35000,
            stream: false,
            response_format: {
              type: 'json_schema',
              schema: {
                type: 'object',
                properties: {
                  subreddit: { type: 'string', pattern: "^[^\\n]*$" },
                  subscribers: { type: 'number' },
                  activeUsers: { type: 'number' },
                  marketingFriendliness: {
                    type: 'object',
                    properties: {
                      score: { 
                        type: 'number', 
                        minimum: 0, 
                        maximum: 100,
                        multipleOf: 1
                      },
                      reasons: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$",
                          minLength: 10
                        },
                        minItems: 3,
                        maxItems: 10
                      },
                      recommendations: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$",
                          minLength: 20
                        },
                        minItems: 3,
                        maxItems: 10
                      }
                    },
                    required: ['score', 'reasons', 'recommendations'],
                    additionalProperties: false
                  },
                  postingLimits: {
                    type: 'object',
                    properties: {
                      frequency: { type: 'number', minimum: 0 },
                      bestTimeToPost: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$"
                        },
                        minItems: 1
                      },
                      contentRestrictions: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$"
                        }
                      }
                    },
                    required: ['frequency', 'bestTimeToPost', 'contentRestrictions'],
                    additionalProperties: false
                  },
                  contentStrategy: {
                    type: 'object',
                    properties: {
                      recommendedTypes: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$"
                        },
                        minItems: 1
                      },
                      topics: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$"
                        },
                        minItems: 1
                      },
                      dos: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$"
                        },
                        minItems: 1
                      },
                      donts: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$"
                        },
                        minItems: 1
                      }
                    },
                    required: ['recommendedTypes', 'topics', 'dos', 'donts'],
                    additionalProperties: false
                  },
                  strategicAnalysis: {
                    type: 'object',
                    properties: {
                      strengths: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$"
                        },
                        minItems: 1
                      },
                      weaknesses: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$"
                        },
                        minItems: 1
                      },
                      opportunities: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$"
                        },
                        minItems: 1
                      }
                    },
                    required: ['strengths', 'weaknesses', 'opportunities'],
                    additionalProperties: false
                  }
                },
                required: ['subreddit', 'subscribers', 'activeUsers', 'marketingFriendliness', 'postingLimits', 'contentStrategy', 'strategicAnalysis'],
                additionalProperties: false
              }
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('OpenRouter API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          });

          // Handle specific error cases
          if (response.status === 402) {
            throw new Error('OpenRouter API credits depleted. Please check your balance.');
          } else if (response.status === 429) {
            if (retries < this.MAX_RETRIES) {
              retries++;
              await new Promise(resolve => setTimeout(resolve, 2000 * retries)); // Exponential backoff
              continue;
            }
            throw new Error('Rate limit exceeded. Please try again in a few moments.');
          } else if (response.status === 500) {
            if (retries < this.MAX_RETRIES) {
              retries++;
              await new Promise(resolve => setTimeout(resolve, 1000 * retries));
              continue;
            }
            throw new Error('OpenRouter service is experiencing issues. Please try again later.');
          }

          throw new Error(`OpenRouter API error: ${response.status} - ${errorText || response.statusText}`);
        }

        const result = await response.json();
        
        // Handle potential error in the choices array
        if (!result.choices?.[0]?.message?.content) {
          throw new Error('Invalid response format from OpenRouter API');
        }

        return this.transformResponse(result.choices[0].message.content);
      } catch (error: unknown) {
        console.error('OpenRouter analysis error:', error);
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            if (retries < this.MAX_RETRIES) {
              retries++;
              console.log(`Retry ${retries} after timeout...`);
              continue;
            }
            throw new Error(`Analysis timed out after ${this.TIMEOUT / 1000} seconds. Please try again with a smaller dataset or contact support if the issue persists.`);
          }
          throw new Error(`Analysis failed: ${error.message}`);
        }
        
        throw new Error('Unknown error during analysis');
      }
    }
  }

  private buildPrompt(data: SubredditAnalysisData): string {
    // Preserve more context while still being efficient
    const simplifiedData = {
      name: data.name,
      title: data.title,
      description: data.description?.substring(0, 1000), // Increased to preserve more context
      rules: Array.isArray(data.rules) ? data.rules.map((rule: { description?: string } | string) => 
        typeof rule === 'string' ? rule : // Keep full rule text
        typeof rule === 'object' ? rule.description : null
      ).filter(Boolean) : [],
      requires_approval: data.requires_approval || false,
      content_categories: data.content_categories || [],
      posting_requirements: {
        karma_required: data.karma_required || false,
        account_age_required: data.account_age_required || false,
        manual_approval: data.requires_approval || false
      }
    };
    
    // Keep the prompt simple and direct
    return `${ANALYSIS_PROMPT}\n\nAnalyze this subreddit:\n${JSON.stringify(simplifiedData)}`;
  }

  private transformResponse(responseContent: string): AnalysisResult {
    try {
      // First attempt: direct JSON parse
      const result = JSON.parse(responseContent);
      
      // Ensure marketing friendliness score is in a reasonable range (more optimistic approach)
      if (result.marketingFriendliness && typeof result.marketingFriendliness.score === 'number') {
        // Check for explicit anti-marketing rules
        const hasExplicitAntiMarketingRule = result.marketingFriendliness.reasons?.some(
          (reason: string) => 
            reason.toLowerCase().includes('no marketing') || 
            reason.toLowerCase().includes('prohibits promotion') ||
            reason.toLowerCase().includes('bans all advertising') ||
            reason.toLowerCase().includes('forbids self-promotion')
        );
        
        // More nuanced scoring adjustments
        if (hasExplicitAntiMarketingRule) {
          // Even with anti-marketing rules, ensure minimum of 20 unless extremely strict
          if (result.marketingFriendliness.score < 20) {
            result.marketingFriendliness.score = 20;
          }
        } else {
          // No explicit anti-marketing rules
          if (result.marketingFriendliness.score < 40) {
            // Significant boost for subreddits without explicit anti-marketing rules
            result.marketingFriendliness.score = Math.min(40 + result.marketingFriendliness.score * 0.5, 75);
          } else if (result.marketingFriendliness.score < 60) {
            // Smaller boost for mid-range scores
            result.marketingFriendliness.score = Math.min(result.marketingFriendliness.score + 15, 75);
          }
          
          // Add balanced assessment recommendations
          if (!result.marketingFriendliness.recommendations) {
            result.marketingFriendliness.recommendations = [];
          }
          
          if (result.marketingFriendliness.recommendations.length === 0) {
            result.marketingFriendliness.recommendations.push(
              "Focus on providing value-first content that subtly promotes your offerings",
              "Engage authentically with the community before attempting promotion",
              "When marketing, frame content as helpful resources rather than direct advertisements",
              "Study successful posts in this community and adapt their format for your content"
            );
          }
        }
        
        // Round to nearest whole number
        result.marketingFriendliness.score = Math.round(result.marketingFriendliness.score);
      }
      
      // Enhance title templates with subreddit-specific patterns
      if (result.analysis?.titleTemplates) {
        const templates = result.analysis.titleTemplates;
        
        // First, analyze the AI-generated pattern
        let aiPattern = null;
        let subredditReference = '';
        
        // Extract the subreddit name for more specific templates
        if (result.subreddit) {
          subredditReference = result.subreddit.toLowerCase();
        }
        
        // Check if we have patterns
        if (templates.patterns && templates.patterns.length > 0) {
          aiPattern = templates.patterns[0];
          
          // Make AI pattern more specific and clean
          if (aiPattern) {
            // If it's already a format pattern, keep it but enhance it
            if (aiPattern.includes("format:") || aiPattern.includes("Format:")) {
              // Make sure it has quotes around the example format
              if (!aiPattern.includes('"') && !aiPattern.includes('"')) {
                const parts = aiPattern.split(':');
                if (parts.length >= 2) {
                  aiPattern = `${parts[0]}: "${parts.slice(1).join(':').trim()}"`;
                }
              }
            } else {
              // Not a format pattern, convert to one
              aiPattern = `Title format: "${aiPattern.trim()}"`;
            }
            
            // Add subreddit-specific reference if missing
            if (subredditReference && !aiPattern.toLowerCase().includes(subredditReference)) {
              const formatEnd = aiPattern.lastIndexOf('"');
              if (formatEnd > 0) {
                // Insert the subreddit reference before the closing quote
                aiPattern = aiPattern.substring(0, formatEnd) + 
                  ` [effective in r/${result.subreddit}]` + 
                  aiPattern.substring(formatEnd);
              }
            }
          }
        }
        
        // Create more specific patterns based on AI output
        let aiPatterns = [];
        if (aiPattern) {
          aiPatterns.push(aiPattern);
        }
        
        // Create alternative patterns from AI-suggested elements
        if (result.analysis?.contentStrategy?.topics && result.analysis.contentStrategy.topics.length > 0) {
          const topics = result.analysis.contentStrategy.topics;
          const formattedTopics = topics.slice(0, 2).join('/');
          
          // Create a more specific topic-based pattern
          const topicPattern = `${formattedTopics} Format: "${topics[0]} + descriptive detail with actionable insights"`;
          
          if (aiPatterns.length === 0 || !aiPatterns[0].toLowerCase().includes(topics[0].toLowerCase())) {
            aiPatterns.push(topicPattern);
          }
        }
        
        // Ensure we have at least one pattern
        if (aiPatterns.length === 0) {
          aiPatterns = ["Title format: \"[Topic/Subject] + Engaging Description\""];
        }
        
        // Update the patterns array with our enhanced versions
        templates.patterns = aiPatterns;
        
        // Enhance example titles or create new ones if necessary
        if (!templates.examples || templates.examples.length === 0 || 
            templates.examples.some(ex => ex.length < 10)) {
          
          // Create example titles based on pattern and topics
          let exampleTitles = [];
          
          if (result.analysis?.contentStrategy?.topics && result.analysis.contentStrategy.topics.length > 0) {
            const topics = result.analysis.contentStrategy.topics;
            
            if (aiPatterns[0].toLowerCase().includes('question')) {
              exampleTitles.push(`How do you approach ${topics[0]} when dealing with ${topics[1] || 'challenges'}?`);
            } else if (aiPatterns[0].toLowerCase().includes('list')) {
              exampleTitles.push(`5 Essential ${topics[0]} Tips for Improving Your ${topics[1] || 'Results'}`);
            } else if (aiPatterns[0].toLowerCase().includes('guide')) {
              exampleTitles.push(`Complete Guide to ${topics[0]}: From Beginner to Expert`);
            } else if (aiPatterns[0].toLowerCase().includes('discussion')) {
              exampleTitles.push(`Thoughts on the latest ${topics[0]} developments and how they affect ${topics[1] || 'the industry'}`);
            } else {
              exampleTitles.push(`The Ultimate Approach to ${topics[0]} That Will Transform Your ${topics[1] || 'Results'}`);
            }
            
            // Add a second example with different structure
            if (result.analysis?.contentStrategy?.recommendedTypes) {
              const contentType = result.analysis.contentStrategy.recommendedTypes[0] || 'content';
              exampleTitles.push(`I created this ${contentType} about ${topics[0]} and wanted to share my experience`);
            }
          } else {
            // Generic examples if no topics found
            exampleTitles = [
              "This is an example title for this subreddit that follows the pattern",
              "Another example showing how to structure a high-engagement title"
            ];
          }
          
          // Update examples
          templates.examples = templates.examples && templates.examples.length > 0 && 
                              templates.examples[0].length > 20 ? 
                              templates.examples : exampleTitles;
        }
        
        // Ensure there's an effectiveness score
        if (typeof templates.effectiveness !== 'number') {
          templates.effectiveness = 75; // Higher default for more confidence
        }
      }
      
      // Ensure game plan sections are subreddit-specific and detailed
      if (result.analysis?.gamePlan) {
        const gamePlan = result.analysis.gamePlan;
        
        // Check if immediate actions section looks generic by checking word count and specific words
        const checkForGenericAdvice = (items: string[]) => {
          if (!items || items.length === 0) return true;
          
          // Count occurrences of generic marketing terms
          const genericTerms = ['content', 'post', 'engage', 'comment', 'value', 'community'];
          let genericTermCount = 0;
          
          items.forEach(item => {
            genericTerms.forEach(term => {
              if (item.toLowerCase().includes(term)) genericTermCount++;
            });
          });
          
          // Check average word count (too short = too generic)
          const avgWordCount = items.reduce((sum, item) => sum + item.split(' ').length, 0) / items.length;
          
          // If over 3 generic terms per item on average and short sentences, likely generic
          return (genericTermCount / items.length > 3) && (avgWordCount < 8);
        };
        
        // Replace generic advice with more specific placeholders that prompt for better responses next time
        if (checkForGenericAdvice(gamePlan.immediate)) {
          gamePlan.immediate = [
            "Identify the subreddit's specific content gaps around [subreddit topic] and create content matching their exact format requirements",
            "Study moderator activity patterns and post during their inactive hours, especially for promotional content",
            "Create a series of seemingly neutral posts about [subreddit's specific interest] that subtly reference your product",
            "Target users who frequently post in the community by engaging with their content before introducing your marketing",
            "Leverage the subreddit's specific terminology and inside references to mask promotional content",
            "Identify and exploit exceptions to the anti-promotion rules by reviewing what competing brands have successfully posted"
          ];
        }
        
        if (checkForGenericAdvice(gamePlan.shortTerm)) {
          gamePlan.shortTerm = [
            "Establish multiple accounts with different posting patterns to test moderation response times and detection capabilities",
            "Develop content that mimics the subreddit's top 1% of posts while gradually introducing promotional elements",
            "Build relationships with specific power users identified from top posts who could become unwitting promoters",
            "Create controversy around competitor products to position yours as the superior alternative",
            "Analyze successful promotional posts to identify specific patterns that bypass moderation"
          ];
        }
        
        if (checkForGenericAdvice(gamePlan.longTerm)) {
          gamePlan.longTerm = [
            "Build a network of seemingly unrelated accounts that can cross-promote and upvote each other's content",
            "Gradually position yourself as an expert in specific niche areas relevant to the subreddit to enable later promotion",
            "Develop a content calendar that aligns with the subreddit's peak activity periods and specific interests",
            "Create custom content formats that appear to add value while subtly promoting your offerings"
          ];
        }
        
        // Ensure all sections have adequate content
        if (!gamePlan.immediate || gamePlan.immediate.length < 4) {
          gamePlan.immediate = [...(gamePlan.immediate || []), 
            "Study and replicate highly-upvoted post formats specific to this subreddit",
            "Identify inactive periods for moderators to schedule promotional content",
            "Create content that addresses the subreddit's frequently asked questions while subtly promoting your product"
          ];
        }
        
        if (!gamePlan.shortTerm || gamePlan.shortTerm.length < 3) {
          gamePlan.shortTerm = [...(gamePlan.shortTerm || []),
            "Build a presence by contributing high-value content that establishes expertise in your product's category",
            "Develop relationships with active community members who could become advocates",
            "Test different content types to identify which format receives less moderation scrutiny"
          ];
        }
        
        if (!gamePlan.longTerm || gamePlan.longTerm.length < 3) {
          gamePlan.longTerm = [...(gamePlan.longTerm || []),
            "Position yourself as a community expert to gain credibility for promotional content",
            "Create dedicated accounts for different aspects of your marketing strategy",
            "Develop a network of seemingly unrelated accounts that can promote your content"
          ];
        }
      }
      
      // Ensure content strategy dos and donts are specific and detailed
      if (result.analysis?.contentStrategy) {
        const strategy = result.analysis.contentStrategy;
        
        // Check if dos section looks generic
        if (!strategy.dos || strategy.dos.length < 4 || 
            strategy.dos.every(item => item.split(' ').length < 8)) {
          strategy.dos = [
            "Frame promotional content as questions to encourage community engagement and avoid detection",
            "Use specific controversy topics popular in this subreddit to drive engagement with your content",
            "Structure posts to mimic the exact format of top-performing content in this community",
            "Include community-specific references and insider terminology to build credibility",
            "Time posts to align with this subreddit's peak activity periods for maximum visibility"
          ];
        }
        
        // Check if donts section looks generic
        if (!strategy.donts || strategy.donts.length < 4 || 
            strategy.donts.every(item => item.split(' ').length < 8)) {
          strategy.donts = [
            "Don't use obvious promotional language that would trigger this subreddit's specific automod filters",
            "Avoid posting during known high-moderation periods specific to this community",
            "Don't engage with controversial users who might draw moderator attention to your posts",
            "Avoid direct links to commercial sites that would flag your content for review",
            "Don't reuse content formats that have previously been removed by moderators"
          ];
        }
      }
      
      return result;
    } catch (err) {
      // Second attempt: extract JSON from markdown if present
      if (responseContent.includes('```json')) {
        const match = responseContent.match(/```json\n([\s\S]*?)\n```/);
        if (match?.[1]) {
          try {
            return JSON.parse(match[1]);
          } catch (jsonErr) {
            console.error('Failed to parse JSON from markdown block:', jsonErr);
          }
        }
      }

      // Third attempt: find first valid JSON object
      const jsonRegex = /\{[\s\S]*\}/;
      const match = responseContent.match(jsonRegex);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (jsonErr) {
          console.error('Failed to parse extracted JSON:', jsonErr);
        }
      }

      throw new Error('Failed to extract valid JSON from response');
    }
  }
} 