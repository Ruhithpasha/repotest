const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const {
  UserRepository,
  StudentRepository,
  StudentDocumentRepository
} = require('../repositories');
const s3Storage = require('../utils/s3Storage');

exports.registerStudent = async (req, res) => {
  try {
    const managerId = req.user.user_id;
    const {
      name, email, password, whatsapp_number,
      dob, city, state, dental_reg_number, experience_years, course_id
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ detail: 'Name and email are required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ detail: 'Password must be at least 6 characters' });
    }

    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ detail: 'A user with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    await UserRepository.createUser({
      user_id: userId, email, password: hashedPassword, name,
      phone: whatsapp_number, role: 'student', created_by: managerId, is_active: false
    });

    const studentId = `student_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    await StudentRepository.createStudent({
      student_id: studentId, user_id: userId, rep_id: managerId,
      whatsapp_number, dob: dob ? new Date(dob) : null,
      city, state, dental_reg_number,
      experience_years: experience_years ? parseInt(experience_years) : null,
      course_id: course_id || 'level7-implantology',
      status: 'registered', registration_source: 'manager'
    });

    res.status(201).json({
      message: 'Student registered successfully',
      student: { student_id: studentId, user_id: userId, name, email, status: 'registered', whatsapp_number },
      next_step: 'Upload required documents. Student account activates after admin approval.'
    });
  } catch (error) {
    console.error('[ManagerStudentController] Register error:', error);
    res.status(500).json({ detail: 'Failed to register student' });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const managerId = req.user.user_id;
    const { status, search } = req.query;

    const students = await StudentRepository.findByRepId(managerId, status);

    const studentsWithDetails = await Promise.all(students.map(async (student) => {
      const user = await UserRepository.findByUserId(student.user_id);
      const documentCount = await StudentDocumentRepository.countByStudent(student.student_id);
      const verifiedDocs = await StudentDocumentRepository.countByStudent(student.student_id, 'verified');
      return {
        ...student.toJSON(),
        user: user ? { name: user.name, email: user.email, is_active: user.is_active } : null,
        documents_uploaded: documentCount,
        documents_verified: verifiedDocs
      };
    }));

    let result = studentsWithDetails;
    if (search) {
      const q = search.toLowerCase();
      result = studentsWithDetails.filter(s =>
        s.user?.name?.toLowerCase().includes(q) ||
        s.user?.email?.toLowerCase().includes(q) ||
        s.whatsapp_number?.includes(search)
      );
    }

    res.json(result);
  } catch (error) {
    console.error('[ManagerStudentController] Get students error:', error);
    res.status(500).json({ detail: 'Failed to get students' });
  }
};

exports.getStudent = async (req, res) => {
  try {
    const managerId = req.user.user_id;
    const { studentId } = req.params;

    const student = await StudentRepository.findByRepAndStudentId(managerId, studentId);
    if (!student) return res.status(404).json({ detail: 'Student not found' });

    const user = await UserRepository.findByUserId(student.user_id);
    const documents = await StudentDocumentRepository.findByStudentId(studentId);

    res.json({
      ...student.toJSON(),
      user: user ? { name: user.name, email: user.email, is_active: user.is_active, created_at: user.created_at } : null,
      documents
    });
  } catch (error) {
    console.error('[ManagerStudentController] Get student error:', error);
    res.status(500).json({ detail: 'Failed to get student' });
  }
};

exports.uploadDocumentWithFile = async (req, res) => {
  try {
    const managerId = req.user.user_id;
    const { studentId } = req.params;

    const student = await StudentRepository.findByRepAndStudentId(managerId, studentId);
    if (!student) return res.status(404).json({ detail: 'Student not found or access denied' });
    if (!req.file) return res.status(400).json({ detail: 'No file uploaded' });

    const { doc_type } = req.body;
    const file = req.file;
    const validDocTypes = ['bds_degree', 'tenth_marksheet', 'twelfth_marksheet', 'passport_photo', 'id_proof', 'supporting'];
    if (!validDocTypes.includes(doc_type)) {
      return res.status(400).json({ detail: `Invalid document type. Must be one of: ${validDocTypes.join(', ')}` });
    }

    if (!s3Storage.isS3Configured()) {
      return res.status(503).json({ detail: 'File storage (AWS S3) is not configured.', code: 'S3_NOT_CONFIGURED' });
    }

    const storagePath = s3Storage.generateDocPath(studentId, doc_type, file.originalname);
    const contentType = s3Storage.getMimeType(file.originalname);
    const uploadResult = await s3Storage.uploadFile(storagePath, file.buffer, contentType);

    const existingDoc = await StudentDocumentRepository.findByStudentAndType(studentId, doc_type);
    const documentId = existingDoc ? existingDoc.document_id : `doc_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    if (existingDoc) {
      await StudentDocumentRepository.updateDocument(existingDoc.document_id, {
        file_url: uploadResult.url, storage_path: uploadResult.key,
        file_name: file.originalname, file_size: file.size,
        content_type: contentType, status: 'pending',
        admin_comment: null, uploaded_at: new Date(), uploaded_by: managerId
      });
      res.json({ message: 'Document updated successfully', document: existingDoc.toJSON() });
    } else {
      const document = await StudentDocumentRepository.createDocument({
        document_id: documentId, student_id: studentId, doc_type,
        file_url: uploadResult.url, storage_path: uploadResult.key,
        file_name: file.originalname, file_size: file.size,
        content_type: contentType, status: 'pending', uploaded_by: managerId
      });

      const requiredDocs = ['bds_degree', 'tenth_marksheet', 'twelfth_marksheet', 'passport_photo', 'id_proof'];
      const uploadedTypes = await StudentDocumentRepository.getUploadedTypes(studentId);
      const allUploaded = requiredDocs.every(d => uploadedTypes.includes(d));
      if (allUploaded && student.status === 'registered') {
        await StudentRepository.updateStatus(studentId, 'documents_uploaded');
      }

      res.status(201).json({ message: 'Document uploaded successfully', document: document.toJSON(), all_required_uploaded: allUploaded });
    }
  } catch (error) {
    console.error('[ManagerStudentController] Upload error:', error);
    res.status(500).json({ detail: error.message || 'Failed to upload document' });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const managerId = req.user.user_id;
    const { studentId, documentId } = req.params;

    const student = await StudentRepository.findByRepAndStudentId(managerId, studentId);
    if (!student) return res.status(404).json({ detail: 'Student not found or access denied' });

    if (!['registered', 'documents_uploaded'].includes(student.status)) {
      return res.status(400).json({ detail: 'Cannot delete document after submission for review' });
    }

    const deleted = await StudentDocumentRepository.deleteDocument(studentId, documentId);
    if (!deleted) return res.status(404).json({ detail: 'Document not found' });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('[ManagerStudentController] Delete document error:', error);
    res.status(500).json({ detail: 'Failed to delete document' });
  }
};

