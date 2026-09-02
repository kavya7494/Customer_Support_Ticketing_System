const express = require('express');
const router = express.Router();
const { sendChatbotMessage } = require('../controllers/chatbotController');
const { authenticateUser } = require('../middleware/auth');

// Chatbot available to authenticated users (optionally guest-accessible)
router.post('/message', authenticateUser, sendChatbotMessage);

module.exports = router;
