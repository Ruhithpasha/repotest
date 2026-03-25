const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const authMiddleware = require('../middleware/auth');

// All routes are protected
router.get('/', authMiddleware, enrollmentController.getEnrollments);
router.get('/:enrollmentId', authMiddleware, enrollmentController.getEnrollment);

module.exports = router;
