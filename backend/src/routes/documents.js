const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/auth');

// All routes are protected
router.post('/upload-url', authMiddleware, documentController.getUploadUrl);
router.post('/', authMiddleware, documentController.saveDocument);
router.get('/', authMiddleware, documentController.getDocuments);

module.exports = router;
