const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { 
  UserRepository, 
  StudentRepository, 
  StudentDocumentRepository, 
  CommissionRepository 
} = require('../repositories');
const s3Storage = require('../utils/s3Storage');

// Commission rate (4%)
const COMMISSION_RATE = 0.04;
const COURSE_FEE = 7999;

// Generate random password
const generatePassword = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// Get Rep Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const repId = req.user.user_id;

    const [
      totalStudents,
      documentsPending,
      underReview,
      approved,
      enrolled,
      rejected,
      commissionStats
    ] = await Promise.all([
      StudentRepository.countByRep(repId),
      StudentRepository.countByRep(repId, 'registered'),
      StudentRepository.countByRep(repId, ['documents_uploaded', 'under_review']),
      StudentRepository.countByRep(repId, ['approved', 'payment_pending']),
      StudentRepository.countByRep(repId, 'enrolled'),
      StudentRepository.countByRep(repId, 'rejected'),
      CommissionRepository.getStatsByRep(repId)
    ]);

    let totalCommission = 0;
    let pendingCommission = 0;
    let paidCommission = 0;
    
    commissionStats.forEach(c => {
      const total = parseFloat(c.total) || 0;
      totalCommission += total;
      if (c.status === 'pending' || c.status === 'approved') {
        pendingCommission += total;
      } else if (c.status === 'paid') {
        paidCommission += total;
      }
    });

    res.json({
      total_students: totalStudents,
      documents_pending: documentsPending,
      under_review: underReview,
      approved: approved,
      enrolled: enrolled,
      rejected: rejected,
      commission: {
        total_gbp: totalCommission,
        pending_gbp: pendingCommission,
        paid_gbp: paidCommission,
        rate: COMMISSION_RATE * 100,
        per_student_gbp: COURSE_FEE * COMMISSION_RATE
      }
    });
  } catch (error) {
    console.error('Get rep stats error:', error);
    res.status(500).json({ detail: 'Failed to get dashboard stats' });
  }
};

