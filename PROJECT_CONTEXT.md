# PROJECT_CONTEXT.md - PMSense Technical Documentation

**Generated**: 2026-01-16  
**Version**: 1.0.0  
**Purpose**: Comprehensive technical context for AI agent onboarding

---

## 1. Architecture Overview

### 1.1 Framework & Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Framework** | Next.js 16.x with App Router | Turbopack enabled for dev |
| **Language** | TypeScript | Strict mode |
| **Styling** | Tailwind CSS | Custom design tokens |
| **Animation** | Framer Motion | Used in chat transitions |
| **Auth** | Supabase Auth | Google OAuth only |
| **Database** | Supabase PostgreSQL | Row Level Security enabled |
| **AI** | Google Gemini 2.0 Flash Lite | Via `@google/generative-ai` |

### 1.2 Directory Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── api/
│   │   └── chat/
│   │       ├── route.ts          # Main conversational chat endpoint
│   │       └── evaluate/
│   │           └── route.ts      # AI evaluation endpoint
│   ├── auth/
│   │   └── callback/             # OAuth callback handler
│   ├── dashboard/
│   │   └── page.tsx              # Module selection (RCA, PRD, Data)
│   ├── profile/
│   │   └── page.tsx              # User stats from `user_stats` view
│   ├── rca/
│   │   ├── page.tsx              # Problem listing with filters
│   │   └── [id]/
│   │       ├── page.tsx          # Problem context & instructions
│   │       ├── solve/
│   │       │   └── page.tsx      # Split-workspace solving interface
│   │       └── results/
│   │           └── [attemptId]/
│   │               └── page.tsx  # Analytics & AI feedback display
│   ├── settings/
│   │   └── page.tsx              # Placeholder - locked
│   ├── history/
│   │   └── page.tsx              # Attempt history
│   └── page.tsx                  # Lobby with Google login
│
├── components/
│   ├── chat/
│   │   ├── ChatInput.tsx         # Message input with submit
│   │   ├── ChatMessage.tsx       # Single message bubble
│   │   └── ConversationFeed.tsx  # Scrollable message list
│   ├── layout/
│   │   └── Header.tsx            # Shared navigation header
│   └── rca/
│       ├── FilterBar.tsx         # Difficulty/status filters
│       ├── ProblemCard.tsx       # Card with CTA logic
│       ├── SearchBar.tsx         # Text search for problems
│       └── SelfEvaluation.tsx    # Legacy self-eval (deprecated)
│
├── hooks/
│   ├── useSessionGuard.ts        # Auth check + redirect hook
│   └── useAutoSave.ts            # Debounced save hook
│
├── lib/
│   └── supabase.ts               # Browser client factory
│
└── types/
    └── supabase.ts               # Generated DB types
```

---

## 2. Database Deep-Dive

### 2.1 Core Tables

#### `problems`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `title` | text | Display title |
| `description` | text | Brief summary for cards |
| `context` | text | Full incident scenario shown to user |
| `difficulty` | text | `easy`, `medium`, `hard` |
| `time_limit_minutes` | integer | Default: 15 |
| `created_at` | timestamptz | Auto-generated |

#### `questions`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `problem_id` | uuid | FK → problems.id |
| `question_text` | text | The question Dan asks |
| `gold_standard_answer` | text | Expert-level answer |
| `rubric_items` | text[] | Array of scoring criteria |
| `order_index` | integer | Display order (0-indexed) |
| `context_summary` | text | Optional context Dan can reveal |

#### `attempts`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → auth.users.id |
| `problem_id` | uuid | FK → problems.id |
| `status` | text | `in_progress`, `submitted`, `evaluated` |
| `final_score` | integer | Sum of rubric points earned |
| `total_possible_score` | integer | Max possible from attempted questions |
| `is_timeout` | boolean | True if auto-submitted |
| `time_remaining` | integer | Seconds left when submitted |
| `answers` | jsonb | See structure below |
| `created_at` | timestamptz | Attempt start time |
| `updated_at` | timestamptz | Last save time |

**`answers` JSONB Structure:**
```typescript
{
  messages: ChatMessageType[];        // Full conversation history
  questionsAsked: number[];           // Indices of questions covered
  readyForEvaluation: boolean;        // True when all questions asked
  aiEvaluation: {                     // Set after evaluation
    scores: AIQuestionScore[];
    overallFeedback: string;
    totalScore: number;
    maxTotalScore: number;
    percentage: number;
  }
}
```

### 2.2 The `user_stats` View

```sql
CREATE VIEW user_stats AS
SELECT 
    user_id,
    COUNT(*) FILTER (WHERE status = 'evaluated') as total_completed,
    ROUND(AVG(
        CASE WHEN total_possible_score > 0 
        THEN (final_score::float / total_possible_score) * 100 
        END
    ), 1) as average_score,
    COALESCE(SUM(
        CASE WHEN status = 'evaluated' 
        THEN EXTRACT(EPOCH FROM (updated_at - created_at)) / 60 
        END
    ), 0)::integer as total_minutes_practiced,
    MODE() WITHIN GROUP (ORDER BY p.difficulty) as favorite_difficulty,
    COUNT(*) FILTER (WHERE status IN ('in_progress', 'submitted')) as total_pending_eval
