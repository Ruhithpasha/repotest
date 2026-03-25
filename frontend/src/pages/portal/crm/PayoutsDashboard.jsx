import { useState, useEffect } from "react";
import {
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  ChevronDown,
  MoreVertical,
  Calendar,
  User,
  CreditCard,
  Plus,
  Filter,
  Building,
  X,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  approved: { label: "Approved", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  processing: { label: "Processing", color: "bg-purple-100 text-purple-700", icon: Clock },
  paid: { label: "Paid", color: "bg-green-100 text-green-700", icon: CheckCircle },
  failed: { label: "Failed", color: "bg-red-100 text-red-700", icon: XCircle },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-500", icon: XCircle }
};

// Mark Paid Modal — shows bank details + reference input
const MarkPaidModal = ({ payout, onClose, onPaid }) => {
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [bankDetails, setBankDetails] = useState(null);

  useEffect(() => {
    // Fetch the payee's user record to get bank details
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        const userId = payout.user_id;
        if (!userId) return;
        const res = await axios.get(`${API}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const payee = res.data.find(u => u.user_id === userId);
        if (payee?.bank_details) setBankDetails(payee.bank_details);
      } catch (err) {
        console.error("Could not load bank details", err);
      }
    };
    fetchUser();
  }, [payout.user_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reference.trim()) {
      toast.error("Payment reference is required");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/payouts/${payout.payout_id}/paid`,
        { payment_reference: reference.trim(), payment_method: "bank_transfer" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Payout marked as paid");
      onPaid();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to mark as paid");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-xl text-slate-900">Mark as Paid</h2>
            <p className="text-sm text-slate-500 mt-1">
              £{parseFloat(payout.total_amount || 0).toFixed(2)} to {payout.user_name || payout.user?.name}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl">
            <X size={18} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Bank details card */}
          {bankDetails ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building size={16} className="text-slate-500" />
                <p className="text-sm font-medium text-slate-700">Bank Details on File</p>
              </div>
              <div className="space-y-1 text-sm">
                {bankDetails.account_holder_name && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account Name</span>
                    <span className="font-medium text-slate-900">{bankDetails.account_holder_name}</span>
                  </div>
                )}
                {bankDetails.sort_code && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sort Code</span>
                    <span className="font-medium text-slate-900 font-mono">{bankDetails.sort_code}</span>
                  </div>
                )}
                {bankDetails.account_number && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account Number</span>
                    <span className="font-medium text-slate-900 font-mono">{bankDetails.account_number}</span>
                  </div>
                )}
                {bankDetails.bank_name && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bank</span>
                    <span className="font-medium text-slate-900">{bankDetails.bank_name}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              No bank details on file for this rep. Ask them to provide account details before proceeding.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Payment Reference *
            </label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. BACS-2024-001 or transfer ID"
              required
            />
            <p className="text-xs text-slate-400 mt-1">Enter your bank transfer reference or BACS ID</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
            >
              {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <CheckCircle size={16} className="mr-2" />}
              Confirm Payment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PayoutsDashboard = () => {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [markPaidPayout, setMarkPaidPayout] = useState(null);

  const isAdmin = ["super_admin", "admin"].includes(user?.role);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);

      const [payoutsRes, statsRes] = await Promise.all([
        axios.get(`${API}/payouts?${params.toString()}`, { headers }),
        isAdmin ? axios.get(`${API}/payouts/stats`, { headers }) : Promise.resolve({ data: null })
      ]);

      setPayouts(payoutsRes.data);
      if (statsRes.data) setStats(statsRes.data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load payouts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const approvePayout = async (payoutId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/payouts/${payoutId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Payout approved");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to approve");
    }
  };

  const exportPayouts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/payouts/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob"
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `payouts_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Export downloaded");
    } catch (error) {
      toast.error("Failed to export");
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
    <div className="space-y-6" data-testid="payouts-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl text-slate-900">Payouts</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {isAdmin ? "Process and track commission payouts" : "View your payout history"}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportPayouts}
              className="rounded-xl"
            >
              <Download size={18} className="mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-slate-900 hover:bg-slate-800 rounded-xl"
            >
              <Plus size={18} className="mr-2" />
              Create Payout
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {stats && isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
              <Clock className="text-amber-500" size={22} />
            </div>
            <p className="font-heading text-2xl text-slate-900">{formatCurrency(stats.total_pending)}</p>
            <p className="text-sm text-slate-500 mt-1">Pending Payouts</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
              <CheckCircle className="text-blue-500" size={22} />
            </div>
            <p className="font-heading text-2xl text-slate-900">{formatCurrency(stats.total_approved)}</p>
            <p className="text-sm text-slate-500 mt-1">Approved (Ready)</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center mb-3">
              <Wallet className="text-green-500" size={22} />
            </div>
            <p className="font-heading text-2xl text-slate-900">{formatCurrency(stats.total_paid)}</p>
            <p className="text-sm text-slate-500 mt-1">Total Paid</p>
          </div>
        </div>
      )}

      {/* Approved payouts highlight */}
      {isAdmin && payouts.filter(p => p.status === "approved").length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-blue-600" size={18} />
            <span className="font-medium text-blue-900">
              {payouts.filter(p => p.status === "approved").length} payout{payouts.filter(p => p.status === "approved").length !== 1 ? "s" : ""} approved and ready to send
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
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
        </div>
      </div>

      {/* Payouts List */}
      <div className="space-y-3">
        {payouts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <Wallet className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="font-heading text-lg text-slate-900 mb-2">No Payouts Found</h3>
            <p className="text-slate-500 text-sm">
              {isAdmin ? "Create payouts to process commission payments" : "Your payouts will appear here"}
            </p>
          </div>
        ) : (
          payouts.map((payout) => {
            const status = statusConfig[payout.status] || statusConfig.pending;
            const StatusIcon = status.icon;

            return (
              <div
                key={payout.payout_id}
                className={`bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition-all ${
                  payout.status === "approved" ? "border-blue-200" : "border-slate-100"
                }`}
                data-testid={`payout-${payout.payout_id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                      <Wallet className="text-slate-500" size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading text-lg text-slate-900">
                          {formatCurrency(payout.total_amount)}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                        <User size={14} />
                        <span>{payout.user_name || payout.user?.name}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">{payout.user_email || payout.user?.email}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(payout.created_at)}
                        </span>
                        <span>
                          {payout.commission_count} commission{payout.commission_count !== 1 ? "s" : ""}
                        </span>
                        {payout.payment_reference && (
                          <span className="flex items-center gap-1">
                            <CreditCard size={12} />
                            {payout.payment_reference}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isAdmin && ["pending", "approved"].includes(payout.status) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="rounded-xl">
                          <MoreVertical size={18} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        {payout.status === "pending" && (
                          <DropdownMenuItem onClick={() => approvePayout(payout.payout_id)}>
                            <CheckCircle size={14} className="mr-2 text-blue-500" />
                            Approve
                          </DropdownMenuItem>
                        )}
                        {["pending", "approved"].includes(payout.status) && (
                          <DropdownMenuItem onClick={() => setMarkPaidPayout(payout)}>
                            <Wallet size={14} className="mr-2 text-green-500" />
                            Mark as Paid
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Payout Modal */}
      {showCreateModal && (
        <CreatePayoutModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchData();
          }}
        />
      )}

      {/* Mark Paid Modal */}
      {markPaidPayout && (
        <MarkPaidModal
          payout={markPaidPayout}
          onClose={() => setMarkPaidPayout(null)}
          onPaid={() => {
            setMarkPaidPayout(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

// Create Payout Modal
const CreatePayoutModal = ({ onClose, onCreated }) => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [payableAmount, setPayableAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const eligibleUsers = res.data.filter(u =>
          ["rep", "sales_user", "manager"].includes(u.role)
        );
        setUsers(eligibleUsers);
      } catch (error) {
        console.error("Error:", error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchPayable = async () => {
      if (!selectedUserId) {
        setPayableAmount(0);
        setSelectedUser(null);
        return;
      }
      const user = users.find(u => u.user_id === selectedUserId);
      setSelectedUser(user || null);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/commissions?rep_id=${selectedUserId}&status=payable`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const total = res.data.reduce((sum, c) => sum + parseFloat(c.commission_amount_gbp || 0), 0);
        setPayableAmount(total);
      } catch (error) {
        console.error("Error:", error);
      }
    };
    fetchPayable();
  }, [selectedUserId, users]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId || payableAmount <= 0) {
      toast.error("No payable commissions for selected user");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/payouts`,
        { user_id: selectedUserId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Payout created successfully");
      onCreated();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create payout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-xl text-slate-900">Create Payout</h2>
            <p className="text-sm text-slate-500 mt-1">Generate a payout for payable commissions</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl">
            <X size={18} />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Recipient
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
              required
            >
              <option value="">Choose a user...</option>
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.name} ({u.role}) - {u.email}
                </option>
              ))}
            </select>
          </div>

          {selectedUserId && (
            <div className="p-4 bg-slate-50 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Payable Amount</span>
                <span className="font-heading text-xl text-slate-900">
                  £{payableAmount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Show bank details if available */}
              {selectedUser?.bank_details && (
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Building size={14} className="text-slate-400" />
                    <span className="text-xs font-medium text-slate-600">Bank Details on File</span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600">
                    {selectedUser.bank_details.account_holder_name && (
                      <p>{selectedUser.bank_details.account_holder_name}</p>
                    )}
                    {selectedUser.bank_details.sort_code && selectedUser.bank_details.account_number && (
                      <p className="font-mono">
                        {selectedUser.bank_details.sort_code} · {selectedUser.bank_details.account_number}
                      </p>
                    )}
                    {selectedUser.bank_details.bank_name && (
                      <p className="text-slate-400">{selectedUser.bank_details.bank_name}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 rounded-xl"
              disabled={loading || payableAmount <= 0}
            >
              {loading ? "Creating..." : "Create Payout"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PayoutsDashboard;
