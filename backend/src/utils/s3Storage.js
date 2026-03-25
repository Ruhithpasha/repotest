const { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  HeadObjectCommand 
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

// Initialize S3 client without checksum middleware
const getS3Client = () => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'eu-north-1';

  if (!accessKeyId || !secretAccessKey || accessKeyId === 'YOUR_AWS_ACCESS_KEY_ID') {
    console.warn('AWS S3 credentials not configured - uploads will fail');
    return null;
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
};

// Manual pre-signed URL generation (avoids SDK checksum issues)
const generateManualPresignedUrl = (bucket, key, expiresIn = 3600) => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'eu-north-1';
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);
  
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const canonicalUri = '/' + key;
  const service = 's3';
  
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;
  
  // Query parameters
  const queryParams = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host'
  };
  
  // Create canonical query string (sorted)
  const canonicalQueryString = Object.keys(queryParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join('&');
  
  // Canonical headers
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  
  // Canonical request
  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD'
  ].join('\n');
  
  // String to sign
  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    hashedCanonicalRequest
  ].join('\n');
  
  // Calculate signature
  const getSignatureKey = (key, dateStamp, region, service) => {
    const kDate = crypto.createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    return kSigning;
  };
  
  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  
  // Build final URL
  const presignedUrl = `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  
  return presignedUrl;
};

const BUCKET_NAME = process.env.AWS_S3_BUCKET;
const APP_PREFIX = 'plan4growth';

// Check if S3 is configured
const isS3Configured = () => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.AWS_S3_BUCKET;
  
  return accessKeyId && 
         secretAccessKey && 
         bucket && 
         accessKeyId !== 'YOUR_AWS_ACCESS_KEY_ID' &&
         bucket !== 'YOUR_BUCKET_NAME';
};

// Generate storage path for student document
const generateDocPath = (studentId, docType, filename) => {
  const ext = filename.split('.').pop() || 'pdf';
  const timestamp = Date.now();
  return `${APP_PREFIX}/student-documents/${studentId}/${docType}_${timestamp}.${ext}`;
};

// Upload file to S3
const uploadFile = async (key, fileBuffer, contentType) => {
  const s3Client = getS3Client();
  
  if (!s3Client) {
    throw new Error('AWS S3 is not configured. Please add AWS credentials to .env file.');
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType
  });

  try {
    const response = await s3Client.send(command);
    
    // Return the S3 URL
    const region = process.env.AWS_REGION || 'eu-west-2';
    const fileUrl = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
    
    return {
      success: true,
      key,
      url: fileUrl,
      etag: response.ETag,
      size: fileBuffer.length
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

// Generate pre-signed URL for upload (client-side upload)
const getPresignedUploadUrl = async (key, contentType, expiresIn = 3600) => {
  const s3Client = getS3Client();
  
  if (!s3Client) {
    throw new Error('AWS S3 is not configured. Please add AWS credentials to .env file.');
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return {
      uploadUrl: signedUrl,
      key,
      expiresIn
    };
  } catch (error) {
    console.error('Error generating presigned upload URL:', error);
    throw new Error(`Failed to generate upload URL: ${error.message}`);
  }
};

// Generate pre-signed URL for download/viewing (using manual signing to avoid SDK checksum issues)
const getPresignedDownloadUrl = async (key, expiresIn = 3600) => {
  const bucket = BUCKET_NAME;
  
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS S3 is not configured. Please add AWS credentials to .env file.');
  }

  try {
    // Use manual signing to avoid AWS SDK v3 checksum header issues
    const signedUrl = generateManualPresignedUrl(bucket, key, expiresIn);
    return {
      downloadUrl: signedUrl,
      key,
      expiresIn
    };
  } catch (error) {
    console.error('Error generating presigned download URL:', error);
    throw new Error(`Failed to generate download URL: ${error.message}`);
  }
};

// Download file from S3
const downloadFile = async (key) => {
  const s3Client = getS3Client();
  
  if (!s3Client) {
    throw new Error('AWS S3 is not configured. Please add AWS credentials to .env file.');
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });

  try {
    const response = await s3Client.send(command);
    
    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    return {
      data: buffer,
      contentType: response.ContentType,
      contentLength: response.ContentLength
    };
  } catch (error) {
    console.error('S3 download error:', error);
    throw new Error(`Failed to download file from S3: ${error.message}`);
  }
};

// Delete file from S3
const deleteFile = async (key) => {
  const s3Client = getS3Client();
  
  if (!s3Client) {
    throw new Error('AWS S3 is not configured. Please add AWS credentials to .env file.');
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });

  try {
    await s3Client.send(command);
    return { success: true, key };
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
};

// Check if file exists in S3
const fileExists = async (key) => {
  const s3Client = getS3Client();
  
  if (!s3Client) {
    return false;
  }

  const command = new HeadObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });

  try {
    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
};

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

const getMimeType = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return MIME_TYPES[ext] || 'application/octet-stream';
};

// Validate file type
const isValidFileType = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ['pdf', 'jpg', 'jpeg', 'png'].includes(ext);
};

// Validate file size (max 10MB)
const isValidFileSize = (size) => {
  return size <= 10 * 1024 * 1024;
};

// Extract S3 key from full URL
const extractKeyFromUrl = (url) => {
  if (!url) return null;
  
  // Handle both formats:
  // https://bucket.s3.region.amazonaws.com/key
  // https://s3.region.amazonaws.com/bucket/key
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Remove leading slash
    return pathname.startsWith('/') ? pathname.slice(1) : pathname;
  } catch {
    return null;
  }
};

module.exports = {
  isS3Configured,
  generateDocPath,
  uploadFile,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  downloadFile,
  deleteFile,
  fileExists,
  getMimeType,
  isValidFileType,
  isValidFileSize,
  extractKeyFromUrl,
  BUCKET_NAME,
  APP_PREFIX
};
