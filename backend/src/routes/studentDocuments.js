const express = require('express');
const router = express.Router();
const studentDocumentController = require('../controllers/studentDocumentController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Upload routes
router.post('/upload-url', studentDocumentController.getUploadUrl);
router.post('/confirm', studentDocumentController.confirmUpload);

// Get documents
router.get('/my', studentDocumentController.getMyDocuments);
router.get('/pending', studentDocumentController.getPendingDocuments);
router.get('/:documentId/download', studentDocumentController.downloadDocument);
router.get('/:studentId', studentDocumentController.getDocuments);

// Admin actions
router.put('/:documentId/verify', studentDocumentController.verifyDocument);

module.exports = router;
