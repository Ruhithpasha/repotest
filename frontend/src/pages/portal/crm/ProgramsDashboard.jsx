import { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Edit,
  ToggleLeft,
  ToggleRight,
  PoundSterling,
  Clock,
  Percent,
  MoreVertical
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

const ProgramsDashboard = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);

  const fetchPrograms = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/programs?include_inactive=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPrograms(res.data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load programs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const toggleProgramStatus = async (programId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API}/programs/${programId}/toggle-status`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Program status updated");
      fetchPrograms();
    } catch (error) {
      toast.error("Failed to update program status");
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
    <div className="space-y-6" data-testid="programs-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl text-slate-900">
            Programs
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage training programs and courses
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-slate-900 hover:bg-slate-800"
          data-testid="create-program-btn"
        >
          <Plus size={18} className="mr-2" />
          Add Program
        </Button>
      </div>

      {/* Programs Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="font-heading text-lg text-slate-900 mb-2">No Programs Yet</h3>
            <p className="text-slate-500 mb-4">Create your first training program</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus size={18} className="mr-2" />
              Add Program
            </Button>
          </div>
        ) : (
          programs.map((program) => (
            <div
              key={program.program_id}
              className={`bg-white rounded-xl border overflow-hidden transition-all ${
                program.is_active ? "border-slate-200" : "border-slate-200 opacity-60"
              }`}
              data-testid={`program-${program.program_id}`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-heading text-lg text-slate-900">{program.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        program.is_active 
                          ? "bg-green-100 text-green-700" 
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {program.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">
                      {program.description || "No description"}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingProgram(program)}>
                        <Edit size={14} className="mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleProgramStatus(program.program_id)}>
                        {program.is_active ? (
                          <>
                            <ToggleLeft size={14} className="mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <ToggleRight size={14} className="mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Program Details */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <PoundSterling className="text-emerald-600" size={18} />
                    <div>
                      <p className="font-heading text-lg text-slate-900">
                        £{parseFloat(program.price_gbp).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">Price</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <Clock className="text-blue-600" size={18} />
                    <div>
                      <p className="font-heading text-lg text-slate-900">
                        {program.duration_months}
                      </p>
                      <p className="text-xs text-slate-500">Months</p>
                    </div>
                  </div>
                </div>

                {/* Commission Info */}
                <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-700">Sales Commission</span>
                    <span className="font-medium text-amber-900">
                      {(parseFloat(program.commission_value) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-amber-700">Referral Commission</span>
                    <span className="font-medium text-amber-900">
                      {(parseFloat(program.referral_commission_percent) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Program Modal */}
      {(showCreateModal || editingProgram) && (
        <ProgramModal
          program={editingProgram}
          onClose={() => {
            setShowCreateModal(false);
            setEditingProgram(null);
          }}
          onSaved={() => {
            setShowCreateModal(false);
            setEditingProgram(null);
            fetchPrograms();
          }}
        />
      )}
    </div>
  );
};

// Program Modal (Create/Edit)
const ProgramModal = ({ program, onClose, onSaved }) => {
  const isEditing = !!program;
  const [formData, setFormData] = useState({
    name: program?.name || "",
    description: program?.description || "",
    price_gbp: program?.price_gbp || "",
    duration_months: program?.duration_months || 12,
    commission_type: program?.commission_type || "percentage",
    commission_value: program?.commission_value ? (parseFloat(program.commission_value) * 100) : 4,
    referral_commission_percent: program?.referral_commission_percent 
      ? (parseFloat(program.referral_commission_percent) * 100) : 5
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...formData,
        commission_value: parseFloat(formData.commission_value) / 100,
        referral_commission_percent: parseFloat(formData.referral_commission_percent) / 100
      };

      if (isEditing) {
        await axios.patch(`${API}/programs/${program.program_id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Program updated successfully");
      } else {
        await axios.post(`${API}/programs`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Program created successfully");
      }
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save program");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="font-heading text-xl text-slate-900">
            {isEditing ? "Edit Program" : "Create New Program"}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Program Name *
            </label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Level 7 Diploma in Dental Implantology"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 rounded-md border border-slate-200 text-sm resize-none"
              rows={3}
              placeholder="Brief description of the program..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Price (GBP) *
              </label>
              <Input
                type="number"
                required
                value={formData.price_gbp}
                onChange={(e) => setFormData({ ...formData, price_gbp: e.target.value })}
                placeholder="7999"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Duration (months)
              </label>
              <Input
                type="number"
                value={formData.duration_months}
                onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                placeholder="12"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sales Commission (%)
              </label>
              <Input
                type="number"
                step="0.1"
                value={formData.commission_value}
                onChange={(e) => setFormData({ ...formData, commission_value: e.target.value })}
                placeholder="4"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Referral Commission (%)
              </label>
              <Input
                type="number"
                step="0.1"
                value={formData.referral_commission_percent}
                onChange={(e) => setFormData({ ...formData, referral_commission_percent: e.target.value })}
                placeholder="5"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-slate-900 hover:bg-slate-800" disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProgramsDashboard;
