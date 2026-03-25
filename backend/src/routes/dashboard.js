const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');

// Protected route
router.get('/stats', authMiddleware, dashboardController.getStats);

module.exports = router;
