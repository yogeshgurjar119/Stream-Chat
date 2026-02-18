'use client'
import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars, OrbitControls, useCursor } from '@react-three/drei'
import * as THREE from 'three'

// Star Background Component (covers full viewport)
function StarBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      </Canvas>
    </div>
  )
}

// HeroForge-Style Realistic 3D Avatar with Drag-and-Drop
function Avatar({ mousePosition, scrollPosition, isHovered, isDragging, dragPosition }) {
  const groupRef = useRef()
  const headRef = useRef()
  const torsoRef = useRef()
  const leftArmRef = useRef()
  const rightArmRef = useRef()
  const leftHandRef = useRef()
  const rightHandRef = useRef()
  const leftLegRef = useRef()
  const rightLegRef = useRef()
  
  // Custom cursor for hover effects
  useCursor(isHovered)
  
  useFrame((state) => {
    if (!groupRef.current) return
    
    const time = state.clock.elapsedTime
    const mouseX = mousePosition.current?.x || 0
    const mouseY = mousePosition.current?.y || 0
    const scrollY = scrollPosition.current || 0
    
    // Drag position influence
    if (isDragging && dragPosition.current) {
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        dragPosition.current.x * 2 - 1,
        0.1
      )
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        dragPosition.current.y * 2 - 1,
        0.1
      )
    }
    
    // HeroForge-style realistic head movement
    if (headRef.current) {
      // Smooth head tracking
      headRef.current.rotation.y = THREE.MathUtils.lerp(
        headRef.current.rotation.y,
        (mouseX - 0.5) * 0.8,
        0.05
      )
      headRef.current.rotation.x = THREE.MathUtils.lerp(
        headRef.current.rotation.x,
        (mouseY - 0.5) * 0.6,
        0.05
      )
      
      // Subtle breathing animation
      headRef.current.position.y = Math.sin(time * 1.2) * 0.02
    }
    
    // Realistic arm movements with HeroForge precision
    if (leftArmRef.current && rightArmRef.current) {
      const armSwing = Math.sin(time * 1.5 + scrollY * 0.001) * 0.3
      const armLift = Math.cos(time * 1.2) * 0.15
      
      // Left arm natural swing
      leftArmRef.current.rotation.z = armSwing + armLift
      leftArmRef.current.rotation.x = Math.sin(time * 2.3) * 0.08
      
      // Right arm counter-swing
      rightArmRef.current.rotation.z = -armSwing - armLift
      rightArmRef.current.rotation.x = Math.cos(time * 2.1) * 0.08
      
      // Hand movements
      if (leftHandRef.current) {
        leftHandRef.current.rotation.x = Math.sin(time * 3) * 0.1
      }
      if (rightHandRef.current) {
        rightHandRef.current.rotation.x = Math.cos(time * 3) * 0.1
      }
    }
    
    // Natural leg movements
    if (leftLegRef.current && rightLegRef.current) {
      const legSwing = Math.sin(time * 2.5) * 0.2
      leftLegRef.current.rotation.x = legSwing
      rightLegRef.current.rotation.x = -legSwing
      
      // Subtle knee bending
      leftLegRef.current.rotation.z = Math.sin(time * 1.8) * 0.05
      rightLegRef.current.rotation.z = Math.cos(time * 1.8) * 0.05
    }
    
    // Torso movement with HeroForge realism
    if (torsoRef.current) {
      torsoRef.current.rotation.y = Math.sin(time * 0.7) * 0.03
      torsoRef.current.rotation.x = Math.cos(time * 0.9) * 0.02
    }
    
    // Anti-gravity floating effect
    groupRef.current.position.y = Math.sin(time * 0.6) * 0.08 + 0.5
    groupRef.current.rotation.z = Math.sin(time * 0.4) * 0.01
    
    // Cursor influence on overall stance
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      (mouseX - 0.5) * 0.3,
      0.02
    )
  })

  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      {/* Realistic Human Head */}
      <group ref={headRef} position={[0, 0.7, 0]}>
        {/* Main head - more realistic proportions */}
        <mesh>
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial 
            color="#f0d9b5" 
            metalness={0.05} 
            roughness={0.6} 
            emissive={isHovered ? "#f0d9b520" : "#000000"}
            emissiveIntensity={isHovered ? 0.2 : 0}
          />
        </mesh>
        
        {/* Realistic eyes */}
        <mesh position={[-0.12, 0.05, 0.32]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color="#1a202c" metalness={0.3} roughness={0.2} />
        </mesh>
        <mesh position={[0.12, 0.05, 0.32]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color="#1a202c" metalness={0.3} roughness={0.2} />
        </mesh>
        
        {/* Eye whites */}
        <mesh position={[-0.12, 0.05, 0.31]}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.1} roughness={0.3} />
        </mesh>
        <mesh position={[0.12, 0.05, 0.31]}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.1} roughness={0.3} />
        </mesh>
        
        {/* Nose - more realistic */}
        <mesh position={[0, -0.08, 0.33]}>
          <coneGeometry args={[0.03, 0.08, 8]} />
          <meshStandardMaterial color="#e2d3b5" metalness={0.1} roughness={0.7} />
        </mesh>
        
        {/* Mouth */}
        <mesh position={[0, -0.18, 0.3]}>
          <boxGeometry args={[0.08, 0.02, 0.02]} />
          <meshStandardMaterial color="#d69e2e" metalness={0.2} roughness={0.6} />
        </mesh>
        
        {/* Ears */}
        <mesh position={[-0.32, 0, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#f0d9b5" metalness={0.05} roughness={0.6} />
        </mesh>
        <mesh position={[0.32, 0, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#f0d9b5" metalness={0.05} roughness={0.6} />
        </mesh>
        
        {/* Hair - more natural */}
        <mesh position={[0, 0.25, -0.05]}>
          <sphereGeometry args={[0.38, 16, 16]} />
          <meshStandardMaterial color="#2d3748" metalness={0.1} roughness={0.8} />
        </mesh>
      </group>
      
      {/* Realistic Human Torso */}
      <group ref={torsoRef} position={[0, 0, 0]}>
        <mesh>
          <capsuleGeometry args={[0.4, 1.2, 12, 20]} />
          <meshStandardMaterial 
            color="#4f46e5" 
            metalness={0.2} 
            roughness={0.3}
            emissive="#3730a3"
            emissiveIntensity={isHovered ? 0.4 : 0.15}
          />
        </mesh>
        
        {/* Chest - more realistic */}
        <mesh position={[0, 0.2, 0.35]}>
          <boxGeometry args={[0.25, 0.15, 0.03]} />
          <meshStandardMaterial color="#6366f1" metalness={0.4} roughness={0.2} />
        </mesh>
        
        {/* Shoulders - more natural */}
        <mesh position={[-0.45, 0.4, 0]}>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshStandardMaterial color="#312e81" metalness={0.6} roughness={0.1} />
        </mesh>
        <mesh position={[0.45, 0.4, 0]}>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshStandardMaterial color="#312e81" metalness={0.6} roughness={0.1} />
        </mesh>
      </group>
      
      {/* Realistic Human Arms */}
      <group ref={leftArmRef} position={[-0.6, 0.2, 0]}>
        <mesh>
          <capsuleGeometry args={[0.12, 1.0, 8, 16]} />
          <meshStandardMaterial 
            color="#6366f1" 
            metalness={0.3} 
            roughness={0.25}
          />
        </mesh>
        
        {/* Elbow joint */}
        <mesh position={[0, -0.25, 0]}>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshStandardMaterial color="#4f46e5" metalness={0.5} roughness={0.15} />
        </mesh>
        
        {/* Hand */}
        <group ref={leftHandRef} position={[0, -0.5, 0]}>
          <mesh>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshStandardMaterial color="#f0d9b5" metalness={0.1} roughness={0.6} />
          </mesh>
          
          {/* Fingers - more natural */}
          {[...Array(5)].map((_, i) => (
            <mesh key={i} position={[(i - 2) * 0.04, -0.06, 0.04]}>
              <capsuleGeometry args={[0.015, 0.08, 4, 8]} />
              <meshStandardMaterial color="#f0d9b5" metalness={0.1} roughness={0.6} />
            </mesh>
          ))}
        </group>
      </group>
      
      <group ref={rightArmRef} position={[0.6, 0.2, 0]}>
        <mesh>
          <capsuleGeometry args={[0.12, 1.0, 8, 16]} />
          <meshStandardMaterial 
            color="#6366f1" 
            metalness={0.3} 
            roughness={0.25}
          />
        </mesh>
        
        {/* Elbow joint */}
        <mesh position={[0, -0.25, 0]}>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshStandardMaterial color="#4f46e5" metalness={0.5} roughness={0.15} />
        </mesh>
        
        {/* Hand */}
        <group ref={rightHandRef} position={[0, -0.5, 0]}>
          <mesh>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshStandardMaterial color="#f0d9b5" metalness={0.1} roughness={0.6} />
          </mesh>
          
          {/* Fingers */}
          {[...Array(5)].map((_, i) => (
            <mesh key={i} position={[(i - 2) * 0.04, -0.06, 0.04]}>
              <capsuleGeometry args={[0.015, 0.08, 4, 8]} />
              <meshStandardMaterial color="#f0d9b5" metalness={0.1} roughness={0.6} />
            </mesh>
          ))}
        </group>
      </group>
      
      {/* Realistic Human Legs */}
      <group ref={leftLegRef} position={[-0.25, -0.8, 0]}>
        <mesh>
          <capsuleGeometry args={[0.15, 1.2, 8, 16]} />
          <meshStandardMaterial 
            color="#4f46e5" 
            metalness={0.4} 
            roughness={0.2}
          />
        </mesh>
        
        {/* Knee joint */}
        <mesh position={[0, -0.2, 0]}>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshStandardMaterial color="#312e81" metalness={0.6} roughness={0.1} />
        </mesh>
        
        {/* Boot */}
        <mesh position={[0, -0.7, 0.1]}>
          <boxGeometry args={[0.22, 0.18, 0.32]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.1} />
        </mesh>
      </group>
      
      <group ref={rightLegRef} position={[0.25, -0.8, 0]}>
        <mesh>
          <capsuleGeometry args={[0.15, 1.2, 8, 16]} />
          <meshStandardMaterial 
            color="#4f46e5" 
            metalness={0.4} 
            roughness={0.2}
          />
        </mesh>
        
        {/* Knee joint */}
        <mesh position={[0, -0.2, 0]}>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshStandardMaterial color="#312e81" metalness={0.6} roughness={0.1} />
        </mesh>
        
        {/* Boot */}
        <mesh position={[0, -0.7, 0.1]}>
          <boxGeometry args={[0.22, 0.18, 0.32]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.1} />
        </mesh>
      </group>
    </group>
  )
}

// Fixed Canvas for 3D Avatar with Cursor Interactions and Drag-and-Drop
function AvatarCanvas({ mousePosition, scrollPosition }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const canvasRef = useRef()
  const dragPosition = useRef({ x: 0, y: 0 })
  const dragStartRef = useRef({ x: 0, y: 0 })
  const avatarPositionRef = useRef({ x: 0, y: 0 })
  
  // Track mouse position for cursor effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height
      mousePosition.current = { x, y }
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mousePosition])
  
  // Global drag functionality
  useEffect(() => {
    const handleMouseDown = (e) => {
      // Check if click is on avatar or canvas
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const isOnAvatar = e.clientX >= rect.left && e.clientX <= rect.right &&
                          e.clientY >= rect.top && e.clientY <= rect.bottom
        
        if (isOnAvatar) {
          setIsDragging(true)
          setIsHovered(true)
          dragStartRef.current = { x: e.clientX, y: e.clientY }
          e.preventDefault()
        }
      }
    }
    
    const handleMouseMove = (e) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartRef.current.x
        const deltaY = e.clientY - dragStartRef.current.y
        
        // Update avatar position
        avatarPositionRef.current = {
          x: avatarPositionRef.current.x + deltaX * 0.5,
          y: avatarPositionRef.current.y + deltaY * 0.5
        }
        
        dragStartRef.current = { x: e.clientX, y: e.clientY }
      }
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      setIsHovered(false)
    }
    
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  return (
    <div 
      ref={canvasRef}
      className={`fixed z-20 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{ 
        transform: `translate(${avatarPositionRef.current.x}px, ${avatarPositionRef.current.y + scrollPosition.current * 0.1}px)`,
        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        pointerEvents: 'auto',
        filter: isDragging ? 'brightness(1.2)' : 'none'
      }}
    >
      <Canvas 
        camera={{ position: [5, 2, 5], fov: 45 }}
        style={{ width: '300px', height: '400px' }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} />
        <pointLight position={[-10, -10, -10]} intensity={0.8} />
        <pointLight position={[0, 5, 5]} intensity={0.5} color="#6366f1" />
        <spotLight position={[0, 5, 5]} intensity={0.8} angle={0.3} penumbra={1} color="#ffffff" />
        <Avatar 
          mousePosition={mousePosition}
          scrollPosition={scrollPosition}
          isHovered={isHovered}
          isDragging={isDragging}
          dragPosition={dragPosition}
        />
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
      
      {/* Custom Cursor Pointer */}
      {isHovered && (
        <div 
          className="absolute w-6 h-6 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
          style={{
            left: mousePosition.current?.x * 320 || 0,
            top: mousePosition.current?.y * 384 || 0,
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.8)'
          }}
        />
      )}
    </div>
  )
}

// Custom Cursor Component
function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
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
    
    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseenter', handleMouseEnter, true)
    document.addEventListener('mouseleave', handleMouseLeave, true)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseenter', handleMouseEnter, true)
      document.removeEventListener('mouseleave', handleMouseLeave, true)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])
  
  return (
    <div 
      className={`cursor-glow ${isHovered ? 'hover' : ''} ${isDragging ? 'drag' : ''}`}
      style={{
        left: position.x,
        top: position.y,
      }}
    />
  )
}

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0)
  const mousePosition = useRef({ x: 0, y: 0 })
  const scrollPosition = useRef(0)

  // Track mouse movement for anti-gravity effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      mousePosition.current = { 
        x: e.clientX / window.innerWidth, 
        y: e.clientY / window.innerHeight 
      }
    }
    
    const handleScroll = () => {
      scrollPosition.current = window.scrollY
      setScrollY(window.scrollY)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('scroll', handleScroll)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const technologies = [
    { name: 'Node.js', color: '#339933' },
    { name: 'PHP', color: '#777bb4' },
    { name: 'Laravel', color: '#ff2d20' },
    { name: 'React', color: '#61dafb' },
    { name: 'Next.js', color: '#000000' },
    { name: 'Three.js', color: '#ffffff' },
    { name: 'Socket.IO', color: '#010101' },
    { name: 'WebRTC', color: '#333333' },
  ]

  return (
    <div className="min-h-screen custom-cursor">
      {/* Star Background (full viewport) */}
      <StarBackground />
      
      {/* Fixed 3D Avatar Canvas with cursor interactions */}
      <AvatarCanvas 
        mousePosition={mousePosition}
        scrollPosition={scrollPosition}
      />
      
      {/* Content Overlay with anti-gravity hover effects */}
      <div className="relative z-10">
        {/* Hero Section with Advanced CTA */}
        <section className="min-h-screen flex items-center justify-center px-6 relative z-10">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left">
              <h1 
                className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent hover:scale-110 transition-transform duration-500 cursor-pointer group"
                style={{
                  transform: `translateY(${Math.sin(scrollY * 0.01) * 10}px)`,
                  textShadow: '0 0 30px rgba(99, 102, 241, 0.5)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.textShadow = '0 0 50px rgba(99, 102, 241, 0.8)';
                  e.target.style.filter = 'drop-shadow(0 0 20px rgba(99, 102, 241, 0.6))';
                }}
                onMouseLeave={(e) => {
                  e.target.style.textShadow = '0 0 30px rgba(99, 102, 241, 0.5)';
                  e.target.style.filter = 'none';
                }}
              >
                Welcome
              </h1>
              <p 
                className="text-xl md:text-2xl text-slate-300 mb-8 hover:scale-105 transition-transform duration-300 cursor-pointer"
                style={{
                  transform: `translateY(${Math.sin(scrollY * 0.008) * 8}px)`,
                  textShadow: '0 0 15px rgba(148, 163, 184, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#e2e8f0';
                  e.target.style.textShadow = '0 0 25px rgba(226, 232, 240, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#cbd5e1';
                  e.target.style.textShadow = '0 0 15px rgba(148, 163, 184, 0.3)';
                }}
              >
                Building the future with AI and modern web technologies
              </p>
              <div className="flex gap-4 justify-center md:justify-start">
                <button 
                  className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 font-semibold group relative overflow-hidden cursor-pointer"
                  style={{
                    transform: `translateY(${Math.sin(scrollY * 0.012) * 5}px)`,
                    boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.boxShadow = '0 0 40px rgba(99, 102, 241, 0.6)';
                    e.target.style.transform = `translateY(${Math.sin(scrollY * 0.012) * 5}px) scale(1.05)`;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.3)';
                    e.target.style.transform = `translateY(${Math.sin(scrollY * 0.012) * 5}px) scale(1)`;
                  }}
                  onClick={() => window.location.href = '/contact'}
                >
                  <span className="relative z-10">Get Started</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-400 to-purple-400 opacity-0 group-hover:opacity-30 blur-md transition-opacity duration-300" />
                </button>
                <button 
                  className="px-8 py-4 border border-slate-600 rounded-lg hover:bg-slate-800/50 transition-all duration-300 font-semibold group relative overflow-hidden cursor-pointer"
                  style={{
                    transform: `translateY(${Math.sin(scrollY * 0.009) * 6}px)`,
                    boxShadow: '0 0 15px rgba(148, 163, 184, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = '#6366f1';
                    e.target.style.boxShadow = '0 0 25px rgba(99, 102, 241, 0.2)';
                    e.target.style.transform = `translateY(${Math.sin(scrollY * 0.009) * 6}px) scale(1.05)`;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = '#475569';
                    e.target.style.boxShadow = '0 0 15px rgba(148, 163, 184, 0.1)';
                    e.target.style.transform = `translateY(${Math.sin(scrollY * 0.009) * 6}px) scale(1)`;
                  }}
                >
                  <span className="relative z-10">Learn More</span>
                  <div className="absolute inset-0 bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute -inset-1 bg-slate-500 opacity-0 group-hover:opacity-20 blur-md transition-opacity duration-300" />
                </button>
              </div>
            </div>
            <div className="hidden md:block" />
          </div>
        </section>
        
        {/* Technology Section with Anti-Gravity Cards */}
        <section className="py-20 px-6 relative z-10">
          <div className="max-w-6xl mx-auto">
            <h2 
              className="text-4xl md:text-5xl font-bold text-center mb-12 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent cursor-pointer"
              style={{
                transform: `translateY(${Math.sin(scrollY * 0.005) * 8}px)`,
                textShadow: '0 0 25px rgba(99, 102, 241, 0.4)'
              }}
              data-cursor-hover="true"
              onMouseEnter={(e) => {
                e.target.style.textShadow = '0 0 40px rgba(99, 102, 241, 0.7)'
                e.target.style.filter = 'drop-shadow(0 0 15px rgba(99, 102, 241, 0.5))'
              }}
              onMouseLeave={(e) => {
                e.target.style.textShadow = '0 0 25px rgba(99, 102, 241, 0.4)'
                e.target.style.filter = 'none'
              }}
            >
              Technologies I Work With
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: 'React', icon: '⚛️', desc: 'Modern UI development', color: 'from-cyan-400 to-blue-500' },
                { name: 'Next.js', icon: '▲', desc: 'Full-stack framework', color: 'from-gray-400 to-gray-600' },
                { name: 'Three.js', icon: '🎲', desc: '3D graphics and animations', color: 'from-green-400 to-emerald-500' },
                { name: 'Node.js', icon: '⬢', desc: 'Server-side JavaScript', color: 'from-green-500 to-lime-600' },
                { name: 'TypeScript', icon: '📘', desc: 'Type-safe development', color: 'from-blue-500 to-indigo-600' },
                { name: 'Tailwind', icon: '🎨', desc: 'Utility-first CSS', color: 'from-teal-400 to-cyan-500' }
              ].map((tech, index) => (
                <div 
                  key={tech.name} 
                  className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 hover:border-indigo-500 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/20 tech-card-enhanced anti-gravity cursor-pointer"
                  style={{
                    transform: `translateY(${Math.sin(scrollY * 0.01 + index * 0.5) * 6}px)`,
                    animationDelay: `${index * 0.1}s`
                  }}
                  data-cursor-hover="true"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = `translateY(${Math.sin(scrollY * 0.01 + index * 0.5) * 6 - 15}px) scale(1.05)`
                    e.currentTarget.style.boxShadow = '0 25px 50px rgba(99, 102, 241, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = `translateY(${Math.sin(scrollY * 0.01 + index * 0.5) * 6}px) scale(1)`
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div 
                    className="text-4xl mb-4 float-animation"
                    style={{
                      animationDelay: `${index * 0.2}s`
                    }}
                  >
                    {tech.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2 bg-gradient-to-r bg-clip-text text-transparent cursor-pointer" style={{ backgroundImage: `linear-gradient(to right, ${tech.color})` }}>
                    {tech.name}
                  </h3>
                  <p className="text-slate-400 hover:text-slate-300 transition-colors duration-300">
                    {tech.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* End Section */}
        <section className="min-h-screen flex items-center justify-center">
          <div className="text-center px-6">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Ready to explore more?
            </h2>
            <p className="text-xl text-slate-300 mb-8">
              Check out the Stream Dashboard or other features
            </p>
            <button className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all">
              Get Started
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}