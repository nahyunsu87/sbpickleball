'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const SKILL_OPTIONS = [
  { value: 'beginner', label: '초급', desc: '입문 ~ 6개월', color: 'text-green-600', selected: 'bg-green-50 border-green-300' },
  { value: 'intermediate', label: '중급', desc: '6개월 ~ 2년', color: 'text-blue-600', selected: 'bg-blue-50 border-blue-300' },
  { value: 'advanced', label: '고급', desc: '2년 이상', color: 'text-purple-600', selected: 'bg-purple-50 border-purple-300' },
] as const

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [nickname, setNickname] = useState('')
  const [skillLevel, setSkillLevel] = useState('beginner')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session) { router.push('/'); return }

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (fetchError) throw fetchError

      if (data) {
        setProfile(data)
        setNickname(data.nickname)
        setSkillLevel(data.skill_level)
      }
    } catch (e) {
      console.error('프로필 로딩 오류:', e)
      setError('프로필을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function saveProfile() {
    if (!profile) return
    setError(null)
    setSaving(true)
    setSaved(false)
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ nickname, skill_level: skillLevel })
        .eq('id', profile.id)
      if (updateError) throw updateError
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      console.error('프로필 저장 오류:', e)
      setError('저장 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-2">
        <div className="text-center py-6 mb-2">
          <div className="w-20 h-20 rounded-full skeleton mx-auto mb-3" />
          <div className="h-4 w-28 skeleton mx-auto rounded" />
        </div>
        <div className="h-4 w-20 skeleton mb-2 rounded" />
        <div className="h-12 w-full skeleton rounded-xl mb-5" />
        <div className="h-4 w-20 skeleton mb-2 rounded" />
        <div className="space-y-2">
          <div className="h-14 w-full skeleton rounded-xl" />
          <div className="h-14 w-full skeleton rounded-xl" />
          <div className="h-14 w-full skeleton rounded-xl" />
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={loadProfile} className="text-sm text-gray-500 underline">다시 시도</button>
      </div>
    )
  }

  return (
    <div className="py-2">
      {/* 아바타 */}
      <div className="text-center mb-6">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            className="w-20 h-20 rounded-full mx-auto ring-4 ring-primary/20"
            alt="프로필"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-4xl mx-auto">👤</div>
        )}
        <p className="text-xs text-gray-400 mt-2">카카오 프로필 이미지</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 mb-4 text-sm flex gap-2">
          <span>⚠️</span><span>{error}</span>
        </div>
      )}

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3 mb-4 text-sm flex gap-2 items-center">
          <span>✅</span><span>저장됐어요!</span>
        </div>
      )}

      {/* 닉네임 */}
      <div className="mb-5">
        <label className="block text-sm font-bold text-gray-700 mb-2">닉네임</label>
        <input
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          className="input"
          placeholder="닉네임 입력"
          maxLength={20}
        />
        <p className="text-right text-xs text-gray-400 mt-1">{nickname.length}/20</p>
      </div>

      {/* 실력 선택 */}
      <div className="mb-6">
        <label className="block text-sm font-bold text-gray-700 mb-2">실력 수준</label>
        <div className="space-y-2">
          {SKILL_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSkillLevel(opt.value)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                skillLevel === opt.value ? opt.selected : 'border-gray-100 bg-white'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                skillLevel === opt.value ? `border-current ${opt.color}` : 'border-gray-300'
              }`}>
                {skillLevel === opt.value && (
                  <div className="w-2 h-2 rounded-full bg-current" />
                )}
              </div>
              <div>
                <p className={`font-semibold text-sm ${skillLevel === opt.value ? opt.color : 'text-gray-700'}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-gray-400">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={saveProfile}
        disabled={saving}
        className="btn-primary w-full text-base disabled:opacity-60"
      >
        {saving ? '저장 중...' : '저장하기'}
      </button>
    </div>
  )
}
