const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const authMiddleware = require('../middleware/auth');

// Public route
router.post('/', contactController.submitContact);

// Protected route (admin)
router.get('/', authMiddleware, contactController.getContacts);

module.exports = router;