// Register new student (Rep creates student account with password)
exports.registerStudent = async (req, res) => {
  try {
    const repId = req.user.user_id;
    const { 
      name, 
      email,
      password, // Rep sets the student password
      whatsapp_number, 
      dob, 
      city, 
      state, 
      dental_reg_number, 
      experience_years,
      course_id 
    } = req.body;

    console.log('[RepController] Register student request:', { 
      name, 
      email, 
      whatsapp_number, 
      city, 
      state, 
      repId,
      course_id 
    });

    if (!name || !email) {
      return res.status(400).json({ detail: 'Name and email are required' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ detail: 'Password is required and must be at least 6 characters' });
    }

    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ detail: 'A user with this email already exists' });
    }

    // Hash the password set by rep
    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    console.log('[RepController] Creating user with ID:', userId, 'Email:', email, 'Name:', name);
    
    await UserRepository.createUser({
      user_id: userId,
      email,
      password: hashedPassword,
      name,
      phone: whatsapp_number,
      role: 'student',
      created_by: repId,
      is_active: false // Will be activated when documents are approved
    });

    const studentId = `student_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    console.log('[RepController] Creating student with ID:', studentId, 'Rep ID:', repId);
    
    await StudentRepository.createStudent({
      student_id: studentId,
      user_id: userId,
      rep_id: repId,
      whatsapp_number,
      dob: dob ? new Date(dob) : null,
      city,
      state,
      dental_reg_number,
      experience_years: experience_years ? parseInt(experience_years) : null,
      course_id: course_id || 'level7-implantology',
      status: 'registered',
      registration_source: 'rep'
    });

    console.log('[RepController] Student created successfully:', { studentId, userId, name, email });

    res.status(201).json({
      message: 'Student registered successfully',
      student: {
        student_id: studentId,
        user_id: userId,
        name,
        email,
        status: 'registered',
        whatsapp_number
      },
      credentials: {
        email: email,
        password: '(as set by you)',
        _note: 'Student will use these credentials to login after all documents are approved by admin'
      },
      next_step: 'Upload required documents for the student. Once all documents are approved, student account will be automatically activated.'
    });
  } catch (error) {
    console.error('[RepController] Register student error:', error);
    res.status(500).json({ detail: 'Failed to register student' });
  }
};

// Get all students for this rep
exports.getStudents = async (req, res) => {
  try {
    const repId = req.user.user_id;
    const { status, search } = req.query;

    const students = await StudentRepository.findByRepId(repId, status);

    const studentsWithDetails = await Promise.all(
      students.map(async (student) => {
        const user = await UserRepository.findByUserId(student.user_id);
        const documentCount = await StudentDocumentRepository.countByStudent(student.student_id);
        const verifiedDocs = await StudentDocumentRepository.countByStudent(student.student_id, 'verified');
        
        return {
          ...student.toJSON(),
          user: user ? {
            name: user.name,
            email: user.email,
            is_active: user.is_active
          } : null,
          documents_uploaded: documentCount,
          documents_verified: verifiedDocs
        };
      })
    );

    let result = studentsWithDetails;
    if (search) {
      const searchLower = search.toLowerCase();
      result = studentsWithDetails.filter(s => 
        s.user?.name?.toLowerCase().includes(searchLower) ||
        s.user?.email?.toLowerCase().includes(searchLower) ||
        s.whatsapp_number?.includes(search)
      );
    }

    res.json(result);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ detail: 'Failed to get students' });
  }
};

// Get single student detail
exports.getStudent = async (req, res) => {
  try {
    const repId = req.user.user_id;
    const { studentId } = req.params;

    const student = await StudentRepository.findByRepAndStudentId(repId, studentId);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found' });
    }

    const user = await UserRepository.findByUserId(student.user_id);
    const documents = await StudentDocumentRepository.findByStudentId(studentId);

    res.json({
      ...student.toJSON(),
      user: user ? {
        name: user.name,
        email: user.email,
        is_active: user.is_active,
        created_at: user.created_at
      } : null,
      documents
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ detail: 'Failed to get student' });
  }
};

// Upload document for student (by rep)
exports.uploadDocument = async (req, res) => {
  try {
    const repId = req.user.user_id;
    const { studentId } = req.params;
    const { doc_type, file_name, file_size } = req.body;

    const student = await StudentRepository.findByRepAndStudentId(repId, studentId);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found or access denied' });
    }

    const validDocTypes = ['bds_degree', 'tenth_marksheet', 'twelfth_marksheet', 'passport_photo', 'id_proof', 'supporting'];
    if (!validDocTypes.includes(doc_type)) {
      return res.status(400).json({ detail: `Invalid document type. Must be one of: ${validDocTypes.join(', ')}` });
    }

    if (file_size && file_size > 10 * 1024 * 1024) {
      return res.status(400).json({ detail: 'File size must not exceed 10MB' });
    }

    const documentId = `doc_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const s3Key = `student-documents/${studentId}/${doc_type}_${Date.now()}.pdf`;
    const mockS3Url = `https://plan4growth-student-documents.s3.amazonaws.com/${s3Key}`;

    const existingDoc = await StudentDocumentRepository.findByStudentAndType(studentId, doc_type);
    
    if (existingDoc) {
      await StudentDocumentRepository.updateDocument(existingDoc.document_id, {
        file_url: mockS3Url,
        file_name: file_name || `${doc_type}.pdf`,
        file_size: file_size || 0,
        status: 'pending',
        admin_comment: null,
        uploaded_at: new Date(),
        uploaded_by: repId
      });

      res.json({
        message: 'Document updated successfully',
        document: existingDoc.toJSON(),
        upload_url: mockS3Url,
        _note: 'S3 upload is MOCKED. In production, use the upload_url to PUT the file.'
      });
    } else {
      const document = await StudentDocumentRepository.createDocument({
        document_id: documentId,
        student_id: studentId,
        doc_type,
        file_url: mockS3Url,
        file_name: file_name || `${doc_type}.pdf`,
        file_size: file_size || 0,
        status: 'pending',
        uploaded_by: repId
      });

      const requiredDocs = ['bds_degree', 'tenth_marksheet', 'twelfth_marksheet', 'passport_photo', 'id_proof'];
      const uploadedTypes = await StudentDocumentRepository.getUploadedTypes(studentId);
      const allUploaded = requiredDocs.every(d => uploadedTypes.includes(d));

      if (allUploaded && student.status === 'registered') {
        await StudentRepository.updateStatus(studentId, 'documents_uploaded');
      }

      res.status(201).json({
        message: 'Document uploaded successfully',
        document: document.toJSON(),
        upload_url: mockS3Url,
        all_required_uploaded: allUploaded,
        _note: 'S3 upload is MOCKED. In production, use the upload_url to PUT the file.'
      });
    }
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ detail: 'Failed to upload document' });
  }
};

