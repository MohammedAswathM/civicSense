# PROJECT_BRAIN.md — CivicSense
### The Complete Context, Architecture, and Development Bible
> **Purpose of this file:** This document is the single source of truth for every AI tool, code assistant, or developer working on CivicSense. It contains the full product vision, technical architecture, agent logic, data schema, UI/UX spec, edge case handling, testing strategy, deployment instructions, and explicit DO/DON'T rules. Read this entire document before writing a single line of code or making any architectural decision. When in doubt, consult this document first.

---

## TABLE OF CONTENTS

1. [Project Identity & Vision](#1-project-identity--vision)
2. [The Problem We Are Solving](#2-the-problem-we-are-solving)
3. [What We Are Building — Plain English](#3-what-we-are-building--plain-english)
4. [Tech Stack — Free Tier Constraints](#4-tech-stack--free-tier-constraints)
5. [Repository & Folder Structure](#5-repository--folder-structure)
6. [The Four-Agent Architecture](#6-the-four-agent-architecture)
7. [Data Schema — Firestore Collections](#7-data-schema--firestore-collections)
8. [Full User Flows](#8-full-user-flows)
9. [Feature Specification — Every Feature Detailed](#9-feature-specification--every-feature-detailed)
10. [UI/UX Specification](#10-uiux-specification)
11. [API & Integration Contracts](#11-api--integration-contracts)
12. [Edge Cases & Guardrails](#12-edge-cases--guardrails)
13. [Security & Privacy Architecture](#13-security--privacy-architecture)
14. [Testing Strategy](#14-testing-strategy)
15. [Deployment — Free Tier Step by Step](#15-deployment--free-tier-step-by-step)
16. [Environment Variables & Secrets](#16-environment-variables--secrets)
17. [What AI Tools Must NOT Do](#17-what-ai-tools-must-not-do)
18. [Known Pitfalls & Fixes](#18-known-pitfalls--fixes)
19. [Demo Script for Judges](#19-demo-script-for-judges)
20. [Submission Checklist](#20-submission-checklist)

---

## 1. Project Identity & Vision

### Name
**CivicSense** — See it. Report it. Verify it. Fix it.

### Tagline
*The only civic reporting platform that proves issues are actually resolved.*

### Hackathon Context
- **Event:** Vibe2Ship by Coding Ninjas × Google for Developers
- **Problem Statement:** Community Hero — Hyperlocal Problem Solver
- **Deadline:** 30 June 2026, 11:59 PM
- **Mandatory deployment:** Google Cloud Platform (GCP) only. Not Vercel. Not Netlify.
- **Prize pool:** ₹3 Lakhs. Top 10 go to final presentation round.
- **Evaluation weights:** Problem Solving & Impact (20%), Agentic Depth (20%), Innovation & Creativity (20%), Google Technologies (15%), Product Experience & Design (10%), Technical Implementation (10%), Completeness & Usability (5%).

### Core Value Proposition
Every competing submission in this category will build: photo upload → AI categorisation → map pin → dashboard. We do not build that. We build the trust layer that every existing civic app (including Swachhata-MoHUA with 1.7 crore users) has failed to implement:
1. **Fraud-proof resolution** — officials cannot fake-close a ticket with an unrelated photo.
2. **Auto-escalation matrix** — unresolved tickets automatically escalate to supervisor tiers; they do not silently die.
3. **Privacy-preserving anonymity** — complainants are never exposed to the authority they are reporting.

These three gaps are documented in real Swachhata-MoHUA Play Store reviews. That is the hook. We are not building a hackathon toy. We are building the upgrade layer to a government system used by 1.7 crore people.

---

## 2. The Problem We Are Solving

### The Context
Communities face recurring issues: potholes, broken streetlights, waterlogging, garbage overflow, damaged pipes. Reporting these is fragmented. Resolution is opaque. Trust in the system is near zero.

### Why Existing Systems Fail (Evidence-Based)

**Swachhata-MoHUA (1.7 crore users) — documented Play Store failures:**
- Officials upload "resolved" photos from completely different locations. Tickets get fake-closed. Citizens have no recourse.
- No escalation matrix. When an issue exceeds SLA, it stays with the same unresponsive official forever.
- Officials contact complainants privately (using report data) to pressure them to withdraw complaints. Personal data is not protected.
- App crashes and GPS upload failures are frequent.

**Why this matters for our pitch:**
These are not theoretical problems. They are documented, real failures of the most-deployed Indian civic app. Every judge from a government background knows about these failures. Opening with this is our strongest possible hook.

### The Three Trust Gaps We Close

| Gap | What happens today | What we do |
|---|---|---|
| Fake resolution | Officials upload unrelated photos, mark resolved | GPS delta check + visual similarity check before closure is allowed |
| No escalation | Issue stays with unresponsive official past SLA | Auto-escalation ladder: Officer → Supervisor → District level |
| Privacy leak | Officials see complainant identity, apply pressure | Anonymous public ID — officials never see who reported |

---

## 3. What We Are Building — Plain English

CivicSense is a web application (PWA) where:

**Citizens:**
- Sign in anonymously (no account needed, just a browser)
- Report a community issue by uploading a photo, optionally adding a text description, and confirming their location on a map
- Receive an anonymous tracking ID (e.g., `CS-2847-XKQM`) to follow their report
- See all issues in their area on a live map
- Confirm (or dispute) when an official claims an issue is fixed

**Officials (ward-level):**
- Sign in with OTP (phone number, verified)
- See all issues assigned to their ward/department
- Update issue status with photos
- Cannot close a ticket without passing GPS + visual fraud checks

**Supervisors/Admins:**
- See ward-level performance dashboards
- Receive escalated tickets that exceeded SLA
- Can override disputed resolutions with mandatory audit notes

**The AI works silently in the background:**
- Classifies every uploaded photo (what kind of issue, how severe)
- Checks every new report for duplicates within 75m
- Verifies every "resolved" photo against the original
- Generates predictive hotspot forecasts from historical data

---

## 4. Tech Stack — Free Tier Constraints

> **CRITICAL RULE FOR ALL AI TOOLS:** Every technology choice below was made for free tier viability. DO NOT suggest alternatives that have paid-only features for the functionality we need. DO NOT add packages that require paid API keys. Every third-party integration must work on a free plan for the scale of a hackathon demo (~100 concurrent users, ~500 reports).

### Frontend
- **Framework:** Next.js 14 (App Router) — free, open source
- **Styling:** Tailwind CSS v3 — free, open source
- **Maps:** Google Maps JavaScript API — **$200/month free credit** covers all demo usage. Use `@googlemaps/js-api-loader`
- **State management:** Zustand (lightweight, free)
- **PWA:** `next-pwa` for offline capability

### Backend / Database
- **Database:** Firebase Firestore (free Spark plan) — 50,000 reads/day, 20,000 writes/day, 1 GB storage. Sufficient for demo.
- **Auth:** Firebase Authentication (free) — anonymous auth + phone OTP
- **File storage:** Firebase Cloud Storage (free Spark plan) — 5 GB storage, 1 GB/day download. Compress all images client-side before upload.
- **Serverless functions:** Firebase Cloud Functions (free Spark plan allows outbound calls only to Google services — CRITICAL: this means Gemini API calls work because they go to `generativelanguage.googleapis.com` which is a Google domain. Non-Google API calls from Cloud Functions require Blaze plan.)
- **Real-time:** Firestore real-time listeners (built into the free SDK)

### AI
- **Image classification + fraud detection:** Gemini 2.5 Flash via `@google/genai` SDK — free tier: 1,500 requests/day, 15 requests/minute. This is enough for demo.
- **Embeddings for visual similarity:** Gemini `text-embedding-004` model — free tier: 1,500 requests/day
- **Alternative if rate limited during demo:** Google Cloud Vision API — free tier: 1,000 units/month. Use as fallback for basic categorisation only.

### Predictions / Analytics
- **BigQuery:** Free tier — 10 GB storage, 1 TB query/month. Used for historical pattern analysis and hotspot prediction.
- **Looker Studio:** Free — connects to BigQuery, renders heatmaps for the dashboard

### Deployment
- **Primary:** Google Cloud Run (free tier: 2 million requests/month, 360,000 vCPU-seconds) — sufficient for demo traffic
- **Alternative:** Firebase Hosting (free: 10 GB storage, 360 MB/day transfer) — for static Next.js export if Cloud Run proves complex
- **Recommended path:** Use AI Studio one-click deploy (as specified in hackathon rules) which deploys to Cloud Run automatically

### DO NOT USE (these break free tier or add unnecessary complexity)
- ❌ MongoDB Atlas (Firestore is our DB)
- ❌ Pinecone or any paid vector DB (we use Gemini embeddings + Firestore for similarity)
- ❌ Twilio (requires paid plan for production SMS — use Firebase Phone Auth which includes SMS)
- ❌ OpenAI APIs (not a Google product, irrelevant to this hackathon's scoring)
- ❌ Redis/Upstash (not needed at demo scale)
- ❌ NextAuth.js (Firebase Auth handles everything we need)
- ❌ Prisma/PostgreSQL (Firestore is our DB)
- ❌ Vercel deployment (hackathon rules explicitly require GCP)
- ❌ Any npm package that makes outbound HTTP calls from Cloud Functions to non-Google domains (violates Spark plan)

---

## 5. Repository & Folder Structure

```
civicsense/
├── PROJECT_BRAIN.md              ← this file — read before anything else
├── .env.local                    ← never commit, see Section 16
├── .env.example                  ← commit this with placeholder values
├── .gitignore
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── firebase.json                 ← Firebase hosting + functions config
├── firestore.rules               ← Firestore security rules
├── firestore.indexes.json        ← composite index definitions
├── storage.rules                 ← Cloud Storage security rules
│
├── public/
│   ├── manifest.json             ← PWA manifest
│   ├── icons/                    ← PWA icons (192×192, 512×512)
│   └── sw.js                     ← service worker (generated by next-pwa)
│
├── src/
│   ├── app/                      ← Next.js App Router pages
│   │   ├── layout.tsx            ← root layout with providers
│   │   ├── page.tsx              ← landing / public map (/)
│   │   ├── report/
│   │   │   └── page.tsx          ← citizen report form (/report)
│   │   ├── track/
│   │   │   └── [id]/
│   │   │       └── page.tsx      ← public issue tracker (/track/CS-XXXX)
│   │   ├── dashboard/
│   │   │   └── page.tsx          ← public impact dashboard (/dashboard)
│   │   ├── official/
│   │   │   ├── login/
│   │   │   │   └── page.tsx      ← official OTP login (/official/login)
│   │   │   ├── queue/
│   │   │   │   └── page.tsx      ← official ticket queue (/official/queue)
│   │   │   └── resolve/
│   │   │       └── [id]/
│   │   │           └── page.tsx  ← resolution submission form
│   │   └── admin/
│   │       └── page.tsx          ← supervisor escalation view (/admin)
│   │
│   ├── components/
│   │   ├── map/
│   │   │   ├── CivicMap.tsx      ← main Google Maps component
│   │   │   ├── IssuePin.tsx      ← custom map pin with status colour
│   │   │   ├── ClusterLayer.tsx  ← marker clustering
│   │   │   └── HeatmapLayer.tsx  ← predictive heatmap overlay
│   │   ├── report/
│   │   │   ├── PhotoUpload.tsx   ← image capture + compression
│   │   │   ├── LocationPicker.tsx ← GPS + manual map pin
│   │   │   ├── CategorySelect.tsx ← issue category picker
│   │   │   └── ConfirmSubmit.tsx
│   │   ├── official/
│   │   │   ├── TicketCard.tsx
│   │   │   ├── ResolutionUpload.tsx
│   │   │   └── FraudWarning.tsx  ← shown when Agent 4 flags a resolution
│   │   ├── dashboard/
│   │   │   ├── StatsBar.tsx      ← key metrics at top
│   │   │   ├── WardLeaderboard.tsx
│   │   │   ├── SLACountdown.tsx  ← public countdown timer
│   │   │   └── IssueThread.tsx   ← expandable issue history
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Badge.tsx         ← status badges (Open/In Progress/Resolved/Escalated)
│   │       ├── Modal.tsx
│   │       ├── Toast.tsx
│   │       └── LoadingSpinner.tsx
│   │
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── config.ts         ← Firebase app init (client-side)
│   │   │   ├── firestore.ts      ← typed Firestore helpers
│   │   │   ├── storage.ts        ← Cloud Storage upload helpers
│   │   │   └── auth.ts           ← Firebase Auth helpers
│   │   ├── gemini/
│   │   │   ├── classify.ts       ← Agent 1: image classification
│   │   │   ├── embeddings.ts     ← Agent 4: image embedding generation
│   │   │   └── prompts.ts        ← all Gemini system prompts (centralised)
│   │   ├── agents/
│   │   │   ├── agent1-classify.ts    ← classification logic
│   │   │   ├── agent2-dedupe.ts      ← geo-deduplication logic
│   │   │   ├── agent3-route.ts       ← routing + SLA assignment logic
│   │   │   ├── agent4-fraud.ts       ← resolution fraud detection
│   │   │   └── agent5-predict.ts     ← predictive hotspot logic (BigQuery)
│   │   ├── geo/
│   │   │   ├── haversine.ts      ← distance calculation
│   │   │   ├── ward-lookup.ts    ← GPS → ward/department mapping
│   │   │   └── clustering.ts     ← DBSCAN-lite for issue clustering
│   │   └── utils/
│   │       ├── id-generator.ts   ← CS-XXXX-YYYY public ID generation
│   │       ├── image-compress.ts ← client-side compression before upload
│   │       ├── rate-limiter.ts   ← per-user submission rate limiting
│   │       └── constants.ts      ← SLA times, radius configs, category list
│   │
│   ├── hooks/
│   │   ├── useIssues.ts          ← real-time Firestore listener for issues
│   │   ├── useAuth.ts            ← Firebase Auth state
│   │   ├── useLocation.ts        ← GPS with accuracy check
│   │   └── useOffline.ts         ← PWA offline state detection
│   │
│   ├── store/
│   │   └── useStore.ts           ← Zustand global state
│   │
│   └── types/
│       ├── issue.ts              ← Issue TypeScript types
│       ├── user.ts               ← User/Official types
│       └── agent.ts              ← Agent input/output types
│
├── functions/                    ← Firebase Cloud Functions
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts              ← function exports
│       ├── triggers/
│       │   ├── onIssueCreate.ts  ← triggers Agent 1 → 2 → 3 pipeline
│       │   ├── onResolutionUpload.ts ← triggers Agent 4
│       │   └── onSLAExpiry.ts    ← scheduled: check SLA breaches every hour
│       └── scheduled/
│           └── escalationCheck.ts ← cron: runs escalation + prediction refresh
│
└── tests/
    ├── unit/
    │   ├── agent1.test.ts
    │   ├── agent2.test.ts
    │   ├── agent4.test.ts
    │   ├── haversine.test.ts
    │   └── id-generator.test.ts
    ├── integration/
    │   ├── report-flow.test.ts
    │   └── resolution-fraud.test.ts
    └── e2e/
        └── citizen-journey.test.ts
```

---

## 6. The Four-Agent Architecture

> **For AI tools:** This is the most important section. Every agent is a discrete, auditable function. They run in sequence. Each agent has exactly one input type and one output type. Do not merge agent logic. Do not let an agent do more than its defined role. The pipeline integrity is what judges evaluate under "Agentic Depth."

### Pipeline Overview

```
CITIZEN SUBMITS REPORT
        ↓
  [Agent 1: Classify]
  Input: photo + text + GPS
  Output: structured ticket JSON
        ↓
  [Agent 2: Deduplicate]
  Input: structured ticket JSON
  Output: thread ID (new or existing) + merge decision
        ↓
  [Agent 3: Route]
  Input: thread ID + category + ward
  Output: assigned official + SLA deadline + public timer starts
        ↓ (async — only when official uploads resolution)
  [Agent 4: Fraud Check]
  Input: original report (photo+GPS) + resolution (photo+GPS)
  Output: PASS (ticket closes) | FLAG (blocks closure, escalates)
        ↓ (async — runs on schedule)
  [Agent 5: Predict]
  Input: 90-day historical complaint data from BigQuery
  Output: 30-day forward hotspot heatmap per ward
```

---

### Agent 1 — Classification Agent

**Trigger:** Firebase Cloud Function `onIssueCreate` — fires when a new document is written to `/issues` collection with status `pending_classification`.

**Input:**
```typescript
interface Agent1Input {
  issueId: string;           // Firestore document ID
  photoUrl: string;          // Cloud Storage URL of uploaded photo
  textDescription: string;   // optional citizen text
  gpsLat: number;
  gpsLng: number;
  gpsAccuracy: number;       // metres — reject if > 100
}
```

**Process:**
1. Download image from Cloud Storage URL
2. Call Gemini 2.5 Flash with the system prompt from `lib/gemini/prompts.ts` (see Section 11)
3. Parse structured JSON response
4. Validate response against schema — if Gemini returns malformed JSON, retry once, then fall back to `category: "unknown"` (never crash the pipeline)
5. Write classification result back to Firestore issue document
6. Update issue status from `pending_classification` → `pending_deduplication`

**Output:**
```typescript
interface Agent1Output {
  category: 'pothole' | 'waterlogging' | 'broken_light' | 'garbage' | 'damaged_pipe' | 'fallen_tree' | 'sewage' | 'vandalism' | 'other';
  severity: 1 | 2 | 3 | 4 | 5;   // 1=minor, 5=critical/danger
  confidence: number;              // 0.0–1.0
  geminiDescription: string;       // plain-language description of what Gemini saw
  isValidIssue: boolean;           // false if photo shows nothing civic (e.g., selfie, blank wall)
  rejectionReason?: string;        // only if isValidIssue=false
}
```

**Error handling:**
- If Gemini API is rate-limited: retry after 4 seconds (Gemini free tier: 15 req/min)
- If Gemini returns `isValidIssue: false`: mark issue as `rejected`, notify citizen with rejection reason, do NOT proceed to Agent 2
- If photo URL is inaccessible: mark issue `error_processing`, do not crash

**Gemini System Prompt for Agent 1** (stored in `lib/gemini/prompts.ts`):
```
You are a civic infrastructure issue classifier for an Indian urban community reporting system.

Analyze the provided image and return ONLY a valid JSON object with no markdown, no explanation, no preamble.

Classify the image into one of these categories:
- pothole: road surface damage, cracks, holes in roads or footpaths
- waterlogging: standing water, flooded roads or areas
- broken_light: non-functional streetlights, broken light poles
- garbage: uncollected waste, overflowing bins, illegal dumping
- damaged_pipe: visible broken water pipes, leaking mains
- fallen_tree: trees blocking roads or footpaths
- sewage: open sewage, sewage overflow, blocked drains with overflow
- vandalism: damaged public property
- other: a real civic issue not in the above categories

If the image does NOT show a civic infrastructure issue (e.g., it is a selfie, a blank wall, a person, an indoor scene, text/screenshot, or any non-civic subject), set isValidIssue to false.

Return this exact JSON structure:
{
  "category": "<category string>",
  "severity": <integer 1-5>,
  "confidence": <float 0.0-1.0>,
  "geminiDescription": "<one sentence describing what you see>",
  "isValidIssue": <boolean>,
  "rejectionReason": "<only include if isValidIssue is false>"
}

Severity guide:
1 = cosmetic/minor, no safety risk
2 = minor inconvenience
3 = moderate, affects daily movement
4 = significant, safety risk
5 = critical, immediate danger (deep pothole on main road, live wire, major flooding)
```

---

### Agent 2 — Deduplication & Geo-Clustering Agent

**Trigger:** Firestore status update from `pending_deduplication` (set by Agent 1 completion)

**Input:**
```typescript
interface Agent2Input {
  issueId: string;
  gpsLat: number;
  gpsLng: number;
  category: string;           // from Agent 1
  severity: number;           // from Agent 1
}
```

**Process:**
1. Query Firestore for all OPEN issues of the same `category` within `DEDUP_RADIUS_METRES` (default: 75m) using Firestore geospatial query (requires `geopoint` field + composite index)
2. If matches found:
   a. Identify the oldest open issue in the cluster → this is the canonical thread
   b. Add current `issueId` to the canonical thread's `corroborations` array
   c. Increment the canonical thread's `credibilityWeight` by +0.5
   d. If current report has a photo → increment `credibilityWeight` by +1 additionally
   e. Mark current issue document as `merged_into: <canonical_thread_id>`
   f. Check if credibilityWeight crossed 5.0 → if so, flag `autoEscalate: true`
3. If no matches found:
   a. This is a new unique issue — assign a public tracking ID using `id-generator.ts`
   b. Set status to `pending_routing`
4. Update canonical thread's `credibilityWeight` and `corroborationCount`

**Geospatial query implementation:**
```typescript
// Firestore geospatial query using GeoFirestore-compatible approach
// Store geopoint as both a GeoPoint AND a geohash string for efficient radius queries
// Use geofire-common package for geohash calculation (free, open source)

import { geohashQueryBounds, distanceBetween } from 'geofire-common';

const center = [lat, lng];
const radiusInM = DEDUP_RADIUS_METRES; // 75

const bounds = geohashQueryBounds(center, radiusInM);
// Query each bound range in Firestore
// Then client-side filter by exact Haversine distance
// This is the standard pattern — do NOT try to use Firestore native geo queries
// for the Spark plan; those require Firestore Enterprise edition
```

**Credibility Weight scale:**
```
Base report:                    +1.0
Each corroboration (unique ID): +0.5
Photo evidence present:         +1.0
Official PWA confirmation:      +2.0
─────────────────────────────────────
Auto-escalate threshold:         5.0
```

**Output:**
```typescript
interface Agent2Output {
  isNewIssue: boolean;
  canonicalThreadId: string;  // new or existing
  publicTrackingId: string;   // CS-XXXX-YYYY format
  corroborationCount: number;
  credibilityWeight: number;
  autoEscalate: boolean;
}
```

---

### Agent 3 — Smart Routing & SLA Engine

**Trigger:** Issue status → `pending_routing`

**Input:**
```typescript
interface Agent3Input {
  issueId: string;
  category: string;
  severity: number;
  gpsLat: number;
  gpsLng: number;
  autoEscalate: boolean;      // from Agent 2
}
```

**Process:**
1. Determine ward from GPS using `ward-lookup.ts` (see ward config in Section 11)
2. Map `category` → `department` using the routing table (hardcoded config):
   ```typescript
   const CATEGORY_TO_DEPARTMENT = {
     pothole: 'roads',
     waterlogging: 'drainage',
     broken_light: 'electricity',
     garbage: 'sanitation',
     damaged_pipe: 'water_supply',
     fallen_tree: 'parks',
     sewage: 'drainage',
     vandalism: 'municipal',
     other: 'municipal',
   };
   ```
3. Look up assigned official for `ward + department` from `officials` Firestore collection
4. Calculate SLA deadline based on `category + severity`:
   ```typescript
   const SLA_HOURS = {
     pothole: { 1: 168, 2: 120, 3: 72, 4: 48, 5: 24 },
     waterlogging: { 1: 48, 2: 24, 3: 12, 4: 6, 5: 3 },
     broken_light: { 1: 120, 2: 96, 3: 72, 4: 48, 5: 24 },
     garbage: { 1: 72, 2: 48, 3: 24, 4: 12, 5: 6 },
     damaged_pipe: { 1: 96, 2: 72, 3: 48, 4: 24, 5: 12 },
     // ...
   };
   ```
5. Check for convergence opportunities: query for open issues of ANY category within 100m. If 2+ found → add `convergenceAlert: true` and list nearby issue IDs in the ticket (this is the budget-multiplier feature from the GRAM-DIYA work, adapted for Community Hero)
6. Write assignment + SLA deadline to issue document
7. Update status to `assigned`
8. If `autoEscalate: true` (from Agent 2), skip assigned officer and go directly to supervisor

**Output:**
```typescript
interface Agent3Output {
  assignedOfficialId: string;
  department: string;
  ward: string;
  slaDeadline: Timestamp;
  convergenceAlert: boolean;
  nearbyIssueIds: string[];   // for convergence batching
}
```

---

### Agent 4 — Resolution Fraud Detection Agent

**Trigger:** Firebase Cloud Function `onResolutionUpload` — fires when an official updates an issue with a `resolutionPhotoUrl` and sets status to `pending_verification`.

**This agent is the most important one. It is the unique feature no competitor has.**

**Input:**
```typescript
interface Agent4Input {
  issueId: string;
  originalPhotoUrl: string;   // from original citizen report
  originalGpsLat: number;
  originalGpsLng: number;
  resolutionPhotoUrl: string; // uploaded by official as proof of fix
  resolutionGpsLat: number;
  resolutionGpsLng: number;
  officialId: string;
}
```

**Process — Two-Stage Verification:**

**Stage 1: GPS Proximity Check (fast, cheap)**
```typescript
const distance = haversineDistance(
  { lat: originalGpsLat, lng: originalGpsLng },
  { lat: resolutionGpsLat, lng: resolutionGpsLng }
);
const GPS_FRAUD_THRESHOLD_METRES = 100; // configurable
if (distance > GPS_FRAUD_THRESHOLD_METRES) {
  return { pass: false, reason: 'gps_mismatch', distance };
}
```

**Stage 2: Visual Similarity Check (Gemini embeddings)**
```typescript
// Only runs if Stage 1 PASSES (save API quota)
// Get embedding of original photo
const originalEmbedding = await gemini.embedContent({
  model: 'text-embedding-004',
  content: { parts: [{ inlineData: { data: originalBase64, mimeType: 'image/jpeg' } }] }
});

// Get embedding of resolution photo
const resolutionEmbedding = await gemini.embedContent({ ... });

// Compute cosine similarity
const similarity = cosineSimilarity(originalEmbedding.values, resolutionEmbedding.values);
const SIMILARITY_THRESHOLD = 0.35; // tuned: same scene should be >0.35, different scene <0.2
if (similarity < SIMILARITY_THRESHOLD) {
  return { pass: false, reason: 'scene_mismatch', similarity };
}
```

> **Important calibration note:** The threshold 0.35 is a starting value. During development, test with 10+ pairs of (same location before/after) and (different location) images to calibrate. The exact threshold matters — too high and legitimate resolutions get flagged; too low and fraud passes. Test this thoroughly.

**Stage 3: Citizen Confirmation Loop**
- If both Stage 1 and Stage 2 pass → send citizen a push notification (FCM):
  - "Your issue CS-XXXX has been marked resolved. Is it fixed? [Yes, it's fixed] [No, still broken]"
- If citizen confirms → close ticket permanently
- If citizen responds "No" → re-open with status `disputed`, notify supervisor, increment `fraudAttempts` counter on official's record
- If citizen does not respond within 48 hours → auto-close (assume resolved)

**Output:**
```typescript
interface Agent4Output {
  verificationStatus: 'pass' | 'gps_fraud' | 'visual_fraud' | 'awaiting_citizen';
  gpsDistance?: number;         // metres
  visualSimilarity?: number;    // 0.0–1.0
  citizenConfirmRequired: boolean;
  flaggedForSupervisor: boolean;
}
```

**When fraud is detected:**
1. Do NOT close the ticket
2. Set status back to `assigned`
3. Add fraud flag to resolution attempt in `resolutionAttempts` subcollection (immutable history)
4. Notify supervisor via FCM
5. Notify official: "Your resolution was not accepted. Reason: [GPS location doesn't match issue location]. Please visit the actual location."
6. Increment `suspiciousResolutionCount` on official's Firestore profile. If this reaches 3 → auto-notify district admin.

---

### Agent 5 — Predictive Hotspot Engine

**Trigger:** Firebase Scheduled Function — runs every Sunday at 2 AM IST.

**What it does:** Analyses historical complaint data from Firestore (or BigQuery if data > 10k records) to generate per-ward, per-category, 30-day complaint volume forecasts.

**Free-tier implementation:**
```typescript
// Simple seasonal decomposition without BigQuery (for demo)
// Group last 90 days of resolved issues by: ward × category × week_of_year
// Calculate average complaints per week
// Apply simple moving average for 4-week forecast
// Store results in Firestore /predictions/{ward_id} document
// Google Maps Heatmap layer reads from this collection
```

**For demo purposes:** Pre-seed `predictions` collection with realistic data for 3-4 wards showing monsoon waterlogging spike prediction. The algorithm should run on real data in production, but for the hackathon demo, pre-seeded predictions that look real are acceptable and should be clearly labelled as "based on historical patterns."

**Output to Firestore:**
```typescript
interface WardPrediction {
  wardId: string;
  forecastPeriod: '30_days';
  generatedAt: Timestamp;
  hotspots: Array<{
    lat: number;
    lng: number;
    predictedIssueCount: number;
    dominantCategory: string;
    confidence: 'low' | 'medium' | 'high';
  }>;
}
```

---

## 7. Data Schema — Firestore Collections

> **For AI tools:** Use these exact field names. Do not rename fields. All TypeScript types for these schemas live in `src/types/`. Every Firestore query must have a corresponding index defined in `firestore.indexes.json`.

### Collection: `issues`

```typescript
interface Issue {
  // Identifiers
  id: string;                          // Firestore auto-ID
  publicTrackingId: string;            // e.g., "CS-2847-XKQM"
  citizenAnonymousId: string;          // Firebase anonymous UID — NEVER expose to officials

  // Location
  gpsLat: number;
  gpsLng: number;
  gpsAccuracy: number;                 // metres
  geohash: string;                     // for geo-radius queries (geofire-common)
  geopoint: GeoPoint;                  // Firestore GeoPoint
  ward: string;                        // derived by Agent 3
  address: string;                     // reverse geocoded display string (optional)

  // Classification (from Agent 1)
  category: string;
  severity: 1 | 2 | 3 | 4 | 5;
  confidence: number;
  geminiDescription: string;
  isValidIssue: boolean;

  // Evidence
  photoUrls: string[];                 // Cloud Storage URLs (citizen photos)
  textDescription: string;

  // Deduplication (from Agent 2)
  canonicalThreadId: string;           // self if original, points to parent if merged
  corroborationCount: number;          // how many other reports merged into this
  credibilityWeight: number;
  corroborations: string[];            // array of merged issue IDs

  // Routing (from Agent 3)
  assignedOfficialId: string;
  department: string;
  slaDeadline: Timestamp;
  convergenceAlert: boolean;
  nearbyIssueIds: string[];

  // Status lifecycle
  status: 'pending_classification' | 'pending_deduplication' | 'pending_routing' |
          'assigned' | 'in_progress' | 'pending_verification' | 'disputed' |
          'resolved' | 'rejected' | 'error_processing' | 'merged';
  statusHistory: Array<{
    status: string;
    timestamp: Timestamp;
    changedBy: string;  // 'system' | official UID
    note?: string;
  }>;

  // Resolution (from Agent 4)
  resolutionAttempts: Array<{
    attemptId: string;
    officialId: string;
    resolutionPhotoUrl: string;
    resolutionGpsLat: number;
    resolutionGpsLng: number;
    submittedAt: Timestamp;
    agent4Result: 'pass' | 'gps_fraud' | 'visual_fraud' | 'awaiting_citizen';
    gpsDistance?: number;
    visualSimilarity?: number;
    citizenResponse?: 'confirmed' | 'disputed' | 'timeout';
    citizenRespondedAt?: Timestamp;
  }>;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp;

  // Gamification
  upvoteCount: number;                 // citizens can upvote issues they also face
  upvotedByIds: string[];             // anonymous UIDs to prevent double-voting
}
```

### Collection: `officials`

```typescript
interface Official {
  id: string;                          // Firebase Auth UID
  phone: string;                       // for OTP auth
  name: string;                        // display name
  role: 'officer' | 'supervisor' | 'admin';
  ward: string;
  department: string;
  isActive: boolean;

  // Performance metrics
  totalAssigned: number;
  totalResolvedInSLA: number;
  totalResolvedOutOfSLA: number;
  suspiciousResolutionCount: number;   // incremented by Agent 4 fraud detection
  averageResolutionTimeHours: number;

  createdAt: Timestamp;
  lastActiveAt: Timestamp;
}
```

### Collection: `predictions`

```typescript
interface WardPrediction {
  wardId: string;
  forecastPeriod: '30_days';
  generatedAt: Timestamp;
  hotspots: Array<{
    lat: number;
    lng: number;
    predictedIssueCount: number;
    dominantCategory: string;
    confidence: 'low' | 'medium' | 'high';
  }>;
}
```

### Collection: `wards`

```typescript
interface Ward {
  id: string;               // e.g., "ward_07"
  name: string;             // e.g., "Ward 7 - Koregaon Park"
  centerLat: number;
  centerLng: number;
  boundaryGeohashes: string[];  // approximate boundary for ward lookup
  officials: {              // department → officialId mapping
    roads: string;
    drainage: string;
    electricity: string;
    sanitation: string;
    water_supply: string;
    parks: string;
    municipal: string;
  };
  supervisorId: string;
}
```

### Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Issues: citizens can create, officials can update assigned issues only
    match /issues/{issueId} {
      allow read: if true; // public read for transparency
      allow create: if request.auth != null
                    && request.resource.data.citizenAnonymousId == request.auth.uid
                    && request.resource.data.status == 'pending_classification';
      allow update: if
        // Official updating their own assigned issue
        (request.auth != null
          && get(/databases/$(database)/documents/officials/$(request.auth.uid)).data.role in ['officer', 'supervisor', 'admin']
          && (resource.data.assignedOfficialId == request.auth.uid
              || get(/databases/$(database)/documents/officials/$(request.auth.uid)).data.role in ['supervisor', 'admin']))
        // OR Cloud Functions (using Admin SDK, bypasses rules)
        || request.auth.token.admin == true;
      allow delete: if false; // never delete issues
    }

    // Officials: only admins can write; officials can read their own record
    match /officials/{officialId} {
      allow read: if request.auth.uid == officialId
                  || get(/databases/$(database)/documents/officials/$(request.auth.uid)).data.role == 'admin';
      allow write: if get(/databases/$(database)/documents/officials/$(request.auth.uid)).data.role == 'admin';
    }

    // Predictions: public read, only Cloud Functions write
    match /predictions/{wardId} {
      allow read: if true;
      allow write: if request.auth.token.admin == true;
    }

    // Wards: public read, admin write
    match /wards/{wardId} {
      allow read: if true;
      allow write: if request.auth != null
                   && get(/databases/$(database)/documents/officials/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### Required Firestore Indexes (`firestore.indexes.json`)

```json
{
  "indexes": [
    {
      "collectionGroup": "issues",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "geohash", "order": "ASCENDING" },
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "issues",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "ward", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "issues",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "assignedOfficialId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "slaDeadline", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "issues",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "canonicalThreadId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 8. Full User Flows

### Flow 1: Citizen Reports an Issue

```
1. Citizen opens CivicSense PWA on phone
2. Lands on public map page — sees existing issues as coloured pins
3. Taps "Report an Issue" button (bottom-right FAB)
4. PHOTO STEP:
   a. Camera opens (or gallery option)
   b. Photo taken/selected
   c. Client-side compression runs: target < 500KB (use browser-image-compression npm package)
   d. Photo preview shown with "Looks good? / Retake" options
5. LOCATION STEP:
   a. Requests GPS automatically (HTML5 Geolocation API)
   b. If accuracy > 100m: show warning "GPS signal weak. Please step outside or drop pin manually."
   c. Shows Google Map with pin at detected location
   d. Citizen can drag pin to correct location
   e. Display address from reverse geocoding (Google Geocoding API)
6. DESCRIPTION STEP (optional):
   a. Text field: "Describe the issue (optional)"
   b. Category selector (shown as chips, not dropdown): Pothole / Waterlogging / Broken Light / Garbage / Other
   c. Note: AI will auto-detect category from photo; citizen category helps corroborate
7. REVIEW STEP:
   a. Show: photo thumbnail, map pin, category, description
   b. Privacy notice: "Your personal details are never shared. You'll receive an anonymous tracking ID."
8. SUBMIT:
   a. Upload compressed photo to Cloud Storage at path: `issues/{issueId}/report_photo.jpg`
   b. Create Firestore document in `issues` with status `pending_classification`
   c. Show success screen with public tracking ID: "CS-2847-XKQM"
   d. "Track your issue" link → /track/CS-2847-XKQM
   e. Option to add to home screen (PWA install prompt)
9. BACKGROUND (Cloud Function fires):
   a. Agent 1 classifies photo (10–30 seconds)
   b. Agent 2 deduplicates
   c. Agent 3 routes and sets SLA
10. Real-time: Citizen's tracking page auto-updates as status changes
```

### Flow 2: Official Resolves an Issue

```
1. Official logs in at /official/login
   a. Enters registered phone number
   b. Receives OTP via Firebase Phone Auth
   c. Verified → redirected to /official/queue
2. Sees list of assigned open issues, sorted by SLA deadline (most urgent first)
3. Each ticket shows: category, location, photo, days remaining on SLA, credibility weight
4. Official taps a ticket → opens detail view
5. FIELD VISIT: Official goes to physical location
6. RESOLUTION UPLOAD:
   a. Takes fresh photo at the location
   b. GPS is captured automatically from phone
   c. Adds resolution note: "Pothole filled with asphalt. Completed by [contractor name]."
   d. Submits resolution
7. BACKGROUND (Agent 4 fires):
   a. Stage 1: GPS check (< 1 second)
   b. If GPS check fails → shown immediately: "❌ Resolution rejected. Your current GPS location ([X] km away) does not match the issue location. Please go to the actual location."
   c. If GPS passes → Stage 2: Gemini visual similarity (5–15 seconds)
   d. If visual check fails → "❌ Resolution rejected. The uploaded photo does not appear to show the same location as the original report. Supervisor has been notified."
   e. If both pass → "✓ Evidence verified. Citizen confirmation requested."
8. CITIZEN NOTIFICATION:
   a. Push notification to citizen's device (if FCM token stored)
   b. SMS fallback (if phone number provided — optional)
   c. 48-hour timer starts
9. If citizen confirms → ticket resolves, official's performance stats update
10. If citizen disputes → status reverts to assigned, supervisor notified
```

### Flow 3: SLA Breach & Escalation

```
Scheduled Cloud Function runs every hour:
1. Query all issues where status = 'assigned' OR 'in_progress'
   AND slaDeadline < now()
2. For each breached issue:
   a. First breach (0–24h overdue): send reminder FCM to assigned official
   b. 24h+ overdue: escalate to supervisor (set escalatedToId to supervisor)
      - Official's `totalResolvedOutOfSLA` incremented
      - Issue status updated to 'assigned' with new assignee = supervisor
      - Status history entry added: "Auto-escalated: SLA breach 24h+. Previous assignee: [officer name]"
   c. 72h+ overdue: escalate to district admin
      - Notify admin via FCM
      - Mark issue with `criticalEscalation: true` (visible as red badge on public dashboard)
3. Update ward performance score in real-time (Firestore write)
```

### Flow 4: Convergence Alert

```
When Agent 3 detects 2+ open issues within 100m of a new report:
1. Official receives notification: "💡 Convergence opportunity: 2 open issues nearby.
   Pothole [100m north] + Drainage blockage [80m north-east].
   Batch these into one field visit to save time."
2. Official can view the nearby issues on a small inline map
3. Official can "Accept convergence" — this creates a batch ticket linking all 3 issues
4. When batch is resolved, all linked issues get resolved simultaneously (Agent 4 runs once)
```

---

## 9. Feature Specification — Every Feature Detailed

### F1: Anonymous Public Tracking ID

**Format:** `CS-{4-digit-number}-{4-char-alphanum}`
Example: `CS-2847-XKQM`

**Generation logic (`lib/utils/id-generator.ts`):**
```typescript
export function generatePublicId(): string {
  const num = Math.floor(1000 + Math.random() * 9000); // 1000–9999
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O,I,0,1 (ambiguous)
  let alpha = '';
  for (let i = 0; i < 4; i++) {
    alpha += chars[Math.floor(Math.random() * chars.length)];
  }
  return `CS-${num}-${alpha}`;
}
```

**Uniqueness:** IDs are checked against Firestore before assignment. On collision (extremely rare), regenerate. Do not use a UUID as the public ID — it's not citizen-friendly.

### F2: Live Public Map

- Google Maps JavaScript API with `@googlemaps/js-api-loader`
- Marker colours by status: 🔴 Open, 🟡 In Progress, 🟢 Resolved, ⚫ Escalated
- Marker size scales with `credibilityWeight` (higher weight = larger pin = more citizens affected)
- Marker clustering via `@googlemaps/markerclusterer` (free, official Google library)
- On click: issue card pops up with: category icon, description, severity badge, days open, SLA countdown if assigned, corroboration count
- Heatmap layer (toggleable): shows predictive hotspots in warm colours (yellow → orange → red)
- Real-time: Firestore `onSnapshot` listener updates pins without page refresh
- Filter bar: filter by category, status, ward, date range

### F3: Credibility Weight Display

Show on public map and issue cards as a badge:
```
[👥 1 report]   weight 1.0
[👥 3 reports]  weight 2.0
[✓ Verified]    weight 5.0+
```
This incentivises citizens to corroborate existing issues rather than create duplicates, and gives officials a clear signal of issue urgency.

### F4: SLA Countdown Timer

Visible to:
- Citizens on tracking page
- Public on the main map (on issue click)
- Officials in their queue

Display logic:
```typescript
function formatSLADisplay(slaDeadline: Timestamp, status: string): string {
  if (status === 'resolved') return '✅ Resolved';
  const now = new Date();
  const deadline = slaDeadline.toDate();
  const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours < 0) return `⏰ OVERDUE by ${Math.abs(Math.round(diffHours))}h`;
  if (diffHours < 24) return `⏰ ${Math.round(diffHours)}h remaining`;
  return `⏰ ${Math.round(diffHours / 24)}d ${Math.round(diffHours % 24)}h remaining`;
}
```

### F5: Ward Performance Leaderboard (Public Dashboard)

Shown at `/dashboard`. Updated in real-time via Firestore listeners.

Metrics per ward:
- Total issues reported (30 days)
- % resolved within SLA
- Average resolution time (hours)
- Currently open issues
- Overdue issues count

Render as a sortable table and bar chart (use Chart.js, free). Top ward gets a "🏆 Best performing ward" badge.

### F6: Civic Score (Gamification — Cold Start Tool)

**DO NOT oversell this as the retention mechanism. It is a cold-start adoption tool.**

Per anonymous citizen ID:
- +10 points: report accepted (passes Agent 1 `isValidIssue` check)
- +5 points: corroboration (your report matched an existing issue)
- +20 points: your report led to a verified resolution
- -5 points: report rejected (invalid image)
- Badges: "First Reporter" (first in your ward), "Issue Tracker" (5 reports), "Community Champion" (20+ verified issues)

Display: `/dashboard` shows a "Your contributions" section (visible only to the citizen, linked to their anonymous ID in localStorage). Never show a global citizen leaderboard — privacy.

### F7: Offline PWA Capability

Minimum offline capability:
- Cached public map page (last loaded state)
- Report form works offline: captures photo, GPS, description, stores in IndexedDB
- On reconnection: auto-submits queued reports
- Service Worker caches: app shell (all JS/CSS), last map state, user's own report history

Use `next-pwa` with `workbox` strategy: `CacheFirst` for static assets, `NetworkFirst` for API calls.

---

## 10. UI/UX Specification

> **For AI tools building UI:** Follow this spec exactly. Do not use component libraries like Material UI, Chakra, or Ant Design. Use Tailwind CSS only. The design should feel like a civic utility app — clean, trustworthy, not flashy.

### Colour System

```css
/* Primary */
--civic-blue: #1A56DB;        /* primary actions, links */
--civic-blue-light: #EBF5FF;  /* backgrounds, hover states */

/* Status colours */
--status-open: #E02424;       /* red — open/urgent */
--status-progress: #FF8800;   /* amber — in progress */
--status-resolved: #057A55;   /* green — resolved */
--status-escalated: #1C1C1E;  /* near-black — escalated/critical */

/* Severity colours */
--severity-1: #9CA3AF;        /* gray */
--severity-2: #60A5FA;        /* light blue */
--severity-3: #F59E0B;        /* amber */
--severity-4: #EF4444;        /* red */
--severity-5: #7C3AED;        /* purple — critical */

/* Neutrals */
--bg-primary: #F9FAFB;
--bg-card: #FFFFFF;
--text-primary: #111827;
--text-secondary: #6B7280;
--border: #E5E7EB;
```

### Typography

```
Font family: System font stack (no Google Fonts — saves external request)
  -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif

Heading 1:  2rem / bold
Heading 2:  1.5rem / semibold
Heading 3:  1.125rem / semibold
Body:       1rem / regular
Caption:    0.875rem / regular / text-secondary
```

### Component Patterns

**Issue Card:**
```
┌─────────────────────────────────────┐
│ 🕳️ Pothole          ⏰ 23h remaining │
│ Ward 7 • 200m away                  │
│ "Deep pothole near bus stop..."     │
│ [📸 Photo]  👥 3 reports  🔴 Open    │
│ CS-2847-XKQM              [Track →] │
└─────────────────────────────────────┘
```

**Status Badge:**
- Open: red background, white text
- In Progress: amber background, dark text
- Resolved: green background, white text
- Escalated: dark background, white text
- Rejected: gray background, dark text

**Report Button (main CTA):**
- Fixed bottom-right FAB on map page
- `bg-civic-blue text-white rounded-full shadow-lg p-4`
- Icon: camera + plus

### Page Layouts

**/ (Public Map)**
- Full-bleed map (100vh)
- Top bar: CivicSense logo + "Report Issue" button (visible on desktop) + stats chip (e.g., "47 issues resolved this week")
- Filter pills below top bar: All | Pothole | Water | Lights | Garbage
- Bottom sheet (mobile): slides up when a pin is clicked, shows issue card
- FAB bottom-right: "📸 Report Issue"

**/report (Report Form)**
- Mobile-first single-column form
- Progress indicator: Photos → Location → Details → Submit (4 steps)
- Back button on each step

**/track/[id] (Tracking Page)**
- Shows full issue timeline: Reported → Classified → Assigned → [Resolution attempts] → Resolved
- Each step has timestamp and who performed it
- Shows SLA countdown prominently
- If `pending_citizen_confirmation`: show "Is your issue fixed?" CTA

**/official/queue (Official Dashboard)**
- Split: pending queue (left) + map (right) on desktop
- Mobile: tabbed
- Sort by: SLA urgency (default), credibility weight, category
- Red highlight on overdue tickets

**/dashboard (Public Dashboard)**
- Stats row at top: Total issues, Resolved this month, Avg resolution time, Escalated
- Ward leaderboard table
- Category breakdown chart (Chart.js donut)
- Predictive heatmap (toggleable overlay on Google Maps)
- "Recent resolutions" feed (before/after photos)

---

## 11. API & Integration Contracts

### Google Maps JavaScript API

```typescript
// lib/firebase/maps.ts
import { Loader } from '@googlemaps/js-api-loader';

export const mapsLoader = new Loader({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
  version: 'weekly',
  libraries: ['places', 'geometry', 'visualization'],
});

// Always use the loader pattern — do NOT put the script tag in HTML directly
// This ensures the API loads once and is shared across components
```

**Required Maps API types to enable (in GCP Console):**
- Maps JavaScript API
- Geocoding API (for reverse geocoding)
- Places API (for address autocomplete on location picker)

All three are within the $200/month free credit. At demo scale, cost will be < $5.

### Gemini API (`@google/genai` SDK)

```typescript
// lib/gemini/classify.ts
import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function classifyIssuePhoto(
  photoBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<Agent1Output> {
  const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: AGENT1_SYSTEM_PROMPT },  // from prompts.ts
          { inlineData: { data: photoBase64, mimeType } },
          { text: 'Classify this civic issue.' },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',  // force JSON output
      temperature: 0.1,                       // low temperature for classification
    },
  });

  const responseText = result.response.text();
  return JSON.parse(responseText) as Agent1Output;
}
```

### Firebase Cloud Functions — onIssueCreate

```typescript
// functions/src/triggers/onIssueCreate.ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { runAgent1 } from '../agents/agent1';
import { runAgent2 } from '../agents/agent2';
import { runAgent3 } from '../agents/agent3';

export const onIssueCreate = onDocumentCreated(
  'issues/{issueId}',
  async (event) => {
    const issueId = event.params.issueId;
    const issueData = event.data?.data();

    if (!issueData || issueData.status !== 'pending_classification') return;

    try {
      // Sequential pipeline — each agent awaits the previous
      const agent1Result = await runAgent1(issueId, issueData);
      if (!agent1Result.isValidIssue) return; // pipeline stops

      const agent2Result = await runAgent2(issueId, agent1Result);
      const agent3Result = await runAgent3(issueId, agent1Result, agent2Result);

      console.log(`Pipeline complete for ${issueId}:`, { agent1Result, agent2Result, agent3Result });
    } catch (error) {
      console.error(`Pipeline failed for ${issueId}:`, error);
      // Mark issue as error_processing — never leave in pending state
      await admin.firestore().doc(`issues/${issueId}`).update({
        status: 'error_processing',
        errorMessage: String(error),
      });
    }
  }
);
```

### Ward Lookup

```typescript
// lib/geo/ward-lookup.ts
// For demo: hardcode ward polygons for one city (e.g., Coimbatore or generic demo city)
// In production: use Nominatim reverse geocode or a GeoJSON ward boundary file

const DEMO_WARDS = [
  {
    id: 'ward_01',
    name: 'Ward 1 - Central',
    centerLat: 11.0168,
    centerLng: 76.9558,
    radiusKm: 1.5,
  },
  {
    id: 'ward_02',
    name: 'Ward 2 - North',
    centerLat: 11.0300,
    centerLng: 76.9600,
    radiusKm: 1.5,
  },
  // Add 4-6 demo wards
];

export function getWardFromGPS(lat: number, lng: number): string {
  // Find nearest ward centre using Haversine
  let nearest = DEMO_WARDS[0];
  let minDist = Infinity;
  for (const ward of DEMO_WARDS) {
    const dist = haversineDistance({ lat, lng }, { lat: ward.centerLat, lng: ward.centerLng });
    if (dist < minDist) {
      minDist = dist;
      nearest = ward;
    }
  }
  return nearest.id;
}
```

---

## 12. Edge Cases & Guardrails

> **For AI tools:** Every edge case here has an explicit handling strategy. Do not "simplify" these away. They are critical for demo reliability and judge scrutiny.

### E1: GPS Accuracy Too Low

**Condition:** `gpsAccuracy > 100` metres (common indoors or with weak signal)

**Handling:**
```typescript
// In useLocation hook
if (position.coords.accuracy > 100) {
  setGpsWarning('GPS signal weak. For best accuracy, step outdoors and wait 10 seconds.');
  // Still allow submission but flag in Firestore: gpsVerified: false
  // Show manual pin-drop as primary option
}
// Reject if accuracy > 500m — this is clearly indoor/spoofed
if (position.coords.accuracy > 500) {
  setGpsError('Cannot determine location accurately. Please enable GPS or use the map to drop a pin manually.');
}
```

### E2: Gemini API Rate Limit (15 req/min on free tier)

**Handling:**
```typescript
// In Cloud Function — exponential backoff retry
async function callGeminiWithRetry(fn: () => Promise<any>, maxRetries = 3): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.status === 429) {
        // Rate limited
        const delay = Math.pow(2, attempt) * 4000; // 4s, 8s, 16s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error; // non-rate-limit errors: rethrow
    }
  }
  throw new Error('Gemini rate limit exceeded after max retries');
}
```

**Demo safety:** During live demo, pre-classify 3-4 test issues before the presentation so Gemini has already processed them. The demo's "live" classification is done on 1 fresh report — well within rate limits.

### E3: Photo Upload Fails Mid-Submission

**Handling:**
- Use resumable uploads via Firebase Storage SDK (handles interruptions automatically)
- Show progress bar during upload
- On failure: "Upload failed. Your photo is saved. Tap to retry." (store in IndexedDB)
- Never lose citizen data: write Firestore document first with status `upload_pending`, then upload photo, then update `photoUrls`

### E4: Official Submits Resolution with No Network

**Handling:**
- Resolution upload uses same resumable upload pattern
- Firestore offline SDK caches the write locally
- Sync when connectivity returns
- Show "Syncing..." indicator if offline

### E5: Duplicate Public Tracking ID (extremely rare but possible)

**Handling:**
```typescript
async function assignUniquePublicId(): Promise<string> {
  let id = generatePublicId();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.collection('issues').where('publicTrackingId', '==', id).limit(1).get();
    if (existing.empty) return id;
    id = generatePublicId();
    attempts++;
  }
  // Fallback: use Firestore auto-ID prefix
  return `CS-${Date.now().toString(36).toUpperCase().slice(-8)}`;
}
```

### E6: Agent 1 Returns Invalid JSON

**Handling:**
```typescript
function parseAgent1Response(raw: string): Agent1Output {
  try {
    // Clean common Gemini JSON formatting issues
    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    console.error('Gemini returned invalid JSON:', raw);
    // Graceful fallback — do not crash pipeline
    return {
      category: 'other',
      severity: 3,
      confidence: 0.1,
      geminiDescription: 'Unable to classify automatically. Marked for manual review.',
      isValidIssue: true, // assume valid to not penalise citizen
    };
  }
}
```

### E7: Citizen Confirmation Timeout

**Handling:**
```typescript
// Scheduled function: runs every 6 hours
// Query issues with status = 'pending_citizen_confirmation'
// AND citizenConfirmationSentAt < now() - 48 hours
// Action: auto-resolve with note "Resolved by default — no citizen response within 48h"
```

### E8: Fraudulent Image (Not a Civic Issue)

**Handling:**
- Agent 1 returns `isValidIssue: false`
- Do NOT show rejection to public map (obviously)
- Notify citizen via their tracking page: "Your report (CS-XXXX) was not accepted. Reason: [rejectionReason]. You can submit a new report if the issue is still present."
- Do NOT increment their Civic Score
- Apply rate-limit: if same anonymous UID submits 3+ rejected reports within 1 hour → temporarily block (set `blockedUntil` timestamp for 2 hours)

### E9: Ward Boundary Edge Case (GPS on boundary)

**Handling:**
- Find nearest ward centroid using Haversine
- If distance to two wards is within 200m: assign to both (write issue to both ward queues)
- Both ward officials see the ticket, first to respond "claims" it
- After 24h with no response from either: escalate to supervisor

### E10: Official Account Trying to View Reporter Identity

**Handling:**
- Never write `citizenAnonymousId` to any field an official can read in their dashboard query
- The official's Firestore read path (`/official/queue`) only returns: category, location, photo, description, tracking ID, credibility weight
- Firestore Security Rules explicitly deny officials from reading `citizenAnonymousId`
- Admin SDK (Cloud Functions) can read it but only for legitimate system operations
- Every access to `citizenAnonymousId` by a Cloud Function is logged to Cloud Audit Logs

### E11: Photo Without EXIF GPS

**Handling:**
- Some phones strip EXIF data before upload (iOS does this for privacy)
- Do not rely on EXIF — always use the HTML5 Geolocation API or manual pin-drop
- EXIF data should be read as a secondary confirmation only, never as primary GPS source

### E12: Monsoon Surge (Traffic Spike)

**Handling for demo scale:**
- Firestore scales automatically on free tier (to a point)
- Cloud Functions auto-scale
- Image compression (target < 500KB) keeps Storage bandwidth low
- For real production: add `RATE_LIMIT_REPORTS_PER_MINUTE = 100` at Cloud Function level

### E13: Demo Environment Seed Data

**Always maintain a `scripts/seed-demo-data.ts` script that:**
- Creates 3-4 demo wards with official accounts
- Seeds 15-20 representative issues in various statuses
- Includes 2-3 "pending_citizen_confirmation" issues ready to be confirmed live
- Includes 1 issue with a pre-computed fraud detection (for demo)
- Run before every demo: `npm run seed:demo`

---

## 13. Security & Privacy Architecture

### The Three Privacy Non-Negotiables

**1. Anonymous citizen identity**
- Citizens auth via Firebase Anonymous Auth → get a UID like `cAbc123DefG...`
- This UID is stored in `citizenAnonymousId` in Firestore — only readable by Cloud Functions (admin SDK) and admin-role officials
- The `publicTrackingId` (CS-XXXX-YYYY) is completely separate — not derived from UID
- Officials see: tracking ID, category, location, photo — never the Firebase UID
- If citizen opts to provide phone number for notifications: store it encrypted in a separate collection (`citizen_contacts/{tracking_id}`), never in the main `issues` document

**2. Immutable resolution evidence**
- Once a resolution photo is submitted by an official, it is stored permanently in Cloud Storage
- It cannot be deleted by the official or supervisor
- Only an admin with a formal audit justification (stored in Firestore) can remove it
- The `resolutionAttempts` array in Firestore is append-only (Security Rules enforce this)

**3. Official accountability trail**
- Every status change is logged in `statusHistory` with timestamp and actor
- Every resolution attempt is logged permanently, including fraud flags
- `suspiciousResolutionCount` can only increase, never decrease, by normal officials
- The public dashboard shows each ward's resolution rate — social accountability through transparency

### OWASP Considerations for Demo

- **XSS:** Next.js escapes by default. Never use `dangerouslySetInnerHTML` with user content.
- **CSRF:** Not applicable for Firebase SDK (uses Firebase tokens, not cookies)
- **Injection:** Firestore SDK parameterises all queries. Never construct Firestore query strings from user input.
- **Data validation:** All user inputs validated on both client (Zod) and Cloud Function (server) before writing to Firestore
- **API key exposure:** All sensitive keys in `.env.local` (never committed). `NEXT_PUBLIC_` prefix only for non-sensitive keys (Maps key is fine — restrict it by domain in GCP Console)

### Environment Key Security

```
SENSITIVE (server-only, Cloud Functions):
- GEMINI_API_KEY          → never prefix with NEXT_PUBLIC_

PUBLIC (safe to expose in browser bundle):
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- NEXT_PUBLIC_GOOGLE_MAPS_KEY    → restrict to your domain in GCP Console
```

---

## 14. Testing Strategy

> **For AI tools generating tests:** Write tests that verify behaviour, not implementation. Every test must describe a real scenario, not "it calls function X." Use Vitest for unit/integration, Playwright for E2E.

### Unit Tests (critical paths only)

**`tests/unit/haversine.test.ts`**
```typescript
describe('haversineDistance', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistance({lat:11.01, lng:76.95}, {lat:11.01, lng:76.95})).toBe(0);
  });
  it('returns ~111km for 1 degree latitude difference', () => {
    const dist = haversineDistance({lat:0, lng:0}, {lat:1, lng:0});
    expect(dist).toBeCloseTo(111, 0);
  });
  it('correctly identifies 60m separation', () => {
    const dist = haversineDistance({lat:11.0168, lng:76.9558}, {lat:11.01625, lng:76.9558});
    expect(dist).toBeGreaterThan(50);
    expect(dist).toBeLessThan(70);
  });
});
```

**`tests/unit/agent2.test.ts`**
```typescript
describe('Agent 2 deduplication', () => {
  it('merges a new report into an existing issue within 75m same category', async () => { ... });
  it('does NOT merge reports of different categories even if within 75m', async () => { ... });
  it('creates a new thread for a report 100m from existing same-category issue', async () => { ... });
  it('increments credibility weight correctly on merge', async () => { ... });
  it('triggers autoEscalate flag when credibilityWeight exceeds 5.0', async () => { ... });
});
```

**`tests/unit/agent4.test.ts`**
```typescript
describe('Agent 4 fraud detection', () => {
  it('flags GPS fraud when resolution is 150m from original', () => {
    const result = checkGPSFraud(
      { lat: 11.0168, lng: 76.9558 },
      { lat: 11.0183, lng: 76.9558 }  // ~165m away
    );
    expect(result.pass).toBe(false);
    expect(result.reason).toBe('gps_mismatch');
  });
  it('passes GPS check when resolution is 40m from original', () => {
    const result = checkGPSFraud(
      { lat: 11.0168, lng: 76.9558 },
      { lat: 11.01644, lng: 76.9558 }  // ~40m away
    );
    expect(result.pass).toBe(true);
  });
  it('handles missing GPS coordinates gracefully', () => {
    const result = checkGPSFraud(
      { lat: 11.0168, lng: 76.9558 },
      { lat: NaN, lng: NaN }
    );
    expect(result.pass).toBe(false);
    expect(result.reason).toBe('gps_unavailable');
  });
});
```

**`tests/unit/id-generator.test.ts`**
```typescript
describe('generatePublicId', () => {
  it('generates ID in CS-XXXX-YYYY format', () => {
    const id = generatePublicId();
    expect(id).toMatch(/^CS-\d{4}-[A-Z0-9]{4}$/);
  });
  it('does not include ambiguous characters (O, I, 0, 1)', () => {
    for (let i = 0; i < 100; i++) {
      const id = generatePublicId();
      expect(id).not.toMatch(/[OI01]/);
    }
  });
  it('generates unique IDs across 1000 calls (collision test)', () => {
    const ids = new Set(Array.from({ length: 1000 }, generatePublicId));
    expect(ids.size).toBeGreaterThan(990); // allow < 1% collision
  });
});
```

### Integration Tests

**`tests/integration/report-flow.test.ts`**
```typescript
// Uses Firebase Emulator Suite
// Test the complete pipeline: submit issue → Agent 1 → Agent 2 → Agent 3
describe('Full report pipeline', () => {
  beforeAll(() => startFirebaseEmulator());
  afterAll(() => stopFirebaseEmulator());

  it('completes full classification → deduplication → routing pipeline', async () => {
    const issueId = await submitTestIssue({ lat: 11.0168, lng: 76.9558, category: 'pothole' });
    await waitForStatus(issueId, 'assigned', 30000); // wait up to 30s
    const issue = await getIssue(issueId);
    expect(issue.assignedOfficialId).toBeDefined();
    expect(issue.slaDeadline).toBeDefined();
    expect(issue.publicTrackingId).toMatch(/^CS-/);
  });

  it('merges duplicate report into existing thread', async () => {
    const original = await submitTestIssue({ lat: 11.0168, lng: 76.9558, category: 'pothole' });
    await waitForStatus(original, 'assigned');
    const duplicate = await submitTestIssue({ lat: 11.01685, lng: 76.9558, category: 'pothole' }); // 5m away
    await waitForStatus(duplicate, 'merged');
    const originalIssue = await getIssue(original);
    expect(originalIssue.corroborationCount).toBe(1);
    expect(originalIssue.credibilityWeight).toBeGreaterThan(1.0);
  });
});
```

**`tests/integration/resolution-fraud.test.ts`**
```typescript
describe('Agent 4 resolution fraud detection', () => {
  it('blocks resolution with wrong GPS location', async () => { ... });
  it('allows legitimate resolution and triggers citizen confirmation', async () => { ... });
  it('re-opens issue when citizen disputes resolution', async () => { ... });
  it('auto-closes issue when citizen does not respond after 48h', async () => { ... });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/citizen-journey.test.ts
test('citizen can report, track, and confirm resolution of an issue', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/CivicSense/);

  // Start report
  await page.click('[data-testid="report-fab"]');
  await page.setInputFiles('[data-testid="photo-input"]', 'tests/fixtures/pothole.jpg');
  await page.click('[data-testid="confirm-photo"]');

  // Set location
  await page.click('[data-testid="use-gps"]');
  await expect(page.locator('[data-testid="location-confirmed"]')).toBeVisible({ timeout: 10000 });
  await page.click('[data-testid="next-step"]');

  // Description
  await page.fill('[data-testid="description-input"]', 'Large pothole near bus stop');
  await page.click('[data-testid="submit-report"]');

  // Confirmation screen
  await expect(page.locator('[data-testid="tracking-id"]')).toBeVisible();
  const trackingId = await page.textContent('[data-testid="tracking-id"]');
  expect(trackingId).toMatch(/CS-\d{4}-[A-Z0-9]{4}/);
});
```

### Firebase Emulator Setup

```json
// firebase.json (add to existing)
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "functions": { "port": 5001 },
    "storage": { "port": 9199 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

Run tests with: `firebase emulators:exec "npm test"`

---

## 15. Deployment — Free Tier Step by Step

### Pre-Deployment Checklist

```
□ Firebase project created (Spark free plan)
□ Firestore database created (Native mode, asia-south1 region)
□ Firebase Auth enabled: Anonymous + Phone providers
□ Firebase Storage bucket created
□ Google Maps API key created, restricted to your domain
□ Gemini API key created (Google AI Studio: aistudio.google.com)
□ All .env.local variables set
□ Firestore security rules deployed
□ Firestore indexes deployed
□ Firebase Cloud Functions deployed (check Spark plan restrictions)
□ Demo seed data seeded
□ Test the full report flow end-to-end once
□ Record a 2-minute demo video as backup (in case live demo fails)
```

### Step-by-Step Deployment

```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Login and init
firebase login
firebase init

# 3. Select: Firestore, Functions, Hosting, Storage, Emulators

# 4. Build Next.js
npm run build

# 5. Deploy Firestore rules and indexes
firebase deploy --only firestore

# 6. Deploy Storage rules
firebase deploy --only storage

# 7. Deploy Cloud Functions
cd functions && npm install && npm run build && cd ..
firebase deploy --only functions

# 8. Deploy hosting (if using Firebase Hosting static export)
firebase deploy --only hosting

# === OR: Deploy to Cloud Run (recommended for full Next.js) ===

# 9. Build Docker image (Cloud Run deployment)
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/civicsense

# 10. Deploy to Cloud Run
gcloud run deploy civicsense \
  --image gcr.io/YOUR_PROJECT_ID/civicsense \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=xxx,...

# 11. Get the deployed URL and test
```

### Using AI Studio for Quick Deploy

1. Go to aistudio.google.com
2. Create new project → Import from GitHub
3. Connect your repository
4. Click "Deploy" — AI Studio handles Cloud Run deployment automatically
5. Set environment variables in the AI Studio secrets panel

### Post-Deploy Verification

```bash
# Run smoke test against production URL
CIVICSENSE_URL=https://your-deployment-url npm run test:smoke

# smoke test: checks home page loads, map initialises, report form renders
```

---

## 16. Environment Variables & Secrets

```bash
# .env.local — NEVER COMMIT THIS FILE

# Firebase Client SDK (safe for browser)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc

# Google Maps (safe for browser — restrict by domain in GCP Console)
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSy...

# Gemini API (SERVER ONLY — do not prefix with NEXT_PUBLIC_)
GEMINI_API_KEY=AIzaSy...

# Firebase Admin SDK (SERVER ONLY — for Cloud Functions, not Next.js client)
# This is auto-provided in Cloud Functions environment — you only need it locally for testing
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# App Config
NEXT_PUBLIC_APP_ENV=development    # or 'production'
NEXT_PUBLIC_DEMO_MODE=false        # set to 'true' to skip real Gemini calls and use mock responses
```

### `.env.example` (commit this)

```bash
# Copy this file to .env.local and fill in your values
# See PROJECT_BRAIN.md Section 16 for instructions

NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_key
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_DEMO_MODE=false
```

---

## 17. What AI Tools Must NOT Do

> **This section is critical. Any AI assistant working on this codebase must read and obey these rules. They exist to protect architectural integrity, free-tier compliance, and demo reliability.**

### Architecture Rules

- ❌ **DO NOT** merge agent logic. Each agent (`agent1-classify.ts`, `agent2-dedupe.ts`, etc.) must remain a separate file with a single exported `run` function.
- ❌ **DO NOT** call the Gemini API from the browser/client side. All Gemini calls happen in Cloud Functions only (serverless, never exposed to browser).
- ❌ **DO NOT** put sensitive API keys in `NEXT_PUBLIC_` environment variables.
- ❌ **DO NOT** use `console.log` with user data (photos, locations, IDs) in production code. Use `console.log` only for non-PII data in dev mode.
- ❌ **DO NOT** allow the `citizenAnonymousId` field to appear in any response that goes to an official's browser session.
- ❌ **DO NOT** add any database other than Firestore. No PostgreSQL, no MongoDB, no SQLite.
- ❌ **DO NOT** use `dangerouslySetInnerHTML` anywhere.
- ❌ **DO NOT** create a `/api/*` route that makes outbound calls to paid external services.
- ❌ **DO NOT** skip the Agent 4 GPS check stage even if it seems redundant — it is the first line of fraud detection and must always run before the more expensive Gemini embedding check.

### Free Tier Rules

- ❌ **DO NOT** use Firebase Blaze plan features (outbound network calls from Cloud Functions to non-Google domains). All external calls from functions must go to `*.googleapis.com` or `*.google.com`.
- ❌ **DO NOT** store original high-resolution photos. Always compress to < 500KB before upload. Use `browser-image-compression` on client.
- ❌ **DO NOT** create Firestore listeners that watch entire collections without filters. Always use `where()` clauses to limit listener scope (prevents read quota drain).
- ❌ **DO NOT** call Gemini from every Firestore write — only from the explicit pipeline triggers.
- ❌ **DO NOT** store embeddings as full float arrays in Firestore (expensive storage). Compute them on-the-fly in Agent 4, never persist.

### UI Rules

- ❌ **DO NOT** install Material UI, Chakra UI, Ant Design, or any component library. Tailwind CSS only.
- ❌ **DO NOT** add Google Fonts. Use system font stack (defined in tailwind.config.js).
- ❌ **DO NOT** use `alert()`, `confirm()`, or `prompt()` browser dialogs. Use the Modal component from `src/components/ui/Modal.tsx`.
- ❌ **DO NOT** put form submit handlers on `<form onSubmit>`. Use button `onClick` handlers (matches Claude Artifacts requirement and avoids default form submission behaviour).

### Data Integrity Rules

- ❌ **DO NOT** allow deletion of any issue document from Firestore — set Firestore rules to deny all deletes on the `issues` collection.
- ❌ **DO NOT** allow overwriting the `resolutionAttempts` array — only append to it.
- ❌ **DO NOT** allow status to go backwards (e.g., `resolved` → `assigned`) without going through a `disputed` state first, and only via supervisor action.

---

## 18. Known Pitfalls & Fixes

### Pitfall 1: Google Maps not rendering on first load

**Symptom:** Blank map div, console error `google is not defined`

**Fix:** Always use `@googlemaps/js-api-loader` and await the `load()` promise before instantiating `new google.maps.Map()`. The map must be instantiated inside a `useEffect` with the loader promise resolved first.

### Pitfall 2: Firestore geospatial queries returning no results despite nearby issues existing

**Symptom:** Agent 2 always creates new issues instead of merging

**Fix:** Make sure `geohash` field is being written correctly on issue creation. Use `geohashForPoint([lat, lng])` from `geofire-common`. The `geohashQueryBounds` function returns ranges that must be queried with `orderBy('geohash').startAt(bound.startHash).endAt(bound.endHash)`. You also need a composite index for `geohash + category` — check `firestore.indexes.json` is deployed.

### Pitfall 3: Cloud Functions failing with "billing account not set up"

**Symptom:** Functions deploy but throw `BILLING_NOT_ENABLED` at runtime when making any API call

**Fix:** Ensure the Firebase project is on Spark (free) plan. The Spark plan DOES allow Cloud Functions to call Google APIs (including Gemini). The restriction is on non-Google outbound calls. If you see this error, check you haven't accidentally called a non-Google URL.

### Pitfall 4: Anonymous Auth session lost between page loads

**Symptom:** A new anonymous UID is generated on every page load — citizen cannot track their own reports

**Fix:** Firebase Anonymous Auth persists in localStorage by default. Ensure `firebase/auth` is initialised once (in `lib/firebase/config.ts`) and you use `onAuthStateChanged` to restore the session. Do NOT call `signInAnonymously()` without first checking `auth.currentUser`.

### Pitfall 5: Gemini returning markdown-wrapped JSON

**Symptom:** `JSON.parse()` throws on Gemini response even though content looks correct

**Fix:** Despite setting `responseMimeType: 'application/json'`, Gemini sometimes wraps output in \```json blocks. Always clean with:
```typescript
const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
```
See `parseAgent1Response()` in Section 12, Edge Case E6.

### Pitfall 6: Next.js App Router + Firebase Admin SDK module error

**Symptom:** `Module not found: Can't resolve 'firebase-admin'` in Next.js page components

**Fix:** Firebase Admin SDK must only run in Cloud Functions or Next.js Route Handlers (`app/api/*/route.ts`). It cannot be imported in client components or page components. If you need server-side Firestore access in Next.js, use Route Handlers with the Admin SDK, or use the client Firestore SDK with proper security rules.

### Pitfall 7: PWA install prompt not showing

**Symptom:** No "Add to Home Screen" prompt on mobile despite PWA manifest existing

**Fix:** The browser requires HTTPS, a valid manifest with `start_url` and `icons`, and a registered service worker. Check: (1) your deployment URL uses HTTPS, (2) `manifest.json` has at least 192×192 and 512×512 icons, (3) `next-pwa` is generating `sw.js` correctly (check `/sw.js` in browser).

### Pitfall 8: SLA countdown timer not updating live

**Symptom:** Timer shows correct initial value but doesn't count down

**Fix:** The SLA timer must be driven by a `setInterval` on the client, calculating `deadline - now()` every second. It is NOT driven by Firestore updates. The `slaDeadline` is a static Firestore timestamp — the countdown logic is purely client-side calculation.

---

## 19. Demo Script for Judges

> **This is your 5-minute presentation. Rehearse until the demo runs smoothly. Have backup screenshots ready if anything fails.**

### Opening (30 seconds)
Show the Swachhata-MoHUA Play Store review screenshot: "A complaint was prematurely marked as 'resolved' with an unrelated photo uploaded from a completely different location." 

Say: "1.7 crore Indians use Swachhata-MoHUA. This review describes exactly why they don't trust it. We built CivicSense to close this exact failure — fraud-proof resolution, with AI as the auditor."

### Act 1: Citizen Reports (60 seconds)
1. Open CivicSense on your phone (mirrored to screen)
2. Tap the report button
3. Select the pre-taken pothole photo from gallery (do NOT take a new photo during demo — too slow)
4. Location is pre-approved at strong GPS accuracy
5. Submit
6. Show the tracking ID: "CS-2847-XKQM. This citizen is completely anonymous."
7. Show the issue appearing as a red pin on the live map in real time (Firestore listener)

### Act 2: AI Pipeline Running (30 seconds)
Switch to the official dashboard tab (pre-logged in as demo official).
Show the ticket arriving: classified as "Pothole, Severity 4" with Gemini's description visible.
Show: "Two corroborations — another citizen already reported this same pothole 40 metres away. The AI merged them into one verified issue."

### Act 3: Fraud Detection (90 seconds — the climax)
1. As the demo official, tap "Mark Resolved"
2. Upload a photo that is clearly from a different location (pre-prepared: a photo of a park, deliberately wrong)
3. Submit resolution
4. Watch the red fraud warning appear: "❌ Resolution rejected. GPS location is 1.2 km from the original report. Supervisor has been notified."
5. Say: "This is the feature Swachhata doesn't have. The official can't fake this."
6. Now upload the correct photo from the correct location
7. Watch it pass: "✓ Evidence verified. Citizen confirmation requested."

### Act 4: Predictive Heatmap (30 seconds)
Switch to the public dashboard. Toggle on the predictive layer.
Show the heatmap: "Based on the last 3 monsoon seasons, Ward 4 is predicted to have 4× normal waterlogging in the next 30 days. Resources can be pre-deployed before the problem arrives."

### Closing (30 seconds)
"Every team here will build a report form and a dashboard. We built what comes after: the trust layer. Because a civic app that citizens don't trust is just noise. CivicSense makes every resolution provable."

---

## 20. Submission Checklist

```
□ Deployed application URL (GCP Cloud Run or AI Studio deploy)
□ Application is publicly accessible (test in incognito)
□ Application stays live through the evaluation period (do NOT shut down)
□ GitHub repository link (public repository)
□ README.md in repo explains how to run locally
□ Open-source library credits in README (geofire-common, browser-image-compression, @googlemaps/*, etc.)
□ Google Doc link (public viewer access — "anyone with link can view")
□ Google Doc contains:
    □ Problem statement selected: Community Hero
    □ Solution overview
    □ Key features (all 4 agents described)
    □ Technologies used
    □ Google technologies specifically highlighted (Maps, Gemini, Firebase, Cloud Run, BigQuery)
□ DO NOT edit Google Doc after submission (version history is checked)
□ Submitted on BlockseBlock platform (not email)
□ LinkedIn post with #vibe2ship hashtag, tagging Coding Ninjas + Google for Developers

FINAL SANITY CHECKS:
□ The report flow works end-to-end on mobile
□ Agent 4 fraud detection demo works with wrong-location photo
□ Live map shows real-time pin updates when an issue is submitted
□ The official queue shows assigned tickets
□ SLA countdown is ticking
□ Predictive heatmap is visible on dashboard
□ Demo backup video recorded (2 minutes) in case live demo fails
```

---

## Appendix A: Quick-Reference Constants

```typescript
// src/lib/utils/constants.ts

export const DEDUP_RADIUS_METRES = 75;
export const CONVERGENCE_RADIUS_METRES = 100;
export const GPS_FRAUD_THRESHOLD_METRES = 100;
export const VISUAL_SIMILARITY_THRESHOLD = 0.35;
export const CITIZEN_CONFIRMATION_TIMEOUT_HOURS = 48;
export const AUTO_ESCALATION_THRESHOLD_HOURS = 24;
export const DISTRICT_ESCALATION_THRESHOLD_HOURS = 72;
export const SUSPICIOUS_RESOLUTION_ALERT_COUNT = 3;
export const MAX_REPORTS_PER_USER_PER_DAY = 20;
export const MAX_REPORTS_PER_USER_PER_HOUR_PER_AREA = 5;
export const MAX_PHOTO_SIZE_KB = 500;
export const GPS_ACCURACY_REJECT_METRES = 500;
export const GPS_ACCURACY_WARN_METRES = 100;

export const CREDIBILITY_WEIGHT = {
  BASE_REPORT: 1.0,
  CORROBORATION: 0.5,
  PHOTO_EVIDENCE: 1.0,
  OFFICIAL_CONFIRMATION: 2.0,
  AUTO_ESCALATE_THRESHOLD: 5.0,
};
```

---

## Appendix B: Gemini API Free Tier Budget

For demo day:
```
Gemini 2.5 Flash:
  Free tier: 1,500 requests/day, 15 req/min
  Agent 1 uses: ~1 request per new report
  Agent 4 uses: ~1 request per resolution attempt (embeddings)
  Budget for demo (8 hours): 1,500 requests
  Expected demo usage: 20-30 requests
  Safety margin: 50x. No risk.

If rate limited during demo (backup plan):
  Set NEXT_PUBLIC_DEMO_MODE=true in production temporarily
  This uses pre-classified mock responses for the demo
  Still shows the same UI — judges see the same result
  Have this toggle ready before demo starts
```

---

*End of PROJECT_BRAIN.md*
*Last updated: for Vibe2Ship Hackathon, deadline 30 June 2026 11:59 PM*
*Owner: Team CivicSense*
*Version: 1.0*
