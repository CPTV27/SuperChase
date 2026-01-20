#!/usr/bin/env node
/**
 * Twitter/X Spoke - Research & Search
 *
 * Enables searching X.com for trends, mentions, and research.
 * Uses Twitter API v2.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const TWITTER_API_BASE = 'https://api.twitter.com/2';

/**
 * Check if Twitter is configured
 */
export function isConfigured() {
  return !!(TWITTER_BEARER_TOKEN && TWITTER_BEARER_TOKEN !== 'NEEDS_VALUE');
}

/**
 * Search recent tweets
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} - Search results
 */
export async function searchTweets(query, options = {}) {
  if (!isConfigured()) {
    return {
      success: false,
      error: 'Twitter API not configured. Set TWITTER_BEARER_TOKEN in .env',
      tweets: []
    };
  }

  const {
    maxResults = 10,
    sortOrder = 'relevancy' // or 'recency'
  } = options;

  try {
    const params = new URLSearchParams({
      query: query,
      max_results: Math.max(10, Math.min(maxResults, 100)),
      sort_order: sortOrder,
      'tweet.fields': 'created_at,author_id,public_metrics,context_annotations',
      'user.fields': 'name,username,verified',
      expansions: 'author_id'
    });

    const response = await fetch(
      `${TWITTER_API_BASE}/tweets/search/recent?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[Twitter] API error:', error);
      return {
        success: false,
        error: error.detail || error.title || `API error: ${response.status}`,
        tweets: []
      };
    }

    const data = await response.json();

    // Map users for easy lookup
    const users = {};
    if (data.includes?.users) {
      data.includes.users.forEach(u => {
        users[u.id] = u;
      });
    }

    // Format tweets
    const tweets = (data.data || []).map(tweet => {
      const author = users[tweet.author_id] || {};
      return {
        id: tweet.id,
        text: tweet.text,
        author: {
          name: author.name,
          username: author.username,
          verified: author.verified
        },
        createdAt: tweet.created_at,
        metrics: tweet.public_metrics,
        url: `https://x.com/${author.username}/status/${tweet.id}`
      };
    });

    console.log(`[Twitter] Found ${tweets.length} tweets for: "${query}"`);

    return {
      success: true,
      query,
      count: tweets.length,
      tweets
    };

  } catch (error) {
    console.error('[Twitter] Search error:', error.message);
    return {
      success: false,
      error: error.message,
      tweets: []
    };
  }
}

/**
 * Get trending topics for a location
 * @param {string} woeid - Where On Earth ID (1 for worldwide, 23424977 for US)
 * @returns {Promise<Object>} - Trending topics
 */
export async function getTrends(woeid = '1') {
  if (!isConfigured()) {
    return {
      success: false,
      error: 'Twitter API not configured',
      trends: []
    };
  }

  // Note: Trends endpoint requires Twitter API v1.1 or elevated access
  // For v2 Basic, we'll search for popular hashtags instead
  try {
    // Fallback: search for recent popular tweets
    const result = await searchTweets('filter:popular', { maxResults: 20 });

    return {
      success: result.success,
      note: 'Trends require elevated API access. Showing popular tweets instead.',
      data: result.tweets
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      trends: []
    };
  }
}

/**
 * Search for tweets about a specific topic with AI summary
 * @param {string} topic - Topic to research
 * @returns {Promise<Object>} - Research results with summary
 */
export async function researchTopic(topic) {
  const searchResult = await searchTweets(topic, { maxResults: 15, sortOrder: 'relevancy' });

  if (!searchResult.success) {
    return searchResult;
  }

  // Compile research summary
  const tweetTexts = searchResult.tweets.map(t => t.text).join('\n---\n');
  const topAuthors = searchResult.tweets
    .filter(t => t.author?.username)
    .slice(0, 5)
    .map(t => `@${t.author.username}`);

  const engagementTotal = searchResult.tweets.reduce((sum, t) => {
    return sum + (t.metrics?.like_count || 0) + (t.metrics?.retweet_count || 0);
  }, 0);

  return {
    success: true,
    topic,
    summary: {
      tweetCount: searchResult.count,
      totalEngagement: engagementTotal,
      topVoices: topAuthors,
      sampleContent: tweetTexts.substring(0, 1000)
    },
    tweets: searchResult.tweets
  };
}

/**
 * Get user's recent tweets
 * @param {string} username - Twitter username (without @)
 * @returns {Promise<Object>} - User's tweets
 */
export async function getUserTweets(username) {
  if (!isConfigured()) {
    return {
      success: false,
      error: 'Twitter API not configured',
      tweets: []
    };
  }

  try {
    // First get user ID
    const userResponse = await fetch(
      `${TWITTER_API_BASE}/users/by/username/${username}`,
      {
        headers: {
          'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`
        }
      }
    );

    if (!userResponse.ok) {
      return {
        success: false,
        error: `User @${username} not found`,
        tweets: []
      };
    }

    const userData = await userResponse.json();
    const userId = userData.data?.id;

    if (!userId) {
      return {
        success: false,
        error: `Could not get ID for @${username}`,
        tweets: []
      };
    }

    // Get user's tweets
    const params = new URLSearchParams({
      max_results: 10,
      'tweet.fields': 'created_at,public_metrics'
    });

    const tweetsResponse = await fetch(
      `${TWITTER_API_BASE}/users/${userId}/tweets?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`
        }
      }
    );

    if (!tweetsResponse.ok) {
      const error = await tweetsResponse.json();
      return {
        success: false,
        error: error.detail || 'Failed to fetch tweets',
        tweets: []
      };
    }

    const tweetsData = await tweetsResponse.json();

    const tweets = (tweetsData.data || []).map(tweet => ({
      id: tweet.id,
      text: tweet.text,
      createdAt: tweet.created_at,
      metrics: tweet.public_metrics,
      url: `https://x.com/${username}/status/${tweet.id}`
    }));

    return {
      success: true,
      username,
      count: tweets.length,
      tweets
    };

  } catch (error) {
    console.error('[Twitter] User tweets error:', error.message);
    return {
      success: false,
      error: error.message,
      tweets: []
    };
  }
}

/**
 * Test Twitter API connection
 */
export async function testConnection() {
  if (!isConfigured()) {
    return { success: false, error: 'TWITTER_BEARER_TOKEN not set' };
  }

  try {
    // Test with a simple search
    const result = await searchTweets('test', { maxResults: 10 });

    if (result.success) {
      return {
        success: true,
        message: 'Twitter API connected',
        sampleTweet: result.tweets[0]?.text?.substring(0, 50)
      };
    }

    return { success: false, error: result.error };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

export default {
  isConfigured,
  searchTweets,
  getTrends,
  researchTopic,
  getUserTweets,
  testConnection
};
