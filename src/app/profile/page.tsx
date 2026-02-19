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
  const router = useRouter()

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (data) {
      setProfile(data)
      setNickname(data.nickname)
      setSkillLevel(data.skill_level)
    }
    setLoading(false)
  }

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ nickname, skill_level: skillLevel })
      .eq('id', profile.id)
    setSaving(false)
    alert('저장됐어요!')
  }

  if (loading) return <div className="text-center py-20">로딩중...</div>

  return (
    <div className="py-6">
      <h2 className="text-xl font-bold mb-6">내 프로필</h2>

      {profile?.avatar_url && (
        <div className="text-center mb-6">
          <img src={profile.avatar_url} className="w-20 h-20 rounded-full mx-auto" alt="프로필" />
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
