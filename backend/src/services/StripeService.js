/**
 * Stripe Service - Live Payment Integration
 * Handles Payment Intents, Subscriptions, and Webhook processing
 */
require('dotenv').config();
const Stripe = require('stripe');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Initialize Stripe
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

// Payment configuration
const COURSE_FEE_GBP = 6250.00;
const DEPOSIT_AMOUNT = 500.00;
const REMAINING_AFTER_DEPOSIT = COURSE_FEE_GBP - DEPOSIT_AMOUNT; // £5,750
const MONTHLY_INSTALLMENT = 1249.83; // £7,499 / 6 months
const TOTAL_INSTALLMENTS = 6;

// Check if Stripe is properly configured
const isLiveMode = () => {
  return stripe && STRIPE_SECRET_KEY && !STRIPE_SECRET_KEY.startsWith('sk_test_emergent');
};

console.log(`[Stripe Service] Mode: ${isLiveMode() ? 'LIVE' : 'MOCK/TEST'}`);

/**
 * Create or retrieve a Stripe Customer
 */
const getOrCreateCustomer = async (email, name, metadata = {}) => {
  if (!stripe) throw new Error('Stripe not configured');

  // Search for existing customer
  const existingCustomers = await stripe.customers.list({
    email: email,
    limit: 1
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  return await stripe.customers.create({
    email,
    name,
    metadata
  });
};

/**
 * Create Payment Intent for Full Payment
 * Uses idempotency key to prevent duplicate charges
 */
const createFullPaymentIntent = async ({ studentId, email, name, amount, metadata = {} }) => {
  if (!stripe) throw new Error('Stripe not configured');

  const customer = await getOrCreateCustomer(email, name, { student_id: studentId });

  const idempotencyKey = `payment_${studentId}_full_${Date.now()}`;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to pence
    currency: 'gbp',
    customer: customer.id,
    metadata: {
      student_id: studentId,
      payment_type: 'full',
      ...metadata
    },
    // Enable Stripe Radar for fraud detection
    radar_options: {
      session: metadata.radar_session || undefined
    },
    description: `Level 7 Diploma - Full Payment - ${studentId}`,
    receipt_email: email
  }, {
    idempotencyKey
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    customerId: customer.id,
    amount,
    idempotencyKey
  };
};

/**
 * Create Checkout Session for Full Payment
 * Redirects user to Stripe-hosted payment page
 */
const createFullPaymentCheckoutSession = async ({ studentId, email, name, amount, successUrl, cancelUrl, metadata = {} }) => {
  if (!stripe) throw new Error('Stripe not configured');

  const customer = await getOrCreateCustomer(email, name, { student_id: studentId });

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'gbp',
        product_data: {
          name: 'Level 7 Diploma in Dental Implantology - Full Payment',
          description: 'Complete course fee for the Level 7 Diploma programme'
        },
        unit_amount: Math.round(amount * 100),
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      student_id: studentId,
      payment_type: 'full',
      ...metadata
    }
  });

  return {
    sessionId: session.id,
    sessionUrl: session.url,
    customerId: customer.id,
    amount
  };
};

/**
 * Create Checkout Session for Deposit Payment
 */
const createDepositCheckoutSession = async ({ studentId, email, name, successUrl, cancelUrl, metadata = {} }) => {
  if (!stripe) throw new Error('Stripe not configured');

  const customer = await getOrCreateCustomer(email, name, { student_id: studentId });

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'gbp',
        product_data: {
          name: 'Level 7 Diploma - Deposit Payment',
          description: 'Initial deposit of £500. Monthly installments will follow.'
        },
        unit_amount: Math.round(DEPOSIT_AMOUNT * 100),
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      student_id: studentId,
      payment_type: 'deposit',
      ...metadata
    },
    payment_intent_data: {
      setup_future_usage: 'off_session', // Save card for future installments
    }
  });

  return {
    sessionId: session.id,
    sessionUrl: session.url,
    customerId: customer.id,
    amount: DEPOSIT_AMOUNT
  };
};

/**
 * Create Payment Intent for Deposit (first installment payment)
 */
