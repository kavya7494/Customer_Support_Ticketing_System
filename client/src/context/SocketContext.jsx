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
      // Join user-specific room and agent room if applicable
      socket.emit('join', { userId: user._id, role: user.role })
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('connect_error', () => {
      setConnected(false)
    })

    // Direct event listeners from notificationService
    socket.on('ticket-assigned', (data) => {
      const tNum = data.ticket?.ticketNumber ? ` #${data.ticket.ticketNumber}` : ''
      toast.success(`Ticket${tNum} assigned to you!`, { icon: '🎫' })
    })

    socket.on('sla-warning', (data) => {
      const tNum = data.ticket?.ticketNumber ? ` #${data.ticket.ticketNumber}` : ''
      toast.error(`⚠️ SLA Warning: Ticket${tNum} is approaching deadline!`, { icon: '⚠️', duration: 8000 })
    })

    socket.on('ticket-escalated', (data) => {
      const tNum = data.ticket?.ticketNumber ? ` #${data.ticket.ticketNumber}` : ''
      toast.error(`🚨 SLA Breached: Ticket${tNum} has been escalated!`, { icon: '🚨', duration: 8000 })
    })

    socket.on('ticket-resolved', (data) => {
      const tNum = data.ticket?.ticketNumber ? ` #${data.ticket.ticketNumber}` : ''
      toast.success(`Ticket${tNum} marked as resolved!`, { icon: '✅' })
    })

    // Generic notification
    socket.on('notification', (data) => {
      if (data.message) toast(data.message)
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
