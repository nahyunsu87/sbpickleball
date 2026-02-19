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
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    initChat()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function initChat() {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session) { router.push('/'); return }
      setMyId(session.user.id)

      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*, profiles(nickname, avatar_url)')
        .eq('match_id', params.matchId)
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError
      setMessages(data || [])

      supabase
        .channel(`chat:${params.matchId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${params.matchId}`,
        }, async (payload) => {
          try {
            const { data: msg } = await supabase
              .from('messages')
              .select('*, profiles(nickname, avatar_url)')
              .eq('id', payload.new.id)
              .single()
            if (msg) setMessages(prev => [...prev, msg])
          } catch (e) {
            console.error('메시지 수신 오류:', e)
          }
        })
        .subscribe()
    } catch (e) {
      console.error('채팅 초기화 오류:', e)
      setError('채팅을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !myId) return
    const content = newMessage.trim()
    setNewMessage('')
    try {
      const { error: sendError } = await supabase.from('messages').insert({
        match_id: params.matchId,
        user_id: myId,
        content,
      })
      if (sendError) {
        console.error('메시지 전송 오류:', sendError)
        setNewMessage(content)
      }
    } catch (e) {
      console.error('메시지 전송 오류:', e)
      setNewMessage(content)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">채팅 불러오는 중...</div>

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={initChat} className="text-sm text-gray-500 underline">다시 시도</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.map(msg => {
          const isMine = msg.user_id === myId
          return (
            <div key={msg.id} className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
              {!isMine && (
                msg.profiles?.avatar_url
                  ? <img src={msg.profiles.avatar_url} className="w-8 h-8 rounded-full flex-shrink-0" alt="" />
                  : <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs flex-shrink-0">👤</div>
              )}
              <div className={`max-w-[70%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                {!isMine && (
                  <p className="text-xs text-gray-500 mb-1">{msg.profiles?.nickname}</p>
                )}
                <div className={`px-3 py-2 rounded-2xl text-sm ${isMine ? 'bg-primary text-white rounded-tr-sm' : 'bg-white shadow rounded-tl-sm'}`}>
                  {msg.content}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 py-3 border-t bg-gray-50">
        <input
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-primary"
          placeholder="메시지 입력..."
        />
        <button
          onClick={sendMessage}
          className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        >
          ➤
        </button>
      </div>
    </div>
  )
}
