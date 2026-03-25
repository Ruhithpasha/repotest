/**
 * Payment Controller - Live Stripe Integration
 * Handles Payment Intents, Subscriptions, and Webhook processing
 * With idempotency, deduplication, and fraud prevention
 */
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const StripeService = require('../services/StripeService');
const { 
  Student,
  User,
  StudentPayment,
  StudentSubscription,
  ProcessedWebhookEvent,
  Commission
} = require('../models/pg');
const NotificationService = require('../services/notificationService');

const { 
  COURSE_FEE_GBP, 
  DEPOSIT_AMOUNT, 
  MONTHLY_INSTALLMENT, 
  TOTAL_INSTALLMENTS 
} = StripeService;

const COMMISSION_RATE = 0.04; // 4%

/**
 * Get Stripe configuration and payment info for frontend
 * GET /api/payments/config
 */
exports.getConfig = async (req, res) => {
  try {
    const config = StripeService.getPaymentConfig();
    res.json({
      ...config,
      currency: 'gbp',
      commissionRate: COMMISSION_RATE * 100
    });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ error: 'Failed to get payment config' });
  }
};

/**
 * Get current student's payment info
 * GET /api/payments/my-info
 */
exports.getCurrentStudentPaymentInfo = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can access this endpoint' });
    }

    const student = await Student.findOne({ where: { user_id: user.user_id } });
    if (!student) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    const payments = await StudentPayment.findAll({ 
      where: { student_id: student.student_id },
      order: [['created_at', 'DESC']]
    });

    const subscription = await StudentSubscription.findOne({
      where: { student_id: student.student_id }
    });

    const totalPaid = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + parseFloat(p.amount_gbp), 0);

    res.json({
      student_id: student.student_id,
      status: student.status,
      can_pay: ['approved', 'payment_pending', 'qualified'].includes(student.status),
      course_fee_gbp: COURSE_FEE_GBP,
      total_paid_gbp: totalPaid,
      remaining_gbp: Math.max(0, COURSE_FEE_GBP - totalPaid),
      is_fully_paid: totalPaid >= COURSE_FEE_GBP,
      payments: payments.map(p => ({
        payment_id: p.payment_id,
        amount_gbp: parseFloat(p.amount_gbp),
        status: p.status,
        payment_type: p.payment_type,
        installment_number: p.installment_number,
        created_at: p.created_at,
        paid_at: p.paid_at
      })),
      subscription: subscription ? {
        subscription_id: subscription.subscription_id,
        status: subscription.status,
        deposit_paid: subscription.deposit_paid,
        installments_paid: subscription.installments_paid,
        total_installments: subscription.total_installments,
        monthly_amount: parseFloat(subscription.monthly_amount),
        next_payment_date: subscription.next_payment_date
      } : null,
      stripe_mode: StripeService.isLiveMode() ? 'live' : 'test',
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY
    });
  } catch (error) {
    console.error('Get payment info error:', error);
    res.status(500).json({ error: 'Failed to get payment info' });
  }
};

/**
 * Create Payment Intent for Full Payment
 * POST /api/payments/create-full-payment
 */
