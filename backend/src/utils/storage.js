const axios = require('axios');

const STORAGE_URL = 'https://integrations.emergentagent.com/objstore/api/v1/storage';
const APP_NAME = 'plan4growth';

let storageKey = null;

// Initialize storage - call once at startup
async function initStorage() {
  if (storageKey) {
    return storageKey;
  }

  const emergentKey = process.env.EMERGENT_LLM_KEY;
  if (!emergentKey) {
    console.error('EMERGENT_LLM_KEY not set - file storage will be mocked');
    return null;
  }

  try {
    const response = await axios.post(`${STORAGE_URL}/init`, {
      emergent_key: emergentKey
    }, { timeout: 30000 });

    storageKey = response.data.storage_key;
    console.log('Storage initialized successfully');
    return storageKey;
  } catch (error) {
    console.error('Storage init failed:', error.message);
    return null;
  }
}

// Upload file to storage
async function putObject(path, data, contentType) {
  const key = await initStorage();
  
  if (!key) {
    // Return mock response if storage not available
    console.log('Storage not available, returning mock URL');
    return {
      path: path,
      size: data.length,
      etag: 'mock-etag',
      url: `https://plan4growth-mock.s3.amazonaws.com/${path}`
    };
  }

  try {
    const response = await axios.put(
      `${STORAGE_URL}/objects/${path}`,
      data,
      {
        headers: {
          'X-Storage-Key': key,
          'Content-Type': contentType
        },
        timeout: 120000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    return response.data;
  } catch (error) {
    console.error('Upload failed:', error.message);
    throw new Error('File upload failed');
  }
}

// Download file from storage
async function getObject(path) {
  const key = await initStorage();
  
  if (!key) {
    throw new Error('Storage not available');
  }

  try {
    const response = await axios.get(
      `${STORAGE_URL}/objects/${path}`,
      {
        headers: {
          'X-Storage-Key': key
        },
        timeout: 60000,
        responseType: 'arraybuffer'
      }
    );

    return {
      data: response.data,
      contentType: response.headers['content-type'] || 'application/octet-stream'
    };
  } catch (error) {
    console.error('Download failed:', error.message);
    throw new Error('File download failed');
  }
}

// Generate storage path for student document
function generateDocPath(studentId, docType, filename) {
  const ext = filename.split('.').pop() || 'pdf';
  const timestamp = Date.now();
  return `${APP_NAME}/student-documents/${studentId}/${docType}_${timestamp}.${ext}`;
}

// MIME type mapping
const MIME_TYPES = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'pdf': 'application/pdf',
  'json': 'application/json',
  'csv': 'text/csv',
  'txt': 'text/plain'
};

function getMimeType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// Validate file type
function isValidFileType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ['pdf', 'jpg', 'jpeg', 'png'].includes(ext);
}

// Validate file size (max 10MB)
function isValidFileSize(size) {
  return size <= 10 * 1024 * 1024;
}

module.exports = {
  initStorage,
  putObject,
  getObject,
  generateDocPath,
  getMimeType,
  isValidFileType,
  isValidFileSize,
  APP_NAME
};
