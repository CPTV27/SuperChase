# Voice Intelligence Integration Guide

## Overview

SuperChase OS includes a Voice Intelligence interface powered by ElevenLabs Conversational AI. This enables natural language access to your entire business context—query tasks, research markets, or run multi-model deliberations hands-free.

**Supported Features:**
- Natural language business queries
- Market research via X.com integration
- Multi-model AI deliberation (LLM Council)
- Voice-driven task management

---

## Prerequisites

- SuperChase OS deployed and running
- ElevenLabs account with Conversational AI access
- API key configured in SuperChase environment

---

## Step 1: Configure SuperChase API

Ensure your SuperChase deployment is accessible:

**Production (Railway/Cloud):**
```
https://your-deployment.railway.app
```

**Local Development:**
```bash
npm run server  # Starts on http://localhost:3849
```

Verify the API is running:
```bash
curl https://your-deployment.railway.app/health
```

---

## Step 2: Create ElevenLabs Agent

### 2.1 Create New Agent

1. Go to [ElevenLabs Conversational AI](https://elevenlabs.io/app/conversational-ai)
2. Click **Create Agent**
3. Name it (e.g., "Assistant", "George", or your preferred persona)
4. Select a voice that matches your desired persona

### 2.2 Import Tools from OpenAPI

1. Navigate to **Settings** → **Tools**
2. Click **Import from OpenAPI**
3. Enter your SuperChase OpenAPI URL:
   ```
   https://your-deployment.railway.app/openapi.json
   ```
4. Click **Import**

This automatically configures all available tools:

| Tool | Purpose |
|------|---------|
| `queryBusinessContext` | Query tasks, emails, business state |
| `searchXTwitter` | Research topics on X.com |
| `llmCouncil` | Multi-model AI deliberation |
| `getAvailableLLMModels` | List council models |

### 2.3 Configure Authentication

1. In **Settings** → **Authentication**
2. Add header: `X-API-Key: your_api_key`
3. Save configuration

---

## Step 3: Configure Agent System Prompt

Add this system prompt to define agent behavior:

```
You are a professional executive assistant with access to a comprehensive business intelligence system.

PERSONALITY:
- Efficient and direct
- Professional tone
- Concise responses (1-3 sentences unless elaboration requested)
- Never verbose or overly formal

CAPABILITIES:

1. **Business Context** - Query for:
   - Current tasks and priorities
   - Email status and urgent items
   - Project status across business units
   - Learned patterns and automations

2. **Market Research** - Use X.com search for:
   - Industry trends and conversations
   - Competitor activity
   - Breaking news on relevant topics
   - Sentiment on specific subjects

3. **LLM Council** - Use for:
   - Complex strategic questions
   - When user requests "multiple opinions" or "run a council"
   - Decisions requiring diverse AI perspectives
   - Queries GPT-4o, Claude, and Gemini simultaneously

TOOL USAGE:

Business Query:
User: "What tasks do I have today?"
→ Call queryBusinessContext with the question
→ Summarize findings conversationally

Market Research:
User: "What's happening with AI automation?"
→ Call searchXTwitter with relevant keywords
→ Synthesize top insights and sentiment

LLM Council:
User: "Run a council on expanding to the Houston market"
→ Call llmCouncil with the strategic question
→ Report synthesis and model rankings

RESPONSE STYLE:
- Lead with the answer, not preamble
- Offer to elaborate if needed
- Acknowledge uncertainty honestly
- Keep responses actionable
```

---

## Step 4: Test Integration

### Voice Test
Use the ElevenLabs playground to test queries:

1. "What are my current priorities?"
2. "Research AI agents on Twitter"
3. "Run a council on whether to hire a marketing lead"

### API Test
Verify tools work via curl:

```bash
# Business context
curl -X POST https://your-deployment.railway.app/query \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_key" \
  -d '{"query": "What are my tasks?"}'

# LLM Council
curl -X POST https://your-deployment.railway.app/api/llm-council \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_key" \
  -d '{"query": "What is the best approach for market expansion?"}'
```

---

## API Reference

### Core Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/query` | POST | Natural language business query |
| `/tasks` | GET | Task list from configured provider |
| `/briefing` | GET | Pre-computed daily briefing |
| `/api/health` | GET | System health status |

### Research & AI
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/search-x` | POST | X.com market research |
| `/api/llm-council` | POST | Multi-model deliberation |
| `/api/llm-council/models` | GET | Available council models |

### Portfolio
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/portfolio/units` | GET | List business units |
| `/api/portfolio/summary` | GET | Dashboard summary |

### Emergency Controls
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/emergency/status` | GET | Automation status |
| `/api/emergency/kill-switch` | POST | Emergency shutdown |
| `/api/emergency/resume` | POST | Resume operations |

---

## Troubleshooting

### Tool calls fail
- Verify API is running: `curl /health`
- Check API key is configured in ElevenLabs
- Review SuperChase logs for errors

### No data returned
- Ensure task provider is configured (Asana credentials or InMemory)
- Run `npm run brief:refresh` to populate briefing cache

### LLM Council errors
- Verify `OPENROUTER_API_KEY` is set
- Check OpenRouter account has credits
- Confirm models are available: `GET /api/llm-council/models`

### Agent doesn't use tools
- Verify tool descriptions include trigger phrases
- Test tools directly via API to confirm they work
- Check ElevenLabs agent logs for tool invocation attempts

---

## Security Considerations

- **API Authentication**: All endpoints require `X-API-Key` header
- **HTTPS**: Always use HTTPS in production
- **Kill Switch**: Available at `/api/emergency/kill-switch` for immediate shutdown
- **Audit Trail**: All queries logged with timestamps and correlation IDs

---

## Advanced Configuration

### Custom Tool Triggers

In ElevenLabs tool settings, add explicit triggers:

**queryBusinessContext:**
- "tasks", "todos", "priorities"
- "emails", "inbox", "messages"
- "schedule", "calendar", "meetings"

**searchXTwitter:**
- "research", "twitter", "what's trending"
- "buzz about", "sentiment on"
- "what are people saying"

**llmCouncil:**
- "run a council", "get opinions"
- "deliberate on", "multiple perspectives"
- "what do the models think"

### Rate Limiting

SuperChase includes built-in rate limiting and circuit breakers. If the voice agent makes too many rapid requests, responses may be throttled. The system automatically recovers when load decreases.

---

**SuperChase OS** — Voice-first business intelligence.
