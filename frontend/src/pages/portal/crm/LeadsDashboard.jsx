import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserPlus,
  TrendingUp,
  Phone,
  Mail,
  MapPin,
  Filter,
  Search,
  ChevronDown,
  MoreVertical,
  Calendar,
  ArrowUpRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { API } from "@/App";
import axios from "axios";
import { toast } from "sonner";

const statusColors = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  interested: "bg-purple-100 text-purple-700",
  not_interested: "bg-slate-100 text-slate-600",
  application_started: "bg-indigo-100 text-indigo-700",
  enrolled: "bg-green-100 text-green-700",
  payment_pending: "bg-orange-100 text-orange-700",
  paid_in_full: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  lost: "bg-slate-200 text-slate-600"
};

const sourceColors = {
  website: "bg-blue-50 text-blue-600",
  referral: "bg-green-50 text-green-600",
  social_media: "bg-pink-50 text-pink-600",
  google_ads: "bg-amber-50 text-amber-600",
  facebook_ads: "bg-indigo-50 text-indigo-600",
  whatsapp: "bg-emerald-50 text-emerald-600",
  phone_inquiry: "bg-purple-50 text-purple-600",
  walk_in: "bg-slate-50 text-slate-600",
  event: "bg-cyan-50 text-cyan-600",
  partner: "bg-orange-50 text-orange-600",
  other: "bg-slate-50 text-slate-500"
};

const LeadsDashboard = () => {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (sourceFilter) params.append("source", sourceFilter);
      if (searchQuery) params.append("search", searchQuery);

      const [leadsRes, statsRes] = await Promise.all([
        axios.get(`${API}/leads?${params.toString()}`, { headers }),
        axios.get(`${API}/leads/stats`, { headers })
      ]);

      setLeads(leadsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load leads data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, sourceFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  const updateLeadStatus = async (leadId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API}/leads/${leadId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Status updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="leads-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl text-slate-900">
            Lead Management
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Track and manage your sales pipeline
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-slate-900 hover:bg-slate-800"
          data-testid="create-lead-btn"
        >
          <UserPlus size={18} className="mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center">
                <Users className="text-blue-500" size={22} />
              </div>
              <span className="text-slate-500 text-sm">Total Leads</span>
            </div>
            <p className="font-heading text-2xl text-slate-900">
              {stats.conversion?.total || 0}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center">
                <Clock className="text-amber-500" size={22} />
              </div>
              <span className="text-slate-500 text-sm">New</span>
            </div>
            <p className="font-heading text-2xl text-slate-900">
              {stats.by_status?.new || 0}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="text-purple-500" size={22} />
              </div>
              <span className="text-slate-500 text-sm">Interested</span>
            </div>
            <p className="font-heading text-2xl text-slate-900">
              {stats.by_status?.interested || 0}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-green-500" size={22} />
              </div>
              <span className="text-slate-500 text-sm">Conversion Rate</span>
            </div>
            <p className="font-heading text-2xl text-slate-900">
              {stats.conversion?.rate || 0}%
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                placeholder="Search by name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>

          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[130px]">
                  <Filter size={16} className="mr-2" />
                  {statusFilter || "Status"}
                  <ChevronDown size={16} className="ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter("")}>
                  All Statuses
                </DropdownMenuItem>
                {Object.keys(statusColors).map((status) => (
                  <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)}>
                    {status.replace(/_/g, " ")}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[130px]">
                  {sourceFilter || "Source"}
                  <ChevronDown size={16} className="ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSourceFilter("")}>
                  All Sources
                </DropdownMenuItem>
                {Object.keys(sourceColors).map((source) => (
                  <DropdownMenuItem key={source} onClick={() => setSourceFilter(source)}>
                    {source.replace(/_/g, " ")}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="leads-table">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Lead
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-slate-500">
                    No leads found
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.lead_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{lead.name}</p>
                        <p className="text-sm text-slate-500">
                          {lead.profession || "N/A"} • {lead.experience_years || 0} yrs
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail size={14} />
                          {lead.email}
                        </div>
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone size={14} />
                            {lead.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${sourceColors[lead.source] || sourceColors.other}`}>
                        {lead.source?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[lead.status] || statusColors.new}`}>
                        {lead.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-600">
                        {formatDate(lead.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => updateLeadStatus(lead.lead_id, "contacted")}>
                            Mark Contacted
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateLeadStatus(lead.lead_id, "interested")}>
                            Mark Interested
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateLeadStatus(lead.lead_id, "not_interested")}>
                            Not Interested
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateLeadStatus(lead.lead_id, "application_started")}>
                            Application Started
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Lead Modal */}
      {showCreateModal && (
        <CreateLeadModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

// Create Lead Modal Component
const CreateLeadModal = ({ onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    profession: "",
    experience_years: "",
    program_id: "",
    source: "website",
    notes: ""
  });
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/programs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPrograms(res.data);
      } catch (error) {
        console.error("Failed to fetch programs:", error);
      }
    };
    fetchPrograms();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/leads`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Lead created successfully");
      onCreated();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="font-heading text-xl text-slate-900">Add New Lead</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
              >
                {Object.keys(sourceColors).map((source) => (
                  <option key={source} value={source}>
                    {source.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Profession</label>
              <Input
                value={formData.profession}
                onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                placeholder="e.g., Dentist"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Experience (years)</label>
              <Input
                type="number"
                value={formData.experience_years}
                onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Program Interest</label>
            <select
              value={formData.program_id}
              onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
            >
              <option value="">Select program</option>
              {programs.map((prog) => (
                <option key={prog.program_id} value={prog.program_id}>
                  {prog.name} - £{parseFloat(prog.price_gbp).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full p-3 rounded-md border border-slate-200 text-sm resize-none"
              rows={3}
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-slate-900 hover:bg-slate-800" disabled={loading}>
              {loading ? "Creating..." : "Create Lead"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadsDashboard;
