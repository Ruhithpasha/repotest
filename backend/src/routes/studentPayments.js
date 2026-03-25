const express = require('express');
const router = express.Router();
const studentPaymentController = require('../controllers/studentPaymentController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Payment routes
router.post('/create', studentPaymentController.createPaymentIntent);
router.post('/:paymentId/confirm', studentPaymentController.confirmPayment);
router.post('/manual', studentPaymentController.markPaymentReceived);

// Get payments
router.get('/my', studentPaymentController.getMyPayments);
router.get('/all', studentPaymentController.getAllPayments);
router.get('/:studentId', studentPaymentController.getPayments);

module.exports = router;
