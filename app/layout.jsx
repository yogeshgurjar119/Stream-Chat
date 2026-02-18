'use client'
import './globals.css'
import SocketProvider from './providers/SocketProvider.jsx'
import { Toaster } from 'react-hot-toast'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import AIChat from './ui/AIChat'
import CursorProvider from './cursor-context.jsx'

export default function RootLayout({ children }) {
  const pathname = usePathname()
  const showHeader = !(pathname?.startsWith('/dashboard') || pathname?.startsWith('/room'))
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 antialiased custom-cursor"
      >
        <CursorProvider>
          <SocketProvider>
            <Toaster position="top-center" />
          {showHeader ? (
            <header className="sticky top-0 z-50 border-b border-slate-700/30 bg-slate-900/95 backdrop-blur-lg">
              <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <h1 className="m-0 text-xl font-bold text-white bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">StreamChat</h1>
                <nav className="flex items-center gap-4">
                  <Link href="/" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:bg-slate-800/50 hover:text-white cursor-pointer" data-cursor-hover="true">
                    Home
                  </Link>
                  <Link href="/dashboard" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:bg-slate-800/50 hover:text-white cursor-pointer" data-cursor-hover="true">
                    Stream
                  </Link>
                  <button
                    onClick={() => setIsAIChatOpen(true)}
                    className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-medium text-white transition-all hover:from-indigo-600 hover:to-purple-600 hover:shadow-lg cursor-pointer btn-advanced"
                    title="AI Assistant"
                    data-cursor-hover="true"
                  >
                    🤖 AI Assistant
                  </button>
                </nav>
              </div>
            </header>
          ) : null}
          <main className="mx-auto max-w-7xl px-6 py-8">
            {children}
          </main>
          <AIChat 
            isOpen={isAIChatOpen} 
            onClose={() => setIsAIChatOpen(false)} 
          />
        </SocketProvider>
        </CursorProvider>
      </body>
    </html>
  )
}
