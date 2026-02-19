'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/supabase'
import Link from 'next/link'

const SKILL_LABEL: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

export default function Home() {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // ── 5초 안에 응답이 없으면 로그인 화면으로 fallback ──
    const timer = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 5000)

    // ── 초기 세션 확인 (로컬 스토리지에서 즉시 읽힘) ──
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles').select('*').eq('id', session.user.id).single()
          if (mounted) setUser(profile ?? null)
        }
      } catch (e) {
        console.error('init error:', e)
      } finally {
        clearTimeout(timer)
        if (mounted) setLoading(false)
      }
    }
    init()

    // ── 카카오 로그인 콜백 등 이후 이벤트 처리 ──
    // setLoading(true) 절대 호출 안 함 → 고착 방지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles').select('*').eq('id', session.user.id).single()
          if (profile) {
            if (mounted) setUser(profile)
          } else {
            const kakaoData = session.user.user_metadata
            const { data: newProfile } = await supabase.from('profiles').insert({
              id: session.user.id,
              kakao_id: String(kakaoData.provider_id || kakaoData.sub || ''),
              nickname: kakaoData.name || kakaoData.full_name || kakaoData.preferred_username || '피클볼러',
              avatar_url: kakaoData.avatar_url || kakaoData.picture || '',
              skill_level: 'beginner',
              region_id: null,
            }).select().single()
            if (mounted) setUser(newProfile ?? null)
          }
        } catch (e) {
          console.error('auth change error:', e)
        } finally {
          clearTimeout(timer)
          if (mounted) setLoading(false)
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) { setUser(null); setLoading(false) }
      }
    })

    return () => {
      mounted = false
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  async function loginWithKakao() {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/`,
        scopes: 'profile_nickname profile_image',
      },
    })
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  /* ── 로딩 ── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <span className="text-5xl animate-bounce">🏓</span>
        <div className="w-7 h-7 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">불러오는 중...</p>
      </div>
    )
  }

  /* ── 비로그인 랜딩 ── */
  if (!user) {
    return (
      <div className="-mx-4 -mt-4 bg-white">
        {/* 히어로 */}
        <div className="relative bg-gradient-to-br from-[#00B386] to-[#00D4A0] px-6 pt-14 pb-20 text-white overflow-hidden">
          <div className="absolute -top-6 -right-6 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-white/5" />
          <div className="relative">
            <div className="text-6xl mb-5">🏓</div>
            <h1 className="text-3xl font-extrabold leading-tight mb-2">
              전주 피클볼<br />파트너 매칭
            </h1>
            <p className="text-emerald-100 text-sm leading-relaxed">
              원하는 실력의 파트너를 찾고<br />바로 채팅으로 일정을 잡아보세요
            </p>
          </div>
        </div>

        {/* 특징 */}
        <div className="bg-white rounded-t-3xl -mt-6 relative px-6 pt-8 pb-4">
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: '⚡', label: '즉시 매칭' },
              { icon: '🏅', label: '실력별' },
              { icon: '💬', label: '실시간 채팅' },
            ].map(f => (
              <div key={f.label} className="bg-gray-50 rounded-2xl py-4 flex flex-col items-center gap-1.5">
                <span className="text-2xl">{f.icon}</span>
                <span className="text-xs font-semibold text-gray-600">{f.label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={loginWithKakao}
            className="w-full bg-[#FEE500] text-gray-900 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 active:scale-95 transition-transform shadow-sm"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.7 1.6 5.07 4.02 6.47L5 21l4.5-2.5c.82.2 1.66.3 2.5.3 5.52 0 10-3.48 10-7.8S17.52 3 12 3z" />
            </svg>
            카카오로 3초 만에 시작하기
          </button>

          <p className="text-center text-xs text-gray-400 mt-3">
            가입 즉시 무료로 이용할 수 있어요
          </p>
        </div>
      </div>
    )
  }

  /* ── 로그인 대시보드 ── */
  return (
    <div className="bg-white -mx-4 -mt-4 px-4 pt-5">
      {/* 인사말 + 프로필 */}
      <div className="flex items-center gap-3 mb-6">
        {user.avatar_url ? (
          <img src={user.avatar_url} className="w-11 h-11 rounded-full ring-2 ring-primary/30" alt="프로필" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-xl">👤</div>
        )}
        <div className="flex-1">
          <p className="font-bold text-gray-900">{user.nickname}</p>
          <span className={`text-xs font-semibold ${
            user.skill_level === 'beginner' ? 'text-green-600' :
            user.skill_level === 'intermediate' ? 'text-blue-600' : 'text-purple-600'
          }`}>
            {SKILL_LABEL[user.skill_level] ?? '초급'}
          </span>
        </div>
        <button onClick={logout} className="text-xs text-gray-400 px-3 py-1.5 rounded-full border border-gray-200">
          로그아웃
        </button>
      </div>

      {/* 메인 CTA */}
      <Link
        href="/match/request"
        className="block w-full bg-primary rounded-2xl p-5 mb-3 text-white relative overflow-hidden active:scale-95 transition-transform"
      >
        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
        <p className="text-xs font-semibold text-emerald-100 mb-1">지금 바로</p>
        <p className="text-xl font-extrabold">매칭 신청하기</p>
        <p className="text-xs text-emerald-100 mt-1">파트너를 찾고 있다면 →</p>
      </Link>

      {/* 보조 메뉴 */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        {[
          { href: '/match/list', icon: '📋', label: '매칭 목록', desc: '대기중' },
          { href: '/matches', icon: '💬', label: '내 매칭', desc: '채팅' },
          { href: '/profile', icon: '👤', label: '프로필', desc: '설정' },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-gray-50 rounded-2xl p-3.5 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-xs font-bold text-gray-700">{item.label}</span>
            <span className="text-[10px] text-gray-400">{item.desc}</span>
          </Link>
        ))}
      </div>

      {/* 안내 */}
      <div className="bg-amber-50 rounded-2xl p-4 flex gap-3 items-center mb-4">
        <span className="text-xl flex-shrink-0">💡</span>
        <p className="text-xs text-amber-700 leading-relaxed">
          <span className="font-bold">신청 → 수락 → 채팅</span> 순서로 진행돼요.<br />
          매칭 목록에서 파트너를 찾거나 직접 신청해보세요.
        </p>
      </div>
    </div>
  )
}
