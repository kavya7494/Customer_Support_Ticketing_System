/**
 * AI Service
 * Generates reply suggestions for agents.
 * Falls back to template-based suggestions if no AI API key.
 */

// Template replies by concern and urgency
const templates = {
  'Payment Issue': {
    High: "Hi {clientName}, I'm sorry to hear you're experiencing a payment issue. I understand how frustrating this can be. I've reviewed your account and will investigate the duplicate charge immediately. Our billing team will process any necessary refunds within 3-5 business days. I'll keep you updated throughout the process. Is there anything else you'd like me to check?",
    Medium: "Hi {clientName}, thank you for reaching out about your payment concern. I've flagged this for our billing team to review. We'll investigate the issue and get back to you with an update within 24 hours. If you need urgent assistance, please let us know.",
    Low: "Hi {clientName}, thank you for your inquiry. I've noted your billing question and will have our team look into it. We'll respond with a detailed update within the next business day."
  },
  'Login Issue': {
    High: "Hi {clientName}, I understand you're having trouble accessing your account — that must be frustrating! Here's what you can try right now: 1) Use the 'Forgot Password' link to reset your credentials. 2) Clear your browser cache and cookies. 3) Try a different browser or incognito mode. If these steps don't resolve the issue, I can manually reset your account access. Would you like me to proceed?",
    Medium: "Hi {clientName}, I'm sorry you're having difficulty logging in. Please try resetting your password using the 'Forgot Password' option. If the issue persists, I'll escalate it to our technical team right away.",
    Low: "Hi {clientName}, thank you for reaching out. Please try the password reset option on our login page. If you continue to experience issues, feel free to reply and I'll assist further."
  },
  'Technical Problem': {
    Critical: "Hi {clientName}, I sincerely apologize for the critical technical issue you're experiencing. This has been escalated to our senior technical team as an emergency. We're working on it right now and will provide an update within 30 minutes. Thank you for your patience.",
    High: "Hi {clientName}, I'm sorry you're experiencing technical difficulties. I've escalated this to our technical support team who will investigate immediately. Can you please share: 1) The exact error message you see, 2) Steps to reproduce the issue, 3) Your browser/device information? This will help us resolve it faster.",
    Medium: "Hi {clientName}, thank you for reporting this technical issue. Our team will investigate and get back to you within a few hours. Could you provide more details about the error you're seeing?",
    Low: "Hi {clientName}, thank you for reaching out. We've logged this technical issue and will address it in our next update cycle. We'll keep you informed."
  },
  'Account Issue': {
    High: "Hi {clientName}, I understand your account isn't working as expected. I've reviewed your account details and will resolve this personally. Please give me a few minutes to make the necessary adjustments. I'll update you shortly.",
    Medium: "Hi {clientName}, thank you for contacting us about your account issue. Our team is looking into this and will have an update for you within 24 hours.",
    Low: "Hi {clientName}, I've noted your account inquiry. Our team will review and respond with a solution within the next business day."
  },
  'Security Issue': {
    Critical: "Hi {clientName}, your security concern has been flagged as CRITICAL and has been escalated to our Security Response Team immediately. As a precautionary measure, we recommend: 1) Changing your password immediately, 2) Enabling two-factor authentication, 3) Reviewing recent account activity. Our security team will contact you within the next 30 minutes. Do NOT share any sensitive information until you hear from us.",
    High: "Hi {clientName}, we take security concerns very seriously. Our security team has been notified and is reviewing your account for any unauthorized activity. Please change your password immediately and review your recent account activity. We'll update you within 2 hours."
  },
  'Bug Report': {
    High: "Hi {clientName}, thank you for reporting this bug. Our development team has been notified and is investigating the issue. Could you please provide: 1) Steps to reproduce the bug, 2) Expected vs actual behavior, 3) Screenshots if available? This will help us fix it quickly.",
    Medium: "Hi {clientName}, thank you for the bug report! We've logged this in our issue tracker and our development team will review it. We'll keep you updated on the fix timeline.",
    Low: "Hi {clientName}, thank you for flagging this. We've added it to our bug tracker and will address it in an upcoming release."
  },
  'Feature Request': {
    Low: "Hi {clientName}, thank you for your feature suggestion! We love hearing from our users about improvements. I've forwarded your request to our product team for consideration. While I can't guarantee when or if it will be implemented, your feedback is valuable to us. We'll keep you posted on any updates.",
    Medium: "Hi {clientName}, thank you for this great suggestion! We've added it to our product backlog for review. Our product team evaluates all feature requests and prioritizes them based on user demand and feasibility."
  },
  'General Question': {
    Low: "Hi {clientName}, thank you for reaching out! I'm happy to help. Could you please provide more details about your question so I can give you the most accurate information? Alternatively, you might find answers in our Help Center at [help link].",
    Medium: "Hi {clientName}, thank you for contacting support. I've reviewed your inquiry and will get back to you with a comprehensive answer shortly."
  }
};

/**
 * Generate a reply suggestion based on ticket data
 */
const generateReplySuggestion = async (ticket, clientName) => {
  // Try AI if available
  if (process.env.AI_API_KEY) {
    try {
      const aiSuggestion = await generateWithAI(ticket, clientName);
      if (aiSuggestion) return aiSuggestion;
    } catch (err) {
      console.warn('⚠️ AI reply generation failed, using template:', err.message);
    }
  }

  // Fallback: template-based
  return generateFromTemplate(ticket, clientName);
};

const generateFromTemplate = (ticket, clientName) => {
  const concernTemplates = templates[ticket.concern] || templates['General Question'];
  const urgencyTemplate = concernTemplates[ticket.urgency] || concernTemplates['Medium'] || concernTemplates['Low'] || Object.values(concernTemplates)[0];

  if (!urgencyTemplate) {
    return `Hi ${clientName}, thank you for contacting support. We've received your ticket and will get back to you shortly. Our team is working on it.`;
  }

  return urgencyTemplate.replace(/{clientName}/g, clientName || 'there');
};

const generateWithAI = async (ticket, clientName) => {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const lastClientMessage = ticket.messages
    .filter(m => m.senderRole === 'client')
    .slice(-1)[0];

  const prompt = `
You are a professional customer support agent. Generate a helpful, empathetic reply to this customer ticket.

Ticket Subject: "${ticket.subject}"
Concern Type: ${ticket.concern}
Urgency: ${ticket.urgency}
Customer Name: ${clientName}
${lastClientMessage ? `Latest customer message: "${lastClientMessage.message}"` : `Description: "${ticket.description}"`}

Write a professional, warm, and helpful response. Keep it concise (3-5 sentences). 
Start with "Hi ${clientName}," and be specific to their issue. Return only the reply text, no extra formatting.
`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
};

module.exports = { generateReplySuggestion };
