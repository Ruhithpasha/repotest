const axios = require('axios');
const crypto = require('crypto');

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_BOOKING_URL = process.env.GHL_BOOKING_URL;
const GHL_WEBHOOK_SECRET = process.env.GHL_WEBHOOK_SECRET;
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const IS_MOCK_MODE = !GHL_API_KEY || !GHL_LOCATION_ID || GHL_API_KEY === 'mock';

const NOTIFICATION_EMAILS = [
  process.env.NOTIFICATION_EMAIL_1,
  process.env.NOTIFICATION_EMAIL_2,
  process.env.NOTIFICATION_EMAIL_3
].filter(Boolean);

const ghlHeaders = {
  Authorization: `Bearer ${GHL_API_KEY}`,
  'Content-Type': 'application/json',
  Version: '2021-07-28'
};

// 1. Create or update GHL contact
exports.createOrUpdateContact = async (studentData) => {
  if (IS_MOCK_MODE) {
    console.log('[GHL MOCK] createOrUpdateContact:', studentData.email);
    return `mock_contact_${Date.now()}`;
  }

  const nameParts = (studentData.name || '').trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  try {
    const response = await axios.post(
      `${GHL_BASE_URL}/contacts/`,
      {
        firstName,
        lastName,
        email: studentData.email,
        phone: studentData.phone || studentData.whatsapp_number,
        locationId: GHL_LOCATION_ID,
        tags: ['plan4growth-applicant'],
        customFields: [
          { key: 'student_id', field_value: studentData.student_id },
          { key: 'registration_source', field_value: studentData.registration_source || 'self' }
        ]
      },
      { headers: ghlHeaders }
    );
    return response.data?.contact?.id || response.data?.id;
  } catch (err) {
    console.error('[GHL] createOrUpdateContact error:', err.response?.data || err.message);
    throw err;
  }
};

