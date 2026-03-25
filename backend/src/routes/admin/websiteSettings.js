/**
 * Website Settings Routes
 * Protected admin routes + public routes for frontend consumption
 */
const express = require('express');
const router = express.Router();
const websiteSettingsController = require('../../controllers/websiteSettingsController');
const authMiddleware = require('../../middleware/auth');

// Middleware to check super_admin role (accepts variations)
const requireSuperAdmin = (req, res, next) => {
  const isSuperAdmin = ['superadmin', 'super_admin', 'SuperAdmin'].includes(req.user?.role);
  if (!req.user || !isSuperAdmin) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};

// Protected routes (super_admin only)
router.get('/', authMiddleware, requireSuperAdmin, websiteSettingsController.getAllSettings);
router.get('/:section', authMiddleware, requireSuperAdmin, websiteSettingsController.getSectionSettings);
router.put('/:section', authMiddleware, requireSuperAdmin, websiteSettingsController.updateSectionSettings);
router.post('/upload-image', authMiddleware, requireSuperAdmin, websiteSettingsController.uploadImage);
router.delete('/delete-image', authMiddleware, requireSuperAdmin, websiteSettingsController.deleteImage);

module.exports = router;
