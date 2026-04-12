# Phase 6: Android Native Setup - Research

**Researched:** 2026-04-12
**Domain:** Capacitor Android / AdMob plugin native integration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**TypeScript scope in Phase 6:** Purely native. Phase 6 touches only Android files (manifest, variables.gradle, Gradle). No TypeScript or JavaScript files are created in this phase.
- `adService.ts` singleton is Phase 7's responsibility
- Env files (`.env.*`) are created — these are config, not TypeScript source

**Env variable naming and file strategy:** Two committed env files with all three AdMob IDs:

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
- `.env.production` is a committed placeholder — Phase 10 fills in real IDs
- All three unit IDs are defined now so phases 8–9 just read from env with no additional env changes

**Test ad unit ID scope:** All 3 IDs in Phase 6 — App ID, Banner unit ID, and Interstitial unit ID. Uses Google's official public test IDs.

### Locked Implementation Details (from research)

- Plugin version: `@capacitor-community/admob@8.0.0` (Capacitor 8 compatible)
- `playServicesAdsVersion = '24.3.0'` pinned in `android/variables.gradle` — eliminates Firebase/AdMob manifest merge conflict
- AdMob App ID declared as `<meta-data>` in `AndroidManifest.xml` under `<application>`
- `AD_ID` permission declared in `AndroidManifest.xml` for Android 13+ compatibility
- Test App ID value: `ca-app-pub-3940256099942544~3347511713` (Google's public test App ID)
- Production IDs gated behind env vars; dev uses `import.meta.env.DEV` or `.env.development`

### Deferred Ideas (OUT OF SCOPE)

- `adService.ts` singleton (Phase 7)
- UMP consent flow (Phase 7)
- Any ad initialization code (Phase 7)
- Banner ad display logic (Phase 8)
- Interstitial ad logic (Phase 9)
- Real production IDs, Play Store metadata (Phase 10)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETUP-01 | Install `@capacitor-community/admob@8.0.0` and sync to Android without build errors | npm install + npx cap sync; plugin verified at 8.0.0 on registry |
| SETUP-02 | App launches without crash after AdMob App ID is added to `AndroidManifest.xml` | `<meta-data>` syntax verified from official AdMob docs + plugin README |
| SETUP-03 | `playServicesAdsVersion = '24.3.0'` pinned in `android/variables.gradle` | Plugin build.gradle defaults to `24.9.+`; pinning to `24.3.0` overrides that; mechanism verified via package inspection |
| SETUP-04 | `AD_ID` permission declared in `AndroidManifest.xml` for Android 13+ | Official AdMob docs: apps targeting API 33+ must declare this manually; plugin does NOT auto-include it (plugin manifest only has INTERNET + ACCESS_NETWORK_STATE) |
| SETUP-05 | Test IDs in dev builds; real IDs only in production via Vite env vars | Vite env/mode system verified; `.env.development` loaded by `vite dev`, `.env.production` loaded by `vite build` automatically |
</phase_requirements>

---

## Summary

Phase 6 installs the `@capacitor-community/admob@8.0.0` plugin and wires up Android native configuration so the app builds and launches without crash. The work spans four files: `android/variables.gradle` (version pin), `android/app/src/main/AndroidManifest.xml` (App ID meta-data + AD_ID permission), and two new Vite env files (`.env.development` / `.env.production`).

The key discovery from inspecting the actual plugin package is that version 8.0.0 ships with a **default `playServicesAdsVersion` of `'24.9.+'`** — not `23.0.0` as older documentation states. The CONTEXT.md decision to pin to `24.3.0` locks a specific version instead of accepting any `24.9.x` patch. This is valid (an older-minor pin within v24), and the mechanism is confirmed: any value set in the app's `android/variables.gradle` overrides the plugin default via Gradle's `project.hasProperty()` check.

The plugin's own AndroidManifest.xml does NOT include `AD_ID` permission. The developer must add it manually for Android 13+ (API 33+, which is the project's targetSdkVersion 36). `npx cap sync` will fail gracefully if the plugin is not yet registered but does not auto-edit any native files.

