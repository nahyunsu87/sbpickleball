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

  if (loading) return <div className="text-center py-20 text-gray-400">내 매칭 불러오는 중...</div>

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
    <div className="py-6">
      <h2 className="text-xl font-bold mb-6">내 매칭</h2>

      {activeMatches.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">💬</div>
          <p className="mb-4">진행중인 매칭이 없어요</p>
          <Link href="/match/list" className="text-primary text-sm underline">
            매칭 목록 보기
          </Link>
        </div>
      ) : (
        activeMatches.map(item => (
          <div key={item.match_id} className="card">
            <div className="flex items-center justify-between mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                item.matches?.match_type === '1v1' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
              }`}>
                {item.matches?.match_type === '1v1' ? '단식' : '복식'}
              </span>
              <span className="text-xs text-gray-400">
                {item.matches?.created_at
                  ? new Date(item.matches.created_at).toLocaleDateString('ko-KR')
                  : ''}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-3">내 팀: {item.team}팀</p>
            <Link
              href={`/chat/${item.match_id}`}
              className="btn-primary w-full text-center block"
            >
              채팅하기
            </Link>
          </div>
        ))
      )}
    </div>
  )
}
