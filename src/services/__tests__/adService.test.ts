import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    requestConsentInfo: vi.fn(),
    showConsentForm: vi.fn(),
    showPrivacyOptionsForm: vi.fn(),
    initialize: vi.fn(),
  },
  AdmobConsentDebugGeography: {
    DISABLED: 0,
    EEA: 1,
    NOT_EEA: 2,
  },
  AdmobConsentStatus: {
    UNKNOWN: 0,
    NOT_REQUIRED: 1,
    REQUIRED: 2,
    OBTAINED: 3,
  },
}));

describe('adService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Test 1 (GDPR-04 safe default): waitForConsent() returns a resolved promise before initAdService() is called', async () => {
    const { waitForConsent } = await import('../adService');
    // Should resolve without throwing even before initAdService() is called
    await expect(waitForConsent()).resolves.toBeUndefined();
  });

  it('Test 2 (GDPR-01): initAdService() calls AdMob.requestConsentInfo exactly once', async () => {
    const { AdMob } = await import('@capacitor-community/admob');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValue({
      status: 1, // NOT_REQUIRED
      canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED' as any,
      isConsentFormAvailable: false,
    });

    const { initAdService, waitForConsent } = await import('../adService');
    initAdService();
    await waitForConsent();

    expect(AdMob.requestConsentInfo).toHaveBeenCalledTimes(1);
  });

  it('Test 3 (GDPR-03 non-EEA happy path): When status is NOT_REQUIRED, showConsentForm is NOT called', async () => {
    const { AdMob } = await import('@capacitor-community/admob');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValue({
      status: 1, // NOT_REQUIRED
      canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED' as any,
      isConsentFormAvailable: false,
    });

    const { initAdService, waitForConsent } = await import('../adService');
    initAdService();
    await waitForConsent();

    expect(AdMob.showConsentForm).not.toHaveBeenCalled();
  });

  it('Test 4 (GDPR-02 branch — EEA required): When status is REQUIRED and form available, showConsentForm IS called', async () => {
    const { AdMob } = await import('@capacitor-community/admob');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValue({
      status: 2, // REQUIRED
      canRequestAds: false,
      privacyOptionsRequirementStatus: 'REQUIRED' as any,
      isConsentFormAvailable: true,
    });
    vi.mocked(AdMob.showConsentForm).mockResolvedValue({
      status: 3, // OBTAINED
      canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED' as any,
    });

    const { initAdService, waitForConsent } = await import('../adService');
    initAdService();
    await waitForConsent();

    expect(AdMob.showConsentForm).toHaveBeenCalledTimes(1);
  });

  it('Test 5 (GDPR-02 branch — form unavailable): When status is REQUIRED but form unavailable, showConsentForm is NOT called', async () => {
    const { AdMob } = await import('@capacitor-community/admob');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValue({
      status: 2, // REQUIRED
      canRequestAds: false,
      privacyOptionsRequirementStatus: 'REQUIRED' as any,
      isConsentFormAvailable: false,
    });

    const { initAdService, waitForConsent } = await import('../adService');
    initAdService();
    await waitForConsent();

    expect(AdMob.showConsentForm).not.toHaveBeenCalled();
  });

  it('Test 6 (debug EEA flag off): With VITE_ADMOB_DEBUG_EEA unset, requestConsentInfo called without debugGeography', async () => {
    // Ensure env var is not set
    vi.stubEnv('VITE_ADMOB_DEBUG_EEA', '');

    const { AdMob } = await import('@capacitor-community/admob');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValue({
      status: 1, // NOT_REQUIRED
      canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED' as any,
      isConsentFormAvailable: false,
    });

    const { initAdService, waitForConsent } = await import('../adService');
    initAdService();
    await waitForConsent();

    const callArg = vi.mocked(AdMob.requestConsentInfo).mock.calls[0][0];
    expect(callArg).not.toHaveProperty('debugGeography');
  });

  it('Test 7 (debug EEA flag on): With VITE_ADMOB_DEBUG_EEA=true, requestConsentInfo called with debugGeography EEA', async () => {
    vi.stubEnv('VITE_ADMOB_DEBUG_EEA', 'true');

    const { AdMob, AdmobConsentDebugGeography } = await import('@capacitor-community/admob');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValue({
      status: 1, // NOT_REQUIRED
      canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED' as any,
      isConsentFormAvailable: false,
    });

    const { initAdService, waitForConsent } = await import('../adService');
    initAdService();
    await waitForConsent();

    expect(AdMob.requestConsentInfo).toHaveBeenCalledWith(
      expect.objectContaining({ debugGeography: AdmobConsentDebugGeography.EEA })
    );
  });

  it('Test 8 (Phase 7 scope guard): adService never calls AdMob.initialize', async () => {
    const { AdMob } = await import('@capacitor-community/admob');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValue({
      status: 1, // NOT_REQUIRED
      canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED' as any,
      isConsentFormAvailable: false,
    });

    const { initAdService, waitForConsent } = await import('../adService');
    initAdService();
    await waitForConsent();

    expect(AdMob.initialize).not.toHaveBeenCalled();
  });
});
