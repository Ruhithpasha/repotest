const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');

// Public routes
router.get('/', courseController.getCourses);
router.get('/:courseId', courseController.getCourse);

module.exports = router;