**Primary recommendation:** Follow the four-file edit sequence: (1) `npm install` the plugin, (2) pin `playServicesAdsVersion` in `variables.gradle`, (3) add meta-data + AD_ID to `AndroidManifest.xml`, (4) create `.env.development` and `.env.production`, then run `npx cap sync`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @capacitor-community/admob | 8.0.0 | AdMob plugin for Capacitor 8 | Official community plugin; locked decision |
| com.google.android.gms:play-services-ads | 24.3.0 (pinned) | Google Mobile Ads SDK for Android | Locked decision; pins away from `24.9.+` floating default |
| com.google.android.ump:user-messaging-platform | 4.0.0 (plugin default) | UMP consent (Phase 7 uses it; declared now) | Plugin dependency — pulled in automatically |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vite env files (.env.development / .env.production) | — | Environment-separated AdMob IDs | Loaded automatically by Vite build mode |

**Installation:**
```bash
npm install @capacitor-community/admob@8.0.0
npx cap sync
```

**Version verification:**
```bash
npm view @capacitor-community/admob version
# Returns: 8.0.0 [VERIFIED: npm registry, 2026-04-12]
```

---

## Architecture Patterns

### File Edit Map

```
android/
├── variables.gradle              # Add playServicesAdsVersion = '24.3.0'
└── app/src/main/
    ├── AndroidManifest.xml       # Add <meta-data> App ID + AD_ID permission
    └── res/values/
        └── strings.xml           # Add admob_app_id string resource (referenced by manifest)

.env.development                  # New file — test IDs
.env.production                   # New file — TODO placeholders
```

### Pattern 1: variables.gradle Version Pin

**What:** Override the plugin's floating `playServicesAdsVersion` default with a fixed version.

**Why:** The plugin declares `playServicesAdsVersion = project.hasProperty('playServicesAdsVersion') ? rootProject.ext.playServicesAdsVersion : '24.9.+'`. Setting the value in the app's `variables.gradle` causes Gradle to use the pinned version instead.

**Example:**
```groovy
// android/variables.gradle — append this line inside ext { }
// Source: package/android/build.gradle from @capacitor-community/admob@8.0.0 (inspected 2026-04-12)
ext {
    // ... existing variables ...
    playServicesAdsVersion = '24.3.0'
}
```

### Pattern 2: AndroidManifest.xml — App ID via String Resource

**What:** AdMob App ID must be in `<meta-data>` under `<application>`. Best practice uses a `@string/` reference so the value is defined in `strings.xml` (a single source of truth).

**Example:**
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<!-- Source: https://developers.google.com/admob/android/quick-start [CITED] -->
<application ...>
    <!-- existing content -->

    <meta-data
        android:name="com.google.android.gms.ads.APPLICATION_ID"
        android:value="@string/admob_app_id"/>

</application>

<!-- Inside <manifest>, alongside existing INTERNET permission -->
<uses-permission android:name="com.google.android.gms.permission.AD_ID"/>
```

```xml
<!-- android/app/src/main/res/values/strings.xml -->
<!-- Add inside <resources> -->
<string name="admob_app_id">ca-app-pub-3940256099942544~3347511713</string>
```

**Alternative (inline value):** The App ID can go directly in `android:value` without a string resource. But a string resource is preferred because it keeps secrets out of the manifest directly (easier to diff/review) and matches common plugin documentation style.

### Pattern 3: Vite Env File Loading

**What:** Vite loads env files based on build mode. `npm run dev` triggers `development` mode; `npm run build` triggers `production` mode.

**Priority order** (later overrides earlier) [VERIFIED: vite.dev/guide/env-and-mode]:
1. `.env` (all modes)
2. `.env.local` (all modes, git-ignored)
3. `.env.[mode]` (mode-specific)
4. `.env.[mode].local` (mode-specific, git-ignored)

**Result:** `.env.development` is loaded only by `vite dev`; `.env.production` is loaded only by `vite build`.

**Env file contents:**
```ini
# .env.development — committed to git
VITE_ADMOB_APP_ID=ca-app-pub-3940256099942544~3347511713
VITE_ADMOB_BANNER_ID=ca-app-pub-3940256099942544/6300978111
VITE_ADMOB_INTERSTITIAL_ID=ca-app-pub-3940256099942544/1033173712

