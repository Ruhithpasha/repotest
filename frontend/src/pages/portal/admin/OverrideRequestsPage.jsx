import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sliders, CheckCircle, XCircle, Clock, AlertTriangle,
  User, BookOpen, ChevronDown, Filter
} from 'lucide-react';
import { 
  PageHeader, StatCard, DataTable, FilterBar, StatusBadge, Modal
} from '../../../components/shared/AdminComponents';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const OverrideRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [processing, setProcessing] = useState(null);
  
  // Confirm modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { requestId, action: 'approve'|'reject' }
  const [reviewNote, setReviewNote] = useState('');

  const token = localStorage.getItem('token');

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await fetch(`${API_URL}/api/admin/commission-override-requests${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRequests(data.requests || []);
      setStats(data.stats || { pending: 0, approved: 0, rejected: 0, total: 0 });
    } catch (error) {
      console.error('Failed to fetch override requests:', error);
      toast.error('Failed to load override requests');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const openConfirmModal = (requestId, action) => {
    setConfirmAction({ requestId, action });
    setReviewNote('');
    setShowConfirmModal(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    
    setProcessing(confirmAction.requestId);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/commission-override-requests/${confirmAction.requestId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: confirmAction.action === 'approve' ? 'approved' : 'rejected',
            review_note: reviewNote || null
          })
        }
      );

      if (res.ok) {
        toast.success(`Override request ${confirmAction.action === 'approve' ? 'approved' : 'rejected'}`);
        setShowConfirmModal(false);
        setConfirmAction(null);
        fetchRequests();
      } else {
        const data = await res.json();
        toast.error(data.detail || 'Failed to update request');
      }
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return <span className="text-slate-500">{status}</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const columns = [
    {
      header: 'Manager',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">{row.manager?.name || 'Unknown'}</p>
            <p className="text-xs text-gray-500">{row.manager?.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Programme',
      render: (row) => (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
          <BookOpen className="w-3 h-3" />
          {row.programme_name || 'N/A'}
        </span>
      )
    },
    {
      header: 'Student',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900 text-sm">{row.student?.name || 'N/A'}</p>
          <p className="text-xs text-gray-500">{row.student?.email}</p>
        </div>
      )
    },
    {
      header: 'Original %',
      render: (row) => (
        <span className="font-semibold text-slate-600">
          {row.original_percentage?.toFixed(1)}%
        </span>
      )
    },
    {
      header: 'Requested %',
      render: (row) => {
        const isOutOfBounds = row.requested_percentage < row.rule_min || row.requested_percentage > row.rule_max;
        return (
          <span className={`font-semibold ${isOutOfBounds ? 'text-amber-600' : 'text-green-600'}`}>
            {row.requested_percentage?.toFixed(1)}%
          </span>
        );
      }
    },
    {
      header: 'Bounds',
      render: (row) => (
        <span className="text-sm text-slate-500">
          {row.rule_min?.toFixed(0)}% – {row.rule_max?.toFixed(0)}%
        </span>
      )
    },
    {
      header: 'Reason',
      render: (row) => (
        <p className="text-sm text-gray-600 max-w-xs truncate" title={row.reason}>
          {row.reason || '-'}
        </p>
      )
    },
    {
      header: 'Status',
      render: (row) => getStatusBadge(row.status)
    },
    {
      header: 'Actions',
      render: (row) => (
        row.status === 'pending' ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => openConfirmModal(row.id, 'approve')}
              disabled={processing === row.id}
              className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 h-7"
              data-testid={`approve-btn-${row.id}`}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openConfirmModal(row.id, 'reject')}
              disabled={processing === row.id}
              className="border-red-300 text-red-600 hover:bg-red-50 text-xs px-3 py-1 h-7"
              data-testid={`reject-btn-${row.id}`}
            >
              <XCircle className="w-3 h-3 mr-1" />
              Reject
            </Button>
          </div>
        ) : (
          <div className="text-xs text-slate-500">
            {row.reviewer?.name && (
              <p>By: {row.reviewer.name}</p>
            )}
            {row.reviewed_at && (
              <p>{formatDate(row.reviewed_at)}</p>
            )}
          </div>
        )
      )
    }
  ];

  return (
    <div className="p-6" data-testid="override-requests-page">
      <PageHeader 
        title="Override Requests" 
        subtitle="Review and manage commission override requests from managers"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Pending" 
          value={stats.pending} 
          icon={Clock} 
          color="amber" 
        />
        <StatCard 
          title="Approved" 
          value={stats.approved} 
          icon={CheckCircle} 
          color="green" 
        />
        <StatCard 
          title="Rejected" 
          value={stats.rejected} 
          icon={XCircle} 
          color="red" 
        />
        <StatCard 
          title="Total Requests" 
          value={stats.total} 
          icon={Sliders} 
          color="blue" 
        />
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('')}
            className={statusFilter === '' ? 'bg-amber-500 hover:bg-amber-600' : ''}
          >
            All ({stats.total})
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('pending')}
            className={statusFilter === 'pending' ? 'bg-amber-500 hover:bg-amber-600' : ''}
          >
            <Clock className="w-4 h-4 mr-1" />
            Pending ({stats.pending})
          </Button>
          <Button
            variant={statusFilter === 'approved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('approved')}
            className={statusFilter === 'approved' ? 'bg-green-500 hover:bg-green-600' : ''}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Approved ({stats.approved})
          </Button>
          <Button
            variant={statusFilter === 'rejected' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('rejected')}
            className={statusFilter === 'rejected' ? 'bg-red-500 hover:bg-red-600' : ''}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Rejected ({stats.rejected})
          </Button>
        </div>
      </div>

      {/* Table */}
      <DataTable 
        columns={columns} 
        data={requests} 
        loading={loading}
        emptyText="No override requests found"
      />

      {/* Confirm Modal */}
      {showConfirmModal && confirmAction && (
        <Modal 
          title={confirmAction.action === 'approve' ? 'Approve Override Request' : 'Reject Override Request'}
          onClose={() => setShowConfirmModal(false)}
        >
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${
              confirmAction.action === 'approve' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {confirmAction.action === 'approve' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
                <p className={`font-medium ${
                  confirmAction.action === 'approve' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {confirmAction.action === 'approve' 
                    ? 'This will update the commission percentage for this record.'
                    : 'This will reject the override request. The original commission will remain unchanged.'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Review Note (optional)
              </label>
              <Textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder={confirmAction.action === 'approve' 
                  ? 'Optional note for approval...' 
                  : 'Reason for rejection...'}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAction}
                disabled={processing}
                className={confirmAction.action === 'approve' 
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'}
              >
                {processing ? 'Processing...' : (
                  confirmAction.action === 'approve' ? 'Approve Request' : 'Reject Request'
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OverrideRequestsPage;
