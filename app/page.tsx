import ComplaintInput from '@/components/ComplaintInput'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      {/* Logo / wordmark */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white mb-3">
          😤 What&apos;s Your Problem?
        </h1>
        <p className="text-brand-muted text-lg">
          Turn your complaints into shareable memes.
        </p>
      </div>

      <ComplaintInput />

      <footer className="mt-16 text-xs text-brand-muted/50 text-center">
        <p>Your words are anonymised before storage. <a href="/privacy" className="underline hover:text-brand-muted">Privacy info.</a></p>
      </footer>
    </main>
  )
}
