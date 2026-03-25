import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Plus, GripVertical, ToggleLeft, ToggleRight, Edit2, Trash2, Globe, BookOpen } from 'lucide-react';
import { 
  PageHeader, StatCard, DataTable, SearchInput, SelectFilter, FilterBar, 
  ActionButton, Modal, StatusBadge 
} from '../../../components/shared/AdminComponents';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CommissionRulesPage = () => {
  const [rules, setRules] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  
  // Form state with override bounds
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    program_id: '',
    role_type: 'sales_user',
    commission_type: 'percentage',
    commission_value: '',
    minimum_payment_status: 'paid_in_full',
    minimum_sale_amount: '',
    hold_days: '14',
    start_date: '',
    end_date: '',
    priority: '0',
    manager_override_min: '',
    manager_override_max: ''
  });

  const token = localStorage.getItem('token');

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/commissions/rules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRules(Array.isArray(data) ? data : data.rules || []);
    } catch (error) {
      console.error('Failed to fetch rules:', error);
      toast.error('Failed to load commission rules');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/programmes?active=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPrograms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch programs:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchRules();
    fetchPrograms();
  }, [fetchRules, fetchPrograms]);

  const handleSaveRule = async () => {
    setFormErrors({});

    // Validate override bounds
    if (formData.manager_override_min && formData.manager_override_max) {
      if (parseFloat(formData.manager_override_min) >= parseFloat(formData.manager_override_max)) {
        setFormErrors({ manager_override_min: 'Min must be less than max' });
        return;
      }
    }

    try {
      const payload = {
        ...formData,
        commission_value: parseFloat(formData.commission_value),
        minimum_sale_amount: formData.minimum_sale_amount ? parseFloat(formData.minimum_sale_amount) : null,
        hold_days: parseInt(formData.hold_days),
        priority: parseInt(formData.priority),
        program_id: formData.program_id || null,
        manager_override_min: formData.manager_override_min ? parseFloat(formData.manager_override_min) : null,
        manager_override_max: formData.manager_override_max ? parseFloat(formData.manager_override_max) : null
      };

      const url = editingRule 
        ? `${API_URL}/api/commissions/rules/${editingRule.rule_id}`
        : `${API_URL}/api/commissions/rules`;
      
      const res = await fetch(url, {
        method: editingRule ? 'PUT' : 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchRules();
        toast.success(editingRule ? 'Rule updated successfully' : 'Rule created successfully');
      } else {
        if (data.field) {
          setFormErrors({ [data.field]: data.detail });
        } else {
          toast.error(data.detail || 'Failed to save rule');
        }
      }
    } catch (error) {
      console.error('Failed to save rule:', error);
      toast.error('Failed to save rule');
    }
  };

  const handleToggleActive = async (rule) => {
    try {
      await fetch(`${API_URL}/api/commissions/rules/${rule.rule_id}`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !rule.is_active })
      });
      fetchRules();
      toast.success(rule.is_active ? 'Rule deactivated' : 'Rule activated');
    } catch (error) {
      console.error('Failed to toggle rule:', error);
      toast.error('Failed to update rule');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    
    try {
      await fetch(`${API_URL}/api/commissions/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRules();
      toast.success('Rule deleted');
    } catch (error) {
      console.error('Failed to delete rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      program_id: rule.program_id || '',
      role_type: rule.role_type,
      commission_type: rule.commission_type,
      commission_value: rule.commission_value.toString(),
      minimum_payment_status: rule.minimum_payment_status,
      minimum_sale_amount: rule.minimum_sale_amount?.toString() || '',
      hold_days: rule.hold_days?.toString() || '14',
      start_date: rule.start_date || '',
      end_date: rule.end_date || '',
      priority: rule.priority?.toString() || '0',
      manager_override_min: rule.manager_override_min?.toString() || '',
      manager_override_max: rule.manager_override_max?.toString() || ''
    });
    setFormErrors({});
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      description: '',
      program_id: '',
      role_type: 'sales_user',
      commission_type: 'percentage',
      commission_value: '',
      minimum_payment_status: 'paid_in_full',
      minimum_sale_amount: '',
      hold_days: '14',
      start_date: '',
      end_date: '',
      priority: '0',
      manager_override_min: '',
      manager_override_max: ''
    });
    setFormErrors({});
  };

  const filteredRules = rules.filter(r => {
    if (search && !r.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter && r.role_type !== roleFilter) return false;
    return true;
  });

  // Stats
  const activeRules = rules.filter(r => r.is_active).length;
  const avgRate = rules.length > 0 
    ? (rules.filter(r => r.commission_type === 'percentage').reduce((sum, r) => sum + parseFloat(r.commission_value), 0) / rules.filter(r => r.commission_type === 'percentage').length * 100).toFixed(1)
    : 0;
  const programSpecificRules = rules.filter(r => r.program_id).length;

  const columns = [
    {
      header: 'Priority',
      render: (row) => (
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-300" />
          <span className="font-medium text-gray-500">{row.priority}</span>
        </div>
      )
    },
    {
      header: 'Rule Name',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          {row.description && <p className="text-xs text-gray-500 truncate max-w-xs">{row.description}</p>}
        </div>
      )
    },
    {
      header: 'Scope',
      render: (row) => {
        if (row.program_id) {
          const programName = row.program?.name || programs.find(p => p.id === row.program_id || p.program_id === row.program_id)?.program_name || 'Programme';
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              <BookOpen className="w-3 h-3" />
              {programName}
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
            <Globe className="w-3 h-3" />
            Global
          </span>
        );
      }
    },
    {
      header: 'Role',
      render: (row) => (
        <StatusBadge 
          status={row.role_type} 
          size="small"
        />
      )
    },
    {
      header: 'Rate',
      render: (row) => (
        <span className="font-semibold text-green-600">
          {row.commission_type === 'percentage' 
            ? `${(parseFloat(row.commission_value) * 100).toFixed(1)}%`
            : `£${parseFloat(row.commission_value).toFixed(2)}`
          }
        </span>
      )
    },
    {
      header: 'Override Bounds',
      render: (row) => {
        if (row.manager_override_min !== null && row.manager_override_max !== null) {
          return (
            <span className="text-sm text-slate-600">
              {parseFloat(row.manager_override_min).toFixed(0)}% – {parseFloat(row.manager_override_max).toFixed(0)}%
            </span>
          );
        }
        return <span className="text-slate-400 text-sm">—</span>;
      }
    },
    {
      header: 'Hold',
      render: (row) => <span className="text-gray-600">{row.hold_days}d</span>
    },
    {
      header: 'Status',
      render: (row) => (
        <button 
          onClick={() => handleToggleActive(row)}
          className="flex items-center gap-2"
        >
          {row.is_active ? (
            <ToggleRight className="w-6 h-6 text-green-600" />
          ) : (
            <ToggleLeft className="w-6 h-6 text-gray-300" />
          )}
        </button>
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEditModal(row)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteRule(row.rule_id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      <PageHeader title="Commission Rules" subtitle="Configure commission calculation rules by role and programme">
        <ActionButton onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </ActionButton>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Rules" value={rules.length} icon={Settings} color="blue" />
        <StatCard title="Active Rules" value={activeRules} icon={Settings} color="green" />
        <StatCard title="Programme-Specific" value={programSpecificRules} icon={BookOpen} color="purple" />
        <StatCard title="Avg Rate" value={`${avgRate}%`} icon={Settings} color="amber" />
      </div>

      {/* Filters */}
      <FilterBar>
        <SearchInput 
          value={search}
          onChange={setSearch}
          placeholder="Search rules..."
        />
        <SelectFilter
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: '', label: 'All Roles' },
            { value: 'sales_user', label: 'Sales User' },
            { value: 'manager', label: 'Manager' },
            { value: 'rep', label: 'Rep' },
            { value: 'referrer', label: 'Referrer' }
          ]}
        />
      </FilterBar>

      {/* Table */}
      <DataTable 
        columns={columns} 
        data={filteredRules} 
        loading={loading}
        emptyText="No commission rules found"
      />

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal 
          title={editingRule ? 'Edit Commission Rule' : 'Add Commission Rule'} 
          onClose={() => { setShowModal(false); resetForm(); }}
        >
          <div className="space-y-4">
            {/* Basic Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="e.g. Standard Rep Commission"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                rows={2}
                placeholder="Brief description of this rule"
              />
            </div>

            {/* Programme Scope */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Programme</label>
              <select
                value={formData.program_id}
                onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                  formErrors.program_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Global (applies to all programmes)</option>
                {programs.map(p => (
                  <option key={p.id || p.program_id} value={p.id || p.program_id}>
                    {p.program_name || p.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                A programme-specific rule overrides the global rule for that programme only.
              </p>
              {formErrors.program_id && (
                <p className="text-red-500 text-sm mt-1">{formErrors.program_id}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Type *</label>
                <select
                  value={formData.role_type}
                  onChange={(e) => setFormData({ ...formData, role_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="sales_user">Sales User</option>
                  <option value="manager">Manager</option>
                  <option value="rep">Rep</option>
                  <option value="referrer">Referrer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission Type *</label>
                <select
                  value={formData.commission_type}
                  onChange={(e) => setFormData({ ...formData, commission_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.commission_type === 'percentage' ? 'Rate (decimal) *' : 'Fixed Amount (£) *'}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.commission_value}
                  onChange={(e) => setFormData({ ...formData, commission_value: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder={formData.commission_type === 'percentage' ? '0.04 = 4%' : '50.00'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hold Period (days)</label>
                <input
                  type="number"
                  value={formData.hold_days}
                  onChange={(e) => setFormData({ ...formData, hold_days: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Manager Override Bounds */}
            <div className="border-t border-slate-200 pt-4 mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Manager Override Bounds</label>
              <p className="text-xs text-slate-500 mb-3">
                Leave blank to disable manager overrides for this rule.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Min Override %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.manager_override_min}
                    onChange={(e) => setFormData({ ...formData, manager_override_min: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                      formErrors.manager_override_min ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g. 3"
                  />
                  {formErrors.manager_override_min && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.manager_override_min}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Max Override %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.manager_override_max}
                    onChange={(e) => setFormData({ ...formData, manager_override_max: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="e.g. 10"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Sale Amount</label>
                <input
                  type="number"
                  value={formData.minimum_sale_amount}
                  onChange={(e) => setFormData({ ...formData, minimum_sale_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRule}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CommissionRulesPage;
