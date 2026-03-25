import { useState, useEffect } from "react";
import {
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Filter,
  ChevronDown,
  MoreVertical,
  Calendar,
  User,
  Wallet,
  Percent,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { API, useAuth } from "@/App";
import axios from "axios";
import { toast } from "sonner";

const statusConfig = {
  pending_validation: { label: "Pending Validation", color: "bg-amber-100 text-amber-700", icon: Clock },
  pending_approval: { label: "Pending Approval", color: "bg-blue-100 text-blue-700", icon: AlertCircle },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  payable: { label: "Payable", color: "bg-green-100 text-green-700", icon: Wallet },
  paid: { label: "Paid", color: "bg-slate-100 text-slate-600", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: XCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle }
};

const roleTypeLabels = {
  rep: "Educational Rep",
  sales_user: "Sales User",
  manager: "Manager Override",
  referrer: "Referral"
};

const CommissionsDashboard = () => {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  
  // Override modal state (for managers)
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [overrideData, setOverrideData] = useState({
    requested_percentage: '',
    reason: ''
  });
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const isAdmin = ["super_admin", "admin"].includes(user?.role);
  const isManager = user?.role === "manager";

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (roleFilter) params.append("role_type", roleFilter);

      const [commissionsRes, statsRes] = await Promise.all([
        axios.get(`${API}/commissions?${params.toString()}`, { headers }),
        isAdmin ? axios.get(`${API}/commissions/stats`, { headers }) : Promise.resolve({ data: null })
      ]);

      setCommissions(commissionsRes.data);
      if (statsRes.data) setStats(statsRes.data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load commissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, roleFilter]);

  const approveCommission = async (commissionId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/commissions/${commissionId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Commission approved");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to approve");
    }
  };

  const rejectCommission = async (commissionId) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/commissions/${commissionId}/reject`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Commission rejected");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to reject");
    }
  };

  // Manager: Open override modal
  const openOverrideModal = (commission) => {
    const currentPct = ((parseFloat(commission.commission_value || commission.commission_rate) || 0) * 100).toFixed(1);
    setSelectedCommission(commission);
    setOverrideData({
      requested_percentage: currentPct,
      reason: ''
    });
    setShowOverrideModal(true);
  };

  // Manager: Submit override request
  const handleOverrideSubmit = async () => {
    if (!selectedCommission) return;
    
    const requestedPct = parseFloat(overrideData.requested_percentage);
    if (isNaN(requestedPct) || requestedPct < 0 || requestedPct > 100) {
      toast.error("Please enter a valid percentage (0-100)");
      return;
    }

    setSubmittingOverride(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API}/crm/commissions/${selectedCommission.commission_id}/override-request`,
        {
          requested_percentage: requestedPct,
          reason: overrideData.reason || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.applied) {
        toast.success("Override applied successfully! Commission updated.");
      } else if (res.data.pending) {
        toast.success("Override request submitted for admin approval.");
      }

      setShowOverrideModal(false);
      setSelectedCommission(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit override request");
    } finally {
      setSubmittingOverride(false);
    }
  };

  const formatCurrency = (amount) => `£${parseFloat(amount || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="commissions-dashboard">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl text-slate-900">Commissions</h1>
        <p className="text-slate-500 mt-1 text-sm">
          {isAdmin ? "Manage and approve commission payments" : "Track your commission earnings"}
        </p>
      </div>

      {/* Stats Cards - Smooth rounded boxes */}
      {stats && isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center">
                <Clock className="text-amber-500" size={22} />
              </div>
            </div>
            <p className="font-heading text-2xl text-slate-900">
              {stats.pending_approval_count || 0}
            </p>
            <p className="text-sm text-slate-500 mt-1">Pending Approval</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-emerald-500" size={22} />
              </div>
            </div>
            <p className="font-heading text-2xl text-slate-900">
              {formatCurrency(stats.by_status?.approved?.total)}
            </p>
            <p className="text-sm text-slate-500 mt-1">Approved</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center">
                <Wallet className="text-green-500" size={22} />
              </div>
            </div>
            <p className="font-heading text-2xl text-slate-900">
              {formatCurrency(stats.total_payable)}
            </p>
            <p className="text-sm text-slate-500 mt-1">Ready for Payout</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center">
                <DollarSign className="text-slate-500" size={22} />
              </div>
            </div>
            <p className="font-heading text-2xl text-slate-900">
              {formatCurrency(stats.total_paid)}
            </p>
            <p className="text-sm text-slate-500 mt-1">Total Paid Out</p>
          </div>
        </div>
      )}

      {/* Filters - Smooth rounded */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl min-w-[140px]">
                <Filter size={16} className="mr-2" />
                {statusFilter ? statusConfig[statusFilter]?.label : "All Status"}
                <ChevronDown size={16} className="ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-xl">
              <DropdownMenuItem onClick={() => setStatusFilter("")}>All Status</DropdownMenuItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <DropdownMenuItem key={key} onClick={() => setStatusFilter(key)}>
                  {config.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl min-w-[140px]">
                  {roleFilter ? roleTypeLabels[roleFilter] : "All Types"}
                  <ChevronDown size={16} className="ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-xl">
                <DropdownMenuItem onClick={() => setRoleFilter("")}>All Types</DropdownMenuItem>
                {Object.entries(roleTypeLabels).map(([key, label]) => (
                  <DropdownMenuItem key={key} onClick={() => setRoleFilter(key)}>
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Commissions List - Smooth rounded cards */}
      <div className="space-y-3">
        {commissions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <DollarSign className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="font-heading text-lg text-slate-900 mb-2">No Commissions Found</h3>
            <p className="text-slate-500 text-sm">
              {isAdmin ? "Commissions will appear here when sales are made" : "Your commissions will appear here"}
            </p>
          </div>
        ) : (
          commissions.map((comm) => {
            const status = statusConfig[comm.status] || statusConfig.pending;
            const StatusIcon = status.icon;

            return (
              <div
                key={comm.commission_id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all"
                data-testid={`commission-${comm.commission_id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status.color.replace('text-', 'bg-').replace('700', '50').replace('600', '50')}`}>
                      <DollarSign className={status.color.split(' ')[1]} size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading text-lg text-slate-900">
                          {formatCurrency(comm.commission_amount_gbp)}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-xs bg-slate-100 text-slate-600">
                          {roleTypeLabels[comm.role_type] || comm.role_type}
                        </span>
                      </div>
                      {comm.recipient && (
                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                          <User size={14} />
                          <span>{comm.recipient.name}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500">{comm.recipient.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(comm.created_at)}
                        </span>
                        <span>
                          Sale: {formatCurrency(comm.sale_amount_gbp || comm.course_fee_gbp)}
                        </span>
                        <span>
                          Rate: {((parseFloat(comm.commission_value || comm.commission_rate) || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {isAdmin && ["pending_validation", "pending_approval", "pending"].includes(comm.status) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="rounded-xl">
                          <MoreVertical size={18} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem onClick={() => approveCommission(comm.commission_id)}>
                          <CheckCircle size={14} className="mr-2 text-green-500" />
                          Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => rejectCommission(comm.commission_id)}>
                          <XCircle size={14} className="mr-2 text-red-500" />
                          Reject
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* Manager Override Button */}
                  {isManager && ["pending_validation", "pending_approval", "pending"].includes(comm.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openOverrideModal(comm)}
                      className="rounded-xl text-amber-600 border-amber-300 hover:bg-amber-50"
                      data-testid={`override-btn-${comm.commission_id}`}
                    >
                      <Percent size={14} className="mr-1" />
                      Override %
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manager Override Modal */}
      {showOverrideModal && selectedCommission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl" data-testid="override-modal">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-heading text-xl text-slate-900">Override Commission %</h3>
              <p className="text-slate-500 text-sm mt-1">Adjust the commission percentage for this record</p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Current Info */}
              <div className="bg-slate-50 p-4 rounded-xl">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Current %</p>
                    <p className="font-semibold text-slate-900">
                      {((parseFloat(selectedCommission.commission_value || selectedCommission.commission_rate) || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Commission Amount</p>
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(selectedCommission.commission_amount_gbp)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Sale Amount</p>
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(selectedCommission.sale_amount_gbp || selectedCommission.course_fee_gbp)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Allowed Range</p>
                    <p className="font-semibold text-amber-600">
                      {selectedCommission.rule_min || '0'}% – {selectedCommission.rule_max || '100'}%
                    </p>
                  </div>
                </div>
              </div>

              {/* New Percentage Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  New Percentage (%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={overrideData.requested_percentage}
                  onChange={(e) => setOverrideData({ ...overrideData, requested_percentage: e.target.value })}
                  placeholder="Enter new percentage"
                  className="rounded-xl"
                />
                <p className="text-xs text-slate-500 mt-1">
                  If outside the allowed range, this request will need admin approval.
                </p>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reason (optional)
                </label>
                <Textarea
                  value={overrideData.reason}
                  onChange={(e) => setOverrideData({ ...overrideData, reason: e.target.value })}
                  placeholder="Explain why you're requesting this override..."
                  rows={3}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowOverrideModal(false);
                  setSelectedCommission(null);
                }}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleOverrideSubmit}
                disabled={submittingOverride}
                className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
              >
                {submittingOverride ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Override'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionsDashboard;
