const express = require('express');
const router = express.Router();
const {
  createTicket, getTickets, getTicketById,
  updateStatus, assignTicketToAgent, addMessage,
  suggestReply, retriage, getTicketSLA, deleteTicket
} = require('../controllers/ticketController');
const { authenticateUser, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All ticket routes require authentication
router.use(authenticateUser);

// Create ticket (clients only)
router.post('/', requireRole('client'), upload.array('attachments', 5), createTicket);

// Get tickets (all authenticated users)
router.get('/', getTickets);

// Get single ticket
router.get('/:id', getTicketById);

// Update ticket status
router.patch('/:id/status', updateStatus);

// Assign ticket (agents only)
router.patch('/:id/assign', requireRole('agent'), assignTicketToAgent);

// Add message/reply
router.post('/:id/messages', upload.array('attachments', 5), addMessage);

// AI reply suggestion (agents only)
router.post('/:id/suggest-reply', requireRole('agent'), suggestReply);

// Re-triage ticket (agents only)
router.post('/:id/triage', requireRole('agent'), retriage);

// Get SLA status
router.get('/:id/sla', getTicketSLA);

// Delete ticket (agents only)
router.delete('/:id', requireRole('agent'), deleteTicket);

module.exports = router;
