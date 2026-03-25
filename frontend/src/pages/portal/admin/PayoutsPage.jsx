import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, Plus, Download, Check, X, Send, Eye, Zap, ExternalLink, Loader2 } from 'lucide-react';
import { 
  PageHeader, StatCard, DataTable, SearchInput, SelectFilter, FilterBar, 
  ActionButton, Modal, StatusBadge 
} from '../../../components/shared/AdminComponents';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PayoutsPage = () => {
  const [payouts, setPayouts] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0, pending_amount: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [payableCommissions, setPayableCommissions] = useState([]);
  const [selectedCommissions, setSelectedCommissions] = useState([]);
  const [stripeAvailable, setStripeAvailable] = useState(false);
  const [platformBalance, setPlatformBalance] = useState(null);

  const token = localStorage.getItem('token');

  const fetchPayouts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      
      const res = await fetch(`${API_URL}/api/payouts?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPayouts(Array.isArray(data) ? data : data.payouts || []);
    } catch (error) {
      console.error('Failed to fetch payouts:', error);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/payouts/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, [token]);

  const fetchStripeStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/payouts/stripe/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStripeAvailable(data.available);
      if (data.platform_balance) {
        setPlatformBalance(data.platform_balance);
      }
    } catch (error) {
      console.error('Failed to fetch Stripe status:', error);
    }
  }, [token]);

  const fetchPayableCommissions = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/commissions?status=payable`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPayableCommissions(Array.isArray(data) ? data : data.commissions || []);
    } catch (error) {
      console.error('Failed to fetch commissions:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchPayouts();
    fetchStats();
    fetchStripeStatus();
  }, [fetchPayouts, fetchStats, fetchStripeStatus]);

  const handleCreatePayout = async () => {
    if (selectedCommissions.length === 0) return;
    
    try {
      const res = await fetch(`${API_URL}/api/payouts`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ commission_ids: selectedCommissions })
      });
      
      if (res.ok) {
        setShowCreateModal(false);
        setSelectedCommissions([]);
        fetchPayouts();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to create payout:', error);
    }
  };

  const handleApprovePayout = async (payoutId) => {
    try {
      await fetch(`${API_URL}/api/payouts/${payoutId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPayouts();
      fetchStats();
    } catch (error) {
      console.error('Failed to approve payout:', error);
    }
  };

  const handleMarkPaid = async (payoutId) => {
    // Open the pay modal instead of directly marking as paid
    const payout = payouts.find(p => p.payout_id === payoutId);
    setSelectedPayout(payout);
    setShowPayModal(true);
  };

  const handleRejectPayout = async () => {
    if (!selectedPayout || !rejectReason.trim()) return;
    
    try {
      await fetch(`${API_URL}/api/payouts/${selectedPayout.payout_id}/reject`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectReason })
      });
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedPayout(null);
      fetchPayouts();
      fetchStats();
    } catch (error) {
      console.error('Failed to reject payout:', error);
    }
  };

  const handleExportCSV = () => {
    window.open(`${API_URL}/api/payouts/export?token=${token}`, '_blank');
  };

  const columns = [
    {
      header: 'Payout ID',
      render: (row) => (
        <Link 
          to={`/portal/admin/payouts/${row.payout_id}`}
          className="font-mono text-sm text-blue-600 hover:text-blue-800 hover:underline"
          data-testid={`payout-link-${row.payout_id}`}
        >
          {row.payout_id?.slice(0, 12)}
        </Link>
      )
    },
    {
      header: 'Recipient',
      render: (row) => row.user ? (
        <div>
          <p className="font-medium text-gray-900">{row.user.name}</p>
          <p className="text-xs text-gray-500">{row.user.email}</p>
        </div>
      ) : (
        <span className="text-gray-400">N/A</span>
      )
    },
    {
      header: 'Amount',
      render: (row) => (
        <span className="font-semibold text-green-600">
          ${parseFloat(row.total_amount || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Created',
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Link
            to={`/portal/admin/payouts/${row.payout_id}`}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Link>
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => handleApprovePayout(row.payout_id)}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Approve"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setSelectedPayout(row); setShowRejectModal(true); }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Reject"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
          {row.status === 'approved' && (
            <button
              onClick={() => handleMarkPaid(row.payout_id)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Mark as Paid"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      <PageHeader title="Payouts" subtitle="Manage commission payouts to reps and managers">
        <ActionButton variant="secondary" onClick={handleExportCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </ActionButton>
        <ActionButton onClick={() => { setShowCreateModal(true); fetchPayableCommissions(); }}>
          <Plus className="w-4 h-4 mr-2" />
          Create Payout
        </ActionButton>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        <StatCard title="Total Payouts" value={stats.total || 0} icon={DollarSign} color="blue" />
        <StatCard title="Pending" value={stats.pending || 0} icon={DollarSign} color="amber" />
        <StatCard title="Completed" value={stats.paid || 0} icon={DollarSign} color="green" />
        <StatCard title="Pending Amount" value={`£${(stats.pending_amount || stats.total_pending || 0).toLocaleString()}`} icon={DollarSign} color="purple" />
        {stripeAvailable && platformBalance && (
          <div className="bg-white rounded-2xl p-5 border border-purple-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Stripe Balance</p>
                <p className="text-xl font-bold text-gray-900">£{platformBalance.available?.toLocaleString()}</p>
              </div>
            </div>
            {platformBalance.pending > 0 && (
              <p className="text-xs text-purple-600 mt-1">+£{platformBalance.pending?.toLocaleString()} pending</p>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <FilterBar>
        <SelectFilter
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="All Status"
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'paid', label: 'Paid' },
            { value: 'rejected', label: 'Rejected' }
          ]}
        />
      </FilterBar>

      {/* Payouts Table */}
      <DataTable 
        columns={columns} 
        data={payouts} 
        loading={loading}
        emptyMessage="No payouts found. Create a new payout to get started."
      />

      {/* Create Payout Modal */}
      <Modal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        title="Create Payout Batch"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Select payable commissions to include in this payout batch.
          </p>
          {payableCommissions.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <p className="text-gray-500">No payable commissions available</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
              {payableCommissions.map(comm => (
                <label 
                  key={comm.commission_id} 
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCommissions.includes(comm.commission_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCommissions([...selectedCommissions, comm.commission_id]);
                      } else {
                        setSelectedCommissions(selectedCommissions.filter(id => id !== comm.commission_id));
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{comm.recipient?.name || comm.rep?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">Commission: £{parseFloat(comm.commission_amount_gbp || comm.amount || 0).toLocaleString()}</p>
                  </div>
                  <span className="font-semibold text-green-600">
                    £{parseFloat(comm.commission_amount_gbp || comm.amount || 0).toLocaleString()}
                  </span>
                </label>
              ))}
            </div>
          )}
          
          {selectedCommissions.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">{selectedCommissions.length}</span> commissions selected
              </p>
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4">
            <ActionButton variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </ActionButton>
            <ActionButton onClick={handleCreatePayout} disabled={selectedCommissions.length === 0}>
              Create Payout
            </ActionButton>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal 
        isOpen={showRejectModal} 
        onClose={() => { setShowRejectModal(false); setRejectReason(''); }} 
        title="Reject Payout"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter reason for rejection..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <ActionButton variant="secondary" onClick={() => { setShowRejectModal(false); setRejectReason(''); }}>
              Cancel
            </ActionButton>
            <ActionButton variant="danger" onClick={handleRejectPayout} disabled={!rejectReason.trim()}>
              Reject Payout
            </ActionButton>
          </div>
        </div>
      </Modal>

      {/* Pay Modal with Stripe Option */}
      {showPayModal && selectedPayout && (
        <PaymentModal
          payout={selectedPayout}
          stripeAvailable={stripeAvailable}
          onClose={() => { setShowPayModal(false); setSelectedPayout(null); }}
          onDone={() => {
            setShowPayModal(false);
            setSelectedPayout(null);
            fetchPayouts();
            fetchStats();
          }}
          token={token}
        />
      )}
    </div>
  );
};

// Payment Modal Component with Stripe Integration
const PaymentModal = ({ payout, stripeAvailable, onClose, onDone, token }) => {
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [loading, setLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeAccountStatus, setStripeAccountStatus] = useState(null);

  useEffect(() => {
    if (stripeAvailable && payout.user?.user_id) {
      checkStripeAccount();
    }
  }, [stripeAvailable, payout.user?.user_id]);

  const checkStripeAccount = async () => {
    try {
      const res = await fetch(`${API_URL}/api/payouts/stripe/account/${payout.user?.user_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStripeAccountStatus(data);
    } catch (error) {
      console.error('Error checking Stripe account:', error);
    }
  };

  const handleStripeTransfer = async () => {
    setStripeLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/payouts/${payout.payout_id}/stripe-transfer`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || 'Stripe transfer completed!');
        onDone();
      } else {
        toast.error(data.detail || 'Stripe transfer failed');
      }
    } catch (error) {
      toast.error('Failed to process Stripe transfer');
    } finally {
      setStripeLoading(false);
    }
  };

  const handleCreateStripeAccount = async () => {
    setStripeLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/payouts/stripe/create-account`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: payout.user?.user_id })
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Stripe account created. User needs to complete onboarding.');
        checkStripeAccount();
      } else {
        toast.error(data.detail || 'Failed to create Stripe account');
      }
    } catch (error) {
      toast.error('Failed to create Stripe account');
    } finally {
      setStripeLoading(false);
    }
  };

  const handleGetOnboardingLink = async () => {
    setStripeLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/payouts/stripe/onboarding-link`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: payout.user?.user_id })
      });
      const data = await res.json();
      
      if (res.ok) {
        window.open(data.url, '_blank');
        toast.success('Onboarding link opened in new tab');
      } else {
        toast.error(data.detail || 'Failed to generate link');
      }
    } catch (error) {
      toast.error('Failed to generate onboarding link');
    } finally {
      setStripeLoading(false);
    }
  };

  const handleManualPayment = async () => {
    if (!paymentRef.trim()) {
      toast.error('Payment reference is required');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/payouts/${payout.payout_id}/paid`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          payment_reference: paymentRef,
          payment_method: paymentMethod
        })
      });
      
      if (res.ok) {
        toast.success('Payment marked as complete');
        onDone();
      } else {
        const data = await res.json();
        toast.error(data.detail || 'Failed to mark as paid');
      }
    } catch (error) {
      toast.error('Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const hasStripeAccount = stripeAccountStatus?.has_account;
  const stripeReady = hasStripeAccount && stripeAccountStatus?.payouts_enabled;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Process Payment</h2>
          <p className="text-sm text-gray-500 mt-1">
            Send £{parseFloat(payout.total_amount || 0).toLocaleString()} to {payout.user?.name || 'Recipient'}
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Recipient Info */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">
                {payout.user?.name?.charAt(0) || '?'}
              </div>
              <div>
                <p className="font-medium text-gray-900">{payout.user?.name}</p>
                <p className="text-xs text-gray-500">{payout.user?.email}</p>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount</span>
              <span className="font-semibold text-gray-900">£{parseFloat(payout.total_amount || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Stripe Option */}
          {stripeAvailable && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="text-purple-600 w-5 h-5" />
                <span className="font-medium text-purple-900">Stripe Connect</span>
                {stripeReady && (
                  <span className="ml-auto px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Ready</span>
                )}
              </div>

              {!hasStripeAccount ? (
                <div>
                  <p className="text-sm text-purple-700 mb-3">
                    Set up Stripe Connect for instant payouts to user's bank.
                  </p>
                  <button
                    onClick={handleCreateStripeAccount}
                    disabled={stripeLoading}
                    className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {stripeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Create Stripe Account
                  </button>
                </div>
              ) : !stripeReady ? (
                <div>
                  <p className="text-sm text-purple-700 mb-3">
                    Account created. User needs to complete onboarding.
                  </p>
                  <button
                    onClick={handleGetOnboardingLink}
                    disabled={stripeLoading}
                    className="w-full py-2 px-4 border border-purple-300 text-purple-700 hover:bg-purple-100 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {stripeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    Get Onboarding Link
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-purple-700 mb-3">
                    Ready for instant transfer to user's bank account.
                  </p>
                  <button
                    onClick={handleStripeTransfer}
                    disabled={stripeLoading}
                    className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {stripeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Transfer via Stripe
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">Or manual payment</span>
            </div>
          </div>

          {/* Manual Payment */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="paypal">PayPal</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Reference *</label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="e.g. TRF-20240313-001"
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleManualPayment}
            disabled={loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Confirm Manual Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayoutsPage;
