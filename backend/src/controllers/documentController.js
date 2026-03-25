const { v4: uuidv4 } = require('uuid');
const Document = require('../models/Document');

// Get upload URL (MOCKED S3)
exports.getUploadUrl = async (req, res) => {
  try {
    const documentId = `doc_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const userId = req.user.user_id;

    console.log(`[MOCKED] S3 presigned URL generated for document: ${documentId}`);

    res.json({
      document_id: documentId,
      upload_url: `https://mock-s3-bucket.s3.amazonaws.com/uploads/${userId}/${documentId}`,
      expires_in: 3600
    });
  } catch (error) {
    console.error('Get upload URL error:', error);
    res.status(500).json({ detail: 'Failed to get upload URL' });
  }
};

// Save document metadata
exports.saveDocument = async (req, res) => {
  try {
    const { document_id, filename, file_type, file_size, category = 'general' } = req.body;

    const document = new Document({
      document_id,
      user_id: req.user.user_id,
      filename,
      file_type,
      file_size,
      category,
      status: 'uploaded'
    });

    await document.save();

    res.json({ message: 'Document saved', document_id });
  } catch (error) {
    console.error('Save document error:', error);
    res.status(500).json({ detail: 'Failed to save document' });
  }
};

// Get documents
exports.getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ user_id: req.user.user_id }).sort({ uploaded_at: -1 });
    res.json(documents);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ detail: 'Failed to get documents' });
  }
};
