'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type TestProfile = {
  id: string
  nickname: string
  skill_level: string
  avatar_url: string | null
  region_id: string
  created_at: string
}

type AdminMatch = {
  id: string
  status: 'active' | 'completed' | 'cancelled'
  match_type: '1v1' | '2v2'
  created_at: string
  participants: Array<{ user_id: string; team: string; nickname: string }>
  messageCount: number
}

export default function AdminPage() {
  const [myId, setMyId] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<TestProfile[]>([])
  const [matches, setMatches] = useState<AdminMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [creatorId, setCreatorId] = useState('')
  const [opponentId, setOpponentId] = useState('')
  const [matchType, setMatchType] = useState<'1v1' | '2v2'>('1v1')

  const router = useRouter()

  useEffect(() => {
    loadAll()
  }, [])

  const profileMap = useMemo(() => {
    const map: Record<string, TestProfile> = {}
    profiles.forEach((p) => { map[p.id] = p })
    return map
  }, [profiles])

  async function loadAll() {
    try {
      setLoading(true)
      setError(null)

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session) {
        router.push('/')
        return
      }
      setMyId(session.user.id)

      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, nickname, skill_level, avatar_url, region_id, created_at')
        .order('created_at', { ascending: false })
        .limit(30)

      if (profileError) throw profileError
      const loadedProfiles = (profileRows || []) as TestProfile[]
      setProfiles(loadedProfiles)

      if (!creatorId && loadedProfiles.length > 0) {
        setCreatorId(loadedProfiles[0].id)
      }
      if (!opponentId && loadedProfiles.length > 1) {
        setOpponentId(loadedProfiles[1].id)
      }

      const { data: matchRows, error: matchError } = await supabase
        .from('matches')
        .select('id, status, match_type, created_at')
        .order('created_at', { ascending: false })
        .limit(30)

      if (matchError) throw matchError

      const matchIds = (matchRows || []).map((m: any) => m.id)

      let participantRows: any[] = []
      let messageRows: any[] = []

      if (matchIds.length > 0) {
        const { data: participantData, error: participantError } = await supabase
          .from('match_participants')
          .select('match_id, user_id, team')
          .in('match_id', matchIds)

        if (participantError) throw participantError
        participantRows = participantData || []

        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .select('match_id')
          .in('match_id', matchIds)

        if (messageError) throw messageError
        messageRows = messageData || []
      }

      const msgCountByMatch: Record<string, number> = {}
      messageRows.forEach((msg: any) => {
        msgCountByMatch[msg.match_id] = (msgCountByMatch[msg.match_id] || 0) + 1
      })

      const participantsByMatch: Record<string, Array<{ user_id: string; team: string; nickname: string }>> = {}
      participantRows.forEach((part: any) => {
        if (!participantsByMatch[part.match_id]) participantsByMatch[part.match_id] = []
        const nickname = loadedProfiles.find((p) => p.id === part.user_id)?.nickname || part.user_id.slice(0, 8)
        participantsByMatch[part.match_id].push({ user_id: part.user_id, team: part.team, nickname })
      })

      const normalizedMatches: AdminMatch[] = (matchRows || []).map((m: any) => ({
        id: m.id,
        status: m.status,
        match_type: m.match_type,
        created_at: m.created_at,
        participants: participantsByMatch[m.id] || [],
        messageCount: msgCountByMatch[m.id] || 0,
      }))

      setMatches(normalizedMatches)
    } catch (e) {
      console.error('관리자 페이지 로딩 오류:', e)
      setError('관리자 테스트 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function createTestMatch() {
    if (!creatorId || !opponentId) {
      alert('두 명의 테스트 계정을 선택해 주세요.')
      return
    }
    if (creatorId === opponentId) {
      alert('서로 다른 계정을 선택해 주세요.')
      return
    }

    try {
      setWorking('create')
      const creatorProfile = profileMap[creatorId]
      if (!creatorProfile?.region_id) {
        alert('선택한 팀 A 계정의 region_id가 없어 매칭을 만들 수 없습니다.')
        return
      }

      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          region_id: creatorProfile?.region_id,
          match_type: matchType,
          status: 'active',
        })
        .select('id')
        .single()

      if (matchError) throw matchError

      const { error: participantError } = await supabase
        .from('match_participants')
        .insert([
          { match_id: match.id, user_id: creatorId, team: 'A' },
          { match_id: match.id, user_id: opponentId, team: 'B' },
        ])

      if (participantError) throw participantError

      if (myId) {
        await supabase.from('messages').insert({
          match_id: match.id,
          user_id: myId,
          content: '관리자 테스트 메시지입니다.',
        })
      }

      alert('테스트 매칭이 생성되었습니다!')
      await loadAll()
    } catch (e) {
      console.error('테스트 매칭 생성 오류:', e)
      alert('테스트 매칭 생성에 실패했습니다.')
    } finally {
      setWorking(null)
    }
  }

  async function completeMatch(matchId: string) {
    try {
      setWorking(`complete:${matchId}`)
      const { error: updateError } = await supabase
        .from('matches')
        .update({ status: 'completed' })
        .eq('id', matchId)

      if (updateError) throw updateError
      await loadAll()
    } catch (e) {
      console.error('완료 처리 오류:', e)
      alert('완료 처리에 실패했습니다.')
    } finally {
      setWorking(null)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">관리자 테스트 도구 로딩 중...</div>

  return (
    <div className="py-2 space-y-4">
      <div className="card bg-sky-50 border-sky-100">
        <h2 className="text-lg font-bold text-sky-900">테스트 관리자 페이지</h2>
        <p className="text-sm text-sky-700 mt-1">혼자 테스트할 때, 매칭 생성/상태 변경/채팅 이동/리뷰 이동을 한 번에 확인할 수 있어요.</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="card space-y-3">
        <h3 className="font-semibold text-gray-900">1) 테스트 매칭 빠르게 생성</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select value={creatorId} onChange={(e) => setCreatorId(e.target.value)} className="input">
            <option value="">팀 A 선택</option>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.nickname} ({p.skill_level})</option>)}
          </select>
          <select value={opponentId} onChange={(e) => setOpponentId(e.target.value)} className="input">
            <option value="">팀 B 선택</option>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.nickname} ({p.skill_level})</option>)}
          </select>
          <select value={matchType} onChange={(e) => setMatchType(e.target.value as '1v1' | '2v2')} className="input">
            <option value="1v1">단식</option>
            <option value="2v2">복식</option>
          </select>
        </div>
        <button onClick={createTestMatch} disabled={working === 'create'} className="btn-primary w-full">
          {working === 'create' ? '생성 중...' : '테스트 매칭 만들기'}
        </button>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">2) 최근 매치 테스트</h3>
          <button onClick={loadAll} className="btn-outline">새로고침</button>
        </div>

        {matches.length === 0 ? (
          <p className="text-sm text-gray-400">최근 매치가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => (
              <div key={m.id} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{m.match_type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                    {m.status}
                  </span>
                  <span className="text-xs text-gray-400">메시지 {m.messageCount}개</span>
                </div>

                <p className="text-xs text-gray-600 mb-2">
                  참가자: {m.participants.map((p) => `${p.nickname}(${p.team})`).join(', ') || '없음'}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Link href={`/chat/${m.id}`} className="btn-secondary text-sm">채팅 보기</Link>
                  <Link href={`/review/${m.id}`} className="btn-secondary text-sm">리뷰 페이지</Link>
                  <button
                    onClick={() => completeMatch(m.id)}
                    disabled={working === `complete:${m.id}` || m.status !== 'active'}
                    className="btn-outline"
                  >
                    {working === `complete:${m.id}` ? '처리 중...' : '완료 처리'}
                  </button>
                  <button onClick={() => navigator.clipboard.writeText(m.id)} className="btn-outline">
                    matchId 복사
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">3) 테스트 계정 목록</h3>
        <div className="space-y-2">
          {profiles.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">{p.nickname}</p>
                <p className="text-xs text-gray-400">{p.skill_level} · {p.id.slice(0, 8)}...</p>
              </div>
              <button onClick={() => navigator.clipboard.writeText(p.id)} className="btn-outline">id 복사</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
