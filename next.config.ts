import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['sharp', '@resvg/resvg-js'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
      { protocol: 'https', hostname: 'i.imgflip.com' },
      { protocol: 'https', hostname: '*.fal.media' },
      { protocol: 'https', hostname: '*.fal.run' },
      { protocol: 'https', hostname: 'v3.fal.media' },
    ],
  },
}

export default nextConfig
