/**
 * Payout Controller
 * 
 * Handles payout batch creation and management
 */

const { v4: uuidv4 } = require('uuid');
const { 
  PayoutRepository, 
  CommissionRepository,
  UserRepository
} = require('../repositories');
const AuditLogger = require('../services/auditLogger');
const { PayoutCommission, Commission, User, Student, Program } = require('../models/pg');

/**
 * Get all payouts with filters
 * GET /api/payouts
 */
exports.getPayouts = async (req, res) => {
  try {
    const { status, user_id, date_from, date_to, limit, offset } = req.query;
    
    console.log('[Payouts] GET /api/payouts called');
    console.log('[Payouts] Query params:', { status, user_id, date_from, date_to, limit, offset });
    console.log('[Payouts] User:', { user_id: req.user.user_id, role: req.user.role });
    
    let filters = { status, date_from, date_to, limit: parseInt(limit), offset: parseInt(offset) };

    // Role-based filtering
    if (['rep', 'sales_user', 'manager'].includes(req.user.role)) {
      filters.user_id = req.user.user_id;
      console.log('[Payouts] Filtering by user_id (own):', req.user.user_id);
    } else if (user_id) {
      filters.user_id = user_id;
    }

    console.log('[Payouts] Final filters:', filters);

    const payouts = await PayoutRepository.findAll(filters);
    console.log('[Payouts] Found payouts:', payouts.length);
    
    res.json(payouts);
  } catch (error) {
    console.error('[Payouts] Get payouts error:', error);
    res.status(500).json({ detail: 'Failed to get payouts' });
  }
};

/**
 * Get payout by ID
 * GET /api/payouts/:payoutId
 */
exports.getPayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const payout = await PayoutRepository.findByPayoutId(payoutId);
    
    if (!payout) {
      return res.status(404).json({ detail: 'Payout not found' });
    }

    // Check access
    if (['rep', 'sales_user'].includes(req.user.role) && payout.user_id !== req.user.user_id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    // Get related commissions
    const commissions = await CommissionRepository.findByPayoutId(payoutId);

    res.json({
      ...payout.toJSON(),
      commissions
    });
  } catch (error) {
    console.error('Get payout error:', error);
    res.status(500).json({ detail: 'Failed to get payout' });
  }
};

/**
 * Get my payouts
 * GET /api/payouts/my-payouts
 */
exports.getMyPayouts = async (req, res) => {
  try {
    const { status } = req.query;
    const payouts = await PayoutRepository.findByUserId(req.user.user_id, { status });
    const totalPaid = await PayoutRepository.sumByUser(req.user.user_id, 'paid');
    const totalPending = await PayoutRepository.sumByUser(req.user.user_id, 'pending');

    res.json({
      payouts,
      summary: {
        total_paid: totalPaid || 0,
        total_pending: totalPending || 0
      }
    });
  } catch (error) {
    console.error('Get my payouts error:', error);
    res.status(500).json({ detail: 'Failed to get payouts' });
  }
};

/**
 * Create payout batch for a user
 * POST /api/payouts
 */
