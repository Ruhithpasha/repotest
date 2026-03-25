const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Rep/Admin routes
router.post('/register', studentController.registerStudent);
router.get('/', studentController.getStudents);
router.get('/export', studentController.exportStudents);

// Admin stats
router.get('/admin/stats', studentController.getAdminStats);
router.get('/rep/stats', studentController.getRepStats);

// Student-specific routes
router.get('/me', studentController.getMyProfile);
router.get('/:studentId', studentController.getStudent);
router.put('/:studentId/status', studentController.updateStudentStatus);

module.exports = router;