// Get presigned URL for S3 upload (mocked)
exports.getUploadUrl = async (req, res) => {
  try {
    const repId = req.user.user_id;
    const { studentId } = req.params;
    const { doc_type } = req.body;

    const student = await StudentRepository.findByRepAndStudentId(repId, studentId);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found or access denied' });
    }

    const s3Key = `student-documents/${studentId}/${doc_type}_${Date.now()}`;
    const uploadUrl = `https://plan4growth-student-documents.s3.amazonaws.com/${s3Key}?X-Amz-Signature=MOCK_SIGNATURE`;

    res.json({
      upload_url: uploadUrl,
      s3_key: s3Key,
      expires_in: 3600,
      _note: 'This is a MOCKED presigned URL. Configure AWS S3 credentials for real uploads.'
    });
  } catch (error) {
    console.error('Get upload URL error:', error);
    res.status(500).json({ detail: 'Failed to generate upload URL' });
  }
};

// Submit application for review
exports.submitForReview = async (req, res) => {
  try {
    const repId = req.user.user_id;
    const { studentId } = req.params;

    const student = await StudentRepository.findByRepAndStudentId(repId, studentId);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found or access denied' });
    }

    const requiredDocs = ['bds_degree', 'tenth_marksheet', 'twelfth_marksheet', 'passport_photo', 'id_proof'];
    const uploadedTypes = await StudentDocumentRepository.getUploadedTypes(studentId);
    
    const missingDocs = requiredDocs.filter(d => !uploadedTypes.includes(d));
    if (missingDocs.length > 0) {
      return res.status(400).json({ 
        detail: 'Cannot submit for review. Missing required documents.',
        missing_documents: missingDocs
      });
    }

    await StudentRepository.updateStatus(studentId, 'under_review');

    res.json({
      message: 'Application submitted for review',
      student: student.toJSON()
    });
  } catch (error) {
    console.error('Submit for review error:', error);
    res.status(500).json({ detail: 'Failed to submit for review' });
  }
};

// Delete document
exports.deleteDocument = async (req, res) => {
  try {
    const repId = req.user.user_id;
    const { studentId, documentId } = req.params;

    const student = await StudentRepository.findByRepAndStudentId(repId, studentId);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found or access denied' });
    }

    if (!['registered', 'documents_uploaded'].includes(student.status)) {
      return res.status(400).json({ detail: 'Cannot delete document after submission for review' });
    }

    const deleted = await StudentDocumentRepository.deleteDocument(studentId, documentId);

    if (!deleted) {
      return res.status(404).json({ detail: 'Document not found' });
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ detail: 'Failed to delete document' });
  }
};

// Get rep's commissions
exports.getCommissions = async (req, res) => {
  try {
    const repId = req.user.user_id;
    const { status } = req.query;

    const commissions = await CommissionRepository.findByRepId(repId, status);

    const commissionsWithDetails = await Promise.all(
      commissions.map(async (commission) => {
        const student = await StudentRepository.findByStudentId(commission.student_id);
        const user = student ? await UserRepository.findByUserId(student.user_id) : null;

        return {
          ...commission.toJSON(),
          student: student ? {
            student_id: student.student_id,
            enrollment_number: student.enrollment_number,
            status: student.status
          } : null,
          student_name: user?.name || 'Unknown'
        };
      })
    );

    const stats = await CommissionRepository.getStatsByRep(repId);

    let summary = {
      total_gbp: 0,
      pending_gbp: 0,
      approved_gbp: 0,
      paid_gbp: 0,
      total_count: 0
    };

    stats.forEach(t => {
      const total = parseFloat(t.total) || 0;
      summary.total_gbp += total;
      summary.total_count += parseInt(t.count) || 0;
      if (t.status === 'pending') summary.pending_gbp = total;
      else if (t.status === 'approved') summary.approved_gbp = total;
      else if (t.status === 'paid') summary.paid_gbp = total;
    });

    res.json({
      commissions: commissionsWithDetails,
      summary,
      commission_rate: COMMISSION_RATE * 100,
      per_student_gbp: COURSE_FEE * COMMISSION_RATE
    });
  } catch (error) {
    console.error('Get commissions error:', error);
    res.status(500).json({ detail: 'Failed to get commissions' });
  }
};

