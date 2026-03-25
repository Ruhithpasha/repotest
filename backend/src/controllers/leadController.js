/**
 * Lead Controller
 * 
 * Handles CRM lead management
 */

const { v4: uuidv4 } = require('uuid');
const { LeadRepository, UserRepository, TeamRepository, ProgramRepository, StudentRepository } = require('../repositories');
const AuditLogger = require('../services/auditLogger');

/**
 * Get all leads with filters
 * GET /api/leads
 */
exports.getLeads = async (req, res) => {
  try {
    const { status, source, team_id, assigned_to, program_id, search, date_from, date_to, limit, offset } = req.query;
    
    let filters = { status, source, program_id, search, date_from, date_to, limit: parseInt(limit), offset: parseInt(offset) };

    // Role-based filtering
    if (req.user.role === 'sales_user') {
      // Sales users can only see their own leads
      filters.assigned_to = req.user.user_id;
    } else if (req.user.role === 'manager') {
      // Managers can see leads from their teams only
      const teams = await TeamRepository.findByManagerId(req.user.user_id);
      const teamIds = teams.map(t => t.team_id);
      if (team_id && teamIds.includes(team_id)) {
        filters.team_id = team_id;
      } else if (teamIds.length > 0) {
        filters.team_id = teamIds[0]; // Default to first team
      }
      if (assigned_to) filters.assigned_to = assigned_to;
    } else {
      // Super admin / admin can see all
      if (team_id) filters.team_id = team_id;
      if (assigned_to) filters.assigned_to = assigned_to;
    }

    const leads = await LeadRepository.findAll(filters);
    
    res.json(leads);
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ detail: 'Failed to get leads' });
  }
};

/**
 * Get lead by ID
 * GET /api/leads/:leadId
 */
exports.getLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    const lead = await LeadRepository.findByLeadId(leadId);
    
    if (!lead) {
      return res.status(404).json({ detail: 'Lead not found' });
    }

    // Check access
    if (req.user.role === 'sales_user' && lead.assigned_to !== req.user.user_id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    // Get related data
    const assignedUser = lead.assigned_to ? await UserRepository.findByUserId(lead.assigned_to) : null;
    const team = lead.team_id ? await TeamRepository.findByTeamId(lead.team_id) : null;
    const program = lead.program_id ? await ProgramRepository.findByProgramId(lead.program_id) : null;
    const referrer = lead.referred_by ? await UserRepository.findByUserId(lead.referred_by) : null;

    res.json({
      ...lead.toJSON(),
      assigned_user: assignedUser ? { user_id: assignedUser.user_id, name: assignedUser.name, email: assignedUser.email } : null,
      team: team ? { team_id: team.team_id, name: team.name } : null,
      program: program ? { program_id: program.program_id, name: program.name, price_gbp: program.price_gbp } : null,
      referrer: referrer ? { user_id: referrer.user_id, name: referrer.name } : null
    });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ detail: 'Failed to get lead' });
  }
};

/**
 * Create new lead
 * POST /api/leads
 */
