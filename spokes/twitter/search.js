/**
 * Twitter/X.com Search Spoke
 *
 * Read-only Twitter API operations using Bearer Token authentication.
 * Used for research, trend monitoring, and user discovery.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const BASE_URL = 'https://api.twitter.com/2';

/**
 * Check if Twitter search is configured
 */
export function isConfigured() {
  return !!BEARER_TOKEN && BEARER_TOKEN !== 'NEEDS_VALUE';
}

/**
 * Make authenticated request to Twitter API
 */
async function twitterRequest(endpoint, params = {}) {
  if (!isConfigured()) {
    throw new Error('Twitter Bearer Token not configured');
  }

  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${BEARER_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`Twitter API error: ${response.status} - ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Search recent tweets
 */
export async function searchTweets(query, options = {}) {
  const {
    maxResults = 10,
    sortOrder = 'relevancy'
  } = options;

  try {
    const result = await twitterRequest('/tweets/search/recent', {
      query,
      max_results: Math.min(maxResults, 100),
      sort_order: sortOrder,
      'tweet.fields': 'created_at,public_metrics,author_id,conversation_id',
      expansions: 'author_id',
      'user.fields': 'name,username,verified,public_metrics'
    });

    const users = new Map();
    if (result.includes?.users) {
      result.includes.users.forEach(u => users.set(u.id, u));
    }

    const tweets = (result.data || []).map(tweet => ({
      id: tweet.id,
      text: tweet.text,
      createdAt: tweet.created_at,
      metrics: tweet.public_metrics,
      author: users.get(tweet.author_id) || { id: tweet.author_id }
    }));

    return {
      success: true,
      query,
      tweets,
      count: tweets.length,
      meta: result.meta
    };
  } catch (error) {
    return {
      success: false,
      query,
      error: error.message,
      tweets: []
    };
  }
}

/**
 * Get user's recent tweets
 */
export async function getUserTweets(username, options = {}) {
  const { maxResults = 10 } = options;

  try {
    // First get user ID
    const userResult = await twitterRequest(`/users/by/username/${username}`, {
      'user.fields': 'id,name,username,verified,public_metrics,description'
    });

    if (!userResult.data) {
      return { success: false, error: `User @${username} not found` };
    }

    const user = userResult.data;

    // Then get their tweets
    const tweetsResult = await twitterRequest(`/users/${user.id}/tweets`, {
      max_results: Math.min(maxResults, 100),
      'tweet.fields': 'created_at,public_metrics',
      exclude: 'retweets,replies'
    });

    return {
      success: true,
      user,
      tweets: (tweetsResult.data || []).map(t => ({
        id: t.id,
        text: t.text,
        createdAt: t.created_at,
        metrics: t.public_metrics
      })),
      count: tweetsResult.data?.length || 0
    };
  } catch (error) {
    return {
      success: false,
      username,
      error: error.message
    };
  }
}

/**
 * Research a topic by searching and analyzing sentiment
 */
export async function researchTopic(topic, options = {}) {
  const { maxResults = 25 } = options;

  try {
    const searchResult = await searchTweets(topic, { maxResults });

    if (!searchResult.success) {
      return searchResult;
    }

    const tweets = searchResult.tweets;
    const totalEngagement = tweets.reduce((sum, t) => {
      const m = t.metrics || {};
      return sum + (m.like_count || 0) + (m.retweet_count || 0) * 2 + (m.reply_count || 0);
    }, 0);

    const avgEngagement = tweets.length > 0 ? totalEngagement / tweets.length : 0;

    const topTweets = [...tweets]
      .sort((a, b) => {
        const aEng = (a.metrics?.like_count || 0) + (a.metrics?.retweet_count || 0);
        const bEng = (b.metrics?.like_count || 0) + (b.metrics?.retweet_count || 0);
        return bEng - aEng;
      })
      .slice(0, 5);

    return {
      success: true,
      topic,
      analysis: {
        tweetCount: tweets.length,
        avgEngagement: Math.round(avgEngagement),
        topTweets,
        uniqueAuthors: new Set(tweets.map(t => t.author?.username)).size
      },
      tweets
    };
  } catch (error) {
    return {
      success: false,
      topic,
      error: error.message
    };
  }
}

/**
 * Get trending topics (placeholder - requires different API access)
 */
export async function getTrends() {
  return {
    success: false,
    error: 'Trends API requires elevated access. Use searchTweets with trending hashtags instead.',
    suggestion: 'Try searching for specific hashtags or topics of interest.'
  };
}

/**
 * Test API connection
 */
export async function testConnection() {
  if (!isConfigured()) {
    return {
      success: false,
      configured: false,
      error: 'TWITTER_BEARER_TOKEN not set in environment'
    };
  }

  try {
    const result = await twitterRequest('/tweets/search/recent', {
      query: 'hello',
      max_results: 1
    });

    return {
      success: true,
      configured: true,
      message: 'Twitter search API connected',
      hasResults: !!result.data?.length
    };
  } catch (error) {
    return {
      success: false,
      configured: true,
      error: error.message
    };
  }
}

export default {
  isConfigured,
  searchTweets,
  getUserTweets,
  researchTopic,
  getTrends,
  testConnection
};
