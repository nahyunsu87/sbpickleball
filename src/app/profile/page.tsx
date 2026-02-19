'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [nickname, setNickname] = useState('')
  const [skillLevel, setSkillLevel] = useState('beginner')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ nickname, skill_level: skillLevel })
        .eq('id', profile.id)
      if (updateError) throw updateError
      alert('저장됐어요!')
    } catch (e) {
      console.error('프로필 저장 오류:', e)
      setError('저장 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">프로필 불러오는 중...</div>

  if (error && !profile) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={loadProfile} className="text-sm text-gray-500 underline">다시 시도</button>
      </div>
    )
  }

  return (
    <div className="py-6">
      <h2 className="text-xl font-bold mb-6">내 프로필</h2>

      {profile?.avatar_url && (
        <div className="text-center mb-6">
          <img src={profile.avatar_url} className="w-20 h-20 rounded-full mx-auto" alt="프로필" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="card">
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">닉네임</label>
          <input
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            className="w-full border rounded-lg p-2"
            placeholder="닉네임 입력"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">실력</label>
          <select
            value={skillLevel}
            onChange={e => setSkillLevel(e.target.value)}
            className="w-full border rounded-lg p-2"
          >
            <option value="beginner">초급</option>
            <option value="intermediate">중급</option>
            <option value="advanced">고급</option>
          </select>
        </div>

        <button
          onClick={saveProfile}
          disabled={saving}
          className="btn-primary w-full"
        >
          {saving ? '저장중...' : '저장하기'}
        </button>
      </div>
    </div>
  )
}
