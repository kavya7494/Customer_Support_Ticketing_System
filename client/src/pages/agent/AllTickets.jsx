import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ticketService } from '../../services/ticketService'
import { UrgencyBadge, StatusBadge, EmptyState, Skeleton, timeAgo } from '../../components/ui'
import { Ticket, Search, ArrowRight, Filter, SortAsc, RefreshCw } from 'lucide-react'

const STATUS_OPTS = ['All', 'Open', 'In Progress', 'Pending', 'Resolved', 'Closed']
const URGENCY_OPTS = ['All', 'Critical', 'High', 'Medium', 'Low']
const SORT_OPTS = [
  { value: '-createdAt', label: 'Newest First' },
  { value: 'createdAt', label: 'Oldest First' },
  { value: '-priorityScore', label: 'Highest Priority' },
  { value: 'slaDeadline', label: 'SLA Soonest' },
]

export default function AllTickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [urgency, setUrgency] = useState('All')
  const [sort, setSort] = useState('-createdAt')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const params = { page, limit: 15, sort, search }
      if (status !== 'All') params.status = status
      if (urgency !== 'All') params.urgency = urgency
      const { data } = await ticketService.getTickets(params)
      // Server returns: { success: true, data: { tickets: [...], pagination: { ... } } }
      const ticketList = data.data?.tickets || (Array.isArray(data.data) ? data.data : [])
      const pagination = data.data?.pagination || data.pagination || {}
      setTickets(ticketList)
      setTotalPages(pagination.pages || 1)
      setTotal(pagination.total || ticketList.length)
    } catch (err) {
      console.error('Error fetching all tickets:', err)
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTickets() }, [status, urgency, sort, search, page])

  const handleReset = () => {
    setSearch(''); setStatus('All'); setUrgency('All'); setSort('-createdAt'); setPage(1)
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total tickets</p>
        </div>
        <button onClick={fetchTickets} className="btn-secondary">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by subject, ticket number, client..."
              className="input pl-8 py-1.5 text-sm"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <button onClick={handleReset} className="btn-secondary py-1.5 text-xs">Reset</button>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {/* Status */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={13} className="text-gray-400" />
            {STATUS_OPTS.map(s => (
              <button key={s} onClick={() => { setStatus(s); setPage(1) }}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${status === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-gray-200 hidden sm:block" />

          {/* Urgency */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {URGENCY_OPTS.map(u => (
              <button key={u} onClick={() => { setUrgency(u); setPage(1) }}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${urgency === u ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {u}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5 ml-auto">
            <SortAsc size={13} className="text-gray-400" />
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
              {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState icon={Ticket} title="No tickets found" description="Try adjusting your filters" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dept</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Updated</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tickets.map(ticket => (
                    <tr key={ticket._id} className={`hover:bg-gray-50 transition-colors ticket-row ${ticket.escalated ? 'bg-red-50/30' : ''}`}>
                      <td className="px-5 py-3">
                        <span className="text-xs font-mono text-gray-400">{ticket.ticketNumber}</span>
                        {ticket.escalated && <div className="text-xs text-red-600 font-semibold">🚨 Escalated</div>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 max-w-xs truncate">{ticket.subject}</p>
                        {ticket.concern && <p className="text-xs text-gray-400">{ticket.concern}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{ticket.client?.name || '—'}</td>
                      <td className="px-4 py-3"><UrgencyBadge urgency={ticket.urgency} /></td>
                      <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{ticket.department || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{ticket.assignedAgent?.name || <span className="text-orange-500">Unassigned</span>}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{timeAgo(ticket.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <Link to={`/agent/tickets/${ticket._id}`} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors inline-flex">
                          <ArrowRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Previous</button>
                  <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
