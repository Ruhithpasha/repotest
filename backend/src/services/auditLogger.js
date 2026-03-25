/**
 * Audit Logger Service
 * 
 * Provides centralized audit logging functionality
 */

const { v4: uuidv4 } = require('uuid');
const { AuditLogRepository } = require('../repositories');

/**
 * Create an audit log entry
 */
async function log({
  userId = null,
  userEmail = null,
  userRole = null,
  actionType,
  objectType,
  objectId = null,
  oldValue = null,
  newValue = null,
  description = null,
  ipAddress = null,
  userAgent = null,
  requestId = null
}) {
  try {
    const logEntry = await AuditLogRepository.createLog({
      log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
      user_id: userId,
      user_email: userEmail,
      user_role: userRole,
      action_type: actionType,
      object_type: objectType,
      object_id: objectId,
      old_value: oldValue,
      new_value: newValue,
      description,
      ip_address: ipAddress,
      user_agent: userAgent,
      request_id: requestId
    });

    console.log(`[Audit] ${actionType} on ${objectType}${objectId ? ':' + objectId : ''} by ${userEmail || 'system'}`);
    return logEntry;
  } catch (error) {
    console.error('[Audit] Failed to create log:', error);
    // Don't throw - audit logging should not break the main flow
    return null;
  }
}

/**
 * Helper to extract request metadata
 */
function getRequestMetadata(req) {
  return {
    ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent'],
    requestId: req.headers['x-request-id'] || `req_${Date.now()}`
  };
}

/**
 * Log user action with request context
 */
async function logUserAction(req, actionType, objectType, objectId, { oldValue, newValue, description } = {}) {
  const metadata = getRequestMetadata(req);
  
  return log({
    userId: req.user?.user_id,
    userEmail: req.user?.email,
    userRole: req.user?.role,
    actionType,
    objectType,
    objectId,
    oldValue,
    newValue,
    description,
    ...metadata
  });
}

/**
 * Pre-built logging functions for common actions
 */
