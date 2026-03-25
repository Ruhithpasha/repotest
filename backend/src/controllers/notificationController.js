/**
 * Notifications Controller
 * 
 * Handles notification endpoints for testing and configuration
 */

const NotificationService = require('../services/notificationService');

/**
 * Get notification configuration status
 * GET /api/notifications/config
 */
exports.getConfig = async (req, res) => {
  res.json(NotificationService.getConfig());
};

/**
 * Send test email notification
 * POST /api/notifications/test/email
 */
exports.sendTestEmail = async (req, res) => {
  try {
    const { email, type } = req.body;

    if (!email) {
      return res.status(400).json({ detail: 'email is required' });
    }

    const testData = {
      studentName: 'Test Student',
      loginUrl: 'https://plan4growth.uk/login',
      enrollmentNumber: 'P4G-TEST-001',
      amount: 7999,
      transactionId: 'test_12345',
      documentType: 'BDS Degree',
      allDocumentsApproved: true
    };

    const templateType = type || 'ACCOUNT_ACTIVATION';
    const result = await NotificationService.sendEmail(email, templateType, testData);

    res.json({
      success: result.success,
      mock: result.mock || false,
      messageId: result.messageId,
      template: templateType,
      ...result
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ detail: error.message });
  }
};

/**
 * Send test SMS notification
 * POST /api/notifications/test/sms
 */
exports.sendTestSMS = async (req, res) => {
  try {
    const { phone, type } = req.body;

    if (!phone) {
      return res.status(400).json({ detail: 'phone is required' });
    }

    const testData = {
      studentName: 'Test Student',
      loginUrl: 'https://plan4growth.uk/login',
      amount: 7999,
      transactionId: 'test_12345',
      documentType: 'BDS Degree',
      allDocumentsApproved: true
    };

    const templateType = type || 'ACCOUNT_ACTIVATION';
    const result = await NotificationService.sendSMS(phone, templateType, testData);

    res.json({
      success: result.success,
      mock: result.mock || false,
      messageId: result.messageId,
      template: templateType,
      ...result
    });
  } catch (error) {
    console.error('Test SMS error:', error);
    res.status(500).json({ detail: error.message });
  }
};

module.exports = exports;
