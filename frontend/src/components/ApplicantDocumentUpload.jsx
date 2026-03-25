import React, { useState, useEffect } from 'react';
import { Upload, Check, X, FileText, Loader2, AlertCircle } from 'lucide-react';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const DOC_LABELS = {
  bds_degree: 'BDS Degree Certificate',
  tenth_marksheet: '10th Marksheet',
  twelfth_marksheet: '12th Marksheet',
  passport_photo: 'Passport Size Photograph',
  id_proof: 'Government ID Proof'
};

const REQUIRED_DOCS = ['bds_degree', 'tenth_marksheet', 'twelfth_marksheet', 'passport_photo', 'id_proof'];

const DOC_ACCEPT = {
  passport_photo: '.jpg,.jpeg,.png',
};
const DEFAULT_ACCEPT = '.pdf,.jpg,.jpeg,.png';

export default function ApplicantDocumentUpload({ token }) {
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState({});
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) fetchStatus();
  }, [token]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/applicant/status?token=${token}`);
      const data = await res.json();
      
      if (res.ok) {
        setStatus(data);
        if (data.status === 'under_review') setSubmitted(true);
      } else {
        setError(data.error || 'Failed to load status');
      }
    } catch (err) {
      setError('Failed to load document status. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (docType, file) => {
    setError('');
    setUploading(prev => ({ ...prev, [docType]: true }));

    try {
      // Step 1: Get upload URL
      const urlRes = await fetch(`${API_BASE}/api/applicant/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          doc_type: docType,
          file_name: file.name,
          content_type: file.type,
          file_size: file.size
        })
      });

      const urlData = await urlRes.json();
      if (!urlRes.ok) {
        throw new Error(urlData.error || 'Failed to get upload URL');
      }

      const { document_id, upload_url } = urlData;

      // Step 2: Upload file to S3 (or mock)
      if (!upload_url.includes('mock-s3')) {
        await fetch(upload_url, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });
      }

      // Step 3: Confirm upload
      const confirmRes = await fetch(`${API_BASE}/api/applicant/confirm-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, document_id })
      });

      if (!confirmRes.ok) {
        const errData = await confirmRes.json();
        throw new Error(errData.error || 'Failed to confirm upload');
      }

      await fetchStatus();
    } catch (err) {
      const msg = err.message || 'Upload failed. Please try again.';
      setError(msg);
    } finally {
      setUploading(prev => ({ ...prev, [docType]: false }));
    }
  };

  const handleDelete = async (documentId) => {
    try {
      const res = await fetch(`${API_BASE}/api/applicant/documents/${documentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      
      if (res.ok) {
        await fetchStatus();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete document.');
      }
    } catch (err) {
      setError('Failed to delete document.');
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/applicant/submit-for-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
        await fetchStatus();
      } else {
        setError(data.error || 'Submission failed. Please try again.');
      }
    } catch (err) {
      setError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getDocForType = (docType) => {
    return status?.documents?.find(d =>
      d.doc_type === docType && ['uploaded', 'verified'].includes(d.status)
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!token || error === 'Invalid application token') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-red-800 mb-2">Invalid Token</h3>
        <p className="text-red-700">
          The application token is invalid or has expired. Please contact support if you need assistance.
        </p>
      </div>
    );
  }

  if (error === 'Document upload is not available for this account.') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-amber-800 mb-2">Document Upload Not Available</h3>
        <p className="text-amber-700">
          Your account was registered by a representative. Please contact your assigned representative 
          to submit your documents, or reach out to our admissions team for assistance.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-green-800 mb-2">Documents Submitted Successfully</h3>
        <p className="text-green-700">
          Our admissions team will review your documents and contact you within 2–3 business days.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="applicant-document-upload">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Upload Your Documents</h2>
        <p className="text-slate-600 mt-1">
          Please upload the following required documents to complete your application.
          Accepted formats: PDF, JPG, JPEG, PNG (max 10MB each). Passport photo: JPG/JPEG/PNG only.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        {REQUIRED_DOCS.map((docType) => {
          const uploaded = getDocForType(docType);
          const isUploading = uploading[docType];

          return (
            <div
              key={docType}
              className="border border-slate-200 rounded-lg p-4 flex items-center justify-between gap-4 bg-white"
              data-testid={`doc-row-${docType}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  uploaded ? 'bg-green-100' : 'bg-slate-100'
                }`}>
                  {uploaded ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <FileText className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{DOC_LABELS[docType]}</p>
                  {uploaded && (
                    <p className="text-sm text-slate-500 truncate">{uploaded.file_name}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {uploaded ? (
                  <>
                    <span className="text-sm text-green-600 font-medium px-2 py-1 bg-green-50 rounded">
                      Uploaded
                    </span>
                    <button
                      onClick={() => handleDelete(uploaded.document_id)}
                      className="text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isUploading
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}>
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload
                      </>
                    )}
                    <input
                      type="file"
                      accept={DOC_ACCEPT[docType] || DEFAULT_ACCEPT}
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => {
                        if (e.target.files[0]) handleFileUpload(docType, e.target.files[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {status?.all_required_uploaded && (
        <div className="pt-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 px-6 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="submit-for-review-btn"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              'Submit Documents for Review'
            )}
          </button>
          <p className="text-sm text-slate-500 text-center mt-2">
            Once submitted, you cannot make changes. Our team will review within 2–3 business days.
          </p>
        </div>
      )}

      {!status?.all_required_uploaded && (
        <p className="text-sm text-amber-600 text-center bg-amber-50 p-3 rounded-lg">
          Upload all {REQUIRED_DOCS.length} required documents to enable submission.
        </p>
      )}
    </div>
  );
}
