import { useState, useRef, useEffect } from 'react'
import { ticketService } from '../services/ticketService'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, X, Send, Bot, Minimize2, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const WELCOME_MSG = {
  role: 'bot',
  text: "👋 Hi! I'm the SupportDesk assistant. I can help you with common questions or create a support ticket for you. What can I help you with?",
  options: [
    'Track my ticket status',
    'Billing question',
    'Technical issue',
    'Create a new ticket',
    'Something else',
  ]
}

export default function Chatbot() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState([WELCOME_MSG])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => `chat-${Date.now()}`)
  const bottomRef = useRef(null)

  // Only show for clients
  if (!user || user.role !== 'client') return null

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const { data } = await ticketService.sendChatMessage({
        message: text,
        sessionId,
        context: { previousMessages: messages.slice(-4).map(m => ({ role: m.role, message: m.text })) }
      })

      const resp = data.data
      const botMsg = {
        role: 'bot',
        text: resp.message,
        options: resp.options || [],
        ticketCreated: resp.ticketCreated || false,
        ticketId: resp.ticketId || null,
        ticketNumber: resp.ticketNumber || null,
      }
      setMessages(prev => [...prev, botMsg])

      if (resp.ticketCreated && resp.ticketId) {
        toast.success(`Ticket ${resp.ticketNumber} created!`)
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: 'Sorry, I had trouble processing that. Please try again or create a ticket directly.',
        options: ['Create a new ticket']
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleOption = (option) => {
    if (option === 'Create a new ticket') {
      setOpen(false)
      navigate('/client/create')
      return
    }
    if (option === 'Track my ticket status') {
      setOpen(false)
      navigate('/client/tickets')
      return
    }
    sendMessage(option)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <>
      {/* Chat window */}
      {open && (
        <div className={`fixed bottom-20 right-5 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-50 transition-all ${minimized ? 'h-12' : 'h-[460px]'}`}>
          {/* Header */}
          <div className="bg-blue-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                <Bot size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-none">Support Assistant</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="live-dot w-1.5 h-1.5" />
                  <span className="text-xs text-blue-100">Online</span>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setMinimized(v => !v)} className="text-white/70 hover:text-white p-1 rounded transition-colors">
                <Minimize2 size={14} />
              </button>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white p-1 rounded transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                {messages.map((msg, i) => (
                  <div key={i}>
                    <div className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      {msg.role === 'bot' && (
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Bot size={12} className="text-blue-600" />
                        </div>
                      )}
                      <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-sm'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                      }`}>
                        {msg.text}
                        {msg.ticketCreated && msg.ticketNumber && (
                          <div className="mt-1.5 flex items-center gap-1 text-xs text-green-600 font-medium">
                            ✓ Ticket {msg.ticketNumber} created
                            <button onClick={() => { setOpen(false); navigate(`/client/tickets/${msg.ticketId}`) }}
                              className="hover:underline flex items-center gap-0.5">
                              View <ExternalLink size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick option buttons */}
                    {msg.role === 'bot' && msg.options?.length > 0 && (
                      <div className="ml-8 mt-1.5 flex flex-wrap gap-1.5">
                        {msg.options.map(opt => (
                          <button
                            key={opt}
                            onClick={() => handleOption(opt)}
                            className="px-2.5 py-1 text-xs bg-white border border-blue-200 text-blue-600 rounded-full hover:bg-blue-50 transition-colors font-medium"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <Bot size={12} className="text-blue-600" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl rounded-tl-sm px-3 py-2">
                      <div className="flex gap-1">
                        {[0, 150, 300].map(delay => (
                          <div key={delay} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="flex gap-2 p-3 bg-white border-t border-gray-100">
                <input
                  type="text"
                  className="input flex-1 py-1.5 text-sm"
                  placeholder="Type a message..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  disabled={loading}
                />
                <button type="submit" disabled={loading || !input.trim()} className="btn-primary p-2 disabled:opacity-50">
                  <Send size={14} />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => { setOpen(v => !v); setMinimized(false) }}
        className="fixed bottom-5 right-5 w-13 h-13 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 z-50 p-3.5"
        title="Chat Support"
      >
        {open ? <X size={20} /> : <MessageSquare size={20} />}
      </button>
    </>
  )
}