FROM attempts a
LEFT JOIN problems p ON a.problem_id = p.id
GROUP BY user_id;
```

**Consumed by**: `/app/profile/page.tsx` → `ProfilePage.fetchData()`

---

## 3. The RCA State Machine

### 3.1 Attempt Lifecycle

```
┌──────────────┐   User clicks    ┌──────────────┐
│  No Attempt  │  "Start Solving" │  in_progress │
│    (null)    │ ───────────────► │              │
└──────────────┘                  └──────┬───────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
              Timer expires       User says "Done"      User clicks
              (auto-submit)       + min engagement      "Submit"
                    │                    │                    │
                    └────────────────────┼────────────────────┘
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │  evaluated   │
                                  │  (AI scored) │
                                  └──────────────┘
```

### 3.2 Status Transitions

| Status | UI Display | ProblemCard CTA | Can Resume? |
|--------|-----------|-----------------|-------------|
| `null` | — | "Start Simulation" | N/A |
| `in_progress` | IN PROGRESS (amber pulse) | "Resume Simulation" | Yes |
| `submitted` | COMPLETED | "View Analytics" | No |
| `evaluated` | COMPLETED | "View Analytics" | No |

**Note**: Both `submitted` and `evaluated` are treated as completed. Legacy distinction from removed self-evaluation step.

### 3.3 Key Functions in `/app/rca/[id]/solve/page.tsx`

| Function | Purpose |
|----------|---------|
| `init()` | Fetches problem, questions, existing attempt; creates new if none |
| `handleSendMessage()` | Sends to `/api/chat`, updates messages/questionsAsked state |
| `handleFinalEvaluation()` | Calls `/api/chat/evaluate`, saves AI scores, sets status=`evaluated` |
| `handleAutoSubmit()` | Triggered by timer=0, auto-evaluates |
| `handleQuit()` | Deletes attempt, navigates to `/rca` |

---

## 4. Component Map

### 4.1 Dashboard (`/app/dashboard/page.tsx`)

Three modules displayed as cards:
1. **RCA Simulations** — Active, links to `/rca`
2. **PRD Playground** — Locked, "Coming Soon"
3. **Data Gym** — Locked, "Coming Soon"

### 4.2 Split-Workspace (`/app/rca/[id]/solve/page.tsx`)

| Section | Description |
|---------|-------------|
| **Header** | Timer (countdown), Progress Dots (green when question asked) |
| **Left Panel** | Problem context (incident brief) |
| **Right Panel** | `ConversationFeed` + `ChatInput` |
| **Modals** | Quit modal, Back navigation modal |

**Progress Dots Logic**:
- `questionsAsked.length` determines how many dots are green
- Total dots = `questions.length`

### 4.3 Analytics View (`/app/rca/[id]/results/[attemptId]/page.tsx`)

| Section | Source |
|---------|--------|
| AI Evaluation Summary | `attempt.answers.aiEvaluation` |
| Per-question Feedback | `aiEvaluation.scores[].feedback` |
| Rubric Checklist | `aiEvaluation.scores[].rubricMatches[]` |
| Gold Standard | `question.gold_standard_answer` |

### 4.4 ProblemCard CTA Logic (`/components/rca/ProblemCard.tsx`)

```typescript
const isCompleted = attempt?.status === 'evaluated' || attempt?.status === 'submitted';
const isInProgress = attempt?.status === 'in_progress';

