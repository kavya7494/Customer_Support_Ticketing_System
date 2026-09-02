/**
 * AI/Rule-based Triage Service
 * Classifies tickets by urgency, concern, department, tags, and priority score.
 * Falls back to keyword matching if no AI API key is available.
 */

// Keyword rules for classification
const rules = [
  {
    keywords: ['hacked', 'unauthorized', 'fraud', 'breach', 'stolen', 'phishing', 'compromised', 'suspicious activity', 'security', 'data leak'],
    urgency: 'Critical',
    concern: 'Security Issue',
    department: 'Security',
    tags: ['security', 'urgent', 'breach'],
    baseScore: 90
  },
  {
    keywords: ['server down', 'site down', 'not working', 'crash', 'outage', '500 error', 'system failure', 'service unavailable', 'cannot access'],
    urgency: 'Critical',
    concern: 'Technical Problem',
    department: 'Technical Support',
    tags: ['outage', 'critical', 'server'],
    baseScore: 85
  },
  {
    keywords: ['charged twice', 'double charge', 'duplicate charge', 'payment failed', 'payment declined', 'refund', 'billing error', 'wrong amount', 'deducted twice', 'money deducted'],
    urgency: 'High',
    concern: 'Payment Issue',
    department: 'Billing & Payments',
    tags: ['payment', 'billing', 'refund'],
    baseScore: 75
  },
  {
    keywords: ['cannot login', "can't login", 'login failed', 'forgot password', 'reset password', 'otp not working', 'otp expired', 'account locked', 'wrong password', 'password issue'],
    urgency: 'High',
    concern: 'Login Issue',
    department: 'Account & Access',
    tags: ['login', 'password', 'access'],
    baseScore: 70
  },
  {
    keywords: ['bug', 'error', 'broken', 'crash', 'not loading', 'page not found', '404', 'exception', 'fails to', 'glitch', 'issue with'],
    urgency: 'High',
    concern: 'Bug Report',
    department: 'Technical Support',
    tags: ['bug', 'error', 'technical'],
    baseScore: 65
  },
  {
    keywords: ['account suspended', 'account blocked', 'account deleted', 'cannot access account', 'account issue', 'profile', 'username', 'email change'],
    urgency: 'High',
    concern: 'Account Issue',
    department: 'Account & Access',
    tags: ['account', 'access'],
    baseScore: 65
  },
  {
    keywords: ['subscription', 'plan', 'upgrade', 'downgrade', 'invoice', 'receipt', 'billing', 'payment', 'charge', 'fee', 'cost', 'pricing'],
    urgency: 'Medium',
    concern: 'Payment Issue',
    department: 'Billing & Payments',
    tags: ['billing', 'subscription'],
    baseScore: 50
  },
  {
    keywords: ['slow', 'performance', 'lag', 'loading', 'timeout', 'technical', 'app not responding', 'connection'],
    urgency: 'Medium',
    concern: 'Technical Problem',
    department: 'Technical Support',
    tags: ['performance', 'technical'],
    baseScore: 45
  },
  {
    keywords: ['feature request', 'suggestion', 'would like', 'please add', 'can you add', 'enhancement', 'improvement', 'new feature'],
    urgency: 'Low',
    concern: 'Feature Request',
    department: 'General Support',
    tags: ['feature-request'],
    baseScore: 20
  },
  {
    keywords: ['how do i', 'how to', 'help me', 'question', 'information', 'guide', 'documentation', 'tutorial', 'what is', 'explain'],
    urgency: 'Low',
    concern: 'General Question',
    department: 'General Support',
    tags: ['general', 'question'],
    baseScore: 15
  }
];

// Urgency keywords for boosting score
const urgencyBoosts = {
  urgent: 15,
  asap: 15,
  immediately: 12,
  critical: 20,
  emergency: 20,
  'right away': 10,
  important: 8
};

/**
 * Classify a ticket using keyword/rule-based matching
 */
const classifyWithRules = (subject, description) => {
  const text = `${subject} ${description}`.toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  for (const rule of rules) {
    const matchCount = rule.keywords.filter(kw => text.includes(kw)).length;
    if (matchCount > 0) {
      const score = matchCount * rule.baseScore;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = rule;
      }
    }
  }

  // Calculate priority score with urgency boosts
  let priorityScore = bestMatch ? bestMatch.baseScore : 15;
  for (const [boost, value] of Object.entries(urgencyBoosts)) {
    if (text.includes(boost)) {
      priorityScore = Math.min(100, priorityScore + value);
    }
  }

  // Default classification if no rule matched
  if (!bestMatch) {
    return {
      urgency: 'Medium',
      concern: 'General Question',
      department: 'General Support',
      tags: ['general'],
      priorityScore: Math.min(100, priorityScore)
    };
  }

  // Generate extra tags from text
  const extraTags = [];
  if (text.includes('urgent') || text.includes('asap')) extraTags.push('urgent');
  if (text.includes('refund')) extraTags.push('refund');
  if (text.includes('duplicate')) extraTags.push('duplicate-charge');
  if (text.includes('password')) extraTags.push('password');
  if (text.includes('login')) extraTags.push('login');
  if (text.includes('payment')) extraTags.push('payment');

  const allTags = [...new Set([...bestMatch.tags, ...extraTags])];

  return {
    urgency: bestMatch.urgency,
    concern: bestMatch.concern,
    department: bestMatch.department,
    tags: allTags,
    priorityScore: Math.min(100, priorityScore)
  };
};

/**
 * Try AI classification, fall back to rules if not available
 */
const triageTicket = async (subject, description) => {
  // AI classification (if API key provided)
  if (process.env.AI_API_KEY) {
    try {
      const aiResult = await classifyWithAI(subject, description);
      if (aiResult) return aiResult;
    } catch (err) {
      console.warn('⚠️ AI classification failed, using rules:', err.message);
    }
  }

  // Fallback: deterministic rule-based classification
  return classifyWithRules(subject, description);
};

/**
 * AI-based classification using Google Gemini
 */
const classifyWithAI = async (subject, description) => {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `
You are a customer support triage AI. Analyze this support ticket and classify it.

Subject: "${subject}"
Description: "${description}"

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "urgency": "Critical|High|Medium|Low",
  "concern": "Login Issue|Payment Issue|Technical Problem|Account Issue|Security Issue|Bug Report|Feature Request|General Question",
  "department": "Technical Support|Billing & Payments|Account & Access|Security|General Support",
  "tags": ["tag1", "tag2"],
  "priorityScore": 0-100
}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return JSON.parse(text);
};

module.exports = { triageTicket, classifyWithRules };