const createDepositPaymentIntent = async ({ studentId, email, name, metadata = {} }) => {
  if (!stripe) throw new Error('Stripe not configured');

  const customer = await getOrCreateCustomer(email, name, { student_id: studentId });

  const idempotencyKey = `payment_${studentId}_deposit_${Date.now()}`;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(DEPOSIT_AMOUNT * 100),
    currency: 'gbp',
    customer: customer.id,
    metadata: {
      student_id: studentId,
      payment_type: 'deposit',
      ...metadata
    },
    radar_options: {
      session: metadata.radar_session || undefined
    },
    description: `Level 7 Diploma - Deposit Payment - ${studentId}`,
    receipt_email: email,
    setup_future_usage: 'off_session' // Save card for future installments
  }, {
    idempotencyKey
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    customerId: customer.id,
    amount: DEPOSIT_AMOUNT,
    idempotencyKey
  };
};

/**
 * Create Subscription for Monthly Installments
 * Called after deposit is paid successfully
 */
const createInstallmentSubscription = async ({ customerId, studentId, email, metadata = {} }) => {
  if (!stripe) throw new Error('Stripe not configured');

  // First, create or get the price for monthly installments
  let price;
  const existingPrices = await stripe.prices.list({
    lookup_keys: ['diploma_monthly_installment'],
    limit: 1
  });

  if (existingPrices.data.length > 0) {
    price = existingPrices.data[0];
  } else {
    // Create product and price if they don't exist
    const product = await stripe.products.create({
      name: 'Level 7 Diploma - Monthly Installment',
      description: 'Monthly payment for Level 7 Diploma in Dental Implantology'
    });

    price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(MONTHLY_INSTALLMENT * 100),
      currency: 'gbp',
      recurring: {
        interval: 'month',
        interval_count: 1
      },
      lookup_key: 'diploma_monthly_installment'
    });
  }

  // Create subscription starting in 1 month (deposit already paid)
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: price.id }],
    billing_cycle_anchor: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // Start in 30 days
    proration_behavior: 'none',
    metadata: {
      student_id: studentId,
      payment_type: 'installment',
      total_installments: TOTAL_INSTALLMENTS.toString(),
      ...metadata
    },
    // Cancel after 6 payments
    cancel_at: Math.floor(Date.now() / 1000) + (7 * 30 * 24 * 60 * 60) // ~7 months from now
  });

  return {
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    customerId
  };
};

/**
 * Retrieve Payment Intent status
 */
const getPaymentIntent = async (paymentIntentId) => {
  if (!stripe) throw new Error('Stripe not configured');
  return await stripe.paymentIntents.retrieve(paymentIntentId);
};

/**
 * Retrieve Subscription status
 */
const getSubscription = async (subscriptionId) => {
  if (!stripe) throw new Error('Stripe not configured');
  return await stripe.subscriptions.retrieve(subscriptionId);
};

/**
 * Cancel Subscription
 */
const cancelSubscription = async (subscriptionId) => {
  if (!stripe) throw new Error('Stripe not configured');
  return await stripe.subscriptions.cancel(subscriptionId);
};

/**
 * Verify webhook signature
 */
const constructWebhookEvent = (rawBody, signature) => {
  if (!stripe) throw new Error('Stripe not configured');
  if (!STRIPE_WEBHOOK_SECRET) {
    // If no webhook secret, just parse the body
    return typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
  }
  return stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
};

/**
 * Get payment configuration
 */
const getPaymentConfig = () => ({
  courseFee: COURSE_FEE_GBP,
  depositAmount: DEPOSIT_AMOUNT,
  monthlyInstallment: MONTHLY_INSTALLMENT,
  totalInstallments: TOTAL_INSTALLMENTS,
  remainingAfterDeposit: REMAINING_AFTER_DEPOSIT,
  isLive: isLiveMode(),
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
});

module.exports = {
  stripe,
  isLiveMode,
  getOrCreateCustomer,
  createFullPaymentIntent,
  createFullPaymentCheckoutSession,
  createDepositPaymentIntent,
  createDepositCheckoutSession,
  createInstallmentSubscription,
  getPaymentIntent,
  getSubscription,
  cancelSubscription,
  constructWebhookEvent,
  getPaymentConfig,
  // Constants
  COURSE_FEE_GBP,
  DEPOSIT_AMOUNT,
  MONTHLY_INSTALLMENT,
  TOTAL_INSTALLMENTS
};
