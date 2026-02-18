'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const CursorContext = createContext()

export function CursorProvider({ children }) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [cursorVisible, setCursorVisible] = useState(true)

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY })
    }
    
    const handleMouseEnter = (e) => {
      const target = e.target
      if (target && target.tagName && (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        (target.hasAttribute && target.hasAttribute('data-cursor-hover'))
      )) {
        setIsHovered(true)
      }
    }
    
    const handleMouseLeave = () => {
      setIsHovered(false)
    }
    
    const handleMouseDown = () => {
      setIsDragging(true)
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
    }
    
    // Handle touch devices
    const handleTouchStart = () => {
      setCursorVisible(false)
    }
    
    const handleTouchMove = (e) => {
      if (e.touches && e.touches[0]) {
        setPosition({ x: e.touches[0].clientX, y: e.touches[0].clientY })
      }
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseenter', handleMouseEnter, true)
    document.addEventListener('mouseleave', handleMouseLeave, true)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchmove', handleTouchMove)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseenter', handleMouseEnter, true)
      document.removeEventListener('mouseleave', handleMouseLeave, true)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  const value = {
    position,
    isHovered,
    isDragging,
    cursorVisible,
    setCursorVisible
  }

  return (
    <CursorContext.Provider value={value}>
      {children}
      {cursorVisible && (
        <div 
          className={`cursor-glow ${isHovered ? 'hover' : ''} ${isDragging ? 'drag' : ''}`}
          style={{
            left: position.x,
            top: position.y,
          }}
        />
      )}
    </CursorContext.Provider>
  )
}

export function useCursor() {
  const context = useContext(CursorContext)
  if (!context) {
    throw new Error('useCursor must be used within a CursorProvider')
  }
  return context
}

export default CursorProvider