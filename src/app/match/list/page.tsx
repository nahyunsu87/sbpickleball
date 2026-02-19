'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { MatchRequest } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Filter = 'all' | '1v1' | '2v2'

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
          <div className="h-4 w-28 skeleton" />
          <div className="h-3 w-16 skeleton" />
        </div>
        <div className="h-5 w-12 skeleton rounded-full" />
      </div>
      <div className="h-3 w-40 skeleton mb-4" />
      <div className="h-11 w-full skeleton rounded-xl" />
    </div>
  )
}

const SKILL_CLASS: Record<string, string> = {
  beginner: 'skill-beginner',
  intermediate: 'skill-intermediate',
  advanced: 'skill-advanced',
}
const SKILL_LABEL: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

export default function MatchListPage() {
  const [requests, setRequests] = useState<MatchRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const router = useRouter()

  useEffect(() => { loadRequests() }, [])

  async function loadRequests() {
    setLoading(true)
    setError(null)
    try {
      const { data: { session }, error: se } = await supabase.auth.getSession()
      if (se) throw se
      if (!session) { router.push('/'); return }
      setMyId(session.user.id)

      const { data, error: fe } = await supabase
        .from('match_requests')
        .select('*, profiles(nickname, skill_level, avatar_url)')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })

      if (fe) throw fe
      setRequests(data || [])
    } catch (e) {
      setError('목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function acceptMatch(request: MatchRequest) {
    setAccepting(request.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: match, error: me } = await supabase
        .from('matches')
        .insert({ region_id: request.region_id, match_type: request.match_type, status: 'active' })
        .select().single()
      if (me) throw me
      if (!match) return

      const { error: pe } = await supabase.from('match_participants').insert([
        { match_id: match.id, user_id: request.user_id, team: 'A' },
        { match_id: match.id, user_id: session.user.id, team: 'B' },
      ])
      if (pe) throw pe

      const { error: ue } = await supabase
        .from('match_requests').update({ status: 'matched' }).eq('id', request.id)
      if (ue) throw ue

      router.push(`/chat/${match.id}`)
    } catch {
      alert('매칭 수락 중 오류가 발생했습니다.')
    } finally {
      setAccepting(null)
    }
  }

  const filtered = requests.filter(r => filter === 'all' || r.match_type === filter)
  const myCount = requests.filter(r => r.user_id === myId).length

  if (loading) {
    return (
      <div className="py-2">
        <div className="h-5 w-36 skeleton mb-4 rounded" />
        <div className="flex gap-2 mb-4">
          {[60, 44, 44].map((w, i) => <div key={i} className={`h-8 skeleton rounded-full`} style={{ width: w }} />)}
        </div>
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={loadRequests} className="btn-outline">다시 시도</button>
      </div>
    )
  }

  return (
    <div className="py-2">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">매칭 대기 목록</h2>
          {myCount > 0 && (
            <p className="text-xs text-amber-500 font-medium mt-0.5">내 신청 {myCount}건 대기중</p>
          )}
        </div>
        <button onClick={loadRequests} className="p-2 rounded-full hover:bg-gray-100 transition" title="새로고침">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
          </svg>
        </button>
      </div>

      {/* 필터 칩 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {([
          { key: 'all', label: `전체 ${requests.length}` },
          { key: '1v1', label: `단식 ${requests.filter(r => r.match_type === '1v1').length}` },
          { key: '2v2', label: `복식 ${requests.filter(r => r.match_type === '2v2').length}` },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`chip flex-shrink-0 ${filter === f.key ? 'chip-active' : 'chip-inactive'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🏓</div>
          <p className="font-bold text-gray-700 mb-1">
            {filter === 'all' ? '대기중인 매칭이 없어요' : `${filter === '1v1' ? '단식' : '복식'} 매칭이 없어요`}
          </p>
          <p className="text-sm text-gray-400 mb-6">먼저 매칭을 신청해보세요!</p>
          <Link href="/match/request" className="btn-primary inline-block px-8">
            매칭 신청하기
          </Link>
        </div>
      ) : (
        filtered.map(req => {
          const isMine = req.user_id === myId
          const skill = req.profiles?.skill_level ?? ''
          return (
            <div key={req.id} className="card">
              {/* 상단: 아바타 + 이름 + 타입 */}
              <div className="flex items-center gap-3 mb-3">
                {req.profiles?.avatar_url ? (
                  <img src={req.profiles.avatar_url} className="w-11 h-11 rounded-full flex-shrink-0 object-cover" alt="" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">👤</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900 text-sm">{req.profiles?.nickname ?? '—'}</p>
                    {skill && (
                      <span className={SKILL_CLASS[skill]}>{SKILL_LABEL[skill]}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{relativeTime(req.created_at)}</p>
                </div>
                <span className={req.match_type === '1v1' ? 'type-singles' : 'type-doubles'}>
                  {req.match_type === '1v1' ? '단식' : '복식'}
                </span>
              </div>

              {/* 중단: 일정 + 메시지 */}
              {(req.preferred_date || req.message) && (
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-3 space-y-1.5">
                  {req.preferred_date && (
                    <p className="text-xs text-gray-600 flex items-center gap-1.5">
                      <span>📅</span>
                      <span>{req.preferred_date}</span>
                      {req.preferred_time && <span className="text-gray-400">· {req.preferred_time}</span>}
                    </p>
                  )}
                  {req.message && (
                    <p className="text-xs text-gray-700 flex items-start gap-1.5 leading-relaxed">
                      <span className="mt-px flex-shrink-0">💬</span>
                      <span>{req.message}</span>
                    </p>
                  )}
                </div>
              )}

              {/* 하단: 액션 */}
              {isMine ? (
                <div className="flex items-center gap-2 py-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                  <p className="text-sm text-gray-500">파트너 대기중이에요</p>
                </div>
              ) : (
                <button
                  onClick={() => acceptMatch(req)}
                  disabled={!!accepting}
                  className="btn-primary w-full"
                >
                  {accepting === req.id ? '수락 중...' : '매칭 수락하기'}
                </button>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
