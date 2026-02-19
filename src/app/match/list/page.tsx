'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { MatchRequest } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function MatchListPage() {
  const [requests, setRequests] = useState<MatchRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session) { router.push('/'); return }
      setMyId(session.user.id)

      const { data, error: fetchError } = await supabase
        .from('match_requests')
        .select('*, profiles(nickname, skill_level, avatar_url)')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setRequests(data || [])
    } catch (e) {
      console.error('매칭 목록 로딩 오류:', e)
      setError('매칭 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function acceptMatch(request: MatchRequest) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          region_id: request.region_id,
          match_type: request.match_type,
          status: 'active',
        })
        .select()
        .single()

      if (matchError) throw matchError
      if (!match) return

      const { error: participantError } = await supabase.from('match_participants').insert([
        { match_id: match.id, user_id: request.user_id, team: 'A' },
        { match_id: match.id, user_id: session.user.id, team: 'B' },
      ])
      if (participantError) throw participantError

      const { error: updateError } = await supabase
        .from('match_requests')
        .update({ status: 'matched' })
        .eq('id', request.id)
      if (updateError) throw updateError

      alert('매칭 성사! 채팅으로 이동합니다.')
      router.push(`/chat/${match.id}`)
    } catch (e) {
      console.error('매칭 수락 오류:', e)
      alert('매칭 수락 중 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }

  const skillLabel = (level: string) =>
    level === 'beginner' ? '초급' : level === 'intermediate' ? '중급' : '고급'

  if (loading) return <div className="text-center py-20 text-gray-400">매칭 목록 불러오는 중...</div>

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={loadRequests} className="text-sm text-gray-500 underline">다시 시도</button>
      </div>
    )
  }

  const availableCount = requests.filter(r => r.user_id !== myId).length

  return (
    <div className="py-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold">매칭 대기 목록</h2>
        <p className="text-sm text-gray-500 mt-1">지금 바로 수락 가능한 매칭 {availableCount}건</p>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400 card">
          <div className="text-4xl mb-3">🏓</div>
          <p>대기중인 매칭이 없어요</p>
        </div>
      ) : (
        requests.map(req => (
          <div key={req.id} className="card border border-transparent hover:border-emerald-200 transition">
            <div className="flex items-center gap-3 mb-3">
              {req.profiles?.avatar_url ? (
                <img src={req.profiles.avatar_url} className="w-10 h-10 rounded-full" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs">👤</div>
              )}
              <div>
                <p className="font-bold">{req.profiles?.nickname || '익명 유저'}</p>
                <p className="text-sm text-gray-500">{skillLabel(req.profiles?.skill_level || '')}</p>
              </div>
              <span className={`ml-auto px-3 py-1 rounded-full text-sm font-bold ${
                req.match_type === '1v1' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
              }`}>
                {req.match_type === '1v1' ? '단식' : '복식'}
              </span>
            </div>

            <div className="text-sm text-gray-600 mb-3 space-y-1">
              {req.preferred_date && (
                <p>📅 {req.preferred_date} {req.preferred_time && `${req.preferred_time}`}</p>
              )}
              {req.message && <p>💬 {req.message}</p>}
            </div>

            {req.user_id !== myId ? (
              <button
                onClick={() => acceptMatch(req)}
                className="btn-primary w-full"
              >
                이 매칭 수락하기
              </button>
            ) : (
              <p className="text-center text-sm text-gray-400">내가 신청한 매칭</p>
            )}
          </div>
        ))
      )}
    </div>
  )
}
