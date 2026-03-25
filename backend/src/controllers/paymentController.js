require('dotenv').config();
const Stripe = require('stripe');
const { v4: uuidv4 } = require('uuid');
const { 
  StudentRepository, 
  StudentPaymentRepository, 
  UserRepository,
  CommissionRepository 
} = require('../repositories');
const NotificationService = require('../services/notificationService');

// Check if Stripe is configured
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
const IS_MOCK_MODE = !STRIPE_SECRET_KEY || STRIPE_SECRET_KEY === 'sk_test_emergent' || STRIPE_SECRET_KEY.startsWith('sk_test_mock');

// Initialize Stripe only if we have a real key
let stripe = null;
const getStripe = () => {
  if (IS_MOCK_MODE) {
    return null;
  }
  if (!stripe && STRIPE_SECRET_KEY) {
    stripe = new Stripe(STRIPE_SECRET_KEY);
  }
  return stripe;
};

// Course fee (fixed price - backend controlled for security)
const COURSE_FEE_GBP = 6250.00;
const COMMISSION_RATE = 0.04; // 4%

// Log mode on startup
console.log(`[Stripe] Mode: ${IS_MOCK_MODE ? 'MOCK (development)' : 'LIVE'}`);

/**
 * Create Stripe Checkout Session
 * POST /api/payments/checkout/session
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const { student_id, origin_url } = req.body;

    if (!student_id || !origin_url) {
      return res.status(400).json({ detail: 'student_id and origin_url are required' });
    }

    // Get student and verify they can make payment
    const student = await StudentRepository.findByStudentId(student_id);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found' });
    }

    // Student must be approved or payment_pending
    if (!['approved', 'payment_pending'].includes(student.status)) {
      return res.status(400).json({ 
        detail: 'Student must be approved before making payment',
        current_status: student.status
      });
    }

    // Get user info
    const user = await UserRepository.findByUserId(student.user_id);
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Calculate remaining amount
    const totalPaid = await StudentPaymentRepository.sumPaidByStudent(student_id);
    const amountDue = Math.max(0, COURSE_FEE_GBP - totalPaid);

    if (amountDue <= 0) {
      return res.status(400).json({ detail: 'No payment due. Student has already paid in full.' });
    }

    // Create URLs
    const successUrl = `${origin_url}/portal/student/payments?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin_url}/portal/student/payments?cancelled=true`;

    const paymentId = `pay_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    let session;

    if (IS_MOCK_MODE) {
      // MOCK MODE - Create fake session
      const mockSessionId = `cs_mock_${uuidv4().replace(/-/g, '').slice(0, 24)}`;
      console.log(`[MOCK] Creating checkout session: ${mockSessionId} for £${amountDue}`);
      
      session = {
        id: mockSessionId,
        url: `${origin_url}/portal/student/payments?session_id=${mockSessionId}&mock=true`,
        payment_status: 'unpaid',
        status: 'open',
        amount_total: Math.round(amountDue * 100)
      };
    } else {
      // LIVE MODE - Create real Stripe session
      session = await getStripe().checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: 'Level 7 Diploma in Dental Implantology',
                description: `Plan4Growth Academy - Course Fee${student.enrollment_number ? ` (${student.enrollment_number})` : ''}`,
              },
              unit_amount: Math.round(amountDue * 100), // Stripe expects pence
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: user.email,
        metadata: {
          student_id: student.student_id,
          user_id: user.user_id,
          enrollment_number: student.enrollment_number || '',
          rep_id: student.rep_id || '',
          payment_id: paymentId
        }
      });
    }

    // Create payment record
    await StudentPaymentRepository.createPayment({
      payment_id: paymentId,
      student_id: student.student_id,
      stripe_payment_intent_id: session.id,
      amount_gbp: amountDue,
      payment_type: 'full',
      status: 'pending',
      payment_method: 'stripe',
      notes: IS_MOCK_MODE ? 'Mock payment - development mode' : null,
      reference_number: student.enrollment_number
    });

    // Update student status to payment_pending if approved
    if (student.status === 'approved') {
      await StudentRepository.updateStatus(student_id, 'payment_pending');
    }

    res.json({
      url: session.url,
      session_id: session.id,
      payment_id: paymentId,
      amount_gbp: amountDue,
      is_mock: IS_MOCK_MODE,
      _note: IS_MOCK_MODE ? 'MOCK MODE: Payment will be simulated. Configure STRIPE_SECRET_KEY for live payments.' : undefined
    });

  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ detail: error.message || 'Failed to create checkout session' });
  }
};

/**
 * Get Checkout Status (polling endpoint)
 * GET /api/payments/checkout/status/:sessionId
 */
