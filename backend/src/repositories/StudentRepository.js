const { Op } = require('sequelize');
const BaseRepository = require('./BaseRepository');
const { Student } = require('../models/pg');

class StudentRepository extends BaseRepository {
  constructor() {
    super(Student);
  }

  // Find student by student_id
  async findByStudentId(studentId) {
    return this.model.findOne({ where: { student_id: studentId } });
  }

  // Find student by user_id
  async findByUserId(userId) {
    return this.model.findOne({ where: { user_id: userId } });
  }

  // Find students by rep_id
  async findByRepId(repId, status = null) {
    const where = { rep_id: repId };
    if (status && status !== 'all') {
      where.status = status;
    }
    return this.model.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
  }

  // Find student by rep_id and student_id (ownership check)
  async findByRepAndStudentId(repId, studentId) {
    return this.model.findOne({
      where: { student_id: studentId, rep_id: repId }
    });
  }

  // Find all students with optional status filter
  async findAllWithStatus(status = null) {
    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    return this.model.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
  }

  // Create student
  async createStudent(studentData) {
    return this.model.create(studentData);
  }

  // Update student status
  async updateStatus(studentId, status, additionalData = {}) {
    const student = await this.findByStudentId(studentId);
    if (!student) return null;
    return student.update({ status, ...additionalData });
  }

  // Count students by rep
  async countByRep(repId, status = null) {
    const where = { rep_id: repId };
    if (status) {
      if (Array.isArray(status)) {
        where.status = { [Op.in]: status };
      } else {
        where.status = status;
      }
    }
    return this.model.count({ where });
  }

  // Count all students
  async countAll(status = null) {
    const where = {};
    if (status) {
      if (Array.isArray(status)) {
        where.status = { [Op.in]: status };
      } else {
        where.status = status;
      }
    }
    return this.model.count({ where });
  }

  // Count students with enrollment number pattern
  async countWithEnrollmentPattern(pattern) {
    return this.model.count({
      where: { enrollment_number: { [Op.like]: pattern } }
    });
  }
}

module.exports = new StudentRepository();
