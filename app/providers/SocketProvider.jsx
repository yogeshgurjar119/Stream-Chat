'use client'
import { createContext, useContext } from 'react'
import { io } from 'socket.io-client'

const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? ''
const socketPath = process.env.NEXT_PUBLIC_SOCKET_PATH ?? '/api/socket'
const socket = io(socketUrl, { path: socketPath })
const SocketContext = createContext(socket)

export const useSocket = () => useContext(SocketContext)

export default function SocketProvider({ children }) {
  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
}