// Renders:
// - isCompleted: "View Analytics" + "Reattempt"
// - isInProgress: "Resume Simulation" (amber)
// - No attempt: "Start Simulation" (dark)
```

---

## 5. AI Integration

### 5.1 Conversational Chat (`/app/api/chat/route.ts`)

**Model**: `gemini-2.0-flash-lite`

**Persona**: DevOps Dan — friendly, casual, mentorship-style

**Request Interface**:
```typescript
interface ChatRequest {
  userMessage: string;
  history: ChatMessage[];
  problemContext: string;
  questions: Question[];
  questionsAsked: number[];
  attemptId?: string;
}
```

**System Prompt Key Rules**:
1. Guide naturally, one question at a time
2. Answer clarifying questions from `context_summary` if available
3. When all questions asked → end with "Ready to wrap up and see how you did?"

**Response Logic**:
- Keyword matching marks questions as "asked" (≥2 keywords from question text)
- User saying "I am done" (with min engagement) → marks all as asked
- `readyForEvaluation: true` when `allQuestionsAsked && signalsWrapUp`

### 5.2 Evaluation (`/app/api/chat/evaluate/route.ts`)

**Model**: `gemini-2.0-flash-lite`

**Prompt Structure**:
```
INCIDENT CONTEXT: {problemContext}

QUESTIONS AND RUBRICS:
QUESTION 1: {text}
GOLD STANDARD: {gold_standard_answer}
RUBRIC ITEMS:
  1. {rubric_items[0]}
  2. {rubric_items[1]}
---

FULL CONVERSATION TRANSCRIPT:
USER: ...
DAN: ...

Now evaluate the user's performance. Output valid JSON only:
```

**Proportional Scoring**:
- Only evaluates questions in `questionsAsked[]`
- Score = points from attempted questions only
- Prevents gaming by saying "I am done" immediately

### 5.3 Rate Limiting

```typescript
SESSION_RATE_LIMIT = 30;  // Per attempt per hour
GLOBAL_RATE_LIMIT = 20;   // All users per minute
```

---

## 6. Current Roadmap

### Active Features
- ✅ RCA Simulator with free-flow chat
- ✅ AI evaluation with per-question feedback
- ✅ Timer with auto-submit
- ✅ State persistence on refresh/navigate
- ✅ Profile stats dashboard
- ✅ Problem filtering & search

### Placeholders (Locked)
- 🔒 PRD Playground — `/dashboard` shows "Coming Soon"
- 🔒 Data Gym — `/dashboard` shows "Coming Soon"
- 🔒 Settings — Accessible but empty

### Pending Improvements
- Progress dots heuristic refinement (keyword matching unreliable)
- Add `context_summary` data to all existing questions

---

## 7. Environment Setup

### 7.1 Required Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Google AI
GOOGLE_AI_API_KEY=AIza...
```

### 7.2 Branching Flow

| Environment | Branch | Supabase Project |
|-------------|--------|------------------|
| Local | `main` | Dev instance |
| Staging | `staging` | Staging instance |
| Production | `production` | Prod instance |

### 7.3 Local Development

```bash
npm run dev          # Starts with Turbopack on localhost:3000
npm run build        # Production build
npm run lint         # ESLint check
```

---

## 8. Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **gemini-2.0-flash-lite** over Pro | Cost efficiency for high-volume chat |
| **Client-side Supabase** | No server actions needed; RLS handles security |
| **Status simplified** | Removed `submitted` as separate state since self-eval deprecated |
| **Immediate message save** | Prevents data loss on refresh (every message saved to DB) |
| **Timer save interval** | 10 seconds for timer state vs immediate for messages |

---

## 9. Known Edge Cases

1. **User says "done" immediately** — Blocked by minimum engagement check (1 question OR 3+ messages)
2. **All dots green but Dan keeps asking** — System prompt forces wrap-up phrase when pending questions empty
3. **Old attempts with `submitted` status** — ProblemCard treats as completed (same as `evaluated`)

---

*Document maintained by AI agent. For human review, verify against actual codebase.*
