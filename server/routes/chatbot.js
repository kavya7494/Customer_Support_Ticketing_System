const express = require('express');
const router = express.Router();
const { sendChatbotMessage } = require('../controllers/chatbotController');
const { optionalAuth } = require('../middleware/auth');

// Chatbot available to both authenticated users and guests
router.post('/message', optionalAuth, sendChatbotMessage);

module.exports = router;
