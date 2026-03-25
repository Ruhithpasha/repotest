const { Op } = require('sequelize');
const BaseRepository = require('./BaseRepository');
const { StudentDocument } = require('../models/pg');

class StudentDocumentRepository extends BaseRepository {
  constructor() {
    super(StudentDocument);
  }

  // Find document by document_id
  async findByDocumentId(documentId) {
    return this.model.findOne({ where: { document_id: documentId } });
  }

  // Find documents by student_id
  async findByStudentId(studentId) {
    return this.model.findAll({
      where: { student_id: studentId },
      order: [['uploaded_at', 'DESC']]
    });
  }

  // Find document by student_id and doc_type
  async findByStudentAndType(studentId, docType) {
    return this.model.findOne({
      where: { student_id: studentId, doc_type: docType }
    });
  }

  // Find document by student_id and document_id
  async findByStudentAndDocId(studentId, documentId) {
    return this.model.findOne({
      where: { student_id: studentId, document_id: documentId }
    });
  }

  // Find all pending documents
  async findPending() {
    return this.model.findAll({
      where: { status: 'pending' },
      order: [['uploaded_at', 'DESC']]
    });
  }

  // Find verified documents by student and doc types
  async findVerifiedByTypes(studentId, docTypes) {
    return this.model.findAll({
      where: {
        student_id: studentId,
        doc_type: { [Op.in]: docTypes },
        status: 'verified'
      }
    });
  }

  // Create document
  async createDocument(docData) {
    return this.model.create(docData);
  }

  // Update document
  async updateDocument(documentId, data) {
    const doc = await this.findByDocumentId(documentId);
    if (!doc) return null;
    return doc.update(data);
  }

  // Delete document
  async deleteDocument(studentId, documentId) {
    return this.model.destroy({
      where: { document_id: documentId, student_id: studentId }
    });
  }

  // Count documents by student
  async countByStudent(studentId, status = null) {
    const where = { student_id: studentId };
    if (status) {
      where.status = status;
    }
    return this.model.count({ where });
  }

  // Count all pending documents
  async countPending() {
    return this.model.count({ where: { status: 'pending' } });
  }

  // Get document types uploaded for student
  async getUploadedTypes(studentId) {
    const docs = await this.findByStudentId(studentId);
    return docs.map(d => d.doc_type);
  }
}

module.exports = new StudentDocumentRepository();
