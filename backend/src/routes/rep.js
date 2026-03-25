const express = require('express');
const router = express.Router();
const multer = require('multer');
const repController = require('../controllers/repController');
const authMiddleware = require('../middleware/auth');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, PNG allowed.'), false);
    }
  }
});

// All routes require authentication and rep role
router.use(authMiddleware);
router.use((req, res, next) => {
  if (!['rep', 'sales_user', 'admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Access denied. Rep or Admin role required.' });
  }
  next();
});

// Dashboard
router.get('/dashboard/stats', repController.getDashboardStats);

// Student management
router.post('/students', repController.registerStudent);
router.get('/students', repController.getStudents);
router.get('/students/:studentId', repController.getStudent);

// Document management (simulated upload for testing)
router.post('/students/:studentId/documents', repController.uploadDocument);

// Document management (real file upload to S3)
router.post('/students/:studentId/documents/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ detail: 'File too large. Maximum 10MB allowed.' });
      }
      return res.status(400).json({ detail: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ detail: err.message });
    }
    next();
  });
}, repController.uploadDocumentWithFile);

// Get secure view URL for document
router.get('/students/:studentId/documents/:documentId/view-url', repController.getDocumentViewUrl);

// Proxy download document (for browsers that block S3)
router.get('/students/:studentId/documents/:documentId/download', repController.downloadDocument);

router.post('/students/:studentId/upload-url', repController.getUploadUrl);
router.delete('/students/:studentId/documents/:documentId', repController.deleteDocument);

// Submit for review
router.post('/students/:studentId/submit-review', repController.submitForReview);

// Commissions
router.get('/commissions', repController.getCommissions);

module.exports = router;
