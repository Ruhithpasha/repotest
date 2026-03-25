import { useState, useEffect } from "react";
import {
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  ChevronDown,
  Calendar,
  User,
  CreditCard,
  Plus,
  Filter,
  Loader2,
  Send,
  AlertCircle,
  ArrowRight,
  Building2,
  RefreshCw,
  Zap,
  ExternalLink
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
  pending:    { label: "Pending Review",  color: "bg-amber-100 text-amber-700",  icon: Clock,        step: 1 },
  approved:   { label: "Approved",        color: "bg-blue-100 text-blue-700",    icon: CheckCircle,  step: 2 },
  processing: { label: "Processing",      color: "bg-purple-100 text-purple-700",icon: Clock,        step: 2 },
  paid:       { label: "Payment Sent",    color: "bg-green-100 text-green-700",  icon: CheckCircle,  step: 3 },
  failed:     { label: "Failed",          color: "bg-red-100 text-red-700",      icon: XCircle,      step: 0 },
  cancelled:  { label: "Cancelled",       color: "bg-slate-100 text-slate-500",  icon: XCircle,      step: 0 },
};

const fmt = (n) =>
  `£${parseFloat(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-";

// ─── Payment Status Timeline (rep view) ─────────────────────────────────────
const PayoutTimeline = ({ status }) => {
  const steps = [
    { key: "pending",  label: "Payout Created" },
    { key: "approved", label: "Approved by Admin" },
    { key: "paid",     label: "Payment Sent" },
  ];
  const current = statusConfig[status]?.step || 0;

  return (
    <div className="flex items-center gap-1 mt-3">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-1 flex-1 last:flex-none">
          <div className={`flex flex-col items-center flex-1`}>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i + 1 < current
                  ? "bg-green-500 text-white"
                  : i + 1 === current
                  ? "bg-blue-500 text-white"
                  : "bg-slate-200 text-slate-400"
              }`}
            >
              {i + 1 < current ? <CheckCircle size={12} /> : i + 1}
            </div>
            <p className={`text-xs mt-1 text-center leading-tight ${
              i + 1 <= current ? "text-slate-700" : "text-slate-400"
            }`}>
              {step.label}
            </p>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 flex-1 mb-4 transition-all ${
              i + 1 < current ? "bg-green-400" : "bg-slate-200"
            }`} />
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Initiate Payment Modal (admin) ─────────────────────────────────────────
const InitiatePaymentModal = ({ payout, onClose, onDone, stripeAvailable }) => {
  const [form, setForm] = useState({
    payment_method: "bank_transfer",
    payment_reference: "",
  });
  const [loading, setLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeAccountStatus, setStripeAccountStatus] = useState(null);

  // Check Stripe account status when modal opens
  useEffect(() => {
    if (stripeAvailable) {
      checkStripeAccount();
    }
  }, [stripeAvailable, payout.user_id]);

  const checkStripeAccount = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/payouts/stripe/account/${payout.user_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStripeAccountStatus(res.data);
    } catch (err) {
      console.error("Error checking Stripe account:", err);
    }
  };

  const handleStripeTransfer = async () => {
    setStripeLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API}/payouts/${payout.payout_id}/stripe-transfer`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message || `Stripe transfer initiated successfully`);
      onDone();
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.needs_stripe_setup) {
        toast.error("User needs to set up Stripe Connect first");
      } else if (errorData?.needs_onboarding) {
        toast.error("User hasn't completed Stripe onboarding");
      } else {
        toast.error(errorData?.detail || "Stripe transfer failed");
      }
    } finally {
      setStripeLoading(false);
    }
  };

  const handleCreateStripeAccount = async () => {
    setStripeLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/payouts/stripe/create-account`,
        { user_id: payout.user_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Stripe account created. User needs to complete onboarding.");
      checkStripeAccount();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create Stripe account");
    } finally {
      setStripeLoading(false);
    }
  };

  const handleGetOnboardingLink = async () => {
    setStripeLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API}/payouts/stripe/onboarding-link`,
        { user_id: payout.user_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Open onboarding link in new tab
      window.open(res.data.url, '_blank');
      toast.success("Onboarding link opened. Share this with the user if needed.");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to generate onboarding link");
    } finally {
      setStripeLoading(false);
    }
  };

  const handlePay = async () => {
    if (!form.payment_reference.trim()) {
      toast.error("Payment reference is required");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/payouts/${payout.payout_id}/paid`,
        { payment_reference: form.payment_reference, payment_method: form.payment_method },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Payment of ${fmt(payout.total_amount)} marked as sent to ${payout.user_name}`);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to mark as paid");
    } finally {
      setLoading(false);
    }
  };

  const hasStripeAccount = stripeAccountStatus?.has_account;
  const stripeReady = hasStripeAccount && stripeAccountStatus?.payouts_enabled;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-heading text-xl text-slate-900">Initiate Payment</h2>
          <p className="text-sm text-slate-500 mt-1">
            Send {fmt(payout.total_amount)} to {payout.user_name}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Recipient info */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600">
                {payout.user_name?.charAt(0) || "?"}
              </div>
              <div>
                <p className="font-medium text-slate-900">{payout.user_name}</p>
                <p className="text-xs text-slate-500">{payout.user_email}</p>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Amount</span>
              <span className="font-semibold text-slate-900">{fmt(payout.total_amount)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-slate-500">Commissions</span>
              <span className="text-slate-700">{payout.commission_count} record{payout.commission_count !== 1 ? "s" : ""}</span>
            </div>
            {payout.bank_details && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <Building2 size={12} />
                  Bank Details on File
                </div>
                {payout.bank_details.account_name && (
                  <p className="text-xs text-slate-700">Name: {payout.bank_details.account_name}</p>
                )}
                {payout.bank_details.account_number && (
                  <p className="text-xs text-slate-700">Acc: {payout.bank_details.account_number}</p>
                )}
                {payout.bank_details.sort_code && (
                  <p className="text-xs text-slate-700">Sort: {payout.bank_details.sort_code}</p>
                )}
              </div>
            )}
            {!payout.bank_details && (
              <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2 text-xs text-amber-600">
                <AlertCircle size={12} />
                No bank details on file for this user
              </div>
            )}
          </div>

          {/* Stripe Connect Option */}
          {stripeAvailable && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="text-purple-600" size={18} />
                <span className="font-medium text-purple-900">Stripe Connect</span>
                {stripeReady && (
                  <span className="ml-auto px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Ready</span>
                )}
              </div>

              {!hasStripeAccount ? (
                <div>
                  <p className="text-sm text-purple-700 mb-3">
                    Set up Stripe Connect to send instant payouts directly to the user's bank account.
                  </p>
                  <Button
                    onClick={handleCreateStripeAccount}
                    disabled={stripeLoading}
                    size="sm"
                    className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {stripeLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>Create Stripe Account</>
                    )}
                  </Button>
                </div>
              ) : !stripeReady ? (
                <div>
                  <p className="text-sm text-purple-700 mb-3">
                    Account created but user needs to complete onboarding to receive payouts.
                  </p>
                  <Button
                    onClick={handleGetOnboardingLink}
                    disabled={stripeLoading}
                    size="sm"
                    variant="outline"
                    className="w-full rounded-xl border-purple-300 text-purple-700 hover:bg-purple-100"
                  >
                    {stripeLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <><ExternalLink size={14} className="mr-2" /> Get Onboarding Link</>
                    )}
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-purple-700 mb-3">
                    User's Stripe Connect is ready. Click below to transfer funds instantly.
                  </p>
                  <Button
                    onClick={handleStripeTransfer}
                    disabled={stripeLoading}
                    size="sm"
                    className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {stripeLoading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                    ) : (
                      <><Zap size={14} className="mr-2" /> Transfer via Stripe</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">Or manual payment</span>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
            <select
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="paypal">PayPal</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Payment Reference <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.payment_reference}
              onChange={(e) => setForm({ ...form, payment_reference: e.target.value })}
              placeholder="e.g. TRF-20240313-001"
              className="rounded-xl"
            />
            <p className="text-xs text-slate-400 mt-1">
              This reference will be sent to the recipient for reconciliation
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handlePay}
            disabled={loading}
            className="rounded-xl bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
            ) : (
              <><Send size={16} className="mr-2" /> Confirm Manual Payment</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const PayoutsDashboard = () => {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null); // payout to initiate payment for
  const [stripeAvailable, setStripeAvailable] = useState(false);
  const [platformBalance, setPlatformBalance] = useState(null);

  const isAdmin = ["super_admin", "admin"].includes(user?.role);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);

      const requests = [
        axios.get(`${API}/payouts?${params.toString()}`, { headers }),
        isAdmin ? axios.get(`${API}/payouts/stats`, { headers }) : Promise.resolve({ data: null }),
      ];

      // Check Stripe status for admins
      if (isAdmin) {
        requests.push(axios.get(`${API}/payouts/stripe/status`, { headers }).catch(() => ({ data: { available: false } })));
      }

      const results = await Promise.all(requests);

      setPayouts(results[0].data);
      if (results[1].data) setStats(results[1].data);
      
      // Set Stripe availability
      if (isAdmin && results[2]?.data) {
        setStripeAvailable(results[2].data.available);
        if (results[2].data.platform_balance) {
          setPlatformBalance(results[2].data.platform_balance);
        }
      }

    } catch (error) {
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
      toast.success("Payout approved — ready for payment");
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
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `payouts_export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export downloaded");
    } catch {
      toast.error("Failed to export");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  // Separate approved payouts (ready to initiate payment) for admin prominence
  const approvedPayouts = payouts.filter((p) => p.status === "approved");
  const otherPayouts = payouts.filter((p) => p.status !== "approved");

  return (
    <div className="space-y-6" data-testid="payouts-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl text-slate-900">Payouts</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {isAdmin
              ? "Review, approve and initiate commission payments"
              : "Track your payout history and payment status"}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportPayouts} className="rounded-xl">
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

      {/* Stats — admin */}
      {stats && isAdmin && (
        <div className="grid grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
              <Clock className="text-amber-500" size={22} />
            </div>
            <p className="font-heading text-2xl text-slate-900">{fmt(stats.total_pending)}</p>
            <p className="text-sm text-slate-500 mt-1">Pending</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
              <CheckCircle className="text-blue-500" size={22} />
            </div>
            <p className="font-heading text-2xl text-slate-900">{fmt(stats.total_approved)}</p>
            <p className="text-sm text-slate-500 mt-1">Approved (Ready to Pay)</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center mb-3">
              <Wallet className="text-green-500" size={22} />
            </div>
            <p className="font-heading text-2xl text-slate-900">{fmt(stats.total_paid)}</p>
            <p className="text-sm text-slate-500 mt-1">Total Paid Out</p>
          </div>
          {stripeAvailable && platformBalance && (
            <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-sm">
              <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
                <Zap className="text-purple-500" size={22} />
              </div>
              <p className="font-heading text-2xl text-slate-900">{fmt(platformBalance.available)}</p>
              <p className="text-sm text-slate-500 mt-1">Stripe Balance</p>
              {platformBalance.pending > 0 && (
                <p className="text-xs text-purple-500 mt-1">+{fmt(platformBalance.pending)} pending</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ADMIN: Approved payouts — ready to send ── */}
      {isAdmin && approvedPayouts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Send className="text-blue-600" size={18} />
            <h2 className="font-heading text-base text-blue-900">
              {approvedPayouts.length} Payout{approvedPayouts.length !== 1 ? "s" : ""} Ready to Send
            </h2>
          </div>
          <p className="text-xs text-blue-700 -mt-1">
            These payouts have been approved. Click "Initiate Payment" to send funds to the recipient.
          </p>
          {approvedPayouts.map((payout) => (
            <div
              key={payout.payout_id}
              className="bg-white rounded-xl border border-blue-100 p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                  {payout.user_name?.charAt(0) || "?"}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{payout.user_name}</p>
                  <p className="text-xs text-slate-500">{payout.user_email}</p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="font-heading text-lg text-slate-900">{fmt(payout.total_amount)}</p>
                <p className="text-xs text-slate-400">
                  {payout.commission_count} commission{payout.commission_count !== 1 ? "s" : ""}
                </p>
              </div>
              <Button
                onClick={() => setPaymentTarget(payout)}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                size="sm"
              >
                <Send size={14} className="mr-1.5" />
                Initiate Payment
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl min-w-[140px]">
                <Filter size={16} className="mr-2" />
                {statusFilter ? statusConfig[statusFilter]?.label : "All Status"}
                <ChevronDown size={16} className="ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-xl">
              <DropdownMenuItem onClick={() => setStatusFilter("")}>
                All Status
              </DropdownMenuItem>
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <DropdownMenuItem key={key} onClick={() => setStatusFilter(key)}>
                  {cfg.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" onClick={fetchData} className="rounded-xl text-slate-400">
            <RefreshCw size={15} />
          </Button>
        </div>
      </div>

      {/* Payout cards */}
      <div className="space-y-3">
        {payouts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <Wallet className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="font-heading text-lg text-slate-900 mb-2">No Payouts Found</h3>
            <p className="text-slate-500 text-sm">
              {isAdmin
                ? "Create payouts once commissions are in the 'payable' state"
                : "Your payouts will appear here once they've been processed"}
            </p>
          </div>
        ) : (
          [...approvedPayouts, ...otherPayouts].map((payout) => {
            const status = statusConfig[payout.status] || statusConfig.pending;
            const StatusIcon = status.icon;

            return (
              <div
                key={payout.payout_id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        status.color
                          .replace("text-", "bg-")
                          .replace("700", "50")
                          .replace("500", "50")
                      }`}
                    >
                      <StatusIcon className={status.color.split(" ")[1]} size={22} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-heading text-lg text-slate-900">
                          {fmt(payout.total_amount)}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-xs font-medium ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                        <User size={13} />
                        <span>{payout.user_name}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-400 text-xs truncate">{payout.user_email}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {fmtDate(payout.created_at)}
                        </span>
                        <span>
                          {payout.commission_count} commission{payout.commission_count !== 1 ? "s" : ""}
                        </span>
                        {payout.payment_reference && (
                          <span className="flex items-center gap-1 text-slate-500 font-medium">
                            <CreditCard size={11} />
                            {payout.payment_reference}
                          </span>
                        )}
                        {payout.paid_at && (
                          <span className="text-green-600 font-medium">
                            Paid {fmtDate(payout.paid_at)}
                          </span>
                        )}
                      </div>

                      {/* Rep view: show timeline */}
                      {!isAdmin && <PayoutTimeline status={payout.status} />}
                    </div>
                  </div>

                  {/* Admin actions */}
                  {isAdmin && (
                    <div className="flex flex-col gap-2 shrink-0">
                      {payout.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => approvePayout(payout.payout_id)}
                        >
                          <CheckCircle size={14} className="mr-1.5" />
                          Approve
                        </Button>
                      )}
                      {payout.status === "approved" && (
                        <Button
                          size="sm"
                          className="rounded-xl bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => setPaymentTarget(payout)}
                        >
                          <Send size={14} className="mr-1.5" />
                          Pay Now
                        </Button>
                      )}
                      {payout.status === "paid" && (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <CheckCircle size={13} /> Completed
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreatePayoutModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchData();
          }}
        />
      )}

      {paymentTarget && (
        <InitiatePaymentModal
          payout={paymentTarget}
          onClose={() => setPaymentTarget(null)}
          onDone={() => {
            setPaymentTarget(null);
            fetchData();
          }}
          stripeAvailable={stripeAvailable}
        />
      )}
    </div>
  );
};

