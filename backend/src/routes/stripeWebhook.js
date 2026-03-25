/**
 * Stripe Webhook Routes
 * POST /api/webhooks/stripe
 * Handles payment events and triggers commission creation
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const CommissionService = require('../services/CommissionService');
const { Student, User, StudentPayment, AuditLog } = require('../models/pg');

// Check if Stripe is configured
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const IS_MOCK_MODE = !STRIPE_SECRET_KEY || STRIPE_SECRET_KEY === 'sk_test_emergent' || STRIPE_SECRET_KEY.startsWith('sk_test_mock');

let stripe = null;
const getStripe = () => {
  if (IS_MOCK_MODE) return null;
  if (!stripe && STRIPE_SECRET_KEY) {
    stripe = require('stripe')(STRIPE_SECRET_KEY);
  }
  return stripe;
};

/**
 * Log webhook event to audit logs
 */
const logWebhookEvent = async (eventType, details, success = true) => {
  try {
    await AuditLog.create({
      log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      user_id: null,
      action_type: `webhook_${eventType}`,
      object_type: 'payment',
      object_id: details.payment_id || details.session_id || null,
      description: JSON.stringify({ ...details, success }),
      actor_role: 'system',
      ip_address: details.ip_address || null
    });
  } catch (error) {
    console.error('[Webhook] Audit log error:', error);
  }
};

/**
 * POST /api/webhooks/stripe
 * Main Stripe webhook handler
 * Note: This route must receive raw body (configured in index.js before express.json())
 */
