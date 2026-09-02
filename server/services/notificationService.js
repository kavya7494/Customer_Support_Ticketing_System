/**
 * Notification Service
 * Emits Socket.IO events for real-time updates.
 */
const { getIO } = require('../config/socket');

const emit = (room, event, data) => {
  try {
    const io = getIO();
    io.to(room).emit(event, data);
  } catch (err) {
    // Socket may not be initialized in tests
    console.warn('Socket emit failed:', err.message);
  }
};

const notificationService = {
  // Notify all agents of a new ticket
  newTicket: (ticket) => {
    emit('agents', 'new-ticket', { ticket });
  },

  // Notify assigned agent of ticket assignment
  ticketAssigned: (ticket, agentId) => {
    emit(`user:${agentId}`, 'ticket-assigned', { ticket });
    emit('agents', 'ticket-updated', { ticket });
  },

  // Notify client and agent of a new message
  newMessage: (ticketId, message, clientId, agentId) => {
    emit(`ticket:${ticketId}`, 'ticket-message', { message });
    if (clientId) emit(`user:${clientId}`, 'ticket-message', { ticketId, message });
    if (agentId) emit(`user:${agentId}`, 'ticket-message', { ticketId, message });
  },

  // Notify client of status change
  statusChanged: (ticket, clientId) => {
    emit(`ticket:${ticket._id}`, 'ticket-updated', { ticket });
    if (clientId) emit(`user:${clientId}`, 'ticket-updated', { ticket });
    emit('agents', 'ticket-updated', { ticket });
  },

  // Notify of SLA escalation
  ticketEscalated: (ticket) => {
    emit('agents', 'ticket-escalated', { ticket });
    if (ticket.assignedAgent) {
      emit(`user:${ticket.assignedAgent}`, 'ticket-escalated', { ticket });
    }
    if (ticket.client) {
      emit(`user:${ticket.client}`, 'ticket-updated', { ticket });
    }
  },

  // SLA warning
  slaWarning: (ticket) => {
    emit('agents', 'sla-warning', { ticket });
    if (ticket.assignedAgent) {
      emit(`user:${ticket.assignedAgent}`, 'sla-warning', { ticket });
    }
  },

  // Ticket resolved
  ticketResolved: (ticket, clientId) => {
    emit(`ticket:${ticket._id}`, 'ticket-resolved', { ticket });
    if (clientId) emit(`user:${clientId}`, 'ticket-resolved', { ticket });
    emit('agents', 'ticket-updated', { ticket });
  }
};

module.exports = notificationService;
