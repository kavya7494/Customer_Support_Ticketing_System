/**
 * SLA Worker
 * Runs every minute using node-cron to check for SLA breaches and warnings.
 */
const cron = require('node-cron');
const Ticket = require('../models/Ticket');
const notificationService = require('../services/notificationService');

const startSLAWorker = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      await checkSLABreaches();
      await checkSLAWarnings();
    } catch (err) {
      console.error('❌ SLA worker error:', err.message);
    }
  });

  console.log('⏰ SLA Worker started');
};

/**
 * Find and escalate breached tickets
 */
const checkSLABreaches = async () => {
  const now = new Date();

  const breachedTickets = await Ticket.find({
    status: { $nin: ['Resolved', 'Closed'] },
    escalated: false,
    slaDeadline: { $lt: now }
  }).populate('assignedAgent', 'name email').populate('client', 'name email');

  for (const ticket of breachedTickets) {
    // Mark as escalated
    ticket.escalated = true;
    ticket.escalatedAt = now;

    // Increase priority score
    ticket.priorityScore = Math.min(100, ticket.priorityScore + 20);

    // Bump urgency if not already Critical
    if (ticket.urgency === 'Low') ticket.urgency = 'Medium';
    else if (ticket.urgency === 'Medium') ticket.urgency = 'High';
    else if (ticket.urgency === 'High') ticket.urgency = 'Critical';

    // Add system message
    ticket.messages.push({
      sender: ticket.assignedAgent?._id || ticket.client._id,
      senderRole: 'system',
      senderName: 'System',
      message: `⚠️ SLA BREACHED: This ticket has exceeded its response time limit and has been automatically escalated. Urgency upgraded to ${ticket.urgency}.`,
      isInternal: false,
      createdAt: now
    });

    await ticket.save();

    // Emit escalation event
    notificationService.ticketEscalated(ticket);

    console.log(`🚨 SLA Breached: ${ticket.ticketNumber} - Escalated`);
  }
};

/**
 * Send warnings for tickets approaching SLA deadline (within 20% of time remaining)
 */
const checkSLAWarnings = async () => {
  const now = new Date();

  // Warn tickets where deadline is within the next 30 minutes
  const warningCutoff = new Date(now.getTime() + 30 * 60 * 1000);

  const atRiskTickets = await Ticket.find({
    status: { $nin: ['Resolved', 'Closed'] },
    escalated: false,
    slaDeadline: { $gt: now, $lt: warningCutoff }
  }).populate('assignedAgent', 'name').populate('client', 'name');

  for (const ticket of atRiskTickets) {
    notificationService.slaWarning(ticket);
  }
};

module.exports = { startSLAWorker };
