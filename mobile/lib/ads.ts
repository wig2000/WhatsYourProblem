// ─── Ad feature flag ─────────────────────────────────────────────────────────
// Flip to true and add real unit IDs when AdMob is configured.
// All ad components read this — toggling it here turns every placement on/off.

export const adsEnabled = (): boolean => false

// Unit IDs — swap YOUR_xxx_ID for real IDs from AdMob console.
// Test IDs below are Google's official test IDs (safe to call, never charge).
const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : true

export const AD_UNITS = {
  banner:               IS_DEV ? 'ca-app-pub-3940256099942544/6300978111'  : 'YOUR_BANNER_ID',
  interstitial:         IS_DEV ? 'ca-app-pub-3940256099942544/1033173712' : 'ca-app-pub-3131750897668019/6350734629',
  rewardedInterstitial: IS_DEV ? 'ca-app-pub-3940256099942544/6978759866' : 'YOUR_REWARDED_INTERSTITIAL_ID',
}

// ─── ATT + personalisation ────────────────────────────────────────────────────
// _personalizedAdsAllowed is set once per app session during ATT flow.
// All ad components read isPersonalizedAdsAllowed() when building ad requests.

let _personalizedAdsAllowed = false
export const isPersonalizedAdsAllowed = () => _personalizedAdsAllowed

/**
 * Returns true if iOS and ATT status is 'undetermined' — i.e. we should show
 * the custom pre-prompt screen before triggering the system dialog.
 * Returns false on Android (no ATT needed) or if already decided.
 */
export async function shouldShowATTPrePrompt(): Promise<boolean> {
  const { Platform } = require('react-native')
  if (Platform.OS !== 'ios') return false
  try {
    const { getTrackingPermissionsAsync } = require('expo-tracking-transparency')
    const { status } = await getTrackingPermissionsAsync()
    return status === 'undetermined'
  } catch {
    return false
  }
}

/**
 * Triggers the iOS system ATT dialog (called when user taps "Sounds good" in
 * the pre-prompt). Sets personalisation flag, then initialises the ads SDK.
 */
export async function requestATTPermission(): Promise<void> {
  try {
    const { requestTrackingPermissionsAsync } = require('expo-tracking-transparency')
    const { status } = await requestTrackingPermissionsAsync()
    _personalizedAdsAllowed = status === 'granted'
  } catch {
    _personalizedAdsAllowed = false
  }
  await _initMobileAds()
}

/**
 * Called when user taps "No thanks" in the pre-prompt — skips ATT entirely,
 * non-personalised ads only. Still initialises the ads SDK.
 */
export async function skipATTAndInit(): Promise<void> {
  _personalizedAdsAllowed = false
  await _initMobileAds()
}

/**
 * Called on subsequent app launches when ATT status is already determined
 * (user was asked on a previous session). Reads current status and inits SDK.
 * Also used as the Android entry point (no ATT dialog needed).
 */
export async function initAdsWithExistingATTStatus(): Promise<void> {
  const { Platform } = require('react-native')
  if (Platform.OS !== 'ios') {
    _personalizedAdsAllowed = true
  } else {
    try {
      const { getTrackingPermissionsAsync } = require('expo-tracking-transparency')
      const { status } = await getTrackingPermissionsAsync()
      _personalizedAdsAllowed = status === 'granted'
    } catch {
      _personalizedAdsAllowed = false
    }
  }
  await _initMobileAds()
}

/**
 * Shows a rewarded interstitial ad and resolves when it is dismissed.
 * If ads are disabled, the native module is missing, or no fill, resolves immediately.
 * Use this for the surreal unlock flow — await it alongside the generation API call.
 */
export function showRewardedInterstitial(): Promise<void> {
  return new Promise((resolve) => {
    if (!adsEnabled()) { resolve(); return }
    try {
      const { RewardedInterstitialAd, AdEventType, RewardedAdEventType } =
        require('react-native-google-mobile-ads')

      const ad = RewardedInterstitialAd.createForAdRequest(
        AD_UNITS.rewardedInterstitial,
        { requestNonPersonalizedAdsOnly: !isPersonalizedAdsAllowed() }
      )

      const done = () => { unsub(); resolve() }
      const fallback = setTimeout(done, 8_000)

      function unsub() {
        clearTimeout(fallback)
        try { unsubLoaded(); unsubClosed(); unsubError() } catch {}
      }

      const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        clearTimeout(fallback)
        ad.show().catch(done)
      })
      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, done)
      const unsubError  = ad.addAdEventListener(AdEventType.ERROR,  done)

      ad.load()
    } catch {
      resolve()
    }
  })
}

async function _initMobileAds(): Promise<void> {
  if (!adsEnabled()) return
  try {
    const { MobileAds } = require('react-native-google-mobile-ads')
    await MobileAds().initialize()
  } catch {
    // Native module not present in Expo Go — safe to ignore
  }
}