# .env.production — committed to git (Phase 10 fills in real values)
VITE_ADMOB_APP_ID=TODO
VITE_ADMOB_BANNER_ID=TODO
VITE_ADMOB_INTERSTITIAL_ID=TODO
```

**CRITICAL:** The existing `.env` file (Firebase keys) is git-ignored. The new `.env.development` and `.env.production` files are NOT in `.gitignore`. They will be tracked by git. This is intentional — test IDs are public Google test values with no secret value.

### Pattern 4: capacitor.config.ts — No AdMob Plugin Config Needed

The plugin does NOT require a `plugins.AdMob` section in `capacitor.config.ts`. Configuration is done entirely via the native Android files. The existing `capacitor.config.ts` does not need modification in Phase 6. [VERIFIED: package inspection of `@capacitor-community/admob@8.0.0`]

### Anti-Patterns to Avoid

- **Hardcoding the App ID inline in the manifest `android:value` with the real production ID:** Phase 6 uses only the test App ID (in `strings.xml`). Real IDs go only in Phase 10.
- **Forgetting `npx cap sync` after `npm install`:** The plugin registers its Android subproject in `capacitor.settings.gradle`. Without sync, the Android build cannot find the plugin module.
- **Assuming the plugin auto-adds AD_ID permission:** Inspected plugin manifest only declares `INTERNET` and `ACCESS_NETWORK_STATE`. `AD_ID` must be added manually.
- **Modifying `.env` (the base file):** The existing `.env` is git-ignored and holds Firebase secrets. AdMob IDs go into `.env.development` and `.env.production`, not `.env`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AdMob SDK integration | Custom Android GMA setup | `@capacitor-community/admob@8.0.0` | Plugin handles plugin registration, Kotlin bridging, and lifecycle automatically |
| play-services-ads version resolution | Manual Gradle dependency management | `playServicesAdsVersion` override in `variables.gradle` | Plugin's Gradle property override mechanism is the documented approach |
| Env-based ID switching | Custom `import.meta.env.MODE` guards in code | Vite `.env.[mode]` file system | Vite handles file selection per mode automatically — no code needed in Phase 6 |

---

## Common Pitfalls

### Pitfall 1: Missing `npx cap sync` after npm install

**What goes wrong:** Android build fails with "Module ':capacitor-community-admob' not found" or similar Gradle error.

**Why it happens:** `npx cap sync` updates `capacitor.settings.gradle` to include the plugin's Android subproject. The npm install only puts files in `node_modules`; Capacitor's sync step wires the Android project.

**How to avoid:** Always run `npx cap sync` immediately after `npm install @capacitor-community/admob@8.0.0`.

**Warning signs:** `capacitor.settings.gradle` does not contain `capacitor-community-admob` after install.

### Pitfall 2: App crashes on launch with "Missing AdMob App ID"

**What goes wrong:** `IllegalStateException: The Google Mobile Ads SDK was initialized incorrectly` — the app crashes immediately on Android launch.

**Why it happens:** The `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" ...>` entry is missing or malformed in `AndroidManifest.xml`.

**How to avoid:** Ensure both (1) the `<meta-data>` tag is under `<application>` (not under `<activity>`) and (2) the referenced string resource `admob_app_id` exists in `strings.xml`.

**Warning signs:** Logcat shows "The Google Mobile Ads SDK was initialized incorrectly."

### Pitfall 3: Manifest merge conflict between Firebase and AdMob

**What goes wrong:** Gradle build fails with a manifest merger error referencing `android.adservices.AD_SERVICES_CONFIG` from conflicting sources.