exports.createLead = async (req, res) => {
  try {
    const {
      name, email, phone, whatsapp, city, state, country,
      profession, experience_years, program_id, source, source_details,
      referral_code, notes, assigned_to, team_id
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ detail: 'Name and email are required' });
    }

    // Check for duplicate email
    const existingLead = await LeadRepository.findByEmail(email);
    if (existingLead) {
      return res.status(400).json({ 
        detail: 'Lead with this email already exists',
        existing_lead_id: existingLead.lead_id
      });
    }

    const leadId = `lead_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    
    // Handle referral tracking
    let referredBy = null;
    if (referral_code) {
      const referrer = await UserRepository.findByReferralCode(referral_code);
      if (referrer) {
        referredBy = referrer.user_id;
      }
    }

    // Auto-assign to current user if sales_user
    let finalAssignedTo = assigned_to;
    let finalTeamId = team_id;
    if (req.user.role === 'sales_user') {
      finalAssignedTo = req.user.user_id;
      finalTeamId = req.user.team_id;
    }

    const lead = await LeadRepository.createLead({
      lead_id: leadId,
      name,
      email,
      phone,
      whatsapp: whatsapp || phone,
      city,
      state,
      country: country || 'India',
      profession,
      experience_years,
      program_id,
      source: source || 'website',
      source_details,
      referral_code,
      referred_by: referredBy,
      notes,
      assigned_to: finalAssignedTo,
      team_id: finalTeamId,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      utm_source: req.query.utm_source,
      utm_medium: req.query.utm_medium,
      utm_campaign: req.query.utm_campaign
    });

    await AuditLogger.leadCreated(req, lead);

    res.status(201).json({
      message: 'Lead created successfully',
      lead: lead.toJSON()
    });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ detail: 'Failed to create lead' });
  }
};

/**
 * Update lead
 * PATCH /api/leads/:leadId
 */
exports.updateLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    const updates = req.body;

    const lead = await LeadRepository.findByLeadId(leadId);
    if (!lead) {
      return res.status(404).json({ detail: 'Lead not found' });
    }

    // Check access
    if (req.user.role === 'sales_user' && lead.assigned_to !== req.user.user_id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    // Remove fields that shouldn't be updated directly
    delete updates.lead_id;
    delete updates.created_at;
    delete updates.converted_to_student_id;
    delete updates.converted_at;

    const updatedLead = await LeadRepository.updateLead(leadId, updates);

    res.json({
      message: 'Lead updated successfully',
      lead: updatedLead.toJSON()
    });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ detail: 'Failed to update lead' });
  }
};

/**
 * Update lead status
 * PATCH /api/leads/:leadId/status
 */
exports.updateStatus = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ detail: 'Status is required' });
    }

    const lead = await LeadRepository.findByLeadId(leadId);
    if (!lead) {
      return res.status(404).json({ detail: 'Lead not found' });
    }

    // Check access
    if (req.user.role === 'sales_user' && lead.assigned_to !== req.user.user_id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const oldStatus = lead.status;
    const updateData = { last_contact_at: new Date() };
    if (notes) updateData.notes = notes;

    const updatedLead = await LeadRepository.updateStatus(leadId, status, updateData);

    await AuditLogger.leadStatusChanged(req, leadId, oldStatus, status);

    res.json({
      message: 'Status updated successfully',
      lead: updatedLead.toJSON()
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ detail: 'Failed to update status' });
  }
};

/**
 * Assign lead to sales user
 * PATCH /api/leads/:leadId/assign
 */
exports.assignLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { user_id, team_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ detail: 'user_id is required' });
    }

    const lead = await LeadRepository.findByLeadId(leadId);
    if (!lead) {
      return res.status(404).json({ detail: 'Lead not found' });
    }

    // Verify the user exists
    const assignee = await UserRepository.findByUserId(user_id);
    if (!assignee) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Manager can only assign to their team members
    if (req.user.role === 'manager') {
      const teams = await TeamRepository.findByManagerId(req.user.user_id);
      const teamIds = teams.map(t => t.team_id);
      if (!teamIds.includes(assignee.team_id)) {
        return res.status(403).json({ detail: 'Can only assign to your team members' });
      }
    }

    const previousAssignee = lead.assigned_to;
    const finalTeamId = team_id || assignee.team_id;

    const updatedLead = await LeadRepository.assignToUser(leadId, user_id, finalTeamId);

    await AuditLogger.leadAssigned(req, leadId, user_id, previousAssignee);

    res.json({
      message: 'Lead assigned successfully',
      lead: updatedLead.toJSON()
    });
  } catch (error) {
    console.error('Assign lead error:', error);
    res.status(500).json({ detail: 'Failed to assign lead' });
  }
};

/**
 * Get lead statistics
 * GET /api/leads/stats
 */
exports.getStats = async (req, res) => {
  try {
    const { team_id, assigned_to, date_from, date_to } = req.query;
    
    let filters = { team_id, assigned_to };

    // Role-based filtering
    if (req.user.role === 'sales_user') {
      filters.assigned_to = req.user.user_id;
    } else if (req.user.role === 'manager') {
      const teams = await TeamRepository.findByManagerId(req.user.user_id);
      if (teams.length > 0 && !team_id) {
        filters.team_id = teams[0].team_id;
      }
    }

    const [statusCounts, sourceCounts, conversionRate] = await Promise.all([
      LeadRepository.countByStatus(filters),
      LeadRepository.countBySource(filters),
      LeadRepository.getConversionRate(filters)
    ]);

    res.json({
      by_status: statusCounts.reduce((acc, s) => { acc[s.status] = parseInt(s.count); return acc; }, {}),
      by_source: sourceCounts.reduce((acc, s) => { acc[s.source] = parseInt(s.count); return acc; }, {}),
      conversion: conversionRate
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ detail: 'Failed to get stats' });
  }
};

/**
 * Get my leads (for sales users)
 * GET /api/leads/my-leads
 */
exports.getMyLeads = async (req, res) => {
  try {
    const { status, source } = req.query;
    const leads = await LeadRepository.findByAssignedUser(req.user.user_id, { status, source });
    res.json(leads);
  } catch (error) {
    console.error('Get my leads error:', error);
    res.status(500).json({ detail: 'Failed to get leads' });
  }
};

module.exports = exports;
