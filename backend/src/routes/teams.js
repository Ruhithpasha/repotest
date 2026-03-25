const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get my teams (for managers)
router.get('/my-teams', teamController.getMyTeams);

// Get all teams (super admin only)
router.get('/', (req, res, next) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Access denied' });
  }
  next();
}, teamController.getAllTeams);

// Get team by ID
router.get('/:teamId', teamController.getTeam);

// Create team (super admin only)
router.post('/', (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ detail: 'Super admin access required' });
  }
  next();
}, teamController.createTeam);

// Update team
router.patch('/:teamId', (req, res, next) => {
  if (!['super_admin', 'admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Access denied' });
  }
  next();
}, teamController.updateTeam);

// Add member to team
router.post('/:teamId/members', (req, res, next) => {
  if (!['super_admin', 'admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Access denied' });
  }
  next();
}, teamController.addMember);

// Remove member from team
router.delete('/:teamId/members/:userId', (req, res, next) => {
  if (!['super_admin', 'admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Access denied' });
  }
  next();
}, teamController.removeMember);

module.exports = router;
