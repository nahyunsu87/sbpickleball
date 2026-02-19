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

const quickActions = [
  {
    href: '/match/request',
    icon: '🎯',
    label: '매칭 신청',
    desc: '파트너 찾기',
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-100',
  },
  {
    href: '/match/list',
    icon: '📋',
    label: '매칭 목록',
    desc: '대기중인 매칭',
    bg: 'bg-sky-50',
    iconBg: 'bg-sky-100',
  },
  {
    href: '/matches',
    icon: '💬',
    label: '내 매칭',
    desc: '채팅하기',
    bg: 'bg-violet-50',
    iconBg: 'bg-violet-100',
  },
  {
    href: '/profile',
    icon: '👤',
    label: '프로필',
    desc: '설정 변경',
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
  },
]

export default function Home() {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        try {
          if (session?.user) {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
            if (profileError && profileError.code !== 'PGRST116') {
              console.error('프로필 조회 오류:', profileError)
            }
            setUser(profile)
          }
        } catch (e) {
          console.error('프로필 로딩 오류:', e)
          setError('프로필을 불러오는데 실패했습니다.')
        } finally {
          setLoading(false)
        }
      })
      .catch((e) => {
        console.error('세션 확인 오류:', e)
        setError('세션 확인에 실패했습니다.')
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true)
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (!profile) {
            const kakaoData = session.user.user_metadata
            const { data: newProfile } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                kakao_id: String(kakaoData.provider_id || kakaoData.sub || ''),
                nickname: kakaoData.name || kakaoData.full_name || kakaoData.preferred_username || '피클볼러',
                avatar_url: kakaoData.avatar_url || kakaoData.picture || '',
                skill_level: 'beginner',
                region_id: null,
              })
              .select()
              .single()
            setUser(newProfile)
          } else {
            setUser(profile)
          }
        } catch (e) {
          console.error('로그인 처리 오류:', e)
          setError('로그인 처리 중 오류가 발생했습니다.')
        } finally {
          setLoading(false)
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="text-5xl animate-bounce">🏓</span>
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400 mt-1">불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-gray-500 underline"
        >
          다시 시도
        </button>
      </div>
    )
  }

  /* ── 비로그인 히어로 ── */
  if (!user) {
    return (
      <div className="-mx-4 -mt-4">
        {/* 히어로 그라데이션 */}
        <div className="bg-gradient-to-br from-primary to-emerald-400 px-6 pt-12 pb-16 text-white text-center">
          <div className="text-6xl mb-4">🏓</div>
          <h1 className="text-2xl font-bold mb-2">SB 피클볼 매칭</h1>
          <p className="text-emerald-50 text-sm">전주에서 피클볼 파트너를 찾아보세요</p>
        </div>

        {/* 특징 카드 */}
        <div className="bg-white rounded-t-3xl -mt-6 px-6 pt-8 pb-6">
          <ul className="space-y-4 mb-8">
            {[
              { icon: '⚡', title: '빠른 매칭', desc: '대기중인 파트너와 즉시 연결' },
              { icon: '💬', title: '실시간 채팅', desc: '매칭 후 바로 일정 조율' },
              { icon: '🏅', title: '실력별 매칭', desc: '초급 · 중급 · 고급 레벨 선택' },
            ].map(f => (
              <li key={f.title} className="flex items-start gap-4">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <p className="font-semibold text-gray-800">{f.title}</p>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <button
            onClick={loginWithKakao}
            className="w-full bg-yellow-400 text-gray-900 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:bg-yellow-300 active:scale-95 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.7 1.6 5.07 4.02 6.47L5 21l4.5-2.5c.82.2 1.66.3 2.5.3 5.52 0 10-3.48 10-7.8S17.52 3 12 3z"/>
            </svg>
            카카오로 시작하기
          </button>
        </div>
      </div>
    )
  }

  /* ── 로그인 대시보드 ── */
  return (
    <div>
      {/* 프로필 카드 */}
      <div className="bg-gradient-to-r from-primary to-emerald-400 rounded-2xl p-4 mb-4 text-white flex items-center gap-3">
        {user.avatar_url ? (
          <img src={user.avatar_url} className="w-12 h-12 rounded-full ring-2 ring-white/50" alt="프로필" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl">👤</div>
        )}
        <div className="flex-1">
          <p className="font-bold text-base">{user.nickname}</p>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
            {SKILL_LABEL[user.skill_level] ?? '초급'}
          </span>
        </div>
        <button onClick={logout} className="text-xs text-white/70 hover:text-white transition">
          로그아웃
        </button>
      </div>

      {/* 빠른 메뉴 */}
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map(action => (
          <Link
            key={action.href}
            href={action.href}
            className={`${action.bg} rounded-2xl p-4 flex flex-col gap-3 active:scale-95 transition-transform`}
          >
            <div className={`${action.iconBg} w-10 h-10 rounded-xl flex items-center justify-center text-xl`}>
              {action.icon}
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">{action.label}</p>
              <p className="text-xs text-gray-500">{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* 안내 배너 */}
      <div className="mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 items-start">
        <span className="text-xl">💡</span>
        <div>
          <p className="text-sm font-semibold text-amber-800">이렇게 사용하세요</p>
          <p className="text-xs text-amber-700 mt-0.5">
            매칭 신청 → 상대방이 수락 → 채팅으로 일정 조율
          </p>
        </div>
      </div>
    </div>
  )
}
