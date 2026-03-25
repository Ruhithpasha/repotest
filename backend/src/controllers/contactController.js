const { v4: uuidv4 } = require('uuid');
const { ContactRepository } = require('../repositories');
const GHLService = require('../services/GHLService');

// Submit contact form
exports.submitContact = async (req, res) => {
  try {
    const { name, email, whatsapp, message } = req.body;

    // 1. Save to database
    const contactId = `contact_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    await ContactRepository.createContact({
      contact_id: contactId,
      name,
      email,
      whatsapp,
      message,
      status: 'new'
    });

    // 2. GHL: create contact + notify team via SMS (non-blocking)
    GHLService.sendEnquiryNotification({ name, email, whatsapp, message })
      .then((result) => {
        if (result) console.log(`[GHL] Enquiry notification sent for contact: ${contactId}`);
      })
      .catch((err) => {
        console.error('[GHL] Enquiry notification failed (non-blocking):', err.message);
      });

    res.json({ message: 'Contact form submitted successfully', contact_id: contactId });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ detail: 'Failed to submit contact form' });
  }
};

// Get all contacts (admin only)
exports.getContacts = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Admin access required' });
    }

    const contacts = await ContactRepository.findAllSorted();
    res.json(contacts);
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ detail: 'Failed to get contacts' });
  }
};