// ─── Create Payout Modal ──────────────────────────────────────────────────────
const CreatePayoutModal = ({ onClose, onCreated }) => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [payableCommissions, setPayableCommissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data.filter((u) => ["rep", "sales_user", "manager"].includes(u.role)));
      } catch {
        toast.error("Failed to load users");
      } finally {
        setFetchingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchCommissions = async () => {
      if (!selectedUserId) {
        setPayableCommissions([]);
        return;
      }
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${API}/commissions?rep_id=${selectedUserId}&status=payable`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPayableCommissions(res.data);
      } catch {
        setPayableCommissions([]);
      }
    };
    fetchCommissions();
  }, [selectedUserId]);

  const totalAmount = payableCommissions.reduce(
    (s, c) => s + parseFloat(c.commission_amount_gbp || 0),
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId || totalAmount <= 0) {
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
      toast.success("Payout batch created — approve it to proceed");
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create payout");
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = users.find((u) => u.user_id === selectedUserId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-heading text-xl text-slate-900">Create Payout Batch</h2>
          <p className="text-sm text-slate-500 mt-1">
            Bundle payable commissions into a payout for a rep or manager
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select Recipient
            </label>
            {fetchingUsers ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="animate-spin" size={16} /> Loading users...
              </div>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-slate-900/10"
                required
              >
                <option value="">Choose a user...</option>
                {users.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.name} ({u.role}) — {u.email}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedUserId && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Payable Commissions</span>
                <span className="font-heading text-xl text-slate-900">{fmt(totalAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Records</span>
                <span>{payableCommissions.length} commission{payableCommissions.length !== 1 ? "s" : ""}</span>
              </div>
              {selectedUser?.bank_details ? (
                <div className="flex items-center gap-2 text-xs text-green-600 pt-1">
                  <CheckCircle size={12} />
                  Bank details on file
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-amber-600 pt-1">
                  <AlertCircle size={12} />
                  No bank details on file — ensure payment info is available
                </div>
              )}
            </div>
          )}

          {/* Workflow explanation */}
          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 space-y-1">
            <p className="font-medium">Payout workflow:</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
              Create batch (this step)
              <ArrowRight size={10} />
              Approve
              <ArrowRight size={10} />
              Initiate Payment
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 rounded-xl"
              disabled={loading || totalAmount <= 0}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                "Create Payout Batch"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PayoutsDashboard;
