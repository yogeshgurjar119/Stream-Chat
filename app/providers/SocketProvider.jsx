'use client'
import { createContext, useContext } from 'react'
import { io } from 'socket.io-client'

const socket = io('', { path: '/api/socket' })
const SocketContext = createContext(socket)

export const useSocket = () => useContext(SocketContext)

export default function SocketProvider({ children }) {
  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
}
