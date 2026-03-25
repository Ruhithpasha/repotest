import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Download, TrendingUp, Users, DollarSign, ArrowRight } from 'lucide-react';
import { 
  PageHeader, StatCard, SelectFilter, FilterBar, ActionButton 
} from '../../../components/shared/AdminComponents';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('enrollments');
  const [dateRange, setDateRange] = useState('30');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);

  const token = localStorage.getItem('token');

  const tabs = [
    { id: 'enrollments', label: 'Enrollments', icon: Users },
    { id: 'commissions', label: 'Commissions', icon: DollarSign },
    { id: 'payouts', label: 'Payouts', icon: DollarSign },
    { id: 'lead-funnel', label: 'Lead Funnel', icon: ArrowRight },
    { id: 'referrals', label: 'Referrals', icon: TrendingUp }
  ];

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      
      const res = await fetch(`${API_URL}/api/reports/${activeTab}?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setReportData(data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  }, [token, activeTab, fromDate, toDate]);

  useEffect(() => {
    // Set default date range
    if (dateRange && !fromDate && !toDate) {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - parseInt(dateRange));
      setFromDate(from.toISOString().split('T')[0]);
      setToDate(to.toISOString().split('T')[0]);
    }
  }, [dateRange]);

  useEffect(() => {
    if (fromDate && toDate) {
      fetchReport();
    }
  }, [fetchReport, fromDate, toDate]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (fromDate) params.append('from', fromDate);
    if (toDate) params.append('to', toDate);
    window.open(`${API_URL}/api/reports/${activeTab}/export?${params}`, '_blank');
  };

  const handleDateRangeChange = (days) => {
    setDateRange(days);
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - parseInt(days));
    setFromDate(from.toISOString().split('T')[0]);
    setToDate(to.toISOString().split('T')[0]);
  };

  const renderSummaryCards = () => {
    if (!reportData?.summary) return null;
    const summary = reportData.summary;

    switch (activeTab) {
      case 'enrollments':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard title="Total Enrolled" value={summary.total_enrolled || 0} icon={Users} color="green" trend={summary.vs_last_period_percent} />
            <StatCard title="This Period" value={summary.this_period || 0} icon={Users} color="blue" />
            <StatCard title="Revenue" value={`$${((summary.total_enrolled || 0) * 6250).toLocaleString()}`} icon={DollarSign} color="purple" />
          </div>
        );
      case 'commissions':
        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Generated" value={`$${(summary.total_generated || 0).toLocaleString()}`} icon={DollarSign} color="blue" />
            <StatCard title="Approved" value={`$${(summary.total_approved || 0).toLocaleString()}`} icon={DollarSign} color="amber" />
            <StatCard title="Paid" value={`$${(summary.total_paid || 0).toLocaleString()}`} icon={DollarSign} color="green" />
            <StatCard title="Avg per Rep" value={`$${summary.avg_per_rep || 0}`} icon={Users} color="purple" />
          </div>
        );
      case 'payouts':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard title="Total Paid Out" value={`$${(summary.total_paid_out || 0).toLocaleString()}`} icon={DollarSign} color="green" />
            <StatCard title="Pending" value={`$${(summary.pending_amount || 0).toLocaleString()}`} icon={DollarSign} color="amber" />
            <StatCard title="Avg Payout Size" value={`$${summary.avg_payout_size || 0}`} icon={DollarSign} color="blue" />
          </div>
        );
      case 'lead-funnel':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard title="Total Leads" value={summary.total_leads || 0} icon={Users} color="blue" />
            <StatCard title="Conversion Rate" value={`${summary.conversion_rate || 0}%`} icon={TrendingUp} color="green" />
            <StatCard title="Avg Days to Enroll" value={summary.avg_days_to_enroll || 0} icon={BarChart3} color="purple" />
          </div>
        );
      case 'referrals':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard title="Total Referrals" value={summary.total_referrals || 0} icon={Users} color="blue" />
            <StatCard title="Converted" value={summary.converted || 0} icon={TrendingUp} color="green" />
            <StatCard title="Bonus Paid Out" value={`$${(summary.bonus_paid_out || 0).toLocaleString()}`} icon={DollarSign} color="purple" />
          </div>
        );
      default:
        return null;
    }
  };

  const renderChart = () => {
    if (!reportData?.chart_data || reportData.chart_data.length === 0) {
      return (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center text-gray-500">
          No chart data available for the selected period
        </div>
      );
    }

    // Simple bar chart visualization
    const maxValue = Math.max(...reportData.chart_data.map(d => d.count || d.amount || d.revenue || 0));
    
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Montserrat' }}>
          {activeTab === 'lead-funnel' ? 'Funnel Breakdown' : 'Trend Over Time'}
        </h3>
        <div className="space-y-3">
          {reportData.chart_data.slice(0, 10).map((item, i) => {
            const value = item.count || item.amount || item.revenue || 0;
            const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
            const label = item.date || item.stage || item.status || item.type || item.month || `Item ${i + 1}`;
            
            return (
              <div key={i} className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-32 truncate">{label}</span>
                <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-lg transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-20 text-right">
                  {typeof value === 'number' && value > 100 ? `$${value.toLocaleString()}` : value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!reportData?.table_data || reportData.table_data.length === 0) {
      return null;
    }

    const getColumns = () => {
      switch (activeTab) {
        case 'enrollments':
          return ['Rep Name', 'Enrollments', 'Revenue'];
        case 'commissions':
          return ['Rep/Manager', 'Role', 'Amount', 'Status'];
        case 'payouts':
          return ['Recipient', 'Role', 'Amount', 'Status', 'Date'];
        case 'lead-funnel':
          return ['Stage', 'Count', '% of Total', 'Drop-off %'];
        case 'referrals':
          return ['Referrer', 'Role', 'Referrals', 'Converted', 'Bonus'];
        default:
          return [];
      }
    };

    const formatRow = (row) => {
      switch (activeTab) {
        case 'enrollments':
          return [row.rep_name, row.enrollments, `$${(row.revenue || 0).toLocaleString()}`];
        case 'commissions':
          return [row.rep_name, row.role, `$${(row.amount || 0).toLocaleString()}`, row.status];
        case 'payouts':
          return [row.recipient, row.role, `$${(row.amount || 0).toLocaleString()}`, row.status, row.date ? new Date(row.date).toLocaleDateString() : '-'];
        case 'lead-funnel':
          return [row.stage, row.count, `${row.percent_of_total}%`, `${row.drop_off_percent}%`];
        case 'referrals':
          return [row.referrer_name, row.role, row.referrals, row.converted, `$${(row.bonus || 0).toLocaleString()}`];
        default:
          return [];
      }
    };

    const columns = getColumns();

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {columns.map((col, i) => (
                  <th key={i} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reportData.table_data.slice(0, 20).map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {formatRow(row).map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-6 py-4 text-sm text-gray-900">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <PageHeader title="Reports" subtitle="Analytics and insights across all metrics">
        <ActionButton variant="secondary" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </ActionButton>
      </PageHeader>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-100 overflow-x-auto pb-px">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.id 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Date Filters */}
      <FilterBar>
        <SelectFilter
          value={dateRange}
          onChange={handleDateRangeChange}
          placeholder="Select period"
          options={[
            { value: '7', label: 'Last 7 days' },
            { value: '30', label: 'Last 30 days' },
            { value: '90', label: 'Last 90 days' },
            { value: '180', label: 'Last 6 months' },
            { value: '365', label: 'Last year' }
          ]}
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setDateRange(''); }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setDateRange(''); }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </FilterBar>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {renderSummaryCards()}

          {/* Chart */}
          {renderChart()}

          {/* Table */}
          {renderTable()}
        </>
      )}
    </div>
  );
};

export default ReportsPage;
