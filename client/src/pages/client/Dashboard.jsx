import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ticketService } from '../../services/ticketService'
import { useSocket } from '../../context/SocketContext'
import { StatCard, UrgencyBadge, StatusBadge, Skeleton, EmptyState, timeAgo } from '../../components/ui'
import { Ticket, CheckCircle, AlertCircle, Plus, ArrowRight, Activity, Inbox } from 'lucide-react'

export default function ClientDashboard() {
  const [stats, setStats] = useState(null)
  const [recentTickets, setRecentTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const { connected } = useSocket()

  const fetchDashboard = async () => {
    try {
      const { data } = await ticketService.getClientDashboard()
      // Server returns: { success, data: { stats: { total, open, inProgress, resolved, closed }, recentTickets } }
      const payload = data.data || {}
      setStats(payload.stats || {})
      setRecentTickets(payload.recentTickets || [])
    } catch (err) {
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDashboard() }, [])

  if (loading) return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )

  const s = stats || {}

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{color:'#111827'}}>My Dashboard</h1>
          <div style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'2px'}}>
            <span className={`live-dot ${!connected ? 'bg-gray-400' : ''}`} />
            <span style={{fontSize:'12px',color:'#6b7280'}}>{connected ? 'Real-time updates active' : 'Offline'}</span>
          </div>
        </div>
        <Link to="/client/create" className="btn-primary">
          <Plus size={16} /> New Ticket
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Tickets" value={s.total ?? 0} icon={Ticket} color="blue" />
        <StatCard label="Open" value={s.open ?? 0} icon={AlertCircle} color="orange" />
        <StatCard label="In Progress" value={s.inProgress ?? 0} icon={Activity} color="purple" />
        <StatCard label="Resolved" value={s.resolved ?? 0} icon={CheckCircle} color="green" />
      </div>

      {/* Recent tickets */}
      <div className="card">
        <div style={{padding:'16px 20px',borderBottom:'1px solid #f3f4f6',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h2 style={{fontWeight:'600',color:'#111827'}}>Recent Tickets</h2>
          <Link to="/client/tickets" style={{fontSize:'14px',color:'#2563eb',display:'flex',alignItems:'center',gap:'4px',textDecoration:'none'}}>
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {recentTickets.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No tickets yet"
            description="Create your first support ticket and we'll get back to you shortly."
            action={<Link to="/client/create" className="btn-primary">Create a Ticket</Link>}
          />
        ) : (
          <div style={{divide:''}}>
            {recentTickets.map(ticket => (
              <Link
                key={ticket._id}
                to={`/client/tickets/${ticket._id}`}
                style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid #f9fafb',textDecoration:'none'}}
                className="ticket-row"
              >
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'2px'}}>
                    <span style={{fontSize:'12px',color:'#9ca3af',fontFamily:'monospace'}}>{ticket.ticketNumber}</span>
                    <UrgencyBadge urgency={ticket.urgency} />
                  </div>
                  <p style={{fontSize:'14px',fontWeight:'500',color:'#111827',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ticket.subject}</p>
                  <p style={{fontSize:'12px',color:'#9ca3af',marginTop:'2px'}}>{timeAgo(ticket.updatedAt)}</p>
                </div>
                <div style={{marginLeft:'12px',display:'flex',alignItems:'center',gap:'12px',flexShrink:0}}>
                  <StatusBadge status={ticket.status} />
                  <ArrowRight size={14} style={{color:'#d1d5db'}} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
