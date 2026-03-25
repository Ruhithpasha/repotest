import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, RefreshCw } from 'lucide-react';
import { 
  PageHeader, DataTable, SearchInput, SelectFilter, FilterBar, 
  ActionButton, StatusBadge 
} from '../../../components/shared/AdminComponents';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [availableActions, setAvailableActions] = useState([]);
  const [availableEntityTypes, setAvailableEntityTypes] = useState([]);

  const token = localStorage.getItem('token');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 50 });
      if (roleFilter) params.append('role', roleFilter);
      if (actionFilter) params.append('action', actionFilter);
      if (entityFilter) params.append('entity_type', entityFilter);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      
      const res = await fetch(`${API_URL}/api/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  }, [token, page, roleFilter, actionFilter, entityFilter, fromDate, toDate]);

  const fetchFilters = useCallback(async () => {
    try {
      const [actionsRes, typesRes] = await Promise.all([
        fetch(`${API_URL}/api/audit-logs/actions`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/audit-logs/entity-types`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const actions = await actionsRes.json();
      const types = await typesRes.json();
      
      setAvailableActions(Array.isArray(actions) ? actions : []);
      setAvailableEntityTypes(Array.isArray(types) ? types : []);
    } catch (error) {
      console.error('Failed to fetch filters:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (roleFilter) params.append('role', roleFilter);
    if (actionFilter) params.append('action', actionFilter);
    if (entityFilter) params.append('entity_type', entityFilter);
    if (fromDate) params.append('from', fromDate);
    if (toDate) params.append('to', toDate);
    
    window.open(`${API_URL}/api/audit-logs/export?${params}&token=${token}`, '_blank');
  };

  const resetFilters = () => {
    setRoleFilter('');
    setActionFilter('');
    setEntityFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const columns = [
    {
      header: 'Timestamp',
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.created_at).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Actor',
      render: (row) => row.user ? (
        <div>
          <p className="font-medium text-gray-900">{row.user.name}</p>
          <p className="text-xs text-gray-500">{row.user.email}</p>
        </div>
      ) : (
        <span className="text-gray-400">System</span>
      )
    },
    {
      header: 'Role',
      render: (row) => row.actor_role ? (
        <StatusBadge status={row.actor_role} size="small" />
      ) : (
        <span className="text-gray-400">-</span>
      )
    },
    {
      header: 'Action',
      render: (row) => (
        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
          {row.action_type}
        </span>
      )
    },
    {
      header: 'Entity',
      render: (row) => (
        <div>
          <p className="text-sm text-gray-900">{row.entity_type}</p>
          {row.entity_id && (
            <p className="text-xs text-gray-400 font-mono truncate max-w-32">{row.entity_id}</p>
          )}
        </div>
      )
    },
    {
      header: 'Description',
      render: (row) => (
        <p className="text-sm text-gray-600 truncate max-w-xs">{row.description || '-'}</p>
      )
    },
    {
      header: 'IP',
      render: (row) => (
        <span className="text-xs text-gray-400 font-mono">{row.ip_address || '-'}</span>
      )
    }
  ];

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="p-6">
      <PageHeader title="Audit Logs" subtitle={`${total.toLocaleString()} total events`}>
        <ActionButton variant="outline" onClick={resetFilters}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset
        </ActionButton>
        <ActionButton variant="secondary" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </ActionButton>
      </PageHeader>

      {/* Filters */}
      <FilterBar>
        <SelectFilter
          value={roleFilter}
          onChange={(v) => { setRoleFilter(v); setPage(1); }}
          placeholder="All Roles"
          options={[
            { value: 'super_admin', label: 'Super Admin' },
            { value: 'admin', label: 'Admin' },
            { value: 'manager', label: 'Manager' },
            { value: 'sales_user', label: 'Sales User' },
            { value: 'rep', label: 'Rep' },
            { value: 'student', label: 'Student' },
            { value: 'system', label: 'System' }
          ]}
        />
        <SelectFilter
          value={actionFilter}
          onChange={(v) => { setActionFilter(v); setPage(1); }}
          placeholder="All Actions"
          options={availableActions.map(a => ({ value: a, label: a }))}
        />
        <SelectFilter
          value={entityFilter}
          onChange={(v) => { setEntityFilter(v); setPage(1); }}
          placeholder="All Entities"
          options={availableEntityTypes.map(t => ({ value: t, label: t }))}
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="From"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="To"
          />
        </div>
      </FilterBar>

      {/* Logs Table */}
      <DataTable 
        columns={columns} 
        data={logs} 
        loading={loading}
        emptyMessage="No audit logs found for the selected filters."
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-500">
            Showing {((page - 1) * 50) + 1} to {Math.min(page * 50, total)} of {total} entries
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
