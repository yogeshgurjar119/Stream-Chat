'use client'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'react-hot-toast'

export default function AIChat({ isOpen, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      // Use setTimeout to avoid React warnings about state updates during render
      setTimeout(() => {
        toast.success('Code copied to clipboard!')
      }, 0)
    } catch {
      setTimeout(() => {
        toast.error('Failed to copy code')
      }, 0)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Using Bytez SDK equivalent functionality
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      const aiMessage = {
        role: 'assistant',
        content: data.output,
        timestamp: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('AI Chat Error:', error)
      toast.error('Failed to get AI response. Please try again.')
      
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const renderMessageContent = (content) => {
    // Handle different content types from Bytez SDK
    if (typeof content !== 'string') {
      // If content is an object or array, stringify it for display
      if (content && typeof content === 'object') {
        return (
          <div className="space-y-2">
            <pre className="bg-slate-950/90 p-3 text-xs leading-relaxed text-slate-200 rounded-lg border border-slate-700/30">
              <code className="font-mono">
                {JSON.stringify(content, null, 2)}
              </code>
            </pre>
          </div>
        )
      }
      return <p>Unable to display content</p>
    }
    
    // Split content into code blocks and regular text
    const parts = content.split(/(```[\s\S]*?```)/g)
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // Extract code block
        const codeContent = part.slice(3, -3).trim()
        const language = codeContent.split('\n')[0].toLowerCase()
        const code = codeContent.split('\n').slice(1).join('\n')
        
        return (
          <div key={index} className="my-3 overflow-hidden rounded-lg border border-slate-700/30">
            <div className="flex items-center justify-between bg-slate-950/80 px-3 py-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-300/70">{language || 'code'}</span>
              <button
                onClick={() => copyCode(code)}
                className="rounded border border-indigo-400/30 bg-indigo-500/10 px-2 py-1 text-[11px] text-indigo-200 transition hover:bg-indigo-500/20"
                title="Copy code"
              >
                📋 Copy
              </button>
            </div>
            <pre className="bg-slate-950/90 p-3 text-xs leading-relaxed text-slate-200">
              <code className="font-mono">{code}</code>
            </pre>
          </div>
        )
      } else if (part.trim()) {
        // Regular text with markdown-like formatting
        return (
          <div key={index} className="space-y-2">
            {part.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )
      }
      return null
    }).filter(Boolean)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-lg" onClick={onClose}>
      <div className="flex h-[85vh] max-h-[800px] w-[95%] max-w-4xl flex-col overflow-hidden rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-700/40 bg-slate-800/90 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">🤖 AI Assistant</h3>
          <button className="rounded-lg p-2 text-lg text-slate-300 transition-all hover:bg-red-500/20 hover:text-red-300" onClick={onClose}>✕</button>
        </div>
        
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          {messages.length === 0 && (
            <div className="text-center text-slate-200">
              <p className="text-lg font-medium mb-2">Hello! I&apos;m your AI assistant. Ask me anything!</p>
              <p className="text-sm text-slate-400">
                💡 Tips: I can provide detailed explanations, code examples, and help with various topics.
              </p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex flex-col gap-2 ${message.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-4 text-sm ${
                  message.role === 'user'
                    ? 'rounded-br-md bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                    : message.isError
                      ? 'rounded-bl-md border border-red-500/40 bg-red-500/15 text-red-200'
                      : 'rounded-bl-md border border-slate-700/40 bg-slate-800/80 text-slate-200 shadow-md'
                }`}
              >
                {renderMessageContent(message.content)}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex flex-col items-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-slate-700/40 bg-slate-800/80 px-5 py-4 text-sm text-slate-200 shadow-md">
                <div className="flex gap-2 py-1">
                  <span className="h-3 w-3 animate-bounce rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 [animation-delay:-0.3s]"></span>
                  <span className="h-3 w-3 animate-bounce rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 [animation-delay:-0.15s]"></span>
                  <span className="h-3 w-3 animate-bounce rounded-full bg-gradient-to-r from-indigo-400 to-purple-400"></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={sendMessage} className="flex gap-4 border-t border-slate-700/40 bg-slate-800/90 px-6 py-5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 rounded-xl border border-slate-700/40 bg-slate-700/30 px-5 py-4 text-base text-white placeholder:text-slate-400 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="min-w-[60px] rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4 text-white text-lg transition-all hover:from-indigo-600 hover:to-purple-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </form>
      </div>
    </div>
  )
}
