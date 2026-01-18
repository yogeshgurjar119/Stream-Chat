'use client'
import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'

export default function HomePage() {
  const threeRef = useRef(null)
  const scrollRef = useRef(null)
  const [scrollY, setScrollY] = useState(0)

  // Handle scroll event
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Three.js background
  useEffect(() => {
    const container = threeRef.current
    if (!container) return

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
    const isMobile = window.matchMedia?.('(max-width: 860px)')?.matches ?? false

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(new THREE.Color('#050816'), 8, 32)

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200)
    camera.position.set(-2.4, 1.1, 7)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, isMobile ? 1.5 : 2))
    container.replaceChildren(renderer.domElement)

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)
    const key = new THREE.DirectionalLight(0x93c5fd, 1.0)
    key.position.set(6, 6, 6)
    scene.add(key)
    const fill = new THREE.PointLight(0xa7f3d0, 0.7, 40)
    fill.position.set(-6, -2, 6)
    scene.add(fill)

    // Main geometry group
    const group = new THREE.Group()
    scene.add(group)

    // Torus knot
    const mainMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      metalness: 0.35,
      roughness: 0.25,
      emissive: 0x111827,
      emissiveIntensity: 0.5,
    })
    const knotGeo = new THREE.TorusKnotGeometry(1.1, 0.32, 160, 18)
    const knot = new THREE.Mesh(knotGeo, mainMat)
    knot.position.set(0.0, 0.0, 0.0)
    group.add(knot)

    // Ring around knot
    const ringGeo = new THREE.TorusGeometry(2.2, 0.02, 18, 220)
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xa7f3d0,
      metalness: 0.0,
      roughness: 0.3,
      emissive: 0x0f766e,
      emissiveIntensity: 0.8,
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI * 0.5
    ring.rotation.y = Math.PI * 0.1
    group.add(ring)

    // Stars
    let starsGeo
    let starsMat
    let stars
    const starsCount = reduceMotion ? 0 : isMobile ? 520 : 1100
    if (starsCount > 0) {
      starsGeo = new THREE.BufferGeometry()
      const positions = new Float32Array(starsCount * 3)
      for (let i = 0; i < starsCount; i += 1) {
        const i3 = i * 3
        const r = 6 + Math.random() * 20
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        positions[i3] = r * Math.sin(phi) * Math.cos(theta)
        positions[i3 + 1] = r * Math.cos(phi)
        positions[i3 + 2] = -Math.abs(r * Math.sin(phi) * Math.sin(theta))
      }
      starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      starsMat = new THREE.PointsMaterial({
        color: 0x93c5fd,
        size: isMobile ? 0.018 : 0.02,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.85,
      })
      stars = new THREE.Points(starsGeo, starsMat)
      scene.add(stars)
    }

    // Handle resize
    const setSize = () => {
      const rect = container.getBoundingClientRect()
      const width = Math.max(1, Math.floor(rect.width))
      const height = Math.max(1, Math.floor(rect.height))
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    setSize()
    const resizeObserver = new ResizeObserver(() => setSize())
    resizeObserver.observe(container)

    // Animation
    let rafId = 0
    let running = true
    const clock = new THREE.Clock()
    const animate = () => {
      if (!running) return
      rafId = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      group.rotation.y = t * 0.22
      group.rotation.x = Math.sin(t * 0.18) * 0.08
      knot.rotation.z = t * 0.12
      if (stars) stars.rotation.y = -t * 0.02
      renderer.render(scene, camera)
    }
    if (reduceMotion) {
      renderer.render(scene, camera)
    } else {
      animate()
    }

    // Handle visibility change
    const onVisibilityChange = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(rafId)
        rafId = 0
        return
      }
      if (reduceMotion) return
      if (!running) {
        running = true
        clock.start()
        animate()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      container.replaceChildren()
      if (starsGeo) starsGeo.dispose()
      if (starsMat) starsMat.dispose()
      knotGeo.dispose()
      ringGeo.dispose()
      mainMat.dispose()
      ringMat.dispose()
      renderer.dispose()
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
    <div className="homePage">
      {/* Three.js Background */}
      <div ref={threeRef} className="homeCanvas" />
      
      {/* Content Overlay */}
      <div className="homeOverlay">
        {/* Hero Section */}
        <section className="heroSection">
          <div className="heroContent">
            <h1 className="heroTitle">Welcome to My Website</h1>
            <p className="heroSubtitle">Explore my work and technologies</p>
          </div>
        </section>
        
        {/* Scroll Section with Technologies */}
        <section ref={scrollRef} className="techScrollSection">
          <div className="techContainer">
            {technologies.map((tech, index) => {
              const translateY = (index * 200) - (scrollY * 0.5)
              const opacity = Math.max(0, Math.min(1, 1 - Math.abs(translateY - 200) / 300))
              
              return (
                <div 
                  key={tech.name} 
                  className="techItem"
                  style={{
                    transform: `translateY(${translateY}px)`,
                    opacity,
                    color: tech.color
                  }}
                >
                  <h2 className="techName">{tech.name}</h2>
                </div>
              )
            })}
          </div>
        </section>
        
        {/* End Section */}
        <section className="endSection">
          <div className="endContent">
            <h2>Ready to explore more?</h2>
            <p>Check out the Stream Dashboard or other features</p>
          </div>
        </section>
      </div>
    </div>
  )
}