// Upload document with actual file data (multipart)
exports.uploadDocumentWithFile = async (req, res) => {
  try {
    const repId = req.user.user_id;
    const { studentId } = req.params;

    const student = await StudentRepository.findByRepAndStudentId(repId, studentId);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found or access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ detail: 'No file uploaded' });
    }

    const { doc_type } = req.body;
    const file = req.file;

    const validDocTypes = ['bds_degree', 'tenth_marksheet', 'twelfth_marksheet', 'passport_photo', 'id_proof', 'supporting'];
    if (!validDocTypes.includes(doc_type)) {
      return res.status(400).json({ detail: `Invalid document type. Must be one of: ${validDocTypes.join(', ')}` });
    }

    if (!s3Storage.isValidFileType(file.originalname)) {
      return res.status(400).json({ detail: 'Invalid file type. Only PDF, JPG, PNG allowed.' });
    }

    if (!s3Storage.isValidFileSize(file.size)) {
      return res.status(400).json({ detail: 'File too large. Maximum 10MB allowed.' });
    }

    if (!s3Storage.isS3Configured()) {
      return res.status(503).json({ 
        detail: 'File storage (AWS S3) is not configured. Please contact administrator.',
        code: 'S3_NOT_CONFIGURED'
      });
    }

    const storagePath = s3Storage.generateDocPath(studentId, doc_type, file.originalname);
    const contentType = s3Storage.getMimeType(file.originalname);

    const uploadResult = await s3Storage.uploadFile(storagePath, file.buffer, contentType);

    const existingDoc = await StudentDocumentRepository.findByStudentAndType(studentId, doc_type);
    const documentId = existingDoc ? existingDoc.document_id : `doc_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    if (existingDoc) {
      await StudentDocumentRepository.updateDocument(existingDoc.document_id, {
        file_url: uploadResult.url,
        storage_path: uploadResult.key,
        file_name: file.originalname,
        file_size: file.size,
        content_type: contentType,
        status: 'pending',
        admin_comment: null,
        uploaded_at: new Date(),
        uploaded_by: repId
      });

      res.json({
        message: 'Document updated successfully',
        document: existingDoc.toJSON()
      });
    } else {
      const document = await StudentDocumentRepository.createDocument({
        document_id: documentId,
        student_id: studentId,
        doc_type,
        file_url: uploadResult.url,
        storage_path: uploadResult.key,
        file_name: file.originalname,
        file_size: file.size,
        content_type: contentType,
        status: 'pending',
        uploaded_by: repId
      });

      const requiredDocs = ['bds_degree', 'tenth_marksheet', 'twelfth_marksheet', 'passport_photo', 'id_proof'];
      const uploadedTypes = await StudentDocumentRepository.getUploadedTypes(studentId);
      const allUploaded = requiredDocs.every(d => uploadedTypes.includes(d));

      if (allUploaded && student.status === 'registered') {
        await StudentRepository.updateStatus(studentId, 'documents_uploaded');
      }

      res.status(201).json({
        message: 'Document uploaded successfully',
        document: document.toJSON(),
        all_required_uploaded: allUploaded
      });
    }
  } catch (error) {
    console.error('Upload document with file error:', error);
    res.status(500).json({ detail: error.message || 'Failed to upload document' });
  }
};

// Get presigned URL for secure document viewing
exports.getDocumentViewUrl = async (req, res) => {
  try {
    const repId = req.user.user_id;
    const { studentId, documentId } = req.params;

    const student = await StudentRepository.findByRepAndStudentId(repId, studentId);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found or access denied' });
    }

    const doc = await StudentDocumentRepository.findByStudentAndDocId(studentId, documentId);
    if (!doc) {
      return res.status(404).json({ detail: 'Document not found' });
    }

    if (!doc.storage_path) {
      return res.status(400).json({ detail: 'Document file not available' });
    }

    if (!s3Storage.isS3Configured()) {
      return res.status(503).json({ 
        detail: 'File storage (AWS S3) is not configured.',
        code: 'S3_NOT_CONFIGURED'
      });
    }

    const result = await s3Storage.getPresignedDownloadUrl(doc.storage_path, 3600);

    res.json({
      document_id: documentId,
      file_name: doc.file_name,
      view_url: result.downloadUrl,
      proxy_url: `/api/rep/students/${studentId}/documents/${documentId}/download`,
      expires_in: result.expiresIn
    });
  } catch (error) {
    console.error('Get document view URL error:', error);
    res.status(500).json({ detail: error.message || 'Failed to get document URL' });
  }
};

// Proxy download document
exports.downloadDocument = async (req, res) => {
  try {
    const repId = req.user.user_id;
    const { studentId, documentId } = req.params;

    const student = await StudentRepository.findByRepAndStudentId(repId, studentId);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found or access denied' });
    }

    const doc = await StudentDocumentRepository.findByStudentAndDocId(studentId, documentId);
    if (!doc) {
      return res.status(404).json({ detail: 'Document not found' });
    }

    if (!doc.storage_path) {
      return res.status(400).json({ detail: 'Document file not available' });
    }

    if (!s3Storage.isS3Configured()) {
      return res.status(503).json({ 
        detail: 'File storage (AWS S3) is not configured.',
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

module.exports = exports;
