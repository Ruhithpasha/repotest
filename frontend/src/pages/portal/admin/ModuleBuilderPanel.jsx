import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Loader2,
  Clock,
  BookOpen,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable Module Card Component
const SortableModuleCard = ({ module, onEdit, onDelete, isDeleting }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm ${
        isDragging ? "shadow-lg" : ""
      }`}
      data-testid={`module-card-${module.id}`}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab hover:bg-slate-100 p-1 rounded text-slate-400 hover:text-slate-600"
          data-testid={`drag-handle-${module.id}`}
        >
          <GripVertical size={20} />
        </button>

        {/* Order Badge */}
        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-slate-600 font-semibold text-sm">
            {String(module.order).padStart(2, "0")}
          </span>
        </div>

        {/* Module Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-heading font-medium text-slate-900 truncate">
            {module.title}
          </h4>
          {module.description && (
            <p className="text-sm text-slate-500 truncate">{module.description}</p>
          )}
        </div>

        {/* Duration Badge */}
        {module.duration_minutes && (
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-xs text-slate-600">
            <Clock size={12} />
            {module.duration_minutes} min
          </div>
        )}

        {/* Status Badge */}
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            module.active
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {module.active ? "Active" : "Inactive"}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(module)}
            className="text-slate-600 hover:text-slate-900"
            data-testid={`edit-module-${module.id}`}
          >
            <Edit2 size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(module)}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            data-testid={`delete-module-${module.id}`}
          >
            {isDeleting ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Trash2 size={16} />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Module Builder Panel Component
const ModuleBuilderPanel = ({ programme, onClose }) => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalDuration, setTotalDuration] = useState(0);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [deletingModule, setDeletingModule] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    duration_minutes: "",
    order: "",
    active: true,
  });
  const [formErrors, setFormErrors] = useState({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchModules();
  }, [programme.id]);

  const fetchModules = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API}/admin/programmes/${programme.id}/modules`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setModules(response.data.modules || []);
      setTotalDuration(response.data.totalDuration || 0);
    } catch (error) {
      console.error("Error fetching modules:", error);
      toast.error("Failed to load modules");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingModule(null);
    const nextOrder = modules.length > 0 
      ? Math.max(...modules.map(m => m.order)) + 1 
      : 1;
    setFormData({
      title: "",
      description: "",
      content: "",
      duration_minutes: "",
      order: nextOrder.toString(),
      active: true,
    });
    setFormErrors({});
    setShowModuleModal(true);
  };

  const openEditModal = (module) => {
    setEditingModule(module);
    setFormData({
      title: module.title,
      description: module.description || "",
      content: module.content || "",
      duration_minutes: module.duration_minutes?.toString() || "",
      order: module.order.toString(),
      active: module.active,
    });
    setFormErrors({});
    setShowModuleModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    if (!formData.title.trim() || formData.title.trim().length < 2) {
      setFormErrors({ title: "Title must be at least 2 characters" });
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        content: formData.content || null,
        duration_minutes: formData.duration_minutes
          ? parseInt(formData.duration_minutes)
          : null,
        order: parseInt(formData.order),
        active: formData.active,
      };

      if (editingModule) {
        await axios.patch(
          `${API}/admin/programmes/${programme.id}/modules/${editingModule.id}`,
          payload,
          { headers }
        );
        toast.success("Module updated successfully");
      } else {
        await axios.post(
          `${API}/admin/programmes/${programme.id}/modules`,
          payload,
          { headers }
        );
        toast.success("Module created successfully");
      }

      setShowModuleModal(false);
      fetchModules();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Operation failed";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (module) => {
    setDeletingModule(module.id);

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API}/admin/programmes/${programme.id}/modules/${module.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Module deactivated");
      setShowDeleteConfirm(null);
      fetchModules();
    } catch (error) {
      toast.error("Failed to deactivate module");
    } finally {
      setDeletingModule(null);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = modules.findIndex((m) => m.id === active.id);
      const newIndex = modules.findIndex((m) => m.id === over.id);

      const newModules = arrayMove(modules, oldIndex, newIndex).map(
        (m, index) => ({
          ...m,
          order: index + 1,
        })
      );

      setModules(newModules);

      // Save to backend
      try {
        const token = localStorage.getItem("token");
        await axios.patch(
          `${API}/admin/programmes/${programme.id}/modules/reorder`,
          {
            modules: newModules.map((m) => ({ id: m.id, order: m.order })),
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Module order updated");
      } catch (error) {
        toast.error("Failed to update order");
        fetchModules(); // Revert on error
      }
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-full md:w-[60%] bg-gray-50 z-50 shadow-xl overflow-hidden flex flex-col"
        data-testid="module-builder-panel"
      >
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold text-slate-900">
                {programme.program_name}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {modules.length} modules · {totalDuration} mins total
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={openCreateModal}
                className="bg-amber-500 hover:bg-amber-600 text-white"
                data-testid="add-module-btn"
              >
                <Plus size={18} className="mr-2" />
                Add Module
              </Button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Module List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-amber-500" size={32} />
            </div>
          ) : modules.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={modules.map((m) => m.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {modules.map((module) => (
                    <SortableModuleCard
                      key={module.id}
                      module={module}
                      onEdit={openEditModal}
                      onDelete={() => setShowDeleteConfirm(module)}
                      isDeleting={deletingModule === module.id}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Layers className="text-slate-300 mb-4" size={48} />
              <p className="text-slate-500 mb-2">No modules yet</p>
              <p className="text-slate-400 text-sm">
                Add your first module to build this course.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Module Modal */}
      {showModuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-xl font-semibold text-slate-900">
                  {editingModule ? "Edit Module" : "Add Module"}
                </h2>
                <button
                  onClick={() => setShowModuleModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <Label htmlFor="title" className="text-slate-700">
                  Module Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g. Introduction to Dental Implants"
                  className={`mt-1 ${formErrors.title ? "border-red-500" : ""}`}
                  data-testid="input-module-title"
                />
                {formErrors.title && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.title}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description" className="text-slate-700">
                  Description
                </Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief overview of this module"
                  rows={2}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  data-testid="input-module-description"
                />
              </div>

              <div>
                <Label htmlFor="content" className="text-slate-700">
                  Content
                </Label>
                <textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="Enter the lesson content here. You can use HTML for formatting."
                  rows={8}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none font-mono text-sm"
                  data-testid="input-module-content"
                />
                <p className="text-xs text-slate-400 mt-1">
                  HTML formatting is supported for rich content
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration" className="text-slate-700">
                    Duration
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="duration"
                      type="number"
                      min="0"
                      value={formData.duration_minutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duration_minutes: e.target.value,
                        })
                      }
                      placeholder="45"
                      className="pr-16"
                      data-testid="input-module-duration"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                      minutes
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="order" className="text-slate-700">
                    Order
                  </Label>
                  <Input
                    id="order"
                    type="number"
                    min="1"
                    value={formData.order}
                    onChange={(e) =>
                      setFormData({ ...formData, order: e.target.value })
                    }
                    className="mt-1"
                    data-testid="input-module-order"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="active" className="text-slate-700">
                  Status
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">
                    {formData.active ? "Active" : "Inactive"}
                  </span>
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, active: checked })
                    }
                    data-testid="switch-module-active"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModuleModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                  data-testid="save-module-btn"
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

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl p-6">
            <h3 className="font-heading text-xl font-semibold text-slate-900 mb-2">
              Deactivate Module?
            </h3>
            <p className="text-slate-600 mb-6">
              This will deactivate "{showDeleteConfirm.title}". Students will no
              longer see this module.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deletingModule === showDeleteConfirm.id}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                {deletingModule === showDeleteConfirm.id ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  "Deactivate"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ModuleBuilderPanel;
