import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type SkillLevel = 'fun' | 'beginner' | 'intermediate' | 'advanced'
export type MatchType = '1v1' | '2v2'

export type Profile = {
  id: string
  kakao_id: string
  nickname: string
  avatar_url: string
  skill_level: SkillLevel
  region_id: string
  created_at: string
}

// 신뢰 지표 타입들
export type UserStats = {
  totalGames: number
  recentMonthsGames: number
  noShowCount: number
}

export type MannerCategory = 'teamwork' | 'language' | 'rule' | 'punctuality'

export type UserReview = {
  id: string
  reviewer_id: string
  reviewed_id: string
  match_id: string
  teamwork_score: number
  language_score: number
  rule_score: number
  punctuality_score: number
  comment: string
  created_at: string
}

export type TrustBadgeId = 'no_noshow' | 'active_30' | 'active_recent' | 'manner_king'

export type MatchRequest = {
  id: string
  user_id: string
  region_id: string
  match_type: MatchType
  status: 'waiting' | 'matched' | 'cancelled'
  preferred_date: string
  preferred_time: string
  message: string
  created_at: string
  profiles?: Profile
}

export type Match = {
  id: string
  region_id: string
  match_type: MatchType
  status: 'active' | 'completed' | 'cancelled'
  created_at: string
}

export type Message = {
  id: string
  match_id: string
  user_id: string
  content: string
  created_at: string
  profiles?: Profile
}