exports.getCheckoutStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ detail: 'session_id is required' });
    }

    // Find payment record
    const payment = await StudentPaymentRepository.findByStripeSessionId(sessionId);
    
    let session;
    const isMockSession = IS_MOCK_MODE || sessionId.startsWith('cs_mock_');

    if (isMockSession) {
      // MOCK MODE - Simulate successful payment
      console.log(`[MOCK] Checking payment status for session: ${sessionId}`);
      session = {
        id: sessionId,
        status: 'complete',
        payment_status: 'paid',
        amount_total: Math.round(COURSE_FEE_GBP * 100),
        currency: 'gbp',
        metadata: payment ? { student_id: payment.student_id } : {}
      };
    } else {
      // LIVE MODE - Get from Stripe
      session = await getStripe().checkout.sessions.retrieve(sessionId);
    }

    // Process payment if successful
    if (payment && session.payment_status === 'paid' && payment.status !== 'paid') {
      // Update payment status
      await StudentPaymentRepository.updatePayment(payment.payment_id, {
        status: 'paid',
        paid_at: new Date(),
        receipt_url: `https://dashboard.stripe.com/payments/${session.payment_intent || sessionId}`
      });

      // Get student and enroll them
      const student = await StudentRepository.findByStudentId(payment.student_id);
      if (student && student.status !== 'enrolled') {
        // Check total paid
        const totalPaid = await StudentPaymentRepository.sumPaidByStudent(student.student_id);

        if (totalPaid >= COURSE_FEE_GBP) {
          // Enroll student
          await StudentRepository.updateStatus(student.student_id, 'enrolled', {
            enrolled_at: new Date()
          });

          // Send payment confirmation notification
          const studentUser = await UserRepository.findByUserId(student.user_id);
          if (studentUser) {
            NotificationService.notifyPaymentConfirmation(student, studentUser, {
              amount: COURSE_FEE_GBP,
              paymentId: payment.payment_id
            }).catch(err => console.error('[Payment] Notification error:', err));
          }

          // Create commission for rep
          if (student.rep_id) {
            const commissionExists = await CommissionRepository.existsForStudent(student.student_id);
            if (!commissionExists) {
              await CommissionRepository.createCommission({
                commission_id: `comm_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
                rep_id: student.rep_id,
                student_id: student.student_id,
                payment_id: payment.payment_id,
                course_fee_gbp: COURSE_FEE_GBP,
                commission_rate: COMMISSION_RATE,
                commission_amount_gbp: COURSE_FEE_GBP * COMMISSION_RATE,
                status: 'pending'
              });
              console.log(`[Payment] Commission created for rep ${student.rep_id}: £${COURSE_FEE_GBP * COMMISSION_RATE}`);
            }
          }

          console.log(`[Payment] Student ${student.student_id} enrolled successfully`);
        }
      }
    } else if (payment && session.status === 'expired' && payment.status === 'pending') {
      await StudentPaymentRepository.updatePayment(payment.payment_id, {
        status: 'failed'
      });
    }

    // Get updated student status
    const student = payment ? await StudentRepository.findByStudentId(payment.student_id) : null;

    res.json({
      status: session.status,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
      student_enrolled: student?.status === 'enrolled',
      is_mock: isMockSession
    });

  } catch (error) {
    console.error('Get checkout status error:', error);
    res.status(500).json({ detail: error.message || 'Failed to get checkout status' });
  }
};

/**
 * Stripe Webhook Handler
 * POST /api/payments/webhook/stripe
 */
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // If in mock mode, just acknowledge
  if (IS_MOCK_MODE) {
    console.log('[MOCK] Webhook received (ignored in mock mode)');
    return res.json({ received: true, mode: 'mock' });
  }

  let event;

  try {
    if (webhookSecret && sig) {
      event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log(`[Webhook] checkout.session.completed: ${session.id}`);
        
        const payment = await StudentPaymentRepository.findByStripeSessionId(session.id);
        
        if (payment && payment.status !== 'paid') {
          await StudentPaymentRepository.updatePayment(payment.payment_id, {
            status: 'paid',
            paid_at: new Date()
          });

          const student = await StudentRepository.findByStudentId(payment.student_id);
          if (student && student.status !== 'enrolled') {
            await StudentRepository.updateStatus(student.student_id, 'enrolled', {
              enrolled_at: new Date()
            });

            if (student.rep_id) {
              const commissionExists = await CommissionRepository.existsForStudent(student.student_id);
              if (!commissionExists) {
                await CommissionRepository.createCommission({
                  commission_id: `comm_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
                  rep_id: student.rep_id,
                  student_id: student.student_id,
                  payment_id: payment.payment_id,
                  course_fee_gbp: COURSE_FEE_GBP,
                  commission_rate: COMMISSION_RATE,
                  commission_amount_gbp: COURSE_FEE_GBP * COMMISSION_RATE,
                  status: 'pending'
                });
              }
            }
          }
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        console.log(`[Webhook] checkout.session.expired: ${session.id}`);
        
        const payment = await StudentPaymentRepository.findByStripeSessionId(session.id);
        if (payment && payment.status === 'pending') {
          await StudentPaymentRepository.updatePayment(payment.payment_id, {
            status: 'failed'
          });
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event: ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ detail: `Webhook Error: ${error.message}` });
  }
};

