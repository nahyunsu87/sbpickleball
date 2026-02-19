'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/supabase'
import Link from 'next/link'

export default function Home() {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const withTimeout = <T,>(promise: Promise<T>, ms = 8000): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          setTimeout(() => reject(new Error('timeout')), ms)
        }),
      ])
    }

    // 먼저 현재 세션 즉시 확인
    withTimeout(supabase.auth.getSession())
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
            if (isMounted) setUser(profile)
          }
        } catch (e) {
          console.error('프로필 로딩 오류:', e)
          if (isMounted) setError('프로필을 불러오는데 실패했습니다.')
        } finally {
          if (isMounted) setLoading(false)
        }
      })
      .catch((e) => {
        console.error('세션 확인 오류:', e)
        if (isMounted) {
          setError('세션 확인에 실패했습니다. 네트워크를 확인하고 다시 시도해주세요.')
          setLoading(false)
        }
      })

    // 이후 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        if (isMounted) setLoading(true)
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
            if (isMounted) setUser(newProfile)
          } else {
            if (isMounted) setUser(profile)
          }
        } catch (e) {
          console.error('로그인 처리 오류:', e)
          if (isMounted) setError('로그인 처리 중 오류가 발생했습니다.')
        } finally {
          if (isMounted) setLoading(false)
        }
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setUser(null)
          setLoading(false)
        }
      }
    })

    return () => {
      isMounted = false
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

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="text-gray-400 text-lg">잠시만요...</div>
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

  return (
    <div className="py-8">
      {!user ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🏓</div>
          <h1 className="text-2xl font-bold mb-2">SB 피클볼 매칭</h1>
          <p className="text-gray-500 mb-8">전주 피클볼 파트너를 찾아보세요</p>
          <button
            onClick={loginWithKakao}
            className="bg-yellow-400 text-black px-8 py-3 rounded-xl font-bold text-lg hover:bg-yellow-300 transition"
          >
            카카오로 시작하기
          </button>
        </div>
      ) : (
        <div>
          <div className="card flex items-center gap-4">
            {user.avatar_url && (
              <img src={user.avatar_url} className="w-12 h-12 rounded-full" alt="프로필" />
            )}
            <div>
              <p className="font-bold">{user.nickname}</p>
              <p className="text-sm text-gray-500">
                {user.skill_level === 'beginner' ? '초급' : user.skill_level === 'intermediate' ? '중급' : '고급'}
              </p>
            </div>
            <button onClick={logout} className="ml-auto text-sm text-gray-400">로그아웃</button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <Link href="/match/request" className="card text-center hover:shadow-md transition cursor-pointer">
              <div className="text-3xl mb-2">🎯</div>
              <p className="font-bold">매칭 신청</p>
              <p className="text-sm text-gray-500">파트너 찾기</p>
            </Link>
            <Link href="/match/list" className="card text-center hover:shadow-md transition cursor-pointer">
              <div className="text-3xl mb-2">📋</div>
              <p className="font-bold">매칭 목록</p>
              <p className="text-sm text-gray-500">대기중인 매칭</p>
            </Link>
            <Link href="/matches" className="card text-center hover:shadow-md transition cursor-pointer">
              <div className="text-3xl mb-2">💬</div>
              <p className="font-bold">내 매칭</p>
              <p className="text-sm text-gray-500">채팅하기</p>
            </Link>
            <Link href="/profile" className="card text-center hover:shadow-md transition cursor-pointer">
              <div className="text-3xl mb-2">👤</div>
              <p className="font-bold">프로필</p>
              <p className="text-sm text-gray-500">설정 변경</p>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
