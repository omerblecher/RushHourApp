import { AdMob, AdmobConsentDebugGeography, AdmobConsentStatus, BannerAdSize, BannerAdPosition, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import type { AdmobConsentRequestOptions } from '@capacitor-community/admob';

// Safe default: resolved promise so waitForConsent() never throws if called before initAdService()
// (Per RESEARCH.md Pitfall 3 — protects against tree-shake/import-order bugs)
let _consentReady: Promise<void> = Promise.resolve();

// Phase 9 — interstitial frequency-cap counter. Module-level = session-only (resets on app restart).
// Satisfies INTER-05 with zero persistence code.
const AD_TIMEOUT_MS = 5000;
let _winCount = 0;

async function runConsentFlow(): Promise<void> {
  // Privacy policy hosted on GitHub Pages (Phase 10, RELEASE-02)
  // privacyPolicyUrl is not typed in plugin v8 AdmobConsentRequestOptions — cast required.
  const options = {
    privacyPolicyUrl: 'https://omerblecher.github.io/RushHourApp/privacy-policy.html',
  } as AdmobConsentRequestOptions;
  if (import.meta.env.VITE_ADMOB_DEBUG_EEA === 'true') {
    options.debugGeography = AdmobConsentDebugGeography.EEA;
    const deviceId = import.meta.env.VITE_ADMOB_DEBUG_DEVICE_ID;
    if (deviceId) options.testDeviceIdentifiers = [deviceId];
  }

  const info = await AdMob.requestConsentInfo(options);

  // Only show the form when UMP SDK says it is required AND a form is available.
  // Per RESEARCH.md A2: UNKNOWN/OBTAINED/NOT_REQUIRED should NOT trigger the form.
  if (info.status === AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable === true) {
    await AdMob.showConsentForm();
  }
  // _consentReady resolves here — Phase 8/9 ad code awaits this before touching any ad API.
}

export function initAdService(): void {
  _consentReady = AdMob.initialize().then(() => runConsentFlow());
}

export function waitForConsent(): Promise<void> {
  return _consentReady;
}

export function showConsentForm(): Promise<unknown> {
  // Used by ProfileScreen "Privacy Settings" button (Plan 02) — revisit entry point.
  // NOTE: This calls showPrivacyOptionsForm (NOT showConsentForm) per RESEARCH.md Pitfall 2.
  return AdMob.showPrivacyOptionsForm();
}

export async function showBanner(): Promise<void> {
  await waitForConsent();
  await AdMob.showBanner({
    adId: import.meta.env.VITE_ADMOB_BANNER_ID,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
    isTesting: import.meta.env.DEV,
  });
}

export async function removeBanner(): Promise<void> {
  await AdMob.removeBanner();
}

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

  // Hoist resolve so the listener callback can reach it.
  let resolveShow!: () => void;
  const showAndWait = new Promise<void>((resolve) => { resolveShow = resolve; });

  // Await listener registration BEFORE showing the ad to eliminate the race
  // condition where Dismissed fires before the handler is attached.
  const handle = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
    void handle.remove(); // one-shot: prevent listener accumulation across wins
    // Reload is intentionally NOT triggered here. The caller (GameScreen) owns the
    // reload timing — it fires prepareInterstitial() when WinModal opens (user is idle
    // and any native download overlay is hidden behind the modal). This avoids the
    // AdMob loading-loop restriction AND the white-screen artifact on the next win.
    resolveShow();
  });

  void AdMob.showInterstitial();

  const timeout = new Promise<void>((res) => setTimeout(res, AD_TIMEOUT_MS));
  await Promise.race([showAndWait, timeout]);

  // Timeout path: remove the listener so it doesn't fire stale on future ads.
  void handle.remove();
}