// 2. Send booking link email to student
exports.sendBookingEmail = async (studentData, ghl_contact_id) => {
  const bookingUrl = studentData.bookingUrl || GHL_BOOKING_URL || 'https://api.leadconnectorhq.com/widget/bookings/gm-dental-academy-free-strategy-call';
  const firstName = studentData.firstName || (studentData.name || 'Applicant').split(' ')[0];

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Georgia, serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #0A1628; padding: 32px 40px; text-align: center; }
    .header h1 { color: #C9A84C; font-size: 24px; margin: 0; letter-spacing: 1px; }
    .header p { color: #ffffff; margin: 8px 0 0; font-size: 13px; opacity: 0.8; }
    .body { padding: 40px; }
    .body h2 { color: #0A1628; font-size: 20px; }
    .body p { line-height: 1.7; font-size: 15px; color: #555; margin-bottom: 16px; }
    .cta-block { text-align: center; margin: 32px 0; }
    .cta-button { display: inline-block; background: #C9A84C; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: bold; }
    .note-box { background: #f9f5ec; border-left: 4px solid #C9A84C; padding: 16px 20px; border-radius: 4px; margin: 24px 0; }
    .note-box p { margin: 0; font-size: 14px; color: #6b5c2e; }
    .footer { background: #0A1628; padding: 24px 40px; text-align: center; }
    .footer p { color: #aaa; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Plan4Growth Academy</h1>
      <p>Dental Excellence Programme</p>
    </div>
    <div class="body">
      <h2>Dear ${firstName},</h2>
      <p>Congratulations! Your application to Plan4Growth Academy has been reviewed and <strong>approved</strong>.</p>
      <p>The next step is a short qualification call with our admissions team. This call helps us understand your goals and ensure our programme is the right fit for you.</p>
      <div class="cta-block">
        <a href="${bookingUrl}" class="cta-button">Book Your Interview Call</a>
      </div>
      <div class="note-box">
        <p><strong>Important:</strong> This is a qualification call with our admissions team. Once you pass, you will be able to enrol and pay your course fees to secure your place.</p>
      </div>
      <p>Please book your call within <strong>48 hours</strong> to secure your spot. Slots are limited.</p>
      <p>If you have any questions, contact us at <a href="mailto:info@planforgrowth.uk">info@planforgrowth.uk</a>.</p>
      <p>Warm regards,<br><strong>The Admissions Team</strong><br>Plan4Growth Academy</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Plan4Growth Academy. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  if (IS_MOCK_MODE) {
    console.log(`[GHL MOCK] sendBookingEmail to: ${studentData.email}, url: ${bookingUrl}`);
    return true;
  }

  try {
    const response = await axios.post(
      `${GHL_BASE_URL}/conversations/messages`,
      {
        type: 'Email',
        contactId: ghl_contact_id,
        subject: 'Your Interview is Ready to Book — Plan4Growth Academy',
        html: emailHtml
      },
      { headers: ghlHeaders }
    );
    return response.data;
  } catch (err) {
    console.error('[GHL] sendBookingEmail error:', err.response?.data || err.message);
    throw err;
  }
};

// 3. Notify the internal team
exports.sendNotificationToTeam = async (studentData, eventType) => {
  const subject = `New Application Approved — Booking Link Sent: ${studentData.name}`;
  const body = `
A student application has been approved and a booking link has been sent.

Student Details:
- Name: ${studentData.name}
- Email: ${studentData.email}
- Phone: ${studentData.phone || studentData.whatsapp_number || 'N/A'}
- Registration Source: ${studentData.registration_source || 'self'}
- Student ID: ${studentData.student_id}
- Approved At: ${new Date().toISOString()}
- Event: ${eventType}

Log in to the admin portal to view the full application.
  `.trim();

  if (IS_MOCK_MODE) {
    console.log(`[GHL MOCK] sendNotificationToTeam — event: ${eventType}, student: ${studentData.email}`);
    return true;
  }

  const promises = NOTIFICATION_EMAILS.map(async (email) => {
    try {
      await axios.post(
        `${GHL_BASE_URL}/conversations/messages`,
        { type: 'Email', toEmail: email, subject, body },
        { headers: ghlHeaders }
      );
    } catch (err) {
      console.error(`[GHL] team notify error for ${email}:`, err.response?.data || err.message);
    }
  });

  await Promise.allSettled(promises);
  return true;
};

// 4. Send call confirmation to student after GHL webhook fires
exports.sendCallConfirmationEmail = async (studentData, appointmentData) => {
  const firstName = (studentData.name || 'Applicant').split(' ')[0];
  const appointmentTime = appointmentData.startTime
    ? new Date(appointmentData.startTime).toLocaleString('en-GB', {
        dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/London'
      })
    : 'your scheduled time';

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Georgia, serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .header { background: #0A1628; padding: 32px 40px; text-align: center; }
    .header h1 { color: #C9A84C; font-size: 24px; margin: 0; }
    .header p { color: #fff; margin: 8px 0 0; font-size: 13px; opacity: 0.8; }
    .body { padding: 40px; }
    .body h2 { color: #0A1628; }
    .body p { line-height: 1.7; font-size: 15px; color: #555; }
    .details-box { background: #f0f4ff; border: 1px solid #ccd6f6; border-radius: 6px; padding: 20px 24px; margin: 24px 0; }
    .details-box p { margin: 6px 0; font-size: 14px; }
    .cta-block { text-align: center; margin: 28px 0; }
    .cta-button { display: inline-block; background: #0A1628; color: #fff; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-size: 15px; font-weight: bold; }
    .footer { background: #0A1628; padding: 24px 40px; text-align: center; }
    .footer p { color: #aaa; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Plan4Growth Academy</h1>
      <p>Your Call is Confirmed</p>
    </div>
    <div class="body">
      <h2>Dear ${firstName},</h2>
      <p>Your interview call has been <strong>confirmed</strong>. Here are your details:</p>
      <div class="details-box">
        <p><strong>Date &amp; Time:</strong> ${appointmentTime}</p>
        ${appointmentData.zoomUrl ? `<p><strong>Zoom Link:</strong> <a href="${appointmentData.zoomUrl}">${appointmentData.zoomUrl}</a></p>` : ''}
      </div>
      ${appointmentData.zoomUrl ? `<div class="cta-block"><a href="${appointmentData.zoomUrl}" class="cta-button">Join Zoom Call</a></div>` : ''}
      <p><strong>What to expect:</strong></p>
      <ul style="line-height: 2; color: #555;">
        <li>A 20–30 minute call with our admissions team</li>
        <li>We will discuss your dental background and career goals</li>
        <li>You will learn about the Level 7 Implantology programme</li>
        <li>If accepted, you will receive enrolment instructions immediately</li>
      </ul>
      <p>Please be on time and ensure you have a stable internet connection.</p>
      <p>Warm regards,<br><strong>The Admissions Team</strong><br>Plan4Growth Academy</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Plan4Growth Academy. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  if (IS_MOCK_MODE) {
    console.log(`[GHL MOCK] sendCallConfirmationEmail to: ${studentData.email}`);
    return true;
  }

  try {
    const response = await axios.post(
      `${GHL_BASE_URL}/conversations/messages`,
      {
        type: 'Email',
        contactId: studentData.ghl_contact_id,
        subject: 'Your Interview Call is Confirmed — Plan4Growth Academy',
        html: emailHtml
      },
      { headers: ghlHeaders }
    );
    return response.data;
  } catch (err) {
    console.error('[GHL] sendCallConfirmationEmail error:', err.response?.data || err.message);
    throw err;
  }
};

// 5. Send qualification result email
exports.sendQualificationEmail = async (studentData, passed, notes) => {
  const firstName = (studentData.name || 'Applicant').split(' ')[0];

  let subject, emailHtml;

  if (passed) {
    subject = 'Congratulations — You Have Been Accepted | Plan4Growth Academy';
    emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Georgia, serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .header { background: #0A1628; padding: 32px 40px; text-align: center; }
    .header h1 { color: #C9A84C; font-size: 24px; margin: 0; }
    .body { padding: 40px; }
    .body p { line-height: 1.7; font-size: 15px; color: #555; }
    .cta-block { text-align: center; margin: 32px 0; }
    .cta-button { display: inline-block; background: #C9A84C; color: #fff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: bold; }
    .footer { background: #0A1628; padding: 24px 40px; text-align: center; }
    .footer p { color: #aaa; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Plan4Growth Academy</h1></div>
    <div class="body">
      <h2 style="color:#0A1628;">Dear ${firstName},</h2>
      <p>We are delighted to inform you that you have <strong>passed your qualification interview</strong> and have been accepted onto the Level 7 Implantology Programme at Plan4Growth Academy.</p>
      <p>To secure your place, please proceed to pay your course fees.</p>
      <div class="cta-block">
        <a href="${process.env.PAYMENT_URL || '#'}" class="cta-button">Pay Course Fees &amp; Enrol</a>
      </div>
      <p>Please complete payment within <strong>5 working days</strong> to guarantee your spot in the upcoming cohort.</p>
      <p>Warm regards,<br><strong>The Admissions Team</strong><br>Plan4Growth Academy</p>
    </div>
    <div class="footer"><p>&copy; ${new Date().getFullYear()} Plan4Growth Academy.</p></div>
  </div>
</body>
</html>`;
  } else {
    subject = 'Your Plan4Growth Academy Application — Update';
    emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Georgia, serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .header { background: #0A1628; padding: 32px 40px; text-align: center; }
    .header h1 { color: #C9A84C; font-size: 24px; margin: 0; }
    .body { padding: 40px; }
    .body p { line-height: 1.7; font-size: 15px; color: #555; }
    .footer { background: #0A1628; padding: 24px 40px; text-align: center; }
    .footer p { color: #aaa; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Plan4Growth Academy</h1></div>
    <div class="body">
      <h2 style="color:#0A1628;">Dear ${firstName},</h2>
      <p>Thank you for taking the time to speak with our admissions team.</p>
      <p>After careful consideration, we are unable to offer you a place at this time. We appreciate your interest in Plan4Growth Academy.</p>
      ${notes ? `<p><em>${notes}</em></p>` : ''}
      <p>We encourage you to apply again in the future. Questions? Contact us at <a href="mailto:info@planforgrowth.uk">info@planforgrowth.uk</a>.</p>
      <p>Warm regards,<br><strong>The Admissions Team</strong><br>Plan4Growth Academy</p>
    </div>
    <div class="footer"><p>&copy; ${new Date().getFullYear()} Plan4Growth Academy.</p></div>
  </div>
</body>
</html>`;
  }

  if (IS_MOCK_MODE) {
    console.log(`[GHL MOCK] sendQualificationEmail to: ${studentData.email}, passed: ${passed}`);
    return true;
  }

  try {
    const response = await axios.post(
      `${GHL_BASE_URL}/conversations/messages`,
      {
        type: 'Email',
        contactId: studentData.ghl_contact_id,
        subject,
        html: emailHtml
      },
      { headers: ghlHeaders }
    );
    return response.data;
  } catch (err) {
    console.error('[GHL] sendQualificationEmail error:', err.response?.data || err.message);
    throw err;
  }
};

// 6. Verify incoming GHL webhook signature
exports.verifyWebhookSignature = (rawBody, signature) => {
  if (!GHL_WEBHOOK_SECRET) return true;
  try {
    const expected = crypto
      .createHmac('sha256', GHL_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature || '', 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
};

// 7. Send enquiry notification to team (SMS + Email) when contact form is submitted
exports.sendEnquiryNotification = async ({ name, email, whatsapp, message }) => {
  const TEAM_PHONE = process.env.TEAM_WHATSAPP_NUMBER || '+447352062709';
  const smsBody = `New website enquiry:\nName: ${name}\nEmail: ${email}\nPhone: ${whatsapp || 'N/A'}\nMessage: ${message.slice(0, 200)}`;
  
  // Email notification content
  const emailSubject = `New Website Enquiry from ${name}`;
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Georgia, serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #0A1628; padding: 24px 40px; text-align: center; }
    .header h1 { color: #C9A84C; font-size: 20px; margin: 0; }
    .body { padding: 32px 40px; }
    .body h2 { color: #0A1628; font-size: 18px; margin-bottom: 20px; }
    .detail-row { display: flex; margin-bottom: 12px; }
    .detail-label { font-weight: bold; color: #333; min-width: 100px; }
    .detail-value { color: #555; }
    .message-box { background: #f9f9f9; border-left: 4px solid #C9A84C; padding: 16px 20px; margin-top: 20px; }
    .message-box p { margin: 0; color: #444; line-height: 1.6; }
    .footer { background: #0A1628; padding: 20px 40px; text-align: center; }
    .footer p { color: #aaa; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Website Enquiry</h1>
    </div>
    <div class="body">
      <h2>Contact Details</h2>
      <div class="detail-row">
        <span class="detail-label">Name:</span>
        <span class="detail-value">${name}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Email:</span>
        <span class="detail-value"><a href="mailto:${email}">${email}</a></span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Phone:</span>
        <span class="detail-value">${whatsapp || 'Not provided'}</span>
      </div>
      <div class="message-box">
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      </div>
    </div>
    <div class="footer">
      <p>Submitted at ${new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/London' })}</p>
    </div>
  </div>
</body>
</html>`;

  if (IS_MOCK_MODE) {
    console.log('[GHL MOCK] sendEnquiryNotification - would SMS team:', TEAM_PHONE);
    console.log('[GHL MOCK] sendEnquiryNotification - would email team:', NOTIFICATION_EMAILS);
    return true;
  }

  try {
    // Step 1: Create/upsert a contact in GHL for the enquirer
    const nameParts = (name || '').trim().split(' ');
    const contactRes = await axios.post(
      `${GHL_BASE_URL}/contacts/`,
      {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email,
        phone: whatsapp || undefined,
        locationId: GHL_LOCATION_ID,
        tags: ['website-enquiry']
      },
      { headers: ghlHeaders }
    );

    const contactId = contactRes.data?.contact?.id || contactRes.data?.id;

    // Step 2: Look up or create a contact for the team phone to send them an SMS/WhatsApp
    let teamContactId;
    try {
      const teamContactRes = await axios.post(
        `${GHL_BASE_URL}/contacts/`,
        {
          firstName: 'Plan4Growth',
          lastName: 'Team',
          phone: TEAM_PHONE,
          locationId: GHL_LOCATION_ID,
          tags: ['internal-team']
        },
        { headers: ghlHeaders }
      );
      teamContactId = teamContactRes.data?.contact?.id || teamContactRes.data?.id;
    } catch (err) {
      // If duplicate contact error, extract existing contact ID from error response
      if (err.response?.data?.meta?.contactId) {
        teamContactId = err.response.data.meta.contactId;
        console.log(`[GHL] Using existing team contact: ${teamContactId}`);
      } else {
        console.error('[GHL] Team contact lookup error:', err.response?.data || err.message);
      }
    }

    // Step 3: Send SMS/WhatsApp to team contact
    if (teamContactId) {
      await axios.post(
        `${GHL_BASE_URL}/conversations/messages`,
        {
          type: 'SMS',
          contactId: teamContactId,
          message: smsBody
        },
        { headers: ghlHeaders }
      );
      console.log(`[GHL] SMS notification sent to team: ${TEAM_PHONE}`);
    }

    // Step 4: Send email notifications to all configured team emails
    const emailPromises = NOTIFICATION_EMAILS.map(async (teamEmail) => {
      try {
        let teamEmailContactId;
        
        // First, try to create a contact for this team email
        try {
          const teamEmailContact = await axios.post(
            `${GHL_BASE_URL}/contacts/`,
            {
              firstName: 'Plan4Growth',
              lastName: 'Team',
              email: teamEmail,
              locationId: GHL_LOCATION_ID,
              tags: ['internal-team-email']
            },
            { headers: ghlHeaders }
          );
          teamEmailContactId = teamEmailContact.data?.contact?.id || teamEmailContact.data?.id;
        } catch (createErr) {
          // If duplicate contact error, extract existing contact ID from error response
          if (createErr.response?.data?.meta?.contactId) {
            teamEmailContactId = createErr.response.data.meta.contactId;
            console.log(`[GHL] Using existing contact for ${teamEmail}: ${teamEmailContactId}`);
          } else {
            throw createErr;
          }
        }
        
        if (teamEmailContactId) {
          await axios.post(
            `${GHL_BASE_URL}/conversations/messages`,
            {
              type: 'Email',
              contactId: teamEmailContactId,
              subject: emailSubject,
              html: emailHtml
            },
            { headers: ghlHeaders }
          );
          console.log(`[GHL] Email notification sent to: ${teamEmail}`);
        }
      } catch (err) {
        console.error(`[GHL] Email notification error for ${teamEmail}:`, err.response?.data || err.message);
      }
    });

    await Promise.allSettled(emailPromises);

    return { contactId };
  } catch (err) {
    console.error('[GHL] sendEnquiryNotification error:', err.response?.data || err.message);
    // Non-blocking — swallow error so contact form still succeeds
    return null;
  }
};
