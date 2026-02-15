'use client'
import StreamInterface from '../ui/StreamInterface'

export default function DashboardPage() {
  return (
    <div className="w-full">
      <div className="grid gap-4">
        <StreamInterface />
      </div>
    </div>
  )
}
