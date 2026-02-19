'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { TrustBadgeId, SkillLevel } from '@/lib/supabase'

type ReliabilityStats = {
  noShowCount6m: number
  sameDayCancelCount6m: number
  lateCount6m: number
}

type ActivityStats = {
  totalGames: number
  recentMonthsGames: number
  activeTeamCount: number
  lastMatchDate: string | null
}

type MannerStats = {
  teamwork: number
  language: number
  rule: number
  punctuality: number
  sampleCount: number
}

type TrustSnapshot = {
  skillLevel: SkillLevel | null
  reliability: ReliabilityStats
  activity: ActivityStats
  manner: MannerStats
  recentReviews: Array<{ id: string; comment: string; created_at: string }>
}

const SKILL_LABEL: Record<SkillLevel, string> = {
  fun: '매너/즐겁게',
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

const MANNER_ITEMS: { key: keyof Omit<MannerStats, 'sampleCount'>; label: string; icon: string }[] = [
  { key: 'teamwork', label: '팀워크', icon: '🤝' },
  { key: 'language', label: '언어사용', icon: '💬' },
  { key: 'rule', label: '규칙준수', icon: '📋' },
  { key: 'punctuality', label: '시간약속', icon: '⏰' },
]

const BADGE_DEF: Record<TrustBadgeId, { label: string; icon: string; color: string }> = {
  no_noshow: { label: '노쇼 없음 6개월', icon: '✅', color: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  active_30: { label: '30경기 이상', icon: '🏅', color: 'bg-amber-50 text-amber-700 border border-amber-100' },
  active_recent: { label: '최근 활동중', icon: '🔥', color: 'bg-orange-50 text-orange-700 border border-orange-100' },
  manner_king: { label: '매너왕', icon: '👑', color: 'bg-yellow-50 text-yellow-700 border border-yellow-100' },
}

function relativeDate(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return '오늘'
  if (d < 7) return `${d}일 전`
  if (d < 30) return `${Math.floor(d / 7)}주 전`
  return `${Math.floor(d / 30)}개월 전`
}

function barColor(score: number) {
  if (score >= 4.5) return 'bg-emerald-500'
  if (score >= 4.0) return 'bg-amber-400'
  if (score >= 3.0) return 'bg-rose-400'
  return 'bg-red-500'
}

function average(nums: number[]) {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function computeBadges(snapshot: TrustSnapshot): TrustBadgeId[] {
  const badges: TrustBadgeId[] = []
  const { reliability, activity, manner } = snapshot

  if (activity.totalGames > 0 && reliability.noShowCount6m === 0) badges.push('no_noshow')
  if (activity.totalGames >= 30) badges.push('active_30')
  if (activity.recentMonthsGames >= 5) badges.push('active_recent')

  const overall = average([manner.teamwork, manner.language, manner.rule, manner.punctuality].filter(v => v > 0))
  if (manner.sampleCount >= 5 && overall >= 4.7) badges.push('manner_king')

  return badges
}

async function fetchTrustSnapshot(userId: string): Promise<TrustSnapshot> {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const [{ data: profile }, { data: participants }, { data: allReviews }, { data: recentReviews }] = await Promise.all([
    supabase.from('profiles').select('skill_level').eq('id', userId).single(),
    supabase
      .from('match_participants')
      .select('team, matches(status, created_at)')
      .eq('user_id', userId),
    supabase
      .from('user_reviews')
      .select('teamwork_score, language_score, rule_score, punctuality_score')
      .eq('reviewed_id', userId),
    supabase
      .from('user_reviews')
      .select('id, comment, created_at')
      .eq('reviewed_id', userId)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const completed = (participants || []).filter((p: any) => p.matches?.status === 'completed')
  const recentCompleted = completed.filter(
    (p: any) => p.matches?.created_at && new Date(p.matches.created_at) > threeMonthsAgo
  )

  const activeTeams = new Set(
    (participants || [])
      .filter((p: any) => p.matches?.status === 'active' && p.team)
      .map((p: any) => p.team)
  )

  const lastMatchDate = completed
    .map((p: any) => p.matches?.created_at)
    .filter(Boolean)
    .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0] || null

  const reviews = allReviews || []

  const reliability: ReliabilityStats = {
    noShowCount6m: 0,
    sameDayCancelCount6m: 0,
    lateCount6m: 0,
  }

  // 추후 no_show / cancel / late 컬럼이 추가되면 6개월 기준으로 집계 예정
  void sixMonthsAgo

  return {
    skillLevel: (profile as any)?.skill_level ?? null,
    reliability,
    activity: {
      totalGames: completed.length,
      recentMonthsGames: recentCompleted.length,
      activeTeamCount: activeTeams.size,
      lastMatchDate,
    },
    manner: {
      teamwork: average(reviews.map((r: any) => r.teamwork_score).filter(Boolean)),
      language: average(reviews.map((r: any) => r.language_score).filter(Boolean)),
      rule: average(reviews.map((r: any) => r.rule_score).filter(Boolean)),
      punctuality: average(reviews.map((r: any) => r.punctuality_score).filter(Boolean)),
      sampleCount: reviews.length,
    },
    recentReviews: (recentReviews || []).filter((r: any) => r.comment),
  }
}

export default function TrustIndicator({ userId }: { userId: string }) {
  const [snapshot, setSnapshot] = useState<TrustSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [userId])

  async function load() {
    setLoading(true)
    try {
      const data = await fetchTrustSnapshot(userId)
      setSnapshot(data)
    } catch {
      setSnapshot(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mt-6 space-y-3">
        <div className="h-4 w-20 skeleton rounded" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}
        </div>
        <div className="h-24 skeleton rounded-2xl" />
      </div>
    )
  }

  if (!snapshot) return null

  const badges = computeBadges(snapshot)
  const { activity, manner, reliability } = snapshot
  const overallManner = average([manner.teamwork, manner.language, manner.rule, manner.punctuality].filter(v => v > 0))

  return (
    <div className="mt-6">
      <h3 className="text-sm font-bold text-gray-700 mb-3">신뢰 지표</h3>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-lg font-extrabold text-gray-900">⭐ {overallManner > 0 ? overallManner.toFixed(1) : '—'}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">리뷰 {manner.sampleCount}개</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-lg font-extrabold text-blue-600">🏓 {activity.totalGames}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">완료 경기</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className={`text-lg font-extrabold ${reliability.noShowCount6m === 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            ✅ {reliability.noShowCount6m}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">노쇼(6개월)</p>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {badges.map(id => {
            const b = BADGE_DEF[id]
            return (
              <span key={id} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${b.color}`}>
                {b.icon} {b.label}
              </span>
            )
          })}
        </div>
      )}

      <div className="bg-gray-50 rounded-2xl p-4 mb-3">
        <p className="text-xs font-bold text-gray-500 mb-3">매너 (항목별)</p>
        {manner.sampleCount === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">아직 매너 리뷰가 없어요</p>
        ) : (
          <div className="space-y-2.5">
            {MANNER_ITEMS.map(item => {
              const score = manner[item.key]
              const pct = (score / 5) * 100
              return (
                <div key={item.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 flex items-center gap-1">{item.icon} {item.label}</span>
                    <span className="text-xs font-bold text-gray-700">{score.toFixed(1)}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor(score)}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            <p className="text-[10px] text-gray-400 text-right">표본 {manner.sampleCount}개</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-white border border-gray-100 rounded-xl p-3">
          <p className="text-[11px] text-gray-400 mb-1">신뢰성 (6개월)</p>
          <p className="text-xs text-gray-700">노쇼 {reliability.noShowCount6m} · 당일취소 {reliability.sameDayCancelCount6m} · 지각 {reliability.lateCount6m}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-3">
          <p className="text-[11px] text-gray-400 mb-1">실력</p>
          <p className="text-xs font-semibold text-gray-800">{snapshot.skillLevel ? SKILL_LABEL[snapshot.skillLevel] : '미설정'}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-3 col-span-2">
          <p className="text-[11px] text-gray-400 mb-1">활동성</p>
          <p className="text-xs text-gray-700">
            최근 3개월 {activity.recentMonthsGames}회 · 활동 팀 {activity.activeTeamCount}개 · 마지막 경기 {activity.lastMatchDate ? relativeDate(activity.lastMatchDate) : '기록 없음'}
          </p>
        </div>
      </div>

      {snapshot.recentReviews.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500">최근 리뷰</p>
          {snapshot.recentReviews.map((r) => (
            <div key={r.id} className="bg-white border border-gray-100 rounded-xl px-3 py-2.5">
              <p className="text-xs text-gray-700 leading-relaxed">"{r.comment}"</p>
              <p className="text-[10px] text-gray-400 mt-1">{relativeDate(r.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
