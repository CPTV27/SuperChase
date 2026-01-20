/**
 * Twitter/X.com Publish Spoke
 *
 * Write operations using OAuth 1.0a authentication.
 * Used for posting tweets, threads, and scheduling content.
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

// OAuth 1.0a credentials
const API_KEY = process.env.TWITTER_API_KEY;
const API_SECRET = process.env.TWITTER_API_SECRET;
const ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN;
const ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET;

const BASE_URL = 'https://api.twitter.com/2';

/**
 * Check if Twitter publish is configured
 */
export function isConfigured() {
  return !!API_KEY && API_KEY !== 'NEEDS_VALUE' &&
         !!API_SECRET && API_SECRET !== 'NEEDS_VALUE' &&
         !!ACCESS_TOKEN && ACCESS_TOKEN !== 'NEEDS_VALUE' &&
         !!ACCESS_TOKEN_SECRET && ACCESS_TOKEN_SECRET !== 'NEEDS_VALUE';
}

/**
 * Generate OAuth 1.0a signature
 */
function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params).sort().map(key => 
    `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
  ).join('&');

  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  return signature;
}

/**
 * Generate OAuth 1.0a Authorization header
 */
function generateOAuthHeader(method, url, extraParams = {}) {
  const oauthParams = {
    oauth_consumer_key: API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN,
    oauth_version: '1.0'
  };

  const allParams = { ...oauthParams, ...extraParams };

  const signature = generateOAuthSignature(
    method,
    url,
    allParams,
    API_SECRET,
    ACCESS_TOKEN_SECRET
  );

  oauthParams.oauth_signature = signature;

  const headerString = Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  return `OAuth ${headerString}`;
}

/**
 * Post a single tweet
 */
export async function postTweet(text, options = {}) {
  if (!isConfigured()) {
    return {
      success: false,
      error: 'Twitter publish credentials not configured. Set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET in .env'
    };
  }

  const url = `${BASE_URL}/tweets`;
  const body = { text };

  if (options.reply_to_id) {
    body.reply = { in_reply_to_tweet_id: options.reply_to_id };
  }

  if (options.quote_tweet_id) {
    body.quote_tweet_id = options.quote_tweet_id;
  }

  try {
    const authHeader = generateOAuthHeader('POST', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Twitter Publish] Error:', result);
      return {
        success: false,
        error: result.detail || result.title || JSON.stringify(result),
        status: response.status
      };
    }

    console.log('[Twitter Publish] Tweet posted:', result.data?.id);

    return {
      success: true,
      tweet: result.data,
      url: `https://twitter.com/i/status/${result.data?.id}`
    };
  } catch (error) {
    console.error('[Twitter Publish] Exception:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Post a thread (multiple tweets in sequence)
 */
export async function postThread(tweets, delayMs = 30000) {
  if (!isConfigured()) {
    return {
      success: false,
      error: 'Twitter publish credentials not configured'
    };
  }

  if (!Array.isArray(tweets) || tweets.length === 0) {
    return {
      success: false,
      error: 'tweets must be a non-empty array'
    };
  }

  console.log(`[Twitter Publish] Posting thread with ${tweets.length} tweets, ${delayMs}ms delay`);

  const results = [];
  let previousId = null;

  for (let i = 0; i < tweets.length; i++) {
    const tweetText = typeof tweets[i] === 'string' ? tweets[i] : tweets[i].text;
    
    const result = await postTweet(tweetText, {
      reply_to_id: previousId
    });

    results.push({
      index: i,
      text: tweetText.substring(0, 50) + (tweetText.length > 50 ? '...' : ''),
      ...result
    });

    if (!result.success) {
      console.error(`[Twitter Publish] Thread failed at tweet ${i + 1}`);
      return {
        success: false,
        error: `Thread failed at tweet ${i + 1}: ${result.error}`,
        results,
        completedCount: i
      };
    }

    previousId = result.tweet?.id;

    if (i < tweets.length - 1 && delayMs > 0) {
      console.log(`[Twitter Publish] Waiting ${delayMs}ms before next tweet...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.log(`[Twitter Publish] Thread complete: ${results.length} tweets posted`);

  return {
    success: true,
    threadUrl: results[0]?.url,
    results,
    count: results.length
  };
}

/**
 * Delete a tweet
 */
export async function deleteTweet(tweetId) {
  if (!isConfigured()) {
    return {
      success: false,
      error: 'Twitter publish credentials not configured'
    };
  }

  const url = `${BASE_URL}/tweets/${tweetId}`;

  try {
    const authHeader = generateOAuthHeader('DELETE', url);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader
      }
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.detail || result.title || JSON.stringify(result),
        status: response.status
      };
    }

    return {
      success: true,
      deleted: result.data?.deleted
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test publish credentials
 */
export async function testConnection() {
  if (!isConfigured()) {
    return {
      success: false,
      configured: false,
      error: 'Twitter publish credentials not set. Need: TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET',
      missing: [
        !API_KEY || API_KEY === 'NEEDS_VALUE' ? 'TWITTER_API_KEY' : null,
        !API_SECRET || API_SECRET === 'NEEDS_VALUE' ? 'TWITTER_API_SECRET' : null,
        !ACCESS_TOKEN || ACCESS_TOKEN === 'NEEDS_VALUE' ? 'TWITTER_ACCESS_TOKEN' : null,
        !ACCESS_TOKEN_SECRET || ACCESS_TOKEN_SECRET === 'NEEDS_VALUE' ? 'TWITTER_ACCESS_TOKEN_SECRET' : null
      ].filter(Boolean)
    };
  }

  const url = 'https://api.twitter.com/2/users/me';
  
  try {
    const authHeader = generateOAuthHeader('GET', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader
      }
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        configured: true,
        error: result.detail || result.title || 'Authentication failed',
        status: response.status
      };
    }

    return {
      success: true,
      configured: true,
      message: 'Twitter publish API connected',
      username: result.data?.username,
      name: result.data?.name,
      id: result.data?.id
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
  postTweet,
  postThread,
  deleteTweet,
  testConnection
};
