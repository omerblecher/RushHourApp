# Phase 6 Context: Android Native Setup

**Goal:** The app builds cleanly with the AdMob plugin registered and launches without crash on Android.

---

## Decisions

### TypeScript scope in Phase 6
**Decision:** Purely native. Phase 6 touches only Android files (manifest, variables.gradle, Gradle). No TypeScript or JavaScript files are created in this phase.
- `adService.ts` singleton is Phase 7's responsibility
- Env files (`.env.*`) are created — these are config, not TypeScript source

### Env variable naming and file strategy
**Decision:** Two committed env files with all three AdMob IDs:

```
# .env.development
VITE_ADMOB_APP_ID=ca-app-pub-3940256099942544~3347511713
VITE_ADMOB_BANNER_ID=ca-app-pub-3940256099942544/6300978111
VITE_ADMOB_INTERSTITIAL_ID=ca-app-pub-3940256099942544/1033173712

# .env.production  (Phase 10 fills in real IDs)
VITE_ADMOB_APP_ID=TODO
VITE_ADMOB_BANNER_ID=TODO
VITE_ADMOB_INTERSTITIAL_ID=TODO
```

- Vite picks the right file automatically based on build mode
- `.env.production` is a committed placeholder — Phase 10 fills in real IDs, no env changes needed in phases 7–9
- All three unit IDs are defined now so phases 8–9 just read from env with no additional env changes

### Test ad unit ID scope
**Decision:** All 3 IDs in Phase 6 — App ID, Banner unit ID, and Interstitial unit ID. Uses Google's official public test IDs.

---

## Locked Implementation Details (from research)

- Plugin version: `@capacitor-community/admob@8.0.0` (Capacitor 8 compatible)
- `playServicesAdsVersion = '24.3.0'` pinned in `android/variables.gradle` — eliminates Firebase/AdMob manifest merge conflict
- AdMob App ID declared as `<meta-data>` in `AndroidManifest.xml` under `<application>`
- `AD_ID` permission declared in `AndroidManifest.xml` for Android 13+ compatibility
- Test App ID value: `ca-app-pub-3940256099942544~3347511713` (Google's public test App ID)
- Production IDs gated behind env vars; dev uses `import.meta.env.DEV` or `.env.development`

---

## Phase Scope Boundary

Phase 6 delivers: plugin installed, Android native config complete, env files created, app builds and launches.

**Deferred to Phase 7:** `adService.ts` singleton, UMP consent flow, any ad initialization code.
**Deferred to Phase 8:** Banner ad display logic.
**Deferred to Phase 9:** Interstitial ad logic.
**Deferred to Phase 10:** Real production IDs, Play Store metadata.

---

## Canonical Refs

- `android/variables.gradle` — where `playServicesAdsVersion` is pinned
- `android/app/src/main/AndroidManifest.xml` — where AdMob App ID meta-data and AD_ID permission go
- `android/app/build.gradle` — Gradle app config
- `android/build.gradle` — root Gradle config
- `.env.development` / `.env.production` — env files to create
- `package.json` — where `@capacitor-community/admob` is added