**Why it happens:** Both `play-services-ads` and `play-services-measurement-api` (pulled in by Firebase) can declare conflicting `android.adservices.AD_SERVICES_CONFIG` resource references. This has been observed with certain version combinations.

**How to avoid:** Pin `playServicesAdsVersion = '24.3.0'` in `android/variables.gradle`. If the conflict persists despite pinning, add to `AndroidManifest.xml` under `<application>`:
```xml
<property
    android:name="android.adservices.AD_SERVICES_CONFIG"
    android:resource="@xml/gma_ad_services_config"
    tools:replace="android:resource" />
```
(Requires `xmlns:tools="http://schemas.android.com/tools"` on the `<manifest>` tag.)

**Warning signs:** Build error mentions `ProcessLibraryManifest` or `AD_SERVICES_CONFIG`.

### Pitfall 4: AD_ID permission absent in compiled APK (Android 13+)

**What goes wrong:** App targets API 33+ but advertising ID returns all zeros; AdMob revenue is impacted.

**Why it happens:** The plugin's own `AndroidManifest.xml` does NOT declare `AD_ID`. The developer must add it manually.

**How to avoid:** Explicitly add to the app's `AndroidManifest.xml`:
```xml
<uses-permission android:name="com.google.android.gms.permission.AD_ID"/>
```

**Warning signs:** `adb shell dumpsys package com.otis.brooke.rushhour.puzzle | grep AD_ID` returns nothing.

### Pitfall 5: `.env.development` treated as git-ignored

**What goes wrong:** Dev creates `.env.development` but assumes it is git-ignored (because `.env` is in `.gitignore`). The file never gets committed.

**Why it happens:** The `.gitignore` only lists `.env` and `.env.local` — NOT `.env.development` or `.env.production`. These mode-specific files are intentionally committable.

**How to avoid:** Verify `.gitignore` does not contain `.env.development`. Then `git add .env.development .env.production` explicitly.

**Current .gitignore state:** `.env` and `.env.local` are listed. `.env.development` and `.env.production` are NOT listed — they will be tracked. [VERIFIED: read from project .gitignore, 2026-04-12]

### Pitfall 6: Existing `.env` Firebase values — do not modify

**What goes wrong:** AdMob IDs accidentally merged into `.env` (the base file). This would expose Firebase + AdMob IDs in a single file that is git-ignored and machine-local only.

**Why it happens:** Developer edits the wrong file.

**How to avoid:** AdMob IDs go into `.env.development` and `.env.production`. Firebase IDs stay in `.env`. They are separate files.

---

## Code Examples

Verified patterns from official sources and package inspection:

### variables.gradle — Add playServicesAdsVersion pin
```groovy
// android/variables.gradle
// Source: @capacitor-community/admob@8.0.0 build.gradle [VERIFIED: package inspection]
ext {
    minSdkVersion = 24
    compileSdkVersion = 36
    targetSdkVersion = 36
    androidxActivityVersion = '1.11.0'
    androidxAppCompatVersion = '1.7.1'
    androidxCoordinatorLayoutVersion = '1.3.0'
    androidxCoreVersion = '1.17.0'
    androidxFragmentVersion = '1.8.9'
    coreSplashScreenVersion = '1.2.0'
    androidxWebkitVersion = '1.14.0'
    junitVersion = '4.13.2'
    androidxJunitVersion = '1.3.0'
    androidxEspressoCoreVersion = '3.7.0'
    cordovaAndroidVersion = '14.0.1'
    // AdMob: pin to avoid Firebase manifest merge conflict
    playServicesAdsVersion = '24.3.0'
}
```

### AndroidManifest.xml — Full updated file
```xml
<?xml version="1.0" encoding="utf-8" ?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <!-- AdMob App ID — Source: https://developers.google.com/admob/android/quick-start [CITED] -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="@string/admob_app_id"/>

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation|density"
            android:screenOrientation="portrait"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data android:name="android.support.FILE_PROVIDER_PATHS" android:resource="@xml/file_paths" />
        </provider>
    </application>

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <!-- Required for Android 13+ (API 33+) advertising ID — Source: https://developers.google.com/admob/android/quick-start [CITED] -->
    <uses-permission android:name="com.google.android.gms.permission.AD_ID"/>
</manifest>
```

