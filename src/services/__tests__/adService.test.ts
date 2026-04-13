import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    requestConsentInfo: vi.fn(),
    showConsentForm: vi.fn(),
    showPrivacyOptionsForm: vi.fn(),
    initialize: vi.fn().mockResolvedValue(undefined),
    showBanner: vi.fn(),
    removeBanner: vi.fn(),
    addListener: vi.fn(),
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
  BannerAdSize: { ADAPTIVE_BANNER: 'ADAPTIVE_BANNER' },
  BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' },
  BannerAdPluginEvents: {
    SizeChanged: 'bannerAdSizeChanged',
    Loaded: 'bannerAdLoaded',
    FailedToLoad: 'bannerAdFailedToLoad',
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

  it('Test 8 (Phase 8 init gate): initAdService() calls AdMob.initialize exactly once', async () => {
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

    expect(AdMob.initialize).toHaveBeenCalledTimes(1);
  });

  it('Test 9 (BANNER-01): showBanner() calls AdMob.showBanner exactly once after consent resolves', async () => {
    const { AdMob } = await import('@capacitor-community/admob');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValue({
      status: 1, // NOT_REQUIRED
      canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED' as any,
      isConsentFormAvailable: false,
    });
    vi.mocked(AdMob.showBanner).mockResolvedValue(undefined);

    const { initAdService, showBanner } = await import('../adService');
    initAdService();
    await showBanner();

    expect(AdMob.showBanner).toHaveBeenCalledTimes(1);
  });

  it('Test 10 (BANNER-01 / GDPR-04): showBanner() waits for consent — AdMob.showBanner not called until consent resolves', async () => {
    const { AdMob } = await import('@capacitor-community/admob');
    let resolveConsent!: (v: any) => void;
    vi.mocked(AdMob.requestConsentInfo).mockReturnValue(
      new Promise((r) => { resolveConsent = r; })
    );
    vi.mocked(AdMob.showBanner).mockResolvedValue(undefined);

    const { initAdService, showBanner } = await import('../adService');
    initAdService();
    const bannerPromise = showBanner();
    expect(AdMob.showBanner).not.toHaveBeenCalled();
    resolveConsent({ status: 1, canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED', isConsentFormAvailable: false });
    await bannerPromise;
    expect(AdMob.showBanner).toHaveBeenCalledTimes(1);
  });

  it('Test 11 (BANNER-02): showBanner() passes ADAPTIVE_BANNER and BOTTOM_CENTER to AdMob.showBanner', async () => {
    const { AdMob, BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValue({
      status: 1,
      canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED' as any,
      isConsentFormAvailable: false,
    });
    vi.mocked(AdMob.showBanner).mockResolvedValue(undefined);

    const { initAdService, showBanner } = await import('../adService');
    initAdService();
    await showBanner();

    expect(AdMob.showBanner).toHaveBeenCalledWith(
      expect.objectContaining({
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
      })
    );
  });

  it('Test 12 (BANNER-02): showBanner() passes isTesting: true when import.meta.env.DEV is truthy', async () => {
    vi.stubEnv('DEV', 'true');
    const { AdMob } = await import('@capacitor-community/admob');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValue({
      status: 1,
      canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED' as any,
      isConsentFormAvailable: false,
    });
    vi.mocked(AdMob.showBanner).mockResolvedValue(undefined);

    const { initAdService, showBanner } = await import('../adService');
    initAdService();
    await showBanner();

    expect(AdMob.showBanner).toHaveBeenCalledWith(
      expect.objectContaining({ isTesting: true })
    );
  });

  it('Test 13 (removeBanner contract): removeBanner() calls AdMob.removeBanner exactly once and resolves', async () => {
    const { AdMob } = await import('@capacitor-community/admob');
    vi.mocked(AdMob.removeBanner).mockResolvedValue(undefined);

    const { removeBanner } = await import('../adService');
    await removeBanner();

    expect(AdMob.removeBanner).toHaveBeenCalledTimes(1);
  });

  it('Test 14 (BANNER-05 unit aspect): When AdMob.showBanner rejects, showBanner() propagates the rejection', async () => {
    const { AdMob } = await import('@capacitor-community/admob');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValue({
      status: 1,
      canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED' as any,
      isConsentFormAvailable: false,
    });
    vi.mocked(AdMob.showBanner).mockRejectedValue(new Error('Ad failed to load'));

    const { initAdService, showBanner } = await import('../adService');
    initAdService();

    await expect(showBanner()).rejects.toThrow();
  });
});
