# Mobile Requirements & Structure (Draft)

## Goals
- Deliver a fast, field‑friendly mobile experience for contractors.
- Mirror core web workflows (transactions, expenses, incomings, receipts, jobs, schedules, timesheets).
- Share business logic with the web app through the backend `services/` layer and `/api/v1`.

## Target Platforms
- iOS (App Store)
- Android (Google Play)

## Proposed Tech Stack
- **Framework**: React Native + Expo
- **Language**: TypeScript
- **API**: REST JSON via `/api/v1` (Python/FastAPI backend)
- **Auth (initial)**: Session auth for dev testing
- **Auth (future)**: Bearer token (JWT or API token) for mobile
- **State**: Local component state first; add a light store if needed
- **Networking**: Fetch or Axios (decide later)
- **Styling**: Default RN + Expo (add NativeWind later if needed)

## Environment
- `EXPO_PUBLIC_API_BASE_URL` set in `.env`

## App Structure (Proposed)
```
contractorSaas_mobile/
  app/                  # Expo Router screens
    (tabs)/
      home.tsx
      workflow.tsx
      expenses.tsx
      incomings.tsx
      receipts.tsx
      jobs.tsx
      schedule.tsx
      timesheets.tsx
    auth/
      login.tsx
  components/           # Shared UI components
  hooks/                # Data hooks
  services/             # API client + helpers
    api.ts
    clients.ts
    expenses.ts
    incomings.ts
    transactions.ts
    receipts.ts
    jobs.ts
    schedule.ts
    timesheets.ts
    workflow.ts
  constants/
  assets/
```

## API Endpoints (Current)
- `GET /api/v1/clients`
- `POST /api/v1/clients`
- `GET /api/v1/jobs`
- `POST /api/v1/jobs`
- `POST /api/v1/jobs/schedules/{id}/status`
- `GET /api/v1/schedule`
- `POST /api/v1/schedule`
- `PUT /api/v1/schedule/{id}`
- `DELETE /api/v1/schedule/{id}`
- `GET /api/v1/expenses`
- `GET /api/v1/expenses/unclassified`
- `POST /api/v1/expenses`
- `POST /api/v1/expenses/unclassified/{id}`
- `POST /api/v1/expenses/suggestions/apply`
- `GET /api/v1/incomings`
- `GET /api/v1/incomings/unclassified`
- `POST /api/v1/incomings/unclassified/{id}`
- `POST /api/v1/incomings/suggestions/apply`
- `PUT /api/v1/incomings/{id}`
- `GET /api/v1/transactions`
- `POST /api/v1/transactions/{id}/status`
- `POST /api/v1/transactions/convert/all`
- `POST /api/v1/transactions/{id}/convert`
- `POST /api/v1/transactions/import`
- `GET /api/v1/receipts/inbox`
- `POST /api/v1/receipts/upload`
- `POST /api/v1/receipts/suggestions/{id}/accept`
- `POST /api/v1/receipts/suggestions/{id}/match`
- `GET /api/v1/dashboard`
- `GET /api/v1/workflow`
- `GET /api/v1/workflow/{kind}`
- `POST /api/v1/workflow/{kind}/advance`

## Open Decisions
- Token auth mechanism for mobile (JWT vs API key)
- Offline behavior (queue/sync vs limited offline)
- Navigation style (tabs vs stacked flows)
- OCR guidance approach (quick heuristics vs frame processors)

## Future Security Upgrade
- Move from `itsdangerous` signed tokens to JWT or opaque tokens with refresh flow when mobile auth hardens.

## Now / Next Status

### Now
- Receipt capture with live preview and confirmation flow (Use Photo / Retake).
- Background upload queue with retry and success toasts.
- Inbox toggle for Suggested vs Manual Match, plus queued uploads card.
- Mobile auth (token) and login persistence.
- Bottom navigation aligned with core flow (Home, Inbox, Capture).

### Next
- Receipt detail view with OCR fields and suggested match context.
- Better match confirmation UI (show expense details inline before accepting).
- Finalize R2-backed storage in production and validate URLs in mobile.
- Dynamic camera aspect tuning per device if letterboxing persists.
- Integrations to import jobs/schedules from external systems (e.g., Jobber).
- OCR guidance: decide on real-time feedback stack.
- Add fallback LLM receipt processing for low-quality OCR cases (run only when OCR confidence/field completeness is below threshold to control cost).

## OCR Guidance (Offline, Real-Time)

### Option A (Expo Go Compatible, Minimal)
- Periodic low-res still capture from `expo-camera` (every ~500–800ms).
- Run lightweight heuristics on-device:
  - Brightness (too dark / too bright)
  - Blur (hold steady)
  - Basic edge density (align receipt in frame)
- UX guidance should **not require all 4 edges**; receipts can be partial/irregular.
  - Prefer “fit most of the receipt” rather than strict edge framing.

### Option B (Best UX, Requires Dev Client)
- `react-native-vision-camera` + frame processors.
- True frame-by-frame analysis (brightness/blur/edge/rectangle detection).
- Still avoid strict “all edges” requirement; provide soft guidance.
