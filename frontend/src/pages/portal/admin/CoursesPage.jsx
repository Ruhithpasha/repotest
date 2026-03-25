import { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Power,
  Loader2,
  X,
  GraduationCap,
  Users,
  IndianRupee,
  PoundSterling,
  DollarSign,
  Euro,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import ModuleBuilderPanel from "./ModuleBuilderPanel";

// Currency symbol helper
const getCurrencySymbol = (currency) => {
  const symbols = {
    INR: "₹",
    GBP: "£",
    USD: "$",
    EUR: "€"
  };
  return symbols[currency] || currency;
};

// Currency icon helper
const CurrencyIcon = ({ currency, size = 16, className = "" }) => {
  const icons = {
    INR: IndianRupee,
    GBP: PoundSterling,
    USD: DollarSign,
    EUR: Euro
  };
  const Icon = icons[currency] || DollarSign;
  return <Icon size={size} className={className} />;
};

const CoursesPage = () => {
  const [programmes, setProgrammes] = useState([]);
  const [stats, setStats] = useState({
    totalProgrammes: 0,
    activeProgrammes: 0,
    totalEnrolments: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingProgramme, setEditingProgramme] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(null);
  const [selectedProgrammeForModules, setSelectedProgrammeForModules] = useState(null);
  const [formData, setFormData] = useState({
    program_name: "",
    currency: "INR",
    list_price: "",
    active: true
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [programmesRes, statsRes] = await Promise.all([
        axios.get(`${API}/admin/programmes`, { headers }),
        axios.get(`${API}/admin/programmes/stats`, { headers })
      ]);

      setProgrammes(programmesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching programmes:", error);
      toast.error("Failed to load programmes");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingProgramme(null);
    setFormData({
      program_name: "",
      currency: "INR",
      list_price: "",
      active: true
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (programme) => {
    setEditingProgramme(programme);
    setFormData({
      program_name: programme.program_name,
      currency: programme.currency,
      list_price: programme.list_price.toString(),
      active: programme.active
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    // Validation
    if (!formData.program_name.trim() || formData.program_name.trim().length < 2) {
      setFormErrors({ program_name: "Programme name must be at least 2 characters" });
      return;
    }
    if (!formData.list_price || parseFloat(formData.list_price) <= 0) {
      setFormErrors({ list_price: "List price must be greater than 0" });
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const payload = {
        program_name: formData.program_name.trim(),
        currency: formData.currency,
        list_price: parseFloat(formData.list_price),
        active: formData.active
      };

      if (editingProgramme) {
        await axios.patch(`${API}/admin/programmes/${editingProgramme.id}`, payload, { headers });
        toast.success("Programme updated successfully");
      } else {
        await axios.post(`${API}/admin/programmes`, payload, { headers });
        toast.success("Programme created successfully");
      }

      setShowModal(false);
      fetchData();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Operation failed";
      const errorField = error.response?.data?.field;
      
      if (errorField) {
        setFormErrors({ [errorField]: errorMsg });
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (programme) => {
    setProcessing(programme.id);

    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      await axios.delete(`${API}/admin/programmes/${programme.id}`, { headers });
      toast.success("Programme deactivated");
      setShowDeactivateConfirm(null);
      fetchData();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Failed to deactivate";
      toast.error(errorMsg);
    } finally {
      setProcessing(null);
    }
  };

  const handleActivate = async (programme) => {
    setProcessing(programme.id);

    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      await axios.patch(`${API}/admin/programmes/${programme.id}/activate`, {}, { headers });
      toast.success("Programme activated");
      fetchData();
    } catch (error) {
      toast.error("Failed to activate programme");
    } finally {
      setProcessing(null);
    }
  };

  // Filter programmes
  const filteredProgrammes = programmes.filter(prog => {
    const matchesSearch = !searchTerm || 
      prog.program_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && prog.active) ||
      (statusFilter === "inactive" && !prog.active);
    return matchesSearch && matchesStatus;
  });

  const statCards = [
    { 
      label: "Total Programmes", 
      value: stats.totalProgrammes, 
      icon: BookOpen, 
      color: "bg-blue-500" 
    },
    { 
      label: "Active Programmes", 
      value: stats.activeProgrammes, 
      icon: GraduationCap, 
      color: "bg-green-500" 
    },
    { 
      label: "Total Enrolments", 
      value: stats.totalEnrolments, 
      icon: Users, 
      color: "bg-purple-500" 
    },
    { 
      label: "Total Revenue", 
      value: `₹${stats.totalRevenue.toLocaleString()}`, 
      icon: IndianRupee, 
      color: "bg-amber-500" 
    }
  ];

  return (
    <div className="space-y-6" data-testid="courses-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold text-slate-900">Programmes</h1>
        <Button 
          onClick={openCreateModal}
          className="bg-amber-500 hover:bg-amber-600 text-white"
          data-testid="add-programme-btn"
        >
          <Plus size={18} className="mr-2" />
          Add Programme
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div 
            key={index} 
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
            data-testid={`stat-card-${index}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="text-white" size={20} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {loading ? "..." : stat.value}
            </p>
            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder="Search by programme name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white"
            data-testid="search-input"
          />
        </div>
        <div className="flex gap-2">
          {["all", "active", "inactive"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={statusFilter === status ? "bg-slate-900 text-white" : "bg-white"}
              data-testid={`filter-${status}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Programmes Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin mx-auto text-amber-500" size={32} />
          </div>
        ) : filteredProgrammes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Programme Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    List Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Enrolments
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredProgrammes.map((programme) => (
                  <tr key={programme.id} className="hover:bg-gray-50" data-testid={`programme-row-${programme.id}`}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{programme.program_name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600">{programme.currency}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900">
                        {getCurrencySymbol(programme.currency)}{programme.list_price.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        programme.active 
                          ? "bg-green-100 text-green-700" 
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {programme.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600">{programme.enrollmentCount}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedProgrammeForModules(programme)}
                          className="text-slate-600 hover:text-amber-600 hover:bg-amber-50"
                          title="Manage Modules"
                          data-testid={`modules-btn-${programme.id}`}
                        >
                          <Layers size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(programme)}
                          className="text-slate-600 hover:text-slate-900"
                          data-testid={`edit-btn-${programme.id}`}
                        >
                          <Edit2 size={16} />
                        </Button>
                        {programme.active ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDeactivateConfirm(programme)}
                            disabled={processing === programme.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`deactivate-btn-${programme.id}`}
                          >
                            {processing === programme.id ? (
                              <Loader2 className="animate-spin" size={16} />
                            ) : (
                              <Power size={16} />
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActivate(programme)}
                            disabled={processing === programme.id}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            data-testid={`activate-btn-${programme.id}`}
                          >
                            {processing === programme.id ? (
                              <Loader2 className="animate-spin" size={16} />
                            ) : (
                              <Power size={16} />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <BookOpen className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 mb-2">No programmes yet</p>
            <p className="text-slate-400 text-sm">Add your first programme to get started.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-xl font-semibold text-slate-900">
                  {editingProgramme ? "Edit Programme" : "Add Programme"}
                </h2>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <Label htmlFor="program_name" className="text-slate-700">
                  Programme Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="program_name"
                  value={formData.program_name}
                  onChange={(e) => setFormData({ ...formData, program_name: e.target.value })}
                  placeholder="e.g. Level 7 Diploma in Implantology"
                  className={`mt-1 ${formErrors.program_name ? "border-red-500" : ""}`}
                  data-testid="input-program-name"
                />
                {formErrors.program_name && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.program_name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="currency" className="text-slate-700">Currency</Label>
                <select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  data-testid="select-currency"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <div>
                <Label htmlFor="list_price" className="text-slate-700">
                  List Price <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    {getCurrencySymbol(formData.currency)}
                  </span>
                  <Input
                    id="list_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.list_price}
                    onChange={(e) => setFormData({ ...formData, list_price: e.target.value })}
                    placeholder="0.00"
                    className={`pl-8 ${formErrors.list_price ? "border-red-500" : ""}`}
                    data-testid="input-list-price"
                  />
                </div>
                {formErrors.list_price && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.list_price}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="active" className="text-slate-700">Status</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">
                    {formData.active ? "Active" : "Inactive"}
                  </span>
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    data-testid="switch-active"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="flex-1"
                  data-testid="cancel-btn"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                  data-testid="save-btn"
                >
                  {submitting ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl p-6">
            <h3 className="font-heading text-xl font-semibold text-slate-900 mb-2">
              Deactivate Programme?
            </h3>
            <p className="text-slate-600 mb-6">
              This will prevent new enrolments for <strong>{showDeactivateConfirm.program_name}</strong>. 
              Existing enrolments will not be affected.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeactivateConfirm(null)}
                className="flex-1"
                data-testid="cancel-deactivate-btn"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDeactivate(showDeactivateConfirm)}
                disabled={processing === showDeactivateConfirm.id}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                data-testid="confirm-deactivate-btn"
              >
                {processing === showDeactivateConfirm.id ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  "Deactivate"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Module Builder Panel */}
      {selectedProgrammeForModules && (
        <ModuleBuilderPanel
          programme={selectedProgrammeForModules}
          onClose={() => setSelectedProgrammeForModules(null)}
        />
      )}
    </div>
  );
};

export default CoursesPage;
