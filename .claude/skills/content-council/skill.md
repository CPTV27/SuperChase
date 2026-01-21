# Content Council - AI Content Factory

## Overview

Multi-channel content generation system that transforms Battlecard intelligence into production-ready assets. Uses a **Waterfall Workflow**: one research "seed" flows into websites, blogs, social, and video.

## The 4-Agent Content Council

### Agent 1: Trend Hunter (Research)
**Model:** `openai/gpt-4o`
**Mission:** Find the viral seed and validate market demand

**Tasks:**
1. **Trend Validation**
   - Cross-reference battlecard keywords with Google Trends signals
   - Identify trending topics in industry via competitor content analysis
   - Find "People Also Ask" questions with rising search volume

2. **Competitor Content Audit**
   - Analyze top-performing competitor content (from battlecard sitemap data)
   - Identify content formats that get engagement
   - Find gaps in competitor content strategy

3. **Hook Mining**
   - Extract high-performing hooks from industry thought leaders
   - Identify emotional triggers in target audience
   - Compile "swipe file" of proven hooks

**Output:**
```json
{
  "viralSeed": {
    "topic": "core topic/angle",
    "hook": "attention-grabbing hook",
    "emotionalTrigger": "fear/aspiration/curiosity",
    "searchTrend": "rising/stable/declining",
    "competitorGap": "why this is underserved"
  },
  "trendingTopics": ["topic1", "topic2"],
  "hookSwipeFile": ["hook1", "hook2", "hook3"],
  "contentAngles": [
    {"angle": "...", "format": "video/blog/social", "viralPotential": "high/medium"}
  ]
}
```

---

### Agent 2: Scriptwriter (Video & Social)
**Model:** `anthropic/claude-3.5-sonnet`
**Mission:** Convert seed into high-retention scripts

**Tasks:**
1. **Video Scripts (Hook-Retain-Reward)**
   - 15-second TikTok/Reel hook
   - 60-second explainer script
   - 3-minute YouTube short script

2. **Social Sequences**
   - LinkedIn: 5 posts using Story-Value-CTA framework
   - X.com: 10 tweets (standalone + thread)
   - Each with engagement hooks and clear CTAs

3. **Email Sequences**
   - Welcome sequence (3 emails)
   - Nurture sequence (5 emails)
   - Sales sequence (3 emails)

**Frameworks Used:**
- **Hook-Retain-Reward**: First 3 sec hook → Value delivery → Clear reward/CTA
- **Story-Value-CTA**: Personal story → Teaching moment → Action step
- **PAS**: Problem → Agitate → Solution
- **AIDA**: Attention → Interest → Desire → Action

**Output:**
```json
{
  "videoScripts": {
    "tiktok15": {
      "hook": "first 3 seconds",
      "body": "value delivery",
      "cta": "what to do next",
      "visualNotes": "scene suggestions"
    },
    "explainer60": {...},
    "youtube180": {...}
  },
  "socialPosts": {
    "linkedin": [
      {"hook": "...", "story": "...", "value": "...", "cta": "..."}
    ],
    "twitter": [
      {"tweet": "...", "engagement_hook": "..."}
    ],
    "thread": {
      "hook": "tweet 1",
      "body": ["tweet 2", "tweet 3", "..."],
      "closer": "final tweet + CTA"
    }
  },
  "emailSequences": {
    "welcome": [...],
    "nurture": [...],
    "sales": [...]
  }
}
```

---

### Agent 3: Web Architect (SEO & Landing Pages)
**Model:** `anthropic/claude-3.5-sonnet`
**Mission:** Create SEO-optimized web content structures

**Tasks:**
1. **Landing Page Copy**
   - Headline + subheadline (Grand Slam Offer)
   - Problem-Agitate-Solve sections
   - Social proof blocks
   - Risk reversal / guarantee section
   - CTA hierarchy

2. **Blog Pillar Structure**
   - SEO-optimized title + meta description
   - H2/H3 outline targeting green/blue ocean keywords
   - Internal linking strategy
   - Featured snippet optimization

3. **Content Cluster Map**
   - Pillar page definition
   - Supporting posts (4-6 per pillar)
   - Internal link architecture
   - Keyword targeting per post

**Output:**
```json
{
  "landingPage": {
    "headline": "...",
    "subheadline": "...",
    "sections": [
      {"type": "hero", "content": "..."},
      {"type": "problem", "content": "..."},
      {"type": "solution", "content": "..."},
      {"type": "proof", "content": "..."},
      {"type": "offer", "content": "..."},
      {"type": "guarantee", "content": "..."},
      {"type": "cta", "content": "..."}
    ],
    "seoMeta": {
      "title": "...",
      "description": "...",
      "keywords": [...]
    }
  },
  "blogPillar": {
    "title": "...",
    "targetKeyword": "...",
    "metaDescription": "...",
    "wordCount": 2000,
    "outline": [
      {"h2": "...", "h3s": ["...", "..."], "keyPoints": ["..."]}
    ],
    "featuredSnippetTarget": "..."
  },
  "contentCluster": {
    "pillar": {...},
    "supportingPosts": [
      {"title": "...", "keyword": "...", "linksToPillar": true}
    ]
  }
}
```

---

### Agent 4: Visual Director (Image & Video Prompts)
**Model:** `openai/gpt-4o`
**Mission:** Generate production-ready visual asset prompts

**Tasks:**
1. **Social Media Images**
   - Hero images for each blog post
   - LinkedIn carousel slides
   - Twitter/X graphic prompts
   - Instagram story templates

2. **Video Scene Prompts**
   - Scene-by-scene breakdown for each video script
   - B-roll suggestions
   - Text overlay specifications
   - Transition notes

3. **Brand Asset Prompts**
   - Logo usage guidelines
   - Color palette applications
   - Typography specifications
   - Consistent visual style

