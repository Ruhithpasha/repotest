import { useState, useEffect } from 'react';
import { Plus, Pencil, ToggleLeft, ToggleRight, Trash2, ShieldAlert } from 'lucide-react';
import { Modal, PageHeader } from '../../../components/shared/AdminComponents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const emptyForm = { name: '', clawback_window_days: '', clawback_percentage: '' };

export default function ClawbackRulesPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/clawback-rules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setRules(data.rules || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load clawback rules');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingRule(null);
    setFormData(emptyForm);
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      clawback_window_days: String(rule.clawback_window_days),
      clawback_percentage: String(rule.clawback_percentage)
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.clawback_window_days || parseInt(formData.clawback_window_days) < 1)
      errors.clawback_window_days = 'Must be at least 1 day';
    const pct = parseFloat(formData.clawback_percentage);
    if (isNaN(pct) || pct < 0 || pct > 100)
      errors.clawback_percentage = 'Must be between 0 and 100';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingRule
        ? `${API_URL}/api/admin/clawback-rules/${editingRule.id}`
        : `${API_URL}/api/admin/clawback-rules`;
      const method = editingRule ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          clawback_window_days: parseInt(formData.clawback_window_days),
          clawback_percentage: parseFloat(formData.clawback_percentage)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      toast.success(editingRule ? 'Rule updated' : 'Rule created');
      setShowModal(false);
      fetchRules();
    } catch (err) {
      toast.error(err.message || 'Failed to save rule');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggle = async (rule) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/clawback-rules/${rule.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !rule.is_active })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Toggle failed');
      toast.success(`Rule ${!rule.is_active ? 'activated' : 'deactivated'}`);
      fetchRules();
    } catch (err) {
      toast.error(err.message || 'Failed to toggle rule');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this clawback rule? It will no longer apply to new clawbacks.')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/clawback-rules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast.success('Rule deactivated');
      fetchRules();
    } catch (err) {
      toast.error(err.message || 'Failed to delete rule');
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="clawback-rules-page">
      <PageHeader
        title="Clawback Rules"
        subtitle="Define rules for automatically clawing back commissions when a student is refunded"
      >
        <Button onClick={openAdd} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Plus size={16} className="mr-2" />
          Add Rule
        </Button>
      </PageHeader>

      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldAlert size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800">How clawback rules work</p>
          <p className="text-sm text-amber-700 mt-1">
            When a student is refunded, the system checks how many days have passed since payment.
            The matching rule determines what percentage of commission is clawed back.
            If multiple rules exist, the one with the shortest window that still includes the refund date is applied.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldAlert size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No clawback rules defined yet.</p>
            <p className="text-slate-400 text-xs mt-1">Add a rule to automatically claw back commissions on refunds.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rule Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Window</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Clawback %</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900 text-sm">{rule.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-700">{rule.clawback_window_days} days</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-slate-900">{parseFloat(rule.clawback_percentage).toFixed(0)}%</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      rule.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(rule)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleToggle(rule)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          rule.is_active
                            ? 'text-green-500 hover:text-green-700 hover:bg-green-50'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                        title={rule.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {rule.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <Modal
          title={editingRule ? 'Edit Clawback Rule' : 'Add Clawback Rule'}
          onClose={() => setShowModal(false)}
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rule Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. 30-day refund clawback"
              />
              {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Clawback Window (days)
              </label>
              <Input
                type="number"
                min="1"
                value={formData.clawback_window_days}
                onChange={(e) => setFormData(prev => ({ ...prev, clawback_window_days: e.target.value }))}
                placeholder="e.g. 30"
              />
              <p className="text-xs text-slate-400 mt-1">
                Number of days after payment within which a refund triggers this rule
              </p>
              {formErrors.clawback_window_days && (
                <p className="text-red-500 text-xs mt-1">{formErrors.clawback_window_days}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Clawback Percentage (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.clawback_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, clawback_percentage: e.target.value }))}
                placeholder="e.g. 100"
              />
              <p className="text-xs text-slate-400 mt-1">
                What % of the commission amount to claw back (100 = full, 50 = half)
              </p>
              {formErrors.clawback_percentage && (
                <p className="text-red-500 text-xs mt-1">{formErrors.clawback_percentage}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={processing}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {processing ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
