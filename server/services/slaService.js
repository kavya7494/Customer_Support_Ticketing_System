/**
 * SLA Service
 * Calculates SLA deadlines based on urgency and checks for breaches.
 */

// SLA durations in hours by urgency
const SLA_HOURS = {
  Critical: 1,
  High: 2,
  Medium: 8,
  Low: 24
};

/**
 * Calculate SLA deadline from creation time
 */
const calculateSLADeadline = (urgency, createdAt = new Date()) => {
  const hours = SLA_HOURS[urgency] || 8;
  const deadline = new Date(createdAt);
  deadline.setHours(deadline.getHours() + hours);
  return deadline;
};

/**
 * Get SLA status for a ticket
 */
const getSLAStatus = (ticket) => {
  if (!ticket.slaDeadline) return { status: 'none', remaining: null };

  const now = new Date();
  const deadline = new Date(ticket.slaDeadline);
  const remainingMs = deadline - now;

  if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
    return { status: 'met', remaining: 0 };
  }

  if (ticket.escalated || remainingMs <= 0) {
    return {
      status: 'breached',
      remaining: 0,
      breachedAt: ticket.escalatedAt
    };
  }

  const remainingHours = remainingMs / (1000 * 60 * 60);
  const slaHours = SLA_HOURS[ticket.urgency] || 8;
  const percentUsed = 1 - (remainingMs / (slaHours * 60 * 60 * 1000));

  let status = 'on-track';
  if (percentUsed > 0.75) status = 'at-risk';
  if (percentUsed > 0.9) status = 'critical';

  return {
    status,
    remaining: Math.max(0, remainingMs),
    remainingHours: Math.max(0, remainingHours),
    deadline: deadline,
    percentUsed: Math.min(100, Math.round(percentUsed * 100))
  };
};

/**
 * Format milliseconds to human-readable countdown
 */
const formatCountdown = (ms) => {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/**
 * Get expected response time string for acknowledgement
 */
const getExpectedResponseTime = (urgency) => {
  const hours = SLA_HOURS[urgency];
  if (hours < 1) return 'Within 30 minutes';
  if (hours === 1) return 'Within 1 hour';
  if (hours < 24) return `Within ${hours} hours`;
  return `Within ${hours / 24} day(s)`;
};

module.exports = {
  calculateSLADeadline,
  getSLAStatus,
  formatCountdown,
  getExpectedResponseTime,
  SLA_HOURS
};
