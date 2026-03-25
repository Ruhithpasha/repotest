/**
 * GoHighLevel Notification Service
 * 
 * Handles email and SMS notifications via GoHighLevel API
 * Falls back to mock mode if credentials are not configured
 */

const axios = require('axios');

// GoHighLevel Configuration
const GHL_API_KEY = process.env.GOHIGHLEVEL_API_KEY;
const GHL_LOCATION_ID = process.env.GOHIGHLEVEL_LOCATION_ID;
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

// Check if GoHighLevel is configured
const IS_MOCK_MODE = !GHL_API_KEY || !GHL_LOCATION_ID || GHL_API_KEY === 'mock';

console.log(`[Notifications] Mode: ${IS_MOCK_MODE ? 'MOCK (development)' : 'LIVE (GoHighLevel)'}`);

// Email Templates
const EMAIL_TEMPLATES = {
  ACCOUNT_ACTIVATION: {
    subject: 'Your Plan4Growth Academy Account is Ready',
    getBody: (data) => `
Dear ${data.studentName},

Congratulations! Your account at Plan4Growth Academy has been activated.

You can now log in using your registered email and the password set by your educational representative.

Login here: ${data.loginUrl}

Programme: Level 7 Diploma in Dental Implantology
Enrollment Number: ${data.enrollmentNumber || 'Pending'}

If you have any questions, please contact your representative or our admissions team.

Best regards,
Plan4Growth Academy Team
    `.trim()
  },
  
  PAYMENT_CONFIRMATION: {
    subject: 'Payment Confirmation - Plan4Growth Academy',
    getBody: (data) => `
Dear ${data.studentName},

We have received your payment for the Level 7 Diploma in Dental Implantology.

Payment Details:
- Amount: £${data.amount.toLocaleString()}
- Transaction ID: ${data.transactionId}
- Date: ${new Date().toLocaleDateString('en-GB')}

Your enrollment has been confirmed. Welcome to Plan4Growth Academy!

Enrollment Number: ${data.enrollmentNumber}

Best regards,
Plan4Growth Academy Finance Team
    `.trim()
  },
  
  DOCUMENT_UPLOADED: {
    subject: 'Document Uploaded - Plan4Growth Academy',
    getBody: (data) => `
Dear ${data.studentName},

Your educational representative has uploaded a document to your application:

Document: ${data.documentType}
Uploaded: ${new Date().toLocaleDateString('en-GB')}

Our admissions team will review your document shortly.

Best regards,
Plan4Growth Academy
    `.trim()
  },
  
  DOCUMENT_APPROVED: {
    subject: 'Document Approved - Plan4Growth Academy',
    getBody: (data) => `
Dear ${data.studentName},

Good news! Your document has been approved:

Document: ${data.documentType}
Status: Approved ✓

${data.allDocumentsApproved ? 
  'All your documents have been approved. Please log in to complete your enrollment by making the payment.' :
  'Please wait for all documents to be approved before you can proceed with payment.'}

Best regards,
Plan4Growth Academy
    `.trim()
  },
  
  APPLICATION_APPROVED: {
    subject: 'Application Approved - Plan4Growth Academy',
    getBody: (data) => `
Dear ${data.studentName},

Congratulations! Your application to the Level 7 Diploma in Dental Implantology has been approved.

Your account is now active. You can log in using your email and the password set by your educational representative.

Login URL: ${data.loginUrl}

Next Step: Please complete your payment of £7,999 to secure your enrollment.

Best regards,
Plan4Growth Academy Admissions Team
    `.trim()
  }
};

// SMS Templates
const SMS_TEMPLATES = {
  ACCOUNT_ACTIVATION: (data) => 
    `Plan4Growth: Your account is ready! Login at ${data.loginUrl} to complete enrollment.`,
  
  PAYMENT_CONFIRMATION: (data) => 
    `Plan4Growth: Payment of £${data.amount.toLocaleString()} confirmed! Welcome to the programme. Ref: ${data.transactionId}`,
  
  DOCUMENT_APPROVED: (data) => 
    `Plan4Growth: Your ${data.documentType} document has been approved.${data.allDocumentsApproved ? ' All docs verified - please login to pay.' : ''}`,
  
  APPLICATION_APPROVED: (data) =>
    `Plan4Growth: Your application is approved! Login to complete payment: ${data.loginUrl}`
};

/**
 * Send Email via GoHighLevel
 */
