# Requirements — v1.1 Ad Monetization

*Milestone goal: Add Google AdMob banner and interstitial ads to the Android app using the Capacitor AdMob plugin.*

---

## Android Native Setup

- [ ] **SETUP-01**: Developer can install `@capacitor-community/admob@8.0.0` and sync to Android without build errors
- [ ] **SETUP-02**: App launches without crash after AdMob App ID is added to `AndroidManifest.xml`
- [ ] **SETUP-03**: `playServicesAdsVersion = '24.3.0'` is pinned in `android/variables.gradle` to prevent Firebase/AdMob manifest merge conflict
- [ ] **SETUP-04**: `AD_ID` permission is declared in `AndroidManifest.xml` for Android 13+ compatibility
- [ ] **SETUP-05**: AdMob test App ID and test ad unit IDs are used in development builds; real IDs are used only in production builds (environment-separated via Vite env variables)

## GDPR Consent

- [ ] **GDPR-01**: App requests UMP consent info on every launch before any ad is initialized or loaded
- [ ] **GDPR-02**: EU/EEA users see a consent form on first launch (and whenever consent has expired or changed)
- [ ] **GDPR-03**: Non-EU users are not shown a consent dialog and proceed directly to ad loading
- [ ] **GDPR-04**: No ad (banner or interstitial) is loaded or displayed until the consent flow has completed
- [ ] **GDPR-05**: User can re-open the privacy/consent settings from within the app (privacy settings entry point)

## Banner Ad

- [ ] **BANNER-01**: A banner ad is displayed at the bottom of the GameScreen, below the ControlBar
- [ ] **BANNER-02**: The banner uses `AdMob.showBanner()` with `AdSize.ADAPTIVE_BANNER` and `AdPosition.BOTTOM_CENTER`
- [ ] **BANNER-03**: The GameScreen layout adds bottom padding equal to the banner height so game UI is not obscured
- [ ] **BANNER-04**: The banner is removed (`AdMob.removeBanner()`) when the user navigates away from the GameScreen
- [ ] **BANNER-05**: Banner ad lifecycle (load, show, error) is handled gracefully — ad failure does not affect gameplay

## Interstitial Ad

- [ ] **INTER-01**: An interstitial ad is preloaded when the GameScreen mounts
- [ ] **INTER-02**: The interstitial is shown every 3rd puzzle win (not every win), triggered when the user taps "Next Puzzle" or "Back to Selection" inside the WinModal
- [ ] **INTER-03**: The interstitial is reloaded automatically after each showing (via the `Dismissed` event)
- [ ] **INTER-04**: A timeout guard (5–8 seconds) ensures the WinModal always appears even if the interstitial fails to show or load
- [ ] **INTER-05**: The win counter resets after the app is restarted (no persistence required — session-only)

## Production & Play Store

- [ ] **RELEASE-01**: A `adService.ts` setup guide documents the manual steps for creating a Google AdMob account and registering the app (non-code artifact — setup instructions in a README or planning doc)
- [ ] **RELEASE-02**: Privacy policy is updated to disclose AdMob data collection (advertising ID, device info)
- [ ] **RELEASE-03**: Play Store listing is updated: "Contains ads" checkbox enabled and Data Safety section updated to declare advertising ID collection
- [ ] **RELEASE-04**: `versionCode` is bumped from `1` to `2` and `versionName` updated to `"1.1"` in `android/app/build.gradle`
- [ ] **RELEASE-05**: Release AAB is tested on the internal testing track before promoting to production

---

## Future Requirements (Deferred)

- Real MP3 audio assets (silent stubs) — v1.2
- LeaderboardScreen reachable via UI navigation — v1.2
- `authStore` offline timeout — v1.2
- Score submission retry queue — v1.2
- PWA / service worker — v1.2
- Rewarded video ads — v1.2+

## Out of Scope

- Rewarded video ads — not requested, adds significant complexity
- iOS AdMob integration — Android only for this milestone
- Ad frequency cap server-side tuning — handled by AdMob console, not code
- A/B testing ad placements — out of scope for initial integration
- Remove-ads in-app purchase — not planned

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 to SETUP-05 | Phase 6 | Pending |
| GDPR-01 to GDPR-05 | Phase 7 | Pending |
| BANNER-01 to BANNER-05 | Phase 8 | Pending |
| INTER-01 to INTER-05 | Phase 9 | Pending |
| RELEASE-01 to RELEASE-05 | Phase 10 | Pending |
