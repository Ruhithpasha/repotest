const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/session', authController.processSession);

// Protected routes
router.get('/me', authMiddleware, authController.getMe);
router.get('/sso-redirect', authMiddleware, authController.generateSSOToken);
router.post('/logout', authController.logout);

module.exports = router;
