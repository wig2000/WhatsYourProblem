import { put, del, copy } from '@vercel/blob'

export async function uploadMemeAsset(
  path: string,
  buffer: Buffer,
  contentType: 'image/webp' | 'image/png' = 'image/webp'
): Promise<{ url: string; pathname: string }> {
  const blob = await put(path, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
  })
  return { url: blob.url, pathname: blob.pathname }
}

export async function deleteAsset(url: string): Promise<void> {
  try {
    await del(url)
  } catch {
    // Non-fatal — cleanup cron handles stragglers
  }
}

export async function deleteAssets(urls: string[]): Promise<void> {
  if (urls.length === 0) return
  await del(urls)
}

export async function copyToFinal(
  sourceUrl: string,
  destPath: string
): Promise<{ url: string }> {
  const blob = await copy(sourceUrl, destPath, {
    access: 'public',
    addRandomSuffix: false,
  })
  return { url: blob.url }
}
