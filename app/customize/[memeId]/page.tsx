import { notFound } from 'next/navigation'
import { getStagingMeme } from '@/lib/db/queries'
import CustomisationPanel from '@/components/CustomisationPanel'

interface Props {
  params: Promise<{ memeId: string }>
}

export default async function CustomizePage({ params }: Props) {
  const { memeId } = await params
  const meme = await getStagingMeme(memeId)

  if (!meme) notFound()

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 text-center">
          <a href="/generate" className="text-brand-muted text-sm hover:text-white transition-colors">
            ← Back to memes
          </a>
          <h2 className="text-2xl font-bold text-white mt-4 mb-1">
            Make it yours
          </h2>
          <p className="text-brand-muted text-sm">
            Tweak the text, font, colour, and position.
          </p>
        </div>

        <CustomisationPanel
          memeId={meme.id}
          initialCompositeUrl={meme.compositeUrl}
          initialCaption={meme.captionText}
          style={meme.style}
        />
      </div>
    </main>
  )
}
