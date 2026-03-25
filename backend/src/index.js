require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Use PostgreSQL instead of MongoDB
const { connectDB } = require('./config/postgres');

// Import routes
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contact');
const applicationRoutes = require('./routes/applications');
const courseRoutes = require('./routes/courses');
const paymentRoutes = require('./routes/payments');
const enrollmentRoutes = require('./routes/enrollments');
const documentRoutes = require('./routes/documents');
const dashboardRoutes = require('./routes/dashboard');

// Portal routes
const otpRoutes = require('./routes/otp');
const studentRoutes = require('./routes/students');
const studentDocumentRoutes = require('./routes/studentDocuments');
const studentPaymentRoutes = require('./routes/studentPayments');
const notificationRoutes = require('./routes/notifications');

// Role-based routes
const repRoutes = require('./routes/rep');
const adminRoutes = require('./routes/admin');

// Phase 1: CRM and Team Management routes
const teamRoutes = require('./routes/teams');
const leadRoutes = require('./routes/leads');
const programRoutes = require('./routes/programs');

// Phase 2: Commission and Payout routes
const commissionRoutes = require('./routes/commissions');
const payoutRoutes = require('./routes/payouts');

// SuperAdmin Portal routes
const managerRoutes = require('./routes/managers');
const fraudAlertRoutes = require('./routes/fraudAlerts');
const auditLogRoutes = require('./routes/auditLogs');
const reportRoutes = require('./routes/reports');
const adminEnrolmentRoutes = require('./routes/adminEnrolments');

// Stripe Payment Controller for webhook
const stripePaymentController = require('./controllers/stripePaymentController');

// Cron Jobs
const { initializeCronJobs } = require('./services/CronJobs');

const app = express();
const PORT = process.env.PORT || 8001;

// Connect to PostgreSQL
connectDB();

// CORS middleware (applied to all routes)
const allowedOrigins = [
  'https://plan4growth.academy',
  'https://www.plan4growth.academy',
  'https://referral-payouts-hub.emergent.host',
  'https://referral-payouts-hub.preview.emergentagent.com'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // Allow all listed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Also allow if CORS_ORIGINS env contains wildcard
    if (process.env.CORS_ORIGINS && process.env.CORS_ORIGINS.includes('*')) {
      return callback(null, true);
    }
    
    // Default: allow anyway for flexibility
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Stripe webhook route - MUST be before express.json() middleware
// Needs raw body for signature verification
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripePaymentController.handleStripeWebhook);

// GHL webhook route - MUST be before express.json() middleware for signature verification
const ghlWebhook = require('./routes/webhooks/ghl');
app.use('/api/webhooks/ghl', express.raw({ type: 'application/json' }), ghlWebhook);

// JSON parsing middleware (for all other routes)
app.use(express.json());
app.use(cookieParser());

// File upload middleware - exclude routes that use multer
const fileUpload = require('express-fileupload');
app.use((req, res, next) => {
  // Skip express-fileupload for routes that use multer
  if (req.path.includes('/documents/upload') || req.path.includes('/applicant-documents')) {
    return next();
  }
  fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    abortOnLimit: true
  })(req, res, next);
});

// Health check
app.get('/api/', (req, res) => {
  res.json({ message: 'Plan4Growth Academy API', status: 'healthy' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Public Website Settings routes (no auth - for frontend consumption)
// MUST be before other routes that have auth middleware on catch-all paths
const publicWebsiteSettingsRoutes = require('./routes/publicWebsiteSettings');
app.use('/api/website-settings', publicWebsiteSettingsRoutes);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Portal routes
app.use('/api/otp', otpRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/student-documents', studentDocumentRoutes);
app.use('/api/student-payments', studentPaymentRoutes);
app.use('/api/notifications', notificationRoutes);

// Applicant self-upload documents (no auth required - token-based)
const applicantDocumentRoutes = require('./routes/applicantDocuments');
app.use('/api/applicant', applicantDocumentRoutes);

// Admin applications review
const applicationsReviewRoutes = require('./routes/admin/applicationsReview');
app.use('/api/admin', applicationsReviewRoutes);

// Role-based routes
app.use('/api/rep', repRoutes);
app.use('/api/admin', adminRoutes);

// CRM booking link route
const sendBookingLinkRouter = require('./routes/crm/sendBookingLink');
app.use('/api/crm/students', sendBookingLinkRouter);

// Phase 1: CRM and Team Management routes
app.use('/api/teams', teamRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/programs', programRoutes);

// Phase 2: Commission and Payout routes
app.use('/api/commissions', commissionRoutes);
app.use('/api/payouts', payoutRoutes);

// SuperAdmin Portal routes
app.use('/api/managers', managerRoutes);
app.use('/api/fraud-alerts', fraudAlertRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin/enrolments', adminEnrolmentRoutes);


// Manager Student Registration routes (addon)
const managerStudentRoutes = require('./routes/managerStudents');
app.use('/api/manager/students', managerStudentRoutes);

// Manager Portal routes
const managerPortalRoutes = require('./routes/managerPortal');
app.use('/api/manager', managerPortalRoutes);

// Referral routes (Student Referral System)
const referralRoutes = require('./routes/referrals');
app.use('/api/referrals', referralRoutes);

// Programme Management routes (Super Admin)
const programmeRoutes = require('./routes/programmes');
app.use('/api/admin/programmes', programmeRoutes);

// Module Management routes (Super Admin) - nested under programmes
const moduleRoutes = require('./routes/modules');
app.use('/api/admin/programmes', moduleRoutes);

// Student Courses routes
const studentCoursesRoutes = require('./routes/studentCourses');
app.use('/api/student/courses', studentCoursesRoutes);

// Commission Override Request routes
const overrideRequestRoutes = require('./routes/overrideRequests');
app.use('/api', overrideRequestRoutes);

// Cron job routes (manual trigger)
const cronRoutes = require('./routes/cron');
app.use('/api/cron', cronRoutes);

// Website Settings routes (Super Admin protected)
const websiteSettingsRoutes = require('./routes/admin/websiteSettings');
app.use('/api/admin/website-settings', websiteSettingsRoutes);

// Serve static uploads
app.use('/uploads', express.static(require('path').join(__dirname, '../public/uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ detail: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ detail: 'Not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Plan4Growth Academy API running on port ${PORT}`);
  
  // Initialize cron jobs
  initializeCronJobs();
});
