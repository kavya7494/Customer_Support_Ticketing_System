/**
 * Routing Service
 * Assigns tickets to the best available agent in the correct department
 * using simple load balancing (fewest active tickets).
 */
const User = require('../models/User');

/**
 * Find best available agent for a given department
 */
const findBestAgent = async (department) => {
  // Find available agents in the department, sorted by active ticket count
  const agents = await User.find({
    role: 'agent',
    department: department,
    isAvailable: true
  }).sort({ activeTicketCount: 1 });

  if (agents.length > 0) {
    return agents[0]; // Agent with fewest tickets
  }

  // Fallback: any agent from any department with fewest tickets
  const fallbackAgents = await User.find({
    role: 'agent',
    isAvailable: true
  }).sort({ activeTicketCount: 1 });

  return fallbackAgents[0] || null;
};

/**
 * Assign ticket to best available agent
 */
const assignTicket = async (ticket, department) => {
  const agent = await findBestAgent(department);

  if (!agent) {
    console.warn('⚠️ No available agents found for department:', department);
    return null;
  }

  // Increment agent's active ticket count
  await User.findByIdAndUpdate(agent._id, {
    $inc: { activeTicketCount: 1 }
  });

  return agent;
};

/**
 * Release ticket from agent (on resolution/close)
 */
const releaseTicket = async (agentId) => {
  if (!agentId) return;
  await User.findByIdAndUpdate(agentId, {
    $inc: { activeTicketCount: -1 }
  });
};

module.exports = { findBestAgent, assignTicket, releaseTicket };
