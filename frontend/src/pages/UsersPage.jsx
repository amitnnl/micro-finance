import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  UserCheck, 
  Plus, 
  Loader2, 
  ShieldCheck, 
  Mail, 
  Phone, 
  UserPlus, 
  X,
  Shield,
  Trash2,
  AlertTriangle,
  Lock,
  UserX,
  CheckCircle2,
  Info
} from 'lucide-react';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff'
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('users');
      if (res.success) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      console.error('Error fetching registered users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('users', formData);
      if (res.success) {
        setShowModal(false);
        setFormData({ name: '', email: '', phone: '', password: '', role: 'staff' });
        fetchUsers();
      }
    } catch (err) {
      alert(err.message || 'Error adding staff user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (usr) => {
    if (usr.id === currentUser?.id) {
      alert('You cannot remove your own active administrator account.');
      return;
    }
    const isPrimaryAdmin = ['admin@microfinance.com', 'admin@kaspr.com'].includes(usr.email?.toLowerCase());
    if (isPrimaryAdmin) {
      alert('The primary system administrator account cannot be deleted.');
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to permanently remove user account: ${usr.name} (${usr.email})?`);
    if (!confirmDelete) return;

    setActionLoadingId(usr.id);
    try {
      const res = await api.post('users/delete', { id: usr.id });
      if (res.success) {
        fetchUsers();
      }
    } catch (err) {
      alert(err.message || 'Failed to remove user');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = async (usr) => {
    if (usr.id === currentUser?.id) {
      alert('You cannot deactivate your own active session account.');
      return;
    }
    const nextStatus = usr.status === 'inactive' ? 'active' : 'inactive';
    setActionLoadingId(usr.id);
    try {
      const res = await api.post('users/status', { id: usr.id, status: nextStatus });
      if (res.success) {
        fetchUsers();
      }
    } catch (err) {
      alert(err.message || 'Failed to update user status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getRoleBadge = (rawRole) => {
    const r = (rawRole || 'staff').toLowerCase();
    if (r === 'admin' || r.includes('admin')) {
      return {
        label: 'System Admin',
        color: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
      };
    }
    if (r === 'manager' || r.includes('manager')) {
      return {
        label: 'Branch Manager',
        color: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
      };
    }
    return {
      label: 'Field Staff',
      color: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
    };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="teal-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-teal-600">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Staff & Access Control (RBAC)</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Manage operators, grant role-based permissions (Maker / Checker / Admin), and supervise user accounts.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="teal-btn cursor-pointer whitespace-nowrap"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add New Account</span>
        </button>
      </div>

      {/* Role Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs">
          <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-bold mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Field Staff (Maker)</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Lead sourcing, initial loan application form filling, document upload, and field EMI cash receipting. Cannot sanction or disburse loans.
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20 text-xs">
          <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-300 font-bold mb-1">
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
            <span>Branch Manager (Checker)</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Credit assessment, borrower KYC document verification, and official Sanction (Approve or Reject). Cannot manage users or disburse capital.
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 text-xs">
          <div className="flex items-center space-x-2 text-purple-800 dark:text-purple-300 font-bold mb-1">
            <span className="h-2 w-2 rounded-full bg-purple-500"></span>
            <span>Administrator (Head Office)</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Full executive powers: Fund disbursement, transaction UTR recording, staff account add/remove, P&L audit reports, and company settings.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="teal-card overflow-hidden">
        <div className="p-3 sm:p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Authorized Users Directory</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Manage credentials, roles, and active statuses.</p>
          </div>
          <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
            {users.length} Registered Accounts
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400">
            <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mb-2" />
            <p className="text-xs font-bold">Loading Registered Accounts...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3.5">User ID</th>
                  <th className="py-2.5 px-3.5">Name</th>
                  <th className="py-2.5 px-3.5">Email / Phone</th>
                  <th className="py-2.5 px-3.5">Assigned Role</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {users.length > 0 ? (
                  users.map((usr) => {
                    const badge = getRoleBadge(usr.role);
                    const isSelf = usr.id === currentUser?.id;
                    const isPrimary = ['admin@microfinance.com', 'admin@kaspr.com'].includes(usr.email?.toLowerCase());
                    const isInactive = usr.status === 'inactive';

                    return (
                      <tr key={usr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-2 px-3.5 font-mono font-bold text-slate-400">#USR-{String(usr.id).padStart(3, '0')}</td>
                        <td className="py-2 px-3.5">
                          <div className="font-black text-slate-900 dark:text-white uppercase flex items-center space-x-1.5">
                            <span>{usr.name}</span>
                            {isSelf && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-extrabold rounded-md border border-teal-300">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3.5 text-slate-700 dark:text-slate-200">
                          <div>{usr.email}</div>
                          {usr.phone && <div className="text-[10px] text-slate-400">{usr.phone}</div>}
                        </td>
                        <td className="py-2 px-3.5 font-extrabold">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border ${badge.color}`}>
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-2 px-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            isInactive 
                              ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800' 
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          }`}>
                            {isInactive ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                        <td className="py-2 px-3.5 text-right space-x-1 whitespace-nowrap">
                          {!isSelf && !isPrimary ? (
                            <>
                              <button
                                onClick={() => handleToggleStatus(usr)}
                                disabled={actionLoadingId === usr.id}
                                className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] font-semibold border cursor-pointer transition-colors ${
                                  isInactive 
                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                }`}
                                title={isInactive ? 'Activate Account' : 'Deactivate Account'}
                              >
                                {isInactive ? 'Activate' : 'Deactivate'}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(usr)}
                                disabled={actionLoadingId === usr.id}
                                className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 cursor-pointer transition-colors"
                                title="Remove User Account"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Remove</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              Protected
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400 font-semibold">
                      No staff users registered.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3">
          <div className="navy-card w-full max-w-md overflow-hidden">
            <div className="bg-slate-950 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                <h3 className="font-black text-base">Add New Authorized Account</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-4 space-y-3 text-xs text-slate-900 dark:text-white">
              <div>
                <label className="block font-bold uppercase tracking-wider mb-1 text-[11px]">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full navy-input"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider mb-1 text-[11px]">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="ramesh@microfinance.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full navy-input"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider mb-1 text-[11px]">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full navy-input"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider mb-1 text-[11px]">Temporary Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full navy-input"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider mb-1 text-[11px]">Access Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full navy-input font-bold"
                >
                  <option value="staff">Field Staff (Maker: Leads, Loan Form Filling, Field EMI)</option>
                  <option value="manager">Branch Manager (Checker: KYC Review, Loan Sanction/Approval)</option>
                  <option value="admin">System Administrator (Full Disbursal, Users, P&L, Settings)</option>
                </select>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-700 dark:text-slate-200">Note: </span>
                {formData.role === 'staff' && 'Field staff will only access Leads, Loan Entry, and EMI Receipting. They cannot approve or disburse.'}
                {formData.role === 'manager' && 'Branch managers can verify documents and grant Sanction (Approve/Reject), but cannot disburse or manage users.'}
                {formData.role === 'admin' && 'Administrators have master authority to disburse funds, manage users, and review financial P&L.'}
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-[36px] px-3.5 rounded-[8px] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="emerald-btn cursor-pointer"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Register Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
