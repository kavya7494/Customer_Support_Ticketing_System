/**
 * Chatbot Service
 * Rule-based chatbot for customer support.
 * Provides responses to common questions and can initiate ticket creation.
 */

const chatbotRules = [
  {
    patterns: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'start', 'help'],
    response: "Hello! 👋 I'm SupportBot, your virtual assistant. How can I help you today? You can ask me about:\n\n• 🔐 Login or account issues\n• 💳 Payment or billing problems\n• 🐛 Technical issues or bugs\n• 🔒 Security concerns\n• 📋 Creating a support ticket",
    options: ['I can\'t login', 'Payment issue', 'Technical problem', 'Create a ticket', 'Talk to agent']
  },
  {
    patterns: ['cannot login', "can't login", 'login problem', 'login issue', 'forgot password', 'reset password', 'locked out'],
    response: "I understand you're having trouble logging in. Here are some quick fixes:\n\n1. **Reset your password** — Use the 'Forgot Password' link on the login page\n2. **Clear your browser cache** — Press Ctrl+Shift+Delete\n3. **Try incognito mode** — Open a private window and try again\n4. **Check Caps Lock** — Make sure it's not accidentally on\n\nDid any of these help?",
    options: ['Yes, it worked!', 'No, still having issues', 'Create a support ticket'],
    ticketIntent: { concern: 'Login Issue', urgency: 'High', department: 'Account & Access' }
  },
  {
    patterns: ['payment', 'charged', 'billing', 'invoice', 'refund', 'double charge', 'wrong amount', 'payment failed'],
    response: "I'm sorry to hear you're having a payment issue. Here's what I can help with:\n\n💳 **Payment failed** — Check your card details and try again\n🔄 **Duplicate charge** — Our team will investigate and issue a refund within 3-5 days\n📄 **Missing invoice** — Check your registered email's spam folder\n\nWould you like me to create a ticket for our billing team?",
    options: ['Create billing ticket', 'My payment failed', 'I was charged twice', 'Talk to agent'],
    ticketIntent: { concern: 'Payment Issue', urgency: 'High', department: 'Billing & Payments' }
  },
  {
    patterns: ['hacked', 'unauthorized', 'security', 'breach', 'fraud', 'suspicious', 'compromised'],
    response: "⚠️ **This sounds like a serious security concern.** Please take these immediate actions:\n\n1. **Change your password NOW**\n2. **Enable two-factor authentication**\n3. **Review your recent account activity**\n4. **Don't share any credentials**\n\nI'm creating a **CRITICAL** ticket for our Security team right away.",
    options: ['Create security ticket immediately', 'I already changed my password', 'Talk to security team'],
    ticketIntent: { concern: 'Security Issue', urgency: 'Critical', department: 'Security' },
    autoEscalate: true
  },
  {
    patterns: ['not working', 'broken', 'error', 'crash', 'bug', 'technical', 'slow', 'issue'],
    response: "I'm sorry you're experiencing technical difficulties! Let me help diagnose the issue.\n\n🔄 **Try these first:**\n1. Refresh the page (Ctrl+R)\n2. Clear browser cache\n3. Try a different browser\n4. Check your internet connection\n\nIf the issue persists, our Technical Support team can investigate further.",
    options: ['Still not working', 'Create technical ticket', 'Talk to support'],
    ticketIntent: { concern: 'Technical Problem', urgency: 'High', department: 'Technical Support' }
  },
  {
    patterns: ['account', 'profile', 'settings', 'username', 'email', 'blocked', 'suspended'],
    response: "I can help with account-related issues! Common solutions:\n\n👤 **Update profile** — Go to Settings > Profile\n📧 **Change email** — Requires verification from your old email\n🔒 **Account blocked** — Usually due to failed login attempts; contact support\n\nWhat specific account issue are you facing?",
    options: ['Account is blocked', 'Change my email', 'Update profile info', 'Create account ticket'],
    ticketIntent: { concern: 'Account Issue', urgency: 'Medium', department: 'Account & Access' }
  },
  {
    patterns: ['create ticket', 'submit ticket', 'open ticket', 'new ticket', 'report issue', 'contact support'],
    response: "I'll help you create a support ticket right away! 📋\n\nPlease provide:\n1. A **subject** (brief description of the issue)\n2. A **detailed description** of the problem\n\nOur team will respond based on priority:\n• Critical: Within 1 hour\n• High: Within 2 hours\n• Medium: Within 8 hours\n• Low: Within 24 hours",
    options: ['Start ticket creation', 'Talk to agent instead'],
    action: 'collect_ticket_info'
  },
  {
    patterns: ['talk to agent', 'human', 'real person', 'live agent', 'speak to someone'],
    response: "I'll connect you with a live agent right away! 🧑‍💼\n\nOur agents are available during business hours. The fastest way to get help is to create a ticket — our agents typically respond within 2 hours for high-priority issues.\n\nWould you like to create a ticket now?",
    options: ['Create a ticket', 'View my tickets']
  },
  {
    patterns: ['thank', 'thanks', 'great', 'solved', 'fixed', 'working now', 'resolved'],
    response: "Wonderful! I'm glad I could help! 🎉\n\nIs there anything else you need assistance with? Don't hesitate to reach out anytime. Have a great day! 😊",
    options: ['No, that\'s all', 'I have another issue']
  }
];

/**
 * Find matching chatbot rule for user message
 */
const findMatchingRule = (message) => {
  const text = message.toLowerCase();

  for (const rule of chatbotRules) {
    if (rule.patterns.some(pattern => text.includes(pattern))) {
      return rule;
    }
  }

  return null;
};

/**
 * Generate chatbot response
 */
const getChatbotResponse = async (message, conversationHistory = []) => {
  // Try AI if available
  if (process.env.AI_API_KEY) {
    try {
      return await getAIResponse(message, conversationHistory);
    } catch (err) {
      console.warn('⚠️ AI chatbot failed, using rules:', err.message);
    }
  }

  // Rule-based fallback
  const rule = findMatchingRule(message);

  if (rule) {
    return {
      message: rule.response,
      options: rule.options || [],
      action: rule.action || null,
      ticketIntent: rule.ticketIntent || null,
      autoEscalate: rule.autoEscalate || false
    };
  }

  // Default fallback response
  return {
    message: "I'm not sure I fully understand your issue. Let me connect you with our support team who can help you better.\n\nYou can:\n• Create a detailed support ticket\n• Browse our Help Center\n• Try describing your issue differently",
    options: ['Create a support ticket', 'Talk to agent', 'Start over'],
    action: null,
    ticketIntent: null
  };
};

const getAIResponse = async (message, conversationHistory) => {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const history = conversationHistory.map(h =>
    `${h.role === 'user' ? 'Customer' : 'Bot'}: ${h.message}`
  ).join('\n');

  const prompt = `
You are SupportBot, a friendly customer support chatbot. Keep responses concise and helpful.
You help customers with login issues, payments, technical problems, account issues, and general questions.
You can offer to create support tickets.

Previous conversation:
${history}

Customer: ${message}

Respond helpfully in 2-4 sentences. If it's a serious issue (security, critical outage), recommend creating a ticket immediately.
Return JSON: { "message": "your response", "options": ["option1", "option2"], "ticketIntent": null or { "concern": "...", "urgency": "..." } }
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return JSON.parse(text);
};

module.exports = { getChatbotResponse };
