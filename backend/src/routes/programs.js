const express = require('express');
const router = express.Router();
const programController = require('../controllers/programController');
const authMiddleware = require('../middleware/auth');

// Get all programs (public for active programs)
router.get('/', authMiddleware, programController.getAllPrograms);

// Get program by ID
router.get('/:programId', authMiddleware, programController.getProgram);

// Create program (super admin only)
router.post('/', authMiddleware, (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ detail: 'Super admin access required' });
  }
  next();
}, programController.createProgram);

// Update program (super admin only)
router.patch('/:programId', authMiddleware, (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ detail: 'Super admin access required' });
  }
  next();
}, programController.updateProgram);

// Toggle program status (super admin only)
router.patch('/:programId/toggle-status', authMiddleware, (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ detail: 'Super admin access required' });
  }
  next();
}, programController.toggleStatus);

module.exports = router;
