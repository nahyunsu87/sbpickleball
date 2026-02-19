'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { MatchRequest } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const SKILL_LABEL: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

function SkeletonCard() {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full skeleton flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 skeleton" />
          <div className="h-3 w-16 skeleton" />
        </div>
        <div className="h-5 w-10 skeleton rounded-full" />
      </div>
      <div className="h-3 w-36 skeleton mb-3" />
      <div className="h-10 w-full skeleton rounded-xl" />
    </div>
  )
}

export default function MatchListPage() {
  const [requests, setRequests] = useState<MatchRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [accepting, setAccepting] = useState<string | null>(null)
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
    setAccepting(request.id)
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

      router.push(`/chat/${match.id}`)
    } catch (e) {
      console.error('매칭 수락 오류:', e)
      alert('매칭 수락 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setAccepting(null)
    }
  }

  if (loading) {
    return (
      <div className="py-2">
        <div className="h-6 w-32 skeleton mb-5 rounded" />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={loadRequests} className="text-sm text-gray-500 underline">다시 시도</button>
      </div>
    )
  }

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">매칭 대기 목록</h2>
        <span className="text-sm text-gray-400">{requests.length}개</span>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🏓</div>
          <p className="font-semibold text-gray-600 mb-1">아직 대기중인 매칭이 없어요</p>
          <p className="text-sm text-gray-400 mb-6">먼저 매칭을 신청해보세요!</p>
          <Link href="/match/request" className="btn-primary inline-block px-6">
            매칭 신청하기
          </Link>
        </div>
      ) : (
        requests.map(req => (
          <div key={req.id} className="card">
            {/* 프로필 행 */}
            <div className="flex items-center gap-3 mb-3">
              {req.profiles?.avatar_url ? (
                <img src={req.profiles.avatar_url} className="w-11 h-11 rounded-full flex-shrink-0" alt="" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">👤</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{req.profiles?.nickname ?? '이름 없음'}</p>
                <span className={`text-xs font-semibold ${
                  req.profiles?.skill_level === 'beginner' ? 'text-green-600' :
                  req.profiles?.skill_level === 'intermediate' ? 'text-blue-600' : 'text-purple-600'
                }`}>
                  {SKILL_LABEL[req.profiles?.skill_level ?? ''] ?? '-'}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  req.match_type === '1v1' ? 'bg-sky-100 text-sky-600' : 'bg-violet-100 text-violet-600'
                }`}>
                  {req.match_type === '1v1' ? '단식' : '복식'}
                </span>
                <span className="text-[10px] text-gray-400">{relativeTime(req.created_at)}</span>
              </div>
            </div>

            {/* 상세 정보 */}
            {(req.preferred_date || req.message) && (
              <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1">
                {req.preferred_date && (
                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                    <span>📅</span>
                    {req.preferred_date}
                    {req.preferred_time && <span className="text-gray-400">· {req.preferred_time}</span>}
                  </p>
                )}
                {req.message && (
                  <p className="text-xs text-gray-700 flex items-start gap-1.5">
                    <span className="mt-px">💬</span>
                    <span>{req.message}</span>
                  </p>
                )}
              </div>
            )}

            {/* 액션 */}
            {req.user_id !== myId ? (
              <button
                onClick={() => acceptMatch(req)}
                disabled={accepting === req.id}
                className="btn-primary w-full disabled:opacity-60"
              >
                {accepting === req.id ? '수락 중...' : '매칭 수락하기'}
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <p className="text-sm text-gray-500">파트너 대기중</p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
