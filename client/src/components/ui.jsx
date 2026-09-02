// Urgency badge
export function UrgencyBadge({ urgency }) {
  const urgencyStr = typeof urgency === 'string' ? urgency : (urgency?.urgency || 'Low')
  const map = {
    Critical: 'badge-critical',
    High: 'badge-high',
    Medium: 'badge-medium',
    Low: 'badge-low',
  }
  return <span className={map[urgencyStr] || 'badge-low'}>{urgencyStr}</span>
}

// Status badge
export function StatusBadge({ status }) {
  const statusStr = typeof status === 'string' ? status : (status?.status || 'Open')
  const map = {
    Open: 'badge-open',
    'In Progress': 'badge-in-progress',
    'Waiting for Customer': 'badge-pending',
    Pending: 'badge-pending',
    Resolved: 'badge-resolved',
    Closed: 'badge-closed',
  }
  return <span className={map[statusStr] || 'badge-open'}>{statusStr}</span>
}

// SLA status badge (safely handles string or object { status: 'on-track', remaining: ... })
export function SLABadge({ status }) {
  const rawKey = typeof status === 'object' && status !== null ? (status.status || 'on-track') : (status || 'on-track')
  const key = String(rawKey).toLowerCase()

  const map = {
    'on-track': 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700',
    'at-risk': 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700',
    critical: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700',
    breached: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700',
  }

  const labels = {
    'on-track': '✓ On Track',
    'at-risk': '⚠ At Risk',
    critical: '🔥 Critical',
    breached: '⛔ Breached',
  }

  const badgeClass = map[key] || map['on-track']
  const labelText = labels[key] || String(rawKey)

  return <span className={badgeClass}>{labelText}</span>
}

// Skeleton loader
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

// Empty state
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        {Icon && <Icon className="w-7 h-7 text-gray-400" />}
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-4 max-w-sm">{description}</p>}
      {action}
    </div>
  )
}

// Stat card
export function StatCard({ label, value, icon: Icon, color = 'blue', sub }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    gray: 'bg-gray-50 text-gray-600',
  }

  const displayVal = typeof value === 'object' && value !== null ? String(value.count ?? 0) : (value ?? '—')

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{displayVal}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color] || colors.blue}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  )
}

// Format date helper
export function formatDate(date) {
  if (!date) return '—'
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  } catch {
    return '—'
  }
}

// Format relative time
export function timeAgo(date) {
  if (!date) return ''
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  } catch {
    return ''
  }
}
