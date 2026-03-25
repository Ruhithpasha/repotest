/**
 * Cron Jobs
 * Daily tasks for commission lifecycle management
 */
const cron = require('node-cron');
const CommissionService = require('./CommissionService');
const { Commission, AuditLog } = require('../models/pg');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

/**
 * Log cron job execution
 */
const logCronExecution = async (jobName, results, success = true) => {
  try {
    await AuditLog.create({
      log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      user_id: null,
      action_type: `cron_${jobName}`,
      object_type: 'system',
      object_id: null,
      description: JSON.stringify({ ...results, success }),
      actor_role: 'system'
    });
  } catch (error) {
    console.error(`[Cron] Audit log error:`, error);
  }
};

/**
 * Process pending_validation commissions
 * Moves commissions past their hold period to pending_approval
 * Runs daily at 2:00 AM
 */
const processPendingValidations = async () => {
  console.log('[Cron] Starting processPendingValidations job...');
  
  try {
    const result = await CommissionService.processPendingValidations();
    console.log(`[Cron] Processed ${result.processed}/${result.total} pending validations`);
    
    await logCronExecution('process_pending_validations', result);
    return result;
  } catch (error) {
    console.error('[Cron] processPendingValidations error:', error);
    await logCronExecution('process_pending_validations', { error: error.message }, false);
    throw error;
  }
};

/**
 * Auto-approve small commissions (optional)
 * Commissions under a threshold can be auto-approved
 * Runs daily at 3:00 AM
 */
const autoApproveSmallCommissions = async () => {
  const AUTO_APPROVE_THRESHOLD = parseFloat(process.env.AUTO_APPROVE_THRESHOLD) || 0; // Disabled by default
  
  if (AUTO_APPROVE_THRESHOLD <= 0) {
    console.log('[Cron] Auto-approve disabled (threshold is 0)');
    return { skipped: true, reason: 'disabled' };
  }

  console.log(`[Cron] Auto-approving commissions under £${AUTO_APPROVE_THRESHOLD}...`);

  try {
    const commissions = await Commission.findAll({
      where: {
        status: 'pending_approval',
        commission_amount_gbp: { [Op.lte]: AUTO_APPROVE_THRESHOLD }
      }
    });

    let approved = 0;
    for (const commission of commissions) {
      await commission.update({
        status: 'approved',
        approved_by: 'system_auto',
        approved_at: new Date()
      });
      approved++;
    }

    const result = { approved, total: commissions.length, threshold: AUTO_APPROVE_THRESHOLD };
    console.log(`[Cron] Auto-approved ${approved} commissions`);
    
    await logCronExecution('auto_approve_commissions', result);
    return result;
  } catch (error) {
    console.error('[Cron] autoApproveSmallCommissions error:', error);
    await logCronExecution('auto_approve_commissions', { error: error.message }, false);
    throw error;
  }
};

/**
 * Move approved commissions to payable
 * Commissions that are approved and past their hold period become payable
 * Runs daily at 4:00 AM
 */
const processApprovedToPayable = async () => {
  console.log('[Cron] Processing approved commissions to payable...');
  
  try {
    const now = new Date();
    
    const commissions = await Commission.findAll({
      where: {
        status: 'approved',
        [Op.or]: [
          { hold_until: null },
          { hold_until: { [Op.lte]: now } }
        ]
      }
    });

    let processed = 0;
    for (const commission of commissions) {
      await commission.update({ status: 'payable' });
      processed++;
    }

    const result = { processed, total: commissions.length };
    console.log(`[Cron] Moved ${processed} commissions to payable`);
    
    await logCronExecution('process_approved_to_payable', result);
    return result;
  } catch (error) {
    console.error('[Cron] processApprovedToPayable error:', error);
    await logCronExecution('process_approved_to_payable', { error: error.message }, false);
    throw error;
  }
};

/**
 * Generate daily commission summary
 * Runs daily at 6:00 AM
 */
const generateDailySummary = async () => {
  console.log('[Cron] Generating daily commission summary...');
  
  try {
    const stats = await CommissionService.getStats();
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newYesterday = await Commission.count({
      where: {
        created_at: { [Op.between]: [yesterday, today] }
      }
    });

    const approvedYesterday = await Commission.count({
      where: {
        approved_at: { [Op.between]: [yesterday, today] }
      }
    });

    const summary = {
      date: yesterday.toISOString().split('T')[0],
      new_commissions: newYesterday,
      approved_commissions: approvedYesterday,
      overall_stats: stats
    };

    console.log(`[Cron] Daily summary:`, summary);
    await logCronExecution('daily_summary', summary);
    
    return summary;
  } catch (error) {
    console.error('[Cron] generateDailySummary error:', error);
    await logCronExecution('daily_summary', { error: error.message }, false);
    throw error;
  }
};

/**
 * Initialize all cron jobs
 */
const initializeCronJobs = () => {
  console.log('[Cron] Initializing cron jobs...');

  // Process pending validations - daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('[Cron] Running processPendingValidations...');
    await processPendingValidations();
  });

  // Auto-approve small commissions - daily at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('[Cron] Running autoApproveSmallCommissions...');
    await autoApproveSmallCommissions();
  });

  // Move approved to payable - daily at 4:00 AM
  cron.schedule('0 4 * * *', async () => {
    console.log('[Cron] Running processApprovedToPayable...');
    await processApprovedToPayable();
  });

  // Generate daily summary - daily at 6:00 AM
  cron.schedule('0 6 * * *', async () => {
    console.log('[Cron] Running generateDailySummary...');
    await generateDailySummary();
  });

  console.log('[Cron] Cron jobs initialized:');
  console.log('  - processPendingValidations: daily at 2:00 AM');
  console.log('  - autoApproveSmallCommissions: daily at 3:00 AM');
  console.log('  - processApprovedToPayable: daily at 4:00 AM');
  console.log('  - generateDailySummary: daily at 6:00 AM');
};

/**
 * Run a cron job manually (for testing or manual triggers)
 */
const runJob = async (jobName) => {
  switch (jobName) {
    case 'process_pending_validations':
      return await processPendingValidations();
    case 'auto_approve_commissions':
      return await autoApproveSmallCommissions();
    case 'process_approved_to_payable':
      return await processApprovedToPayable();
    case 'daily_summary':
      return await generateDailySummary();
    default:
      throw new Error(`Unknown job: ${jobName}`);
  }
};

module.exports = {
  initializeCronJobs,
  runJob,
  processPendingValidations,
  autoApproveSmallCommissions,
  processApprovedToPayable,
  generateDailySummary
};
