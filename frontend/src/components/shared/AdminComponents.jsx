import React from 'react';

/**
 * StatusBadge - Consistent status display across the app
 */
export const StatusBadge = ({ status, size = 'default' }) => {
  const statusConfig = {
    // Lead statuses
    new: { label: 'New', bg: 'bg-blue-100', text: 'text-blue-700' },
    contacted: { label: 'Contacted', bg: 'bg-indigo-100', text: 'text-indigo-700' },
    interested: { label: 'Interested', bg: 'bg-purple-100', text: 'text-purple-700' },
    application_started: { label: 'Application', bg: 'bg-amber-100', text: 'text-amber-700' },
    enrolled: { label: 'Enrolled', bg: 'bg-green-100', text: 'text-green-700' },
    paid_in_full: { label: 'Paid', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    // Commission statuses
    pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700' },
    pending_validation: { label: 'Validating', bg: 'bg-amber-100', text: 'text-amber-700' },
    pending_approval: { label: 'Awaiting Approval', bg: 'bg-orange-100', text: 'text-orange-700' },
    approved: { label: 'Approved', bg: 'bg-green-100', text: 'text-green-700' },
    payable: { label: 'Payable', bg: 'bg-teal-100', text: 'text-teal-700' },
    paid: { label: 'Paid', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    cancelled: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-700' },
    rejected: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-700' },
    // Payout statuses
    pending_review: { label: 'Pending Review', bg: 'bg-amber-100', text: 'text-amber-700' },
    processing: { label: 'Processing', bg: 'bg-blue-100', text: 'text-blue-700' },
    // Fraud alert statuses
    open: { label: 'Open', bg: 'bg-red-100', text: 'text-red-700' },
    under_review: { label: 'Under Review', bg: 'bg-amber-100', text: 'text-amber-700' },
    resolved: { label: 'Resolved', bg: 'bg-green-100', text: 'text-green-700' },
    dismissed: { label: 'Dismissed', bg: 'bg-gray-100', text: 'text-gray-700' },
    // User statuses
    active: { label: 'Active', bg: 'bg-green-100', text: 'text-green-700' },
    inactive: { label: 'Inactive', bg: 'bg-gray-100', text: 'text-gray-700' },
    // Severity
    high: { label: 'High', bg: 'bg-red-100', text: 'text-red-700' },
    medium: { label: 'Medium', bg: 'bg-amber-100', text: 'text-amber-700' },
    low: { label: 'Low', bg: 'bg-blue-100', text: 'text-blue-700' }
  };

  const config = statusConfig[status?.toLowerCase()] || { label: status, bg: 'bg-gray-100', text: 'text-gray-700' };
  const sizeClasses = size === 'small' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${config.bg} ${config.text} ${sizeClasses}`}>
      {config.label}
    </span>
  );
};

/**
 * StatCard - KPI display card
 */
export const StatCard = ({ title, value, subValue, icon: Icon, trend, color = 'blue' }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
    purple: 'text-purple-600 bg-purple-50'
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          {subValue && <p className="mt-1 text-sm text-gray-500">{subValue}</p>}
          {trend !== undefined && (
            <p className={`mt-1 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last period
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * PageHeader - Consistent page header
 */
export const PageHeader = ({ title, subtitle, children }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
};

/**
 * DataTable - Reusable table component
 */
export const DataTable = ({ columns, data, loading, emptyMessage = 'No data found', onRowClick }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map((col, i) => (
                <th key={i} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr 
                  key={rowIndex} 
                  className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className="px-6 py-4 text-sm text-gray-900">
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * FilterBar - Search and filter controls
 */
export const FilterBar = ({ children }) => {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {children}
    </div>
  );
};

/**
 * SearchInput - Search box with icon
 */
export const SearchInput = ({ value, onChange, placeholder = 'Search...' }) => {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
      />
    </div>
  );
};

/**
 * SelectFilter - Dropdown filter
 */
export const SelectFilter = ({ value, onChange, options, placeholder }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

/**
 * Modal - Reusable modal dialog
 */
export const Modal = ({ isOpen = true, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        <div className={`relative inline-block w-full ${sizeClasses[size]} p-6 overflow-hidden text-left align-middle bg-white shadow-xl rounded-2xl`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {title}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * ActionButton - Primary action button
 */
export const ActionButton = ({ children, onClick, variant = 'primary', size = 'default', disabled = false, loading = false }) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-green-600 text-white hover:bg-green-700',
    outline: 'border border-gray-200 text-gray-700 hover:bg-gray-50'
  };

  const sizes = {
    small: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2 text-sm',
    large: 'px-6 py-3 text-base'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium rounded-xl transition-colors ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{ fontFamily: 'Montserrat, sans-serif' }}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

/**
 * EmptyState - Empty state display
 */
export const EmptyState = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
      {Icon && (
        <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-gray-400" />
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
      {action}
    </div>
  );
};
