# CivicSense

CivicSense is a demo-ready civic reporting PWA for the Vibe2Ship Community Hero prompt. It implements a four-agent trust pipeline: classify reports, deduplicate nearby reports, route by ward/SLA, and verify official resolution evidence with GPS plus visual checks.

## Run Locally

```bash
npm install
npm run check-env
npm run dev:full
```

The app is designed to run with zero real credentials. With the committed `.env.local`, Gemini uses deterministic mocks, Firebase points at the local emulator, and the map renders a list/static fallback when no Google Maps key is present.

Local emulator tests require Java on your PATH because the Firestore and Storage emulators run on the JVM. Playwright E2E requires browser binaries and OS libraries:

```bash
npx playwright install chromium
npx playwright install-deps chromium
```

## Environment Modes

| Env var | Unlocks | Without it |
|---|---|---|
| `GEMINI_API_KEY` | Real AI classification and fraud checks | Mock responses from `src/lib/gemini/mockResponses.ts` |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Real interactive Google Map | Static/list fallback |
| `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false` plus Firebase config | Persistent Firebase project data | Local emulator data |
| Firebase Phone Auth enabled | Real OTP for officials | Emulator OTP simulation |

Run this any time:

```bash
npm run check-env
```

## Scripts

```bash
npm run dev
npm run dev:full
npm run dev:emulators
npm run build
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:all
npm run seed:demo
```

`npm run dev:full` starts Firebase emulators with demo-data import/export and the Next.js dev server. Seed demo data with:

```bash
npm run seed:demo
```

## Agent Pipeline

```text
Citizen report
  -> Agent 1: image classification
  -> Agent 2: geospatial deduplication
  -> Agent 3: ward routing and SLA assignment
  -> Agent 4: GPS fraud check, then visual fraud check
  -> Agent 5: scheduled hotspot prediction
```

Each agent lives in its own file under `src/lib/agents` with a single exported `run` function.

## Demo Script

1. Open `/` and confirm seeded Coimbatore pins are visible.
2. Click a red pin and inspect the issue card.
3. Click `📸 Report`.
4. Upload `public/demo-pothole.jpg`.
5. Confirm location, choose `Pothole`, and enter `Large pothole near RS Puram bus stop`.
6. Submit and copy the `CS-XXXX-XXXX` tracking ID.
7. Open the tracking page and watch status updates.
8. Log in at `/official/login` with the Firebase test phone `+91 9999999999`, OTP `123456`.
9. Check `/official/queue` and `/dashboard`.

## Screenshots To Capture

- Working map with seeded issue pins.
- Report flow review step with photo, location, category, and description.
- Tracking page timeline with SLA countdown.

## Deployment

```bash
npm run build
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/civicsense
gcloud run deploy civicsense \
  --image gcr.io/YOUR_PROJECT_ID/civicsense \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated
```

Firebase assets:

```bash
firebase deploy --only firestore
firebase deploy --only storage
cd functions && npm install && npm run build && cd ..
firebase deploy --only functions
```

## Open Source Credits

Next.js, React, Tailwind CSS, Firebase, Firebase Functions, `@google/genai`, `@googlemaps/js-api-loader`, `@googlemaps/markerclusterer`, `geofire-common`, `browser-image-compression`, Zustand, Chart.js, Vitest, and Playwright.

## Submission Checklist

- [ ] Deployed application URL on GCP Cloud Run or AI Studio
- [ ] Public application tested in incognito
- [x] README explains local run instructions
- [x] Open-source library credits included
- [x] Four-agent pipeline implemented as separate files
- [x] Demo fallback mode for Gemini, Firebase emulator, and Maps
- [ ] Real Firebase project, Maps key, and Gemini key configured for live mode
- [ ] Demo seed data loaded before presentation
- [ ] End-to-end mobile report flow tested against deployment