exports.createFullPayment = async (req, res) => {
  try {
    const user = req.user;
    const { origin_url } = req.body;

    // Get student
    const student = await Student.findOne({ 
      where: { user_id: user.user_id },
      include: [{ model: User, as: 'user' }]
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if can make payment
    if (!['approved', 'payment_pending', 'qualified'].includes(student.status)) {
      return res.status(400).json({ 
        error: 'Student must be approved before making payment',
        current_status: student.status
      });
    }

    // SERVER-SIDE VERIFICATION: Check for existing completed payment
    const existingFullPayment = await StudentPayment.findOne({
      where: { 
        student_id: student.student_id, 
        payment_type: 'full',
        status: 'paid'
      }
    });

    if (existingFullPayment) {
      return res.status(400).json({ 
        error: 'Full payment already completed',
        payment_id: existingFullPayment.payment_id
      });
    }

    // Check total already paid
    const payments = await StudentPayment.findAll({
      where: { student_id: student.student_id, status: 'paid' }
    });
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount_gbp), 0);
    const amountDue = Math.max(0, COURSE_FEE_GBP - totalPaid);

    if (amountDue <= 0) {
      return res.status(400).json({ error: 'No payment due. Already paid in full.' });
    }

    // Create Checkout Session (redirects to Stripe-hosted page)
    const baseUrl = origin_url || process.env.FRONTEND_URL || 'http://localhost:3000';
    const checkoutSession = await StripeService.createFullPaymentCheckoutSession({
      studentId: student.student_id,
      email: student.user.email,
      name: `${student.user.first_name || ''} ${student.user.last_name || ''}`.trim() || student.user.name,
      amount: amountDue,
      successUrl: `${baseUrl}/portal/student?tab=payments&payment_success=true`,
      cancelUrl: `${baseUrl}/portal/student?tab=payments&payment_cancelled=true`,
      metadata: {
        enrollment_number: student.enrollment_number || '',
        rep_id: student.rep_id || ''
      }
    });

    // Create payment record
    const paymentId = `pay_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    await StudentPayment.create({
      payment_id: paymentId,
      student_id: student.student_id,
      stripe_session_id: checkoutSession.sessionId,
      amount_gbp: amountDue,
      payment_type: 'full',
      status: 'pending',
      payment_method: 'stripe',
      reference_number: student.enrollment_number
    });

    // Update student status
    if (student.status === 'approved' || student.status === 'qualified') {
      await student.update({ status: 'payment_pending' });
    }

    res.json({
      session_id: checkoutSession.sessionId,
      session_url: checkoutSession.sessionUrl,
      payment_id: paymentId,
      amount_gbp: amountDue,
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY
    });

  } catch (error) {
    console.error('Create full payment error:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment' });
  }
};

/**
 * Create Payment Intent for Deposit (Installment Plan)
 * POST /api/payments/create-deposit-payment
 */
exports.createDepositPayment = async (req, res) => {
  try {
    const user = req.user;
    const { origin_url } = req.body;

    const student = await Student.findOne({ 
      where: { user_id: user.user_id },
      include: [{ model: User, as: 'user' }]
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (!['approved', 'payment_pending', 'qualified'].includes(student.status)) {
      return res.status(400).json({ 
        error: 'Student must be approved before making payment',
        current_status: student.status
      });
    }

    // Check for existing deposit payment
    const existingDeposit = await StudentPayment.findOne({
      where: { 
        student_id: student.student_id, 
        payment_type: 'deposit',
        status: 'paid'
      }
    });

    if (existingDeposit) {
      return res.status(400).json({ 
        error: 'Deposit already paid',
        payment_id: existingDeposit.payment_id
      });
    }

    // Create Checkout Session for deposit
    const baseUrl = origin_url || process.env.FRONTEND_URL || 'http://localhost:3000';
    const checkoutSession = await StripeService.createDepositCheckoutSession({
      studentId: student.student_id,
      email: student.user.email,
      name: `${student.user.first_name || ''} ${student.user.last_name || ''}`.trim() || student.user.name,
      successUrl: `${baseUrl}/portal/student?tab=payments&payment_success=true&type=deposit`,
      cancelUrl: `${baseUrl}/portal/student?tab=payments&payment_cancelled=true`,
      metadata: {
        enrollment_number: student.enrollment_number || '',
        rep_id: student.rep_id || ''
      }
    });

    // Create payment record
    const paymentId = `pay_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    await StudentPayment.create({
      payment_id: paymentId,
      student_id: student.student_id,
      stripe_session_id: checkoutSession.sessionId,
      amount_gbp: DEPOSIT_AMOUNT,
      payment_type: 'deposit',
      status: 'pending',
      payment_method: 'stripe',
      reference_number: student.enrollment_number
    });

    // Create subscription record
    const subscriptionId = `sub_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    await StudentSubscription.create({
      subscription_id: subscriptionId,
      student_id: student.student_id,
      stripe_customer_id: checkoutSession.customerId,
      plan_type: 'installment_6_month',
      deposit_amount: DEPOSIT_AMOUNT,
      monthly_amount: MONTHLY_INSTALLMENT,
      total_installments: TOTAL_INSTALLMENTS,
      status: 'pending_deposit'
    });

    // Update student status
    if (student.status === 'approved' || student.status === 'qualified') {
      await student.update({ status: 'payment_pending' });
    }

    res.json({
      session_id: checkoutSession.sessionId,
      session_url: checkoutSession.sessionUrl,
      payment_id: paymentId,
      subscription_id: subscriptionId,
      amount_gbp: DEPOSIT_AMOUNT,
      monthly_amount: MONTHLY_INSTALLMENT,
      total_installments: TOTAL_INSTALLMENTS,
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY
    });

  } catch (error) {
    console.error('Create deposit payment error:', error);
    res.status(500).json({ error: error.message || 'Failed to create deposit payment' });
  }
};

/**
 * Get payment history for a student
 * GET /api/payments/history/:studentId
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const user = req.user;

    const student = await Student.findOne({ where: { student_id: studentId } });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check access
    if (user.role === 'student' && student.user_id !== user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const payments = await StudentPayment.findAll({
      where: { student_id: studentId },
      order: [['created_at', 'DESC']]
    });

    const subscription = await StudentSubscription.findOne({
      where: { student_id: studentId }
    });

    res.json({
      payments: payments.map(p => ({
        payment_id: p.payment_id,
        amount_gbp: parseFloat(p.amount_gbp),
        status: p.status,
        payment_type: p.payment_type,
        installment_number: p.installment_number,
        payment_method: p.payment_method,
        created_at: p.created_at,
        paid_at: p.paid_at,
        receipt_url: p.receipt_url
      })),
      subscription: subscription ? {
        status: subscription.status,
        deposit_paid: subscription.deposit_paid,
        installments_paid: subscription.installments_paid,
        total_installments: subscription.total_installments,
        next_payment_date: subscription.next_payment_date
      } : null
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
};

/**
 * Cancel pending subscription (allows student to choose different payment option)
 * DELETE /api/payments/cancel-pending-subscription
 */
exports.cancelPendingSubscription = async (req, res) => {
  try {
    const user = req.user;

    const student = await Student.findOne({ 
      where: { user_id: user.user_id }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Find pending subscription
    const subscription = await StudentSubscription.findOne({
      where: { 
        student_id: student.student_id,
        status: 'pending_deposit'
      }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No pending subscription found' });
    }

    // Delete associated pending payments
    await StudentPayment.destroy({
      where: { 
        student_id: student.student_id,
        status: 'pending'
      }
    });

    // Delete the subscription
    await subscription.destroy();

    res.json({ 
      message: 'Pending subscription cancelled successfully',
      can_choose_new_plan: true
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe
 * IMPORTANT: Must use express.raw() middleware, registered BEFORE express.json()
 */
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Construct and verify the event
    const rawBody = req.body;
    event = StripeService.constructWebhookEvent(rawBody, sig);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // DEDUPLICATION: Check if event already processed
  const existingEvent = await ProcessedWebhookEvent.findOne({
    where: { stripe_event_id: event.id }
  });

  if (existingEvent) {
    console.log(`[Webhook] Duplicate event ignored: ${event.id}`);
    return res.json({ received: true, duplicate: true });
  }

  // Mark as processed BEFORE handling (prevents race conditions)
  await ProcessedWebhookEvent.create({
    stripe_event_id: event.id,
    event_type: event.type
  });

  console.log(`[Webhook] Processing: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error(`[Webhook] Error processing ${event.type}:`, error);
    // Still return 200 to prevent Stripe from retrying
    res.json({ received: true, error: error.message });
  }
};

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  const { id: paymentIntentId, metadata, amount, receipt_url } = paymentIntent;
  const studentId = metadata?.student_id;
  const paymentType = metadata?.payment_type;

  console.log(`[Webhook] Payment succeeded: ${paymentIntentId} (${paymentType}) for student ${studentId}`);

  // Find and update the payment record
  const payment = await StudentPayment.findOne({
    where: { stripe_payment_intent_id: paymentIntentId }
  });

  if (!payment) {
    console.error(`[Webhook] Payment record not found for intent: ${paymentIntentId}`);
    return;
  }

  // Update payment status
  await payment.update({
    status: 'paid',
    paid_at: new Date(),
    receipt_url: receipt_url || `https://dashboard.stripe.com/payments/${paymentIntentId}`
  });

  const student = await Student.findOne({ 
    where: { student_id: payment.student_id },
    include: [{ model: User, as: 'user' }]
  });

  if (!student) return;

  if (paymentType === 'full') {
    // FULL PAYMENT: Update to paid_in_full and trigger SSO
    await student.update({ 
      status: 'paid_in_full',
      enrolled_at: new Date()
    });

    // Create commission
    await createCommissionIfNeeded(student, payment);

    // Send notification
    if (student.user) {
      NotificationService.notifyPaymentConfirmation(student, student.user, {
        amount: parseFloat(payment.amount_gbp),
        paymentId: payment.payment_id,
        paymentType: 'full'
      }).catch(err => console.error('[Webhook] Notification error:', err));
    }

    console.log(`[Webhook] Student ${studentId} marked as paid_in_full`);

  } else if (paymentType === 'deposit') {
    // DEPOSIT: Update subscription and student status
    const subscription = await StudentSubscription.findOne({
      where: { student_id: payment.student_id }
    });

    if (subscription) {
      // Create the actual Stripe subscription for monthly payments
      try {
        const stripeSubscription = await StripeService.createInstallmentSubscription({
          customerId: subscription.stripe_customer_id,
          studentId: payment.student_id,
          email: student.user?.email
        });

        await subscription.update({
          stripe_subscription_id: stripeSubscription.subscriptionId,
          deposit_paid: true,
          deposit_paid_at: new Date(),
          status: 'active',
          next_payment_date: stripeSubscription.currentPeriodEnd
        });

        console.log(`[Webhook] Subscription activated: ${stripeSubscription.subscriptionId}`);
      } catch (subError) {
        console.error('[Webhook] Failed to create Stripe subscription:', subError);
      }
    }

    // Update student status to payment_pending (partial payment)
    await student.update({ status: 'payment_pending' });

    console.log(`[Webhook] Deposit paid for student ${studentId}`);
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent) {
  const { id: paymentIntentId, last_payment_error } = paymentIntent;

  const payment = await StudentPayment.findOne({
    where: { stripe_payment_intent_id: paymentIntentId }
  });

  if (payment) {
    await payment.update({
      status: 'failed',
      failure_reason: last_payment_error?.message || 'Payment failed'
    });
    console.log(`[Webhook] Payment failed: ${paymentIntentId}`);
  }
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription) {
  const { id: stripeSubscriptionId, status, metadata, current_period_end } = subscription;
  const studentId = metadata?.student_id;

  const localSubscription = await StudentSubscription.findOne({
    where: { stripe_subscription_id: stripeSubscriptionId }
  });

  if (localSubscription) {
    await localSubscription.update({
      status: status === 'active' ? 'active' : status === 'canceled' ? 'cancelled' : status,
      next_payment_date: new Date(current_period_end * 1000)
    });
    console.log(`[Webhook] Subscription updated: ${stripeSubscriptionId} -> ${status}`);
  }
}

