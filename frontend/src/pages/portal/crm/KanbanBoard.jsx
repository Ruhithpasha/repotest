import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Phone,
  Mail,
  GripVertical,
  MoreVertical,
  Plus,
  Calendar,
  User,
  ArrowRight,
  GraduationCap,
  X
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

// Kanban columns configuration
const COLUMNS = [
  { id: "new", title: "New Leads", color: "bg-blue-500", lightColor: "bg-blue-50" },
  { id: "contacted", title: "Contacted", color: "bg-amber-500", lightColor: "bg-amber-50" },
  { id: "interested", title: "Interested", color: "bg-purple-500", lightColor: "bg-purple-50" },
  { id: "application_started", title: "Application", color: "bg-indigo-500", lightColor: "bg-indigo-50" },
  { id: "enrolled", title: "Enrolled", color: "bg-green-500", lightColor: "bg-green-50" },
  { id: "paid_in_full", title: "Paid", color: "bg-emerald-500", lightColor: "bg-emerald-50" }
];

const LeadCard = ({ lead, onStatusChange, onDragStart }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
      data-testid={`lead-card-${lead.lead_id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
            <User className="text-slate-500" size={16} />
          </div>
          <div>
            <p className="font-medium text-slate-900 text-sm leading-tight">{lead.name}</p>
            <p className="text-xs text-slate-500">{lead.profession || "N/A"}</p>
          </div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          <GripVertical className="text-slate-300" size={16} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreVertical size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              {COLUMNS.filter(c => c.id !== lead.status).map((col) => (
                <DropdownMenuItem key={col.id} onClick={() => onStatusChange(lead.lead_id, col.id)}>
                  <ArrowRight size={14} className="mr-2" />
                  Move to {col.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Mail size={12} />
          <span className="truncate">{lead.email}</span>
        </div>
        {lead.phone && (
          <div className="flex items-center gap-1.5">
            <Phone size={12} />
            <span>{lead.phone}</span>
          </div>
        )}
      </div>

      {lead.program && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
            {lead.program.name?.split(' ').slice(0, 3).join(' ')}...
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-2 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Calendar size={10} />
          {formatDate(lead.created_at)}
        </span>
        {lead.source && (
          <span className="capitalize">{lead.source.replace(/_/g, ' ')}</span>
        )}
      </div>
    </div>
  );
};

const KanbanColumn = ({ column, leads, onStatusChange, onDragStart, onDrop }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(e, column.id);
  };

  return (
    <div
      className={`flex-shrink-0 w-72 flex flex-col rounded-2xl transition-all ${
        isDragOver ? "ring-2 ring-slate-300 ring-offset-2" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid={`kanban-column-${column.id}`}
    >
      {/* Column Header */}
      <div className={`${column.lightColor} rounded-t-2xl p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${column.color}`} />
            <h3 className="font-heading text-sm text-slate-800">{column.title}</h3>
          </div>
          <span className="text-xs font-medium text-slate-600 bg-white/80 px-2 py-1 rounded-lg">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Cards Container */}
      <div className={`flex-1 ${column.lightColor} bg-opacity-30 rounded-b-2xl p-3 space-y-3 min-h-[400px]`}>
        {leads.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No leads
          </div>
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.lead_id}
              lead={lead}
              onStatusChange={onStatusChange}
              onDragStart={onDragStart}
            />
          ))
        )}
      </div>
    </div>
  );
};

const KanbanBoard = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState(null);
  
  // Conversion modal state
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertingLead, setConvertingLead] = useState(null);
  const [converting, setConverting] = useState(false);

  const fetchLeads = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/leads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeads(res.data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const updateLeadStatus = async (leadId, newStatus) => {
    // If moving to enrolled, show conversion modal
    if (newStatus === 'enrolled') {
      const lead = leads.find(l => l.lead_id === leadId);
      if (lead && !lead.converted_to_student_id) {
        setConvertingLead(lead);
        setShowConvertModal(true);
        return;
      }
    }
    
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API}/leads/${leadId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Optimistic update
      setLeads(prev => prev.map(lead => 
        lead.lead_id === leadId ? { ...lead, status: newStatus } : lead
      ));
      
      toast.success("Lead moved successfully");
    } catch (error) {
      toast.error("Failed to update lead");
      fetchLeads(); // Revert on error
    }
  };

  const handleConvertLead = async () => {
    if (!convertingLead) {
      toast.error("No lead selected");
      return;
    }

    setConverting(true);
    try {
      const token = localStorage.getItem("token");
      
      const res = await axios.post(
        `${API}/leads/${convertingLead.lead_id}/convert`,
        { 
          program_id: 'prog_diploma_l7',
          course_fee: 6250
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Student marked as enrolled! Enrollment #: ${res.data.student?.enrollment_number || res.data.student?.student_id}`);
      setShowConvertModal(false);
      setConvertingLead(null);
      fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to mark as enrolled");
    } finally {
      setConverting(false);
    }
  };

  const handleDragStart = (e, lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e, columnId) => {
    if (draggedLead && draggedLead.status !== columnId) {
      updateLeadStatus(draggedLead.lead_id, columnId);
    }
    setDraggedLead(null);
  };

  // Group leads by status
  const leadsByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = leads.filter(lead => lead.status === col.id);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="kanban-board">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl text-slate-900">
            Sales Pipeline
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Drag and drop leads between stages
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500">
            Total: <span className="font-medium text-slate-900">{leads.length}</span> leads
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              leads={leadsByStatus[column.id] || []}
              onStatusChange={updateLeadStatus}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
            />
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {COLUMNS.map((col) => (
          <div key={col.id} className={`${col.lightColor} rounded-xl p-3 text-center`}>
            <p className="font-heading text-xl text-slate-900">{leadsByStatus[col.id]?.length || 0}</p>
            <p className="text-xs text-slate-600">{col.title}</p>
          </div>
        ))}
      </div>

      {/* Convert to Enrolment Modal */}
      {showConvertModal && convertingLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-sm" data-testid="convert-modal">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-heading text-xl text-slate-900">Mark as Enrolled</h3>
                <p className="text-slate-500 text-sm mt-1">Confirm enrollment for this student</p>
              </div>
              <button onClick={() => { setShowConvertModal(false); setConvertingLead(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Lead Info */}
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                    <User className="text-slate-500" size={20} />
                  </div>
                  <div>
                    <p className="font-heading text-slate-900">{convertingLead.name}</p>
                    <p className="text-sm text-slate-500">{convertingLead.email}</p>
                  </div>
                </div>
              </div>

              {/* Confirmation Message */}
              <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-green-700">
                  <GraduationCap size={18} />
                  <span className="font-heading text-sm">Level 7 Diploma in Dental Implantology</span>
                </div>
                <p className="text-green-600 text-sm mt-1">
                  This will mark the student as enrolled and trigger commission processing.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => { setShowConvertModal(false); setConvertingLead(null); }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConvertLead}
                disabled={converting}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {converting ? 'Processing...' : 'Mark as Enrolled'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;
