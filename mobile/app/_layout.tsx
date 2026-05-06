import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts, Anton_400Regular } from '@expo-google-fonts/anton'
import { T } from '../lib/theme'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Anton_400Regular })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
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
