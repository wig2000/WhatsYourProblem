import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.redirect(new URL('/dashboard/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))
  response.cookies.delete('wyp_dash_token')
  return response
}
