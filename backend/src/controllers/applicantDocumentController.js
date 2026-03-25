const { v4: uuidv4 } = require('uuid');
const { Student, StudentDocument } = require('../models/pg');
const {
  isS3Configured,
  getPresignedUploadUrl,
  generateDocPath,
  isValidFileType,
  isValidFileSize
} = require('../utils/s3Storage');

const REQUIRED_DOCS = ['bds_degree', 'tenth_marksheet', 'twelfth_marksheet', 'passport_photo', 'id_proof'];

const VALID_DOC_TYPES = [
  'bds_degree', 'bds_certificate',
  'tenth_marksheet', '10th_marksheet',
  'twelfth_marksheet', '12th_marksheet',
  'passport_photo', 'photograph',
  'id_proof', 'supporting'
];

async function getStudentByToken(token) {
  return Student.findOne({ where: { application_token: token } });
}

// GET /api/applicant/status?token=xxx
exports.getStatus = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Application token required' });

    const student = await getStudentByToken(token);
    if (!student) return res.status(404).json({ error: 'Invalid application token' });

    // Only self-registered students can use document upload
    if (student.registration_source !== 'self') {
      return res.status(403).json({ 
        error: 'Document upload is not available for this account.',
        detail: 'Students registered by reps or managers should have their documents uploaded through the CRM portal.'
      });
    }

    const documents = await StudentDocument.findAll({
      where: { student_id: student.student_id },
      order: [['uploaded_at', 'DESC']]
    });

    const uploadedTypes = documents
      .filter(d => ['uploaded', 'verified'].includes(d.status))
      .map(d => d.doc_type);

    const allRequiredUploaded = REQUIRED_DOCS.every(t => uploadedTypes.includes(t));

    return res.status(200).json({
      student_id: student.student_id,
      status: student.status,
      documents,
      required_documents: REQUIRED_DOCS,
      uploaded_types: uploadedTypes,
      all_required_uploaded: allRequiredUploaded
    });
  } catch (err) {
    console.error('Applicant status error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/applicant/upload-url
exports.getUploadUrl = async (req, res) => {
  try {
    const { token, doc_type, file_name, content_type, file_size } = req.body;

    if (!token) return res.status(400).json({ error: 'Application token required' });
    if (!doc_type) return res.status(400).json({ error: 'doc_type is required' });
    if (!file_name) return res.status(400).json({ error: 'file_name is required' });

    if (!VALID_DOC_TYPES.includes(doc_type)) {
      return res.status(400).json({ error: 'Invalid doc_type', valid_types: VALID_DOC_TYPES });
    }

    if (file_size && !isValidFileSize(file_size)) {
      return res.status(400).json({ error: 'File too large. Maximum 10MB allowed.' });
    }

    if (!isValidFileType(file_name)) {
      return res.status(400).json({ error: 'Invalid file type. Allowed: pdf, jpg, jpeg, png' });
    }

    const student = await getStudentByToken(token);
    if (!student) return res.status(404).json({ error: 'Invalid application token' });

    if (!['registered', 'documents_uploaded'].includes(student.status)) {
      return res.status(400).json({
        error: `Cannot upload documents in current status: ${student.status}`
      });
    }

    const document_id = `doc_${uuidv4().replace(/-/g, '')}`;
    const s3Key = generateDocPath(student.student_id, doc_type, file_name);

    let upload_url;
    if (isS3Configured()) {
      const result = await getPresignedUploadUrl(s3Key, content_type || 'application/octet-stream');
      upload_url = result.uploadUrl;
    } else {
      upload_url = `https://mock-s3-bucket.s3.amazonaws.com/uploads/${student.student_id}/${document_id}`;
    }

    await StudentDocument.create({
      document_id,
      student_id: student.student_id,
      doc_type,
      file_name,
      file_size: file_size || 0,
      content_type: content_type || 'application/octet-stream',
      storage_path: s3Key,
      status: 'pending',
      uploaded_by: student.student_id,
      uploaded_at: new Date()
    });

    return res.status(200).json({
      document_id,
      upload_url,
      s3_key: s3Key,
      expires_in: 3600
    });
  } catch (err) {
    console.error('Applicant upload URL error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/applicant/confirm-upload
exports.confirmUpload = async (req, res) => {
  try {
    const { token, document_id, file_url } = req.body;

    if (!token) return res.status(400).json({ error: 'Application token required' });
    if (!document_id) return res.status(400).json({ error: 'document_id is required' });

    const student = await getStudentByToken(token);
    if (!student) return res.status(404).json({ error: 'Invalid application token' });

    const document = await StudentDocument.findOne({
      where: { document_id, student_id: student.student_id }
    });
    if (!document) return res.status(404).json({ error: 'Document not found' });

    await document.update({
      status: 'uploaded',
      file_url: file_url || document.file_url,
      uploaded_at: new Date()
    });

    const allDocs = await StudentDocument.findAll({
      where: { student_id: student.student_id }
    });

    const uploadedTypes = allDocs
      .filter(d => ['uploaded', 'verified'].includes(d.status))
      .map(d => d.doc_type);

    const allRequired = REQUIRED_DOCS.every(t => uploadedTypes.includes(t));

    if (allRequired && student.status === 'registered') {
      await student.update({ status: 'documents_uploaded' });
    }

    return res.status(200).json({
      success: true,
      document: await StudentDocument.findByPk(document_id),
      all_required_uploaded: allRequired
    });
  } catch (err) {
    console.error('Applicant confirm upload error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /api/applicant/documents/:documentId
exports.deleteDocument = async (req, res) => {
  try {
    const { token } = req.body;
    const { documentId } = req.params;

    if (!token) return res.status(400).json({ error: 'Application token required' });

    const student = await getStudentByToken(token);
    if (!student) return res.status(404).json({ error: 'Invalid application token' });

    if (!['registered', 'documents_uploaded'].includes(student.status)) {
      return res.status(400).json({ error: 'Cannot delete documents after submission for review' });
    }

    const document = await StudentDocument.findOne({
      where: { document_id: documentId, student_id: student.student_id }
    });
    if (!document) return res.status(404).json({ error: 'Document not found' });

    await document.destroy();

    return res.status(200).json({ success: true, message: 'Document deleted' });
  } catch (err) {
    console.error('Applicant delete document error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/applicant/submit-for-review
exports.submitForReview = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) return res.status(400).json({ error: 'Application token required' });

    const student = await getStudentByToken(token);
    if (!student) return res.status(404).json({ error: 'Invalid application token' });

    if (!['registered', 'documents_uploaded'].includes(student.status)) {
      return res.status(400).json({ error: `Cannot submit in current status: ${student.status}` });
    }

    const allDocs = await StudentDocument.findAll({
      where: { student_id: student.student_id }
    });

    const uploadedTypes = allDocs
      .filter(d => ['uploaded', 'verified'].includes(d.status))
      .map(d => d.doc_type);

    const missingDocs = REQUIRED_DOCS.filter(t => !uploadedTypes.includes(t));

    if (missingDocs.length > 0) {
      return res.status(400).json({
        error: 'Please upload all required documents before submitting',
        missing_documents: missingDocs
      });
    }

    await student.update({ status: 'under_review' });

    return res.status(200).json({
      success: true,
      message: 'Your documents have been submitted for review. Our team will contact you within 2–3 business days.',
      status: 'under_review'
    });
  } catch (err) {
    console.error('Applicant submit for review error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
