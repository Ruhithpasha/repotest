import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, ChevronDown, ChevronUp, UserPlus, X } from 'lucide-react';
import { 
  PageHeader, StatCard, DataTable, SearchInput, SelectFilter, FilterBar, 
  ActionButton, Modal, StatusBadge, EmptyState 
} from '../../../components/shared/AdminComponents';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ManagersPage = () => {
  const [managers, setManagers] = useState([]);
  const [stats, setStats] = useState({ total_managers: 0, total_reps: 0, avg_reps_per_manager: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedManager, setExpandedManager] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedManager, setSelectedManager] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableReps, setAvailableReps] = useState([]);
  const [newManagerUserId, setNewManagerUserId] = useState('');
  const [commissionOverride, setCommissionOverride] = useState('');

  const token = localStorage.getItem('token');

  const fetchManagers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/managers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setManagers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch managers:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/managers/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, [token]);

  const fetchAvailableUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const users = Array.isArray(data) ? data : data.users || [];
      // Filter out users who are already managers
      const managerIds = managers.map(m => m.user_id);
      setAvailableUsers(users.filter(u => 
        ['rep', 'sales_user'].includes(u.role) && !managerIds.includes(u.user_id)
      ));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, [token, managers]);

  const fetchAvailableReps = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const users = Array.isArray(data) ? data : data.users || [];
      setAvailableReps(users.filter(u => 
        ['rep', 'sales_user'].includes(u.role) && !u.manager_id
      ));
    } catch (error) {
      console.error('Failed to fetch reps:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchManagers();
    fetchStats();
  }, [fetchManagers, fetchStats]);

  const handleCreateManager = async () => {
    if (!newManagerUserId) return;
    
    try {
      const res = await fetch(`${API_URL}/api/managers`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          user_id: newManagerUserId,
          commission_override: commissionOverride ? parseFloat(commissionOverride) : null
        })
      });
      
      if (res.ok) {
        setShowCreateModal(false);
        setNewManagerUserId('');
        setCommissionOverride('');
        fetchManagers();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to create manager:', error);
    }
  };

  const handleAssignReps = async (repIds) => {
    if (!selectedManager || repIds.length === 0) return;
    
    try {
      const res = await fetch(`${API_URL}/api/managers/${selectedManager.manager_id}/reps`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ addRepIds: repIds })
      });
      
      if (res.ok) {
        setShowAssignModal(false);
        setSelectedManager(null);
        fetchManagers();
      }
    } catch (error) {
      console.error('Failed to assign reps:', error);
    }
  };

  const handleDeactivate = async (managerId) => {
    if (!window.confirm('Are you sure you want to deactivate this manager?')) return;
    
    try {
      await fetch(`${API_URL}/api/managers/${managerId}/deactivate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchManagers();
      fetchStats();
    } catch (error) {
      console.error('Failed to deactivate manager:', error);
    }
  };

  const filteredManagers = managers.filter(m => {
    if (search && !m.user?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === 'active' && !m.is_active) return false;
    if (statusFilter === 'inactive' && m.is_active) return false;
    return true;
  });

  const columns = [
    {
      header: 'Manager',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.user?.name || 'N/A'}</p>
            <p className="text-xs text-gray-500">{row.user?.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} />
    },
    {
      header: 'Reps Assigned',
      render: (row) => (
        <span className="font-medium text-gray-900">{row.rep_count || 0}</span>
      )
    },
    {
      header: 'Commission Override',
      render: (row) => row.commission_override 
        ? <span className="text-green-600 font-medium">{row.commission_override}%</span>
        : <span className="text-gray-400">Default</span>
    },
    {
      header: 'Total Earned',
      render: (row) => (
        <span className="font-medium text-gray-900">
          ${(row.total_commission_paid || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedManager(row);
              setShowAssignModal(true);
              fetchAvailableReps();
            }}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Assign Reps"
          >
            <UserPlus className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpandedManager(expandedManager === row.manager_id ? null : row.manager_id);
            }}
            className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
          >
            {expandedManager === row.manager_id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      <PageHeader title="Managers" subtitle="Manage sales hierarchy and rep assignments">
        <ActionButton 
          onClick={() => {
            setShowCreateModal(true);
            fetchAvailableUsers();
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Manager
        </ActionButton>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard 
          title="Total Managers" 
          value={stats.total_managers} 
          icon={Users} 
          color="blue" 
        />
        <StatCard 
          title="Total Reps Assigned" 
          value={stats.total_reps} 
          icon={Users} 
          color="green" 
        />
        <StatCard 
          title="Avg Reps per Manager" 
          value={stats.avg_reps_per_manager} 
          icon={Users} 
          color="purple" 
        />
      </div>

      {/* Filters */}
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search managers..." />
        <SelectFilter
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="All Status"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
          ]}
        />
      </FilterBar>

      {/* Managers Table */}
      <DataTable 
        columns={columns} 
        data={filteredManagers} 
        loading={loading}
        emptyMessage="No managers found. Add your first manager to get started."
      />

      {/* Create Manager Modal */}
      <Modal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        title="Add New Manager"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select User</label>
            <select
              value={newManagerUserId}
              onChange={(e) => setNewManagerUserId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a user to promote...</option>
              {availableUsers.map(u => (
                <option key={u.user_id} value={u.user_id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Commission Override (%) <span className="text-gray-400 font-normal">- Optional</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={commissionOverride}
              onChange={(e) => setCommissionOverride(e.target.value)}
              placeholder="Leave blank for default rules"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <ActionButton variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </ActionButton>
            <ActionButton onClick={handleCreateManager} disabled={!newManagerUserId}>
              Create Manager
            </ActionButton>
          </div>
        </div>
      </Modal>

      {/* Assign Reps Modal */}
      <Modal 
        isOpen={showAssignModal} 
        onClose={() => setShowAssignModal(false)} 
        title={`Assign Reps to ${selectedManager?.user?.name || 'Manager'}`}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Select reps to assign to this manager. Only unassigned reps are shown.
          </p>
          {availableReps.length === 0 ? (
            <EmptyState 
              title="No Available Reps" 
              description="All reps are already assigned to managers."
            />
          ) : (
            <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
              {availableReps.map(rep => (
                <label 
                  key={rep.user_id} 
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    data-rep-id={rep.user_id}
                  />
                  <div>
                    <p className="font-medium text-gray-900">{rep.name}</p>
                    <p className="text-xs text-gray-500">{rep.email}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <ActionButton variant="secondary" onClick={() => setShowAssignModal(false)}>
              Cancel
            </ActionButton>
            <ActionButton 
              onClick={() => {
                const checked = document.querySelectorAll('[data-rep-id]:checked');
                const ids = Array.from(checked).map(el => el.dataset.repId);
                handleAssignReps(ids);
              }}
              disabled={availableReps.length === 0}
            >
              Assign Selected
            </ActionButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManagersPage;
