import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sbpickleball.vercel.app'
  return NextResponse.redirect(new URL('/', siteUrl))
}
