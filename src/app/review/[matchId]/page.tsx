'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type MatchParticipant = {
  user_id: string
  profiles: {
    nickname: string
    avatar_url: string | null
  } | null
}

type ScoreKey = 'teamwork_score' | 'language_score' | 'rule_score' | 'punctuality_score'

const REVIEW_FIELDS: { key: ScoreKey; label: string; icon: string }[] = [
  { key: 'teamwork_score', label: '팀워크', icon: '🤝' },
  { key: 'language_score', label: '언어사용', icon: '💬' },
  { key: 'rule_score', label: '규칙준수', icon: '📋' },
  { key: 'punctuality_score', label: '시간약속', icon: '⏰' },
]

export default function ReviewPage({ params }: { params: { matchId: string } }) {
  const [myId, setMyId] = useState<string | null>(null)
  const [targets, setTargets] = useState<MatchParticipant[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [scores, setScores] = useState<Record<ScoreKey, number>>({
    teamwork_score: 5,
    language_score: 5,
    rule_score: 5,
    punctuality_score: 5,
  })
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    init()
  }, [])

  async function init() {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session) {
        router.push('/')
        return
      }

      setMyId(session.user.id)

      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('status')
        .eq('id', params.matchId)
        .single()

      if (matchError) throw matchError
      if (matchData.status !== 'completed') {
        setError('완료된 경기에만 리뷰를 작성할 수 있어요.')
        return
      }

      const { data: participantData, error: participantError } = await supabase
        .from('match_participants')
        .select('user_id, profiles(nickname, avatar_url)')
        .eq('match_id', params.matchId)

      if (participantError) throw participantError

      const others = (participantData || []).filter((p: MatchParticipant) => p.user_id !== session.user.id)
      setTargets(others)
      if (others.length > 0) {
        setSelectedUserId(others[0].user_id)
      } else {
        setError('리뷰할 상대가 없어요.')
      }
    } catch (e) {
      console.error('리뷰 페이지 초기화 오류:', e)
      setError('리뷰 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function submitReview() {
    if (!myId || !selectedUserId || submitting) return

    try {
      setSubmitting(true)
      const { error: insertError } = await supabase
        .from('user_reviews')
        .insert({
          reviewer_id: myId,
          reviewed_id: selectedUserId,
          match_id: params.matchId,
          ...scores,
          comment: comment.trim(),
        })

      if (insertError) throw insertError
      alert('리뷰가 등록되었습니다!')
      router.push('/matches')
    } catch (e) {
      console.error('리뷰 등록 오류:', e)
      alert('리뷰 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">리뷰 페이지 불러오는 중...</div>

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={() => router.push('/matches')} className="btn-secondary">내 매칭으로 돌아가기</button>
      </div>
    )
  }

  return (
    <div className="py-2 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">리뷰 작성</h2>
        <p className="text-sm text-gray-500 mt-1">함께 경기한 상대의 매너를 평가해 주세요.</p>
      </div>

      <div className="card">
        <label className="text-sm font-semibold text-gray-700">리뷰 대상</label>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="input mt-2"
        >
          {targets.map((target) => (
            <option key={target.user_id} value={target.user_id}>
              {target.profiles?.nickname || '상대 유저'}
            </option>
          ))}
        </select>
      </div>

      <div className="card space-y-3">
        <p className="text-sm font-semibold text-gray-700">매너 점수 (1~5점)</p>
        {REVIEW_FIELDS.map((field) => (
          <div key={field.key} className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-600">{field.icon} {field.label}</p>
            <select
              value={scores[field.key]}
              onChange={(e) => setScores((prev) => ({ ...prev, [field.key]: Number(e.target.value) }))}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
            >
              {[5, 4, 3, 2, 1].map((score) => (
                <option key={score} value={score}>{score}점</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="card">
        <label className="text-sm font-semibold text-gray-700">한줄 리뷰 (선택)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="예) 시간 약속을 잘 지키고 매너가 좋아요!"
          className="input min-h-28 mt-2"
          maxLength={200}
        />
        <p className="text-right text-xs text-gray-400 mt-1">{comment.length}/200</p>
      </div>

      <button onClick={submitReview} disabled={!selectedUserId || submitting} className="btn-primary w-full">
        {submitting ? '등록 중...' : '리뷰 등록'}
      </button>
    </div>
  )
}
