# External Integrations
*Generated: 2026-04-12*

## Summary
The app integrates Firebase (Authentication + Firestore) as its sole backend service. Capacitor bridges the web app to Android native and provides the native Google Sign-In flow via `@capacitor-firebase/authentication`. All other runtime libraries (canvas-confetti, Web Audio API) are self-contained with no external API calls.

## APIs & External Services

### Firebase

**Firebase Authentication:**
- Purpose: User identity — supports Google Sign-In and anonymous sign-in
- SDK: `firebase` v12 (`firebase/auth`)
- Client/wrapper: `@capacitor-firebase/authentication` v8.1 for native Android Google Sign-In (avoids browser popup limitations in WebView)
- Config file: `src/firebase.ts`
- Auth state listener: `onAuthStateChanged` initialized at app startup in `src/store/authStore.ts`
- Flows implemented:
  - Anonymous sign-in (`signInAnonymously`)
  - Google Sign-In via popup (web) or native plugin (Android)
  - Anonymous-to-Google account upgrade (`linkWithPopup` / `linkWithCredential`)
  - Credential-already-in-use merge path (anonymous scores migrated to Google account)
- Auth provider configured: `google.com` (set in `capacitor.config.ts`)

**Firestore:**
- Purpose: Cloud leaderboard — stores per-puzzle scores and user display names
- SDK: `firebase` v12 (`firebase/firestore`)
- Client: `getFirestore(app)` exported from `src/firebase.ts` as `db`
- Collections schema:
  - `users/{uid}` — `{ displayName: string }`
  - `usernames/{lowercaseName}` — `{ uid: string }` (uniqueness index)
  - `puzzles/{puzzleId}/scores/{uid}` — `ScoreDoc` (see `src/services/scoreService.ts`)
- Operations used: `getDoc`, `setDoc`, `getDocs`, `writeBatch`, `collection`, `query`, `orderBy`, `limit`
- Score queries: top-50 per puzzle ordered by `moves asc`, `timeMs asc`
- Key service: `src/services/scoreService.ts`
- Key hook: `src/hooks/useLeaderboard.ts`

**Firebase configuration:**
- All config values injected via Vite environment variables (not hardcoded)
- Required env vars (prefix `VITE_`):
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
- Environment variables consumed in: `src/firebase.ts`

## Data Storage

**Firestore (cloud):**
- Per-puzzle leaderboard scores
- User display names with uniqueness enforcement
- Only non-anonymous (Google) users have cloud scores

**localStorage (local):**
- Key: `rushhour_progress` — puzzle completion history (best moves, best time per puzzle)
- Key: `rushhour_muted` — mute preference
- Managed by: `src/store/progressStore.ts` (via Zustand `persist` middleware) and `src/services/soundService.ts`

**File Storage:**
- None — no file upload/download integrations

**Caching:**
- None — no Redis, CDN cache layer, or service worker caching configured

## Authentication & Identity

**Auth Provider:** Firebase Authentication
- Implementation: `src/store/authStore.ts` (Zustand store)
- Anonymous users: full local gameplay, no leaderboard participation
- Google users: leaderboard access, display name, cloud score submission
- Upgrade path: anonymous → Google with score migration
- Native Android sign-in: `FirebaseAuthentication.signInWithGoogle()` from `@capacitor-firebase/authentication`
- Web sign-in: `signInWithPopup(auth, googleProvider)` from `firebase/auth`

**Auth gating:**
- `src/App.tsx` — shows `AuthPromptScreen` when `user` is null (blocks all routes)
- Score submission (`src/services/scoreService.ts`) — no-ops for anonymous users

## Capacitor Native Plugins

| Plugin | Package | Version | Purpose |
|---|---|---|---|
| Core | `@capacitor/core` | ^8.2.0 | Capacitor runtime, `Capacitor.isNativePlatform()` detection |
| Android | `@capacitor/android` | ^8.2.0 | Android native layer |
| App | `@capacitor/app` | ^8.0.1 | Back-button handling, `exitApp()` |
| Splash Screen | `@capacitor/splash-screen` | ^8.0.1 | 2-second splash on launch, background `#1a0f00` |
| Status Bar | `@capacitor/status-bar` | ^8.0.1 | Dark style status bar, hidden during gameplay |
| Firebase Auth | `@capacitor-firebase/authentication` | ^8.1.0 | Native Google Sign-In on Android |

Native plugin initialization is lazy — imported only on native platforms via dynamic `import()` in `src/main.tsx`.

## npm Packages — Runtime

| Package | Version | Purpose | Where Used |
|---|---|---|---|
| `react` | ^19.2.4 | UI framework | All components and screens |
| `react-dom` | ^19.2.4 | DOM rendering | `src/main.tsx` |
| `react-router` | ^7.13.0 | Client-side routing | `src/main.tsx`, `src/App.tsx` |
| `zustand` | ^5.0.11 | State management | `src/store/*.ts` |
| `firebase` | ^12.9.0 | Firebase Auth + Firestore SDK | `src/firebase.ts`, `src/store/authStore.ts`, `src/services/scoreService.ts`, `src/hooks/useLeaderboard.ts` |
| `canvas-confetti` | ^1.9.4 | Win celebration animation | `src/screens/GameScreen/WinModal.tsx` (inferred from type dep) |

## Sound

**No external audio library** — sound is generated entirely via the Web Audio API (`AudioContext`) in `src/services/soundService.ts`. No network calls, no asset files fetched. Tones are synthesized with `OscillatorNode` and `GainNode`.

## Puzzle Data

**No external API** — all puzzle data is bundled as static JSON files:
- `src/data/puzzles/beginner.json`
- `src/data/puzzles/intermediate.json`
- `src/data/puzzles/advanced.json`
- `src/data/puzzles/expert.json`

Aggregated in `src/data/puzzleIndex.ts`. Validated at prebuild time via `scripts/validate-puzzles.ts`.

## Monitoring & Observability

**Error Tracking:** None — no Sentry, Datadog, or equivalent configured

**Analytics:** None — no Firebase Analytics, Amplitude, or equivalent configured

**Logs:** Console only; service functions swallow errors silently (by design, per comments in `src/services/scoreService.ts`)

## CI/CD & Deployment

**Hosting:** Android app distributed via Google Play Store (app ID `com.otis.brooke.rushhour.puzzle`)

**CI Pipeline:** None detected — no `.github/workflows/`, CircleCI, or similar config found

**Build flow:**
1. `npm run build` → `vite build` (preceded by `validate-puzzles` prebuild)
2. `npx cap sync` → syncs web dist into Android project
3. Android Studio or Gradle → produces APK/AAB for Play Store

## Webhooks & Callbacks

**Incoming:** None

**Outgoing:** None — all Firebase communication is via SDK (persistent WebSocket for Firestore, HTTPS for Auth)

## Gaps / Uncertainties
- No `.env` file was read (security policy); exact Firebase project name unknown
- `howler` is referenced in `vite.config.ts` chunk splitting but absent from `package.json` — possibly a removed dependency or future placeholder
- Firebase Security Rules are not in this repo — Firestore access control rules are deployed separately
- No Google Play signing configuration is visible in the repo (expected to be local/CI secrets)