const AuditLogger = {
  log,
  logUserAction,
  getRequestMetadata,

  // User actions
  async userCreated(req, user) {
    return logUserAction(req, 'user_created', 'user', user.user_id, {
      newValue: { email: user.email, role: user.role, name: user.name },
      description: `User ${user.email} created with role ${user.role}`
    });
  },

  async userUpdated(req, userId, oldData, newData) {
    return logUserAction(req, 'user_updated', 'user', userId, {
      oldValue: oldData,
      newValue: newData
    });
  },

  async userRoleChanged(req, userId, oldRole, newRole) {
    return logUserAction(req, 'user_role_changed', 'user', userId, {
      oldValue: { role: oldRole },
      newValue: { role: newRole },
      description: `Role changed from ${oldRole} to ${newRole}`
    });
  },

  async userStatusChanged(req, userId, isActive) {
    return logUserAction(req, 'user_status_changed', 'user', userId, {
      newValue: { is_active: isActive },
      description: `User ${isActive ? 'activated' : 'deactivated'}`
    });
  },

  async userLogin(req, user) {
    return logUserAction(req, 'user_login', 'user', user.user_id, {
      description: `User ${user.email} logged in`
    });
  },

  // Team actions
  async teamCreated(req, team) {
    return logUserAction(req, 'team_created', 'team', team.team_id, {
      newValue: { name: team.name, manager_id: team.manager_id },
      description: `Team "${team.name}" created`
    });
  },

  async teamMemberAdded(req, teamId, userId) {
    return logUserAction(req, 'team_member_added', 'team', teamId, {
      newValue: { user_id: userId },
      description: `User ${userId} added to team`
    });
  },

  async teamMemberRemoved(req, teamId, userId) {
    return logUserAction(req, 'team_member_removed', 'team', teamId, {
      oldValue: { user_id: userId },
      description: `User ${userId} removed from team`
    });
  },

  // Lead actions
  async leadCreated(req, lead) {
    return logUserAction(req, 'lead_created', 'lead', lead.lead_id, {
      newValue: { email: lead.email, source: lead.source },
      description: `Lead created: ${lead.email}`
    });
  },

  async leadAssigned(req, leadId, assignedTo, previousAssignee = null) {
    return logUserAction(req, 'lead_assigned', 'lead', leadId, {
      oldValue: previousAssignee ? { assigned_to: previousAssignee } : null,
      newValue: { assigned_to: assignedTo },
      description: `Lead assigned to ${assignedTo}`
    });
  },

  async leadStatusChanged(req, leadId, oldStatus, newStatus) {
    return logUserAction(req, 'lead_status_changed', 'lead', leadId, {
      oldValue: { status: oldStatus },
      newValue: { status: newStatus },
      description: `Lead status changed from ${oldStatus} to ${newStatus}`
    });
  },

  async leadConverted(req, leadId, studentId) {
    return logUserAction(req, 'lead_converted', 'lead', leadId, {
      newValue: { student_id: studentId },
      description: `Lead converted to student ${studentId}`
    });
  },

  // Commission actions
  async commissionCreated(req, commission) {
    return logUserAction(req, 'commission_created', 'commission', commission.commission_id, {
      newValue: {
        amount: commission.commission_amount_gbp,
        rep_id: commission.rep_id,
        student_id: commission.student_id
      },
      description: `Commission of £${commission.commission_amount_gbp} created`
    });
  },

  async commissionApproved(req, commissionId, amount) {
    return logUserAction(req, 'commission_approved', 'commission', commissionId, {
      newValue: { status: 'approved' },
      description: `Commission of £${amount} approved`
    });
  },

  async commissionPaid(req, commissionId, amount, paymentRef) {
    return logUserAction(req, 'commission_paid', 'commission', commissionId, {
      newValue: { status: 'paid', payment_reference: paymentRef },
      description: `Commission of £${amount} paid`
    });
  },

  async commissionReversed(req, commissionId, reason) {
    return logUserAction(req, 'commission_reversed', 'commission', commissionId, {
      newValue: { status: 'cancelled' },
      description: `Commission reversed: ${reason}`
    });
  },

  // Referral actions
  async referralCreated(req, referral) {
    return logUserAction(req, 'referral_created', 'referral', referral.referral_id, {
      newValue: {
        referrer_id: referral.referrer_user_id,
        referred_email: referral.referred_email
      }
    });
  },

  async referralApproved(req, referralId) {
    return logUserAction(req, 'referral_approved', 'referral', referralId, {
      newValue: { fraud_review_status: 'approved' }
    });
  },

  async referralRejected(req, referralId, reason) {
    return logUserAction(req, 'referral_rejected', 'referral', referralId, {
      newValue: { fraud_review_status: 'rejected', reason }
    });
  },

  // Payment actions
  async paymentCreated(req, payment) {
    return logUserAction(req, 'payment_created', 'payment', payment.payment_id, {
      newValue: {
        amount: payment.amount_gbp,
        student_id: payment.student_id,
        status: payment.status
      }
    });
  },

  async paymentRefunded(req, paymentId, amount, reason) {
    return logUserAction(req, 'payment_refunded', 'payment', paymentId, {
      newValue: { status: 'refunded', amount, reason }
    });
  },

  // Payout actions
  async payoutCreated(req, payout) {
    return logUserAction(req, 'payout_created', 'payout', payout.payout_id, {
      newValue: {
        amount: payout.total_amount,
        user_id: payout.user_id,
        commission_count: payout.commission_count
      }
    });
  },

  async payoutApproved(req, payoutId, amount) {
    return logUserAction(req, 'payout_approved', 'payout', payoutId, {
      newValue: { status: 'approved' },
      description: `Payout of £${amount} approved`
    });
  },

  async payoutProcessed(req, payoutId, paymentRef) {
    return logUserAction(req, 'payout_processed', 'payout', payoutId, {
      newValue: { status: 'paid', payment_reference: paymentRef }
    });
  },

  // Export action
  async exportGenerated(req, exportType, filters) {
    return logUserAction(req, 'export_generated', 'export', null, {
      newValue: { type: exportType, filters },
      description: `${exportType} export generated`
    });
  }
};

module.exports = AuditLogger;
