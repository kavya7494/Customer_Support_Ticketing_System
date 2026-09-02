import { useState, useEffect } from 'react'
import { ticketService } from '../../services/ticketService'
import { Skeleton } from '../../components/ui'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts'
import { BarChart3, TrendingUp, Clock, CheckCircle } from 'lucide-react'

const URGENCY_COLORS = { Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#22c55e' }
const STATUS_COLORS = { Open: '#3b82f6', 'In Progress': '#8b5cf6', 'Waiting for Customer': '#f59e0b', Pending: '#f59e0b', Resolved: '#22c55e', Closed: '#6b7280' }

function CustomTooltip({ active, payload, label }) {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2">
        {label && <p className="text-xs text-gray-500 mb-1">{label}</p>}
        {payload.map((p, i) => (
          <p key={i} className="text-sm font-semibold" style={{ color: p.color || p.fill }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ticketService.getAnalytics()
      .then(r => setData(r.data?.data || {}))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="p-6 space-y-5">
      <Skeleton className="h-8 w-48 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </div>
    </div>
  )

  if (!data) return <div className="p-6 text-center text-gray-500">No analytics data available</div>

  // Transform aggregations from server:
  // ticketsByUrgency: [{ _id: 'Critical', count: 2 }, ...]
  const urgencyData = (data.ticketsByUrgency || []).map(u => ({ name: u._id || 'Unknown', value: u.count }))
  // ticketsByStatus: [{ _id: 'Open', count: 4 }, ...]
  const statusData = (data.ticketsByStatus || []).map(s => ({ name: s._id || 'Unknown', value: s.count }))
  // ticketsByDepartment: [{ _id: 'Technical Support', count: 3 }, ...]
  const deptData = (data.ticketsByDepartment || []).map(d => ({ dept: d._id || 'General', tickets: d.count }))
  // ticketsOverTime: [{ _id: '2026-09-02', count: 6 }, ...]
  const timelineData = (data.ticketsOverTime || []).map(d => ({ date: d._id, tickets: d.count }))

  // Calculate total tickets from statuses
  const totalTickets = statusData.reduce((acc, s) => acc + s.value, 0)

  const kpiCards = [
    { label: 'Total Tickets', value: totalTickets, icon: BarChart3, color: 'text-blue-600 bg-blue-50' },
    { label: 'SLA Compliance', value: `${data.slaComplianceRate ?? 0}%`, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
    { label: 'Avg Response Time', value: data.avgResponseTimeMinutes ? `${Math.round(data.avgResponseTimeMinutes)}m` : '—', icon: Clock, color: 'text-orange-600 bg-orange-50' },
    { label: 'Avg Resolution Time', value: data.avgResolutionTimeHours ? `${data.avgResolutionTimeHours}h` : '—', icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
  ]

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Performance metrics and ticket trends</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Urgency pie */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Tickets by Priority</h2>
          {urgencyData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={urgencyData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {urgencyData.map((entry) => (
                    <Cell key={entry.name} fill={URGENCY_COLORS[entry.name] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status pie */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Tickets by Status</h2>
          {statusData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Department bar */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Tickets by Department</h2>
          {deptData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="tickets" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Timeline line */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Ticket Volume (Last 7 Days)</h2>
          {timelineData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No timeline data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={timelineData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="tickets" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
