import { useState, useEffect } from "react";
import { Link, Routes, Route, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  LogOut,
  Menu,
  X,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ArrowLeft,
  Download,
  AlertCircle,
  Loader2,
  ExternalLink,
  Shield,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Settings,
  BookOpen,
  Sliders,
  UsersRound,
  ClipboardList,
  Link2,
  ShieldAlert,
  Globe
} from "lucide-react";
import { getRoleLabel, getRoleColor } from "../../../utils/roleUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";

// Import new pages
import ManagersPage from "./ManagersPage";
import CommissionRulesPage from "./CommissionRulesPage";
import FraudAlertsPage from "./FraudAlertsPage";
import AuditLogsPage from "./AuditLogsPage";
import ReportsPage from "./ReportsPage";
import PayoutsPage from "./PayoutsPage";
import CoursesPage from "./CoursesPage";
import OverrideRequestsPage from "./OverrideRequestsPage";
import TeamsPage from "./TeamsPage";
import PaymentTimelinePage from "./PaymentTimelinePage";
import CommissionReviewPage from "./CommissionReviewPage";
import PayoutBatchDetailPage from "./PayoutBatchDetailPage";
import ReferralsAnalyticsPage from "./ReferralsAnalyticsPage";
import ApplicationsReviewPage from "./ApplicationsReviewPage";
import ClawbackRulesPage from "./ClawbackRulesPage";
import WebsiteSettingsPage from "./WebsiteSettingsPage";

// Admin Dashboard Overview
const AdminOverview = () => {
  const [stats, setStats] = useState({
    total_students: 0,
    pending_review: 0,
    approved: 0,
    enrolled: 0,
    rejected: 0,
    pending_documents: 0,
    total_revenue_gbp: 0
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const [statsRes, appsRes] = await Promise.all([
          axios.get(`${API}/admin/dashboard/stats`, { headers }),
          axios.get(`${API}/admin/applications`, { headers })
        ]);

        setStats(statsRes.data);
        setRecentApplications(appsRes.data.slice(0, 5));
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    { label: "Total Students", value: stats.total_students, icon: Users, color: "bg-blue-500" },
    { label: "Pending Review", value: stats.pending_review, icon: Clock, color: "bg-amber-500" },
    { label: "Approved", value: stats.approved, icon: CheckCircle, color: "bg-purple-500" },
    { label: "Enrolled", value: stats.enrolled, icon: CheckCircle, color: "bg-green-500" },
    { label: "Pending Docs", value: stats.pending_documents, icon: FileText, color: "bg-orange-500" },
    { label: "Total Revenue", value: `£${stats.total_revenue_gbp.toLocaleString()}`, icon: CreditCard, color: "bg-emerald-500" }
  ];

  const getStatusBadge = (status) => {
    const styles = {
      registered: "bg-slate-100 text-slate-700",
      documents_uploaded: "bg-amber-100 text-amber-700",
      under_review: "bg-blue-100 text-blue-700",
      approved: "bg-purple-100 text-purple-700",
      payment_pending: "bg-orange-100 text-orange-700",
      enrolled: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700"
    };
    return styles[status] || "bg-slate-100 text-slate-700";
  };

  return (
    <div className="space-y-8" data-testid="admin-overview">
      <h1 className="font-heading text-3xl text-slate-900">Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl border border-slate-200" data-testid={`stat-${index}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon className="text-white" size={24} />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{loading ? "..." : stat.value}</p>
            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Link to="/portal/admin/applications?status=under_review" className="bg-amber-50 border border-amber-200 p-6 rounded-xl hover:bg-amber-100 transition-colors">
          <h3 className="font-heading text-lg text-slate-900 mb-1">Applications Pending Review</h3>
          <p className="text-slate-600 text-sm">Review and approve student applications.</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">{stats.pending_review}</p>
        </Link>
        <Link to="/portal/admin/documents" className="bg-blue-50 border border-blue-200 p-6 rounded-xl hover:bg-blue-100 transition-colors">
          <h3 className="font-heading text-lg text-slate-900 mb-1">Documents Pending Verification</h3>
          <p className="text-slate-600 text-sm">Verify uploaded student documents.</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.pending_documents}</p>
        </Link>
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-heading text-xl text-slate-900">Recent Applications</h2>
          <Link to="/portal/admin/applications" className="text-amber-600 text-sm font-medium hover:underline">
            View All
          </Link>
        </div>
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
          </div>
        ) : recentApplications.length > 0 ? (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Rep</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Documents</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentApplications.map((app, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{app.user?.name || "N/A"}</p>
                    <p className="text-slate-500 text-sm">{app.user?.email}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{app.rep?.name || "N/A"}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(app.status)}`}>
                      {app.status?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-green-600">{app.documents_verified || 0}</span>
                    <span className="text-slate-400">/</span>
                    <span className="text-amber-600">{app.documents_pending || 0}</span>
                    <span className="text-slate-400">/</span>
                    <span className="text-slate-500">{app.documents_total || 0}</span>
                  </td>
                  <td className="px-6 py-4">
                    <Link to={`/portal/admin/applications/${app.student_id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye size={16} />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-slate-500">No applications yet</div>
        )}
      </div>
    </div>
  );
};

