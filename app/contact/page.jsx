'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ContactPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitStatus('Message sent successfully!')
        setFormData({ name: '', email: '', subject: '', message: '' })
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } else {
        setSubmitStatus('Failed to send message. Please try again.')
      }
    } catch (error) {
      setSubmitStatus('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-6">
      <div className="max-w-2xl w-full">
        <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-8 border border-slate-700/30 tech-card-enhanced anti-gravity" data-cursor-hover="true">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent cursor-pointer" data-cursor-hover="true">
              Get In Touch
            </h1>
            <p className="text-slate-300 hover:text-slate-200 transition-colors duration-300">
              Let&apos;s discuss your next project or collaboration
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2 cursor-pointer" data-cursor-hover="true">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all form-input-enhanced"
                  placeholder="Your name"
                  data-cursor-hover="true"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2 cursor-pointer" data-cursor-hover="true">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all form-input-enhanced"
                  placeholder="your.email@example.com"
                  data-cursor-hover="true"
                />
              </div>
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-slate-300 mb-2 cursor-pointer" data-cursor-hover="true">
                Subject *
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all form-input-enhanced"
                placeholder="Project discussion, collaboration, etc."
                data-cursor-hover="true"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-2 cursor-pointer" data-cursor-hover="true">
                Message *
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={6}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none form-input-enhanced"
                placeholder="Tell me about your project, requirements, timeline..."
                data-cursor-hover="true"
              />
            </div>

            {submitStatus && (
              <div className={`p-4 rounded-lg text-center ${
                submitStatus.includes('successfully') 
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                {submitStatus}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold group relative overflow-hidden btn-advanced"
              data-cursor-hover="true"
            >
              <span className="relative z-10">
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-lg opacity-0 group-hover:opacity-30 blur-md transition-opacity duration-300" />
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-400 text-sm">
              Or reach out directly at: <span className="text-indigo-400">your.email@domain.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}