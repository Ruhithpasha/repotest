const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('../controllers/managerStudentController');
const authMiddleware = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Only PDF, JPG, PNG allowed.'), false);
  }
});

router.use(authMiddleware);
router.use((req, res, next) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ detail: 'Manager access required' });
  }
  next();
});

router.post('/', ctrl.registerStudent);
router.get('/', ctrl.getStudents);
router.get('/:studentId', ctrl.getStudent);

router.post('/:studentId/documents/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ detail: 'File too large. Maximum 10MB allowed.' });
      return res.status(400).json({ detail: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ detail: err.message });
    }
    next();
  });
}, ctrl.uploadDocumentWithFile);

router.get('/:studentId/documents/:documentId/view-url', ctrl.getDocumentViewUrl);
router.get('/:studentId/documents/:documentId/download', ctrl.downloadDocument);
router.delete('/:studentId/documents/:documentId', ctrl.deleteDocument);
router.post('/:studentId/submit-review', ctrl.submitForReview);

module.exports = router;