**HeyGen Integration:**
```json
{
  "avatar": "professional_male_1",
  "voice": "en-US-Neural2-D",
  "background": "modern_office",
  "script": "from scriptwriter output",
  "scenes": [
    {
      "duration": 5,
      "text": "hook text",
      "gesture": "greeting",
      "emotion": "excited"
    }
  ]
}
```

**Output:**
```json
{
  "socialImages": [
    {
      "platform": "linkedin",
      "type": "hero",
      "prompt": "DALL-E/Midjourney prompt...",
      "dimensions": "1200x627",
      "textOverlay": "headline text"
    }
  ],
  "videoScenes": [
    {
      "sceneNumber": 1,
      "duration": "0:00-0:03",
      "visualType": "talking_head",
      "script": "hook text",
      "bRoll": "office environment",
      "textOverlay": "key phrase",
      "transition": "cut"
    }
  ],
  "heygenPayload": {
    "ready": true,
    "scenes": [...]
  },
  "carouselSlides": [
    {"slideNumber": 1, "headline": "...", "body": "...", "visual": "..."}
  ]
}
```

---

## Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CONTENT COUNCIL                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Input: Battlecard (from Competitive Intel)                 │
│  ├── Grand Slam Offer                                       │
│  ├── Green/Blue Ocean Keywords                              │
│  ├── Competitor Weaknesses                                  │
│  └── Brand Voice (from clients/{id}/brand.json)             │
│                                                             │
│  Stage 1: Trend Hunter                                      │
│  └── Validate seed, find hooks, identify gaps               │
│                                                             │
│  Stage 2: Scriptwriter                                      │
│  └── Video scripts, social posts, email sequences           │
│                                                             │
│  Stage 3: Web Architect                                     │
│  └── Landing page copy, blog outline, content cluster       │
│                                                             │
│  Stage 4: Visual Director                                   │
│  └── Image prompts, video scenes, HeyGen payload            │
│                                                             │
│  Output: memory/content_sprints/{businessId}/{traceId}.json │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Multi-Channel Sprint Output

Final deliverable structure:

```json
{
  "businessId": "s2p",
  "traceId": "content-abc123",
  "generatedAt": "2026-01-21T...",
  "battlecardRef": "intel-xyz789",

  "seed": {
    "topic": "48-Hour As-Built Guarantee",
    "hook": "What if rework was impossible?",
    "offer": "Grand Slam Offer headline"
  },

  "deliverables": {
    "landingPage": {...},
    "blogPillar": {...},
    "socialPosts": {
      "linkedin": [...],
      "twitter": [...],
      "thread": {...}
    },
    "videoScripts": {
      "tiktok15": {...},
      "explainer60": {...}
    },
    "emailSequences": {...},
    "visualAssets": {
      "images": [...],
      "videoScenes": [...],
      "heygenPayload": {...}
    }
  },

  "taskItems": [
    {"task": "Publish landing page", "platform": "website", "priority": "high"},
    {"task": "Schedule LinkedIn posts", "platform": "taplio", "priority": "high"},
    {"task": "Generate HeyGen video", "platform": "heygen", "priority": "medium"},
    {"task": "Publish blog pillar", "platform": "wordpress", "priority": "medium"}
  ],

  "analysis": {
    "trendHunter": {"timing": 8000, "model": "..."},
    "scriptwriter": {"timing": 15000, "model": "..."},
    "webArchitect": {"timing": 12000, "model": "..."},
    "visualDirector": {"timing": 10000, "model": "..."}
  }
}
```

---

## API Integration

### POST /api/content-council/run

```json
{
  "businessId": "s2p",
  "battlecardId": "intel-abc123",  // optional, uses latest if omitted
  "channels": ["landing", "blog", "social", "video"],  // optional, defaults to all
  "depth": "standard"  // quick | standard | deep
}
```

### GET /api/content-council/:businessId

Returns latest content sprint for business unit.

### GET /api/content-council/:businessId/heygen

Returns HeyGen-ready payload for video generation.

---

## Brand Voice Integration

All agents reference `clients/{businessId}/brand.json`:

```json
{
  "voice": {
    "tone": "confident_professional",
    "personality": ["precise", "efficient", "trustworthy"],
    "vocabulary": {
      "use": ["accuracy", "guaranteed", "construction-ready"],
      "avoid": ["maybe", "try", "hope"]
    }
  },
  "style": {
    "sentenceLength": "short_punchy",
    "formatting": "bullets_over_paragraphs",
    "emojiUsage": "minimal"
  }
}
```

---

## Depth Levels

| Level | Trend Hunter | Scriptwriter | Web Architect | Visual Director |
|-------|--------------|--------------|---------------|-----------------|
| quick | 3 hooks | 1 video, 5 social | Landing outline | 3 image prompts |
| standard | 10 hooks | 3 videos, 15 social | Full landing + blog | 10 images + HeyGen |
| deep | 20 hooks + trends | 5 videos, 30 social, emails | Landing + blog cluster | Full video production |

---

## External Tool Integration

### HeyGen API
```javascript
POST https://api.heygen.com/v2/video/generate
{
  "video_inputs": visualDirector.heygenPayload.scenes,
  "dimension": { "width": 1080, "height": 1920 },
  "aspect_ratio": "9:16"
}
```

### Taplio (LinkedIn Scheduling)
```javascript
POST https://api.taplio.com/posts
{
  "content": scriptwriter.socialPosts.linkedin[0],
  "scheduledFor": "2026-01-22T09:00:00Z"
}
```

### Typefully (X.com Scheduling)
```javascript
POST https://api.typefully.com/drafts
{
  "content": scriptwriter.socialPosts.thread,
  "threadify": true
}
```
