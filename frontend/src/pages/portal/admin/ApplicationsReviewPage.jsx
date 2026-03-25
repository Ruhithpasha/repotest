import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, FileText, CheckCircle, XCircle, Clock, Eye, 
  AlertCircle, Loader2, Search, Download, ChevronRight,
  Phone, Calendar, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusStyles = {
  registered: 'bg-gray-100 text-gray-700',
  documents_uploaded: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  call_booking_sent: 'bg-purple-100 text-purple-700',
  call_booked: 'bg-indigo-100 text-indigo-700',
  interview_completed: 'bg-teal-100 text-teal-700',
  qualified: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  enrolled: 'bg-emerald-100 text-emerald-700',
  payment_pending: 'bg-amber-100 text-amber-700',
  paid_in_full: 'bg-green-100 text-green-700'
};

const statusLabels = {
  registered: 'Registered',
  documents_uploaded: 'Docs Uploaded',
  under_review: 'Under Review',
  approved: 'Approved',
  call_booking_sent: 'Booking Sent',
  call_booked: 'Call Booked',
  interview_completed: 'Interview Done',
  qualified: 'Qualified',
  rejected: 'Rejected',
  enrolled: 'Enrolled',
  payment_pending: 'Payment Pending',
  paid_in_full: 'Paid in Full'
};

const StatusBadge = ({ status }) => {
  const style = statusStyles[status] || 'bg-slate-100 text-slate-700';
  const label = statusLabels[status] || status;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
};

const DocStatusBadge = ({ status }) => {
  const styles = {
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
    uploaded: { label: 'Uploaded', color: 'bg-blue-100 text-blue-700' },
    verified: { label: 'Verified', color: 'bg-green-100 text-green-700' },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' }
  };
  const style = styles[status] || styles.pending;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.color}`}>
      {style.label}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, color = 'blue' }) => {
  const colorMap = {
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500'
  };
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 ${colorMap[color]} rounded-xl flex items-center justify-center`}>
          <Icon className="text-white" size={22} />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-sm text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
};

const TimelineStep = ({ label, completed, active }) => (
  <div className="flex items-center gap-2">
    <div className={`w-3 h-3 rounded-full ${completed ? 'bg-green-500' : active ? 'bg-amber-500' : 'bg-slate-200'}`} />
    <span className={`text-xs ${completed ? 'text-green-700' : active ? 'text-amber-700 font-medium' : 'text-slate-400'}`}>
      {label}
    </span>
  </div>
);

