import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0D0D0D' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#0D0D0D' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ title: "What's Your Problem?" }} />
        <Stack.Screen
          name="generating"
          options={{ title: 'Generating Memes…', headerBackVisible: false }}
        />
        <Stack.Screen name="meme/[id]" options={{ title: 'Your Meme' }} />
        <Stack.Screen name="customise/[id]" options={{ title: 'Customise' }} />
      </Stack>
    </>
  )
}
