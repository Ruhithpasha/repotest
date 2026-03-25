import { useState, useEffect } from "react";
import { Link, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Target,
  BookOpen,
  DollarSign,
  TrendingUp,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Kanban,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { getRoleLabel, getRoleColor } from "../../../utils/roleUtils";

// Import CRM modules
import { LeadsDashboard, TeamsDashboard, ProgramsDashboard, CommissionsDashboard, PayoutsDashboard, KanbanBoard } from "./index";

// Import Manager Portal
import ManagerPortal from "./ManagerPortal";

// CRM Overview Dashboard
// CRM Overview Dashboard
const CRMOverview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [commissionSummary, setCommissionSummary] = useState(null);
  const [recentCommissions, setRecentCommissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = ["super_admin", "admin"].includes(user?.role);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const requests = [axios.get(`${API}/leads/stats`, { headers })];
        if (!isAdmin) {
          requests.push(axios.get(`${API}/commissions`, { headers }));
        }

        const results = await Promise.all(requests);
        setStats(results[0].data);

        if (!isAdmin && results[1]) {
          const comms = results[1].data || [];
          setRecentCommissions(comms.slice(0, 5));
          const summary = {
            pending_validation: comms.filter(c => c.status === "pending_validation"),
            pending_approval: comms.filter(c => c.status === "pending_approval"),
            approved: comms.filter(c => c.status === "approved"),
            payable: comms.filter(c => c.status === "payable"),
            paid: comms.filter(c => c.status === "paid"),
          };
          const totalPaid = summary.paid.reduce((s, c) => s + parseFloat(c.commission_amount_gbp || 0), 0);
          const totalPending = [
            ...summary.pending_validation,
            ...summary.pending_approval,
            ...summary.approved,
            ...summary.payable
          ].reduce((s, c) => s + parseFloat(c.commission_amount_gbp || 0), 0);
          setCommissionSummary({ ...summary, totalPaid, totalPending });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const fmt = (n) => `£${parseFloat(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;

  const commissionStatusConfig = {
    pending_validation: { label: "Under Review", color: "bg-amber-100 text-amber-700", dot: "bg-amber-400", desc: "Commission being validated" },
    pending_approval:   { label: "Awaiting Approval", color: "bg-blue-100 text-blue-700", dot: "bg-blue-400", desc: "Waiting for admin approval" },
    approved:           { label: "Approved", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400", desc: "Commission approved" },
    payable:            { label: "Payout Queued", color: "bg-green-100 text-green-700", dot: "bg-green-500", desc: "Ready — payout in progress" },
    paid:               { label: "Paid", color: "bg-slate-100 text-slate-600", dot: "bg-slate-400", desc: "Payment received" },
    cancelled:          { label: "Cancelled", color: "bg-red-100 text-red-600", dot: "bg-red-400", desc: "Commission cancelled" },
  };

  const quickLinks = [
    { name: "Pipeline", path: "/portal/crm/pipeline", icon: Kanban, color: "bg-indigo-500", count: "-" },
    { name: "Leads", path: "/portal/crm/leads", icon: Target, color: "bg-blue-500", count: stats?.conversion?.total || 0 },
    { name: "Commissions", path: "/portal/crm/commissions", icon: DollarSign, color: "bg-amber-500", count: "-" }
  ];

  return (
    <div className="space-y-6" data-testid="crm-overview">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <h1 className="font-heading text-2xl sm:text-3xl mb-2">
          Welcome back, {user?.name}
        </h1>
        <p className="text-slate-300 text-sm">
          {user?.role === 'manager' ? 'Manage your sales team and track performance' :
           user?.role === 'sales_user' ? 'Track your leads and conversions' :
           'Full access to sales management system'}
        </p>
      </div>

      {/* Lead Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <Target className="text-blue-600" size={20} />
            </div>
            <p className="font-heading text-2xl text-slate-900">{stats.conversion?.total || 0}</p>
            <p className="text-sm text-slate-500">Total Leads</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3">
              <TrendingUp className="text-amber-600" size={20} />
            </div>
            <p className="font-heading text-2xl text-slate-900">{stats.by_status?.interested || 0}</p>
            <p className="text-sm text-slate-500">Interested</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
              <UserCheck className="text-green-600" size={20} />
            </div>
            <p className="font-heading text-2xl text-slate-900">{stats.conversion?.converted || 0}</p>
            <p className="text-sm text-slate-500">Conversions</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
              <DollarSign className="text-purple-600" size={20} />
            </div>
            <p className="font-heading text-2xl text-slate-900">{stats.conversion?.rate || 0}%</p>
            <p className="text-sm text-slate-500">Conv. Rate</p>
          </div>
        </div>
      )}

      {/* Commission Summary — reps/sales_users only */}
      {!isAdmin && commissionSummary && (
        <div className="space-y-4">
          <h2 className="font-heading text-lg text-slate-900">My Commissions</h2>

          {/* Earnings cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500 mb-1">Total Earned</p>
              <p className="font-heading text-2xl text-emerald-600">{fmt(commissionSummary.totalPaid)}</p>
              <p className="text-xs text-slate-400 mt-1">{commissionSummary.paid.length} paid out</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500 mb-1">Pending</p>
              <p className="font-heading text-2xl text-amber-600">{fmt(commissionSummary.totalPending)}</p>
              <p className="text-xs text-slate-400 mt-1">
                {commissionSummary.pending_validation.length + commissionSummary.pending_approval.length + commissionSummary.approved.length + commissionSummary.payable.length} in pipeline
              </p>
            </div>
          </div>

          {/* Status pipeline */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-sm font-medium text-slate-700 mb-4">Commission Pipeline</p>
            <div className="space-y-3">
              {[
                { key: "pending_validation", items: commissionSummary.pending_validation },
                { key: "pending_approval",   items: commissionSummary.pending_approval },
                { key: "approved",           items: commissionSummary.approved },
                { key: "payable",            items: commissionSummary.payable },
                { key: "paid",               items: commissionSummary.paid },
              ].map(({ key, items }) => {
                const cfg = commissionStatusConfig[key];
                const total = items.reduce((s, c) => s + parseFloat(c.commission_amount_gbp || 0), 0);
                return (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <div>
                        <span className="text-sm font-medium text-slate-800">{cfg.label}</span>
                        <p className="text-xs text-slate-400">{cfg.desc}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{fmt(total)}</p>
                      <p className="text-xs text-slate-400">{items.length} record{items.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent commission activity */}
          {recentCommissions.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-sm font-medium text-slate-700 mb-4">Recent Commission Activity</p>
              <div className="space-y-3">
                {recentCommissions.map((c) => {
                  const cfg = commissionStatusConfig[c.status] || commissionStatusConfig.pending_validation;
                  return (
                    <div key={c.commission_id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <div>
                          <p className="text-sm text-slate-900">{fmt(c.commission_amount_gbp)}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            {c.student_name ? ` • ${c.student_name}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Link to="/portal/crm/commissions" className="block mt-3 text-xs text-slate-500 hover:text-slate-900 text-center">
                View all commissions →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Quick Links */}
      <div>
        <h2 className="font-heading text-lg text-slate-900 mb-4">Quick Access</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${link.color} rounded-xl flex items-center justify-center`}>
                    <link.icon className="text-white" size={24} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{link.name}</p>
                    <p className="text-sm text-slate-500">
                      {link.count !== "-" ? `${link.count} total` : "Manage"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="text-slate-400 group-hover:text-slate-600 transition-colors" size={20} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

// Student Management for Sales Users (Educational Reps)
const StudentManagement = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem("token");
        // Get students registered by this rep/sales user
        const res = await axios.get(`${API}/rep/students`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStudents(res.data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const statusColors = {
    registered: "bg-amber-100 text-amber-700",
    documents_pending: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
    enrolled: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700"
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="student-management">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl text-slate-900">My Students</h1>
          <p className="text-slate-500 mt-1 text-sm">Students you've registered</p>
        </div>
        <Button
          onClick={() => navigate("/portal/rep/register")}
          className="bg-slate-900 hover:bg-slate-800 rounded-xl"
        >
          <UserPlus size={18} className="mr-2" />
          Register Student
        </Button>
      </div>

      <div className="grid gap-4">
        {students.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="font-heading text-lg text-slate-900 mb-2">No Students Yet</h3>
            <p className="text-slate-500 text-sm mb-4">Register your first student to get started</p>
            <Button onClick={() => navigate("/portal/rep/register")} className="rounded-xl">
              <UserPlus size={18} className="mr-2" />
              Register Student
            </Button>
          </div>
        ) : (
          students.map((student) => (
            <div
              key={student.student_id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                    <Users className="text-slate-500" size={24} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{student.user?.name || student.name}</p>
                    <p className="text-sm text-slate-500">{student.user?.email || student.email}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-lg text-xs font-medium ${statusColors[student.status] || statusColors.registered}`}>
                  {student.status?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Main CRM Portal Layout
const CRMPortal = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Render Manager Portal for manager role
  if (user?.role === 'manager') {
    return <ManagerPortal />;
  }

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    { name: "Overview", path: "/portal/crm", icon: LayoutDashboard },
    { name: "Pipeline", path: "/portal/crm/pipeline", icon: Kanban },
    { name: "Leads", path: "/portal/crm/leads", icon: Target },
    { name: "My Reps", path: "/portal/crm/teams", icon: Users, roles: ["super_admin", "admin", "manager"] },
    { name: "Students", path: "/portal/crm/students", icon: UserPlus, roles: ["sales_user", "rep"] },
    { name: "Programs", path: "/portal/crm/programs", icon: BookOpen, roles: ["super_admin", "admin"] },
    { name: "Commissions", path: "/portal/crm/commissions", icon: DollarSign },
    { name: "Payouts", path: "/portal/crm/payouts", icon: TrendingUp, roles: ["super_admin", "admin"] }
  ];

  const filteredNavItems = navItems.filter(item => 
    !item.roles || item.roles.includes(user?.role)
  );

  const isActive = (path) => {
    if (path === "/portal/crm") return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-40 px-4 h-16 flex items-center justify-between">
        <span className="font-heading text-lg text-slate-900">Sales CRM</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out z-30 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 px-6 flex items-center border-b border-slate-100">
            <span className="font-heading text-xl text-slate-900">Sales CRM</span>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {filteredNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <item.icon size={20} />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getRoleColor(user?.role).badge}`}>
                <span className="text-white font-bold">{user?.name?.charAt(0) || '?'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500">{getRoleLabel(user?.role)}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
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
            <Route index element={<CRMOverview />} />
            <Route path="pipeline" element={<KanbanBoard />} />
            <Route path="leads" element={<LeadsDashboard />} />
            <Route path="teams" element={<TeamsDashboard />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="programs" element={<ProgramsDashboard />} />
            <Route path="commissions" element={<CommissionsDashboard />} />
            <Route path="payouts" element={<PayoutsDashboard />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default CRMPortal;
