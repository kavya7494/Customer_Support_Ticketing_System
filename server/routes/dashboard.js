const express = require('express');
const router = express.Router();
const { getClientDashboard, getAgentDashboard, getAnalytics } = require('../controllers/dashboardController');
const { authenticateUser, requireRole } = require('../middleware/auth');

router.get('/client', authenticateUser, requireRole('client'), getClientDashboard);
router.get('/agent', authenticateUser, requireRole('agent'), getAgentDashboard);
router.get('/analytics', authenticateUser, requireRole('agent'), getAnalytics);

module.exports = router;
