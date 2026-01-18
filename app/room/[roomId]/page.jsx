'use client'
import RoomPage from '../../ui/Room'

export default function RoomRoute({ params }) {
  return <RoomPage roomId={params.roomId} />
}