// Applications List
const AdminApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("status");
    if (status) setStatusFilter(status);
    fetchApplications();
  }, [location]);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/admin/applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(response.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      registered: "bg-slate-100 text-slate-700",
      documents_uploaded: "bg-amber-100 text-amber-700",
      under_review: "bg-blue-100 text-blue-700",
      approved: "bg-purple-100 text-purple-700",
      payment_pending: "bg-orange-100 text-orange-700",
      enrolled: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700"
    };
    return styles[status] || "bg-slate-100 text-slate-700";
  };

  const filteredApps = applications.filter(app => {
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    const matchesSearch = !searchTerm || 
      app.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.enrollment_number?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6" data-testid="admin-applications">
      <h1 className="font-heading text-3xl text-slate-900">Applications</h1>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <Input
            placeholder="Search by name, email, enrollment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-700"
        >
          <option value="all">All Status</option>
          <option value="registered">Registered</option>
          <option value="documents_uploaded">Documents Uploaded</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="payment_pending">Payment Pending</option>
          <option value="enrolled">Enrolled</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
          </div>
        ) : filteredApps.length > 0 ? (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Rep</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Documents</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Enrollment</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredApps.map((app, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{app.user?.name || "N/A"}</p>
                    <p className="text-slate-500 text-sm">{app.user?.email}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{app.rep?.name || "N/A"}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(app.status)}`}>
                      {app.status?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-green-600 font-medium">{app.documents_verified || 0}</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="text-slate-500">{app.documents_total || 0}</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-slate-500">
                    {app.enrollment_number || "-"}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <Link to={`/portal/admin/applications/${app.student_id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye size={16} className="mr-1" /> View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-slate-500">No applications found</div>
        )}
      </div>
    </div>
  );
};

