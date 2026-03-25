const { sequelize } = require('../../config/postgres');
const User = require('./User');
const Student = require('./Student');
const StudentDocument = require('./StudentDocument');
const Commission = require('./Commission');
const StudentPayment = require('./StudentPayment');
const Contact = require('./Contact');
const Session = require('./Session');
// New models for Phase 1
const Team = require('./Team');
const Program = require('./Program');
const Lead = require('./Lead');
const CommissionRule = require('./CommissionRule');
const Referral = require('./Referral');
const AuditLog = require('./AuditLog');
const Payout = require('./Payout');
// New models for SuperAdmin Portal
const FraudAlert = require('./FraudAlert');
const Manager = require('./Manager');
const PayoutCommission = require('./PayoutCommission');
// New models for Course Modules
const Module = require('./Module');
const ModuleProgress = require('./ModuleProgress');
// Commission Override Requests
const CommissionOverrideRequest = require('./CommissionOverrideRequest');
// Referral Attribution tracking
const ReferralAttribution = require('./ReferralAttribution');
// Clawback Rules
const ClawbackRule = require('./ClawbackRule');
// Stripe Payment tracking
const ProcessedWebhookEvent = require('./ProcessedWebhookEvent');
const StudentSubscription = require('./StudentSubscription');
// Website Settings
const WebsiteSetting = require('./WebsiteSetting');

// ============================================
// EXISTING ASSOCIATIONS
// ============================================

// User <-> Student (one-to-one for student users)
User.hasOne(Student, { foreignKey: 'user_id', as: 'student' });
Student.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User (rep) <-> Student (rep registers students)
User.hasMany(Student, { foreignKey: 'rep_id', as: 'registered_students' });
Student.belongsTo(User, { foreignKey: 'rep_id', as: 'rep' });

// Student <-> StudentDocument
Student.hasMany(StudentDocument, { foreignKey: 'student_id', as: 'documents' });
StudentDocument.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// Student <-> StudentPayment
Student.hasMany(StudentPayment, { foreignKey: 'student_id', as: 'payments' });
StudentPayment.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// User (rep) <-> Commission
User.hasMany(Commission, { foreignKey: 'rep_id', as: 'commissions' });
Commission.belongsTo(User, { foreignKey: 'rep_id', as: 'rep' });

// Student <-> Commission
Student.hasMany(Commission, { foreignKey: 'student_id', as: 'commissions' });
Commission.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// User <-> Session
User.hasMany(Session, { foreignKey: 'user_id', as: 'sessions' });
Session.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ============================================
// NEW ASSOCIATIONS FOR PHASE 1
// ============================================

// Team <-> Manager (User)
User.hasMany(Team, { foreignKey: 'manager_id', as: 'managed_teams' });
Team.belongsTo(User, { foreignKey: 'manager_id', as: 'manager' });

// User <-> Team (sales users belong to teams) - no FK constraint to avoid circular deps
// Team.hasMany(User, { foreignKey: 'team_id', as: 'members' });
// User.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });

// User <-> Manager (sales users have managers) - no FK constraint to avoid circular deps
// User.hasMany(User, { foreignKey: 'manager_id', as: 'team_members' });
// User.belongsTo(User, { foreignKey: 'manager_id', as: 'manager' });

// Lead <-> User (assigned sales user)
User.hasMany(Lead, { foreignKey: 'assigned_to', as: 'assigned_leads' });
Lead.belongsTo(User, { foreignKey: 'assigned_to', as: 'assigned_user' });

// Lead <-> Team
Team.hasMany(Lead, { foreignKey: 'team_id', as: 'leads' });
Lead.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });

// Lead <-> Program
Program.hasMany(Lead, { foreignKey: 'program_id', as: 'leads' });
Lead.belongsTo(Program, { foreignKey: 'program_id', as: 'program' });

// Lead <-> User (referrer)
User.hasMany(Lead, { foreignKey: 'referred_by', as: 'referred_leads' });
Lead.belongsTo(User, { foreignKey: 'referred_by', as: 'referrer' });

// Lead <-> Student (conversion)
Student.hasOne(Lead, { foreignKey: 'converted_to_student_id', as: 'source_lead' });
Lead.belongsTo(Student, { foreignKey: 'converted_to_student_id', as: 'converted_student' });

// CommissionRule <-> Program
Program.hasMany(CommissionRule, { foreignKey: 'program_id', as: 'commission_rules' });
CommissionRule.belongsTo(Program, { foreignKey: 'program_id', as: 'program' });

// Referral <-> User (referrer)
User.hasMany(Referral, { foreignKey: 'referrer_user_id', as: 'referrals' });
Referral.belongsTo(User, { foreignKey: 'referrer_user_id', as: 'referrer' });

// Referral <-> Lead
Lead.hasMany(Referral, { foreignKey: 'referred_lead_id', as: 'referral_records' });
Referral.belongsTo(Lead, { foreignKey: 'referred_lead_id', as: 'lead' });

