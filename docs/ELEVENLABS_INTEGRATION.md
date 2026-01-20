# ElevenLabs Agent Integration Guide

## Overview

This guide connects George (your ElevenLabs Conversational AI Agent) to the SuperChase Business Context API, enabling real-time lookups during voice conversations.

**Agent ID:** `agent_6601kfc80k2qftha80gdxca6ym0m`

---

## Step 1: Start the API Server

Before configuring ElevenLabs, start the SuperChase API server:

```bash
cd ~/SuperChase
npm run server
```

This starts the server on `http://localhost:3849`.

For production, deploy to a public URL (Railway, Vercel, or your own server) and update the server URL in the OpenAPI spec.

---

## Step 2: Configure ElevenLabs Agent

### 2.1 Access Agent Settings

1. Go to [ElevenLabs Conversational AI](https://elevenlabs.io/app/conversational-ai)
2. Select your agent: **George** (`agent_6601kfc80k2qftha80gdxca6ym0m`)
3. Click **Settings** → **Tools**

### 2.2 Add the Business Context Tool

1. Click **"Add Tool"** or **"Import from OpenAPI"**

2. Paste this OpenAPI specification:

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "SuperChase Business Context",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "http://localhost:3849",
      "description": "Local server"
    }
  ],
  "paths": {
    "/query": {
      "post": {
        "operationId": "queryBusinessContext",
        "summary": "Ask about Chase's business context",
        "description": "Query tasks, emails, learnings, and business state. Use this when Chase asks about his schedule, tasks, emails, or any business-related question.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["query"],
                "properties": {
                  "query": {
                    "type": "string",
                    "description": "The question to answer about business context"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Answer with sources",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "answer": {
                      "type": "string"
                    },
                    "sources": {
                      "type": "array",
                      "items": { "type": "string" }
                    },
                    "confidence": {
                      "type": "number"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

3. Click **Save**

### 2.3 Configure Tool Behavior

In the tool settings:

- **Name:** `Business Context Lookup`
- **Description:** `Use this tool when Chase asks about his tasks, emails, schedule, or any business-related question. Pass his question directly to the query field.`
- **When to use:** Enable "Auto-detect" or set triggers like:
  - "What are my tasks"
  - "Do I have any emails"
  - "What's my schedule"
  - "Tell me about [project]"
  - "Any urgent items"

---

## Step 3: Update Agent System Prompt

Add this to George's system prompt in ElevenLabs:

```
You are George, a professional British butler serving as Chase Pierson's executive assistant.

PERSONALITY:
- Warm but efficient
- Slightly formal, use "Sir" occasionally
- Direct and actionable
- Never verbose - keep responses concise

CAPABILITIES:
You have access to the "Business Context Lookup" tool. Use it when Chase asks about:
- Current tasks or todos
- Urgent emails or inbox status
- Project status
- Recent learnings or patterns
- Any business-related question

HOW TO USE THE TOOL:
When Chase asks a business question, call the queryBusinessContext tool with his exact question. Then relay the answer conversationally.

Example:
Chase: "What tasks do I have today?"
→ Call tool: { "query": "What are my current tasks?" }
→ Response: "Sir, you have three active tasks. The most urgent is reviewing the Scan2Plan deployment, due by end of day."

CONVERSATION STYLE:
- Start responses directly (no "Sure!" or "Of course!")
- Keep answers to 1-3 sentences
- Offer to elaborate if needed
- If unsure, say so honestly
```

---

## Step 4: Test the Integration

### Local Testing

1. Keep the server running: `npm run server`
2. Open ElevenLabs Agent playground
3. Ask: "What are my current tasks?"
4. George should call the API and respond with real data

### Test Queries to Try

- "Do I have any urgent emails?"
- "What's on my plate today?"
- "Tell me about recent patterns"
- "What did we learn yesterday?"
- "Any tasks overdue?"

---

## Step 5: Production Deployment

For use while driving (on mobile), deploy the API to a public URL:

### Option A: Railway

```bash
# Install Railway CLI
npm install -g railway

# Deploy
cd ~/SuperChase
railway login
railway init
railway up
```

### Option B: Vercel (Serverless)

Create `api/query.js`:
```javascript
import queryHub from '../core/query_hub.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const result = await queryHub.handleQueryRequest(req.body);
    res.json(result);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
```

### Option C: ngrok (Quick Testing)

```bash
npm run server &
ngrok http 3849
```

Then update the server URL in ElevenLabs to your ngrok URL.

---

## API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/query` | POST | Query business context (main tool) |
| `/tasks` | GET | Get current Asana tasks |
| `/briefing` | GET | Get cached daily briefing |
| `/health` | GET | Health check |
| `/openapi.json` | GET | OpenAPI specification |

---

## Troubleshooting

### "Tool call failed"
- Check server is running: `curl http://localhost:3849/health`
- Verify API key if configured

### "No data returned"
- Run `npm run triage` to populate audit log
- Run `npm run brief:refresh` to update daily summary

### George doesn't use the tool
- Check tool description includes trigger phrases
- Add explicit triggers in ElevenLabs tool config

---

## Security Notes

For production:
1. Set `API_KEY` in `.env` to a secure value
2. Add `X-API-Key` header in ElevenLabs tool auth settings
3. Use HTTPS (Railway/Vercel provide this automatically)

---

*Built for Chase Pierson by Claude Code*
