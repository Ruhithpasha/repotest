const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const OtpLog = require('../models/OtpLog');

const OTP_EXPIRY_MINUTES = 10;
const MAX_RESEND_ATTEMPTS = 3;
const MAX_WRONG_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

// Generate 6-digit OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP (mocked for now)
exports.sendOtp = async (req, res) => {
  try {
    const { contact, contact_type } = req.body;

    if (!contact || !contact_type) {
      return res.status(400).json({ detail: 'Contact and contact_type required' });
    }

    // Check for existing OTP and lockout
    const existingOtp = await OtpLog.findOne({ 
      contact, 
      contact_type,
      verified: false
    }).sort({ created_at: -1 });

    if (existingOtp) {
      // Check if locked
      if (existingOtp.locked_until && existingOtp.locked_until > new Date()) {
        const lockRemaining = Math.ceil((existingOtp.locked_until - new Date()) / 1000);
        return res.status(429).json({ 
          detail: `Too many attempts. Try again in ${lockRemaining} seconds`,
          locked_until: existingOtp.locked_until
        });
      }

      // Check resend limit
      if (existingOtp.resend_count >= MAX_RESEND_ATTEMPTS) {
        return res.status(429).json({ detail: 'Maximum resend attempts reached' });
      }

      // Check cooldown
      const timeSinceLastSend = (new Date() - existingOtp.created_at) / 1000;
      if (timeSinceLastSend < RESEND_COOLDOWN_SECONDS) {
        const waitTime = Math.ceil(RESEND_COOLDOWN_SECONDS - timeSinceLastSend);
        return res.status(429).json({ 
          detail: `Please wait ${waitTime} seconds before requesting another OTP`,
          retry_after: waitTime
        });
      }
    }

    // Generate new OTP
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Update existing or create new
    if (existingOtp) {
      existingOtp.otp_hash = otpHash;
      existingOtp.expires_at = expiresAt;
      existingOtp.resend_count += 1;
      existingOtp.attempt_count = 0;
      existingOtp.created_at = new Date();
      await existingOtp.save();
    } else {
      await OtpLog.create({
        contact,
        contact_type,
        otp_hash: otpHash,
        expires_at: expiresAt
      });
    }

    // TODO: Send actual OTP via SendGrid/Twilio
    if (contact_type === 'email') {
      console.log(`[MOCKED] Sending OTP ${otp} to email: ${contact}`);
    } else {
      console.log(`[MOCKED] Sending OTP ${otp} to WhatsApp: ${contact}`);
    }

    res.json({ 
      message: 'OTP sent successfully',
      expires_in: OTP_EXPIRY_MINUTES * 60,
      // Include OTP in response for testing (remove in production)
      _test_otp: otp
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ detail: 'Failed to send OTP' });
  }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { contact, contact_type, otp } = req.body;

    if (!contact || !contact_type || !otp) {
      return res.status(400).json({ detail: 'Contact, contact_type, and OTP required' });
    }

    const otpLog = await OtpLog.findOne({ 
      contact, 
      contact_type,
      verified: false
    }).sort({ created_at: -1 });

    if (!otpLog) {
      return res.status(400).json({ detail: 'No OTP found. Please request a new one.' });
    }

    // Check if locked
    if (otpLog.locked_until && otpLog.locked_until > new Date()) {
      const lockRemaining = Math.ceil((otpLog.locked_until - new Date()) / 1000);
      return res.status(429).json({ 
        detail: `Too many wrong attempts. Try again in ${lockRemaining} seconds`,
        locked_until: otpLog.locked_until
      });
    }

    // Check expiry
    if (otpLog.expires_at < new Date()) {
      return res.status(400).json({ detail: 'OTP expired. Please request a new one.' });
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, otpLog.otp_hash);

    if (!isValid) {
      otpLog.attempt_count += 1;
      
      // Lock if too many attempts
      if (otpLog.attempt_count >= MAX_WRONG_ATTEMPTS) {
        otpLog.locked_until = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
        await otpLog.save();
        return res.status(429).json({ 
          detail: 'Too many wrong attempts. Account locked for 15 minutes.',
          locked_until: otpLog.locked_until
        });
      }

      await otpLog.save();
      return res.status(400).json({ 
        detail: 'Invalid OTP',
        attempts_remaining: MAX_WRONG_ATTEMPTS - otpLog.attempt_count
      });
    }

    // Mark as verified
    otpLog.verified = true;
    await otpLog.save();

    res.json({ 
      message: 'OTP verified successfully',
      verified: true
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ detail: 'Failed to verify OTP' });
  }
};
