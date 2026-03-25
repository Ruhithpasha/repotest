const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/applicantDocumentController');

// All public — authenticated via application_token in body/query
router.get('/status', ctrl.getStatus);
router.post('/upload-url', ctrl.getUploadUrl);
router.post('/confirm-upload', ctrl.confirmUpload);
router.delete('/documents/:documentId', ctrl.deleteDocument);
router.post('/submit-for-review', ctrl.submitForReview);

module.exports = router;