router.post('/', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const ipAddress = req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
  
  let event;

  try {
    // Parse body - could be Buffer (from express.raw) or already parsed JSON
    let rawBody = req.body;
    if (Buffer.isBuffer(rawBody)) {
      rawBody = rawBody.toString('utf8');
    }
    
    // In mock mode, accept test events
    if (IS_MOCK_MODE) {
      event = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
      console.log(`[Webhook MOCK] Received event: ${event.type}`);
    } else {
      // Verify Stripe signature in production
      if (STRIPE_WEBHOOK_SECRET && sig) {
        event = getStripe().webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
      } else {
        event = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
      }
    }

    console.log(`[Webhook] Processing event: ${event.type} (ID: ${event.id})`);

    // Handle different event types
    switch (event.type) {
      
      // ==========================================
      // PAYMENT SUCCESS EVENTS
      // ==========================================
      
      case 'checkout.session.completed':
      case 'payment_intent.succeeded': {
        const session = event.data.object;
        const sessionId = session.id;
        const paymentIntentId = session.payment_intent || session.id;
        
        console.log(`[Webhook] Payment succeeded: ${sessionId}`);

        // Find the payment record
        let payment = await StudentPayment.findOne({
          where: { stripe_session_id: sessionId }
        });

        // Try by payment intent if not found by session
        if (!payment && paymentIntentId) {
          payment = await StudentPayment.findOne({
            where: { stripe_payment_intent_id: paymentIntentId }
          });
        }

        if (!payment) {
          console.log(`[Webhook] No payment record found for session ${sessionId}`);
          await logWebhookEvent('payment_succeeded', { 
            session_id: sessionId, 
            error: 'Payment record not found',
            ip_address: ipAddress 
          }, false);
          return res.json({ received: true, processed: false, reason: 'payment_not_found' });
        }

        // Skip if already processed
        if (payment.status === 'paid') {
          console.log(`[Webhook] Payment already processed: ${payment.payment_id}`);
          return res.json({ received: true, processed: false, reason: 'already_processed' });
        }

        // Update payment status
        await payment.update({
          status: 'paid',
          paid_at: new Date(),
          stripe_payment_intent_id: paymentIntentId
        });

        // Find student
        const student = await Student.findByPk(payment.student_id);
        if (!student) {
          console.log(`[Webhook] Student not found: ${payment.student_id}`);
          await logWebhookEvent('payment_succeeded', { 
            payment_id: payment.payment_id, 
            error: 'Student not found',
            ip_address: ipAddress 
          }, false);
          return res.json({ received: true, processed: false, reason: 'student_not_found' });
        }

        // Update student status to enrolled
        if (!['enrolled', 'completed'].includes(student.status)) {
          await student.update({ 
            status: 'enrolled',
            enrolled_at: new Date()
          });
          console.log(`[Webhook] Student ${student.student_id} enrolled`);
        }

        // Process commissions
        try {
          const commissionResult = await CommissionService.processPaymentCommissions(
            payment, 
            student, 
            'webhook'
          );
          console.log(`[Webhook] Commission result:`, commissionResult);

          await logWebhookEvent('payment_succeeded', {
            payment_id: payment.payment_id,
            student_id: student.student_id,
            amount: payment.amount_gbp,
            commissions_created: commissionResult.commissions.length,
            ip_address: ipAddress
          });

        } catch (commError) {
          console.error(`[Webhook] Commission processing error:`, commError);
          await logWebhookEvent('payment_succeeded', {
            payment_id: payment.payment_id,
            student_id: student.student_id,
            commission_error: commError.message,
            ip_address: ipAddress
          }, false);
        }

        return res.json({ received: true, processed: true });
      }

      // ==========================================
      // REFUND EVENTS
      // ==========================================
      
      case 'charge.refunded':
      case 'refund.created': {
        const refund = event.data.object;
        const chargeId = refund.charge || refund.id;
        const refundAmount = (refund.amount || 0) / 100; // Convert from cents
        const reason = refund.reason || 'customer_request';

        console.log(`[Webhook] Refund received: ${chargeId}, amount: £${refundAmount}`);

        // Find payment by charge ID or payment intent
        let payment = await StudentPayment.findOne({
          where: { stripe_charge_id: chargeId }
        });

        if (!payment && refund.payment_intent) {
          payment = await StudentPayment.findOne({
            where: { stripe_payment_intent_id: refund.payment_intent }
          });
        }

        if (!payment) {
          console.log(`[Webhook] No payment found for refund charge ${chargeId}`);
          await logWebhookEvent('refund_created', {
            charge_id: chargeId,
            amount: refundAmount,
            error: 'Payment not found',
            ip_address: ipAddress
          }, false);
          return res.json({ received: true, processed: false, reason: 'payment_not_found' });
        }

        // Update payment status
        await payment.update({
          status: 'refunded',
          refunded_at: new Date(),
          refund_amount: refundAmount,
          refund_reason: reason
        });

        // Process commission refund
        try {
          const refundResult = await CommissionService.processRefund(
            payment.payment_id, 
            refundAmount, 
            `Stripe refund: ${reason}`
          );
          console.log(`[Webhook] Refund result:`, refundResult);

          await logWebhookEvent('refund_created', {
            payment_id: payment.payment_id,
            amount: refundAmount,
            reason: reason,
            commissions_cancelled: refundResult.cancelled.length,
            commissions_flagged: refundResult.flagged.length,
            ip_address: ipAddress
          });

        } catch (refundError) {
          console.error(`[Webhook] Refund processing error:`, refundError);
          await logWebhookEvent('refund_created', {
            payment_id: payment.payment_id,
            refund_error: refundError.message,
            ip_address: ipAddress
          }, false);
        }

        return res.json({ received: true, processed: true });
      }

      // ==========================================
      // SESSION EXPIRED
      // ==========================================
      
      case 'checkout.session.expired': {
        const session = event.data.object;
        console.log(`[Webhook] Session expired: ${session.id}`);

        const payment = await StudentPayment.findOne({
          where: { stripe_session_id: session.id }
        });

        if (payment && payment.status === 'pending') {
          await payment.update({ status: 'expired' });
          await logWebhookEvent('session_expired', {
            payment_id: payment.payment_id,
            session_id: session.id,
            ip_address: ipAddress
          });
        }

        return res.json({ received: true, processed: true });
      }

      // ==========================================
      // PAYMENT FAILED
      // ==========================================
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const failureMessage = paymentIntent.last_payment_error?.message || 'Unknown error';
        
        console.log(`[Webhook] Payment failed: ${paymentIntent.id} - ${failureMessage}`);

        const payment = await StudentPayment.findOne({
          where: { stripe_payment_intent_id: paymentIntent.id }
        });

        if (payment) {
          await payment.update({ 
            status: 'failed',
            failure_reason: failureMessage
          });
          await logWebhookEvent('payment_failed', {
            payment_id: payment.payment_id,
            failure_reason: failureMessage,
            ip_address: ipAddress
          });
        }

        return res.json({ received: true, processed: true });
      }

      // ==========================================
      // DISPUTE EVENTS (Fraud detection)
      // ==========================================
      
      case 'charge.dispute.created': {
        const dispute = event.data.object;
        const chargeId = dispute.charge;
        
        console.log(`[Webhook] Dispute created for charge: ${chargeId}`);

        const payment = await StudentPayment.findOne({
          where: { stripe_charge_id: chargeId }
        });

        if (payment) {
          // Process as potential fraud - similar to refund but with higher severity
          const refundResult = await CommissionService.processRefund(
            payment.payment_id, 
            (dispute.amount || 0) / 100, 
            `Stripe dispute: ${dispute.reason || 'unknown'}`
          );

          await logWebhookEvent('dispute_created', {
            payment_id: payment.payment_id,
            charge_id: chargeId,
            reason: dispute.reason,
            commissions_cancelled: refundResult.cancelled.length,
            commissions_flagged: refundResult.flagged.length,
            ip_address: ipAddress
          });
        }

        return res.json({ received: true, processed: true });
      }

      // ==========================================
      // DEFAULT - Log unhandled events
      // ==========================================
      
      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
        return res.json({ received: true, processed: false, reason: 'unhandled_event' });
    }

  } catch (error) {
    console.error(`[Webhook] Error processing webhook:`, error);
    
    await logWebhookEvent('error', {
      error: error.message,
      event_type: event?.type,
      ip_address: ipAddress
    }, false);

    // Return 400 for signature verification errors
    if (error.message?.includes('signature')) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Return 200 for processing errors (so Stripe doesn't retry)
    return res.status(200).json({ received: true, error: error.message });
  }
});

/**
 * POST /api/webhooks/stripe/test
 * Test endpoint to simulate webhook events (development only)
 */
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Test endpoint disabled in production' });
  }

  const { event_type, payment_id, student_id, amount } = req.body;

  try {
    if (event_type === 'payment.succeeded') {
      const payment = await StudentPayment.findByPk(payment_id);
      const student = await Student.findByPk(student_id);
      
      if (!payment || !student) {
        return res.status(404).json({ error: 'Payment or student not found' });
      }

      const result = await CommissionService.processPaymentCommissions(payment, student, 'test');
      return res.json({ success: true, result });
    }

    if (event_type === 'refund.created') {
      const result = await CommissionService.processRefund(payment_id, amount, 'Test refund');
      return res.json({ success: true, result });
    }

    return res.status(400).json({ error: 'Invalid event_type' });

  } catch (error) {
    console.error('[Webhook Test] Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
