import type { Metadata } from 'next'
import './globals.css'
import BottomNav from './components/BottomNav'

export const metadata: Metadata = {
  title: 'SB 피클볼 매칭',
  description: '전주 피클볼 파트너 매칭 플랫폼',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 min-h-screen">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-2xl">🏓</span>
              <span className="font-bold text-gray-900 text-lg">SB 피클볼</span>
            </a>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">전주</span>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 pt-4 pb-nav">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  )
}
