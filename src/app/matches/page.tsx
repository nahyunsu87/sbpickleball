'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type MyMatch = {
  match_id: string
  team: string
  matches: {
    id: string
    match_type: '1v1' | '2v2'
    status: string
    created_at: string
  } | null
}

function SkeletonCard() {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-14 skeleton rounded-full" />
        <div className="h-3 w-16 skeleton" />
      </div>
      <div className="h-3 w-20 skeleton mb-4" />
      <div className="h-10 w-full skeleton rounded-xl" />
    </div>
  )
}

export default function MyMatchesPage() {
  const [matches, setMatches] = useState<MyMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadMyMatches()
  }, [])

  async function loadMyMatches() {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session) { router.push('/'); return }

      const { data, error: fetchError } = await supabase
        .from('match_participants')
        .select(`
          match_id,
          team,
          matches (
            id,
            match_type,
            status,
            created_at
          )
        `)
        .eq('user_id', session.user.id)
        .order('match_id', { ascending: false })

      if (fetchError) throw fetchError
      setMatches((data as MyMatch[]) || [])
    } catch (e) {
      console.error('내 매칭 로딩 오류:', e)
      setError('매칭 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="py-2">
        <div className="h-6 w-24 skeleton mb-5 rounded" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={loadMyMatches} className="text-sm text-gray-500 underline">다시 시도</button>
      </div>
    )
  }

  const activeMatches = matches.filter(m => m.matches?.status === 'active')

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">내 매칭</h2>
        <span className="text-sm text-gray-400">{activeMatches.length}개</span>
      </div>

      {activeMatches.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">💬</div>
          <p className="font-semibold text-gray-600 mb-1">진행중인 매칭이 없어요</p>
          <p className="text-sm text-gray-400 mb-6">매칭 목록에서 파트너를 찾아보세요</p>
          <Link href="/match/list" className="btn-primary inline-block px-6">
            매칭 목록 보기
          </Link>
        </div>
      ) : (
        activeMatches.map(item => (
          <div key={item.match_id} className="card">
            <div className="flex items-center justify-between mb-3">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                item.matches?.match_type === '1v1' ? 'bg-sky-100 text-sky-600' : 'bg-violet-100 text-violet-600'
              }`}>
                {item.matches?.match_type === '1v1' ? '단식' : '복식'}
              </span>
              <span className="text-xs text-gray-400">
                {item.matches?.created_at
                  ? new Date(item.matches.created_at).toLocaleDateString('ko-KR', {
                      month: 'long', day: 'numeric'
                    })
                  : ''}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🏅</span>
              <p className="text-sm text-gray-600">
                내 팀: <span className="font-bold text-gray-800">{item.team}팀</span>
              </p>
              <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                진행중
              </span>
            </div>

            <Link
              href={`/chat/${item.match_id}`}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              채팅하기
            </Link>
          </div>
        ))
      )}
    </div>
  )
}
