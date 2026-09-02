import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ticketService } from '../../services/ticketService'
import { useSocket } from '../../context/SocketContext'
import { StatCard, UrgencyBadge, StatusBadge, Skeleton, EmptyState, timeAgo } from '../../components/ui'
import { Ticket, Clock, CheckCircle, AlertTriangle, Activity, TrendingUp, ArrowRight, Zap, Inbox } from 'lucide-react'

export default function AgentDashboard() {
  const [stats, setStats] = useState({})
  const [recentTickets, setRecentTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const { connected } = useSocket()

  const fetchDashboard = async () => {
    try {
      const { data } = await ticketService.getAgentDashboard()
      // Server returns: { success, data: { stats: { totalOpen, myTickets, criticalTickets, ... }, recentTickets } }
      const payload = data.data || {}
      setStats(payload.stats || {})
      setRecentTickets(payload.recentTickets || [])
    } catch (err) {
      console.error('Agent dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDashboard() }, [])

  if (loading) return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )

  const s = stats || {}

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{color:'#111827'}}>Agent Dashboard</h1>
          <div style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'2px'}}>
            <span className={`live-dot ${!connected ? 'bg-gray-400' : ''}`} />
            <span style={{fontSize:'12px',color:'#6b7280'}}>{connected ? 'Real-time updates active' : 'Offline'}</span>
          </div>
        </div>
        <Link to="/agent/tickets" className="btn-primary">
          <Ticket size={16} /> View All Tickets
        </Link>
      </div>

      {/* KPI cards — server uses: totalOpen, myTickets, criticalTickets, highTickets, slaAtRisk, slaBreached, resolvedToday */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Assigned to Me" value={s.myTickets ?? 0} icon={Ticket} color="blue" />
        <StatCard label="Total Open" value={s.totalOpen ?? 0} icon={AlertTriangle} color="orange" />
        <StatCard label="Critical" value={s.criticalTickets ?? 0} icon={Zap} color="red" />
        <StatCard label="SLA Breached" value={s.slaBreached ?? 0} icon={Clock} color="red" sub="Escalated tickets" />
        <StatCard label="High Priority" value={s.highTickets ?? 0} icon={Activity} color="purple" />
        <StatCard label="Resolved Today" value={s.resolvedToday ?? 0} icon={CheckCircle} color="green" />
        <StatCard label="SLA At Risk" value={s.slaAtRisk ?? 0} icon={TrendingUp} color="yellow" sub="< 30 min remaining" />
        <StatCard label="Total Active" value={(s.totalOpen ?? 0)} icon={Inbox} color="gray" />
      </div>

      {/* Recent tickets table */}
      <div className="card">
        <div style={{padding:'16px 20px',borderBottom:'1px solid #f3f4f6',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h2 style={{fontWeight:'600',color:'#111827'}}>Active Tickets</h2>
          <Link to="/agent/tickets" style={{fontSize:'14px',color:'#2563eb',display:'flex',alignItems:'center',gap:'4px',textDecoration:'none'}}>
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {recentTickets.length === 0 ? (
          <EmptyState icon={Ticket} title="No active tickets" description="All caught up! 🎉" />
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead style={{backgroundColor:'#f9fafb',borderBottom:'1px solid #f3f4f6'}}>
                <tr>
                  {['Ticket','Client','Priority','Status','Dept','Updated',''].map(h => (
                    <th key={h} style={{textAlign:'left',padding:'12px 16px',fontSize:'11px',fontWeight:'600',color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTickets.map(ticket => (
                  <tr key={ticket._id} style={{borderBottom:'1px solid #f9fafb'}} className="ticket-row">
                    <td style={{padding:'14px 16px'}}>
                      <span style={{fontSize:'11px',fontFamily:'monospace',color:'#9ca3af'}}>{ticket.ticketNumber}</span>
                      {ticket.escalated && <div style={{fontSize:'11px',color:'#dc2626',fontWeight:'600'}}>🚨 Escalated</div>}
                      <p style={{fontSize:'13px',fontWeight:'500',color:'#111827',marginTop:'2px',maxWidth:'220px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ticket.subject}</p>
                    </td>
                    <td style={{padding:'14px 16px',fontSize:'13px',color:'#374151'}}>{ticket.client?.name || '—'}</td>
                    <td style={{padding:'14px 16px'}}><UrgencyBadge urgency={ticket.urgency} /></td>
                    <td style={{padding:'14px 16px'}}><StatusBadge status={ticket.status} /></td>
                    <td style={{padding:'14px 16px',fontSize:'12px',color:'#6b7280'}}>{ticket.department || '—'}</td>
                    <td style={{padding:'14px 16px',fontSize:'12px',color:'#9ca3af'}}>{timeAgo(ticket.updatedAt)}</td>
                    <td style={{padding:'14px 16px'}}>
                      <Link to={`/agent/tickets/${ticket._id}`} style={{display:'inline-flex',padding:'6px',borderRadius:'6px',color:'#9ca3af',textDecoration:'none'}} className="ticket-row">
                        <ArrowRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
