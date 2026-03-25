/**
 * Program Controller
 * 
 * Handles program/course management
 */

const { v4: uuidv4 } = require('uuid');
const { ProgramRepository, CommissionRuleRepository } = require('../repositories');

/**
 * Get all programs
 * GET /api/programs
 */
exports.getAllPrograms = async (req, res) => {
  try {
    const { include_inactive } = req.query;
    
    let programs;
    if (include_inactive === 'true' && ['super_admin', 'admin'].includes(req.user.role)) {
      programs = await ProgramRepository.findAll();
    } else {
      programs = await ProgramRepository.findAllActive();
    }

    res.json(programs);
  } catch (error) {
    console.error('Get programs error:', error);
    res.status(500).json({ detail: 'Failed to get programs' });
  }
};

/**
 * Get program by ID
 * GET /api/programs/:programId
 */
exports.getProgram = async (req, res) => {
  try {
    const { programId } = req.params;
    const program = await ProgramRepository.findByProgramId(programId);
    
    if (!program) {
      return res.status(404).json({ detail: 'Program not found' });
    }

    // Get commission rules for this program
    const rules = await CommissionRuleRepository.findActiveRules({ program_id: programId });

    res.json({
      ...program.toJSON(),
      commission_rules: rules
    });
  } catch (error) {
    console.error('Get program error:', error);
    res.status(500).json({ detail: 'Failed to get program' });
  }
};

/**
 * Create program (super admin only)
 * POST /api/programs
 */
exports.createProgram = async (req, res) => {
  try {
    const {
      name, description, price_gbp, currency, duration_months,
      commission_type, commission_value, referral_commission_percent, display_order
    } = req.body;

    if (!name || !price_gbp) {
      return res.status(400).json({ detail: 'Name and price are required' });
    }

    const programId = `prog_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    
    const program = await ProgramRepository.createProgram({
      program_id: programId,
      name,
      description,
      price_gbp,
      currency: currency || 'GBP',
      duration_months: duration_months || 12,
      commission_type: commission_type || 'percentage',
      commission_value: commission_value || 0.04,
      referral_commission_percent: referral_commission_percent || 0.05,
      display_order: display_order || 0
    });

    res.status(201).json({
      message: 'Program created successfully',
      program: program.toJSON()
    });
  } catch (error) {
    console.error('Create program error:', error);
    res.status(500).json({ detail: 'Failed to create program' });
  }
};

/**
 * Update program (super admin only)
 * PATCH /api/programs/:programId
 */
exports.updateProgram = async (req, res) => {
  try {
    const { programId } = req.params;
    const updates = req.body;

    const program = await ProgramRepository.findByProgramId(programId);
    if (!program) {
      return res.status(404).json({ detail: 'Program not found' });
    }

    delete updates.program_id;
    delete updates.created_at;

    const updatedProgram = await ProgramRepository.updateProgram(programId, updates);

    res.json({
      message: 'Program updated successfully',
      program: updatedProgram.toJSON()
    });
  } catch (error) {
    console.error('Update program error:', error);
    res.status(500).json({ detail: 'Failed to update program' });
  }
};

/**
 * Toggle program status
 * PATCH /api/programs/:programId/toggle-status
 */
exports.toggleStatus = async (req, res) => {
  try {
    const { programId } = req.params;

    const program = await ProgramRepository.findByProgramId(programId);
    if (!program) {
      return res.status(404).json({ detail: 'Program not found' });
    }

    const updatedProgram = await ProgramRepository.toggleStatus(programId);

    res.json({
      message: `Program ${updatedProgram.is_active ? 'activated' : 'deactivated'} successfully`,
      program: updatedProgram.toJSON()
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ detail: 'Failed to toggle status' });
  }
};

module.exports = exports;