exports.createPayout = async (req, res) => {
  try {
    let { user_id, commission_ids, notes } = req.body;

    // If no user_id provided but commission_ids are, get user_id from first commission
    if (!user_id && commission_ids && commission_ids.length > 0) {
      const firstComm = await CommissionRepository.findByCommissionId(commission_ids[0]);
      if (firstComm) {
        user_id = firstComm.rep_id;
      }
    }

    if (!user_id) {
      return res.status(400).json({ detail: 'user_id is required or provide commission_ids' });
    }

    // Get user
    const user = await UserRepository.findByUserId(user_id);
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Get payable commissions
    let commissions;
    if (commission_ids && commission_ids.length > 0) {
      commissions = await Promise.all(
        commission_ids.map(id => CommissionRepository.findByCommissionId(id))
      );
      commissions = commissions.filter(c => c && c.rep_id === user_id && c.status === 'payable');
    } else {
      commissions = await CommissionRepository.findPayable(user_id);
    }

    if (commissions.length === 0) {
      return res.status(400).json({ detail: 'No payable commissions found for this user' });
    }

    // Calculate total
    const totalAmount = commissions.reduce((sum, c) => sum + parseFloat(c.commission_amount_gbp), 0);
    const commissionIds = commissions.map(c => c.commission_id);

    // Create payout
    const payoutId = `payout_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const batchId = `batch_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${uuidv4().slice(0, 4)}`;

    const payout = await PayoutRepository.createPayout({
      payout_id: payoutId,
      user_id,
      user_name: user.name,
      user_email: user.email,
      payout_type: 'commission',
      commission_ids: commissionIds,
      commission_count: commissions.length,
      total_amount: Math.round(totalAmount * 100) / 100,
      currency: 'GBP',
      status: 'pending',
      batch_id: batchId,
      bank_details: user.bank_details,
      notes,
      period_start: commissions[commissions.length - 1]?.created_at,
      period_end: commissions[0]?.created_at
    });

    // Create payout_batch_items records for each commission
    const batchItems = commissions.map(c => ({
      payout_id: payoutId,
      commission_id: c.commission_id,
      amount: parseFloat(c.commission_amount_gbp),
      status: 'pending',
      transfer_reference: null,
      processed_at: null
    }));
    
    await PayoutCommission.bulkCreate(batchItems, {
      ignoreDuplicates: true // Handle case where commission already in another batch
    });

    // Link commissions to payout
    await CommissionRepository.bulkUpdateStatus(commissionIds, 'payable', { payout_id: payoutId });

    try {
      await AuditLogger.payoutCreated(req, payout);
    } catch (auditErr) {
      console.error('Audit log error (non-blocking):', auditErr.message);
    }

    res.status(201).json({
      message: 'Payout created successfully',
      payout: payout.toJSON()
    });
  } catch (error) {
    console.error('Create payout error:', error);
    res.status(500).json({ detail: 'Failed to create payout' });
  }
};

/**
 * Approve payout
 * POST /api/payouts/:payoutId/approve
 */
exports.approvePayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const payout = await PayoutRepository.findByPayoutId(payoutId);
    
    if (!payout) {
      return res.status(404).json({ detail: 'Payout not found' });
    }

    if (payout.status !== 'pending') {
      return res.status(400).json({ detail: 'Payout cannot be approved in current status' });
    }

    const updatedPayout = await PayoutRepository.approvePayout(payoutId, req.user.user_id);

    await AuditLogger.payoutApproved(req, payoutId, payout.total_amount);

    res.json({
      message: 'Payout approved',
      payout: updatedPayout.toJSON()
    });
  } catch (error) {
    console.error('Approve payout error:', error);
    res.status(500).json({ detail: 'Failed to approve payout' });
  }
};

/**
 * Mark payout as paid
 * POST /api/payouts/:payoutId/paid
 */
exports.markPaid = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { payment_reference, payment_method } = req.body;

    const payout = await PayoutRepository.findByPayoutId(payoutId);
    if (!payout) {
      return res.status(404).json({ detail: 'Payout not found' });
    }

    if (!['pending', 'approved'].includes(payout.status)) {
      return res.status(400).json({ detail: 'Payout cannot be marked as paid in current status' });
    }

    // Update payout
    const updatedPayout = await PayoutRepository.markPaid(payoutId, req.user.user_id, payment_reference);

    // Update related commissions
    if (payout.commission_ids && payout.commission_ids.length > 0) {
      for (const commissionId of payout.commission_ids) {
        await CommissionRepository.markAsPaid(commissionId, {
          paidBy: req.user.user_id,
          paymentMethod: payment_method || 'bank_transfer',
          paymentReference: payment_reference,
          payoutId
        });
      }
    }

    // Update payout_batch_items status to completed
    await PayoutCommission.update(
      { 
        status: 'completed', 
        transfer_reference: payment_reference,
        processed_at: new Date()
      },
      { where: { payout_id: payoutId } }
    );

    await AuditLogger.payoutProcessed(req, payoutId, payment_reference);

    res.json({
      message: 'Payout marked as paid',
      payout: updatedPayout.toJSON()
    });
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({ detail: 'Failed to mark payout as paid' });
  }
};

/**
 * Cancel payout
 * POST /api/payouts/:payoutId/cancel
 */
exports.cancelPayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { reason } = req.body;

    const payout = await PayoutRepository.findByPayoutId(payoutId);
    if (!payout) {
      return res.status(404).json({ detail: 'Payout not found' });
    }

    if (payout.status === 'paid') {
      return res.status(400).json({ detail: 'Paid payouts cannot be cancelled' });
    }

    // Update payout
    const updatedPayout = await PayoutRepository.updateStatus(payoutId, 'cancelled', {
      notes: reason
    });

    // Return commissions to payable status
    if (payout.commission_ids && payout.commission_ids.length > 0) {
      await CommissionRepository.bulkUpdateStatus(payout.commission_ids, 'payable', {
        payout_id: null
      });
    }

    res.json({
      message: 'Payout cancelled',
      payout: updatedPayout.toJSON()
    });
  } catch (error) {
    console.error('Cancel payout error:', error);
    res.status(500).json({ detail: 'Failed to cancel payout' });
  }
};

/**
 * Get payout statistics
 * GET /api/payouts/stats
 */
exports.getStats = async (req, res) => {
  try {
    const stats = await PayoutRepository.getStats();

    res.json({
      by_status: stats,
      total_pending: stats.pending?.total || 0,
      total_approved: stats.approved?.total || 0,
      total_paid: stats.paid?.total || 0
    });
  } catch (error) {
    console.error('Get payout stats error:', error);
    res.status(500).json({ detail: 'Failed to get stats' });
  }
};

/**
 * Export payouts to CSV
 * GET /api/payouts/export
 */
exports.exportPayouts = async (req, res) => {
  try {
    const { status, date_from, date_to, format } = req.query;
    
    const payouts = await PayoutRepository.findAll({ status, date_from, date_to, limit: 1000 });

    // Generate CSV
    const headers = ['Payout ID', 'User', 'Email', 'Amount (GBP)', 'Status', 'Commission Count', 'Created At', 'Paid At', 'Payment Reference'];
    const rows = payouts.map(p => [
      p.payout_id,
      p.user_name,
      p.user_email,
      p.total_amount,
      p.status,
      p.commission_count,
      p.created_at?.toISOString(),
      p.paid_at?.toISOString() || '',
      p.payment_reference || ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

    await AuditLogger.exportGenerated(req, 'payouts_export', { status, date_from, date_to });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payouts_export_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export payouts error:', error);
    res.status(500).json({ detail: 'Failed to export payouts' });
  }
};

/**
 * Get payout batch items
 * GET /api/payouts/:payoutId/items
 */
exports.getBatchItems = async (req, res) => {
  try {
    const { payoutId } = req.params;

    // First verify the payout exists
    const payout = await PayoutRepository.findByPayoutId(payoutId);
    if (!payout) {
      return res.status(404).json({ detail: 'Payout not found' });
    }

    // Check access for non-admin users
    if (['rep', 'sales_user'].includes(req.user.role) && payout.user_id !== req.user.user_id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    // Get batch items with commission details
    const batchItems = await PayoutCommission.findAll({
      where: { payout_id: payoutId },
      order: [['created_at', 'ASC']]
    });

    // Enrich with commission and related data
    const enrichedItems = await Promise.all(batchItems.map(async (item) => {
      const commission = await Commission.findOne({
        where: { commission_id: item.commission_id },
        include: [
          { model: User, as: 'rep', attributes: ['user_id', 'name', 'email', 'role'] },
          { model: Student, as: 'student', attributes: ['student_id', 'name', 'email'] }
        ]
      });

      // Get programme name if commission has program_id
      let programmeName = null;
      if (commission?.program_id) {
        const programme = await Program.findOne({ 
          where: { program_id: commission.program_id },
          attributes: ['name']
        });
        programmeName = programme?.name || null;
      }

      return {
        id: item.id,
        payout_id: item.payout_id,
        commission_id: item.commission_id,
        amount: parseFloat(item.amount),
        status: item.status,
        transfer_reference: item.transfer_reference,
        processed_at: item.processed_at,
        created_at: item.created_at,
        // Commission details
        commission: commission ? {
          commission_id: commission.commission_id,
          role_type: commission.role_type,
          commission_type: commission.commission_type,
          commission_value: parseFloat(commission.commission_value || 0),
          commission_amount_gbp: parseFloat(commission.commission_amount_gbp),
          sale_amount_gbp: parseFloat(commission.sale_amount_gbp),
          status: commission.status,
          created_at: commission.created_at,
          beneficiary: commission.rep ? {
            user_id: commission.rep.user_id,
            name: commission.rep.name,
            email: commission.rep.email,
            role: commission.rep.role
          } : null,
          student: commission.student ? {
            student_id: commission.student.student_id,
            name: commission.student.name,
            email: commission.student.email
          } : null,
          programme_name: programmeName
        } : null
      };
    }));

    res.json({
      payout_id: payoutId,
      batch_id: payout.batch_id,
      total_items: enrichedItems.length,
      total_amount: parseFloat(payout.total_amount),
      payout_status: payout.status,
      items: enrichedItems
    });
  } catch (error) {
    console.error('Get batch items error:', error);
    res.status(500).json({ detail: 'Failed to get batch items' });
  }
};

module.exports = exports;
