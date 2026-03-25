import React, { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardList, Search, Filter, DollarSign, CheckCircle, XCircle, 
  Clock, Eye, X, AlertTriangle, CreditCard, Calendar, User, Copy, Check
} from 'lucide-react';
import { 
  PageHeader, StatCard, Modal
} from '../../../components/shared/AdminComponents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CommissionReviewPage = () => {
  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, payable: 0, paidThisMonth: 0 });
  const [programmes, setProgrammes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Side panel
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [commissionDetail, setCommissionDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Action modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const token = localStorage.getItem('token');

  const fetchCommissions = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[CommissionReview] Fetching commissions...');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (programmeFilter) params.append('programme_id', programmeFilter);
      if (roleFilter) params.append('role_type', roleFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      console.log('[CommissionReview] API URL:', `${API_URL}/api/commissions?${params.toString()}`);
      const res = await fetch(`${API_URL}/api/commissions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[CommissionReview] Response status:', res.status);
      const data = await res.json();
      console.log('[CommissionReview] Data received:', data);
      setCommissions(Array.isArray(data) ? data : []);

      // Calculate stats
      const allComms = Array.isArray(data) ? data : [];
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      
      setStats({
        pending: allComms.filter(c => ['pending_validation', 'pending_approval'].includes(c.status)).length,
        approved: allComms.filter(c => c.status === 'approved').length,
        payable: allComms.filter(c => c.status === 'payable').length,
        paidThisMonth: allComms.filter(c => {
          if (c.status !== 'paid') return false;
          const paidDate = new Date(c.paid_at);
          return paidDate.getMonth() === thisMonth && paidDate.getFullYear() === thisYear;
        }).length
      });
      console.log('[CommissionReview] Stats:', { pending: allComms.filter(c => ['pending_validation', 'pending_approval'].includes(c.status)).length });
    } catch (error) {
      console.error('[CommissionReview] Failed to fetch commissions:', error);
      toast.error('Failed to load commissions');
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter, programmeFilter, roleFilter, dateFrom, dateTo]);

  const fetchProgrammes = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/programmes?active=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setProgrammes(Array.isArray(data.programmes) ? data.programmes : (Array.isArray(data) ? data : []));
    } catch (error) {
      console.error('Failed to fetch programmes:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchCommissions();
    fetchProgrammes();
  }, [fetchCommissions, fetchProgrammes]);

  const fetchCommissionDetail = async (commissionId) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API_URL}/api/commissions/${commissionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCommissionDetail(data);
    } catch (error) {
      console.error('Failed to fetch commission detail:', error);
      toast.error('Failed to load commission details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const openSidePanel = (commission) => {
    setSelectedCommission(commission);
    fetchCommissionDetail(commission.commission_id);
  };

  const closeSidePanel = () => {
    setSelectedCommission(null);
    setCommissionDetail(null);
  };

  const handleApprove = async () => {
    if (!selectedCommission) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/commissions/${selectedCommission.commission_id}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ note: actionNote })
      });
      if (res.ok) {
        toast.success('Commission approved');
        setShowApproveModal(false);
        setActionNote('');
        fetchCommissions();
        fetchCommissionDetail(selectedCommission.commission_id);
      } else {
        const data = await res.json();
        toast.error(data.detail || 'Failed to approve');
      }
    } catch (error) {
      toast.error('Failed to approve commission');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedCommission) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/commissions/${selectedCommission.commission_id}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: actionNote })
      });
      if (res.ok) {
        toast.success('Commission rejected');
        setShowRejectModal(false);
        setActionNote('');
        fetchCommissions();
        closeSidePanel();
      } else {
        const data = await res.json();
        toast.error(data.detail || 'Failed to reject');
      }
    } catch (error) {
      toast.error('Failed to reject commission');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkPayable = async () => {
    if (!selectedCommission) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/commissions/${selectedCommission.commission_id}/mark-payable`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Commission marked as payable');
        fetchCommissions();
        fetchCommissionDetail(selectedCommission.commission_id);
      } else {
        const data = await res.json();
        toast.error(data.detail || 'Failed to mark payable');
      }
    } catch (error) {
      toast.error('Failed to mark as payable');
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setProgrammeFilter('');
    setRoleFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const getRoleBadge = (roleType) => {
    const colors = {
      rep: 'bg-blue-100 text-blue-700',
      sales_user: 'bg-blue-100 text-blue-700',
      manager: 'bg-purple-100 text-purple-700',
      referral: 'bg-green-100 text-green-700'
    };
    return colors[roleType] || 'bg-slate-100 text-slate-600';
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending_validation: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Validating' },
      pending_approval: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Awaiting Approval' },
      approved: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Approved' },
      payable: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Payable' },
      paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'Paid' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
      clawed_back: { bg: 'bg-red-100', text: 'text-red-700', label: 'Clawed Back' },
      partially_clawed_back: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Partially Clawed Back' }
    };
    const badge = badges[status] || { bg: 'bg-slate-100', text: 'text-slate-600', label: status };
    return (
      <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const formatCurrency = (amount) => `£${parseFloat(amount || 0).toFixed(2)}`;
  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="p-6" data-testid="commission-review-page">
      <PageHeader 
        title="Commission Review" 
        subtitle="Review and approve commission payments"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Pending Approval" value={stats.pending} icon={Clock} color="amber" />
        <StatCard title="Approved" value={stats.approved} icon={CheckCircle} color="blue" />
        <StatCard title="Payable" value={stats.payable} icon={DollarSign} color="teal" />
        <StatCard title="Paid This Month" value={stats.paidThisMonth} icon={CreditCard} color="green" />
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student or rep..."
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="">All Status</option>
            <option value="pending_validation">Validating</option>
            <option value="pending_approval">Awaiting Approval</option>
            <option value="approved">Approved</option>
            <option value="payable">Payable</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="">All Roles</option>
            <option value="rep">Rep</option>
            <option value="manager">Manager</option>
            <option value="referral">Referral</option>
          </select>
          <select
            value={programmeFilter}
            onChange={(e) => setProgrammeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="">All Programmes</option>
            {programmes.map(p => (
              <option key={p.program_id} value={p.program_id}>{p.name || p.program_name}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <Filter className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Commission Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-heading text-slate-500 uppercase">Beneficiary</th>
                <th className="text-left px-4 py-3 text-xs font-heading text-slate-500 uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-heading text-slate-500 uppercase">Programme</th>
                <th className="text-left px-4 py-3 text-xs font-heading text-slate-500 uppercase">Student</th>
                <th className="text-right px-4 py-3 text-xs font-heading text-slate-500 uppercase">Amount</th>
                <th className="text-right px-4 py-3 text-xs font-heading text-slate-500 uppercase">%</th>
                <th className="text-left px-4 py-3 text-xs font-heading text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-heading text-slate-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-heading text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto" />
                  </td>
                </tr>
              ) : commissions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    No commissions found
                  </td>
                </tr>
              ) : (
                commissions.map(comm => (
                  <tr 
                    key={comm.commission_id} 
                    className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                    onClick={() => openSidePanel(comm)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-900">{comm.recipient?.name || comm.beneficiary_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium capitalize ${getRoleBadge(comm.role_type)}`}>
                        {comm.role_type === 'sales_user' ? 'Rep' : comm.role_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{comm.programme_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{comm.student?.user?.name || comm.student_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right font-medium">{formatCurrency(comm.commission_amount_gbp)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{((parseFloat(comm.commission_value || comm.commission_rate) || 0) * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3">
                      {getStatusBadge(comm.status)}
                      {comm.clawback_status && comm.clawback_status !== 'none' && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full font-medium bg-red-100 text-red-700 ml-1">
                          Clawback: £{parseFloat(comm.clawback_amount || 0).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(comm.created_at)}</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); openSidePanel(comm); }}
                        data-testid={`view-btn-${comm.commission_id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Panel */}
      {selectedCommission && (
        <div className="fixed inset-y-0 right-0 w-full max-w-[480px] bg-white shadow-xl z-50 flex flex-col" data-testid="commission-side-panel">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg text-slate-900">Commission Details</h2>
              {getStatusBadge(selectedCommission.status)}
            </div>
            <button onClick={closeSidePanel} className="text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-b border-slate-100 flex gap-2">
            {['pending_validation', 'pending_approval'].includes(selectedCommission.status) && (
              <>
                <Button
                  onClick={() => setShowApproveModal(true)}
                  className="bg-green-500 hover:bg-green-600 text-white"
                  size="sm"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRejectModal(true)}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  size="sm"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
            {selectedCommission.status === 'approved' && (
              <Button
                onClick={handleMarkPayable}
                disabled={processing}
                className="bg-teal-500 hover:bg-teal-600 text-white"
                size="sm"
              >
                <DollarSign className="w-4 h-4 mr-1" />
                Mark as Payable
              </Button>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
              </div>
            ) : (
              <>
                {/* Commission Summary */}
                <div>
                  <h3 className="font-heading text-sm text-slate-500 uppercase mb-3">Commission Summary</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Amount</span>
                      <span className="text-sm text-slate-900 font-semibold">{formatCurrency(selectedCommission.commission_amount_gbp)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Percentage</span>
                      <span className="text-sm text-slate-900">{((parseFloat(selectedCommission.commission_value || selectedCommission.commission_rate) || 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Beneficiary</span>
                      <span className="text-sm text-slate-900">{selectedCommission.recipient?.name || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Role</span>
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium capitalize ${getRoleBadge(selectedCommission.role_type)}`}>
                        {selectedCommission.role_type === 'sales_user' ? 'Rep' : selectedCommission.role_type}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Enrolment & Payment */}
                <div>
                  <h3 className="font-heading text-sm text-slate-500 uppercase mb-3">Enrolment & Payment</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Student</span>
                      <span className="text-sm text-slate-900">{commissionDetail?.student?.user?.name || selectedCommission.student_name || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Programme</span>
                      <span className="text-sm text-slate-900">{selectedCommission.programme_name || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Sale Amount</span>
                      <span className="text-sm text-slate-900">{formatCurrency(selectedCommission.sale_amount_gbp || selectedCommission.course_fee_gbp)}</span>
                    </div>
                    {commissionDetail?.gateway_payment_id && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Payment ID</span>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-slate-200 px-2 py-1 rounded">{commissionDetail.gateway_payment_id}</code>
                          <button onClick={() => copyToClipboard(commissionDetail.gateway_payment_id, 'payment')}>
                            {copiedId === 'payment' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fraud Flags */}
                <div>
                  <h3 className="font-heading text-sm text-slate-500 uppercase mb-3">Fraud Flags</h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm">No fraud flags detected</span>
                    </div>
                  </div>
                </div>

                {/* Clawback Info */}
                {commissionDetail?.clawback_status && commissionDetail.clawback_status !== 'none' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h4 className="font-semibold text-red-800 text-sm mb-3 flex items-center gap-2">
                      <AlertTriangle size={14} />
                      Clawback Applied
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-red-600">Amount Clawed Back</span>
                        <span className="font-semibold text-red-800">
                          £{parseFloat(commissionDetail.clawback_amount || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-red-600">Date</span>
                        <span className="text-red-700">
                          {commissionDetail.clawback_date
                            ? new Date(commissionDetail.clawback_date).toLocaleDateString('en-GB', {
                                day: 'numeric', month: 'short', year: 'numeric'
                              })
                            : '—'}
                        </span>
                      </div>
                      {commissionDetail.clawback_reason && (
                        <div className="pt-2 border-t border-red-200">
                          <p className="text-xs text-red-600 mb-1">Reason</p>
                          <p className="text-sm text-red-800">{commissionDetail.clawback_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Payout Info */}
                <div>
                  <h3 className="font-heading text-sm text-slate-500 uppercase mb-3">Payout Info</h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    {selectedCommission.status === 'paid' && selectedCommission.payout_batch_id ? (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Batch ID</span>
                          <span className="text-sm text-slate-900">{selectedCommission.payout_batch_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Paid On</span>
                          <span className="text-sm text-slate-900">{formatDate(selectedCommission.paid_at)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Not yet included in a payout batch</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedCommission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-sm p-6">
            <h3 className="font-heading text-lg text-slate-900 mb-2">Approve Commission</h3>
            <p className="text-slate-600 text-sm mb-4">
              Approve commission of {formatCurrency(selectedCommission.commission_amount_gbp)} for {selectedCommission.recipient?.name || 'beneficiary'}?
            </p>
            <Textarea
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="Optional note..."
              rows={3}
              className="mb-4"
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowApproveModal(false); setActionNote(''); }}>Cancel</Button>
              <Button onClick={handleApprove} disabled={processing} className="bg-green-500 hover:bg-green-600 text-white">
                {processing ? 'Approving...' : 'Approve'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedCommission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-sm p-6">
            <h3 className="font-heading text-lg text-slate-900 mb-2">Reject Commission</h3>
            <p className="text-slate-600 text-sm mb-4">
              Are you sure you want to reject this commission?
            </p>
            <Textarea
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
              className="mb-4"
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowRejectModal(false); setActionNote(''); }}>Cancel</Button>
              <Button onClick={handleReject} disabled={processing} className="bg-red-500 hover:bg-red-600 text-white">
                {processing ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionReviewPage;
