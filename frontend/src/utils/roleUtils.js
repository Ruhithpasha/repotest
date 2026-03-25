/**
 * Role Labels and Colors Utility
 * Consistent role display across the application
 */

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  rep: 'Sales Rep',
  sales_user: 'Sales Rep',
  student: 'Delegate'
};

export const ROLE_COLORS = {
  super_admin: { bg: 'bg-purple-100', text: 'text-purple-700', badge: 'bg-purple-500' },
  admin: { bg: 'bg-blue-100', text: 'text-blue-700', badge: 'bg-blue-500' },
  manager: { bg: 'bg-indigo-100', text: 'text-indigo-700', badge: 'bg-indigo-500' },
  rep: { bg: 'bg-teal-100', text: 'text-teal-700', badge: 'bg-teal-500' },
  sales_user: { bg: 'bg-teal-100', text: 'text-teal-700', badge: 'bg-teal-500' },
  student: { bg: 'bg-green-100', text: 'text-green-700', badge: 'bg-green-500' }
};

export const getRoleLabel = (role) => {
  return ROLE_LABELS[role] || role?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
};

export const getRoleColor = (role) => {
  return ROLE_COLORS[role] || { bg: 'bg-slate-100', text: 'text-slate-600', badge: 'bg-slate-500' };
};

export const RoleBadge = ({ role, className = '' }) => {
  const colors = getRoleColor(role);
  const label = getRoleLabel(role);
  return (
    <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${colors.bg} ${colors.text} ${className}`}>
      {label}
    </span>
  );
};

export default { ROLE_LABELS, ROLE_COLORS, getRoleLabel, getRoleColor, RoleBadge };