// Referral <-> Student
Student.hasMany(Referral, { foreignKey: 'referred_student_id', as: 'referral_records' });
Referral.belongsTo(Student, { foreignKey: 'referred_student_id', as: 'student' });

// Referral <-> Program
Program.hasMany(Referral, { foreignKey: 'program_id', as: 'referrals' });
Referral.belongsTo(Program, { foreignKey: 'program_id', as: 'program' });

// AuditLog <-> User
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'audit_logs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Payout <-> User
User.hasMany(Payout, { foreignKey: 'user_id', as: 'payouts' });
Payout.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// FraudAlert <-> User
User.hasMany(FraudAlert, { foreignKey: 'related_user_id', as: 'fraud_alerts' });
FraudAlert.belongsTo(User, { foreignKey: 'related_user_id', as: 'related_user' });

// Manager <-> User
User.hasOne(Manager, { foreignKey: 'user_id', as: 'manager_record' });
Manager.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Payout <-> Commission (through PayoutCommission)
Payout.belongsToMany(Commission, { through: PayoutCommission, foreignKey: 'payout_id', otherKey: 'commission_id', as: 'commissions' });
Commission.belongsToMany(Payout, { through: PayoutCommission, foreignKey: 'commission_id', otherKey: 'payout_id', as: 'payouts' });

// ============================================
// MODULE ASSOCIATIONS
// ============================================

// Program <-> Module
Program.hasMany(Module, { foreignKey: 'programme_id', sourceKey: 'program_id', as: 'modules' });
Module.belongsTo(Program, { foreignKey: 'programme_id', targetKey: 'program_id', as: 'programme' });

// Module <-> ModuleProgress
Module.hasMany(ModuleProgress, { foreignKey: 'module_id', as: 'progress_records' });
ModuleProgress.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });

// Student <-> ModuleProgress
Student.hasMany(ModuleProgress, { foreignKey: 'student_id', as: 'module_progress' });
ModuleProgress.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// User <-> ModuleProgress
User.hasMany(ModuleProgress, { foreignKey: 'student_user_id', as: 'module_progress' });
ModuleProgress.belongsTo(User, { foreignKey: 'student_user_id', as: 'user' });

// Student <-> Program - manual association without FK constraint
// Program.hasMany(Student, { foreignKey: 'course_id', sourceKey: 'program_id', as: 'students' });
// Student.belongsTo(Program, { foreignKey: 'course_id', targetKey: 'program_id', as: 'program' });

// ============================================
// COMMISSION OVERRIDE REQUEST ASSOCIATIONS
// ============================================

// Commission <-> CommissionOverrideRequest
Commission.hasMany(CommissionOverrideRequest, { foreignKey: 'commission_id', as: 'override_requests' });
CommissionOverrideRequest.belongsTo(Commission, { foreignKey: 'commission_id', as: 'commission' });

// User <-> CommissionOverrideRequest (requester)
User.hasMany(CommissionOverrideRequest, { foreignKey: 'requested_by_user_id', as: 'override_requests_made' });
CommissionOverrideRequest.belongsTo(User, { foreignKey: 'requested_by_user_id', as: 'requester' });

// User <-> CommissionOverrideRequest (reviewer)
User.hasMany(CommissionOverrideRequest, { foreignKey: 'reviewed_by_user_id', as: 'override_requests_reviewed' });
CommissionOverrideRequest.belongsTo(User, { foreignKey: 'reviewed_by_user_id', as: 'reviewer' });

// Student <-> CommissionOverrideRequest
Student.hasMany(CommissionOverrideRequest, { foreignKey: 'student_id', as: 'override_requests' });
CommissionOverrideRequest.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// ============================================
// REFERRAL ATTRIBUTION ASSOCIATIONS
// ============================================

// User <-> ReferralAttribution (referrer)
User.hasMany(ReferralAttribution, { foreignKey: 'referrer_user_id', as: 'referral_attributions' });
ReferralAttribution.belongsTo(User, { foreignKey: 'referrer_user_id', as: 'referrer' });

// ============================================
// CLAWBACK RULE ASSOCIATIONS
// ============================================

Commission.belongsTo(ClawbackRule, { foreignKey: 'clawback_rule_id', as: 'clawback_rule' });
ClawbackRule.hasMany(Commission, { foreignKey: 'clawback_rule_id', as: 'commissions' });

module.exports = {
  sequelize,
  // Existing models
  User,
  Student,
  StudentDocument,
  Commission,
  StudentPayment,
  Contact,
  Session,
  // New Phase 1 models
  Team,
  Program,
  Lead,
  CommissionRule,
  Referral,
  AuditLog,
  Payout,
  // SuperAdmin Portal models
  FraudAlert,
  Manager,
  PayoutCommission,
  // Course Module models
  Module,
  ModuleProgress,
  // Commission Override
  CommissionOverrideRequest,
  // Referral Attribution
  ReferralAttribution,
  // Clawback Rules
  ClawbackRule,
  // Stripe Payment tracking
  ProcessedWebhookEvent,
  StudentSubscription,
  // Website Settings
  WebsiteSetting
};
