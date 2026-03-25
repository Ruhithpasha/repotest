const express = require('express');
const router = express.Router();
const { Student, User } = require('../../models/pg');
const ghlService = require('../../services/GHLService');
const authMiddleware = require('../../middleware/auth');

// POST /api/crm/students/:studentId/send-booking-link
router.post('/:studentId/send-booking-link', authMiddleware, async (req, res) => {
  try {
    // Check role - only manager or rep can send booking links
    if (!['manager', 'rep', 'sales_user', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { studentId } = req.params;
    const student = await Student.findByPk(studentId, { include: [{ model: User, as: 'user' }] });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const bookingUrl = process.env.GHL_BOOKING_URL || 'https://api.leadconnectorhq.com/widget/bookings/gm-dental-academy-free-strategy-call';
    await ghlService.sendBookingEmail({
      contactId: student.ghl_contact_id,
      email: student.user.email,
      firstName: student.user.first_name || student.user.name?.split(' ')[0],
      bookingUrl
    }, student.ghl_contact_id);

    await student.update({
      booking_link_sent: true,
      booking_link_sent_at: new Date(),
      status: 'call_booking_sent'
    });

    return res.json({ message: 'Booking link sent', student });
  } catch (err) {
    console.error('sendBookingLink error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
