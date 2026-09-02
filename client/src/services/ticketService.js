import api from './api'

export const ticketService = {
  // Create ticket (with file attachments)
  createTicket: (formData) => api.post('/tickets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Get tickets list (paginated, filterable)
  getTickets: (params = {}) => api.get('/tickets', { params }),

  // Get single ticket
  getTicketById: (id) => api.get(`/tickets/${id}`),

  // Update ticket status
  updateStatus: (id, status) => api.patch(`/tickets/${id}/status`, { status }),

  // Assign ticket to agent
  assignTicket: (id, agentId) => api.patch(`/tickets/${id}/assign`, { agentId }),

  // Add message to ticket
  addMessage: (id, formData) => api.post(`/tickets/${id}/messages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Get AI reply suggestion (POST)
  suggestReply: (id) => api.post(`/tickets/${id}/suggest-reply`),

  // Re-triage ticket (POST to /tickets/:id/triage)
  retriage: (id) => api.post(`/tickets/${id}/triage`),

  // Get SLA status
  getSLA: (id) => api.get(`/tickets/${id}/sla`),

  // Delete ticket
  deleteTicket: (id) => api.delete(`/tickets/${id}`),

  // Get dashboard stats
  getClientDashboard: () => api.get('/dashboard/client'),
  getAgentDashboard: () => api.get('/dashboard/agent'),
  getAnalytics: () => api.get('/dashboard/analytics'),

  // Agents
  getAgents: () => api.get('/agents'),

  // Chatbot
  sendChatMessage: (payload) => api.post('/chatbot/message', payload),
}
