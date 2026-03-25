const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const authMiddleware = require('../middleware/auth');

// Public route
router.post('/', applicationController.submitApplication);

// Protected route
router.get('/', authMiddleware, applicationController.getApplications);

module.exports = router;
