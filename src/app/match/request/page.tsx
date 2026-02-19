'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function MatchRequestPage() {
  const [matchType, setMatchType] = useState<'1v1' | '2v2'>('1v1')
  const [preferredDate, setPreferredDate] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [regionId, setRegionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadRegion()
    // ── Feature 2: 스마트 디폴트 ──
    const lastType = localStorage.getItem('lastMatchType') as '1v1' | '2v2' | null
    const lastTime = localStorage.getItem('lastMatchTime')
    if (lastType) setMatchType(lastType)
    if (lastTime) setPreferredTime(lastTime)
  }, [])

  async function loadRegion() {
    try {
      const { data } = await supabase
        .from('regions')
        .select('id')
        .eq('slug', 'jeonju')
        .single()
      if (data) setRegionId(data.id)
    } catch (e) {
      console.error('지역 정보 로딩 오류:', e)
    }
  }

  async function submitRequest() {
    setError(null)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session) { router.push('/'); return }

      setLoading(true)
      const { error: insertError } = await supabase.from('match_requests').insert({
        user_id: session.user.id,
        region_id: regionId,
        match_type: matchType,
        preferred_date: preferredDate || null,
        preferred_time: preferredTime || null,
        message: message || null,
        status: 'waiting',
      })

      if (insertError) throw insertError

      // ── Feature 2: 마지막 선택 저장 ──
      localStorage.setItem('lastMatchType', matchType)
      if (preferredTime) localStorage.setItem('lastMatchTime', preferredTime)

      router.push('/match/list')
    } catch (e) {
      console.error('매칭 신청 오류:', e)
      setError('매칭 신청 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="py-2">
      <h2 className="text-lg font-bold text-gray-900 mb-1">매칭 신청</h2>
      <p className="text-sm text-gray-500 mb-5">원하는 조건을 설정하고 파트너를 찾아보세요</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 mb-4 text-sm flex gap-2 items-start">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* 게임 방식 */}
      <section className="mb-4">
        <label className="block text-sm font-bold text-gray-700 mb-2">게임 방식</label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: '1v1', label: '1 : 1 단식', desc: '1명 vs 1명', icon: '🎯' },
            { value: '2v2', label: '2 : 2 복식', desc: '2명 vs 2명', icon: '🤝' },
          ] as const).map(type => (
            <button
              key={type.value}
              onClick={() => setMatchType(type.value)}
              className={`rounded-2xl p-4 text-left border-2 transition-all ${
                matchType === type.value
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-100 bg-white'
              }`}
            >
              <div className="text-2xl mb-1">{type.icon}</div>
              <p className={`font-bold text-sm ${matchType === type.value ? 'text-primary' : 'text-gray-700'}`}>
                {type.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{type.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* 희망 일정 */}
      <section className="card mb-0">
        <label className="block text-sm font-bold text-gray-700 mb-3">희망 일정 (선택)</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-1.5">날짜</p>
            <input
              type="date"
              value={preferredDate}
              onChange={e => setPreferredDate(e.target.value)}
              className="input text-sm"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">시간</p>
            <input
              type="time"
              value={preferredTime}
              onChange={e => setPreferredTime(e.target.value)}
              className="input text-sm"
            />
          </div>
        </div>
      </section>

      {/* 한마디 */}
      <section className="card">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          한마디
          <span className="text-gray-400 font-normal ml-1">(선택)</span>
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="input resize-none h-20 text-sm"
          placeholder="예) 초보 환영해요! 즐겁게 함께해요 😊"
          maxLength={100}
        />
        <p className="text-right text-xs text-gray-400 mt-1">{message.length}/100</p>
      </section>

      <button
        onClick={submitRequest}
        disabled={loading}
        className="btn-primary w-full text-base disabled:opacity-60"
      >
        {loading ? '신청 중...' : '매칭 신청하기'}
      </button>
    </div>
  )
}
