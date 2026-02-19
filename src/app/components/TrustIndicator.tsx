'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { UserStats, TrustBadgeId } from '@/lib/supabase'

// ── 매너 항목 정의 ──
const MANNER_ITEMS: { key: string; label: string; icon: string }[] = [
  { key: 'teamwork',    label: '팀워크',   icon: '🤝' },
  { key: 'language',   label: '언어사용',  icon: '💬' },
  { key: 'rule',       label: '규칙준수',  icon: '📋' },
  { key: 'punctuality',label: '시간약속',  icon: '⏰' },
]

// ── 뱃지 정의 ──
const BADGE_DEF: Record<TrustBadgeId, { label: string; icon: string; color: string }> = {
  no_noshow:     { label: '노쇼 없음',   icon: '✅', color: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  active_30:     { label: '30경기 이상', icon: '🏅', color: 'bg-amber-50 text-amber-700 border border-amber-100' },
  active_recent: { label: '최근 활동중', icon: '🔥', color: 'bg-orange-50 text-orange-700 border border-orange-100' },
  manner_king:   { label: '매너왕',      icon: '👑', color: 'bg-yellow-50 text-yellow-700 border border-yellow-100' },
}

// ── 바 색상 (점수 구간별) ──
function barColor(score: number) {
  if (score >= 4.5) return 'bg-emerald-500'
  if (score >= 4.0) return 'bg-blue-400'
  if (score >= 3.0) return 'bg-amber-400'
  return 'bg-red-400'
}

// ── 최근 날짜 포맷 ──
function relativeDate(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return '오늘'
  if (d < 7)  return `${d}일 전`
  if (d < 30) return `${Math.floor(d / 7)}주 전`
  return `${Math.floor(d / 30)}개월 전`
}

type MannerAverages = Record<string, number>

async function fetchStats(userId: string): Promise<UserStats> {
  const { data } = await supabase
    .from('match_participants')
    .select('user_id, matches(status, created_at)')
    .eq('user_id', userId)

  const completed = (data || []).filter((p: any) => p.matches?.status === 'completed')
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const recent = completed.filter(
    (p: any) => p.matches?.created_at && new Date(p.matches.created_at) > threeMonthsAgo
  )

  return {
    totalGames: completed.length,
    recentMonthsGames: recent.length,
    noShowCount: 0, // 추후 no_show 컬럼 추가 시 연동
  }
}

function computeBadges(stats: UserStats): TrustBadgeId[] {
  const badges: TrustBadgeId[] = []
  if (stats.noShowCount === 0 && stats.totalGames > 0) badges.push('no_noshow')
  if (stats.totalGames >= 30)    badges.push('active_30')
  if (stats.recentMonthsGames >= 5) badges.push('active_recent')
  return badges
}

// ── 메인 컴포넌트 ──
export default function TrustIndicator({ userId }: { userId: string }) {
  const [stats, setStats]             = useState<UserStats | null>(null)
  const [mannerAvg, setMannerAvg]     = useState<MannerAverages | null>(null)
  const [reviews, setReviews]         = useState<any[]>([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    load()
  }, [userId])

  async function load() {
    try {
      const s = await fetchStats(userId)
      setStats(s)

      // user_reviews 테이블이 있을 경우 리뷰 데이터 조회
      const { data: reviewData } = await supabase
        .from('user_reviews')
        .select('*')
        .eq('reviewed_id', userId)
        .order('created_at', { ascending: false })
        .limit(3)

      if (reviewData && reviewData.length > 0) {
        setReviews(reviewData)
        const avg: MannerAverages = {}
        MANNER_ITEMS.forEach(item => {
          const col = `${item.key}_score`
          const vals = reviewData.map((r: any) => r[col]).filter(Boolean)
          avg[item.key] = vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0
        })
        setMannerAvg(avg)
      }
    } catch {
      // 조회 실패 시 기본값 유지
      setStats({ totalGames: 0, recentMonthsGames: 0, noShowCount: 0 })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mt-6 space-y-3">
        <div className="h-4 w-20 skeleton rounded" />
        <div className="grid grid-cols-3 gap-2">
          {[0,1,2].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}
        </div>
        <div className="h-24 skeleton rounded-2xl" />
      </div>
    )
  }

  if (!stats) return null

  const badges = computeBadges(stats)
  const hasReviews = reviews.length > 0
  const hasMannerData = mannerAvg !== null

  return (
    <div className="mt-6">
      <h3 className="text-sm font-bold text-gray-700 mb-3">신뢰 지표</h3>

      {/* ── 1. 핵심 숫자 3개 ── */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xl font-extrabold text-gray-900">{stats.totalGames}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">완료 경기</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className={`text-xl font-extrabold ${stats.noShowCount === 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {stats.noShowCount}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">노쇼</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xl font-extrabold text-blue-600">{stats.recentMonthsGames}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">최근 3개월</p>
        </div>
      </div>

      {/* ── 2. 뱃지 ── */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {badges.map(id => {
            const b = BADGE_DEF[id]
            return (
              <span
                key={id}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${b.color}`}
              >
                {b.icon} {b.label}
              </span>
            )
          })}
        </div>
      )}

      {/* ── 3. 매너 평가 바 차트 ── */}
      <div className="bg-gray-50 rounded-2xl p-4 mb-3">
        <p className="text-xs font-bold text-gray-500 mb-3">매너 평가</p>
        {!hasMannerData || stats.totalGames === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">
            {stats.totalGames === 0 ? '아직 경기 기록이 없어요' : '아직 매너 평가가 없어요'}
          </p>
        ) : (
          <div className="space-y-2.5">
            {MANNER_ITEMS.map(item => {
              const score = mannerAvg?.[item.key] ?? 0
              const pct = (score / 5) * 100
              return (
                <div key={item.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 flex items-center gap-1">
                      {item.icon} {item.label}
                    </span>
                    <span className="text-xs font-bold text-gray-700">
                      {score > 0 ? score.toFixed(1) : '—'}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor(score)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
            <p className="text-[10px] text-gray-400 text-right mt-1">{reviews.length}개 평가 기반</p>
          </div>
        )}
      </div>

      {/* ── 4. 최근 리뷰 텍스트 ── */}
      {hasReviews && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500">최근 리뷰</p>
          {reviews.map((r: any) => (
            r.comment && (
              <div key={r.id} className="bg-white border border-gray-100 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-700 leading-relaxed">"{r.comment}"</p>
                <p className="text-[10px] text-gray-400 mt-1">{relativeDate(r.created_at)}</p>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}
