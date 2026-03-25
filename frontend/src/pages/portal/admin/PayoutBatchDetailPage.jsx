import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, DollarSign, Users, Clock, CheckCircle, 
  AlertCircle, FileText, Download, Send, XCircle, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getRoleLabel, getRoleColor } from '../../../utils/roleUtils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-amber-100 text-amber-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    approved: 'bg-purple-100 text-purple-700',
    paid: 'bg-green-100 text-green-700',
    cancelled: 'bg-slate-100 text-slate-600',
    payable: 'bg-emerald-100 text-emerald-700'
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, color = 'blue' }) => {
  const colorMap = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    emerald: 'bg-emerald-500'
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

const PayoutBatchDetailPage = () => {
  const { batchId } = useParams();
  const [loading, setLoading] = useState(true);
  const [payout, setPayout] = useState(null);
  const [items, setItems] = useState([]);
  const token = localStorage.getItem('token');

  const fetchBatchDetails = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch payout details
      const payoutRes = await fetch(`${API_URL}/api/payouts/${batchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!payoutRes.ok) {
        throw new Error('Payout not found');
      }
      
      const payoutData = await payoutRes.json();
      setPayout(payoutData);
      
      // Fetch batch items
      const itemsRes = await fetch(`${API_URL}/api/payouts/${batchId}/items`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setItems(itemsData.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch batch details:', error);
      toast.error('Failed to load payout details');
    } finally {
      setLoading(false);
    }
  }, [batchId, token]);

  useEffect(() => {
    if (batchId) {
      fetchBatchDetails();
    }
  }, [batchId, fetchBatchDetails]);

  const handleExportItems = () => {
    if (!items.length) return;
    
    const headers = ['Commission ID', 'Beneficiary', 'Role', 'Student', 'Programme', 'Amount (GBP)', 'Status', 'Transfer Ref', 'Processed At'];
    const rows = items.map(item => [
      item.commission_id,
      item.commission?.beneficiary?.name || 'N/A',
      item.commission?.role_type || 'N/A',
      item.commission?.student?.name || 'N/A',
      item.commission?.programme_name || 'N/A',
      item.amount.toFixed(2),
      item.status,
      item.transfer_reference || '',
      item.processed_at ? new Date(item.processed_at).toISOString() : ''
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payout_${batchId}_items.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate summary stats
  const completedItems = items.filter(i => i.status === 'completed').length;
  const pendingItems = items.filter(i => i.status === 'pending').length;
  const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!payout) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Payout batch not found</p>
        <Link to="/portal/admin/payouts">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Payouts
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="payout-batch-detail">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/portal/admin/payouts">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div>
            <h1 className="font-heading text-2xl text-slate-900">Payout Batch Details</h1>
            <p className="text-slate-500 text-sm font-mono">{payout.payout_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportItems} disabled={!items.length}>
            <Download className="w-4 h-4 mr-2" />
            Export Items
          </Button>
        </div>
      </div>

      {/* Payout Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-slate-500 mb-1">Recipient</p>
            <p className="font-semibold text-slate-900">{payout.user_name || payout.user?.name}</p>
            <p className="text-sm text-slate-500">{payout.user_email || payout.user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">Total Amount</p>
            <p className="text-2xl font-bold text-green-600">£{parseFloat(payout.total_amount).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">Status</p>
            <StatusBadge status={payout.status} />
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">Created</p>
            <p className="font-medium text-slate-900">{new Date(payout.created_at).toLocaleDateString()}</p>
            {payout.paid_at && (
              <p className="text-sm text-green-600">Paid: {new Date(payout.paid_at).toLocaleDateString()}</p>
            )}
          </div>
        </div>
        
        {/* Additional details */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-slate-500">Batch ID</p>
            <p className="font-mono text-sm text-slate-700">{payout.batch_id}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Payment Reference</p>
            <p className="font-mono text-sm text-slate-700">{payout.payment_reference || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Payment Method</p>
            <p className="text-sm text-slate-700 capitalize">{payout.payment_method?.replace(/_/g, ' ') || 'Bank Transfer'}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={FileText} 
          label="Total Items" 
          value={items.length} 
          color="blue" 
        />
        <StatCard 
          icon={CheckCircle} 
          label="Completed" 
          value={completedItems} 
          color="green" 
        />
        <StatCard 
          icon={Clock} 
          label="Pending" 
          value={pendingItems} 
          color="amber" 
        />
        <StatCard 
          icon={DollarSign} 
          label="Total Amount" 
          value={`£${totalAmount.toLocaleString()}`} 
          color="emerald" 
        />
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-heading text-lg text-slate-900">Commission Items</h2>
          <p className="text-sm text-slate-500">All commissions included in this payout batch</p>
        </div>
        
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No items in this batch</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Beneficiary</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Programme</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Item Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Transfer Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Processed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-slate-50" data-testid={`batch-item-${index}`}>
                    <td className="px-4 py-3">
                      {item.commission?.beneficiary ? (
                        <div>
                          <p className="font-medium text-slate-900">{item.commission.beneficiary.name}</p>
                          <p className="text-xs text-slate-500">{item.commission.beneficiary.email}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.commission?.role_type ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(item.commission.role_type).bg} ${getRoleColor(item.commission.role_type).text}`}>
                          {getRoleLabel(item.commission.role_type)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.commission?.student ? (
                        <div>
                          <p className="text-sm text-slate-900">{item.commission.student.name}</p>
                          <p className="text-xs text-slate-500">{item.commission.student.email}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700">
                        {item.commission?.programme_name || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-green-600">
                        £{item.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-500">
                        {item.transfer_reference || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-500">
                        {item.processed_at ? new Date(item.processed_at).toLocaleDateString() : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayoutBatchDetailPage;
