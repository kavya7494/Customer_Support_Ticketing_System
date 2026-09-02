const { getChatbotResponse } = require('../services/chatbotService');
const { triageTicket } = require('../services/triageService');
const { assignTicket } = require('../services/routingService');
const { calculateSLADeadline, getExpectedResponseTime } = require('../services/slaService');
const { generateTicketNumber } = require('../utils/generateTicketNumber');
const Ticket = require('../models/Ticket');
const notificationService = require('../services/notificationService');

/**
 * POST /api/chatbot/message
 * Send a message to the chatbot
 */
const sendChatbotMessage = async (req, res, next) => {
  try {
    const { message, conversationHistory = [], createTicket, ticketData } = req.body;

    if (!message && !createTicket) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    // If the user wants to create a ticket from chatbot
    if (createTicket && ticketData && req.user) {
      const { subject, description } = ticketData;

      if (!subject || !description) {
        return res.json({
          success: true,
          data: {
            message: "I need a few more details to create your ticket. Please provide:\n1. **Subject**: Brief description of the issue\n2. **Description**: More details about what's happening",
            options: [],
            action: 'collect_ticket_info'
          }
        });
      }

      // Create the ticket
      const triage = await triageTicket(subject, description);
      const ticketNumber = await generateTicketNumber();
      const slaDeadline = calculateSLADeadline(triage.urgency);
      const agent = await assignTicket(null, triage.department);

      const systemMessages = [
        {
          sender: req.user._id,
          senderRole: 'system',
          senderName: 'System',
          message: `Ticket created via chatbot. Automatically classified as **${triage.urgency}** priority. Department: **${triage.department}**.`,
          isInternal: false
        }
      ];

      if (agent) {
        systemMessages.push({
          sender: req.user._id,
          senderRole: 'system',
          senderName: 'System',
          message: `Assigned to **${agent.name}** (${triage.department}).`,
          isInternal: false
        });
      }

      const ticket = await Ticket.create({
        ticketNumber,
        client: req.user._id,
        subject,
        description,
        urgency: triage.urgency,
        concern: triage.concern,
        department: triage.department,
        tags: triage.tags,
        priorityScore: triage.priorityScore,
        assignedAgent: agent?._id || null,
        assignedAt: agent ? new Date() : null,
        slaDeadline,
        messages: systemMessages,
        metadata: { source: 'chatbot' }
      });

      notificationService.newTicket(ticket);
      if (agent) notificationService.ticketAssigned(ticket, agent._id);

      const expectedResponse = getExpectedResponseTime(triage.urgency);

      return res.json({
        success: true,
        data: {
          message: `✅ **Ticket Created Successfully!**\n\n📋 **Ticket #${ticketNumber}**\n📌 Priority: **${triage.urgency}**\n🏢 Department: **${triage.department}**\n👤 Assigned to: **${agent?.name || 'Pending'}**\n⏰ Expected response: **${expectedResponse}**\n\nYou can track your ticket in the "My Tickets" section.`,
          options: ['View My Tickets', 'Create Another Ticket'],
          ticket: { ticketNumber, urgency: triage.urgency, department: triage.department }
        }
      });
    }

    // Get chatbot response
    const response = await getChatbotResponse(message, conversationHistory);

    res.json({
      success: true,
      data: response
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { sendChatbotMessage };
