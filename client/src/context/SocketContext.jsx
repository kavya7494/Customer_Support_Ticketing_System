import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { user, token } = useAuth()
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)

  useEffect(() => {
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setConnected(false)
      }
      return
    }

    const socket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      // Join user-specific room
      socket.emit('join', { userId: user._id, role: user.role })
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('connect_error', () => {
      setConnected(false)
    })

    // Global notifications
    socket.on('notification', (data) => {
      const { type, message } = data
      if (type === 'ticket-assigned') {
        toast.success(message, { icon: '🎫' })
      } else if (type === 'sla-warning') {
        toast.error(message, { icon: '⚠️', duration: 8000 })
      } else if (type === 'new-message') {
        toast(message, { icon: '💬' })
      } else if (type === 'status-changed') {
        toast(message, { icon: '🔄' })
      } else if (type === 'escalated') {
        toast.error(message, { icon: '🚨', duration: 8000 })
      } else {
        toast(message)
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [user, token])

  const getSocket = () => socketRef.current

  return (
    <SocketContext.Provider value={{ connected, getSocket }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used within SocketProvider')
  return ctx
}
