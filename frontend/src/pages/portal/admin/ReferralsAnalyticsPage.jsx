import React, { useState, useEffect, useCallback } from 'react';
import { 
  Link2, Users, TrendingUp, MousePointer, CheckCircle, 
  Clock, DollarSign, Search, Download, ExternalLink, RefreshCw,
  Wallet, Send, XCircle, Loader2, CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const StatCard = ({ icon: Icon, label, value, color = 'blue', subtext }) => {
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
          {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
        </div>
      </div>
    </div>
  );
};

const ReferralsAnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    total_clicks: 0,
    total_conversions: 0,
    conversion_rate: '0.0',
    by_referral_code: [],
    recent_clicks: []
  });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchCode, setSearchCode] = useState('');
  
  // Payout requests state
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [processingPayout, setProcessingPayout] = useState(null);

  const token = localStorage.getItem('token');

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (searchCode) params.append('referral_code', searchCode);

      const res = await fetch(`${API_URL}/api/referrals/analytics?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      } else {
        toast.error('Failed to load analytics');
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [token, dateFrom, dateTo, searchCode]);

  const fetchPayoutRequests = useCallback(async () => {
    try {
      setPayoutsLoading(true);
      const res = await fetch(`${API_URL}/api/referrals/payout-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setPayoutRequests(data);
      }
    } catch (error) {
      console.error('Failed to fetch payout requests:', error);
    } finally {
      setPayoutsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    if (activeTab === 'payouts') {
      fetchPayoutRequests();
    }
  }, [activeTab, fetchPayoutRequests]);

  const handleApprovePayout = async (payoutId) => {
    setProcessingPayout(payoutId);
    try {
      await axios.post(
        `${API_URL}/api/payouts/${payoutId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Payout approved');
      fetchPayoutRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve payout');
    } finally {
      setProcessingPayout(null);
    }
  };

  const handleRejectPayout = async (payoutId) => {
    setProcessingPayout(payoutId);
    try {
      await axios.post(
        `${API_URL}/api/payouts/${payoutId}/reject`,
        { reason: 'Rejected by admin' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Payout rejected');
      fetchPayoutRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject payout');
    } finally {
      setProcessingPayout(null);
    }
  };

  const handleMarkPaid = async (payoutId, paymentRef) => {
    setProcessingPayout(payoutId);
    try {
      await axios.post(
        `${API_URL}/api/payouts/${payoutId}/paid`,
        { payment_reference: paymentRef || `REF-${Date.now()}`, payment_method: 'bank_transfer' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Payout marked as paid');
      fetchPayoutRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to mark as paid');
    } finally {
      setProcessingPayout(null);
    }
  };

  const handleExport = () => {
    if (!analytics.by_referral_code.length) return;
    
    const headers = ['Referral Code', 'Referrer', 'Email', 'Role', 'Clicks', 'Conversions', 'Conversion Rate'];
    const rows = analytics.by_referral_code.map(item => [
      item.referral_code,
      item.referrer_name,
      item.referrer_email,
      item.referrer_role,
      item.clicks,
      item.conversions,
      `${item.conversion_rate}%`
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referral_analytics_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'by-code', label: 'By Referral Code', icon: Link2 },
    { id: 'recent', label: 'Recent Clicks', icon: Clock },
    { id: 'payouts', label: 'Payout Requests', icon: Wallet }
  ];

  return (
    <div className="p-6" data-testid="referrals-analytics-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl text-slate-900">Referral Analytics</h1>
          <p className="text-slate-500">Track clicks, conversions, and attribution performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchAnalytics}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={!analytics.by_referral_code.length}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          icon={MousePointer} 
          label="Total Clicks" 
          value={analytics.total_clicks.toLocaleString()} 
          color="blue" 
        />
        <StatCard 
          icon={CheckCircle} 
          label="Conversions" 
          value={analytics.total_conversions.toLocaleString()} 
          color="green" 
        />
        <StatCard 
          icon={TrendingUp} 
          label="Conversion Rate" 
          value={`${analytics.conversion_rate}%`} 
          color="purple" 
        />
        <StatCard 
          icon={Users} 
          label="Active Referrers" 
          value={analytics.by_referral_code.length} 
          color="amber" 
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-100 overflow-x-auto pb-px">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.id 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Referral Code</label>
            <Input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Filter by code..."
              className="w-40"
            />
          </div>
          {(dateFrom || dateTo || searchCode) && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => { setDateFrom(''); setDateTo(''); setSearchCode(''); }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Content based on active tab */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Top Performers */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-heading text-lg text-slate-900">Top Performers</h3>
                  <p className="text-sm text-slate-500">Referrers by conversion rate</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {analytics.by_referral_code
                    .sort((a, b) => parseFloat(b.conversion_rate) - parseFloat(a.conversion_rate))
                    .slice(0, 5)
                    .map((item, index) => (
                      <div key={index} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{item.referrer_name}</p>
                          <p className="text-sm text-slate-500 font-mono">{item.referral_code}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{item.conversion_rate}%</p>
                          <p className="text-xs text-slate-500">{item.conversions}/{item.clicks} converted</p>
                        </div>
                      </div>
                    ))}
                  {analytics.by_referral_code.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                      No data available
                    </div>
                  )}
                </div>
              </div>

              {/* Most Active */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-heading text-lg text-slate-900">Most Active</h3>
                  <p className="text-sm text-slate-500">Referrers by total clicks</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {analytics.by_referral_code
                    .sort((a, b) => b.clicks - a.clicks)
                    .slice(0, 5)
                    .map((item, index) => (
                      <div key={index} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{item.referrer_name}</p>
                          <p className="text-sm text-slate-500 font-mono">{item.referral_code}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">{item.clicks}</p>
                          <p className="text-xs text-slate-500">clicks</p>
                        </div>
                      </div>
                    ))}
                  {analytics.by_referral_code.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                      No data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'by-code' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {analytics.by_referral_code.length === 0 ? (
                <div className="p-12 text-center">
                  <Link2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No referral data available</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Referral Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Referrer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Clicks</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Conversions</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.by_referral_code.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50" data-testid={`referral-row-${index}`}>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">
                            {item.referral_code}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{item.referrer_name}</p>
                          <p className="text-xs text-slate-500">{item.referrer_email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {item.referrer_role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">{item.clicks}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-green-600">{item.conversions}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${parseFloat(item.conversion_rate) > 10 ? 'text-green-600' : 'text-slate-600'}`}>
                            {item.conversion_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'recent' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {analytics.recent_clicks.length === 0 ? (
                <div className="p-12 text-center">
                  <MousePointer className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No recent clicks</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Referral Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Referrer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">IP Address</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Converted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.recent_clicks.map((click, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">
                            {new Date(click.clicked_at).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">
                            {click.referral_code}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-900">{click.referrer_name || 'Unknown'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-slate-500">{click.ip_address || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          {click.converted ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-xs">{click.converted_at ? new Date(click.converted_at).toLocaleDateString() : 'Yes'}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'payouts' && (
            <div className="space-y-4" data-testid="referral-payouts-tab">
              {payoutsLoading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <Loader2 className="w-8 h-8 text-slate-400 mx-auto animate-spin" />
                </div>
              ) : payoutRequests.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No payout requests</p>
                  <p className="text-sm text-slate-400 mt-1">Student referral bonus claims will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Pending payouts highlight */}
                  {payoutRequests.filter(p => p.status === 'pending').length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="text-amber-600" size={18} />
                        <span className="font-medium text-amber-900">
                          {payoutRequests.filter(p => p.status === 'pending').length} payout{payoutRequests.filter(p => p.status === 'pending').length !== 1 ? 's' : ''} awaiting review
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Payout cards */}
                  {payoutRequests.map((payout) => {
                    const statusConfig = {
                      pending: { label: 'Pending Review', color: 'bg-amber-100 text-amber-700', icon: Clock },
                      approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
                      paid: { label: 'Paid', color: 'bg-green-100 text-green-700', icon: CheckCircle },
                      cancelled: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle }
                    };
                    const status = statusConfig[payout.status] || statusConfig.pending;
                    const StatusIcon = status.icon;

                    return (
                      <div
                        key={payout.payout_id}
                        className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-all"
                        data-testid={`payout-${payout.payout_id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                              <span className="font-bold text-purple-600">
                                {payout.user_name?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-heading text-lg text-slate-900">
                                  £{parseFloat(payout.total_amount).toFixed(2)}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-medium ${status.color}`}>
                                  {status.label}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-xs">
                                  Student Referral
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                                <span>{payout.user_name}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-400 text-xs">{payout.user_email}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
                                <span>
                                  {new Date(payout.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <span>{payout.commission_count} referral bonus{payout.commission_count !== 1 ? 'es' : ''}</span>
                                {payout.payment_reference && (
                                  <span className="flex items-center gap-1 text-slate-500">
                                    <CreditCard size={11} />
                                    {payout.payment_reference}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2 shrink-0">
                            {payout.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() => handleApprovePayout(payout.payout_id)}
                                  disabled={processingPayout === payout.payout_id}
                                >
                                  {processingPayout === payout.payout_id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <><CheckCircle size={14} className="mr-1.5" /> Approve</>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => handleRejectPayout(payout.payout_id)}
                                  disabled={processingPayout === payout.payout_id}
                                >
                                  <XCircle size={14} className="mr-1.5" /> Reject
                                </Button>
                              </>
                            )}
                            {payout.status === 'approved' && (
                              <Button
                                size="sm"
                                className="rounded-xl bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleMarkPaid(payout.payout_id)}
                                disabled={processingPayout === payout.payout_id}
                              >
                                {processingPayout === payout.payout_id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <><Send size={14} className="mr-1.5" /> Mark Paid</>
                                )}
                              </Button>
                            )}
                            {payout.status === 'paid' && (
                              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                <CheckCircle size={13} /> Completed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReferralsAnalyticsPage;
