import type { Metadata } from 'next'
import './globals.css'

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
        <header className="bg-primary text-white p-4 shadow">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <a href="/" className="text-xl font-bold">🏓 SB 피클볼</a>
            <a href="/profile" className="text-sm">내 프로필</a>
          </div>
        </header>
        <main className="max-w-2xl mx-auto p-4">
          {children}
        </main>
      </body>
    </html>
  )
}
