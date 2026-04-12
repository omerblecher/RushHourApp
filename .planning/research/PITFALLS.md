# AdMob Integration Pitfalls — Rush Hour Puzzle Game

**Domain:** Adding Google AdMob (banner + interstitial) to an existing Capacitor 8 Android app already on Google Play with Firebase Auth wired.
**Researched:** 2026-04-12
**Confidence:** MEDIUM — Android/AdMob specifics verified via official Google docs and community issues; Capacitor 8 specifics extrapolated from Capacitor 6/7 community findings where v8 data was sparse.

---

## Critical Pitfalls (Account Suspension or Build Failure Risk)

---

### Pitfall C1: Missing or Incorrect AdMob App ID in AndroidManifest.xml

**Severity:** CRITICAL — App crashes immediately on launch without it.

**What goes wrong:** The Google Mobile Ads SDK reads `com.google.android.gms.ads.APPLICATION_ID` from `AndroidManifest.xml` at startup. If the tag is absent, has the wrong key name, or contains a test/placeholder value in a production release, the app throws `IllegalStateException: The Google Mobile Ads SDK was initialized incorrectly` and crashes before any screen renders.

**Why it happens in this project:**
Looking at `android/app/src/main/AndroidManifest.xml`, there is currently NO `<meta-data>` tag for AdMob. The manifest only has the FileProvider entry and `INTERNET` permission. Adding the plugin without adding this tag causes an instant crash in production.

**What the tag must look like:**
```xml
<application ...>
    <!-- REQUIRED: AdMob App ID — get this from your AdMob console -->
    <meta-data
        android:name="com.google.android.gms.ads.APPLICATION_ID"
        android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
</application>
```

The `~` character and the 10-digit suffix after it are mandatory. The format is NOT the same as an ad unit ID (which starts with `ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`).

**Common mistake:** Developers copy a single ad unit ID from the AdMob console instead of the App ID. These look similar but are different: the App ID uses `~` (tilde) while ad unit IDs use `/` (slash).

**Prevention:**
- Add the `<meta-data>` tag before wiring any JavaScript code.
- Test with `npx cap run android --target emulator` immediately after adding the tag to confirm no crash.
- Also add the App ID to `android/app/src/main/res/values/strings.xml` as a named resource and reference it from the manifest if you want to switch between test and prod values via build variants.

**Phase:** Add this in the very first implementation step, before writing a single line of JS ad code.

---

### Pitfall C2: Using Production Ad Unit IDs During Development / Testing

**Severity:** CRITICAL — Can suspend your AdMob account permanently.

**What goes wrong:** Every impression and click against a production ad unit ID is recorded. If you click your own ads during testing (even accidentally), Google's invalid traffic detection flags the account. Suspensions are not easily reversed, and earnings are clawed back.

**Why it happens:**
- Developer hardcodes real ad unit IDs from day one and tests on their device without configuring test mode.
- Debug and release builds share the same ID string via a constant — no environment separation.
- Developer installs the release APK on their own phone "to see how it looks" and taps the banner.

**Google's official test IDs to use during development:**
```
Banner:        ca-app-pub-3940256099942544/6300978111
Interstitial:  ca-app-pub-3940256099942544/1033173712
```
These are Google-owned test units — no click or impression against them counts toward your account.

