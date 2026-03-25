/**
 * Public Website Settings Routes
 * For frontend to fetch content without authentication
 */
const express = require('express');
const router = express.Router();
const websiteSettingsController = require('../controllers/websiteSettingsController');

// Public route - no auth required
router.get('/:section', websiteSettingsController.getPublicSectionSettings);

module.exports = router;
