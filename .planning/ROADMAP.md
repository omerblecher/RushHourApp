# Roadmap: Rush Hour Puzzle Game

## Milestones

- ✅ **v1.0 Rush Hour MVP** — Phases 1–5 (shipped 2026-02-22)
- 🚧 **v1.1 Ad Monetization** — Phases 6–10 (in progress)

## Phases

<details>
<summary>✅ v1.0 Rush Hour MVP (Phases 1–5) — SHIPPED 2026-02-22</summary>

- [x] Phase 1: Game Engine (3/3 plans) — completed 2026-02-17
- [x] Phase 2: Board UI and Drag Interaction (3/3 plans) — completed 2026-02-19
- [x] Phase 3: Puzzle Data and Navigation (4/4 plans) — completed 2026-02-20
- [x] Phase 4: Firebase Integration (6/6 plans) — completed 2026-02-22
- [x] Phase 5: Sound and Polish (4/4 plans) — completed 2026-02-22

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 Ad Monetization (In Progress)

**Milestone Goal:** Add Google AdMob banner and interstitial ads to the Android app using the Capacitor AdMob plugin, with full GDPR consent compliance and a Play Store update declaring ads.

- [x] **Phase 6: Android Native Setup** — Install plugin, configure Gradle, add AdMob manifest entries so the app builds and launches without crash (completed 2026-04-13)
- [ ] **Phase 7: GDPR Consent** — Implement adService singleton and UMP consent flow; no ad may load before consent resolves
- [ ] **Phase 8: Banner Ad** — Display adaptive banner at bottom of GameScreen with lifecycle management and layout padding
- [ ] **Phase 9: Interstitial Ad** — Preload and show interstitial every 3rd win with timeout guard and auto-reload
- [ ] **Phase 10: Production & Play Store** — Swap in real ad IDs, update privacy policy and Play Store metadata, bump version, test release AAB

## Phase Details

### Phase 6: Android Native Setup
**Goal**: The app builds cleanly with the AdMob plugin registered and launches without crash on Android
**Depends on**: Phase 5 (v1.0 complete)
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05
**Success Criteria** (what must be TRUE):
  1. `npx cap sync` completes without errors after plugin install
  2. App launches on Android without `IllegalStateException` crash (AdMob App ID present in manifest)
  3. Gradle build succeeds with `playServicesAdsVersion = '24.3.0'` pinned — no Firebase/AdMob manifest merge conflict
  4. `AD_ID` permission appears in compiled APK manifest (verified via manifest dump or build output)
  5. Dev builds use Google test App ID and test ad unit IDs; environment variable gate is in place for production IDs
**Plans**: 2 plans
- [x] 06-01-PLAN.md — Install AdMob plugin, pin gradle version, update manifest/strings, create env files
- [x] 06-02-PLAN.md — Manual Android Studio build + device launch + adb AD_ID verification (checkpoint)

### Phase 7: GDPR Consent
**Goal**: Users receive the UMP consent dialog when required, and no ad is loaded or displayed until consent is fully resolved
**Depends on**: Phase 6
**Requirements**: GDPR-01, GDPR-02, GDPR-03, GDPR-04, GDPR-05
**Success Criteria** (what must be TRUE):
  1. On every app launch, `requestConsentInfo` is called before any ad API is touched
  2. When debugGeography is set to EEA, a consent form appears on first launch and again after consent expires or changes
  3. When debugGeography is not set (non-EEA), no consent dialog appears and the app proceeds directly
  4. Changing network conditions or restarting the app never causes an ad to load before the consent flow completes
  5. A privacy/consent settings entry point is accessible from within the app UI so users can revisit their consent choice
**Plans**: TBD

### Phase 8: Banner Ad
**Goal**: A banner ad is visible at the bottom of the GameScreen and is correctly removed when the user navigates away
**Depends on**: Phase 7
**Requirements**: BANNER-01, BANNER-02, BANNER-03, BANNER-04, BANNER-05
**Success Criteria** (what must be TRUE):
  1. A banner ad appears at the bottom of the GameScreen below the ControlBar after consent resolves
  2. The banner uses `AdSize.ADAPTIVE_BANNER` at `AdPosition.BOTTOM_CENTER` (verified in AdMob console or device logs)
  3. The GameScreen content is not obscured by the banner — bottom padding is added equal to banner height when running on native
  4. Navigating away from the GameScreen removes the banner (no banner persists on other screens)
  5. A banner load failure produces no visible error to the user and does not affect puzzle gameplay
**Plans**: TBD
**UI hint**: yes

### Phase 9: Interstitial Ad
**Goal**: An interstitial ad is shown automatically every 3rd puzzle win without blocking the WinModal or crashing on ad failure
**Depends on**: Phase 8
**Requirements**: INTER-01, INTER-02, INTER-03, INTER-04, INTER-05
**Success Criteria** (what must be TRUE):
  1. An interstitial ad is preloaded when GameScreen mounts — no loading delay at win time
  2. The interstitial appears on the 3rd win (and every 3rd thereafter) when the user taps "Next Puzzle" or "Back to Selection" in the WinModal
  3. After the interstitial is dismissed, it automatically reloads so it is ready for the next trigger
  4. If the interstitial fails to show or load, the WinModal appears within 5–8 seconds regardless — no permanent block
  5. The win counter is session-only and resets to zero on app restart
**Plans**: TBD

### Phase 10: Production & Play Store
**Goal**: The app is released with real ad IDs, an updated privacy policy, compliant Play Store metadata, and a passing internal track test
**Depends on**: Phase 9
**Requirements**: RELEASE-01, RELEASE-02, RELEASE-03, RELEASE-04, RELEASE-05
**Success Criteria** (what must be TRUE):
  1. A setup guide documenting AdMob account creation and app registration steps exists (non-code artifact)
  2. The privacy policy page declares AdMob data collection (advertising ID, device info) — link is live
  3. The Play Store listing has "Contains ads" checked and the Data Safety section declares advertising ID collection
  4. `versionCode` is 2 and `versionName` is "1.1" in `android/app/build.gradle`
  5. The release AAB passes all checks on the internal testing track before promotion to production
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Game Engine | v1.0 | 3/3 | Complete | 2026-02-17 |
| 2. Board UI and Drag | v1.0 | 3/3 | Complete | 2026-02-19 |
| 3. Puzzle Data & Nav | v1.0 | 4/4 | Complete | 2026-02-20 |
| 4. Firebase Integration | v1.0 | 6/6 | Complete | 2026-02-22 |
| 5. Sound and Polish | v1.0 | 4/4 | Complete | 2026-02-22 |
| 6. Android Native Setup | v1.1 | 0/2 | Not started | - |
| 7. GDPR Consent | v1.1 | 0/TBD | Not started | - |
| 8. Banner Ad | v1.1 | 0/TBD | Not started | - |
| 9. Interstitial Ad | v1.1 | 0/TBD | Not started | - |
| 10. Production & Play Store | v1.1 | 0/TBD | Not started | - |
