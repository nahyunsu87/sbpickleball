import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code)

    if (session?.user) {
      const kakaoData = session.user.user_metadata

      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single()

      if (!existing) {
        await supabase.from('profiles').insert({
          id: session.user.id,
          kakao_id: kakaoData.provider_id,
          nickname: kakaoData.name || kakaoData.full_name || '피클볼러',
          avatar_url: kakaoData.avatar_url || kakaoData.picture || '',
          skill_level: 'beginner',
          region_id: null,
        })
      }
    }
  }

  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL!))
}
