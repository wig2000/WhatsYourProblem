import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts, Anton_400Regular } from '@expo-google-fonts/anton'
import { T } from '../lib/theme'
import { ATTPrePrompt } from '../components/ATTPrePrompt'
import {
  shouldShowATTPrePrompt,
  requestATTPermission,
  skipATTAndInit,
  initAdsWithExistingATTStatus,
} from '../lib/ads'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Anton_400Regular })
  const [attPromptVisible, setAttPromptVisible] = useState(false)

  useEffect(() => {
    if (!fontsLoaded) return
    SplashScreen.hideAsync()

    // Check whether to show our custom pre-prompt or just silently init ads
    shouldShowATTPrePrompt()
      .then((should) => {
        if (should) {
          setAttPromptVisible(true)
        } else {
          // ATT already decided on a previous session (or Android) — init directly
          initAdsWithExistingATTStatus().catch(() => {})
        }
      })
      .catch(() => {
        initAdsWithExistingATTStatus().catch(() => {})
      })
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />

      {/* ATT pre-prompt — shown once on first launch, before system dialog */}
      <ATTPrePrompt
        visible={attPromptVisible}
        onAllow={async () => {
          setAttPromptVisible(false)
          await requestATTPermission()   // triggers system ATT dialog
        }}
        onSkip={async () => {
          setAttPromptVisible(false)
          await skipATTAndInit()         // no tracking, non-personalised ads
        }}
      />

      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: T.bg },
          headerTintColor: T.ink,
          headerTitleStyle: { fontFamily: 'Anton_400Regular', fontSize: 16 },
          contentStyle: { backgroundColor: T.bg },
          animation: 'slide_from_right',
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="feed" options={{ headerShown: false }} />
        <Stack.Screen name="meme/[id]" options={{ title: 'YOUR MEME' }} />
        <Stack.Screen name="customise/[id]" options={{ title: 'TART IT UP' }} />
      </Stack>
    </SafeAreaProvider>
  )
}
