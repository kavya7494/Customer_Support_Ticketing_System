import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ticketService } from '../../services/ticketService'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import { UrgencyBadge, StatusBadge, SLABadge, formatDate, timeAgo } from '../../components/ui'
import {
  ArrowLeft, Send, Paperclip, Clock, User, X, Download, RefreshCw,
  Lock, ChevronDown, Sparkles, MessageSquare
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = ['Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed']

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
      setCountdown(`${h}h ${m}m ${s}s remaining`)
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [deadline])
  if (!deadline || !countdown) return null
  const isBreached = countdown === 'Breached'
  return <span className={`font-mono text-xs ${isBreached ? 'text-red-600 font-bold' : 'text-gray-700'}`}>{countdown}</span>
}

export default function AgentTicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getSocket } = useSocket()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [files, setFiles] = useState([])
  const [sending, setSending] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [suggestion, setSuggestion] = useState('')
  const [loadingSuggestion, setLoadingSuggestion] = useState(false)
  const [agents, setAgents] = useState([])
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
      navigate('/agent/tickets')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    fetchTicket()
    ticketService.getAgents()
      .then(r => {
        const agentList = r.data.data?.agents || (Array.isArray(r.data.data) ? r.data.data : [])
        setAgents(agentList)
      })
      .catch(() => {})

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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [ticket?.messages, ticket?.internalNotes])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!message.trim() && files.length === 0) return
    setSending(true)
    try {
      const fd = new FormData()
      fd.append('message', message)
      fd.append('isInternal', isInternal)
      files.forEach(f => fd.append('attachments', f))
      await ticketService.addMessage(id, fd)
      setMessage(''); setFiles([])
      await fetchTicket()
      toast.success(isInternal ? 'Internal note added' : 'Reply sent')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    setStatusUpdating(true)
    try {
      await ticketService.updateStatus(id, newStatus)
      await fetchTicket()
      toast.success(`Status changed to ${newStatus}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleAssign = async (agentId) => {
    try {
      await ticketService.assignTicket(id, agentId)
      await fetchTicket()
      toast.success('Ticket assigned')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign')
    }
  }

  const handleSuggestReply = async () => {
    setLoadingSuggestion(true)
    setSuggestion('')
    try {
      const { data } = await ticketService.suggestReply(id)
      const text = data.data?.suggestion || ''
      setSuggestion(text)
      setMessage(text)
      toast.success('AI reply suggestion applied')
    } catch {
      toast.error('Could not generate suggestion')
    } finally {
      setLoadingSuggestion(false)
    }
  }

  const handleRetriage = async () => {
    try {
      await ticketService.retriage(id)
      await fetchTicket()
      toast.success('Ticket re-triaged successfully')
    } catch {
      toast.error('Re-triage failed')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!ticket) return null

  // Combine messages & internalNotes chronologically for full timeline in agent view
  const allMessages = [
    ...(ticket.messages || []),
    ...(ticket.internalNotes || []).map(n => ({ ...n, isInternal: true }))
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  const clientName = ticket.client?.name || (typeof ticket.client === 'string' ? ticket.client : 'Client')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Main column: conversation */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-5 py-3.5 flex-shrink-0">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/agent/tickets')} className="text-gray-400 hover:text-gray-600 mt-0.5">
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="text-xs font-mono text-gray-400">{ticket.ticketNumber}</span>
                <UrgencyBadge urgency={ticket.urgency} />
                <StatusBadge status={ticket.status} />
                {ticket.escalated && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                    🚨 Escalated
                  </span>
                )}
              </div>
              <h1 className="text-base font-bold text-gray-900 truncate">{ticket.subject}</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {clientName} · {ticket.concern || ticket.department} · {formatDate(ticket.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {allMessages.map((msg, i) => {
            const isAgent = msg.senderRole === 'agent'
            const isSystem = msg.senderRole === 'system'
            const internal = msg.isInternal
            const sName = typeof msg.senderName === 'string' ? msg.senderName : (msg.sender?.name || 'System')
            return (
              <div key={i} className={`flex gap-3 ${isAgent ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isSystem ? 'bg-gray-100 text-gray-500' :
                  isAgent ? 'bg-blue-600 text-white' :
                  'bg-green-100 text-green-700'
                }`}>
                  {isSystem ? '🤖' : (sName[0] || '?')}
                </div>
                <div className={`max-w-lg flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isAgent ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs font-medium text-gray-700">{sName}</span>
                    {internal && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded font-medium flex items-center gap-0.5"><Lock size={10} /> Internal</span>}
                    <span className="text-xs text-gray-400">{timeAgo(msg.createdAt)}</span>
                  </div>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                    isSystem ? 'bg-gray-100 text-gray-600 italic text-xs rounded-lg' :
                    internal ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-lg' :
                    isAgent ? 'bg-blue-600 text-white rounded-tr-sm' :
                    'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                  }`}>
                    {String(msg.message || '')}
                  </div>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {msg.attachments.map((att, j) => (
                        <a key={j} href={`http://localhost:5000/uploads/${att.filename}`} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-blue-600 hover:bg-blue-50">
                          <Download size={12} /> {att.originalName || att.filename}
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

        {/* Reply area */}
        <div className="bg-white border-t border-gray-200 px-5 py-4 flex-shrink-0">
          {/* Toggle: reply vs internal note */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setIsInternal(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${!isInternal ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <MessageSquare size={13} /> Reply to Client
            </button>
            <button
              onClick={() => setIsInternal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${isInternal ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <Lock size={13} /> Internal Note
            </button>
            <button
              onClick={handleSuggestReply}
              disabled={loadingSuggestion}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors ml-auto disabled:opacity-60"
            >
              {loadingSuggestion
                ? <span className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                : <Sparkles size={13} />}
              AI Suggest
            </button>
          </div>

          <form onSubmit={handleSend} className="space-y-2">
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {files.map((f, i) => (
                  <span key={i} className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                    <Paperclip size={10} /> {f.name}
                    <button type="button" onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} className="hover:text-red-500"><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-end">
              <textarea
                className={`input resize-none flex-1 ${isInternal ? 'bg-amber-50 border-amber-200 focus:ring-amber-400' : ''}`}
                placeholder={isInternal ? 'Write an internal note (only agents can see this)...' : 'Write a reply to the client...'}
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) }
                }}
              />
              <div className="flex flex-col gap-1.5">
                <label className="btn-secondary cursor-pointer p-2.5">
                  <Paperclip size={15} />
                  <input type="file" multiple className="hidden" onChange={e => setFiles(fs => [...fs, ...Array.from(e.target.files)].slice(0, 5))} />
                </label>
                <button type="submit" disabled={sending || (!message.trim() && files.length === 0)}
                  className={`p-2.5 rounded-lg font-medium transition-colors ${isInternal ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'btn-primary'} disabled:opacity-40`}>
                  {sending
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                    : <Send size={15} />}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Right panel: ticket details */}
      <div className="w-72 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0">
        <div className="p-4 space-y-5">
          {/* SLA */}
          {ticket.slaDeadline && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">SLA Status</p>
              <div className="p-3 bg-gray-50 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Clock size={11} /> Deadline</span>
                  {ticket.slaStatus && <SLABadge status={ticket.slaStatus} />}
                </div>
                <SLACountdown deadline={ticket.slaDeadline} />
                <p className="text-xs text-gray-400">{formatDate(ticket.slaDeadline)}</p>
              </div>
            </div>
          )}

          {/* Status change */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Change Status</p>
            <div className="space-y-1">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  disabled={ticket.status === s || statusUpdating}
                  onClick={() => handleStatusChange(s)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                    ticket.status === s
                      ? 'bg-blue-600 text-white font-medium cursor-default'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } disabled:opacity-50`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Assign agent */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assigned Agent</p>
            <div className="relative">
              <select
                value={ticket.assignedAgent?._id || (typeof ticket.assignedAgent === 'string' ? ticket.assignedAgent : '')}
                onChange={e => handleAssign(e.target.value)}
                className="input text-sm appearance-none pr-7"
              >
                <option value="">— Unassigned —</option>
                {agents.map(a => (
                  <option key={a._id} value={a._id}>{a.name} ({a.department})</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Ticket info */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ticket Info</p>
            <div className="space-y-2 text-xs">
              {[
                ['Client', clientName],
                ['Email', ticket.client?.email],
                ['Department', ticket.department],
                ['Category', ticket.concern],
                ['Score', ticket.priorityScore],
                ['Created', formatDate(ticket.createdAt)],
                ['Updated', formatDate(ticket.updatedAt)],
              ].map(([k, v]) => v && (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-gray-400">{k}</span>
                  <span className="text-gray-700 font-medium text-right truncate">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          {ticket.tags && ticket.tags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {ticket.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Actions</p>
            <div className="space-y-1.5">
              <button onClick={handleRetriage} className="btn-secondary w-full text-xs py-1.5">
                <RefreshCw size={13} /> Re-triage Ticket
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