async function sendEmail(to, templateKey, data) {
  const template = EMAIL_TEMPLATES[templateKey];
  if (!template) {
    console.error(`[Notifications] Unknown email template: ${templateKey}`);
    return { success: false, error: 'Unknown template' };
  }

  const subject = template.subject;
  const body = template.getBody(data);

  if (IS_MOCK_MODE) {
    console.log(`[MOCK EMAIL] To: ${to}`);
    console.log(`[MOCK EMAIL] Subject: ${subject}`);
    console.log(`[MOCK EMAIL] Body: ${body.substring(0, 200)}...`);
    return {
      success: true,
      mock: true,
      messageId: `mock_email_${Date.now()}`,
      to,
      subject
    };
  }

  try {
    const response = await axios.post(`${GHL_BASE_URL}/emails/send`, {
      to,
      subject,
      body,
      locationId: GHL_LOCATION_ID
    }, {
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      timeout: 30000
    });

    console.log(`[Notifications] Email sent to ${to}, template: ${templateKey}`);
    return {
      success: true,
      messageId: response.data?.id,
      to,
      subject
    };
  } catch (error) {
    console.error(`[Notifications] Email failed to ${to}:`, error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

/**
 * Send SMS via GoHighLevel
 */
async function sendSMS(phoneNumber, templateKey, data) {
  const templateFn = SMS_TEMPLATES[templateKey];
  if (!templateFn) {
    console.error(`[Notifications] Unknown SMS template: ${templateKey}`);
    return { success: false, error: 'Unknown template' };
  }

  const message = templateFn(data);

  // Format phone number to E.164 if needed
  let formattedPhone = phoneNumber;
  if (!phoneNumber.startsWith('+')) {
    // Assume UK number if no country code
    formattedPhone = phoneNumber.startsWith('0') 
      ? '+44' + phoneNumber.slice(1) 
      : '+44' + phoneNumber;
  }

  if (IS_MOCK_MODE) {
    console.log(`[MOCK SMS] To: ${formattedPhone}`);
    console.log(`[MOCK SMS] Message: ${message}`);
    return {
      success: true,
      mock: true,
      messageId: `mock_sms_${Date.now()}`,
      to: formattedPhone,
      message
    };
  }

  try {
    const response = await axios.post(`${GHL_BASE_URL}/conversations/messages`, {
      type: 'SMS',
      phone: formattedPhone,
      message,
      locationId: GHL_LOCATION_ID
    }, {
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      timeout: 30000
    });

    console.log(`[Notifications] SMS sent to ${formattedPhone}, template: ${templateKey}`);
    return {
      success: true,
      messageId: response.data?.id,
      to: formattedPhone
    };
  } catch (error) {
    console.error(`[Notifications] SMS failed to ${formattedPhone}:`, error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

/**
 * High-level notification functions
 */
const NotificationService = {
  /**
   * Notify student that their account is activated
   */
  async notifyAccountActivation(student, user) {
    const data = {
      studentName: user.name,
      loginUrl: process.env.FRONTEND_URL || 'https://plan4growth.uk/login',
      enrollmentNumber: student.enrollment_number
    };

    const results = {
      email: await sendEmail(user.email, 'ACCOUNT_ACTIVATION', data)
    };

    // Also send SMS if WhatsApp number available
    if (student.whatsapp_number) {
      results.sms = await sendSMS(student.whatsapp_number, 'ACCOUNT_ACTIVATION', data);
    }

    return results;
  },

  /**
   * Notify student of successful payment
   */
  async notifyPaymentConfirmation(student, user, paymentDetails) {
    const data = {
      studentName: user.name,
      amount: paymentDetails.amount,
      transactionId: paymentDetails.paymentId,
      enrollmentNumber: student.enrollment_number
    };

    const results = {
      email: await sendEmail(user.email, 'PAYMENT_CONFIRMATION', data)
    };

    if (student.whatsapp_number) {
      results.sms = await sendSMS(student.whatsapp_number, 'PAYMENT_CONFIRMATION', data);
    }

    return results;
  },

  /**
   * Notify student when a document is uploaded by rep
   */
  async notifyDocumentUploaded(student, user, documentType) {
    const data = {
      studentName: user.name,
      documentType: documentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    };

    return {
      email: await sendEmail(user.email, 'DOCUMENT_UPLOADED', data)
    };
  },

  /**
   * Notify student when a document is approved
   */
  async notifyDocumentApproved(student, user, documentType, allDocumentsApproved = false) {
    const data = {
      studentName: user.name,
      documentType: documentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      allDocumentsApproved
    };

    const results = {
      email: await sendEmail(user.email, 'DOCUMENT_APPROVED', data)
    };

    // Send SMS only if all documents approved (important milestone)
    if (allDocumentsApproved && student.whatsapp_number) {
      results.sms = await sendSMS(student.whatsapp_number, 'DOCUMENT_APPROVED', data);
    }

    return results;
  },

  /**
   * Notify student when application is approved (all docs verified)
   */
  async notifyApplicationApproved(student, user) {
    const data = {
      studentName: user.name,
      loginUrl: process.env.FRONTEND_URL || 'https://plan4growth.uk/login'
    };

    const results = {
      email: await sendEmail(user.email, 'APPLICATION_APPROVED', data)
    };

    if (student.whatsapp_number) {
      results.sms = await sendSMS(student.whatsapp_number, 'APPLICATION_APPROVED', data);
    }

    return results;
  },

  /**
   * Get notification configuration status
   */
  getConfig() {
    return {
      mode: IS_MOCK_MODE ? 'mock' : 'live',
      provider: 'GoHighLevel',
      configured: !IS_MOCK_MODE,
      message: IS_MOCK_MODE
        ? 'Running in MOCK mode. Configure GOHIGHLEVEL_API_KEY and GOHIGHLEVEL_LOCATION_ID for live notifications.'
        : 'GoHighLevel notifications are configured and active.'
    };
  },

  // Expose raw functions for custom use
  sendEmail,
  sendSMS
};

module.exports = NotificationService;
