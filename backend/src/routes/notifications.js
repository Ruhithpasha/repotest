const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/auth');

// Public route - get notification configuration status
router.get('/config', notificationController.getConfig);

// Protected routes (require authentication)

// Test email notification (admin only)
router.post('/test/email', authMiddleware, async (req, res, next) => {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  return notificationController.sendTestEmail(req, res);
});

// Test SMS notification (admin only)
router.post('/test/sms', authMiddleware, async (req, res, next) => {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  return notificationController.sendTestSMS(req, res);
});

module.exports = router;
