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
  const router = useRouter()

  useEffect(() => {
    loadRegion()
  }, [])

  async function loadRegion() {
    const { data } = await supabase
      .from('regions')
      .select('id')
      .eq('slug', 'jeonju')
      .single()
    if (data) setRegionId(data.id)
  }

  async function submitRequest() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }

    setLoading(true)
    const { error } = await supabase.from('match_requests').insert({
      user_id: session.user.id,
      region_id: regionId,
      match_type: matchType,
      preferred_date: preferredDate || null,
      preferred_time: preferredTime || null,
      message: message || null,
      status: 'waiting',
    })

    setLoading(false)
    if (!error) {
      alert('매칭 신청 완료!')
      router.push('/match/list')
    }
  }

  return (
    <div className="py-6">
      <h2 className="text-xl font-bold mb-6">매칭 신청</h2>

      <div className="card">
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">게임 방식</label>
          <div className="grid grid-cols-2 gap-3">
            {(['1v1', '2v2'] as const).map(type => (
              <button
                key={type}
                onClick={() => setMatchType(type)}
                className={`py-3 rounded-xl font-bold border-2 transition ${
                  matchType === type
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                {type === '1v1' ? '1 : 1 단식' : '2 : 2 복식'}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">희망 날짜</label>
          <input
            type="date"
            value={preferredDate}
            onChange={e => setPreferredDate(e.target.value)}
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">희망 시간</label>
          <input
            type="time"
            value={preferredTime}
            onChange={e => setPreferredTime(e.target.value)}
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold mb-1">한마디 (선택)</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="w-full border rounded-lg p-2 h-24 resize-none"
            placeholder="예) 초보 환영해요! 같이 즐겁게 해요 😊"
          />
        </div>

        <button
          onClick={submitRequest}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? '신청중...' : '매칭 신청하기'}
        </button>
      </div>
    </div>
  )
}
