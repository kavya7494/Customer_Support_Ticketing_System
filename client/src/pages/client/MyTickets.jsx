import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ticketService } from '../../services/ticketService'
import { UrgencyBadge, StatusBadge, EmptyState, Skeleton, timeAgo } from '../../components/ui'
import { Ticket, Search, Plus, ArrowRight } from 'lucide-react'

const STATUS_TABS = ['All', 'Open', 'In Progress', 'Pending', 'Resolved', 'Closed']

export default function MyTickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const params = { page, limit: 10, search }
      if (activeTab !== 'All') params.status = activeTab
      const { data } = await ticketService.getTickets(params)
      // Server returns: { success: true, data: { tickets: [...], pagination: { ... } } }
      const ticketList = data.data?.tickets || (Array.isArray(data.data) ? data.data : [])
      const pagination = data.data?.pagination || data.pagination || {}
      setTickets(ticketList)
      setTotalPages(pagination.pages || 1)
    } catch (err) {
      console.error('Error fetching tickets:', err)
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTickets() }, [activeTab, search, page])

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage your support requests</p>
        </div>
        <Link to="/client/create" className="btn-primary">
          <Plus size={16} /> New Ticket
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              className="input pl-8 py-1.5 text-sm"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setPage(1) }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="No tickets found"
            description={search ? `No results for "${search}"` : "You haven't submitted any tickets yet."}
            action={<Link to="/client/create" className="btn-primary">Create a Ticket</Link>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ticket</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Updated</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tickets.map(ticket => (
                    <tr key={ticket._id} className="hover:bg-gray-50 transition-colors ticket-row">
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-mono text-gray-400">{ticket.ticketNumber}</span>
                        <p className="text-sm font-medium text-gray-900 mt-0.5 max-w-xs truncate">{ticket.subject}</p>
                      </td>
                      <td className="px-4 py-3.5"><UrgencyBadge urgency={ticket.urgency} /></td>
                      <td className="px-4 py-3.5"><StatusBadge status={ticket.status} /></td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">{ticket.department || '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-400">{timeAgo(ticket.updatedAt)}</td>
                      <td className="px-4 py-3.5">
                        <Link to={`/client/tickets/${ticket._id}`} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors inline-flex">
                          <ArrowRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 px-5 py-3 border-t border-gray-100">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Previous</button>
                <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
