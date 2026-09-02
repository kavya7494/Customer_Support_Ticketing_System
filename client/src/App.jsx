import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Auth pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

// Layouts
import ClientLayout from './layouts/ClientLayout'
import AgentLayout from './layouts/AgentLayout'

// Client pages
import ClientDashboard from './pages/client/Dashboard'
import MyTickets from './pages/client/MyTickets'
import CreateTicket from './pages/client/CreateTicket'
import ClientTicketDetail from './pages/client/TicketDetail'

// Agent pages
import AgentDashboard from './pages/agent/Dashboard'
import AllTickets from './pages/agent/AllTickets'
import AgentTicketDetail from './pages/agent/TicketDetail'
import Analytics from './pages/agent/Analytics'

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to={user.role === 'agent' ? '/agent/dashboard' : '/client/dashboard'} replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
  if (user) return <Navigate to={user.role === 'agent' ? '/agent/dashboard' : '/client/dashboard'} replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Client routes */}
      <Route path="/client" element={<ProtectedRoute role="client"><ClientLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ClientDashboard />} />
        <Route path="tickets" element={<MyTickets />} />
        <Route path="tickets/:id" element={<ClientTicketDetail />} />
        <Route path="create" element={<CreateTicket />} />
      </Route>

      {/* Agent routes */}
      <Route path="/agent" element={<ProtectedRoute role="agent"><AgentLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AgentDashboard />} />
        <Route path="tickets" element={<AllTickets />} />
        <Route path="tickets/:id" element={<AgentTicketDetail />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
