'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Message } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ChatPage({ params }: { params: { matchId: string } }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [myId, setMyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    initChat()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function initChat() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    setMyId(session.user.id)

    const { data } = await supabase
      .from('messages')
      .select('*, profiles(nickname, avatar_url)')
      .eq('match_id', params.matchId)
      .order('created_at', { ascending: true })

    setMessages(data || [])
    setLoading(false)

    // 실시간 구독
    supabase
      .channel(`chat:${params.matchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${params.matchId}`,
      }, async (payload) => {
        const { data: msg } = await supabase
          .from('messages')
          .select('*, profiles(nickname, avatar_url)')
          .eq('id', payload.new.id)
          .single()
        if (msg) setMessages(prev => [...prev, msg])
      })
      .subscribe()
  }

  async function sendMessage() {
    if (!newMessage.trim() || !myId) return
    const content = newMessage.trim()
    setNewMessage('')

    await supabase.from('messages').insert({
      match_id: params.matchId,
      user_id: myId,
      content,
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) return <div className="text-center py-20">로딩중...</div>

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.user_id === myId ? 'flex-row-reverse' : ''}`}>
            {msg.user_id !== myId && (
              msg.profiles?.avatar_url ? (
                <img src={msg.profiles.avatar_url} className="w-8 h-8 rounded-full flex-shrink-0" alt="" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs flex-shrink-0">👤</div>
              )
            )}
            <div className={`max-w-[70%] ${msg.user_id === myId ? 'items-end' : 'items-start'} flex flex-col`}>
              {msg.user_id !== myId && (
                <p className="text-xs text-gray-500 mb-1">{msg.profiles?.nickname}</p>
              )}
              <div className={`px-3 py-2 rounded-2xl text-sm ${
                msg.user_id === myId
                  ? 'bg-primary text-white rounded-tr-sm'
                  : 'bg-white shadow rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
              <p className="text-xs text-gray-400 mt-
