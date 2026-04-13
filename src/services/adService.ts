import { AdMob, AdmobConsentDebugGeography, AdmobConsentStatus, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import type { AdmobConsentRequestOptions } from '@capacitor-community/admob';

// Safe default: resolved promise so waitForConsent() never throws if called before initAdService()
// (Per RESEARCH.md Pitfall 3 — protects against tree-shake/import-order bugs)
let _consentReady: Promise<void> = Promise.resolve();

async function runConsentFlow(): Promise<void> {
  const options: AdmobConsentRequestOptions = {};
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
  _consentReady = runConsentFlow();
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