/**
 * Handle successful invoice payment (installment)
 */
async function handleInvoicePaymentSucceeded(invoice) {
  const { subscription: stripeSubscriptionId, amount_paid, hosted_invoice_url } = invoice;

  if (!stripeSubscriptionId) return; // Not a subscription invoice

  const subscription = await StudentSubscription.findOne({
    where: { stripe_subscription_id: stripeSubscriptionId }
  });

  if (!subscription) return;

  // Create payment record for installment
  const paymentId = `pay_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const installmentNumber = subscription.installments_paid + 1;

  await StudentPayment.create({
    payment_id: paymentId,
    student_id: subscription.student_id,
    stripe_payment_intent_id: invoice.payment_intent,
    amount_gbp: amount_paid / 100,
    payment_type: 'installment',
    installment_number: installmentNumber,
    status: 'paid',
    payment_method: 'stripe',
    paid_at: new Date(),
    receipt_url: hosted_invoice_url
  });

  // Update subscription
  const newInstallmentsPaid = subscription.installments_paid + 1;
  const isComplete = newInstallmentsPaid >= subscription.total_installments;

  await subscription.update({
    installments_paid: newInstallmentsPaid,
    status: isComplete ? 'completed' : 'active'
  });

  // If all installments paid, update student to paid_in_full
  if (isComplete) {
    const student = await Student.findOne({ 
      where: { student_id: subscription.student_id },
      include: [{ model: User, as: 'user' }]
    });

    if (student) {
      await student.update({ 
        status: 'paid_in_full',
        enrolled_at: student.enrolled_at || new Date()
      });

      // Create commission
      const depositPayment = await StudentPayment.findOne({
        where: { student_id: subscription.student_id, payment_type: 'deposit', status: 'paid' }
      });
      if (depositPayment) {
        await createCommissionIfNeeded(student, depositPayment);
      }

      console.log(`[Webhook] All installments paid - Student ${subscription.student_id} now paid_in_full`);
    }
  }

  console.log(`[Webhook] Installment ${installmentNumber}/${subscription.total_installments} paid for ${subscription.student_id}`);
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice) {
  const { subscription: stripeSubscriptionId, amount_due } = invoice;

  if (!stripeSubscriptionId) return;

  const subscription = await StudentSubscription.findOne({
    where: { stripe_subscription_id: stripeSubscriptionId }
  });

  if (subscription) {
    await subscription.update({ status: 'past_due' });

    // TODO: Send notification about failed payment
    console.log(`[Webhook] Installment payment failed for ${subscription.student_id}`);
  }
}

/**
 * Create commission for rep if applicable
 */
async function createCommissionIfNeeded(student, payment) {
  if (!student.rep_id) return;

  const existingCommission = await Commission.findOne({
    where: { student_id: student.student_id }
  });

  if (existingCommission) return;

  const commissionId = `comm_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  await Commission.create({
    commission_id: commissionId,
    rep_id: student.rep_id,
    student_id: student.student_id,
    payment_id: payment.payment_id,
    course_fee_gbp: COURSE_FEE_GBP,
    commission_rate: COMMISSION_RATE,
    commission_amount_gbp: COURSE_FEE_GBP * COMMISSION_RATE,
    status: 'pending'
  });

  console.log(`[Commission] Created for rep ${student.rep_id}: £${COURSE_FEE_GBP * COMMISSION_RATE}`);
}

module.exports = exports;
