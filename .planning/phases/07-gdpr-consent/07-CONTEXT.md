# Phase 7 Context: GDPR Consent

**Goal:** Users receive the UMP consent dialog when required, and no ad is loaded or displayed until consent is fully resolved.

---

## Decisions

### adService shape
**Decision:** Plain TypeScript singleton module — same pattern as `soundService.ts` and `scoreService.ts`. No Zustand store.

- Export `initAdService()` — kicks off the UMP consent flow, stores result in a module-level promise
- Export `waitForConsent()` — returns that promise; Phase 8+ await this before any ad API call
- Export `showConsentForm()` — calls UMP's `showPrivacyOptionsForm` for the "revisit consent" entry point

```ts
// adService.ts (shape)
let _consentReady: Promise<void>;

export function initAdService() {
  _consentReady = runConsentFlow();
}

export function waitForConsent() {
  return _consentReady;
}

export function showConsentForm() {
  return AdMob.showPrivacyOptionsForm();
}
```

### App startup integration
**Decision:** `initAdService()` is called in `main.tsx` before `ReactDOM.createRoot`, fire-and-forget. The app never blocks on consent — it proceeds to render immediately.

- UMP consent dialog appears as a native overlay when required (EEA users on first launch)
- No loading screen, no React gate — the app is fully usable while consent resolves
- Phases 8 and 9 await `waitForConsent()` before touching any ad API — that's where the GDPR-04 guarantee is enforced

```ts
// main.tsx
import { initAdService } from './services/adService';
initAdService(); // fire-and-forget — no await
ReactDOM.createRoot(...).render(<App />);
```

### Consent settings entry point
**Decision:** "Privacy Settings" button added to **ProfileScreen** — no new screen or route needed.

- ProfileScreen already has settings-like content (display name, sign-out, upgrade)
- Button calls `adService.showConsentForm()` at the bottom of the profile section
- Satisfies GDPR-05 (user can re-open privacy/consent settings from within the app)

### EEA debug strategy
**Decision:** `VITE_ADMOB_DEBUG_EEA=true` env var in `.env.development`.

- adService reads `import.meta.env.VITE_ADMOB_DEBUG_EEA` at runtime
- When `true`, sets `debugGeography = AdMobDebugGeography.EEA` in the UMP request
- This makes the consent dialog appear even outside the EU — essential for local development testing
- `VITE_ADMOB_DEBUG_DEVICE_ID` can optionally be set to a test device hash for UMP whitelisting
- NOT present in `.env.production` — production users get real geography detection

```
# .env.development (add these two lines)
VITE_ADMOB_DEBUG_EEA=true
VITE_ADMOB_DEBUG_DEVICE_ID=TEST_DEVICE_HASH
```

---

## Phase Scope Boundary

Phase 7 delivers: `adService.ts` singleton with UMP consent flow, consent state promise, and "Privacy Settings" entry point in ProfileScreen.

**Out of scope for Phase 7:**
- Banner ad display (Phase 8)
- Interstitial ad display (Phase 9)
- Real production ad IDs (Phase 10)
- Any ad loading or showing — consent flow only

---

## Canonical Refs

- `src/services/adService.ts` — new file to create (singleton, does not exist yet)
- `src/main.tsx` — where `initAdService()` is called
- `src/screens/ProfileScreen/ProfileScreen.tsx` — where "Privacy Settings" button is added
- `.env.development` — where `VITE_ADMOB_DEBUG_EEA=true` is added
- `src/services/soundService.ts` — reference pattern for plain TS singleton service shape
- `@capacitor-community/admob` plugin docs — UMP API: `requestConsentInfoUpdate`, `loadAndShowConsentFormIfRequired`, `showPrivacyOptionsForm`