// Application Detail
const ApplicationDetail = () => {
  const { studentId } = useParams();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchApplication();
  }, [studentId]);

  const fetchApplication = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/admin/applications/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplication(response.data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load application");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      const token = localStorage.getItem("token");
      const downloadUrl = `${API}/admin/documents/${doc.document_id}/download?token=${token}`;
      
      // Fetch the file as blob
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Open in new tab
      window.open(blobUrl, '_blank');
      
      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
      console.error('View document error:', error);
      toast.error("Unable to view document");
    }
  };

  const handleApproveDoc = async (documentId) => {
    setProcessing(documentId);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API}/admin/documents/${documentId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Document approved");
      fetchApplication();
    } catch (error) {
      toast.error("Failed to approve document");
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectDoc = async (documentId, comment) => {
    setProcessing(documentId);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API}/admin/documents/${documentId}/reject`, { admin_comment: comment }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Document rejected");
      fetchApplication();
    } catch (error) {
      toast.error("Failed to reject document");
    } finally {
      setProcessing(null);
    }
  };

  const handleApproveApplication = async () => {
    setProcessing("approve");
    try {
      const token = localStorage.getItem("token");
      const response = await axios.patch(`${API}/admin/applications/${studentId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Application approved! Student can now login.");
      
      // Show credentials
      if (response.data.credentials) {
        alert(`Student Credentials:\nEmail: ${response.data.credentials.email}\nPassword: ${response.data.credentials.temp_password}\nEnrollment: ${response.data.credentials.enrollment_number}`);
      }
      
      fetchApplication();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to approve");
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectApplication = async () => {
    if (!rejectReason) {
      toast.error("Please provide a reason");
      return;
    }
    setProcessing("reject");
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API}/admin/applications/${studentId}/reject`, { admin_feedback: rejectReason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Application rejected");
      setShowRejectModal(false);
      fetchApplication();
    } catch (error) {
      toast.error("Failed to reject");
    } finally {
      setProcessing(null);
    }
  };

  const getDocStatusBadge = (status) => {
    const styles = {
      pending: "bg-amber-100 text-amber-700",
      verified: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700"
    };
    return styles[status] || "bg-slate-100 text-slate-600";
  };

  const requiredDocs = ["bds_degree", "tenth_marksheet", "twelfth_marksheet", "passport_photo", "id_proof"];
  const allDocsVerified = requiredDocs.every(docType => 
    application?.documents?.some(d => d.doc_type === docType && d.status === "verified")
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!application) {
    return <div className="text-center py-12 text-slate-500">Application not found</div>;
  }

  return (
    <div className="space-y-6" data-testid="application-detail">
      <div className="flex items-center gap-4">
        <Link to="/portal/admin/applications">
          <Button variant="ghost" size="sm"><ArrowLeft size={18} /></Button>
        </Link>
        <div>
          <h1 className="font-heading text-3xl text-slate-900">{application.user?.name}</h1>
          <p className="text-slate-500">{application.user?.email}</p>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-xl ${
        application.status === "enrolled" ? "bg-green-50 border border-green-200" :
        application.status === "rejected" ? "bg-red-50 border border-red-200" :
        application.status === "under_review" ? "bg-blue-50 border border-blue-200" :
        "bg-slate-50 border border-slate-200"
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900">Status: {application.status?.replace(/_/g, " ")}</p>
            {application.enrollment_number && (
              <p className="text-green-700">Enrollment: {application.enrollment_number}</p>
            )}
          </div>
          {application.status === "under_review" && allDocsVerified && (
            <div className="flex gap-2">
              <Button
                onClick={handleApproveApplication}
                disabled={processing === "approve"}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {processing === "approve" ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} className="mr-1" />}
                Approve Application
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRejectModal(true)}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle size={16} className="mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Student Info */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h2 className="font-heading text-xl text-slate-900 mb-4">Student Information</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-slate-500">WhatsApp</p>
            <p className="font-medium text-slate-900">{application.whatsapp_number || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">City, State</p>
            <p className="font-medium text-slate-900">{application.city}, {application.state}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Dental Reg. Number</p>
            <p className="font-medium text-slate-900">{application.dental_reg_number || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Experience</p>
            <p className="font-medium text-slate-900">{application.experience_years || "N/A"} years</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Registered By (Rep)</p>
            <p className="font-medium text-slate-900">{application.rep?.name || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Account Status</p>
            <p className={`font-medium ${application.user?.is_active ? "text-green-600" : "text-amber-600"}`}>
              {application.user?.is_active ? "Active" : "Inactive (Pending Approval)"}
            </p>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h2 className="font-heading text-xl text-slate-900 mb-4">Documents</h2>
        {application.documents?.length > 0 ? (
          <div className="space-y-4">
            {application.documents.map((doc, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <FileText className={`${
                    doc.status === "verified" ? "text-green-500" : 
                    doc.status === "rejected" ? "text-red-500" : "text-amber-500"
                  }`} size={24} />
                  <div>
                    <p className="font-medium text-slate-900">{doc.doc_type?.replace(/_/g, " ")}</p>
                    <span className={`inline-block text-xs px-2 py-1 rounded mt-1 ${getDocStatusBadge(doc.status)}`}>
                      {doc.status}
                    </span>
                    {doc.admin_comment && (
                      <p className="text-xs text-red-600 mt-1">{doc.admin_comment}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  {doc.document_id && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDocument(doc)}
                    >
                      <ExternalLink size={14} className="mr-1" /> View
                    </Button>
                  )}
                  {doc.status === "pending" && (
                    <>
                      <Button
                        onClick={() => handleApproveDoc(doc.document_id)}
                        disabled={processing === doc.document_id}
                        className="bg-green-500 hover:bg-green-600 text-white"
                        size="sm"
                      >
                        {processing === doc.document_id ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                      </Button>
                      <Button
                        onClick={() => handleRejectDoc(doc.document_id, "Document not clear or invalid")}
                        disabled={processing === doc.document_id}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        size="sm"
                      >
                        <XCircle size={14} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500">No documents uploaded yet</p>
        )}

        {!allDocsVerified && application.status === "under_review" && (
          <div className="mt-4 bg-amber-50 p-4 rounded-lg">
            <p className="text-amber-800 text-sm">
              <AlertCircle className="inline mr-2" size={16} />
              Verify all required documents before approving the application.
            </p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-md w-full mx-4">
            <h3 className="font-heading text-xl text-slate-900 mb-4">Reject Application</h3>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={4}
            />
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowRejectModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleRejectApplication}
                disabled={processing === "reject"}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                {processing === "reject" ? <Loader2 className="animate-spin" size={16} /> : "Reject"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Pending Documents
const AdminDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/admin/documents/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(response.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      const token = localStorage.getItem("token");
      const downloadUrl = `${API}/admin/documents/${doc.document_id}/download?token=${token}`;
      
      // Fetch the file as blob
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Open in new tab
      window.open(blobUrl, '_blank');
      
      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
      console.error('View document error:', error);
      toast.error("Unable to view document");
    }
  };

  const handleApprove = async (documentId) => {
    setProcessing(documentId);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API}/admin/documents/${documentId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Document approved");
      fetchDocuments();
    } catch (error) {
      toast.error("Failed to approve");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (documentId) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    
    setProcessing(documentId);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API}/admin/documents/${documentId}/reject`, { admin_comment: reason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Document rejected");
      fetchDocuments();
    } catch (error) {
      toast.error("Failed to reject");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-documents">
      <h1 className="font-heading text-3xl text-slate-900">Pending Documents</h1>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
          </div>
        ) : documents.length > 0 ? (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Document</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Uploaded</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {documents.map((doc, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{doc.student_name}</p>
                    <p className="text-slate-500 text-xs">{doc.student_id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-900">{doc.doc_type?.replace(/_/g, " ")}</p>
                    {doc.document_id && (
                      <button 
                        onClick={() => handleViewDocument(doc)}
                        className="text-amber-600 text-xs hover:underline"
                      >
                        View File
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">
                    {new Date(doc.uploaded_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(doc.document_id)}
                        disabled={processing === doc.document_id}
                        className="bg-green-500 hover:bg-green-600 text-white"
                        size="sm"
                      >
                        {processing === doc.document_id ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} className="mr-1" />}
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReject(doc.document_id)}
                        disabled={processing === doc.document_id}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        size="sm"
                      >
                        <XCircle size={14} className="mr-1" />
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <FileText className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500">No documents pending review</p>
          </div>
        )}
      </div>
    </div>
  );
};

// User Management (Reps & Admins)
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "rep",
    bank_details: {}
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/admin/users`, newUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${newUser.role === "rep" ? "Representative" : "Admin"} created successfully!`);
      setShowCreateModal(false);
      setNewUser({ name: "", email: "", password: "", phone: "", role: "rep", bank_details: {} });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    setProcessing(userId);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API}/admin/users/${userId}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`User ${currentStatus ? "deactivated" : "activated"}`);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update status");
    } finally {
      setProcessing(null);
    }
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUser({ ...newUser, password });
  };

  const filteredUsers = roleFilter === "all" 
    ? users 
    : roleFilter === "super_admin" 
      ? users.filter(u => u.role === "super_admin" || u.role === "admin")
      : users.filter(u => u.role === roleFilter);

  const repsCount = users.filter(u => u.role === "rep").length;
  const adminsCount = users.filter(u => u.role === "super_admin" || u.role === "admin").length;

  return (
    <div className="space-y-6" data-testid="user-management">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-slate-900">User Management</h1>
        <Button onClick={() => setShowCreateModal(true)} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Users className="mr-2" size={18} />
          Create User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">Total Users</p>
          <p className="text-3xl font-bold text-slate-900">{users.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">Representatives</p>
          <p className="text-3xl font-bold text-blue-600">{repsCount}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">Super Admins</p>
          <p className="text-3xl font-bold text-red-600">{adminsCount}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["all", "rep", "super_admin"].map(role => (
          <Button
            key={role}
            variant={roleFilter === role ? "default" : "outline"}
            size="sm"
            onClick={() => setRoleFilter(role)}
            className={roleFilter === role ? "bg-amber-500 hover:bg-amber-600" : ""}
          >
            {role === "all" ? "All Users" : role === "rep" ? "Representatives" : "Super Admins"}
          </Button>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
          </div>
        ) : filteredUsers.length > 0 ? (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Performance</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Joined</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.map((user, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getRoleColor(user.role).badge}`}>
                        <span className="text-white font-bold text-sm">{user.name?.charAt(0) || "?"}</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{user.name}</p>
                        <p className="text-slate-500 text-sm">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role).bg} ${getRoleColor(user.role).text}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.role === "rep" ? (
                      <div className="text-sm">
                        <p className="text-slate-900">{user.total_students || 0} students</p>
                        <p className="text-green-600 text-xs">£{(user.total_commission_gbp || 0).toFixed(2)} earned</p>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(user.user_id, user.is_active)}
                      disabled={processing === user.user_id}
                      className={user.is_active ? "border-red-300 text-red-600 hover:bg-red-50" : "border-green-300 text-green-600 hover:bg-green-50"}
                    >
                      {processing === user.user_id ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : user.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <Users className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500">No users found</p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white p-6 rounded-xl max-w-md w-full mx-4">
            <h3 className="font-heading text-xl text-slate-900 mb-4">Create New User</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  required
                >
                  <option value="rep">Representative</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <Input
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="john@plan4growth.uk"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Enter password"
                    required
                  />
                  <Button type="button" variant="outline" onClick={generatePassword}>
                    Generate
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <Input
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="+44 7XXX XXXXXX"
                />
              </div>

              {/* Bank details — only for reps */}
              {newUser.role === "rep" && (
                <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                  <p className="text-sm font-medium text-slate-700">Bank Details (for commission payouts)</p>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Account Holder Name</label>
                    <Input
                      value={newUser.bank_details?.account_holder_name || ""}
                      onChange={(e) => setNewUser({ ...newUser, bank_details: { ...newUser.bank_details, account_holder_name: e.target.value } })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Sort Code</label>
                      <Input
                        value={newUser.bank_details?.sort_code || ""}
                        onChange={(e) => setNewUser({ ...newUser, bank_details: { ...newUser.bank_details, sort_code: e.target.value } })}
                        placeholder="12-34-56"
                        maxLength={8}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Account Number</label>
                      <Input
                        value={newUser.bank_details?.account_number || ""}
                        onChange={(e) => setNewUser({ ...newUser, bank_details: { ...newUser.bank_details, account_number: e.target.value } })}
                        placeholder="12345678"
                        maxLength={8}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Bank Name (optional)</label>
                    <Input
                      value={newUser.bank_details?.bank_name || ""}
                      onChange={(e) => setNewUser({ ...newUser, bank_details: { ...newUser.bank_details, bank_name: e.target.value } })}
                      placeholder="Barclays, HSBC, etc."
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {creating ? <Loader2 className="animate-spin" size={16} /> : "Create User"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Admin Portal Layout
const AdminPortal = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingOverrideCount, setPendingOverrideCount] = useState(0);

  // Fetch pending override count for sidebar badge
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/admin/commission-override-requests/pending-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPendingOverrideCount(res.data.count || 0);
      } catch (error) {
        console.error("Failed to fetch pending override count:", error);
      }
    };
    fetchPendingCount();
    // Refresh every 60 seconds
    const interval = setInterval(fetchPendingCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch open fraud flags count for sidebar badge
  const [openFraudCount, setOpenFraudCount] = useState(0);
  useEffect(() => {
    const fetchFraudCount = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/fraud-alerts/open-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOpenFraudCount(res.data.count || 0);
      } catch (error) {
        console.error("Failed to fetch fraud count:", error);
      }
    };
    fetchFraudCount();
    // Refresh every 60 seconds
    const interval = setInterval(fetchFraudCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { path: "/portal/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
    { path: "/portal/admin/applications-review", icon: FileText, label: "Applications Review" },
    { path: "/portal/admin/applications", icon: Users, label: "Applications" },
    { path: "/portal/admin/users", icon: Users, label: "Users" },
    { path: "/portal/admin/managers", icon: Shield, label: "Managers" },
    { path: "/portal/admin/teams", icon: UsersRound, label: "Teams" },
    { path: "/portal/admin/courses", icon: BookOpen, label: "Courses" },
    { path: "/portal/admin/commission-rules", icon: Settings, label: "Commission Rules" },
    { path: "/portal/admin/clawback-rules", icon: ShieldAlert, label: "Clawback Rules" },
    { path: "/portal/admin/commission-review", icon: ClipboardList, label: "Commission Review" },
    { path: "/portal/admin/override-requests", icon: Sliders, label: "Override Requests", badge: pendingOverrideCount },
    { path: "/portal/admin/payouts", icon: DollarSign, label: "Payouts" },
    { path: "/portal/admin/referrals", icon: Link2, label: "Referral Analytics" },
    { path: "/portal/admin/fraud-alerts", icon: AlertTriangle, label: "Fraud Flags", badge: openFraudCount },
    { path: "/portal/admin/audit-logs", icon: FileText, label: "Audit Logs" },
    { path: "/portal/admin/reports", icon: BarChart3, label: "Reports" },
    // Super Admin only
    ...(user?.role === 'super_admin' ? [
      { path: "/portal/admin/website-settings", icon: Globe, label: "Website Settings", superAdminOnly: true }
    ] : [])
  ];

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path) && !location.pathname.includes("/applications/");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="admin-portal">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between fixed top-0 left-0 right-0 z-50">
        <Link to="/" className="flex items-center gap-1">
          <span className="font-heading text-lg font-bold text-slate-900">Plan<span className="text-amber-500">4</span>Growth</span>
          <span className="text-xs text-slate-500 ml-1">Admin</span>
        </Link>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-700">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-slate-900 z-40 transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} flex flex-col`}>
        <div className="p-6 flex-shrink-0">
          <Link to="/" className="flex items-center gap-1 mb-2">
            <span className="font-heading text-xl font-bold text-white">Plan<span className="text-amber-500">4</span>Growth</span>
          </Link>
          <span className="inline-block px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded font-medium">Admin Portal</span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path, item.exact) ? "bg-amber-500/15 text-amber-500" : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <item.icon size={20} />
                <span className="flex-1">{item.label}</span>
                {item.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex-shrink-0 p-6 border-t border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 ${getRoleColor(user?.role).badge} rounded-full flex items-center justify-center`}>
              <span className="text-white font-bold">{user?.name?.charAt(0) || "A"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{user?.name}</p>
              <p className="text-slate-400 text-xs truncate">{getRoleLabel(user?.role)}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm">
            <LogOut size={18} />Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8">
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="applications" element={<AdminApplications />} />
            <Route path="applications/:studentId" element={<ApplicationDetail />} />
            <Route path="documents" element={<AdminDocuments />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="managers" element={<ManagersPage />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="commission-rules" element={<CommissionRulesPage />} />
            <Route path="clawback-rules" element={<ClawbackRulesPage />} />
            <Route path="commission-review" element={<CommissionReviewPage />} />
            <Route path="override-requests" element={<OverrideRequestsPage />} />
            <Route path="payouts" element={<PayoutsPage />} />
            <Route path="fraud-alerts" element={<FraudAlertsPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="enrolments/:enrolmentId/timeline" element={<PaymentTimelinePage />} />
            <Route path="payouts/:batchId" element={<PayoutBatchDetailPage />} />
            <Route path="referrals" element={<ReferralsAnalyticsPage />} />
            <Route path="applications-review" element={<ApplicationsReviewPage />} />
            <Route path="website-settings" element={<WebsiteSettingsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default AdminPortal;