/**
 * Get Payment History
 * GET /api/payments/history/:studentId
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const user = req.user;

    const student = await StudentRepository.findByStudentId(studentId);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found' });
    }

    // Check access
    if (user.role === 'student' && student.user_id !== user.user_id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const payments = await StudentPaymentRepository.findByStudentId(studentId);

    res.json(payments.map(p => ({
      payment_id: p.payment_id,
      amount_gbp: p.amount_gbp,
      status: p.status,
      payment_type: p.payment_type,
      payment_method: p.payment_method,
      created_at: p.created_at,
      paid_at: p.paid_at
    })));

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ detail: 'Failed to get payment history' });
  }
};

/**
 * Get Current Student Payment Info
 * GET /api/payments/my-info
 */
exports.getCurrentStudentPaymentInfo = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== 'student') {
      return res.status(403).json({ detail: 'Only students can access this endpoint' });
    }

    const student = await StudentRepository.findByUserId(user.user_id);
    if (!student) {
      return res.status(404).json({ detail: 'Student record not found' });
    }

    const payments = await StudentPaymentRepository.findByStudentId(student.student_id);
    const totalPaid = await StudentPaymentRepository.sumPaidByStudent(student.student_id);
    const hasPaid = payments.some(p => p.status === 'paid');

    res.json({
      student_id: student.student_id,
      status: student.status,
      can_pay: ['approved', 'payment_pending'].includes(student.status),
      has_paid: hasPaid,
      course_fee_gbp: COURSE_FEE_GBP,
      total_paid_gbp: totalPaid,
      remaining_gbp: Math.max(0, COURSE_FEE_GBP - totalPaid),
      is_fully_paid: totalPaid >= COURSE_FEE_GBP,
      payments: payments.map(p => ({
        payment_id: p.payment_id,
        amount_gbp: p.amount_gbp,
        status: p.status,
        created_at: p.created_at,
        paid_at: p.paid_at
      })),
      stripe_mode: IS_MOCK_MODE ? 'mock' : 'live'
    });

  } catch (error) {
    console.error('Get payment info error:', error);
    res.status(500).json({ detail: 'Failed to get payment info' });
  }
};

/**
 * Get Stripe Configuration Status
 * GET /api/payments/config
 */
exports.getConfig = async (req, res) => {
  res.json({
    mode: IS_MOCK_MODE ? 'mock' : 'live',
    course_fee_gbp: COURSE_FEE_GBP,
    currency: 'gbp',
    commission_rate: COMMISSION_RATE * 100,
    message: IS_MOCK_MODE 
      ? 'Running in MOCK mode. Payments will be simulated. Configure STRIPE_SECRET_KEY for live payments.'
      : 'Stripe is configured for live payments.'
  });
};

module.exports = exports;
