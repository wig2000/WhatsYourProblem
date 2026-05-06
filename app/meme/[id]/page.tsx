import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getSharedMeme } from '@/lib/db/queries'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const meme = await getSharedMeme(id)
  if (!meme) return { title: "What's Your Problem?" }

  return {
    title: "Someone had a problem. | What's Your Problem?",
    description: 'See the meme. Then make your own.',
    openGraph: {
      title: "Someone had a problem.",
      description: 'Turn your complaints into shareable memes at whatsproblem.com',
      images: [{ url: meme.publicUrl, width: 1024, height: 1024 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: "Someone had a problem.",
      description: 'Turn your complaints into shareable memes.',
      images: [meme.publicUrl],
    },
  }
}

export default async function MemePage({ params }: Props) {
  const { id } = await params
  const meme = await getSharedMeme(id)

  if (!meme) notFound()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full">
        <div className="mb-6 text-center">
          <Link href="/" className="text-2xl font-black text-white hover:text-brand-orange transition-colors">
            😤 What&apos;s Your Problem?
          </Link>
        </div>

        <div className="relative aspect-square rounded-2xl overflow-hidden border border-brand-border mb-6">
          <Image
            src={meme.publicUrl}
            alt="Shared meme"
            fill
            className="object-cover"
            unoptimized
          />
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="w-full text-center bg-brand-orange hover:bg-orange-500 text-white font-bold py-3 px-6 rounded-xl transition-all"
          >
            Make your own meme →
          </Link>
          <a
            href={meme.publicUrl}
            download
            className="w-full text-center bg-transparent border border-brand-border hover:border-white/40 text-brand-muted hover:text-white py-3 px-6 rounded-xl transition-all text-sm"
          >
            Download
          </a>
        </div>
      </div>
    </main>
  )
}
