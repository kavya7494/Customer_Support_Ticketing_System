import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ticketService } from '../../services/ticketService'
import { useSocket } from '../../context/SocketContext'
import { UrgencyBadge, StatusBadge, SLABadge, formatDate, timeAgo } from '../../components/ui'
import { ArrowLeft, Send, Paperclip, Clock, User, X, Download } from 'lucide-react'
import toast from 'react-hot-toast'

function SLACountdown({ deadline }) {
  const [countdown, setCountdown] = useState('')
  useEffect(() => {
    if (!deadline) return
    const tick = () => {
      const diff = new Date(deadline) - Date.now()
      if (diff <= 0) { setCountdown('Breached'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${h}h ${m}m ${s}s`)
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [deadline])

  if (!deadline) return null
  const isBreached = countdown === 'Breached' || new Date(deadline) < Date.now()
  return (
    <span className={`font-mono text-sm font-semibold ${isBreached ? 'text-red-600' : 'text-gray-700'}`}>
      {countdown}
    </span>
  )
}

export default function ClientTicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getSocket } = useSocket()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState([])
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const fetchTicket = useCallback(async () => {
    try {
      const { data } = await ticketService.getTicketById(id)
      // Server returns: { success: true, data: { ticket: { ... }, slaStatus: { status: 'on-track', ... } } }
      const ticketObj = data.data?.ticket || data.data
      if (ticketObj) {
        if (data.data?.slaStatus) {
          ticketObj.slaStatus = typeof data.data.slaStatus === 'object' ? data.data.slaStatus.status : data.data.slaStatus
        }
        setTicket(ticketObj)
      }
    } catch {
      toast.error('Ticket not found')
      navigate('/client/tickets')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    fetchTicket()
    const socket = getSocket()
    if (socket) {
      socket.emit('join-ticket', id)
      socket.on('ticket-updated', fetchTicket)
      socket.on('new-message', fetchTicket)
      return () => {
        socket.off('ticket-updated', fetchTicket)
        socket.off('new-message', fetchTicket)
        socket.emit('leave-ticket', id)
      }
    }
  }, [id, getSocket, fetchTicket])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket?.messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!message.trim() && files.length === 0) return
    setSending(true)
    try {
      const fd = new FormData()
      fd.append('message', message)
      files.forEach(f => fd.append('attachments', f))
      await ticketService.addMessage(id, fd)
      setMessage('')
      setFiles([])
      await fetchTicket()
      toast.success('Message sent')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!ticket) return null

  const isResolved = ['Resolved', 'Closed'].includes(ticket.status)
  const publicMessages = (ticket.messages || []).filter(m => !m.isInternal)
  const agentName = ticket.assignedAgent?.name || (typeof ticket.assignedAgent === 'string' ? ticket.assignedAgent : 'Unassigned')

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/client/tickets')} className="text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-mono text-gray-400">{ticket.ticketNumber}</span>
                <UrgencyBadge urgency={ticket.urgency} />
                <StatusBadge status={ticket.status} />
              </div>
              <h1 className="text-lg font-bold text-gray-900">{ticket.subject}</h1>
            </div>
          </div>

          {/* SLA info */}
          {ticket.slaDeadline && (
            <div className="text-right">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-0.5">
                <Clock size={12} />
                <span>SLA Deadline</span>
              </div>
              <SLACountdown deadline={ticket.slaDeadline} />
              {ticket.slaStatus && <div className="mt-1"><SLABadge status={ticket.slaStatus} /></div>}
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500 ml-9">
          <span className="flex items-center gap-1">
            <User size={12} />
            Agent: <strong className="ml-1 text-gray-700">{agentName}</strong>
          </span>
          <span>Department: <strong className="text-gray-700">{ticket.department || '—'}</strong></span>
          <span>Created: <strong className="text-gray-700">{formatDate(ticket.createdAt)}</strong></span>
          {ticket.tags && ticket.tags.length > 0 && (
            <div className="flex gap-1">
              {ticket.tags.map(tag => (
                <span key={tag} className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {publicMessages.map((msg, i) => {
          const isClient = msg.senderRole === 'client'
          const sName = typeof msg.senderName === 'string' ? msg.senderName : (msg.sender?.name || 'System')
          return (
            <div key={i} className={`flex gap-3 ${isClient ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                isClient ? 'bg-blue-100 text-blue-700' :
                msg.senderRole === 'system' ? 'bg-gray-100 text-gray-500' :
                'bg-green-100 text-green-700'
              }`}>
                {msg.senderRole === 'system' ? '🤖' : (sName[0] || '?')}
              </div>
              <div className={`max-w-lg ${isClient ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`flex items-center gap-2 mb-1 ${isClient ? 'flex-row-reverse' : ''}`}>
                  <span className="text-xs font-medium text-gray-700">{sName}</span>
                  <span className="text-xs text-gray-400">{timeAgo(msg.createdAt)}</span>
                </div>
                <div className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                  isClient ? 'bg-blue-600 text-white rounded-tr-sm' :
                  msg.senderRole === 'system' ? 'bg-gray-100 text-gray-600 italic' :
                  'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                }`}>
                  {String(msg.message || '')}
                </div>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {msg.attachments.map((att, j) => (
                      <a key={j} href={`http://localhost:5000/uploads/${att.filename}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-blue-600 hover:bg-blue-50 transition-colors">
                        <Download size={12} />
                        {att.originalName || att.filename}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      {!isResolved ? (
        <div className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0">
          <form onSubmit={handleSend} className="space-y-3">
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                    <Paperclip size={11} /> {f.name}
                    <button type="button" onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} className="hover:text-red-500"><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  className="input resize-none pr-10"
                  placeholder="Write a reply..."
                  rows={2}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <label className="btn-secondary cursor-pointer p-2.5">
                  <Paperclip size={16} />
                  <input type="file" multiple className="hidden" onChange={e => setFiles(fs => [...fs, ...Array.from(e.target.files)].slice(0, 5))} />
                </label>
                <button type="submit" disabled={sending || (!message.trim() && files.length === 0)} className="btn-primary p-2.5">
                  {sending ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400">Press Enter to send, Shift+Enter for new line</p>
          </form>
        </div>
      ) : (
        <div className="bg-green-50 border-t border-green-100 px-6 py-3 text-center text-sm text-green-700 font-medium">
          ✓ This ticket has been {ticket.status?.toLowerCase() || 'resolved'}. <Link to="/client/create" className="underline">Open a new ticket</Link> if you need further assistance.
        </div>
      )}
    </div>
  )
}