**Prevention (specific to this project's manual build setup):**
- Keep two constants in TypeScript: `TEST_BANNER_ID` and `PROD_BANNER_ID`.
- Use a build-time env variable (`VITE_ENV`) to switch: `const AD_UNIT = import.meta.env.VITE_ENV === 'production' ? PROD_BANNER_ID : TEST_BANNER_ID`.
- Additionally, call `AdMob.initialize({ testingDevices: ['YOUR_DEVICE_HASH'] })` during development — this forces test ads even when the production ID is accidentally used.
- Only ship the `.aab` built with `VITE_ENV=production` to Play Store.
- Never side-load the production AAB onto your own device and tap ads.

**Phase:** Environment separation must be designed before any ad unit ID touches the codebase.

---

### Pitfall C3: AD_SERVICES_CONFIG Manifest Merge Conflict (Firebase + AdMob)

**Severity:** CRITICAL — Build fails; app cannot be compiled.

**What goes wrong:** The Google Mobile Ads SDK and Firebase Analytics both inject a `<property>` element for `android.adservices.AD_SERVICES_CONFIG` into the merged manifest. One references `@xml/gma_ad_services_config` and the other references `@xml/ga_ad_services_config`. The Android manifest merger rejects duplicate property entries and fails the build with:

```
Manifest merger failed: Attribute property#android.adservices.AD_SERVICES_CONFIG@resource
value=(@xml/gma_ad_services_config) from [play-services-ads] AndroidManifest.xml
is also present in [firebase-analytics] AndroidManifest.xml value=(@xml/ga_ad_services_config)
```

**Why it happens in this project:** This project already has Firebase Auth via `google-services.json` and the `com.google.gms.google-services` plugin applied in `build.gradle`. Adding the AdMob dependency pulls in `play-services-ads`, which conflicts.

**Fix:** Add `tools:replace="android:resource"` to the conflicting property in your app's `AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
          xmlns:tools="http://schemas.android.com/tools">
    <application ...>
        <property
            android:name="android.adservices.AD_SERVICES_CONFIG"
            android:resource="@xml/gma_ad_services_config"
            tools:replace="android:resource" />
    </application>
</manifest>
```

The `xmlns:tools` namespace declaration must also be added to the root `<manifest>` element — it is currently absent from this project's manifest.

**Phase:** Expect this on the first `./gradlew assembleDebug` after adding the AdMob dependency. Have the fix ready before the build attempt.

---

### Pitfall C4: Showing Ads Before GDPR Consent is Collected (EU Users)

**Severity:** CRITICAL — AdMob policy violation; can result in account suspension or Play Store removal for EU/EEA users.

**What goes wrong:** Google requires publishers serving ads to EEA (European Economic Area) and UK users to use a Google-certified Consent Management Platform before serving personalized ads. If your app loads and shows a banner before `requestConsentInfo()` and `showConsentFormIfRequired()` complete, you are serving ads without consent.

**The correct initialization order:**
```
App opens
  -> AdMob.initialize()           <- OK to call before consent
  -> requestConsentInfo()
  -> showConsentFormIfRequired()   <- Must complete before first ad load
  -> AdMob.showBanner() / prepareInterstitial()
```

**Common mistake with Capacitor:** Developers call `AdMob.showBanner()` in a React `useEffect` that fires immediately, before the async consent chain has resolved. Because consent is async and the timing is unpredictable, ads sometimes appear before consent is collected on slower devices.

**UMP support in `@capacitor-community/admob`:** The plugin exposes `requestConsentInfo()`, `showConsentForm()`, and `resetConsentInfo()`. Consent management via UMP IS supported in recent plugin versions but was absent in pre-4.x releases. Confirm the installed version supports it before writing consent code.

**Key UMP behavior change (February 2025):** Google changed UMP SDK behavior — consent is no longer assumed when not explicitly given. Apps that previously assumed consent is "obtained" without displaying a form may now serve no personalized ads to EU users. Always explicitly call `showConsentFormIfRequired()`.

**Consent revocation:** GDPR requires users to be able to withdraw consent at any time. Implement a "Privacy / Ad Preferences" option in app settings that calls `AdMob.showConsentForm()`. Failing to provide this is itself a violation.

**Phase:** Consent flow must be implemented and tested with debugGeography set to EEA before any production release.

---

## High-Severity Pitfalls (Revenue Loss or Policy Warning Risk)

---

### Pitfall H1: Interstitial Ad Shown at App Launch or on Back-Press Exit

**Severity:** HIGH — Direct Google Play policy violation ("Better Ads Experiences").

**What goes wrong:** Google Play explicitly prohibits interstitial ads that:
- Appear when the app first opens (before any user interaction).
- Appear when the user presses the Back button to exit the app.
- Cover the full screen without a visible countdown or close button.

**Correct placement for this game:** Show the interstitial AFTER the win screen has displayed (user has seen their score) and BEFORE the next puzzle loads. This is an explicit natural break.

**Do NOT do:**
```
User opens app -> show interstitial immediately
User presses Back on main menu -> show interstitial before exit
Show interstitial inside the active game play screen
```

**Do:**
```
User wins puzzle -> WinModal shows (2-second delay already exists in this app)
  -> User taps "Next Puzzle"
  -> Show interstitial (with close button visible)
  -> Load next puzzle
```

This project's existing WinModal 2-second delay is already a natural break — the interstitial slots in cleanly here.

**Rate limit:** Show no more than one interstitial per two user actions. Do not show an interstitial every single level on easy puzzles that players solve in 15 seconds.

**Phase:** Design the trigger point explicitly in the phase plan. Do not leave placement as a "TBD detail."

---

### Pitfall H2: Banner Ad Placed Over or Adjacent to Interactive Game Elements

**Severity:** HIGH — Policy violation; accidental clicks inflate invalid traffic metrics.

**What goes wrong:** If a banner is displayed at the bottom of the game board and a vehicle is draggable near the bottom edge, users will accidentally tap the banner while dragging. Google's click-through rate analytics detect anomalously high CTR from puzzle games (natural interaction area overlaps ad) and may flag the placement.

**Specific risk for Rush Hour:** The 6x6 grid board extends near the screen bottom on small phones (320px width target). A bottom-anchored banner that sits immediately below the last row creates accidental tap risk on vehicles dragged near row 6.

**Prevention:**
- Anchor the banner to the very bottom of the viewport using CSS `padding-bottom` on the game container to push the board up, ensuring a visible gap.
- Never place a banner adjacent to the "Reset" or "Next Puzzle" buttons.
- Prefer `ADAPTIVE_BANNER` format — it adjusts height automatically and is less likely to overlap content on small screens.

---

### Pitfall H3: Gradle Dependency Version Conflict (play-services-ads vs Firebase)

**Severity:** HIGH — Build failure; or runtime crash from mismatched versions.

**What goes wrong:** `@capacitor-community/admob` brings in `play-services-ads` which depends on `com.google.android.gms:play-services-measurement-base`. Firebase Analytics (already in this project via `google-services.json`) also depends on the same artifact. If the resolved versions differ between compile classpath and runtime classpath, the build may succeed but crash at runtime.

**Additional conflict seen in community issues:** Java/Kotlin compilation can fail if the `compileDebugKotlin` task targets a different JVM version than `compileDebugJavaWithJavac`. This surfaces after adding a new plugin built with a different Kotlin target.

**Prevention:**
- After `npm install @capacitor-community/admob && npx cap sync`, run `./gradlew dependencies | grep play-services-measurement` to check for version conflicts.
- If conflicts appear, pin the version in `android/app/build.gradle`:
  ```groovy
  configurations.all {
      resolutionStrategy {
          force 'com.google.android.gms:play-services-measurement-base:21.x.x'
      }
  }
  ```
- Run `./gradlew assembleDebug` immediately after `npx cap sync` — do not wait until all ad code is written before the first build attempt.

---

### Pitfall H4: ProGuard / R8 Stripping AdMob or UMP Classes in Release Build

**Severity:** HIGH — Release build appears to work in debug but crashes in production.

**What goes wrong:** This project has `minifyEnabled true` in the release build type (confirmed in `android/app/build.gradle`). R8 shrinking can remove AdMob SDK classes referenced only via reflection. The debug build with `minifyEnabled false` works fine; the release build crashes.

**What to check:** Verify that `proguard-rules.pro` in `android/app/` includes AdMob keep rules. The `@capacitor-community/admob` plugin should ship consumer ProGuard rules automatically, but this is not guaranteed to cover all UMP SDK classes.

**Minimum rules to verify are present:**
```proguard
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.android.ump.** { *; }
-dontwarn com.google.android.gms.**
```

**Prevention:** After building a release AAB, test it via the internal testing track on a real Android device before promoting to production. Many ProGuard-caused crashes only appear in actual release builds.

This project already has a `proguard-rules.pro` file and an existing suppress rule for R8 missing-class errors (evidenced by a prior commit: "fix(android): suppress R8 missing-class errors for unused auth providers"). Check that file and add AdMob-specific keeps to it.

---

## Moderate Pitfalls (Revenue or UX Impact)

---

### Pitfall M1: Play Store Data Safety Section Not Updated for AdMob

**Severity:** MODERATE — Play Console will flag the app for policy review; update can be rejected.

**What goes wrong:** Adding AdMob to an existing app means additional user data is now collected and shared (device identifiers, advertising IDs, IP address, interaction data). The Data Safety section filled out for v1.0 does not cover these. Google can reject the update or add a warning to the store listing if declared data practices do not match what the SDK actually does.

**What AdMob's SDK automatically collects and shares (must be declared):**
- Advertising ID (collected, shared for advertising purposes)
- Device identifiers
- IP address (for fraud prevention)
- User product interactions (ad click/view events)

**Where to update in Play Console:**
`Play Console -> App content -> Data safety -> Edit -> Add data types`

Google provides a specific guidance page for this: `developers.google.com/admob/android/privacy/play-data-disclosure`

**Additionally:** The store listing "Contains ads" checkbox must be ticked. Go to `Play Console -> Store presence -> Store listing` and enable "Contains ads." This adds the "Contains ads" label to the Play Store listing — users with existing installs will see this on the next update.

**Phase:** Complete Data Safety and Store Listing updates in Play Console BEFORE submitting the APK/AAB update.

---

### Pitfall M2: Privacy Policy Not Updated to Declare Ad Data Collection

**Severity:** MODERATE — Policy violation; existing privacy policy URL is already in the Play Console listing.

**What goes wrong:** This project already has a privacy policy (noted in commit history: "docs: add privacy policy page for Google Play submission"). That policy was written before ads were added. It likely does not disclose:
- That third-party ad networks (Google AdMob) collect advertising identifiers.
- How to opt out of personalized ads.
- That a consent dialog is shown to EU/EEA users.

AdMob's policies require these disclosures. The existing privacy policy URL is already linked in the Play Console listing — updating the policy document at that same URL is sufficient; no URL change is needed.

**Minimum additions to the privacy policy:**
1. Statement that the app uses Google AdMob to display ads.
2. Description of what data AdMob collects (advertising ID, device info).
3. Link to Google's privacy policy: `https://policies.google.com/privacy`.
4. Description of the GDPR consent dialog for EU users.
5. Instructions for opting out of personalized ads (Google Ad Settings link).

**Phase:** Update the privacy policy document before the Play Store update is submitted.

---

### Pitfall M3: Interstitial Preload Timing — Ad Not Ready When Needed

**Severity:** MODERATE — Revenue loss; users experience a noticeable delay before the next puzzle.

**What goes wrong:** Interstitial ads must be preloaded. If `prepareInterstitial()` is called at the moment the win condition triggers, the ad network takes 1-3 seconds to fill the request. During that time either nothing shows (timeout path) or the user waits on a blank screen.

**Correct pattern:**
```
Puzzle starts loading
  -> prepareInterstitial() called immediately (background network request)
User solves puzzle (takes 30s-3min)
  -> Ad has had time to load
  -> On win: showInterstitial() (nearly instant — already loaded)
  -> Dismiss -> load next puzzle
```

**Where to wire this in the Rush Hour game:** Call `prepareInterstitial()` in the `GameScreen` component's `useEffect` when a puzzle loads, not when the win is detected.

---

### Pitfall M4: Banner Ad Causes Capacitor WebView Layout Shift

**Severity:** MODERATE — UX regression; game board reflows or gets cut off.

**What goes wrong:** `@capacitor-community/admob` renders the banner ad as a native Android View overlaid on top of the Capacitor WebView. It does NOT inject an HTML element into the DOM. If the React layout uses `height: 100vh` or `height: 100%` on the game board, the native banner will cover the bottom of the board rather than push it up.

**Prevention:**
- The plugin fires `BANNER_AD_LOADED` and `BANNER_AD_SIZE_CHANGED` events with the banner's pixel height.
- Listen for these events and add a CSS `padding-bottom` or `margin-bottom` to the game container equal to the reported height.
- Test on a 320px-wide device — the board is already tight at minimum supported width.

---

### Pitfall M5: Capacitor Plugin Version Mismatch with Capacitor 8

**Severity:** MODERATE — Build failure or runtime errors if wrong plugin version is used.

**Context:** `@capacitor-community/admob` versions map to Capacitor major versions. Capacitor 8 is relatively recent; community plugin support for it may lag. Using a plugin version built for Capacitor 6 or 7 against a Capacitor 8 project can cause Gradle compilation errors or JavaScript bridge registration failures.

**How to verify compatibility:** Check the plugin's `package.json` `peerDependencies` for `@capacitor/core: "^8.0.0"`. If the latest stable release only lists `^6.0.0` or `^7.0.0`, options are:
1. Use the latest pre-release/RC version if it explicitly targets Capacitor 8.
2. Consider `@capgo/capacitor-admob` as an alternative — it has more frequent releases and may have earlier Capacitor 8 support.

**Check at install time:** Run `npx cap doctor` before and after adding the plugin.

---

## Minor Pitfalls (Developer Friction, Not Revenue/Policy Risk)

---

### Pitfall L1: Forgetting `npx cap sync` After Installing the Plugin

**What goes wrong:** `npm install @capacitor-community/admob` updates `package.json` but does NOT copy the native Android plugin code to `android/`. The app builds without the plugin code and JavaScript calls silently fail — no crash, no ads, no errors in Chrome DevTools.

**Prevention:** Always run `npx cap sync android` after any `npm install` involving a Capacitor plugin.

---

### Pitfall L2: Testing Consent Flow Without debugGeography

**What goes wrong:** UMP consent forms are only shown to users in EEA/UK by default. A developer in a non-EEA country will never see the consent form during testing, assuming it's working, but EU users see an app that shows personalized ads without consent.

**Prevention:** Add this during development:
```typescript
await AdMob.initialize({
  requestTrackingAuthorization: false,
  testingDevices: ['YOUR_DEVICE_ID'],
  debugGeography: 1, // 1 = EEA, forces consent form to appear
});
```
Remove `debugGeography` before the production build.

---

### Pitfall L3: versionCode Not Bumped for Play Store Update

**What goes wrong:** The current `versionCode` in `android/app/build.gradle` is `1` (matching v1.0). Play Store requires each upload to have a strictly higher `versionCode`. Uploading the same `versionCode` causes immediate rejection in the Play Console upload step.

**Prevention:** Bump `versionCode` to `2` and `versionName` to `"1.1"` in `build.gradle` before building the release AAB.

---

### Pitfall L4: Banner Ad Not Removed on Screen Navigation

**What goes wrong:** If `showBanner()` is called when the GameScreen mounts and `removeBanner()` is not called when it unmounts, the native banner overlay persists on top of the MainMenu, PuzzleSelect, and WinModal screens. It is a native view — React Router navigation does not remove it.

**Prevention:** Return a cleanup function from the `useEffect` that calls `AdMob.removeBanner()`:
```typescript
useEffect(() => {
  AdMob.showBanner({ adId: BANNER_ID, adSize: BannerAdSize.ADAPTIVE_BANNER });
  return () => { AdMob.removeBanner(); };
}, []);
```

---

## Phase-Specific Warning Map

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Initial plugin install + Android sync | C3 (manifest merge), H3 (Gradle conflict), L1 (forgot cap sync) | Build immediately after sync; have the manifest fix ready |
| AndroidManifest.xml update | C1 (missing App ID), C3 (missing xmlns:tools) | Add meta-data tag and tools namespace in same commit |
| Ad unit ID setup | C2 (prod IDs in dev), L2 (no debugGeography) | Env variable separation from day one |
| Consent / UMP wiring | C4 (ads before consent), L2 (no EEA simulation) | Test with debugGeography=1; block ad show until consent resolves |
| Banner layout integration | H2 (adjacent to game board), M4 (layout shift) | Add padding-bottom via BANNER_AD_LOADED event |
| Interstitial trigger point | H1 (wrong trigger point), M3 (not preloaded) | Preload on puzzle start; show on win-to-next transition only |
| Release build | H4 (R8 strips classes) | Test release AAB via internal testing track before production |
| Play Store update submission | M1 (data safety), M2 (privacy policy), L3 (versionCode) | Complete Play Console checklist below before uploading AAB |

---

## Play Store Update Checklist (Before Submitting v1.1)

Complete ALL of these before uploading the release AAB to Play Console.

### Code / Build
- [ ] `versionCode` incremented to `2`, `versionName` set to `"1.1"` in `android/app/build.gradle`
- [ ] `com.google.android.gms.ads.APPLICATION_ID` `<meta-data>` added to AndroidManifest.xml with production App ID
- [ ] AD_SERVICES_CONFIG manifest merge conflict resolved (if encountered)
- [ ] Production ad unit IDs in place (not Google's test IDs)
- [ ] `debugGeography` removed from `AdMob.initialize()` call
- [ ] `testingDevices` list removed or guarded to debug builds only
- [ ] Release AAB tested on a real Android device via internal testing track (not just debug build)
- [ ] ProGuard/R8 keep rules verified for AdMob and UMP SDK classes

### AdMob Console
- [ ] AdMob App ID created and linked to the Play Store app
- [ ] Banner ad unit created and ID recorded
- [ ] Interstitial ad unit created and ID recorded
- [ ] App verified in AdMob console (requires existing Play Store listing — app is already published, so this is fast)

### Play Console — Store Listing
- [ ] "Contains ads" checkbox ticked in Store Listing
- [ ] App description updated to mention ads if appropriate

### Play Console — App Content / Data Safety
- [ ] Data Safety section updated to declare advertising ID collection
- [ ] Data Safety section updated to declare data shared with Google (advertising, analytics)
- [ ] "Data encrypted in transit" marked Yes
- [ ] "Users can request data deletion" answered appropriately

### Privacy Policy
- [ ] Privacy policy document updated to disclose AdMob data collection
- [ ] Google AdMob / Google's privacy policy linked from your privacy policy
- [ ] GDPR consent mechanism described in the privacy policy
- [ ] Opt-out instructions included (Google Ad Settings)
- [ ] Updated policy live at the same URL already in Play Console (no URL change needed)

### GDPR / Consent
- [ ] UMP consent form created in AdMob console (under Privacy and Messaging)
- [ ] Consent flow tested in EEA geography simulation (`debugGeography: 1`)
- [ ] Consent revocation accessible from app UI (Privacy / Settings option)
- [ ] No ads shown before consent is resolved on first launch

---

## Sources

- [Set up Google Mobile Ads SDK | Android](https://developers.google.com/admob/android/quick-start)
- [Set up UMP SDK | Android](https://developers.google.com/admob/android/privacy)
- [Disallowed interstitial implementations](https://support.google.com/admob/answer/6201362)
- [Recommended interstitial implementations](https://support.google.com/admob/answer/6201350)
- [Discouraged banner implementations](https://support.google.com/admob/answer/6275345)
- [AdMob behavioral policies](https://support.google.com/admob/answer/2753860)
- [Invalid activity: account suspension](https://support.google.com/admob/answer/6213019)
- [Enable test ads | Android](https://developers.google.com/admob/android/test-ads)
- [Google Play data disclosure for AdMob](https://developers.google.com/admob/android/privacy/play-data-disclosure)
- [Provide information for Google Play's Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Google Play Ads policy](https://support.google.com/googleplay/android-developer/answer/9857753)
- [Understanding Google Play's Better Ads Experiences policy](https://support.google.com/googleplay/android-developer/answer/12271244)
- [capacitor-community/admob GitHub](https://github.com/capacitor-community/admob)
- [Firebase + AdMob AD_SERVICES_CONFIG conflict fix](https://andresand.medium.com/fix-issue-with-the-dependencies-admob-and-firebase-d3747fcf123e)
- [Firebase dependency conflict issue #216](https://github.com/capacitor-community/admob/issues/216)
- [UMP consent implementation issue #273](https://github.com/capacitor-community/admob/issues/273)
- [Change to Android UMP SDK consent behavior February 2025](https://groups.google.com/g/google-admob-ads-sdk/c/JVVp2_LRtK0)
