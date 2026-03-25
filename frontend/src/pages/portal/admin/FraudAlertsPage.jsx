import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Shield, Eye, Check, X, Ban, Clock, FileText, AlertCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getRoleLabel, getRoleColor } from '../../../utils/roleUtils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const StatusBadge = ({ status }) => {
  const styles = {
    open: 'bg-red-100 text-red-700',
    reviewing: 'bg-amber-100 text-amber-700',
    cleared: 'bg-green-100 text-green-700',
    resolved: 'bg-green-100 text-green-700',
    dismissed: 'bg-slate-100 text-slate-600',
    under_review: 'bg-amber-100 text-amber-700'
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

const SeverityBadge = ({ severity }) => {
  const styles = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-blue-100 text-blue-700 border-blue-200'
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[severity] || 'bg-slate-100 text-slate-600'}`}>
      {severity}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, color = 'blue', subtext }) => {
  const colorMap = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500'
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

const FraudAlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({ 
    open_count: 0, 
    reviewing_count: 0, 
    cleared_this_month: 0, 
    total_count: 0,
    by_severity: {},
    by_type: {}
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const token = localStorage.getItem('token');

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (severityFilter) params.append('severity', severityFilter);
      
      const res = await fetch(`${API_URL}/api/fraud-alerts?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      toast.error('Failed to load fraud flags');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, typeFilter, severityFilter]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/fraud-alerts/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchAlerts();
    fetchSummary();
  }, [fetchAlerts, fetchSummary]);

  const handleUpdateStatus = async (alertId, newStatus, note = '') => {
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/fraud-alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus, review_note: note || reviewNote })
      });
      
      if (res.ok) {
        toast.success(`Flag status updated to ${newStatus}`);
        setShowSidePanel(false);
        setSelectedAlert(null);
        setReviewNote('');
        fetchAlerts();
        fetchSummary();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Failed to update alert:', error);
      toast.error('Failed to update status');
    } finally {
      setProcessing(false);
    }
  };

  const handleBanUser = async (alertId) => {
    if (!window.confirm('Are you sure you want to ban this user? This action cannot be undone.')) return;
    
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/fraud-alerts/${alertId}/ban-user`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        toast.success('User banned successfully');
        setShowSidePanel(false);
        fetchAlerts();
        fetchSummary();
      }
    } catch (error) {
      console.error('Failed to ban user:', error);
      toast.error('Failed to ban user');
    } finally {
      setProcessing(false);
    }
  };

  const openReviewPanel = (alert) => {
    setSelectedAlert(alert);
    setReviewNote('');
    setShowSidePanel(true);
  };

  const flagTypeLabels = {
    self_referral: 'Self Referral',
    ip_velocity: 'IP Velocity',
    ip_abuse: 'IP Abuse',
    velocity: 'Velocity',
    payout_spike: 'Payout Spike',
    duplicate_device: 'Duplicate Device',
    duplicate_student: 'Duplicate Student',
    suspicious_pattern: 'Suspicious Pattern',
    commission_override_abuse: 'Commission Override'
  };

  return (
    <div className="p-6" data-testid="fraud-flags-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-slate-900">Fraud Flags</h1>
        <p className="text-slate-500">Monitor and investigate suspicious activities</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          icon={AlertTriangle} 
          label="Open Flags" 
          value={summary.open_count} 
          color={summary.open_count > 0 ? 'red' : 'green'}
          subtext={summary.by_severity?.high ? `${summary.by_severity.high} high severity` : null}
        />
        <StatCard 
          icon={Clock} 
          label="Under Review" 
          value={summary.reviewing_count || 0} 
          color="amber" 
        />
        <StatCard 
          icon={Check} 
          label="Cleared This Month" 
          value={summary.cleared_this_month} 
          color="green" 
        />
        <StatCard 
          icon={Shield} 
          label="Total Flags" 
          value={summary.total_count} 
          color="blue" 
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 text-sm"
            data-testid="status-filter"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="reviewing">Under Review</option>
            <option value="cleared">Cleared</option>
            <option value="dismissed">Dismissed</option>
          </select>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 text-sm"
            data-testid="type-filter"
          >
            <option value="">All Types</option>
            {Object.entries(flagTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 text-sm"
            data-testid="severity-filter"
          >
            <option value="">All Severity</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          
          {(statusFilter || typeFilter || severityFilter) && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => { setStatusFilter(''); setTypeFilter(''); setSeverityFilter(''); }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No fraud flags found</p>
            <p className="text-sm text-slate-400">The system is monitoring for suspicious activity</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Related User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alerts.map((alert, index) => (
                <tr 
                  key={alert.alert_id} 
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => openReviewPanel(alert)}
                  data-testid={`fraud-flag-${index}`}
                >
                  <td className="px-4 py-3">
                    <SeverityBadge severity={alert.severity} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">
                      {flagTypeLabels[alert.flag_type] || alert.flag_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {alert.related_user ? (
                      <div>
                        <p className="font-medium text-slate-900">{alert.related_user.name}</p>
                        <p className="text-xs text-slate-500">{alert.related_user.email}</p>
                      </div>
                    ) : (
                      <span className="text-slate-400">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-600 truncate max-w-xs">
                      {alert.flag_reason || alert.description}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={alert.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-500">
                      {new Date(alert.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openReviewPanel(alert)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Review"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {['open', 'reviewing'].includes(alert.status) && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(alert.alert_id, 'cleared', 'Cleared without issue')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Clear"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(alert.alert_id, 'dismissed', 'Dismissed')}
                            className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
                            title="Dismiss"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Review Side Panel */}
      {showSidePanel && selectedAlert && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setShowSidePanel(false)}
          />
          
          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto" data-testid="review-panel">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl text-slate-900">Review Flag</h2>
                <button 
                  onClick={() => setShowSidePanel(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Alert Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <SeverityBadge severity={selectedAlert.severity} />
                  <StatusBadge status={selectedAlert.status} />
                  {selectedAlert.is_blocking && (
                    <span className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded-full font-medium">
                      Blocking
                    </span>
                  )}
                </div>
                
                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-slate-500 mb-1">Flag Type</h4>
                  <p className="text-lg font-medium text-slate-900">
                    {flagTypeLabels[selectedAlert.flag_type] || selectedAlert.flag_type}
                  </p>
                </div>
                
                {selectedAlert.related_user && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-slate-500 mb-1">Related User</h4>
                    <p className="font-medium text-slate-900">{selectedAlert.related_user.name}</p>
                    <p className="text-sm text-slate-500">{selectedAlert.related_user.email}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(selectedAlert.related_user.role).bg} ${getRoleColor(selectedAlert.related_user.role).text}`}>
                      {getRoleLabel(selectedAlert.related_user.role)}
                    </span>
                  </div>
                )}
                
                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-slate-500 mb-1">Reason</h4>
                  <p className="text-slate-700">{selectedAlert.flag_reason || selectedAlert.description}</p>
                </div>
                
                {selectedAlert.related_type && selectedAlert.related_id && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-slate-500 mb-1">Related Record</h4>
                    <p className="text-sm text-slate-700">
                      <span className="capitalize">{selectedAlert.related_type}</span>: 
                      <span className="font-mono ml-1">{selectedAlert.related_id}</span>
                    </p>
                  </div>
                )}
                
                {selectedAlert.metadata && Object.keys(selectedAlert.metadata).length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-slate-500 mb-1">Additional Data</h4>
                    <pre className="text-xs text-slate-600 overflow-x-auto">
                      {JSON.stringify(selectedAlert.metadata, null, 2)}
                    </pre>
                  </div>
                )}
                
                {(selectedAlert.review_note || selectedAlert.resolution_note) && (
                  <div className="bg-green-50 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-green-700 mb-1">Review Note</h4>
                    <p className="text-green-800">{selectedAlert.review_note || selectedAlert.resolution_note}</p>
                  </div>
                )}
                
                <div className="text-sm text-slate-500">
                  <p>Created: {new Date(selectedAlert.created_at).toLocaleString()}</p>
                  {(selectedAlert.reviewed_at || selectedAlert.resolved_at) && (
                    <p>Reviewed: {new Date(selectedAlert.reviewed_at || selectedAlert.resolved_at).toLocaleString()}</p>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              {['open', 'reviewing'].includes(selectedAlert.status) && (
                <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Review Note</label>
                    <textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add investigation notes..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {selectedAlert.status === 'open' && (
                      <Button
                        variant="outline"
                        onClick={() => handleUpdateStatus(selectedAlert.alert_id, 'reviewing')}
                        disabled={processing}
                        className="w-full"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Mark Reviewing
                      </Button>
                    )}
                    <Button
                      onClick={() => handleUpdateStatus(selectedAlert.alert_id, 'cleared')}
                      disabled={processing || !reviewNote.trim()}
                      className="w-full bg-green-500 hover:bg-green-600 text-white"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Clear Flag
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateStatus(selectedAlert.alert_id, 'dismissed')}
                      disabled={processing}
                      className="w-full"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Dismiss
                    </Button>
                    {selectedAlert.related_user_id && (
                      <Button
                        variant="outline"
                        onClick={() => handleBanUser(selectedAlert.alert_id)}
                        disabled={processing}
                        className="w-full border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Ban className="w-4 h-4 mr-2" />
                        Ban User
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FraudAlertsPage;