exports.submitForReview = async (req, res) => {
  try {
    const managerId = req.user.user_id;
    const { studentId } = req.params;

    const student = await StudentRepository.findByRepAndStudentId(managerId, studentId);
    if (!student) return res.status(404).json({ detail: 'Student not found or access denied' });

    const requiredDocs = ['bds_degree', 'tenth_marksheet', 'twelfth_marksheet', 'passport_photo', 'id_proof'];
    const uploadedTypes = await StudentDocumentRepository.getUploadedTypes(studentId);
    const missingDocs = requiredDocs.filter(d => !uploadedTypes.includes(d));
    if (missingDocs.length > 0) {
      return res.status(400).json({ detail: 'Missing required documents.', missing_documents: missingDocs });
    }

    await StudentRepository.updateStatus(studentId, 'under_review');
    res.json({ message: 'Application submitted for review', student: student.toJSON() });
  } catch (error) {
    console.error('[ManagerStudentController] Submit for review error:', error);
    res.status(500).json({ detail: 'Failed to submit for review' });
  }
};

exports.getDocumentViewUrl = async (req, res) => {
  try {
    const managerId = req.user.user_id;
    const { studentId, documentId } = req.params;

    const student = await StudentRepository.findByRepAndStudentId(managerId, studentId);
    if (!student) return res.status(404).json({ detail: 'Student not found or access denied' });

    const doc = await StudentDocumentRepository.findByStudentAndDocId(studentId, documentId);
    if (!doc) return res.status(404).json({ detail: 'Document not found' });
    if (!doc.storage_path) return res.status(400).json({ detail: 'Document file not available' });
    if (!s3Storage.isS3Configured()) return res.status(503).json({ detail: 'S3 not configured', code: 'S3_NOT_CONFIGURED' });

    const result = await s3Storage.getPresignedDownloadUrl(doc.storage_path, 3600);
    res.json({ document_id: documentId, file_name: doc.file_name, view_url: result.downloadUrl, expires_in: result.expiresIn });
  } catch (error) {
    res.status(500).json({ detail: error.message || 'Failed to get document URL' });
  }
};

exports.downloadDocument = async (req, res) => {
  try {
    const managerId = req.user.user_id;
    const { studentId, documentId } = req.params;

    const student = await StudentRepository.findByRepAndStudentId(managerId, studentId);
    if (!student) return res.status(404).json({ detail: 'Student not found or access denied' });

    const doc = await StudentDocumentRepository.findByStudentAndDocId(studentId, documentId);
    if (!doc) return res.status(404).json({ detail: 'Document not found' });
    if (!doc.storage_path) return res.status(400).json({ detail: 'Document file not available' });
    if (!s3Storage.isS3Configured()) return res.status(503).json({ detail: 'S3 not configured' });

    const fileData = await s3Storage.downloadFile(doc.storage_path);
    const contentType = doc.content_type || fileData.contentType || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.file_name || 'document'}"`);
    res.setHeader('Content-Length', fileData.data.length);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(fileData.data);
  } catch (error) {
    res.status(500).json({ detail: error.message || 'Failed to download document' });
  }
};

module.exports = exports;
