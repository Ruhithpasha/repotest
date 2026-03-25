const { v4: uuidv4 } = require('uuid');
const { 
  StudentRepository,
  StudentDocumentRepository,
  UserRepository
} = require('../repositories');
const s3Storage = require('../utils/s3Storage');

// Get my documents (for student)
exports.getMyDocuments = async (req, res) => {
  try {
    const student = await StudentRepository.findByUserId(req.user.user_id);
    if (!student) {
      return res.json([]); // Return empty array if no student record
    }

    const documents = await StudentDocumentRepository.findByStudentId(student.student_id);
    res.json(documents);
  } catch (error) {
    console.error('Get my documents error:', error);
    res.status(500).json({ detail: 'Failed to get documents' });
  }
};

// Get documents for a student
exports.getDocuments = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const student = await StudentRepository.findByStudentId(studentId);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found' });
    }

    // Check access
    if (req.user.role === 'rep' && student.rep_id !== req.user.user_id) {
      return res.status(403).json({ detail: 'Access denied' });
    }
    if (req.user.role === 'student' && student.user_id !== req.user.user_id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const documents = await StudentDocumentRepository.findByStudentId(studentId);
    res.json(documents);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ detail: 'Failed to get documents' });
  }
};

// Download document (proxy for students)
exports.downloadDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    const doc = await StudentDocumentRepository.findByDocumentId(documentId);
    if (!doc) {
      return res.status(404).json({ detail: 'Document not found' });
    }

    // Check access - student can only download their own docs
    if (req.user.role === 'student') {
      const student = await StudentRepository.findByUserId(req.user.user_id);
      if (!student || student.student_id !== doc.student_id) {
        return res.status(403).json({ detail: 'Access denied' });
      }
    }

    if (!doc.storage_path) {
      return res.status(400).json({ detail: 'Document file not available' });
    }

    if (!s3Storage.isS3Configured()) {
      return res.status(503).json({ 
        detail: 'File storage is not configured.',
        code: 'S3_NOT_CONFIGURED'
      });
    }

    const fileData = await s3Storage.downloadFile(doc.storage_path);
    
    const contentType = doc.content_type || fileData.contentType || 'application/octet-stream';
    const fileName = doc.file_name || 'document';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Content-Length', fileData.data.length);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    
    res.send(fileData.data);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ detail: error.message || 'Failed to download document' });
  }
};

// Get pending documents for review (admin)
exports.getPendingDocuments = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Admin access required' });
    }

    const documents = await StudentDocumentRepository.findPending();
    
    const enrichedDocs = await Promise.all(
      documents.map(async (d) => {
        const student = await StudentRepository.findByStudentId(d.student_id);
        const user = student ? await UserRepository.findByUserId(student.user_id) : null;
        return {
          ...d.toJSON(),
          student: student?.toJSON() || null,
          student_name: user?.name || 'Unknown'
        };
      })
    );

    res.json(enrichedDocs);
  } catch (error) {
    console.error('Get pending documents error:', error);
    res.status(500).json({ detail: 'Failed to get pending documents' });
  }
};

// Verify/reject document (admin only)
exports.verifyDocument = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Admin access required' });
    }

    const { documentId } = req.params;
    const { status, admin_comment } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ detail: 'Status must be verified or rejected' });
    }

    const doc = await StudentDocumentRepository.findByDocumentId(documentId);
    if (!doc) {
      return res.status(404).json({ detail: 'Document not found' });
    }

    await StudentDocumentRepository.updateDocument(documentId, {
      status,
      admin_comment,
      verified_at: new Date(),
      verified_by: req.user.user_id
    });

    const updatedDoc = await StudentDocumentRepository.findByDocumentId(documentId);

    res.json({ message: `Document ${status}`, document: updatedDoc.toJSON() });
  } catch (error) {
    console.error('Verify document error:', error);
    res.status(500).json({ detail: 'Failed to verify document' });
  }
};

// Get upload URL (mocked S3)
exports.getUploadUrl = async (req, res) => {
  try {
    const { student_id, doc_type } = req.body;
    
    const student = await StudentRepository.findByStudentId(student_id);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found' });
    }

    // Check access
    if (req.user.role === 'rep' && student.rep_id !== req.user.user_id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const documentId = `doc_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    res.json({
      document_id: documentId,
      upload_url: `https://mock-s3-bucket.s3.amazonaws.com/documents/${student_id}/${documentId}`,
      expires_in: 3600
    });
  } catch (error) {
    console.error('Get upload URL error:', error);
    res.status(500).json({ detail: 'Failed to get upload URL' });
  }
};

// Confirm document upload
exports.confirmUpload = async (req, res) => {
  try {
    const { document_id } = req.body;

    const doc = await StudentDocumentRepository.findByDocumentId(document_id);
    if (!doc) {
      return res.status(404).json({ detail: 'Document not found' });
    }

    res.json({ message: 'Document uploaded successfully', document: doc.toJSON() });
  } catch (error) {
    console.error('Confirm upload error:', error);
    res.status(500).json({ detail: 'Failed to confirm upload' });
  }
};

module.exports = exports;