### strings.xml — Add admob_app_id entry
```xml
<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">Rush Hour</string>
    <string name="title_activity_main">Rush Hour</string>
    <string name="package_name">com.rushhour.puzzle</string>
    <string name="custom_url_scheme">com.rushhour.puzzle</string>
    <!-- AdMob test App ID — replace in Phase 10 with real ID -->
    <string name="admob_app_id">ca-app-pub-3940256099942544~3347511713</string>
</resources>
```

### npx cap sync output — what success looks like
```
✔ Copying web assets from dist to android/app/src/main/assets/public
✔ Creating capacitor.config.json in android/app/src/main/assets
✔ copy android time: XXms
✔ Updating Android plugins
  Found X Capacitor plugin for android:
    @capacitor-community/admob (8.0.0)  ← this line confirms plugin registration
✔ update android time: XXms
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| playServicesAdsVersion default: `23.0.0` (v5-v7 plugin docs) | Default is now `24.9.+` in plugin v8.0.0 | Plugin v8.0.0 (Dec 2024) | Pinning to `24.3.0` is within v24 — still valid |
| AD_ID permission required manual add for apps targeting API 33 | Still required manually — plugin manifest has not changed | Ongoing | Developer must add; plugin does not auto-include |
| App ID inline in `android:value` | Recommended: use `@string/admob_app_id` reference | Ongoing best practice | Cleaner diffs; value in strings.xml |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Pinning `playServicesAdsVersion = '24.3.0'` (a lower minor than the plugin's default `24.9.+`) resolves the Firebase/AdMob manifest merge conflict for this project's specific Firebase version | Common Pitfalls — Pitfall 3 | Build may still have manifest merge conflict; fallback is the `tools:replace` property fix documented in Pitfall 3 |
| A2 | Java is available in the Android Studio environment (not found in bash PATH) — `npx cap sync` succeeds but a full Gradle build requires Java/Android Studio | Environment Availability | Plan tasks for building the app must be done from Android Studio or with JAVA_HOME set |

---

## Open Questions

1. **Exact play-services-ads version compatibility at `24.3.0` with `com.google.gms:google-services:4.4.4`**
   - What we know: The CONTEXT.md locked `24.3.0` based on prior research. Plugin v8.0.0 defaults to `24.9.+`.
   - What's unclear: Whether `24.3.0` specifically avoids the conflict with the Firebase dependencies in this project (which uses `com.google.gms:google-services:4.4.4` in root `build.gradle`).
   - Recommendation: Pin as decided. If Gradle sync fails with a manifest conflict, apply the `tools:replace` fallback from Pitfall 3. This does not block Phase 6 planning.

2. **String resource vs inline App ID**
   - What we know: Both approaches work; string resource is best practice.
   - What's unclear: Whether Phase 10 (real IDs) should update `strings.xml` or switch to environment-injected manifest substitution.
   - Recommendation: Use `strings.xml` for Phase 6. Phase 10 can decide how to swap real IDs.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm install, npx cap sync | Yes | v22.17.0 | — |
| npx / Capacitor CLI | cap sync | Yes | 8.2.0 | — |
| Java / JDK | Gradle build (Android Studio) | Not in bash PATH | — | Use Android Studio's bundled JDK for builds |
| Android SDK | Gradle build | Not verified in bash | — | Android Studio manages this |

**Missing dependencies with no fallback:**
- Java in PATH blocks command-line `./gradlew` builds. Plans that verify the build MUST use Android Studio or set `JAVA_HOME`. This is expected in a Windows dev environment where Android Studio manages Java.

**Missing dependencies with fallback:**
- None that affect Phase 6 scope — `npm install` and `npx cap sync` both work with Node.js only.

---

## Validation Architecture

> `workflow.nyquist_validation` is absent from config.json — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (configured in package.json) |
| Config file | none (vitest uses vite.config.ts implicitly) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SETUP-01 | Plugin installs and `npx cap sync` completes without error | manual-only | `npx cap sync` (visual inspection) | N/A — no unit test |
| SETUP-02 | App launches on Android without crash | manual-only | Launch app in emulator or device | N/A — runtime check |
| SETUP-03 | `playServicesAdsVersion = '24.3.0'` in variables.gradle | file content check | `grep playServicesAdsVersion android/variables.gradle` | ❌ Wave 0 (grep script) |
| SETUP-04 | `AD_ID` permission in compiled manifest | manual-only | `adb shell dumpsys package ... | grep AD_ID` | N/A — requires device |
| SETUP-05 | Env files exist with correct IDs | file content check | `cat .env.development .env.production` | ❌ Wave 0 (file existence) |

**Manual-only justification:** SETUP-01, SETUP-02, SETUP-04 require Android runtime — cannot be automated as unit/integration tests. They are verified by the developer after build.

### Sampling Rate

- **Per task commit:** `npm test` (existing engine/UI tests — confirms no regressions from config changes)
- **Per wave merge:** `npm test`
- **Phase gate:** Manual device/emulator verification of launch + grep checks before `/gsd-verify-work`

### Wave 0 Gaps

- No new test files are required for Phase 6 — changes are native Android config files and `.env` files. Existing Vitest suite covers TypeScript regression. Manual verification is the acceptance gate.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no | Config-only phase, no user input |
| V6 Cryptography | no | — |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Committing real production AdMob IDs in `.env.production` | Information Disclosure | `.env.production` uses `TODO` placeholders; real IDs entered in Phase 10 only |
| Using live AdMob App ID in dev builds | Spoofing / Policy violation | Phase 6 uses Google's public test App ID (`ca-app-pub-3940256099942544~3347511713`) exclusively |

**Note:** The existing `.env` file (Firebase keys) is git-ignored. The new `.env.development` and `.env.production` files contain only public Google test IDs — no secrets. Committing them is intentional and safe.

---

## Sources

### Primary (HIGH confidence)
- `@capacitor-community/admob@8.0.0` package inspection (build.gradle, AndroidManifest.xml) — playServicesAdsVersion default, AD_ID permission gap, plugin dependencies
- npm registry — confirmed latest version is `8.0.0` [VERIFIED: npm view @capacitor-community/admob version]
- [vite.dev/guide/env-and-mode](https://vite.dev/guide/env-and-mode) — env file priority order, mode behavior [CITED]
- [developers.google.com/admob/android/quick-start](https://developers.google.com/admob/android/quick-start) — AndroidManifest meta-data syntax, AD_ID requirement for API 33+ [CITED]
- Project codebase — `android/variables.gradle`, `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/res/values/strings.xml`, `.gitignore` [VERIFIED: read directly]

### Secondary (MEDIUM confidence)
- [github.com/capacitor-community/admob/issues/161](https://github.com/capacitor-community/admob/issues/161) — AD_ID permission discussion; plugin does not auto-include it [CITED]
- [andresand.medium.com — Fix Firebase + AdMob manifest conflict](https://andresand.medium.com/fix-issue-with-the-dependencies-admob-and-firebase-d3747fcf123e) — `tools:replace` fallback approach [CITED]
- [developers.google.com/admob/android/test-ads](https://developers.google.com/admob/android/test-ads) — Official Google test App ID and ad unit IDs [CITED]

### Tertiary (LOW confidence)
- None — all critical claims are VERIFIED or CITED.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — plugin version verified on npm registry; build.gradle defaults read directly from package
- Architecture: HIGH — file contents read from project; Vite env behavior verified from official docs
- Pitfalls: HIGH for Pitfall 2 (official AdMob docs), MEDIUM for Pitfall 3 (version-combination specific)

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable ecosystem; plugin v8.0.0 is current latest)
