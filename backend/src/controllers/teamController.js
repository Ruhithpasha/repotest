/**
 * Team Controller
 * 
 * Handles team management for sales hierarchy
 */

const { v4: uuidv4 } = require('uuid');
const { TeamRepository, UserRepository, LeadRepository } = require('../repositories');
const AuditLogger = require('../services/auditLogger');

/**
 * Get all teams (super admin only)
 * GET /api/teams
 */
exports.getAllTeams = async (req, res) => {
  try {
    const teams = await TeamRepository.findAllActive();
    
    const teamsWithStats = await Promise.all(
      teams.map(async (team) => {
        const manager = await UserRepository.findByUserId(team.manager_id);
        const memberCount = await UserRepository.countByTeam(team.team_id);
        const leadStats = await LeadRepository.countByStatus({ team_id: team.team_id });
        
        return {
          ...team.toJSON(),
          manager: manager ? { user_id: manager.user_id, name: manager.name, email: manager.email } : null,
          member_count: memberCount,
          lead_stats: leadStats.reduce((acc, s) => { acc[s.status] = parseInt(s.count); return acc; }, {})
        };
      })
    );

    res.json(teamsWithStats);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ detail: 'Failed to get teams' });
  }
};

/**
 * Get team by ID
 * GET /api/teams/:teamId
 */
exports.getTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await TeamRepository.getTeamWithMembers(teamId);
    
    if (!team) {
      return res.status(404).json({ detail: 'Team not found' });
    }

    // Check access for managers
    if (req.user.role === 'manager' && team.manager_id !== req.user.user_id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    res.json(team);
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ detail: 'Failed to get team' });
  }
};

/**
 * Create new team
 * POST /api/teams
 */
exports.createTeam = async (req, res) => {
  try {
    const { name, description, manager_id } = req.body;

    if (!name || !manager_id) {
      return res.status(400).json({ detail: 'Name and manager_id are required' });
    }

    // Verify manager exists and has manager role
    const manager = await UserRepository.findByUserId(manager_id);
    if (!manager) {
      return res.status(404).json({ detail: 'Manager not found' });
    }
    if (manager.role !== 'manager' && manager.role !== 'super_admin') {
      return res.status(400).json({ detail: 'Selected user must have manager role' });
    }

    const teamId = `team_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const team = await TeamRepository.createTeam({
      team_id: teamId,
      name,
      description,
      manager_id,
      created_by: req.user.user_id
    });

    await AuditLogger.teamCreated(req, team);

    res.status(201).json({
      message: 'Team created successfully',
      team: team.toJSON()
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ detail: 'Failed to create team' });
  }
};

/**
 * Update team
 * PATCH /api/teams/:teamId
 */
exports.updateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, description, manager_id, is_active } = req.body;

    const team = await TeamRepository.findByTeamId(teamId);
    if (!team) {
      return res.status(404).json({ detail: 'Team not found' });
    }

    // Check access for managers
    if (req.user.role === 'manager' && team.manager_id !== req.user.user_id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (manager_id && req.user.role === 'super_admin') updates.manager_id = manager_id;
    if (is_active !== undefined && req.user.role === 'super_admin') updates.is_active = is_active;

    const updatedTeam = await TeamRepository.updateTeam(teamId, updates);

    res.json({
      message: 'Team updated successfully',
      team: updatedTeam.toJSON()
    });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ detail: 'Failed to update team' });
  }
};

/**
 * Add member to team
 * POST /api/teams/:teamId/members
 */
exports.addMember = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ detail: 'user_id is required' });
    }

    const team = await TeamRepository.findByTeamId(teamId);
    if (!team) {
      return res.status(404).json({ detail: 'Team not found' });
    }

    // Check access
    if (req.user.role === 'manager' && team.manager_id !== req.user.user_id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const user = await UserRepository.findByUserId(user_id);
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    if (!['sales_user', 'rep'].includes(user.role)) {
      return res.status(400).json({ detail: 'Only sales users and reps can be added to teams' });
    }

    await UserRepository.updateUser(user_id, {
      team_id: teamId,
      manager_id: team.manager_id
    });

    await AuditLogger.teamMemberAdded(req, teamId, user_id);

    res.json({
      message: 'Member added to team successfully',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ detail: 'Failed to add member' });
  }
};

/**
 * Remove member from team
 * DELETE /api/teams/:teamId/members/:userId
 */
exports.removeMember = async (req, res) => {
  try {
    const { teamId, userId } = req.params;

    const team = await TeamRepository.findByTeamId(teamId);
    if (!team) {
      return res.status(404).json({ detail: 'Team not found' });
    }

    // Check access
    if (req.user.role === 'manager' && team.manager_id !== req.user.user_id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const user = await UserRepository.findByUserId(userId);
    if (!user || user.team_id !== teamId) {
      return res.status(404).json({ detail: 'User not found in this team' });
    }

    await UserRepository.updateUser(userId, {
      team_id: null,
      manager_id: null
    });

    await AuditLogger.teamMemberRemoved(req, teamId, userId);

    res.json({ message: 'Member removed from team successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ detail: 'Failed to remove member' });
  }
};

/**
 * Get teams managed by current user (for managers)
 * GET /api/teams/my-teams
 */
exports.getMyTeams = async (req, res) => {
  try {
    if (req.user.role !== 'manager' && req.user.role !== 'super_admin') {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const teams = await TeamRepository.findByManagerId(req.user.user_id);
    
    const teamsWithStats = await Promise.all(
      teams.map(async (team) => {
        const memberCount = await UserRepository.countByTeam(team.team_id);
        const conversionRate = await LeadRepository.getConversionRate({ team_id: team.team_id });
        
        return {
          ...team.toJSON(),
          member_count: memberCount,
          conversion_rate: conversionRate.rate,
          total_leads: conversionRate.total,
          converted_leads: conversionRate.converted
        };
      })
    );

    res.json(teamsWithStats);
  } catch (error) {
    console.error('Get my teams error:', error);
    res.status(500).json({ detail: 'Failed to get teams' });
  }
};

module.exports = exports;
