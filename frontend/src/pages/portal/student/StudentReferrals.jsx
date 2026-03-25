import { useState, useEffect } from "react";
import { 
  Gift, 
  Copy, 
  Check, 
  Users, 
  DollarSign, 
  Clock, 
  Lock,
  Share2,
  CheckCircle,
  Loader2,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";

const StudentReferrals = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [referralCode, setReferralCode] = useState(null);
  const [shareLink, setShareLink] = useState('');
  const [stats, setStats] = useState({
    total_referrals: 0,
    pending_referrals: 0,
    enrolled_referrals: 0,
    total_earned: 0,
    pending_earnings: 0,
    payable_earnings: 0,
    payable_count: 0,
    referrals: []
  });
  const [copied, setCopied] = useState(false);
  const [studentStatus, setStudentStatus] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [existingPayout, setExistingPayout] = useState(null);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Get referral code
      const codeResponse = await axios.get(`${API}/referrals/my-code`, { headers }).catch(err => {
        if (err.response?.status === 403) {
          setEligible(false);
          setStudentStatus(err.response?.data?.status);
          return { data: { eligible: false } };
        }
        throw err;
      });

      if (codeResponse.data.eligible) {
        setEligible(true);
        setReferralCode(codeResponse.data.referral_code);
        setShareLink(codeResponse.data.share_link);

        // Get stats
        const statsResponse = await axios.get(`${API}/referrals/my-stats`, { headers });
        setStats(statsResponse.data);

        // Check for existing payout request
        if (statsResponse.data.existing_payout) {
          setExistingPayout(statsResponse.data.existing_payout);
        }
      }
    } catch (error) {
      console.error("Error fetching referral data:", error);
      toast.error("Failed to load referral information");
    } finally {
      setLoading(false);
    }
  };

  const handleClaimBonus = async () => {
    setClaiming(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API}/referrals/claim-bonus`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Bonus claim submitted! Admin will review and process your payout.");
      setExistingPayout(response.data.payout);
      
      // Refresh stats
      fetchReferralData();
    } catch (error) {
      const message = error.response?.data?.error || "Failed to claim bonus";
      toast.error(message);
    } finally {
      setClaiming(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast.success("Referral code copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy code");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success("Share link copied!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Plan4Growth Academy',
          text: `Use my referral code ${referralCode} to register for the Level 7 Diploma in Dental Implantology!`,
          url: shareLink
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: "Registered", color: "bg-blue-100 text-blue-700" },
      registered: { label: "Registered", color: "bg-blue-100 text-blue-700" },
      payment_pending: { label: "Payment Pending", color: "bg-amber-100 text-amber-700" },
      paid: { label: "Enrolled", color: "bg-green-100 text-green-700" },
      commission_created: { label: "Bonus Processing", color: "bg-purple-100 text-purple-700" },
      commission_paid: { label: "Bonus Paid", color: "bg-emerald-100 text-emerald-700" },
      invalid: { label: "Invalid", color: "bg-red-100 text-red-700" },
      expired: { label: "Expired", color: "bg-slate-100 text-slate-700" }
    };
    return badges[status] || badges.pending;
  };

  const getCommissionStatusBadge = (status) => {
    if (!status) return null;
    const badges = {
      pending_validation: { label: "In Hold Period", color: "bg-amber-100 text-amber-700" },
      pending_approval: { label: "Awaiting Approval", color: "bg-blue-100 text-blue-700" },
      approved: { label: "Approved", color: "bg-green-100 text-green-700" },
      payable: { label: "Ready for Payout", color: "bg-purple-100 text-purple-700" },
      paid: { label: "Paid", color: "bg-emerald-100 text-emerald-700" },
      cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" }
    };
    return badges[status] || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="referrals-loading">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  // Locked State - Not yet enrolled
  if (!eligible) {
    return (
      <div className="space-y-6" data-testid="referrals-locked">
        <h1 className="font-heading text-3xl text-slate-900">Refer a Friend</h1>
        
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="text-slate-400" size={36} />
          </div>
          
          <h2 className="font-heading text-2xl text-slate-900 mb-3">
            Unlock Referral Rewards
          </h2>
          
          <p className="text-slate-600 max-w-md mx-auto mb-6">
            Complete your enrollment and payment to unlock our referral program. 
            Earn <span className="font-bold text-amber-600">£50</span> for every friend who enrolls using your unique code!
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-sm mx-auto">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />
              <div className="text-left">
                <p className="text-amber-800 text-sm font-medium">
                  {studentStatus === 'approved' || studentStatus === 'payment_pending' 
                    ? 'Complete your payment to unlock referrals'
                    : 'Complete your enrollment first'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="font-medium text-slate-900 mb-4">How it works</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-amber-600 font-bold">1</span>
                </div>
                <p className="text-slate-700">Get your unique referral code after enrollment</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-amber-600 font-bold">2</span>
                </div>
                <p className="text-slate-700">Share with colleagues interested in implantology</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-amber-600 font-bold">3</span>
                </div>
                <p className="text-slate-700">Earn £50 when they complete enrollment</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Unlocked State - Enrolled student
  return (
    <div className="space-y-6" data-testid="referrals-unlocked">
      <h1 className="font-heading text-3xl text-slate-900">Refer a Friend</h1>

      {/* Referral Code Card */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Gift size={24} />
              <span className="font-medium">Your Referral Code</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl md:text-4xl font-mono font-bold tracking-wider">
                {referralCode}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCode}
                className="text-white hover:bg-white/20"
                data-testid="copy-code-btn"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </Button>
            </div>
            <p className="text-amber-100 text-sm mt-2">
              Share this code with colleagues and earn £50 for each enrollment!
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              data-testid="copy-link-btn"
            >
              <ExternalLink size={18} className="mr-2" />
              Copy Link
            </Button>
            <Button
              onClick={handleShare}
              className="bg-white text-amber-600 hover:bg-amber-50"
              data-testid="share-btn"
            >
              <Share2 size={18} className="mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="text-blue-600" size={20} />
            </div>
            <span className="text-slate-500 text-sm">Total Referrals</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.total_referrals}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="text-amber-600" size={20} />
            </div>
            <span className="text-slate-500 text-sm">Pending</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.pending_referrals}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <span className="text-slate-500 text-sm">Enrolled</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.enrolled_referrals}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-purple-600" size={20} />
            </div>
            <span className="text-slate-500 text-sm">Total Earned</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">£{stats.total_earned.toFixed(2)}</p>
        </div>
      </div>

      {/* Pending Earnings Banner */}
      {stats.pending_earnings > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Clock className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="font-medium text-purple-900">
                  £{stats.pending_earnings.toFixed(2)} in pending bonuses
                </p>
                <p className="text-purple-700 text-sm">
                  Bonuses are held for 14 days after enrollment, then paid via your preferred method.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payable Earnings - Ready to Claim */}
      {stats.payable_earnings > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="text-green-600" size={20} />
              </div>
              <div>
                <p className="font-medium text-green-900">
                  £{stats.payable_earnings.toFixed(2)} ready to claim!
                </p>
                <p className="text-green-700 text-sm">
                  {stats.payable_count || 0} referral bonus{stats.payable_count !== 1 ? 'es' : ''} available for payout
                </p>
              </div>
            </div>
            <Button
              onClick={handleClaimBonus}
              disabled={claiming}
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
              data-testid="claim-bonus-btn"
            >
              {claiming ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Claiming...</>
              ) : (
                <><Gift size={18} className="mr-2" /> Claim Bonus</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Existing Payout Request */}
      {existingPayout && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Clock className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="font-medium text-blue-900">
                Payout request submitted for £{parseFloat(existingPayout.total_amount).toFixed(2)}
              </p>
              <p className="text-blue-700 text-sm">
                Status: {existingPayout.status === 'pending' ? 'Awaiting admin review' : 
                        existingPayout.status === 'approved' ? 'Approved - Payment processing' : 
                        existingPayout.status}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Referrals Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h2 className="font-heading text-xl text-slate-900">Your Referrals</h2>
        </div>

        {stats.referrals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Referred</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Bonus</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Bonus Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {stats.referrals.map((referral) => {
                  const statusBadge = getStatusBadge(referral.status);
                  const commissionBadge = getCommissionStatusBadge(referral.commission_status);
                  
                  return (
                    <tr key={referral.referral_id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-medium text-slate-900">
                            {referral.referred_name || 'Pending'}
                          </p>
                          <p className="text-sm text-slate-500">
                            {referral.referred_email ? 
                              referral.referred_email.replace(/(.{2}).*@/, '$1***@') : 
                              'Awaiting registration'}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-medium text-slate-900">
                          £{referral.bonus_amount?.toFixed(2) || '50.00'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {commissionBadge ? (
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${commissionBadge.color}`}>
                            {commissionBadge.label}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {new Date(referral.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Users className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 mb-2">No referrals yet</p>
            <p className="text-slate-400 text-sm">
              Share your code with colleagues to start earning rewards!
            </p>
          </div>
        )}
      </div>

      {/* How It Works Section */}
      <div className="bg-slate-50 rounded-xl p-6">
        <h3 className="font-heading text-lg text-slate-900 mb-4">How Referrals Work</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">1</span>
            </div>
            <div>
              <p className="font-medium text-slate-900 text-sm">Share Your Code</p>
              <p className="text-slate-500 text-xs">Send your unique code to colleagues</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">2</span>
            </div>
            <div>
              <p className="font-medium text-slate-900 text-sm">They Register</p>
              <p className="text-slate-500 text-xs">Using your code at registration</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">3</span>
            </div>
            <div>
              <p className="font-medium text-slate-900 text-sm">They Enroll</p>
              <p className="text-slate-500 text-xs">Complete payment for the course</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">4</span>
            </div>
            <div>
              <p className="font-medium text-slate-900 text-sm">You Earn £50</p>
              <p className="text-slate-500 text-xs">After 14-day hold period</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentReferrals;
