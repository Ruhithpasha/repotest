import React, { useState, useEffect, useCallback } from "react";
import { Link, Routes, Route, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  BarChart3,
  LogOut,
  Menu,
  X,
  Target,
  GraduationCap,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  KanbanSquare,
  DollarSign,
  UserPlus,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Upload,
  Send,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useParams } from "react-router-dom"; // add useParams if not already imported
import { getRoleLabel, getRoleColor } from "../../../utils/roleUtils";
import { Button } from "@/components/ui/button";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ==========================================
// SHARED COMPONENTS
// ==========================================

const StatCard = ({ title, value, icon: Icon, iconBg, trend }) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200">
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
        <Icon size={20} />
      </div>
    </div>
    <p className="font-heading text-2xl text-slate-900">{value}</p>
    <div className="flex items-center gap-2">
      <p className="text-sm text-slate-500">{title}</p>
      {trend !== undefined && (
        <span className={`flex items-center text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const config = {
    new: { label: 'New', bg: 'bg-blue-100 text-blue-700' },
    contacted: { label: 'Contacted', bg: 'bg-indigo-100 text-indigo-700' },
    interested: { label: 'Interested', bg: 'bg-purple-100 text-purple-700' },
    application_started: { label: 'Application', bg: 'bg-amber-100 text-amber-700' },
    enrolled: { label: 'Enrolled', bg: 'bg-green-100 text-green-700' },
    paid_in_full: { label: 'Paid', bg: 'bg-emerald-100 text-emerald-700' },
    pending_validation: { label: 'Validating', bg: 'bg-gray-100 text-gray-700' },
    pending_approval: { label: 'Pending Approval', bg: 'bg-amber-100 text-amber-700' },
    approved: { label: 'Approved', bg: 'bg-green-100 text-green-700' },
    payable: { label: 'Payable', bg: 'bg-teal-100 text-teal-700' },
    paid: { label: 'Paid', bg: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: 'Cancelled', bg: 'bg-red-100 text-red-700' }
  };
  const { label, bg } = config[status] || { label: status, bg: 'bg-gray-100 text-gray-700' };
  return <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${bg}`}>{label}</span>;
};

// ==========================================
// PAGE 1: MANAGER DASHBOARD
// ==========================================

const ManagerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [topReps, setTopReps] = useState([]);
  const [commissionSummary, setCommissionSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        
        const [statsRes, topRepsRes, summaryRes] = await Promise.all([
          axios.get(`${API}/manager/stats`, { headers }),
          axios.get(`${API}/manager/top-reps`, { headers }),
          axios.get(`${API}/manager/commission-summary`, { headers })
        ]);

        setStats(statsRes.data);
        setTopReps(topRepsRes.data);
        setCommissionSummary(summaryRes.data);
      } catch (error) {
        console.error("Error fetching manager data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRequestPayout = async () => {
    try {
      const token = localStorage.getItem("token");
      const payableRes = await axios.get(`${API}/manager/payable-commissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (payableRes.data.length === 0) {
        toast.error("No payable commissions available");
        return;
      }

      const commissionIds = payableRes.data.map(c => c.commission_id);
      await axios.post(`${API}/payouts/request`, { commissionIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Payout request submitted. Awaiting admin approval.");
      // Refresh data
      window.location.reload();
    } catch (error) {
      toast.error("Failed to request payout");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="manager-dashboard">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <h1 className="font-heading text-2xl sm:text-3xl mb-2">
          Welcome back, {user?.name}
        </h1>
        <p className="text-slate-300 text-sm">Manage your sales team and track performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard 
          title="Total Team Leads" 
          value={stats?.totalTeamLeads || 0}
          icon={Target}
          iconBg="bg-blue-100 text-blue-600"
        />
        <StatCard 
          title="Enrolled This Month" 
          value={stats?.enrolledThisMonth || 0}
          icon={GraduationCap}
          iconBg="bg-green-100 text-green-600"
        />
        <StatCard 
          title="My Commission Earned" 
          value={`£${stats?.myCommissionEarned || '0.00'}`}
          icon={TrendingUp}
          iconBg="bg-indigo-100 text-indigo-600"
        />
        <StatCard 
          title="Active Reps" 
          value={stats?.activeRepsCount || 0}
          icon={Users}
          iconBg="bg-purple-100 text-purple-600"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Top Reps */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg text-slate-900">Top Reps</h2>
            <Link to="/portal/crm/team" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View Full Team <ChevronRight size={16} />
            </Link>
          </div>
          
          {topReps.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No reps assigned yet</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 text-xs font-heading text-slate-500 uppercase">Rep Name</th>
                  <th className="text-right py-2 text-xs font-heading text-slate-500 uppercase">Enrollments</th>
                  <th className="text-right py-2 text-xs font-heading text-slate-500 uppercase">Commission £</th>
                </tr>
              </thead>
              <tbody>
                {topReps.map((rep, i) => (
                  <tr key={rep.repId} className="border-b border-slate-50">
                    <td className="py-3 text-sm text-slate-900">{rep.name}</td>
                    <td className="py-3 text-sm text-slate-600 text-right">{rep.enrollments}</td>
                    <td className="py-3 text-sm font-heading text-slate-900 text-right">£{rep.commissionEarned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right: Commission Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-heading text-lg text-slate-900 mb-4">My Commission Summary</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-sm text-slate-600">Pending Validation</span>
              <span className="font-heading text-slate-900">£{commissionSummary?.pendingValidation || '0.00'}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-sm text-slate-600">Pending Approval</span>
              <span className="font-heading text-slate-900">£{commissionSummary?.pendingApproval || '0.00'}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-sm text-slate-600">Approved & Payable</span>
              <span className="font-heading text-green-600">£{parseFloat(commissionSummary?.approved || 0) + parseFloat(commissionSummary?.payable || 0)}</span>
            </div>
          </div>

          {parseFloat(commissionSummary?.payable || 0) > 0 && (
            <Button 
              onClick={handleRequestPayout}
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-heading"
            >
              Request Payout
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// PAGE 2: LEAD PIPELINE (Manager View)
// ==========================================

const ManagerPipeline = () => {
  const [leads, setLeads] = useState([]);
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRep, setSelectedRep] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const stages = [
    { id: 'new', label: 'New Leads', color: 'bg-blue-500' },
    { id: 'contacted', label: 'Contacted', color: 'bg-indigo-500' },
    { id: 'interested', label: 'Interested', color: 'bg-purple-500' },
    { id: 'application_started', label: 'Application', color: 'bg-amber-500' },
    { id: 'enrolled', label: 'Enrolled', color: 'bg-green-500' },
    { id: 'paid_in_full', label: 'Paid in Full', color: 'bg-emerald-500' }
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [leadsRes, repsRes] = await Promise.all([
        axios.get(`${API}/manager/pipeline`, { 
          headers,
          params: { repId: selectedRep, search: searchTerm }
        }),
        axios.get(`${API}/manager/reps`, { headers })
      ]);

      setLeads(leadsRes.data);
      setReps(repsRes.data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  }, [selectedRep, searchTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssignLead = async (leadId, repId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API}/leads/${leadId}/assign`, { repId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Lead assigned successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to assign lead");
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API}/leads/${leadId}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const getLeadsByStatus = (status) => leads.filter(l => l.status === status);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="manager-pipeline">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-slate-900">Lead Pipeline</h1>
          <p className="text-slate-500 text-sm mt-1">Team lead tracking and management</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
          />
        </div>
        <select
          value={selectedRep}
          onChange={(e) => setSelectedRep(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="all">All Reps</option>
          {reps.map(rep => (
            <option key={rep.user_id} value={rep.user_id}>{rep.name}</option>
          ))}
        </select>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <div key={stage.id} className="flex-shrink-0 w-72">
            <div className={`${stage.color} text-white px-4 py-2 rounded-t-xl flex items-center justify-between`}>
              <span className="font-heading text-sm">{stage.label}</span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{getLeadsByStatus(stage.id).length}</span>
            </div>
            <div className="bg-slate-100 rounded-b-xl p-2 min-h-[400px] space-y-2">
              {getLeadsByStatus(stage.id).map((lead) => (
                <div
                  key={lead.lead_id}
                  className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <p className="font-medium text-sm text-slate-900">{lead.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{lead.email}</p>
                  
                  {/* Rep Name Chip */}
                  {lead.assigned_user ? (
                    <p className="text-xs text-slate-400 mt-2">
                      Assigned: {lead.assigned_user.name}
                    </p>
                  ) : (
                    <div className="mt-2">
                      <select
                        onChange={(e) => e.target.value && handleAssignLead(lead.lead_id, e.target.value)}
                        className="w-full text-xs px-2 py-1 border border-slate-200 rounded-lg bg-white"
                        defaultValue=""
                      >
                        <option value="">Assign Rep...</option>
                        {reps.map(rep => (
                          <option key={rep.user_id} value={rep.user_id}>{rep.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// PAGE 3: MY TEAM
// ==========================================

const MyTeam = () => {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRep, setExpandedRep] = useState(null);
  const [repLeads, setRepLeads] = useState({});
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignFrom, setReassignFrom] = useState(null);
  const [reassignTo, setReassignTo] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/manager/team-performance`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTeam(res.data);
      } catch (error) {
        toast.error("Failed to load team data");
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, []);

  const fetchRepLeads = async (repId) => {
    if (repLeads[repId]) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/manager/rep/${repId}/leads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRepLeads(prev => ({ ...prev, [repId]: res.data }));
    } catch (error) {
      console.error("Error fetching rep leads:", error);
    }
  };

  const handleRowClick = (repId) => {
    if (expandedRep === repId) {
      setExpandedRep(null);
    } else {
      setExpandedRep(repId);
      fetchRepLeads(repId);
    }
  };

  const handleReassign = async () => {
    if (!reassignFrom || !reassignTo) return;
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API}/manager/reassign-leads`, {
        fromRepId: reassignFrom.repId,
        toRepId: reassignTo
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Leads reassigned successfully");
      setShowReassignModal(false);
      setReassignFrom(null);
      setReassignTo('');
      window.location.reload();
    } catch (error) {
      toast.error("Failed to reassign leads");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="manager-team">
      <div>
        <h1 className="font-heading text-2xl text-slate-900">My Team</h1>
        <p className="text-slate-500 text-sm mt-1">Performance overview of your assigned reps</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-6 py-4 text-xs font-heading text-slate-500 uppercase">Rank</th>
              <th className="text-left px-6 py-4 text-xs font-heading text-slate-500 uppercase">Rep Name</th>
              <th className="text-right px-6 py-4 text-xs font-heading text-slate-500 uppercase">Leads</th>
              <th className="text-right px-6 py-4 text-xs font-heading text-slate-500 uppercase">Enrolled</th>
              <th className="text-right px-6 py-4 text-xs font-heading text-slate-500 uppercase">Conversion %</th>
              <th className="text-right px-6 py-4 text-xs font-heading text-slate-500 uppercase">Commission £</th>
              <th className="text-right px-6 py-4 text-xs font-heading text-slate-500 uppercase">Trend</th>
              <th className="text-right px-6 py-4 text-xs font-heading text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {team.map((rep, index) => (
              <React.Fragment key={rep.repId}>
                <tr 
                  className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                  onClick={() => handleRowClick(rep.repId)}
                >
                  <td className="px-6 py-4 text-sm font-heading text-slate-900">{index + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {expandedRep === rep.repId ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      <div>
                        <p className="text-sm font-medium text-slate-900">{rep.name}</p>
                        <p className="text-xs text-slate-400">{rep.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-right">{rep.leads}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-right">{rep.enrolled}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-right">{rep.conversionRate}%</td>
                  <td className="px-6 py-4 text-sm font-heading text-slate-900 text-right">£{rep.commissionEarned}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`flex items-center justify-end text-sm ${rep.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {rep.trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {Math.abs(rep.trend)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/portal/crm/pipeline?repId=${rep.repId}`)}
                        className="text-xs"
                      >
                        View Leads
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setReassignFrom(rep); setShowReassignModal(true); }}
                        className="text-xs"
                      >
                        Reassign
                      </Button>
                    </div>
                  </td>
                </tr>
                {expandedRep === rep.repId && (
                  <tr>
                    <td colSpan={8} className="bg-slate-50 px-6 py-4">
                      <div className="pl-8">
                        <p className="text-xs font-heading text-slate-500 uppercase mb-2">Recent Leads</p>
                        {repLeads[rep.repId]?.length > 0 ? (
                          <div className="space-y-2">
                            {repLeads[rep.repId].map(lead => (
                              <div key={lead.lead_id} className="flex items-center gap-4 text-sm">
                                <span className="text-slate-900">{lead.name}</span>
                                <StatusBadge status={lead.status} />
                                <span className="text-xs text-slate-400">
                                  {new Date(lead.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">No recent leads</p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reassign Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="font-heading text-lg text-slate-900 mb-4">Reassign Leads</h3>
            <p className="text-sm text-slate-600 mb-4">
              Move all open leads from <strong>{reassignFrom?.name}</strong> to:
            </p>
            <select
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl mb-4"
            >
              <option value="">Select rep...</option>
              {team.filter(r => r.repId !== reassignFrom?.repId).map(rep => (
                <option key={rep.repId} value={rep.repId}>{rep.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowReassignModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleReassign} disabled={!reassignTo}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// PAGE 4: COMMISSIONS (Manager View)
// ==========================================

const ManagerCommissions = () => {
  const [commissions, setCommissions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payableCommissions, setPayableCommissions] = useState([]);
  
  // Override modal state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [overrideData, setOverrideData] = useState({ requested_percentage: '', reason: '' });
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const [commissionsRes, summaryRes] = await Promise.all([
        axios.get(`${API}/manager/commissions`, { headers, params }),
        axios.get(`${API}/manager/commission-summary`, { headers })
      ]);

      setCommissions(commissionsRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      toast.error("Failed to load commissions");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, fromDate, toDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRequestPayout = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/manager/payable-commissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayableCommissions(res.data);
      setShowPayoutModal(true);
    } catch (error) {
      toast.error("Failed to load payable commissions");
    }
  };

  const submitPayoutRequest = async () => {
    try {
      const token = localStorage.getItem("token");
      const commissionIds = payableCommissions.map(c => c.commission_id);
      await axios.post(`${API}/payouts/request`, { commissionIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Payout request submitted. Awaiting admin approval.");
      setShowPayoutModal(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to submit payout request");
    }
  };

  // Override functions
  const openOverrideModal = (commission) => {
    const currentPct = ((parseFloat(commission.commission_value) || 0) * 100).toFixed(1);
    setSelectedCommission(commission);
    setOverrideData({ requested_percentage: currentPct, reason: '' });
    setShowOverrideModal(true);
  };

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
        { requested_percentage: requestedPct, reason: overrideData.reason || null },
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

  const totalPayable = parseFloat(summary?.payable || 0);
  const statusTabs = ['all', 'pending_validation', 'pending_approval', 'approved', 'paid', 'cancelled'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="manager-commissions">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-slate-900">My Commissions</h1>
          <p className="text-slate-500 text-sm mt-1">Track your earnings and request payouts</p>
        </div>
        {totalPayable > 0 && (
          <Button onClick={handleRequestPayout} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-heading">
            Request Payout — £{totalPayable.toFixed(2)}
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Pending Validation" 
          value={`£${summary?.pendingValidation || '0.00'}`}
          icon={DollarSign}
          iconBg="bg-gray-100 text-gray-600"
        />
        <StatCard 
          title="Pending Approval" 
          value={`£${summary?.pendingApproval || '0.00'}`}
          icon={DollarSign}
          iconBg="bg-amber-100 text-amber-600"
        />
        <StatCard 
          title="Approved/Payable" 
          value={`£${(parseFloat(summary?.approved || 0) + parseFloat(summary?.payable || 0)).toFixed(2)}`}
          icon={DollarSign}
          iconBg="bg-green-100 text-green-600"
        />
        <StatCard 
          title="Paid Total" 
          value={`£${summary?.paid || '0.00'}`}
          icon={DollarSign}
          iconBg="bg-blue-100 text-blue-600"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {statusTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-heading rounded-lg transition-colors ${
                statusFilter === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'all' ? 'All' : tab.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
        />
        <span className="text-slate-400">to</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
        />
      </div>

      {/* Commissions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-6 py-4 text-xs font-heading text-slate-500 uppercase">Student</th>
              <th className="text-left px-6 py-4 text-xs font-heading text-slate-500 uppercase">Enrolled By</th>
              <th className="text-right px-6 py-4 text-xs font-heading text-slate-500 uppercase">Amount</th>
              <th className="text-right px-6 py-4 text-xs font-heading text-slate-500 uppercase">Rate</th>
              <th className="text-left px-6 py-4 text-xs font-heading text-slate-500 uppercase">Status</th>
              <th className="text-left px-6 py-4 text-xs font-heading text-slate-500 uppercase">Hold Until</th>
              <th className="text-left px-6 py-4 text-xs font-heading text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {commissions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  No commissions yet. Commissions will appear here once your team's enrollments are paid in full.
                </td>
              </tr>
            ) : (
              commissions.map(comm => (
                <tr key={comm.commission_id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {comm.student?.user?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{comm.enrolledByRepName}</td>
                  <td className="px-6 py-4 text-sm font-heading text-slate-900 text-right">
                    £{parseFloat(comm.commission_amount_gbp || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 text-right">
                    {comm.commission_type === 'percentage' 
                      ? `${(parseFloat(comm.commission_value) * 100).toFixed(1)}%`
                      : `£${comm.commission_value}`
                    }
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={comm.status} /></td>
                  <td className="px-6 py-4 text-xs text-amber-600">
                    {comm.status === 'pending_validation' && comm.hold_until
                      ? new Date(comm.hold_until).toLocaleDateString()
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4">
                    {['pending_validation', 'pending_approval', 'pending'].includes(comm.status) && 
                     comm.rule_min !== null && comm.rule_max !== null ? (
                      <button
                        onClick={() => openOverrideModal(comm)}
                        className="px-3 py-1.5 text-xs font-medium text-amber-600 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
                        data-testid={`override-btn-${comm.commission_id}`}
                      >
                        Override %
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {comm.status === 'paid' && comm.paid_at ? new Date(comm.paid_at).toLocaleDateString() : '-'}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="font-heading text-lg text-slate-900 mb-2">Request Payout</h3>
            <p className="font-heading text-3xl text-indigo-600 mb-4">
              £{payableCommissions.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0).toFixed(2)}
            </p>
            <div className="max-h-48 overflow-y-auto mb-4 space-y-2">
              {payableCommissions.map(c => (
                <div key={c.commission_id} className="flex justify-between text-sm">
                  <span className="text-slate-600">{c.studentName}</span>
                  <span className="text-slate-900">£{parseFloat(c.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowPayoutModal(false)}>
                Cancel
              </Button>
              <Button onClick={submitPayoutRequest} className="bg-indigo-600 hover:bg-indigo-700">
                Confirm Request
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {showOverrideModal && selectedCommission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-sm" data-testid="override-modal">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-heading text-xl text-slate-900">Request Commission Override</h3>
              <p className="text-slate-500 text-sm mt-1">Adjust the commission percentage for this record</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Current %</p>
                    <p className="font-semibold text-slate-900">
                      {((parseFloat(selectedCommission.commission_value) || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Allowed Range</p>
                    <p className="font-semibold text-amber-600">
                      {selectedCommission.rule_min ?? 0}% – {selectedCommission.rule_max ?? 100}%
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New % *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={overrideData.requested_percentage}
                  onChange={(e) => setOverrideData({ ...overrideData, requested_percentage: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter new percentage"
                />
                <p className="text-xs text-slate-500 mt-1">If outside allowed range, request will need admin approval.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason (optional)</label>
                <textarea
                  value={overrideData.reason}
                  onChange={(e) => setOverrideData({ ...overrideData, reason: e.target.value })}
                  placeholder="Explain why you're requesting this override..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setShowOverrideModal(false); setSelectedCommission(null); }}>
                Cancel
              </Button>
              <Button
                onClick={handleOverrideSubmit}
                disabled={submittingOverride}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {submittingOverride ? 'Submitting...' : 'Submit Override'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// PAGE 5: REPORTS (Manager View)
// ==========================================

const ManagerReports = () => {
  const [activeTab, setActiveTab] = useState('lead-funnel');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('week');

  const tabs = [
    { id: 'lead-funnel', label: 'Lead Funnel' },
    { id: 'enrollments', label: 'Enrollments' },
    { id: 'commissions', label: 'Commissions' }
  ];

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const params = { ...dateRange };
        if (activeTab === 'enrollments') params.groupBy = groupBy;
        
        const res = await axios.get(`${API}/manager/reports/${activeTab}`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        });
        setReportData(res.data);
      } catch (error) {
        toast.error("Failed to load report");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [activeTab, dateRange, groupBy]);

  const handleExport = () => {
    // CSV export logic
    let csv = '';
    if (reportData?.tableData) {
      const headers = Object.keys(reportData.tableData[0] || {}).join(',');
      const rows = reportData.tableData.map(row => Object.values(row).join(','));
      csv = [headers, ...rows].join('\n');
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_report.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="manager-reports">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-slate-900">Team Reports</h1>
          <p className="text-slate-500 text-sm mt-1">Performance metrics for your team</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-1 text-sm font-heading transition-colors border-b-2 -mb-px ${
              activeTab === tab.id 
                ? 'text-indigo-600 border-indigo-600' 
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Content */}
      {activeTab === 'lead-funnel' && reportData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Total Leads" value={reportData.summary?.totalLeads || 0} icon={Target} iconBg="bg-blue-100 text-blue-600" />
            <StatCard title="Converted to Enrolled" value={reportData.summary?.convertedToEnrolled || 0} icon={GraduationCap} iconBg="bg-green-100 text-green-600" />
            <StatCard title="Conversion Rate" value={`${reportData.summary?.conversionRate || 0}%`} icon={TrendingUp} iconBg="bg-indigo-100 text-indigo-600" />
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg text-slate-900">Funnel Breakdown</h3>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download size={14} className="mr-2" /> Export CSV
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="stage" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4F46E5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-4 text-xs font-heading text-slate-500 uppercase">Stage</th>
                  <th className="text-right px-6 py-4 text-xs font-heading text-slate-500 uppercase">Count</th>
                  <th className="text-right px-6 py-4 text-xs font-heading text-slate-500 uppercase">% of Total</th>
                  <th className="text-right px-6 py-4 text-xs font-heading text-slate-500 uppercase">Drop-off</th>
                </tr>
              </thead>
              <tbody>
                {reportData.tableData?.map(row => (
                  <tr key={row.stage} className="border-b border-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-900">{row.stage}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right">{row.count}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right">{row.percentOfTotal}%</td>
                    <td className="px-6 py-4 text-sm text-red-600 text-right">{row.dropOff}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'enrollments' && reportData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Total Enrolled" value={reportData.summary?.totalEnrolled || 0} icon={GraduationCap} iconBg="bg-green-100 text-green-600" />
            <StatCard title="This Period" value={reportData.summary?.thisPeriod || 0} icon={Target} iconBg="bg-blue-100 text-blue-600" />
            <StatCard title="Best Rep" value={reportData.summary?.bestPerformingRep || 'N/A'} icon={Users} iconBg="bg-purple-100 text-purple-600" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg text-slate-900">Enrollments Over Time</h3>
              <div className="flex items-center gap-2">
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                </select>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download size={14} className="mr-2" /> Export CSV
                </Button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} dot={{ fill: '#4F46E5' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-4 text-xs font-heading text-slate-500 uppercase">Rep Name</th>
                  <th className="text-right px-6 py-4 text-xs font-heading text-slate-500 uppercase">Enrollments</th>
                  <th className="text-right px-6 py-4 text-xs font-heading text-slate-500 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {reportData.tableData?.map((row, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-900">{row.repName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right">{row.enrollments}</td>
                    <td className="px-6 py-4 text-sm font-heading text-slate-900 text-right">£{row.revenueGenerated?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'commissions' && reportData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Total Generated" value={`£${reportData.summary?.totalGenerated?.toLocaleString() || 0}`} icon={TrendingUp} iconBg="bg-blue-100 text-blue-600" />
            <StatCard title="Total Approved" value={`£${reportData.summary?.totalApproved?.toLocaleString() || 0}`} icon={TrendingUp} iconBg="bg-amber-100 text-amber-600" />
            <StatCard title="Total Paid" value={`£${reportData.summary?.totalPaid?.toLocaleString() || 0}`} icon={TrendingUp} iconBg="bg-green-100 text-green-600" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg text-slate-900">Commission by Rep</h3>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download size={14} className="mr-2" /> Export CSV
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="repName" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="approved" name="Approved" fill="#4F46E5" />
                <Bar dataKey="paid" name="Paid" fill="#0D9488" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-4 text-xs font-heading text-slate-500 uppercase">Rep Name</th>
                  <th className="text-right px-6 py-4 text-xs font-heading text-slate-500 uppercase">Total Earned</th>
                  <th className="text-right px-6 py-4 text-xs font-heading text-slate-500 uppercase">Pending</th>
                  <th className="text-right px-6 py-4 text-xs font-heading text-slate-500 uppercase">Approved</th>
                  <th className="text-right px-6 py-4 text-xs font-heading text-slate-500 uppercase">Paid</th>
                </tr>
              </thead>
              <tbody>
                {reportData.tableData?.map((row, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-900">{row.repName}</td>
                    <td className="px-6 py-4 text-sm font-heading text-slate-900 text-right">£{row.totalEarned}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right">£{row.pending}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right">£{row.approved}</td>
                    <td className="px-6 py-4 text-sm text-green-600 text-right">£{row.paid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// MANAGER STUDENT REGISTRATION
// ==========================================

const ManagerRegisterStudent = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "", email: "", password: "", whatsapp_number: "",
    dob: "", city: "", state: "", dental_reg_number: "", experience_years: ""
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API}/manager/students`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Student registered successfully!");
      navigate(`/portal/crm/my-students/${response.data.student.student_id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/portal/crm/my-students">
          <Button variant="ghost" size="sm"><ArrowLeft size={18} /></Button>
        </Link>
        <h1 className="font-heading text-3xl text-slate-900">Register New Student</h1>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
        <p className="text-blue-700 text-sm">
          Set the student's login credentials. The account activates after admin approves all documents.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 p-8 rounded-xl space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
            <Input className="bg-white border-slate-200"
              value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Dr. John Doe" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <Input type="email" className="bg-white border-slate-200"
              value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="doctor@example.com" required />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Student Login Password *</label>
            <Input type="password" className="bg-white border-slate-200"
              value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimum 6 characters" required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp Number *</label>
            <Input className="bg-white border-slate-200"
              value={formData.whatsapp_number} onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
              placeholder="+44 7XXX XXXXXX" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
            <Input type="date" className="bg-white border-slate-200"
              value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
            <Input className="bg-white border-slate-200"
              value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="London" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">State/Region</label>
            <Input className="bg-white border-slate-200"
              value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="England" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dental Reg Number</label>
            <Input className="bg-white border-slate-200"
              value={formData.dental_reg_number} onChange={(e) => setFormData({ ...formData, dental_reg_number: e.target.value })}
              placeholder="GDC-123456" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Years of Experience</label>
            <Input type="number" className="bg-white border-slate-200"
              value={formData.experience_years} onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
              placeholder="5" />
          </div>
        </div>

        <Button type="submit"
          className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4"
          disabled={loading || !formData.name || !formData.email || !formData.password || !formData.whatsapp_number}>
          {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <UserPlus className="mr-2" size={18} />}
          Register Student
        </Button>
      </form>
    </div>
  );
};

const ManagerStudentList = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/manager/students`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStudents(res.data);
      } catch (err) {
        toast.error("Failed to load students");
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const statusColors = {
    registered: "bg-slate-100 text-slate-700",
    documents_uploaded: "bg-amber-100 text-amber-700",
    under_review: "bg-blue-100 text-blue-700",
    approved: "bg-purple-100 text-purple-700",
    payment_pending: "bg-orange-100 text-orange-700",
    enrolled: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-slate-900">My Students</h1>
        <Button onClick={() => navigate("/portal/crm/register-student")}
          className="bg-amber-500 hover:bg-amber-600 text-white">
          <UserPlus size={16} className="mr-2" /> Register Student
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <UserPlus size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No students registered yet.</p>
          <Button onClick={() => navigate("/portal/crm/register-student")}
            className="mt-4 bg-amber-500 hover:bg-amber-600 text-white">
            Register First Student
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-4 text-xs font-heading text-slate-500 uppercase">Student</th>
                <th className="text-left px-6 py-4 text-xs font-heading text-slate-500 uppercase">WhatsApp</th>
                <th className="text-left px-6 py-4 text-xs font-heading text-slate-500 uppercase">Docs</th>
                <th className="text-left px-6 py-4 text-xs font-heading text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.student_id}
                  className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate(`/portal/crm/my-students/${s.student_id}`)}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-900">{s.user?.name}</p>
                    <p className="text-xs text-slate-500">{s.user?.email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{s.whatsapp_number}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{s.documents_uploaded || 0}/5</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[s.status] || statusColors.registered}`}>
                      {s.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const ManagerStudentDetail = () => {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const fileInputRefs = {};

  const requiredDocs = [
    { type: "bds_degree", label: "BDS Degree Certificate" },
    { type: "tenth_marksheet", label: "10th Marksheet" },
    { type: "twelfth_marksheet", label: "12th Marksheet" },
    { type: "passport_photo", label: "Passport Photo" },
    { type: "id_proof", label: "ID Proof (Passport/Aadhaar)" }
  ];

  useEffect(() => { fetchStudent(); }, [studentId]);

  const fetchStudent = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/manager/students/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudent(res.data);
    } catch {
      toast.error("Failed to load student");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (docType, file) => {
    if (!file) return;
    setUploading(docType);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", docType);
      await axios.post(`${API}/manager/students/${studentId}/documents/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      toast.success("Document uploaded successfully");
      fetchStudent();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const handleSubmitForReview = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/manager/students/${studentId}/submit-review`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Application submitted for review!");
      fetchStudent();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDoc = async (documentId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/manager/students/${studentId}/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Document deleted");
      fetchStudent();
    } catch {
      toast.error("Failed to delete document");
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={32} /></div>;
  if (!student) return <div className="text-slate-500 text-center py-12">Student not found</div>;

  const docsByType = {};
  student.documents?.forEach(d => { docsByType[d.doc_type] = d; });
  const uploadedRequired = requiredDocs.filter(d => docsByType[d.type]).length;
  const canSubmit = uploadedRequired === requiredDocs.length && student.status === 'documents_uploaded';

  const statusColors = {
    registered: "bg-slate-100 text-slate-700",
    documents_uploaded: "bg-amber-100 text-amber-700",
    under_review: "bg-blue-100 text-blue-700",
    approved: "bg-purple-100 text-purple-700",
    enrolled: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/portal/crm/my-students">
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700"><ArrowLeft size={18} /></Button>
        </Link>
        <div>
          <h1 className="font-heading text-2xl text-slate-900">{student.user?.name}</h1>
          <p className="text-slate-500 text-sm">{student.user?.email}</p>
        </div>
        <span className={`ml-auto px-3 py-1 rounded-lg text-xs font-medium ${statusColors[student.status] || statusColors.registered}`}>
          {student.status?.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="font-heading text-lg text-slate-900 mb-4">Documents ({uploadedRequired}/{requiredDocs.length})</h2>
        <div className="space-y-3">
          {requiredDocs.map((doc) => {
            const uploaded = docsByType[doc.type];
            return (
              <div key={doc.type} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {uploaded ? <CheckCircle size={18} className="text-green-500" /> : <Clock size={18} className="text-slate-400" />}
                  <div>
                    <p className="text-sm font-medium text-slate-900">{doc.label}</p>
                    {uploaded && <p className="text-xs text-slate-500">{uploaded.file_name} · {uploaded.status}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {uploaded && ['registered', 'documents_uploaded'].includes(student.status) && (
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600"
                      onClick={() => handleDeleteDoc(uploaded.document_id)}>
                      <XCircle size={16} />
                    </Button>
                  )}
                  {['registered', 'documents_uploaded'].includes(student.status) && (
                    <>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                        ref={el => fileInputRefs[doc.type] = el}
                        className="hidden"
                        onChange={(e) => handleFileUpload(doc.type, e.target.files[0])} />
                      <Button size="sm" variant="outline"
                        className="border-slate-200 text-slate-600 hover:bg-slate-100"
                        disabled={uploading === doc.type}
                        onClick={() => fileInputRefs[doc.type]?.click()}>
                        {uploading === doc.type ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        <span className="ml-1">{uploaded ? 'Replace' : 'Upload'}</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {canSubmit && (
          <Button onClick={handleSubmitForReview} disabled={submitting}
            className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white">
            {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Send size={16} className="mr-2" />}
            Submit for Review
          </Button>
        )}
      </div>
    </div>
  );
};

// ==========================================
// MAIN MANAGER PORTAL LAYOUT
// ==========================================

const ManagerPortal = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    { name: "Dashboard", path: "/portal/crm", icon: LayoutDashboard },
    { name: "My Students", path: "/portal/crm/my-students", icon: GraduationCap },
    { name: "Lead Pipeline", path: "/portal/crm/pipeline", icon: KanbanSquare },
    { name: "My Team", path: "/portal/crm/team", icon: Users },
    { name: "My Commissions", path: "/portal/crm/commissions", icon: DollarSign },
    { name: "Reports", path: "/portal/crm/reports", icon: BarChart3 }
  ];

  const isActive = (path) => {
    if (path === "/portal/crm") return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-[#0F172A] z-40 px-4 h-16 flex items-center justify-between">
        <span className="font-heading text-lg text-white">Manager Portal</span>
        <Button
          variant="ghost"
          size="sm"
          className="text-white"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-[#0F172A] transform transition-transform duration-200 ease-in-out z-30 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 px-6 flex items-center border-b border-white/10">
            <span className="font-heading text-xl text-white">Manager Portal</span>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon size={20} />
                <span className="text-sm font-heading">{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getRoleColor(user?.role).badge}`}>
                <span className="text-white font-bold">{user?.name?.charAt(0) || '?'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-400">{getRoleLabel(user?.role)}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-white/20 text-white hover:bg-white/10"
              onClick={handleLogout}
            >
              <LogOut size={16} className="mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route index element={<ManagerDashboard />} />
            <Route path="my-students" element={<ManagerStudentList />} />
            <Route path="my-students/:studentId" element={<ManagerStudentDetail />} />
            <Route path="register-student" element={<ManagerRegisterStudent />} />
            <Route path="pipeline" element={<ManagerPipeline />} />
            <Route path="team" element={<MyTeam />} />
            <Route path="commissions" element={<ManagerCommissions />} />
            <Route path="reports" element={<ManagerReports />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default ManagerPortal;
