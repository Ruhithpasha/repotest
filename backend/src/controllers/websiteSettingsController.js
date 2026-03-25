/**
 * Website Settings Controller
 * Manages all landing page content dynamically
 */
const { WebsiteSetting } = require('../models/pg');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../public/uploads/website');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Get all website settings sections
 * GET /api/admin/website-settings
 */
exports.getAllSettings = async (req, res) => {
  try {
    const settings = await WebsiteSetting.findAll({
      order: [['section', 'ASC']]
    });
    
    // Convert to object keyed by section
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.section] = {
        id: s.id,
        content: s.content,
        updated_by: s.updated_by,
        updated_at: s.updated_at
      };
    });
    
    res.json({ settings: settingsMap });
  } catch (error) {
    console.error('Get all settings error:', error);
    res.status(500).json({ error: 'Failed to fetch website settings' });
  }
};

/**
 * Get single section settings
 * GET /api/admin/website-settings/:section
 */
exports.getSectionSettings = async (req, res) => {
  try {
    const { section } = req.params;
    
    const setting = await WebsiteSetting.findOne({
      where: { section }
    });
    
    if (!setting) {
      return res.json({ 
        section,
        content: {},
        exists: false 
      });
    }
    
    res.json({
      section,
      content: setting.content,
      updated_by: setting.updated_by,
      updated_at: setting.updated_at,
      exists: true
    });
  } catch (error) {
    console.error('Get section settings error:', error);
    res.status(500).json({ error: 'Failed to fetch section settings' });
  }
};

/**
 * Update (upsert) section settings
 * PUT /api/admin/website-settings/:section
 */
exports.updateSectionSettings = async (req, res) => {
  try {
    const { section } = req.params;
    const { content } = req.body;
    const userId = req.user?.user_id || req.user?.id;
    
    if (!content || typeof content !== 'object') {
      return res.status(400).json({ error: 'Content must be a valid JSON object' });
    }
    
    // Upsert: update if exists, create if not
    const [setting, created] = await WebsiteSetting.upsert({
      section,
      content,
      updated_by: userId
    }, {
      returning: true
    });
    
    res.json({
      message: created ? 'Section created successfully' : 'Section updated successfully',
      section,
      content: setting.content,
      updated_at: setting.updated_at
    });
  } catch (error) {
    console.error('Update section settings error:', error);
    res.status(500).json({ error: 'Failed to update section settings' });
  }
};

/**
 * Upload image for website settings
 * POST /api/admin/website-settings/upload-image
 */
exports.uploadImage = async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const file = req.files.image;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Allowed: jpg, png, webp, svg' });
    }
    
    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB' });
    }
    
    // Generate unique filename
    const ext = path.extname(file.name);
    const filename = `${uuidv4()}${ext}`;
    const filepath = path.join(uploadsDir, filename);
    
    // Move file to uploads directory
    await file.mv(filepath);
    
    // Get image dimensions (for images)
    let dimensions = null;
    if (file.mimetype !== 'image/svg+xml') {
      try {
        const sizeOf = require('image-size');
        dimensions = sizeOf(filepath);
      } catch (e) {
        // Ignore dimension errors
      }
    }
    
    // Return public URL
    const publicUrl = `/uploads/website/${filename}`;
    
    res.json({
      url: publicUrl,
      filename,
      size: file.size,
      mimetype: file.mimetype,
      dimensions: dimensions ? { width: dimensions.width, height: dimensions.height } : null
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
};

/**
 * PUBLIC: Get section settings (no auth required)
 * GET /api/website-settings/:section
 */
exports.getPublicSectionSettings = async (req, res) => {
  try {
    const { section } = req.params;
    
    const setting = await WebsiteSetting.findOne({
      where: { section }
    });
    
    if (!setting) {
      return res.json({ 
        section,
        content: null
      });
    }
    
    res.json({
      section,
      content: setting.content
    });
  } catch (error) {
    console.error('Get public section settings error:', error);
    res.status(500).json({ error: 'Failed to fetch section settings' });
  }
};

/**
 * Delete an uploaded image
 * DELETE /api/admin/website-settings/delete-image
 */
exports.deleteImage = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || !url.startsWith('/uploads/website/')) {
      return res.status(400).json({ error: 'Invalid image URL' });
    }
    
    const filename = path.basename(url);
    const filepath = path.join(uploadsDir, filename);
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
    
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
};

module.exports = exports;
