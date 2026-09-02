const User = require('../models/User');
const Ticket = require('../models/Ticket');

/**
 * GET /api/agents
 * Get all agents (for agent UI - assignment dropdown)
 */
const getAgents = async (req, res, next) => {
  try {
    const agents = await User.find({ role: 'agent' })
      .select('name email department isAvailable activeTicketCount')
      .sort({ activeTicketCount: 1 });

    res.json({ success: true, data: { agents } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/agents/:id
 * Get single agent profile and stats
 */
const getAgentById = async (req, res, next) => {
  try {
    const agent = await User.findOne({ _id: req.params.id, role: 'agent' })
      .select('-password');

    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found.' });
    }

    // Get agent's ticket stats
    const stats = await Ticket.aggregate([
      { $match: { assignedAgent: agent._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: { agent, stats }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAgents, getAgentById };
