const express = require('express');
const router = express.Router();
const stripePaymentController = require('../controllers/stripePaymentController');
const authMiddleware = require('../middleware/auth');

// Get Stripe configuration (public)
router.get('/config', stripePaymentController.getConfig);

// Get current student's payment info (protected)
router.get('/my-info', authMiddleware, stripePaymentController.getCurrentStudentPaymentInfo);

// Create full payment intent (protected - student)
router.post('/create-full-payment', authMiddleware, stripePaymentController.createFullPayment);

// Create deposit payment intent for installments (protected - student)
router.post('/create-deposit-payment', authMiddleware, stripePaymentController.createDepositPayment);

// Get payment history for a student (protected)
router.get('/history/:studentId', authMiddleware, stripePaymentController.getPaymentHistory);

// Cancel pending subscription (protected - student)
router.delete('/cancel-pending-subscription', authMiddleware, stripePaymentController.cancelPendingSubscription);

module.exports = router;
