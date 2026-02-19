'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/supabase'
import Link from 'next/link'

export default function Home() {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      setUser(data)
    }
    setLoading(false)
  }

  async function loginWithKakao() {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (loading) return <div className="text-center py-20">로딩중...</div>

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
