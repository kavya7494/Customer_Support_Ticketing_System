const express = require('express');
const router = express.Router();
const { getAgents, getAgentById } = require('../controllers/agentController');
const { authenticateUser } = require('../middleware/auth');

router.get('/', authenticateUser, getAgents);
router.get('/:id', authenticateUser, getAgentById);

module.exports = router;
