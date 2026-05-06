import * as SecureStore from 'expo-secure-store'

const KEY = 'wyp_consent'

export async function getConsent(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(KEY)
  return val === 'true'
}

export async function setConsent(given: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEY, given ? 'true' : 'false')
}
