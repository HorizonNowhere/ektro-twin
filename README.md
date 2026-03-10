# ektro-twin

**Every AI remembers. None of them understand.**

`ektro-twin` extracts *who your user is* from conversations — not what they said, but how they think, what they value, and how they make decisions.

```typescript
import { createTwin } from 'ektro-twin'

const twin = createTwin({ provider: 'openai' })
await twin.feed('user_1', messages)

const profile = await twin.getProfile('user_1')
// {
//   profile: {
//     personality: "直接务实，不喜欢废话",
//     values: "效率 > 完美",
//     aesthetics: "极简、高对比、日系审美"
//   },
//   level: 3,
//   tier: 1,
//   tierName: "初见",
//   dimensions: { personality: 6, values: 4, aesthetics: 3, ... }
// }
```

## The Problem

Every AI product has **Memory** — it remembers what your users said.

But no AI product has **Understanding** — knowing who your users *are*.

```
┌──────────────────┐     ┌──────────────────┐
│     Memory       │     │  Understanding   │
│                  │     │                  │
│ "You said you    │     │ "You're someone  │
│  like coffee"    │     │  who values      │
│                  │     │  efficiency over  │
│ = a fact         │     │  perfection"     │
│                  │     │                  │
│ Mem0 does this   │     │ Nobody does this │
│ Letta does this  │     │                  │
│ Zep does this    │     │ Until now.       │
└──────────────────┘     └──────────────────┘
```

`ektro-twin` is the missing layer between Memory and Autonomy.

## Install

```bash
npm install ektro-twin openai
```

Other providers:
```bash
npm install ektro-twin @anthropic-ai/sdk    # Claude
npm install ektro-twin                       # Ollama (no extra deps)
```

## Quick Start

```typescript
import { createTwin } from 'ektro-twin'

// 1. Create engine (uses in-memory storage by default)
const twin = createTwin({ provider: 'openai' })

// 2. Feed conversations
await twin.feed('user_1', [
  { role: 'user', content: 'I prefer clean, minimal design.' },
  { role: 'assistant', content: 'Got it, keeping it simple.' },
])

// 3. Get understanding
const profile = await twin.getProfile('user_1')
```

## 8 Understanding Dimensions

By default, `ektro-twin` tracks 8 dimensions of user understanding:

| Dimension | What it captures |
|-----------|-----------------|
| `personality` | Introvert/extrovert, rational/emotional, work style |
| `values` | Core beliefs, priorities, what matters most |
| `decision` | Data-driven vs intuition, decisive vs cautious |
| `aesthetics` | Visual preferences, design taste |
| `communication` | Expression style, direct vs indirect |
| `knowledge` | Expertise, interests, learning style |
| `prediction` | How they judge the future, risk appetite |
| `boundaries` | Privacy attitude, trust level with AI |

### Custom Dimensions

Replace defaults with your own:

```typescript
const twin = createTwin({
  provider: 'openai',
  dimensions: ['taste', 'cuisine', 'dietary', 'adventure'],
})
```

## 7-Tier Evolution System

As the AI understands more, the Twin evolves through 7 tiers:

```
T1 初见 Stranger  → T2 轮廓 Sketch    → T3 理解 Understand
T4 默契 Sync      → T5 镜像 Mirror    → T6 共生 Symbiosis
                                         T7 超越 Transcend
```

Evolution requires both **level** (XP-based) and **dimension depth** (multiple dimensions above threshold).

## Storage Options

```typescript
// In-memory (default, zero config, data lost on restart)
createTwin({ provider: 'openai' })

// SQLite (persistent, local file)
createTwin({ provider: 'openai', storage: 'sqlite' })

// Supabase (production)
import { SupabaseAdapter } from 'ektro-twin'
createTwin({
  provider: 'openai',
  storage: new SupabaseAdapter(supabaseClient),
})
```

## Provider Options

```typescript
// OpenAI (default: gpt-4o-mini)
createTwin({ provider: 'openai' })

// Anthropic (default: claude-haiku)
createTwin({ provider: 'anthropic' })

// Ollama (local, free, no API key needed)
createTwin({ provider: 'ollama' })

// Custom model
import { OpenAIExtractor } from 'ektro-twin'
createTwin({
  provider: new OpenAIExtractor({ model: 'gpt-4o', apiKey: 'sk-xxx' }),
})
```

## API Reference

### `createTwin(config)`

Create a TwinEngine instance.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider` | `'openai' \| 'anthropic' \| 'ollama' \| SignalExtractor` | required | AI provider for signal extraction |
| `storage` | `'memory' \| 'sqlite' \| StorageAdapter` | `'memory'` | Where to store Twin data |
| `dimensions` | `string[]` | 8 defaults | Understanding dimensions to track |
| `onSignal` | `(signal) => void` | - | Callback fired on each extracted signal |

### `twin.feed(userId, messages)`

Extract signals from conversation and dual-write to Twin. Auto-creates Twin if user doesn't have one.

### `twin.getProfile(userId)`

Get user's complete understanding profile (profile text + level + tier + dimensions).

### `twin.correct(userId, corrections)`

Handle user corrections (highest quality signals, +25 XP each).

```typescript
await twin.correct('user_1', [
  { dimension: 'personality', newValue: 'Actually quite introverted' }
])
```

### `twin.reset(userId)`

Reset Twin to initial state (XP logs preserved for audit).

## How It Works

```
User conversation
       │
       ▼
Signal Extraction (AI)
  "What did this conversation reveal about the user?"
       │
       ▼
Dual Write
  ├── XP + Dimension scores (quantitative)
  └── Profile text (qualitative understanding)
       │
       ▼
Twin evolves over time
  More conversations → Deeper understanding → Higher tier
```

The key insight: **Memory stores facts. Understanding builds a model.**

## Built by Ektro

`ektro-twin` is built by [Ektro](https://ektroai.com) — the company where AI and humans are co-founders.

*Create the species that builds with you. Against entropy.*

## License

MIT
