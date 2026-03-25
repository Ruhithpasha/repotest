const express = require('express');
const router = express.Router();
const { Student, User } = require('../../models/pg');
const ghlService = require('../../services/GHLService');

// POST /api/webhooks/ghl
router.post('/', async (req, res) => {
  try {
    const signature = req.headers['x-ghl-signature'];
    const isValid = ghlService.verifyWebhookSignature(req.body, signature);
    if (!isValid) return res.status(401).json({ message: 'Invalid signature' });

    const payload = JSON.parse(req.body.toString());
    const { type, contactId, appointmentId, startTime, zoomJoinUrl } = payload;

    const student = await Student.findOne({
      where: { ghl_contact_id: contactId },
      include: [{ model: User, as: 'user' }]
    });

    if (!student) return res.status(404).json({ message: 'Student not found' });

    if (type === 'AppointmentCreated') {
      await student.update({
        status: 'call_booked',
        call_booked_at: startTime ? new Date(startTime) : new Date(),
        zoom_join_url: zoomJoinUrl || null
      });

      await ghlService.sendCallConfirmationEmail(
        {
          ghl_contact_id: student.ghl_contact_id,
          email: student.user.email,
          name: student.user.name || student.user.first_name
        },
        {
          startTime,
          zoomUrl: zoomJoinUrl
        }
      );
    }

    if (type === 'AppointmentCompleted') {
      await student.update({
        status: 'interview_completed',
        call_completed_at: new Date()
      });
    }

    return res.json({ message: 'Webhook processed' });
  } catch (err) {
    console.error('GHL webhook error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
