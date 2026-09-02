const Ticket = require('../models/Ticket');
const User = require('../models/User');

/**
 * GET /api/dashboard/client
 * Client dashboard stats
 */
const getClientDashboard = async (req, res, next) => {
  try {
    const clientId = req.user._id;

    const [totalTickets, openTickets, inProgressTickets, resolvedTickets, closedTickets, recentTickets] = await Promise.all([
      Ticket.countDocuments({ client: clientId }),
      Ticket.countDocuments({ client: clientId, status: 'Open' }),
      Ticket.countDocuments({ client: clientId, status: 'In Progress' }),
      Ticket.countDocuments({ client: clientId, status: 'Resolved' }),
      Ticket.countDocuments({ client: clientId, status: 'Closed' }),
      Ticket.find({ client: clientId })
        .populate('assignedAgent', 'name email')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('ticketNumber subject status urgency department createdAt updatedAt slaDeadline')
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          total: totalTickets,
          open: openTickets,
          inProgress: inProgressTickets,
          resolved: resolvedTickets,
          closed: closedTickets
        },
        recentTickets
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dashboard/agent
 * Agent dashboard stats
 */
const getAgentDashboard = async (req, res, next) => {
  try {
    const agentId = req.user._id;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalOpen,
      myTickets,
      criticalTickets,
      highTickets,
      slaAtRisk,
      slaBreached,
      resolvedToday,
      recentTickets
    ] = await Promise.all([
      Ticket.countDocuments({ status: { $in: ['Open', 'In Progress', 'Waiting for Customer'] } }),
      Ticket.countDocuments({ assignedAgent: agentId, status: { $nin: ['Resolved', 'Closed'] } }),
      Ticket.countDocuments({ urgency: 'Critical', status: { $nin: ['Resolved', 'Closed'] } }),
      Ticket.countDocuments({ urgency: 'High', status: { $nin: ['Resolved', 'Closed'] } }),
      Ticket.countDocuments({
        status: { $nin: ['Resolved', 'Closed'] },
        escalated: false,
        slaDeadline: { $gt: now, $lt: new Date(now.getTime() + 30 * 60 * 1000) }
      }),
      Ticket.countDocuments({ escalated: true, status: { $nin: ['Resolved', 'Closed'] } }),
      Ticket.countDocuments({ resolvedAt: { $gte: todayStart } }),
      Ticket.find({ status: { $nin: ['Resolved', 'Closed'] } })
        .populate('client', 'name email')
        .populate('assignedAgent', 'name email department')
        .sort({ priorityScore: -1, createdAt: -1 })
        .limit(10)
        .select('ticketNumber subject status urgency department assignedAgent client createdAt slaDeadline escalated priorityScore')
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalOpen,
          myTickets,
          criticalTickets,
          highTickets,
          slaAtRisk,
          slaBreached,
          resolvedToday
        },
        recentTickets
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dashboard/analytics
 * Analytics data for charts (agent only)
 */
const getAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Tickets by urgency
    const ticketsByUrgency = await Ticket.aggregate([
      { $group: { _id: '$urgency', count: { $sum: 1 } } }
    ]);

    // Tickets by department
    const ticketsByDepartment = await Ticket.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    // Tickets by status
    const ticketsByStatus = await Ticket.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Tickets over last 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const ticketsOverTime = await Ticket.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // SLA compliance
    const totalResolved = await Ticket.countDocuments({ status: { $in: ['Resolved', 'Closed'] } });
    const slaCompliant = await Ticket.countDocuments({
      status: { $in: ['Resolved', 'Closed'] },
      escalated: false
    });
    const slaComplianceRate = totalResolved > 0 ? Math.round((slaCompliant / totalResolved) * 100) : 0;

    // Average response times (in minutes)
    const responseTimeData = await Ticket.aggregate([
      {
        $match: {
          firstResponseAt: { $exists: true },
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $project: {
          responseTimeMs: { $subtract: ['$firstResponseAt', '$createdAt'] }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTimeMs: { $avg: '$responseTimeMs' }
        }
      }
    ]);

    const avgResponseTimeMinutes = responseTimeData[0]
      ? Math.round(responseTimeData[0].avgResponseTimeMs / (1000 * 60))
      : 0;

    // Average resolution time
    const resolutionTimeData = await Ticket.aggregate([
      {
        $match: {
          resolvedAt: { $exists: true },
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $project: {
          resolutionTimeMs: { $subtract: ['$resolvedAt', '$createdAt'] }
        }
      },
      {
        $group: {
          _id: null,
          avgResolutionTimeMs: { $avg: '$resolutionTimeMs' }
        }
      }
    ]);

    const avgResolutionTimeHours = resolutionTimeData[0]
      ? (resolutionTimeData[0].avgResolutionTimeMs / (1000 * 60 * 60)).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        ticketsByUrgency,
        ticketsByDepartment,
        ticketsByStatus,
        ticketsOverTime,
        slaComplianceRate,
        avgResponseTimeMinutes,
        avgResolutionTimeHours: Number(avgResolutionTimeHours)
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getClientDashboard, getAgentDashboard, getAnalytics };
