const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { generateTicketNumber } = require('../utils/generateTicketNumber');
const { triageTicket } = require('../services/triageService');
const { assignTicket, releaseTicket } = require('../services/routingService');
const { calculateSLADeadline, getSLAStatus, getExpectedResponseTime } = require('../services/slaService');
const { generateReplySuggestion } = require('../services/aiService');
const notificationService = require('../services/notificationService');


/**
 * POST /api/tickets
 * Create a new ticket (client only)
 */
const createTicket = async (req, res, next) => {
  try {
    const { subject, description, concern, metadata } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ success: false, message: 'Subject and description are required.' });
    }

    // Process uploaded attachments
    const attachments = (req.files || []).map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    }));

    // Generate ticket number
    const ticketNumber = await generateTicketNumber();

    // Run AI/rule-based triage
    const triage = await triageTicket(subject, description);

    // Calculate SLA deadline
    const slaDeadline = calculateSLADeadline(triage.urgency);

    // Find best available agent
    const assignedAgent = await assignTicket(null, triage.department);

    // Build metadata
    const ticketMetadata = {
      browser: metadata?.browser || req.headers['user-agent']?.split(' ')[0] || 'Unknown',
      os: metadata?.os || 'Unknown',
      source: metadata?.source || 'web',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Create initial system messages for timeline
    const systemMessages = [
      {
        sender: req.user._id,
        senderRole: 'system',
        senderName: 'System',
        message: `Ticket ${ticketNumber} created. Automatic triage completed.`,
        isInternal: false
      },
      {
        sender: req.user._id,
        senderRole: 'system',
        senderName: 'System',
        message: `Automatically classified as **${triage.urgency}** priority. Concern: **${triage.concern}**. Department: **${triage.department}**.`,
        isInternal: false
      }
    ];

    if (assignedAgent) {
      systemMessages.push({
        sender: req.user._id,
        senderRole: 'system',
        senderName: 'System',
        message: `Assigned to agent **${assignedAgent.name}** (${triage.department}).`,
        isInternal: false
      });
    }

    // Create acknowledgement message
    const expectedResponse = getExpectedResponseTime(triage.urgency);
    systemMessages.push({
      sender: req.user._id,
      senderRole: 'system',
      senderName: 'System',
      message: `✅ **Acknowledgement**: Your ticket has been received. Expected response time: ${expectedResponse}. SLA Deadline: ${slaDeadline.toLocaleString()}.`,
      isInternal: false
    });

    // Create ticket
    const ticket = await Ticket.create({
      ticketNumber,
      client: req.user._id,
      subject: subject.trim(),
      description: description.trim(),
      attachments,
      urgency: triage.urgency,
      concern: concern || triage.concern,
      department: triage.department,
      tags: triage.tags,
      priorityScore: triage.priorityScore,
      assignedAgent: assignedAgent?._id || null,
      assignedAt: assignedAgent ? new Date() : null,
      slaDeadline,
      messages: systemMessages,
      metadata: ticketMetadata
    });

    // Populate for response
    await ticket.populate([
      { path: 'client', select: 'name email' },
      { path: 'assignedAgent', select: 'name email department' }
    ]);

    // Emit real-time events
    notificationService.newTicket(ticket);
    if (assignedAgent) {
      notificationService.ticketAssigned(ticket, assignedAgent._id);
    }

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully.',
      data: {
        ticket,
        triage,
        acknowledgement: {
          ticketNumber,
          subject: ticket.subject,
          urgency: triage.urgency,
          department: triage.department,
          assignedAgent: assignedAgent?.name || 'Pending assignment',
          expectedResponse,
          slaDeadline
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/tickets
 * Get tickets with filtering and pagination
 */
const getTickets = async (req, res, next) => {
  try {
    const {
      status, urgency, department, assignedAgent,
      search, page = 1, limit = 20, sort = 'createdAt',
      order = 'desc', slaStatus, escalated
    } = req.query;

    const query = {};

    // Role-based filtering
    if (req.user.role === 'client') {
      query.client = req.user._id; // Clients only see their own tickets
    } else if (req.user.role === 'agent') {
      // Agents can see all tickets or filter by assigned
      if (req.query.mine === 'true') {
        query.assignedAgent = req.user._id;
      }
    }

    // Apply filters
    if (status) query.status = status;
    if (urgency) query.urgency = urgency;
    if (department) query.department = department;
    if (assignedAgent) query.assignedAgent = assignedAgent;
    if (escalated === 'true') query.escalated = true;

    // SLA filter
    if (slaStatus === 'breached') {
      query.escalated = true;
    } else if (slaStatus === 'at-risk') {
      const warningTime = new Date(Date.now() + 30 * 60 * 1000);
      query.slaDeadline = { $lt: warningTime };
      query.escalated = false;
      query.status = { $nin: ['Resolved', 'Closed'] };
    }

    // Text search
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { ticketNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sortObj = {};
    sortObj[sort] = order === 'asc' ? 1 : -1;
    if (sort !== 'priorityScore') sortObj.priorityScore = -1; // Secondary sort

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Ticket.countDocuments(query);

    const tickets = await Ticket.find(query)
      .populate('client', 'name email')
      .populate('assignedAgent', 'name email department')
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit))
      .select('-messages -internalNotes'); // Exclude messages for list view

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit)
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/tickets/:id
 * Get single ticket by ID
 */
const getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('client', 'name email')
      .populate('assignedAgent', 'name email department')
      .populate('messages.sender', 'name email role')
      .populate('internalNotes.sender', 'name email role');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    // Clients can only see their own tickets
    if (req.user.role === 'client' && ticket.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Filter internal notes for clients
    const ticketData = ticket.toObject();
    if (req.user.role === 'client') {
      ticketData.internalNotes = [];
      // Filter internal messages from messages array
      ticketData.messages = ticketData.messages.filter(m => !m.isInternal);
    }

    // Add SLA status
    const slaStatus = getSLAStatus(ticket);

    res.json({
      success: true,
      data: { ticket: ticketData, slaStatus }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/tickets/:id/status
 * Update ticket status
 */
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const validStatuses = ['Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const ticket = await Ticket.findById(req.params.id)
      .populate('client', 'name email')
      .populate('assignedAgent', 'name email');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    // Clients can only close or reopen their own tickets
    if (req.user.role === 'client') {
      if (ticket.client._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
      if (!['Closed'].includes(status)) {
        return res.status(403).json({ success: false, message: 'Clients can only close tickets.' });
      }
    }

    const previousStatus = ticket.status;
    ticket.status = status;

    // Set timestamps
    if (status === 'Resolved' && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    }
    if (status === 'Closed') {
      ticket.closedAt = new Date();
    }

    // Release agent ticket count on resolution
    if (['Resolved', 'Closed'].includes(status) && !['Resolved', 'Closed'].includes(previousStatus)) {
      await releaseTicket(ticket.assignedAgent?._id);
    }

    // Add system message
    ticket.messages.push({
      sender: req.user._id,
      senderRole: 'system',
      senderName: 'System',
      message: `Status changed from **${previousStatus}** to **${status}** by ${req.user.name}.`,
      isInternal: false
    });

    await ticket.save();

    notificationService.statusChanged(ticket, ticket.client._id);
    if (status === 'Resolved') {
      notificationService.ticketResolved(ticket, ticket.client._id);
    }

    res.json({
      success: true,
      message: `Ticket status updated to ${status}.`,
      data: { ticket }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/tickets/:id/assign
 * Assign ticket to agent (agent only)
 */
const assignTicketToAgent = async (req, res, next) => {
  try {
    const { agentId } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const agent = await User.findOne({ _id: agentId, role: 'agent' });
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found.' });
    }

    // Release old agent
    if (ticket.assignedAgent) {
      await releaseTicket(ticket.assignedAgent);
    }

    // Assign new agent
    ticket.assignedAgent = agentId;
    ticket.assignedAt = new Date();

    // Update agent count
    await User.findByIdAndUpdate(agentId, { $inc: { activeTicketCount: 1 } });

    ticket.messages.push({
      sender: req.user._id,
      senderRole: 'system',
      senderName: 'System',
      message: `Ticket reassigned to **${agent.name}** by ${req.user.name}.`,
      isInternal: false
    });

    await ticket.save();
    await ticket.populate([
      { path: 'client', select: 'name email' },
      { path: 'assignedAgent', select: 'name email department' }
    ]);

    notificationService.ticketAssigned(ticket, agentId);

    res.json({
      success: true,
      message: `Ticket assigned to ${agent.name}.`,
      data: { ticket }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/tickets/:id/messages
 * Add a message to a ticket
 */
const addMessage = async (req, res, next) => {
  try {
    const { message, isInternal } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required.' });
    }

    const ticket = await Ticket.findById(req.params.id)
      .populate('client', 'name email')
      .populate('assignedAgent', 'name email');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    // Clients can only message their own tickets
    if (req.user.role === 'client' && ticket.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Only agents can add internal notes
    if (isInternal && req.user.role === 'client') {
      return res.status(403).json({ success: false, message: 'Only agents can add internal notes.' });
    }

    // Process attachments
    const attachments = (req.files || []).map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    }));

    const newMessage = {
      sender: req.user._id,
      senderRole: req.user.role,
      senderName: req.user.name,
      message: message.trim(),
      attachments,
      isInternal: isInternal === 'true' || isInternal === true,
      createdAt: new Date()
    };

    // Add to appropriate array
    if (newMessage.isInternal) {
      ticket.internalNotes.push(newMessage);
    } else {
      ticket.messages.push(newMessage);
    }

    // Set first response time if agent replying for first time
    if (req.user.role === 'agent' && !ticket.firstResponseAt) {
      ticket.firstResponseAt = new Date();
    }

    // Auto-update status
    if (req.user.role === 'agent' && ticket.status === 'Open') {
      ticket.status = 'In Progress';
    }
    if (req.user.role === 'client' && ticket.status === 'Waiting for Customer') {
      ticket.status = 'In Progress';
    }

    await ticket.save();

    // Emit real-time notification
    notificationService.newMessage(
      ticket._id,
      newMessage,
      ticket.client?._id,
      ticket.assignedAgent?._id
    );

    res.status(201).json({
      success: true,
      message: 'Message added.',
      data: { message: newMessage }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/tickets/:id/suggest-reply
 * AI reply suggestion for agents
 */
const suggestReply = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('client', 'name email');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const clientName = ticket.client?.name?.split(' ')[0] || 'there';
    const suggestion = await generateReplySuggestion(ticket, clientName);

    res.json({
      success: true,
      data: { suggestion }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/tickets/:id/triage
 * Re-run triage on a ticket
 */
const retriage = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const triage = await triageTicket(ticket.subject, ticket.description);

    ticket.urgency = triage.urgency;
    ticket.concern = triage.concern;
    ticket.department = triage.department;
    ticket.tags = triage.tags;
    ticket.priorityScore = triage.priorityScore;
    ticket.slaDeadline = calculateSLADeadline(triage.urgency, ticket.createdAt);

    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket re-triaged.',
      data: { triage, ticket }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/tickets/:id/sla
 * Get SLA status for a ticket
 */
const getTicketSLA = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id).select('slaDeadline urgency status escalated escalatedAt');
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const slaStatus = getSLAStatus(ticket);
    res.json({ success: true, data: { slaStatus } });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/tickets/:id
 * Delete ticket (agent only)
 */
const deleteTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    res.json({ success: true, message: 'Ticket deleted.' });
  } catch (err) {
    next(err);
  }
};



module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateStatus,
  assignTicketToAgent,
  addMessage,
  suggestReply,
  retriage,
  getTicketSLA,
  deleteTicket
};
