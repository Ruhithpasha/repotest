/**
 * Repository Index - Export all repositories
 */

// Existing repositories
const UserRepository = require('./UserRepository');
const StudentRepository = require('./StudentRepository');
const StudentDocumentRepository = require('./StudentDocumentRepository');
const CommissionRepository = require('./CommissionRepository');
const StudentPaymentRepository = require('./StudentPaymentRepository');
const ContactRepository = require('./ContactRepository');
const SessionRepository = require('./SessionRepository');

// New Phase 1 repositories
const TeamRepository = require('./TeamRepository');
const ProgramRepository = require('./ProgramRepository');
const LeadRepository = require('./LeadRepository');
const CommissionRuleRepository = require('./CommissionRuleRepository');
const ReferralRepository = require('./ReferralRepository');
const AuditLogRepository = require('./AuditLogRepository');
const PayoutRepository = require('./PayoutRepository');

module.exports = {
  // Existing
  UserRepository,
  StudentRepository,
  StudentDocumentRepository,
  CommissionRepository,
  StudentPaymentRepository,
  ContactRepository,
  SessionRepository,
  // New Phase 1
  TeamRepository,
  ProgramRepository,
  LeadRepository,
  CommissionRuleRepository,
  ReferralRepository,
  AuditLogRepository,
  PayoutRepository
};
