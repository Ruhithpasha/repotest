/**
 * Cron Jobs Admin Routes
 * Manual triggers for cron jobs (admin only)
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { runJob, processPendingValidations, generateDailySummary } = require('../services/CronJobs');

// All routes require auth + admin role
router.use(authMiddleware);
router.use((req, res, next) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  next();
});

/**
 * POST /api/cron/run/:jobName
 * Manually trigger a cron job
 */
router.post('/run/:jobName', async (req, res) => {
  try {
    const { jobName } = req.params;
    console.log(`[Cron API] Manual trigger: ${jobName} by ${req.user.email}`);
    
    const result = await runJob(jobName);
    res.json({ success: true, job: jobName, result });
  } catch (error) {
    console.error(`[Cron API] Error running ${req.params.jobName}:`, error);
    res.status(500).json({ detail: error.message });
  }
});

/**
 * GET /api/cron/status
 * Get status of scheduled jobs
 */
router.get('/status', (req, res) => {
  res.json({
    jobs: [
      { name: 'process_pending_validations', schedule: '0 2 * * *', description: 'Move validated commissions to pending_approval' },
      { name: 'auto_approve_commissions', schedule: '0 3 * * *', description: 'Auto-approve small commissions' },
      { name: 'process_approved_to_payable', schedule: '0 4 * * *', description: 'Move approved commissions to payable' },
      { name: 'daily_summary', schedule: '0 6 * * *', description: 'Generate daily commission summary' }
    ],
    status: 'active'
  });
});

module.exports = router;
