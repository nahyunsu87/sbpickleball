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

type RecentMatch = { id: string; match_type: string; status: string }

export default function Home() {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // 원탭 상태
  const [isAvailable, setIsAvailable] = useState(false)
  const [availableRequestId, setAvailableRequestId] = useState<string | null>(null)
  const [availableLoading, setAvailableLoading] = useState(false)
  const [regionId, setRegionId] = useState<string | null>(null)

  // 재진입 숏컷
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([])

  useEffect(() => {
    let mounted = true

    const timer = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 5000)

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        if (session?.user) {
          const [{ data: profile }, { data: region }] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', session.user.id).single(),
            supabase.from('regions').select('id').eq('slug', 'jeonju').single(),
          ])
          if (mounted) {
            setUser(profile ?? null)
            if (region) setRegionId(region.id)
            if (profile) {
              await Promise.all([
                loadUserStatus(session.user.id),
                loadRecentMatches(session.user.id),
              ])
            }
          }
        }
      } catch (e) {
        console.error('init error:', e)
      } finally {
        clearTimeout(timer)
        if (mounted) setLoading(false)
      }
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles').select('*').eq('id', session.user.id).single()
          if (profile) {
            if (mounted) setUser(profile)
            await Promise.all([
              loadUserStatus(session.user.id),
              loadRecentMatches(session.user.id),
            ])
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

  async function loadUserStatus(userId: string) {
    const { data } = await supabase
      .from('match_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'waiting')
      .limit(1)
    setIsAvailable(!!(data && data.length > 0))
    setAvailableRequestId(data?.[0]?.id ?? null)
  }

  async function loadRecentMatches(userId: string) {
    const { data } = await supabase
      .from('match_participants')
      .select('matches(id, match_type, status)')
      .eq('user_id', userId)
      .order('match_id', { ascending: false })
      .limit(3)
    if (data) {
      const matches = data
        .map((p: any) => p.matches)
        .filter((m: any) => m && m.status === 'active')
      setRecentMatches(matches.slice(0, 2))
    }
  }

  async function toggleAvailability() {
    if (!user || !regionId) return
    setAvailableLoading(true)
    try {
      if (isAvailable && availableRequestId) {
        await supabase
          .from('match_requests')
          .update({ status: 'cancelled' })
          .eq('id', availableRequestId)
        setIsAvailable(false)
        setAvailableRequestId(null)
      } else {
        const lastMatchType = (typeof window !== 'undefined'
          ? localStorage.getItem('lastMatchType')
          : null) ?? '1v1'
        const lastMatchTime = typeof window !== 'undefined'
          ? localStorage.getItem('lastMatchTime')
          : null
        const { data } = await supabase
          .from('match_requests')
          .insert({
            user_id: user.id,
            region_id: regionId,
            match_type: lastMatchType,
            preferred_time: lastMatchTime || null,
            status: 'waiting',
          })
          .select('id')
          .single()
        setIsAvailable(true)
        setAvailableRequestId((data as any)?.id ?? null)
      }
    } catch (e) {
      console.error('availability toggle error:', e)
    } finally {
      setAvailableLoading(false)
    }
  }

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
      <div className="flex items-center gap-3 mb-5">
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

      {/* ── Feature 1: 원탭 상태 토글 ── */}
      <button
        onClick={toggleAvailability}
        disabled={availableLoading}
        className={`w-full rounded-2xl p-4 mb-3 flex items-center justify-between transition-all active:scale-95 disabled:opacity-70 ${
          isAvailable
            ? 'bg-primary text-white shadow-md shadow-primary/30'
            : 'bg-gray-100 text-gray-700'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={`text-2xl ${isAvailable ? 'animate-bounce' : ''}`}>
            {isAvailable ? '🏓' : '😴'}
          </span>
          <div className="text-left">
            <p className="font-extrabold text-sm">
              {isAvailable ? '지금 뛸 수 있어요!' : '지금 뛸 수 있어요?'}
            </p>
            <p className={`text-xs mt-0.5 ${isAvailable ? 'text-emerald-100' : 'text-gray-400'}`}>
              {isAvailable ? '파트너가 나타나면 알림을 받아요' : '탭 한 번으로 매칭 신청'}
            </p>
          </div>
        </div>
        {/* 토글 스위치 */}
        <div className={`w-12 h-6 rounded-full transition-all flex items-center px-0.5 ${
          isAvailable ? 'bg-white/30 justify-end' : 'bg-gray-300 justify-start'
        }`}>
          <div className="w-5 h-5 rounded-full bg-white shadow" />
        </div>
      </button>

      {/* ── Feature 6: 재진입 숏컷 (진행 중인 매칭) ── */}
      {recentMatches.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-400 mb-2 px-1">진행 중인 매칭</p>
          <div className="flex gap-2">
            {recentMatches.map(m => (
              <Link
                key={m.id}
                href={`/chat/${m.id}`}
                className="flex-1 bg-amber-50 border border-amber-100 rounded-2xl p-3 flex items-center gap-2.5 active:scale-95 transition-transform"
              >
                <span className="text-xl">{m.match_type === '1v1' ? '🎯' : '🤝'}</span>
                <div>
                  <p className="text-xs font-bold text-amber-800">{m.match_type === '1v1' ? '단식' : '복식'}</p>
                  <p className="text-[10px] text-amber-500">채팅 이어하기 →</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

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
