# Phase 9 Context: Interstitial Ad

**Goal:** An interstitial ad is shown automatically every 3rd puzzle win without blocking the WinModal or crashing on ad failure.

---

## Decisions

### adService extension
**Decision:** Extend `adService.ts` with interstitial functions — no new file. Same singleton pattern established in Phase 7 (consent) and Phase 8 (banner).

New exports:
- `prepareInterstitial()` — loads the ad via `AdMob.prepareInterstitial()`; called on GameScreen mount
- `showInterstitialIfDue()` — increments the win counter, shows the ad on every 3rd win (via `AdMob.showInterstitial()`), waits for `InterstitialAdPluginEvents.Dismissed`, then reloads; self-contained timeout of 5 seconds. Always resolves.

```ts
// adService.ts additions:
const AD_TIMEOUT_MS = 5000;
let _winCount = 0;

export async function prepareInterstitial(): Promise<void> {
  await waitForConsent();
  await AdMob.prepareInterstitial({
    adId: import.meta.env.VITE_ADMOB_INTERSTITIAL_ID,
    isTesting: import.meta.env.DEV,
  });
}

export async function showInterstitialIfDue(): Promise<void> {
  _winCount++;
  if (_winCount % 3 !== 0) return;
  await waitForConsent();
  const showAndWait = new Promise<void>((resolve) => {
    AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
      void prepareInterstitial(); // reload for next trigger
      resolve();
    });
    void AdMob.showInterstitial();
  });
  const timeout = new Promise<void>((res) => setTimeout(res, AD_TIMEOUT_MS));
  await Promise.race([showAndWait, timeout]);
}
```

### Win counter ownership
**Decision:** `_winCount` lives as a module-level variable inside `adService.ts`. The counter is ad-service-internal — GameScreen just calls `showInterstitialIfDue()` and never tracks wins for ad purposes.

- Session-only by definition (module-level variable resets on app restart)
- Satisfies INTER-05 with zero extra code — no localStorage, no Zustand
- Counter increments inside `showInterstitialIfDue()` so the logic is co-located with the decision

### WinModal integration
**Decision:** GameScreen passes `onNextPuzzle` and `onBackToSelection` callback props to WinModal. WinModal drops `useNavigate()` internally — it calls the injected callbacks instead.

GameScreen owns all ad + navigate logic:

```ts
// GameScreen:
const handleWinNavigate = async (action: () => void) => {
  if (Capacitor.isNativePlatform()) {
    await showInterstitialIfDue(); // always resolves within 5s
  }
  action(); // navigate(...) + setShowWinModal(false)
};

<WinModal
  onNextPuzzle={() =>
    void handleWinNavigate(() => {
      navigate(`/play/${nextPuzzle.difficulty}/${nextPuzzle.id}`);
      setShowWinModal(false);
    })
  }
  onBackToSelection={() =>
    void handleWinNavigate(() => {
      navigate(`/puzzles?difficulty=${difficulty}`);
      setShowWinModal(false);
    })
  }
/>
```

WinModal removes its `useNavigate()` import and the internal navigation calls — it becomes fully callback-driven.

### Timeout guard
**Decision:** Timeout is self-contained inside `showInterstitialIfDue()` using `Promise.race`. Caller just `await`s the function.

- Timeout: **5 seconds** (lower end of INTER-04 spec — faster return to gameplay on ad hang)
- If the ad never fires `Dismissed` within 5s, the promise resolves from the timeout branch
- After timeout fires, `prepareInterstitial()` is still called in the background to reload for the next trigger

### Interstitial preload lifecycle
**Decision:** `prepareInterstitial()` is called once in a GameScreen `useEffect` on mount, guarded by `Capacitor.isNativePlatform()`.

```ts
// GameScreen — interstitial preload (Phase 9)
useEffect(() => {
  if (!Capacitor.isNativePlatform()) return;
  void prepareInterstitial();
}, []);
```

No cleanup needed on unmount — preloaded ad stays valid. Reload is handled inside `showInterstitialIfDue()` after each show.

### Web/non-native guard
**Decision:** Explicit `Capacitor.isNativePlatform()` check in `handleWinNavigate` (same pattern as Phase 8 banner effect). No ad calls on web/dev browser.

---

## Phase Scope Boundary

Phase 9 delivers: `adService.ts` extended with `prepareInterstitial()` + `showInterstitialIfDue()`, GameScreen wired with preload on mount + wrapped WinModal navigation handlers, WinModal refactored to callback-driven navigation.

**Out of scope for Phase 9:**
- Banner ad (Phase 8, complete)
- Real production ad IDs (Phase 10)
- Rewarded video ads (deferred to v1.2+ per REQUIREMENTS.md)

---

## Canonical Refs

- `src/services/adService.ts` — extend with `prepareInterstitial()`, `showInterstitialIfDue()`, `_winCount`
- `src/screens/GameScreen/GameScreen.tsx` — preload useEffect + `handleWinNavigate` wrapper + updated WinModal props
- `src/screens/GameScreen/WinModal.tsx` — add `onNextPuzzle`/`onBackToSelection` props, remove internal `useNavigate()` navigation calls
- `.env.development` — `VITE_ADMOB_INTERSTITIAL_ID` already defined (Google test ID)
- `@capacitor-community/admob` — `AdMob.prepareInterstitial()`, `AdMob.showInterstitial()`, `InterstitialAdPluginEvents.Dismissed`
- `@capacitor/core` — `Capacitor.isNativePlatform()`
- Phase 7 CONTEXT: `waitForConsent()` is the GDPR gate — must be awaited before any ad API
- Phase 8 CONTEXT: `adService.ts` singleton shape, `Capacitor.isNativePlatform()` guard pattern
