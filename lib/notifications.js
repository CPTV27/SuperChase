/**
 * Notification Service
 *
 * Sends notifications via email (Resend) and Slack for HITL workflows.
 * Used to notify reviewers when content needs approval.
 *
 * @module lib/notifications
 */

import { createLogger } from './logger.js';
import { ExternalServiceError, withRetry } from './errors.js';

const logger = createLogger({ module: 'notifications' });

// ============================================
// Configuration
// ============================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_API_URL = 'https://api.resend.com/emails';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL || '#superchase-notifications';

const FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL || 'notifications@superchase.app';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

// ============================================
// Email Notifications (Resend)
// ============================================

/**
 * Check if email notifications are configured
 */
export function isEmailConfigured() {
  return !!RESEND_API_KEY && RESEND_API_KEY !== 'NEEDS_VALUE';
}

/**
 * Send an email via Resend
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plain text body
 * @returns {Promise<{success: boolean, id?: string}>}
 */
export async function sendEmail(options) {
  if (!isEmailConfigured()) {
    logger.warn('Email not configured, skipping notification', { to: options.to });
    return { success: false, reason: 'not_configured' };
  }

  const { to, subject, html, text } = options;

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new ExternalServiceError('Resend', `Email failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    logger.info('Email sent', { to, subject, id: data.id });

    return { success: true, id: data.id };

  } catch (error) {
    logger.error('Email failed', { to, subject, error: error.message });
    return { success: false, error: error.message };
  }
}

// ============================================
// Slack Notifications
// ============================================

/**
 * Check if Slack notifications are configured
 */
export function isSlackConfigured() {
  return !!(SLACK_WEBHOOK_URL || SLACK_BOT_TOKEN);
}

/**
 * Send a Slack message
 * @param {Object} options
 * @param {string} options.text - Message text
 * @param {string} [options.channel] - Channel override
 * @param {Array} [options.blocks] - Slack blocks for rich formatting
 * @param {Array} [options.attachments] - Slack attachments
 * @returns {Promise<{success: boolean}>}
 */
export async function sendSlack(options) {
  if (!isSlackConfigured()) {
    logger.warn('Slack not configured, skipping notification');
    return { success: false, reason: 'not_configured' };
  }

  const { text, channel = SLACK_CHANNEL, blocks, attachments } = options;

  try {
    // Use webhook if available (simpler)
    if (SLACK_WEBHOOK_URL) {
      const response = await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, blocks, attachments })
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }

      logger.info('Slack message sent via webhook');
      return { success: true };
    }

    // Use Bot API if token available
    if (SLACK_BOT_TOKEN) {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SLACK_BOT_TOKEN}`
        },
        body: JSON.stringify({
          channel,
          text,
          blocks,
          attachments
        })
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      logger.info('Slack message sent via API', { channel, ts: data.ts });
      return { success: true, ts: data.ts };
    }

  } catch (error) {
    logger.error('Slack message failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

// ============================================
// HITL Notification Templates
// ============================================

/**
 * Send content review notification
 * @param {Object} content - Content object
 * @param {string} reviewUrl - URL to review the content
 * @param {Object} [options] - Additional options
 */
export async function notifyContentReview(content, reviewUrl, options = {}) {
  const { stage = 'AGENCY', reviewer } = options;

  const subject = `[Review Required] ${content.title}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px;">
      <h2 style="color: #3b82f6;">Content Review Required</h2>
      <p>New content is ready for ${stage.toLowerCase()} review:</p>

      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0;">${content.title}</h3>
        <p style="color: #6b7280; margin: 0;">Type: ${content.type}</p>
        ${content.businessUnit ? `<p style="color: #6b7280; margin: 4px 0 0 0;">Business: ${content.businessUnit}</p>` : ''}
      </div>

      <div style="margin: 24px 0;">
        <a href="${reviewUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Review Content
        </a>
      </div>

      <p style="color: #9ca3af; font-size: 12px;">
        This is an automated notification from SuperChase OS.
      </p>
    </div>
  `;

  const slackBlocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: 'Content Review Required', emoji: true }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${content.title}*\nType: ${content.type}${content.businessUnit ? ` | Business: ${content.businessUnit}` : ''}`
      }
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Review Content', emoji: true },
          url: reviewUrl,
          style: 'primary'
        }
      ]
    }
  ];

  // Send both email and Slack
  const results = await Promise.allSettled([
    reviewer ? sendEmail({ to: reviewer, subject, html }) : Promise.resolve({ success: false, reason: 'no_reviewer' }),
    sendSlack({ text: `Content review required: ${content.title}`, blocks: slackBlocks })
  ]);

  return {
    email: results[0].status === 'fulfilled' ? results[0].value : { success: false },
    slack: results[1].status === 'fulfilled' ? results[1].value : { success: false }
  };
}

/**
 * Send content approved notification
 */
export async function notifyContentApproved(content, approver) {
  const subject = `[Approved] ${content.title}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px;">
      <h2 style="color: #10b981;">Content Approved</h2>
      <p>The following content has been approved${approver ? ` by ${approver}` : ''}:</p>

      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0;">${content.title}</h3>
        <p style="color: #6b7280; margin: 0;">Status: Ready to Publish</p>
      </div>
    </div>
  `;

  return sendSlack({
    text: `Content approved: ${content.title}`,
    attachments: [{
      color: '#10b981',
      text: `*${content.title}* has been approved${approver ? ` by ${approver}` : ''}.`
    }]
  });
}

/**
 * Send content rejected notification
 */
export async function notifyContentRejected(content, reviewer, reason) {
  const subject = `[Rejected] ${content.title}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px;">
      <h2 style="color: #ef4444;">Content Rejected</h2>
      <p>The following content has been rejected${reviewer ? ` by ${reviewer}` : ''}:</p>

      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0;">${content.title}</h3>
        ${reason ? `<p style="color: #ef4444; margin: 8px 0 0 0;">Reason: ${reason}</p>` : ''}
      </div>
    </div>
  `;

  return sendSlack({
    text: `Content rejected: ${content.title}`,
    attachments: [{
      color: '#ef4444',
      text: `*${content.title}* has been rejected.\n${reason ? `Reason: ${reason}` : ''}`
    }]
  });
}

/**
 * Send emergency alert (kill switch activated)
 */
export async function notifyEmergencyAlert(action, user, reason) {
  const isActivation = action === 'activated';
  const color = isActivation ? '#ef4444' : '#10b981';
  const emoji = isActivation ? '🚨' : '✅';

  const message = `${emoji} *Automation ${action.toUpperCase()}*${user ? ` by ${user}` : ''}${reason ? `\nReason: ${reason}` : ''}`;

  // Always try to notify for emergencies
  const results = await Promise.allSettled([
    ADMIN_EMAIL ? sendEmail({
      to: ADMIN_EMAIL,
      subject: `[EMERGENCY] Automation ${action}`,
      html: `<h2 style="color: ${color};">Automation ${action}</h2><p>${reason || 'No reason provided'}</p>`
    }) : Promise.resolve({ success: false }),
    sendSlack({
      text: message,
      attachments: [{ color, text: message }]
    })
  ]);

  return {
    email: results[0].status === 'fulfilled' ? results[0].value : { success: false },
    slack: results[1].status === 'fulfilled' ? results[1].value : { success: false }
  };
}

/**
 * Send cost alert
 */
export async function notifyCostAlert(service, cost, threshold) {
  const message = `⚠️ *Cost Alert*\n${service} spending has reached $${cost.toFixed(2)} (threshold: $${threshold})`;

  return sendSlack({
    text: message,
    attachments: [{
      color: '#f59e0b',
      text: message
    }]
  });
}

// ============================================
// Notification Status
// ============================================

/**
 * Get notification service status
 */
export function getNotificationStatus() {
  return {
    email: {
      configured: isEmailConfigured(),
      provider: 'Resend',
      from: FROM_EMAIL
    },
    slack: {
      configured: isSlackConfigured(),
      method: SLACK_WEBHOOK_URL ? 'webhook' : SLACK_BOT_TOKEN ? 'bot_api' : 'none',
      channel: SLACK_CHANNEL
    }
  };
}

export default {
  isEmailConfigured,
  isSlackConfigured,
  sendEmail,
  sendSlack,
  notifyContentReview,
  notifyContentApproved,
  notifyContentRejected,
  notifyEmergencyAlert,
  notifyCostAlert,
  getNotificationStatus
};
