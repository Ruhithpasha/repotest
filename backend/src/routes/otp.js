const express = require('express');
const router = express.Router();
const otpController = require('../controllers/otpController');

// Public routes for OTP - used during registration
router.post('/send', otpController.sendOtp);
router.post('/verify', otpController.verifyOtp);

module.exports = router;
