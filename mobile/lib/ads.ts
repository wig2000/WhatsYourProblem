// ─── Ad feature flag ─────────────────────────────────────────────────────────
// Flip to true and add real unit IDs when AdMob is configured.
// All ad components read this — toggling it here turns every placement on/off.

export const adsEnabled = (): boolean => false

// Unit IDs — swap YOUR_xxx_ID for real IDs from AdMob console.
// Test IDs below are Google's official test IDs (safe to call, never charge).
const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : true

export const AD_UNITS = {
  banner:       IS_DEV ? 'ca-app-pub-3940256099942544/6300978111'  : 'YOUR_BANNER_ID', // ← still needed
  interstitial: IS_DEV ? 'ca-app-pub-3940256099942544/1033173712' : 'ca-app-pub-3131750897668019/6350734629',
}
