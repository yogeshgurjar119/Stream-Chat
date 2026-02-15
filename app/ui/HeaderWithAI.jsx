'use client'
import { useState } from 'react'
import AIChat from '../ui/AIChat'

export default function HeaderWithAI() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)

  return (
    <>
      <header className="header">
        <div className="header-content">
          <h1 className="logo">My Website</h1>
          <nav className="nav">
            <a href="/" className="nav-link">Home</a>
            <a href="/dashboard" className="nav-link">Stream</a>
            <button
              onClick={() => setIsAIChatOpen(true)}
              className="nav-link ai-chat-trigger"
              title="AI Assistant"
            >
              🤖 AI Chat
            </button>
          </nav>
        </div>
      </header>
      
      <AIChat 
        isOpen={isAIChatOpen} 
        onClose={() => setIsAIChatOpen(false)} 
      />
    </>
  )
}