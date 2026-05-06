// ─── AdSlot — banner between feed tiles ──────────────────────────────────────
// Renders nothing when ads are off (zero height, zero layout impact).
// When ads are on: shows a Medium Rectangle (300×250) banner.
//
// TO ACTIVATE:
//   npm install react-native-google-mobile-ads
//   Uncomment the BannerAd import + render below
//   Set adsEnabled() → true in lib/ads.ts

import { View, Text, StyleSheet } from 'react-native'
import { T } from '../lib/theme'
import { adsEnabled, AD_UNITS } from '../lib/ads'

// import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads'

export function AdSlot() {
  if (!adsEnabled()) return null

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>SPONSORED</Text>

      {/* ── Replace this placeholder with BannerAd when AdMob is installed ── */}
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Ad</Text>
      </View>

      {/*
      <BannerAd
        unitId={AD_UNITS.banner}
        size={BannerAdSize.MEDIUM_RECTANGLE}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
      */}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  label: {
    fontFamily: 'Courier New',
    fontSize: 9,
    letterSpacing: 1.5,
    color: T.inkSoft,
    opacity: 0.5,
    textTransform: 'uppercase',
  },
  placeholder: {
    width: 300,
    height: 250,
    borderRadius: T.radius.card,
    backgroundColor: T.surfaceTint,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: T.inkSoft,
    opacity: 0.4,
    fontFamily: 'Anton_400Regular',
    fontSize: 14,
    letterSpacing: 2,
  },
})
