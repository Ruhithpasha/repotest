import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, UserPlus, ChevronRight, AlertCircle, Check } from 'lucide-react';
import { 
  PageHeader, StatCard, Modal
} from '../../../components/shared/AdminComponents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TeamsPage = () => {
  const [managers, setManagers] = useState([]);
  const [reps, setReps] = useState([]);
  const [stats, setStats] = useState({ totalManagers: 0, totalReps: 0, unassignedReps: 0 });
  const [loading, setLoading] = useState(true);
  
  // Selection states
  const [selectedManager, setSelectedManager] = useState(null); // null = "All Reps"
  const [managerSearch, setManagerSearch] = useState('');
  const [repSearch, setRepSearch] = useState('');
  const [repFilter, setRepFilter] = useState('all'); // all | assigned | unassigned
  
  // Modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRep, setSelectedRep] = useState(null);
  const [assigningManagerId, setAssigningManagerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Bulk selection
  const [selectedRepIds, setSelectedRepIds] = useState([]);
  const [bulkManagerId, setBulkManagerId] = useState('');

  const token = localStorage.getItem('token');

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/team-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, [token]);

  const fetchManagers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/managers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setManagers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch managers:', error);
    }
  }, [token]);

  const fetchReps = useCallback(async () => {
    try {
      let url = `${API_URL}/api/admin/users/reps`;
      const params = new URLSearchParams();
      
      if (selectedManager) {
        params.append('manager_id', selectedManager.user_id);
      }
      if (repFilter === 'unassigned') {
        params.append('unassigned', 'true');
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setReps(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch reps:', error);
    }
  }, [token, selectedManager, repFilter]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchManagers(), fetchReps()]);
      setLoading(false);
    };
    loadData();
  }, [fetchStats, fetchManagers, fetchReps]);

  const refreshData = async () => {
    await Promise.all([fetchStats(), fetchManagers(), fetchReps()]);
    setSelectedRepIds([]);
  };

  // Filter managers by search
  const filteredManagers = managers.filter(m => 
    m.name.toLowerCase().includes(managerSearch.toLowerCase()) ||
    m.email.toLowerCase().includes(managerSearch.toLowerCase())
  );

  // Filter reps by search and assignment
  let filteredReps = reps.filter(r => 
    r.name.toLowerCase().includes(repSearch.toLowerCase()) ||
    r.email.toLowerCase().includes(repSearch.toLowerCase())
  );
  
  if (repFilter === 'assigned' && !selectedManager) {
    filteredReps = filteredReps.filter(r => r.manager_id);
  } else if (repFilter === 'unassigned' && !selectedManager) {
    filteredReps = filteredReps.filter(r => !r.manager_id);
  }

  const openAssignModal = (rep) => {
    setSelectedRep(rep);
    setAssigningManagerId(rep.manager_id || '');
    setShowAssignModal(true);
  };

  const handleAssignManager = async () => {
    if (!selectedRep) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/users/${selectedRep.user_id}/assign-manager`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            manager_id: assigningManagerId || null 
          })
        }
      );

      if (res.ok) {
        const data = await res.json();
        const managerName = data.manager_name || 'none';
        toast.success(
          assigningManagerId 
            ? `${selectedRep.name} assigned to ${managerName}` 
            : `${selectedRep.name} unassigned from manager`
        );
        setShowAssignModal(false);
        setSelectedRep(null);
        refreshData();
      } else {
        const data = await res.json();
        toast.error(data.detail || 'Failed to assign manager');
      }
    } catch (error) {
      console.error('Error assigning manager:', error);
      toast.error('Failed to assign manager');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedRepIds.length === 0) {
      toast.error('Select at least one rep');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/users/bulk-assign-manager`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            rep_ids: selectedRepIds,
            manager_id: bulkManagerId || null 
          })
        }
      );

      if (res.ok) {
        const data = await res.json();
        toast.success(
          bulkManagerId 
            ? `${data.updated_count} reps assigned to ${data.manager_name}` 
            : `${data.updated_count} reps unassigned`
        );
        setBulkManagerId('');
        refreshData();
      } else {
        const data = await res.json();
        toast.error(data.detail || 'Failed to bulk assign');
      }
    } catch (error) {
      console.error('Error bulk assigning:', error);
      toast.error('Failed to bulk assign');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRepSelection = (repId) => {
    setSelectedRepIds(prev => 
      prev.includes(repId) 
        ? prev.filter(id => id !== repId) 
        : [...prev, repId]
    );
  };

  const toggleAllReps = () => {
    if (selectedRepIds.length === filteredReps.length) {
      setSelectedRepIds([]);
    } else {
      setSelectedRepIds(filteredReps.map(r => r.user_id));
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="teams-page">
      <PageHeader 
        title="Teams" 
        subtitle="Assign reps to managers for commission chain"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard 
          title="Total Managers" 
          value={stats.totalManagers} 
          icon={Users} 
          color="blue" 
        />
        <StatCard 
          title="Total Reps" 
          value={stats.totalReps} 
          icon={Users} 
          color="green" 
        />
        <div className={`bg-white p-5 rounded-xl border ${stats.unassignedReps > 0 ? 'border-red-200' : 'border-slate-200'} shadow-sm`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stats.unassignedReps > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
              <AlertCircle size={20} />
            </div>
          </div>
          <p className={`font-heading text-2xl ${stats.unassignedReps > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {stats.unassignedReps}
          </p>
          <p className="text-sm text-slate-500">Unassigned Reps</p>
        </div>
      </div>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANEL - Managers List */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-heading text-lg text-slate-900 mb-3">Managers</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={managerSearch}
                onChange={(e) => setManagerSearch(e.target.value)}
                placeholder="Search managers..."
                className="pl-9"
              />
            </div>
          </div>
          
          <div className="max-h-[500px] overflow-y-auto">
            {/* All Reps Option */}
            <button
              onClick={() => { setSelectedManager(null); setRepFilter('all'); }}
              className={`w-full px-4 py-3 flex items-center justify-between border-b border-slate-50 transition-colors ${
                selectedManager === null ? 'bg-amber-50 border-l-4 border-l-amber-500' : 'hover:bg-slate-50'
              }`}
            >
              <div className="text-left">
                <p className="font-heading text-sm text-slate-900">All Reps</p>
                <p className="text-xs text-slate-500">{stats.totalReps} total</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {filteredManagers.map(manager => (
              <button
                key={manager.user_id}
                onClick={() => { setSelectedManager(manager); setRepFilter('all'); }}
                className={`w-full px-4 py-3 flex items-center justify-between border-b border-slate-50 transition-colors ${
                  selectedManager?.user_id === manager.user_id ? 'bg-amber-50 border-l-4 border-l-amber-500' : 'hover:bg-slate-50'
                }`}
              >
                <div className="text-left">
                  <p className="font-heading text-sm text-slate-900">{manager.name}</p>
                  <p className="text-xs text-slate-500">{manager.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                    {manager.rep_count} reps
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            ))}

            {filteredManagers.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-sm">
                No managers found
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - Reps List */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-heading text-lg text-slate-900 mb-3">
              {selectedManager ? `Reps under ${selectedManager.name}` : 'All Reps'}
            </h3>
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={repSearch}
                  onChange={(e) => setRepSearch(e.target.value)}
                  placeholder="Search reps..."
                  className="pl-9"
                />
              </div>
              {!selectedManager && (
                <div className="flex gap-1 bg-gray-50 p-1 rounded-lg">
                  {['all', 'assigned', 'unassigned'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setRepFilter(filter)}
                      className={`px-3 py-1.5 text-xs font-heading rounded transition-colors ${
                        repFilter === filter 
                          ? 'bg-white text-slate-900 shadow-sm' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reps Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-slate-100">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRepIds.length === filteredReps.length && filteredReps.length > 0}
                      onChange={toggleAllReps}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-heading text-slate-500 uppercase">Rep Name</th>
                  <th className="text-left px-4 py-3 text-xs font-heading text-slate-500 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-heading text-slate-500 uppercase">Assigned Manager</th>
                  <th className="text-left px-4 py-3 text-xs font-heading text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReps.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      No reps found
                    </td>
                  </tr>
                ) : (
                  filteredReps.map(rep => (
                    <tr key={rep.user_id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRepIds.includes(rep.user_id)}
                          onChange={() => toggleRepSelection(rep.user_id)}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-900">{rep.name}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{rep.email}</td>
                      <td className="px-4 py-3">
                        {rep.manager_name ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                            <Check className="w-3 h-3" />
                            {rep.manager_name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                            <AlertCircle className="w-3 h-3" />
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAssignModal(rep)}
                          className="text-xs"
                          data-testid={`assign-btn-${rep.user_id}`}
                        >
                          <UserPlus className="w-3 h-3 mr-1" />
                          {rep.manager_id ? 'Change Manager' : 'Assign Manager'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedRepIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-4">
          <span className="text-sm font-heading">{selectedRepIds.length} reps selected</span>
          <select
            value={bulkManagerId}
            onChange={(e) => setBulkManagerId(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm"
          >
            <option value="">Remove assignment</option>
            {managers.map(m => (
              <option key={m.user_id} value={m.user_id}>{m.name}</option>
            ))}
          </select>
          <Button
            onClick={handleBulkAssign}
            disabled={submitting}
            className="bg-amber-500 hover:bg-amber-600 text-white text-sm"
          >
            {submitting ? 'Applying...' : 'Apply'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setSelectedRepIds([])}
            className="text-slate-400 hover:text-white text-sm"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Assign Manager Modal */}
      {showAssignModal && selectedRep && (
        <Modal
          title="Assign Manager"
          onClose={() => { setShowAssignModal(false); setSelectedRep(null); }}
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-sm text-slate-500">Rep</p>
              <p className="font-heading text-slate-900">{selectedRep.name}</p>
              <p className="text-sm text-slate-500">{selectedRep.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Manager</label>
              <select
                value={assigningManagerId}
                onChange={(e) => setAssigningManagerId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">Remove assignment</option>
                {managers.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => { setShowAssignModal(false); setSelectedRep(null); }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignManager}
                disabled={submitting}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {submitting ? 'Saving...' : 'Save Assignment'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TeamsPage;
