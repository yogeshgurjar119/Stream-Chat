'use client'
import './globals.css'
import SocketProvider from './providers/SocketProvider.jsx'
import { Toaster } from 'react-hot-toast'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function RootLayout({ children }) {
  const pathname = usePathname()
  const showHeader = !(pathname?.startsWith('/dashboard') || pathname?.startsWith('/room'))
  return (
    <html lang="en">
      <body>
        <SocketProvider>
          <Toaster position="top-center" />
          {showHeader ? (
            <header className="header">
              <div className="header-content">
                <h1 className="logo">My Website</h1>
                <nav className="nav">
                  <Link href="/" className="nav-link">Home</Link>
                  <Link href="/dashboard" className="nav-link">Stream</Link>
                </nav>
              </div>
            </header>
          ) : null}
          <main className="main-content">
            {children}
          </main>
        </SocketProvider>
      </body>
    </html>
  )
}