const ApplicationsReviewPage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showClawbackModal, setShowClawbackModal] = useState(false);
  const [clawbackReason, setClawbackReason] = useState('');
  const [clawbackProcessing, setClawbackProcessing] = useState(false);

  const token = localStorage.getItem('token');

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/applications-review`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const fetchDocuments = async (studentId) => {
    setLoadingDocs(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/students/${studentId}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleSelectApp = (app) => {
    setSelectedApp(app);
    fetchDocuments(app.student_id);
  };

  const handleVerifyDocument = async (documentId) => {
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/documents/${documentId}/verify`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        toast.success('Document verified');
        fetchDocuments(selectedApp.student_id);
      }
    } catch (error) {
      toast.error('Failed to verify document');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectDocument = async (documentId, reason) => {
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/documents/${documentId}/reject`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: reason || 'Document rejected' })
      });
      if (res.ok) {
        toast.success('Document rejected');
        fetchDocuments(selectedApp.student_id);
      }
    } catch (error) {
      toast.error('Failed to reject document');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async (studentId) => {
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/applications/${studentId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Application approved and booking link sent!');
        setSelectedApp(null);
        fetchApplications();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to approve application');
      }
    } catch (error) {
      toast.error('Failed to approve application');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectApplication = async (studentId) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;
    
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/applications/${studentId}/reject`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        toast.success('Application rejected');
        setSelectedApp(null);
        fetchApplications();
      }
    } catch (error) {
      toast.error('Failed to reject application');
    } finally {
      setProcessing(false);
    }
  };

  const handleQualify = async (studentId, result) => {
    const notes = result === 'failed' ? window.prompt('Enter reason for rejection (optional):') : null;
    
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/students/${studentId}/qualify`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ qualification_status: result, qualification_notes: notes })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.already_qualified) {
          toast.info('Student is already qualified');
        } else {
          toast.success(`Student marked as ${result}`);
        }
        setSelectedApp(null);
        fetchApplications();
      } else {
        toast.error(data.message || 'Failed to update qualification');
      }
    } catch (error) {
      toast.error('Failed to update qualification');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkInterviewCompleted = async (studentId) => {
    if (!window.confirm('Mark this interview as completed? This will enable the qualification buttons.')) return;
    
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/students/${studentId}/mark-interview-completed`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Interview marked as completed');
        fetchApplications();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to update status');
      }
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setProcessing(false);
    }
  };

  const handleTriggerClawback = async () => {
    if (!clawbackReason.trim()) {
      toast.error('Please provide a reason for the clawback');
      return;
    }
    setClawbackProcessing(true);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/students/${selectedApp.student_id}/trigger-clawback`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reason: clawbackReason })
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Clawback failed');

      toast.success(
        `Clawback processed: £${data.result.total_clawback_amount} across ${data.result.clawed_back} commission(s)`
      );
      setShowClawbackModal(false);
      setClawbackReason('');
      fetchApplications();
    } catch (err) {
      toast.error(err.message || 'Failed to process clawback');
    } finally {
      setClawbackProcessing(false);
    }
  };

  const viewDocument = async (doc) => {
    try {
      const downloadUrl = `${API_URL}/api/student-documents/${doc.document_id}/download?token=${token}`;
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (error) {
      if (doc.file_url) {
        window.open(doc.file_url, '_blank');
      } else {
        toast.error('Unable to view document');
      }
    }
  };

  // Filter applications
  const filteredApps = applications.filter(app => {
    if (statusFilter && app.status !== statusFilter) return false;
    if (sourceFilter && app.registration_source !== sourceFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        app.name?.toLowerCase().includes(query) ||
        app.email?.toLowerCase().includes(query) ||
        app.student_id?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Stats
  const stats = {
    total: applications.length,
    underReview: applications.filter(a => a.status === 'under_review').length,
    docsUploaded: applications.filter(a => a.status === 'documents_uploaded').length,
    approved: applications.filter(a => ['approved', 'call_booking_sent', 'call_booked', 'interview_completed', 'qualified'].includes(a.status)).length
  };

  const documentLabels = {
    bds_degree: "BDS Degree Certificate",
    tenth_marksheet: "10th Marksheet",
    twelfth_marksheet: "12th Marksheet",
    passport_photo: "Passport Photograph",
    id_proof: "ID Proof"
  };

  // Determine timeline progress
  const getTimelineProgress = (status) => {
    const stages = ['registered', 'documents_uploaded', 'approved', 'call_booking_sent', 'call_booked', 'interview_completed', 'qualified'];
    const idx = stages.indexOf(status);
    const isQualifiedOrBeyond = ['qualified', 'payment_pending', 'paid_in_full', 'enrolled'].includes(status);
    return {
      registered: idx >= 0 || isQualifiedOrBeyond,
      documents_uploaded: idx >= 1 || status === 'under_review' || isQualifiedOrBeyond,
      approved: idx >= 2 || isQualifiedOrBeyond,
      call_booking_sent: idx >= 3 || isQualifiedOrBeyond,
      call_booked: idx >= 4 || isQualifiedOrBeyond,
      interview_completed: idx >= 5 || isQualifiedOrBeyond,
      qualified: idx >= 6 || isQualifiedOrBeyond
    };
  };

  // Check if booking link has been sent
  const isBookingLinkSent = (status) => {
    return ['call_booking_sent', 'call_booked', 'interview_completed', 'qualified', 'enrolled', 'payment_pending', 'paid_in_full'].includes(status);
  };

  return (
    <div className="p-6" data-testid="applications-review-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-slate-900">Applications Review</h1>
        <p className="text-slate-500">Review all student applications and documents (self-registered & rep-created)</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Applications" value={stats.total} color="blue" />
        <StatCard icon={FileText} label="Docs Uploaded" value={stats.docsUploaded} color="amber" />
        <StatCard icon={Clock} label="Under Review" value={stats.underReview} color="purple" />
        <StatCard icon={CheckCircle} label="Approved" value={stats.approved} color="green" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              type="text"
              placeholder="Search by name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 text-sm"
          >
            <option value="">All Status</option>
            <option value="registered">Registered</option>
            <option value="documents_uploaded">Documents Uploaded</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="call_booking_sent">Booking Link Sent</option>
            <option value="call_booked">Call Booked</option>
            <option value="interview_completed">Interview Completed</option>
            <option value="qualified">Qualified</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 text-sm"
          >
            <option value="">All Sources</option>
            <option value="self">Self-Registered</option>
            <option value="rep">Rep-Created</option>
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Applications List */}
        <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${selectedApp ? 'w-1/2' : 'w-full'}`}>
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin text-amber-500 mx-auto" size={32} />
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500">No applications found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredApps.map((app) => (
                <div
                  key={app.student_id}
                  onClick={() => handleSelectApp(app)}
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between ${
                    selectedApp?.student_id === app.student_id ? 'bg-amber-50' : ''
                  }`}
                  data-testid={`application-row-${app.student_id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                      <span className="text-slate-600 font-medium">
                        {app.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{app.name || 'Unknown'}</p>
                      <p className="text-sm text-slate-500">{app.email}</p>
                      {app.registration_source === 'rep' && (
                        <p className="text-xs text-purple-600 mt-1">
                          Via Rep: {app.rep_name || 'Unknown Rep'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isBookingLinkSent(app.status) && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={12} /> Booking Sent
                      </span>
                    )}
                    <StatusBadge status={app.status} />
                    <ChevronRight className="text-slate-400" size={18} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Document Review Panel */}
        {selectedApp && (
          <div className="w-1/2 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-lg text-slate-900">{selectedApp.name}</h3>
                  <p className="text-sm text-slate-500">{selectedApp.email}</p>
                </div>
                <button 
                  onClick={() => setSelectedApp(null)}
                  className="p-2 hover:bg-slate-200 rounded-lg"
                  data-testid="close-detail-panel"
                >
                  <XCircle size={20} className="text-slate-400" />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={selectedApp.status} />
                {isBookingLinkSent(selectedApp.status) && (
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={12} /> Booking Link Sent ✓
                  </span>
                )}
              </div>
            </div>

            {/* Timeline Section */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h4 className="font-medium text-slate-700 mb-3 text-sm">Application Timeline</h4>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {(() => {
                  const progress = getTimelineProgress(selectedApp.status);
                  return (
                    <>
                      <TimelineStep label="Registered" completed={progress.registered} />
                      <TimelineStep label="Docs Uploaded" completed={progress.documents_uploaded} />
                      <TimelineStep label="Approved" completed={progress.approved} />
                      <TimelineStep label="Booking Sent" completed={progress.call_booking_sent} />
                      <TimelineStep label="Call Booked" completed={progress.call_booked} />
                      <TimelineStep label="Interview Done" completed={progress.interview_completed} active={selectedApp.status === 'interview_completed'} />
                      <TimelineStep label="Qualified" completed={progress.qualified} />
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="p-4">
              <h4 className="font-medium text-slate-900 mb-4">Documents</h4>
              
              {loadingDocs ? (
                <div className="p-8 text-center">
                  <Loader2 className="animate-spin text-amber-500 mx-auto" size={24} />
                </div>
              ) : documents.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-lg">
                  <FileText className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-slate-500">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.document_id} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-slate-900 text-sm">
                            {documentLabels[doc.doc_type] || doc.doc_type}
                          </p>
                          <p className="text-xs text-slate-500">{doc.file_name}</p>
                        </div>
                        <DocStatusBadge status={doc.status} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => viewDocument(doc)}
                          data-testid={`view-doc-${doc.document_id}`}
                        >
                          <Eye size={14} className="mr-1" /> View
                        </Button>
                        {doc.status === 'uploaded' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleVerifyDocument(doc.document_id)}
                              disabled={processing}
                              className="bg-green-500 hover:bg-green-600 text-white"
                              data-testid={`verify-doc-${doc.document_id}`}
                            >
                              <CheckCircle size={14} className="mr-1" /> Verify
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectDocument(doc.document_id, 'Document unclear or invalid')}
                              disabled={processing}
                              className="text-red-500 border-red-300 hover:bg-red-50"
                              data-testid={`reject-doc-${doc.document_id}`}
                            >
                              <XCircle size={14} className="mr-1" /> Reject
                            </Button>
                          </>
                        )}
                      </div>
                      {doc.admin_comment && (
                        <p className="text-xs text-red-600 mt-2">{doc.admin_comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons - Approve/Reject Application */}
            {['under_review', 'documents_uploaded'].includes(selectedApp.status) && documents.length > 0 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleApprove(selectedApp.student_id)}
                    disabled={processing || documents.some(d => d.status !== 'verified')}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    data-testid="approve-application-btn"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Approve & Send Booking Link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRejectApplication(selectedApp.student_id)}
                    disabled={processing}
                    className="text-red-500 border-red-300 hover:bg-red-50"
                    data-testid="reject-application-btn"
                  >
                    <XCircle size={16} className="mr-2" />
                    Reject
                  </Button>
                </div>
                {documents.some(d => d.status !== 'verified') && (
                  <p className="text-xs text-amber-600 mt-2 text-center">
                    Verify all documents before approving the application
                  </p>
                )}
              </div>
            )}

            {/* For approved students - option to send booking link or qualify directly */}
            {selectedApp.status === 'approved' && (
              <div className="p-4 border-t border-slate-200 bg-blue-50">
                <p className="text-sm text-blue-700 mb-3 font-medium">
                  Application approved. Choose next action:
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleApprove(selectedApp.student_id)}
                    disabled={processing}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                    data-testid="send-booking-link-btn"
                  >
                    <Calendar size={16} className="mr-2" />
                    Send Booking Link
                  </Button>
                  <Button
                    onClick={() => handleQualify(selectedApp.student_id, 'passed')}
                    disabled={processing}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                    data-testid="direct-qualify-btn"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Qualify Directly
                  </Button>
                </div>
                <p className="text-xs text-blue-600 mt-2 text-center">
                  Send booking link for interview, or qualify directly if interview was done offline.
                </p>
              </div>
            )}

            {/* Already Qualified - Show success state */}
            {selectedApp.status === 'qualified' && (
              <div className="p-4 border-t border-slate-200 bg-emerald-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                    <CheckCircle size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">Student Qualified</p>
                    <p className="text-xs text-emerald-600">This student has passed qualification and can proceed to payment.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Qualification - For call_booking_sent or call_booked status */}
            {['call_booking_sent', 'call_booked'].includes(selectedApp.status) && (
              <div className="p-4 border-t border-slate-200 bg-amber-50">
                <p className="text-sm text-amber-700 mb-3 font-medium">
                  Manually qualify this student (skip interview step):
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleQualify(selectedApp.student_id, 'passed')}
                    disabled={processing}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                    data-testid="manual-qualify-passed-btn"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Qualify as Passed
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleQualify(selectedApp.student_id, 'failed')}
                    disabled={processing}
                    className="flex-1 text-red-500 border-red-300 hover:bg-red-50"
                    data-testid="manual-qualify-failed-btn"
                  >
                    <XCircle size={16} className="mr-2" />
                    Mark as Failed
                  </Button>
                </div>
                <p className="text-xs text-amber-600 mt-2 text-center">
                  Use this if the interview was conducted offline or you want to fast-track this student.
                </p>
              </div>
            )}

            {/* Mark Interview as Completed - When call is booked but interview not yet marked */}
            {selectedApp.status === 'call_booked' && (
              <div className="p-4 border-t border-slate-200 bg-indigo-50">
                <p className="text-sm text-indigo-700 mb-3 font-medium">
                  Interview scheduled. After the call is done, mark it as completed:
                </p>
                <Button
                  onClick={() => handleMarkInterviewCompleted(selectedApp.student_id)}
                  disabled={processing}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white"
                  data-testid="mark-interview-completed-btn"
                >
                  <Calendar size={16} className="mr-2" />
                  Mark Interview as Completed
                </Button>
              </div>
            )}

            {/* Qualification Buttons - After Interview */}
            {selectedApp.status === 'interview_completed' && (
              <div className="p-4 border-t border-slate-200 bg-teal-50">
                <p className="text-sm text-teal-700 mb-3 font-medium">Interview completed. Mark qualification result:</p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleQualify(selectedApp.student_id, 'passed')}
                    disabled={processing}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                    data-testid="qualify-passed-btn"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Mark as Passed
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleQualify(selectedApp.student_id, 'failed')}
                    disabled={processing}
                    className="flex-1 text-red-500 border-red-300 hover:bg-red-50"
                    data-testid="qualify-failed-btn"
                  >
                    <XCircle size={16} className="mr-2" />
                    Mark as Failed
                  </Button>
                </div>
              </div>
            )}

            {/* Trigger Clawback Button - for eligible statuses */}
            {['enrolled', 'paid_in_full', 'commission_earned', 'commission_released'].includes(selectedApp?.status) && (
              <div className="p-4 border-t border-slate-200 bg-red-50">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-100"
                  onClick={() => setShowClawbackModal(true)}
                  data-testid="trigger-clawback-btn"
                >
                  <AlertTriangle size={14} className="mr-1" />
                  Trigger Clawback
                </Button>
                <p className="text-xs text-red-500 mt-2">Process refund and claw back commissions</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clawback Confirmation Modal */}
      {showClawbackModal && selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-heading text-lg text-slate-900">Trigger Commission Clawback</h3>
                <p className="text-sm text-slate-500">{selectedApp.name}</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              This will mark commissions for this student as clawed back based on the active clawback rules.
              The student status will be updated to <strong>Clawback Required</strong>.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reason for Clawback <span className="text-red-500">*</span>
              </label>
              <textarea
                value={clawbackReason}
                onChange={(e) => setClawbackReason(e.target.value)}
                placeholder="e.g. Student requested refund on 10 March 2026 — payment reversed via Stripe"
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowClawbackModal(false);
                  setClawbackReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleTriggerClawback}
                disabled={clawbackProcessing}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {clawbackProcessing ? 'Processing...' : 'Confirm Clawback'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationsReviewPage;
