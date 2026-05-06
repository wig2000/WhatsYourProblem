import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: "What's Your Problem?",
  description: 'Turn your complaints into shareable memes.',
  openGraph: {
    title: "What's Your Problem?",
    description: 'Turn your complaints into shareable memes.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "What's Your Problem?",
    description: 'Turn your complaints into shareable memes.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
