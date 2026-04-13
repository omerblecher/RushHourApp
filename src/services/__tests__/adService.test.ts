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
    prepareInterstitial: vi.fn(),
    showInterstitial: vi.fn(),
    removeAllListeners: vi.fn(),
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
  InterstitialAdPluginEvents: {
    Dismissed: 'interstitialAdDismissed',
    FailedToLoad: 'interstitialAdFailedToLoad',
    FailedToShow: 'interstitialAdFailedToShow',
    Loaded: 'interstitialAdLoaded',
    Showed: 'interstitialAdShowed',
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

  // ========== Phase 9 — Interstitial ==========

  it('Test 15 (INTER-01): prepareInterstitial() awaits consent and calls AdMob.prepareInterstitial exactly once', async () => {
    const { AdMob } = await import('@capacitor-community/admob');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValue({
      status: 1,
      canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED' as any,
      isConsentFormAvailable: false,
    });
    vi.mocked(AdMob.prepareInterstitial).mockResolvedValue(undefined as any);

    const { initAdService, prepareInterstitial } = await import('../adService');
    initAdService();
    await prepareInterstitial();

    expect(AdMob.prepareInterstitial).toHaveBeenCalledTimes(1);
  });

  it('Test 16 (INTER-01): prepareInterstitial() passes adId from env and isTesting=true in DEV', async () => {
    vi.stubEnv('DEV', 'true');
    vi.stubEnv('VITE_ADMOB_INTERSTITIAL_ID', 'ca-app-pub-test/interstitial');
    const { AdMob } = await import('@capacitor-community/admob');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValue({
      status: 1, canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED' as any,
      isConsentFormAvailable: false,
    });
    vi.mocked(AdMob.prepareInterstitial).mockResolvedValue(undefined as any);

    const { initAdService, prepareInterstitial } = await import('../adService');
    initAdService();
    await prepareInterstitial();

    expect(AdMob.prepareInterstitial).toHaveBeenCalledWith(
      expect.objectContaining({
        adId: 'ca-app-pub-test/interstitial',
        isTesting: true,
      })
    );
  });

  it('Test 17 (INTER-02 counter): showInterstitialIfDue() does NOT call showInterstitial on win 1 or win 2', async () => {
    const { AdMob } = await import('@capacitor-community/admob');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValue({
      status: 1, canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED' as any,
      isConsentFormAvailable: false,
    });

    const { initAdService, showInterstitialIfDue } = await import('../adService');
    initAdService();
    await showInterstitialIfDue();
    await showInterstitialIfDue();

    expect(AdMob.showInterstitial).not.toHaveBeenCalled();
  });

  it('Test 18 (INTER-02 counter): showInterstitialIfDue() calls showInterstitial exactly once on win 3', async () => {
    const { AdMob } = await import('@capacitor-community/admob');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValue({
      status: 1, canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED' as any,
      isConsentFormAvailable: false,
    });
    vi.mocked(AdMob.addListener).mockImplementation(((_event: any, cb: any) => {
      // Fire Dismissed synchronously so the promise resolves
      setTimeout(() => cb(), 0);
      return Promise.resolve({ remove: vi.fn() });
    }) as any);
    vi.mocked(AdMob.showInterstitial).mockResolvedValue(undefined as any);
    vi.mocked(AdMob.prepareInterstitial).mockResolvedValue(undefined as any);

    const { initAdService, showInterstitialIfDue } = await import('../adService');
    initAdService();
    await showInterstitialIfDue();
    await showInterstitialIfDue();
    await showInterstitialIfDue();

    expect(AdMob.showInterstitial).toHaveBeenCalledTimes(1);
  });

  it('Test 19 (INTER-02 counter): showInterstitialIfDue() shows on win 3 AND win 6 (every 3rd)', async () => {
    const { AdMob } = await import('@capacitor-community/admob');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValue({
      status: 1, canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED' as any,
      isConsentFormAvailable: false,
    });
    vi.mocked(AdMob.addListener).mockImplementation(((_event: any, cb: any) => {
      setTimeout(() => cb(), 0);
      return Promise.resolve({ remove: vi.fn() });
    }) as any);
    vi.mocked(AdMob.showInterstitial).mockResolvedValue(undefined as any);
    vi.mocked(AdMob.prepareInterstitial).mockResolvedValue(undefined as any);

    const { initAdService, showInterstitialIfDue } = await import('../adService');
    initAdService();
    for (let i = 0; i < 6; i++) {
      await showInterstitialIfDue();
    }

    expect(AdMob.showInterstitial).toHaveBeenCalledTimes(2);
  });

  it('Test 20 (INTER-03 reload): When Dismissed fires, prepareInterstitial is called again to reload', async () => {
    const { AdMob } = await import('@capacitor-community/admob');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValue({
      status: 1, canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED' as any,
      isConsentFormAvailable: false,
    });
    vi.mocked(AdMob.addListener).mockImplementation(((_event: any, cb: any) => {
      setTimeout(() => cb(), 0);
      return Promise.resolve({ remove: vi.fn() });
    }) as any);
    vi.mocked(AdMob.showInterstitial).mockResolvedValue(undefined as any);
    vi.mocked(AdMob.prepareInterstitial).mockResolvedValue(undefined as any);

    const { initAdService, prepareInterstitial, showInterstitialIfDue } = await import('../adService');
    initAdService();
    await prepareInterstitial(); // initial preload (call 1)
    await showInterstitialIfDue();
    await showInterstitialIfDue();
    await showInterstitialIfDue(); // 3rd → triggers show + Dismissed → reload (call 2)

    // Allow the microtask queue to flush so the void prepareInterstitial() in the listener runs
    await new Promise((r) => setTimeout(r, 10));

    expect(AdMob.prepareInterstitial).toHaveBeenCalledTimes(2);
  });

  it('Test 21 (INTER-04 timeout): showInterstitialIfDue() resolves within timeout when Dismissed never fires', async () => {
    vi.useFakeTimers();
    const { AdMob } = await import('@capacitor-community/admob');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValue({
      status: 1, canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED' as any,
      isConsentFormAvailable: false,
    });
    // addListener never fires its callback — simulates ad hang
    vi.mocked(AdMob.addListener).mockResolvedValue({ remove: vi.fn() } as any);
    vi.mocked(AdMob.showInterstitial).mockResolvedValue(undefined as any);

    const { initAdService, showInterstitialIfDue } = await import('../adService');
    initAdService();
    await vi.runAllTimersAsync(); // flush consent
    // Need to advance non-fake-timer awaits manually — use real timers for the gating awaits
    vi.useRealTimers();
    await showInterstitialIfDue(); // win 1 (no-op)
    await showInterstitialIfDue(); // win 2 (no-op)
    vi.useFakeTimers();
    const promise = showInterstitialIfDue(); // win 3 → enters race
    await vi.advanceTimersByTimeAsync(5000);
    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it('Test 22 (INTER-05 session reset): Re-importing the module resets _winCount to 0', async () => {
    const { AdMob } = await import('@capacitor-community/admob');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValue({
      status: 1, canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED' as any,
      isConsentFormAvailable: false,
    });

    // Round 1: tick the counter twice
    {
      const { initAdService, showInterstitialIfDue } = await import('../adService');
      initAdService();
      await showInterstitialIfDue();
      await showInterstitialIfDue();
      expect(AdMob.showInterstitial).not.toHaveBeenCalled();
    }

    // Simulate app restart
    vi.resetModules();
    vi.clearAllMocks();
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValue({
      status: 1, canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED' as any,
      isConsentFormAvailable: false,
    });

    // Round 2: only one win — should NOT show (counter was reset to 0, then incremented to 1)
    {
      const { initAdService, showInterstitialIfDue } = await import('../adService');
      initAdService();
      await showInterstitialIfDue();
      expect(AdMob.showInterstitial).not.toHaveBeenCalled();
    }
  });
});
