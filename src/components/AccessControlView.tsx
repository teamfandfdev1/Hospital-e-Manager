import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  UserPlus, 
  User as UserIcon, 
  Lock, 
  Check, 
  Building2, 
  Mail, 
  KeyRound, 
  RefreshCw, 
  Search,
  ShoppingCart,
  CreditCard,
  Boxes,
  PlusCircle,
  AlertTriangle,
  FileText,
  AlertCircle
} from 'lucide-react';
import { User, TenantHospital, StaffAccount, UserRole } from '../types';
import { api } from '../services/api';

interface AccessControlViewProps {
  currentUser: User | null;
  activeDomain: 'pharmacy' | 'technician';
  tenants?: TenantHospital[];
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const EMPTY_TENANTS: TenantHospital[] = [];

export const AccessControlView: React.FC<AccessControlViewProps> = ({
  currentUser,
  activeDomain,
  tenants = EMPTY_TENANTS,
  onShowToast,
}) => {
  // If technician, allow selecting different registered hospitals
  const isTechnician = activeDomain === 'technician' || currentUser?.role === 'technician';

  // Find the first valid hospital tenant (ignoring platform-ops / tenant-default)
  const getInitialTenantId = () => {
    if (isTechnician) {
      const valid = tenants.find(t => t.id && t.id !== 'platform-ops' && t.id !== 'tenant-default');
      if (valid) return valid.id;
      if (currentUser?.tenantId && currentUser.tenantId !== 'platform-ops' && currentUser.tenantId !== 'tenant-default') {
        return currentUser.tenantId;
      }
      return '';
    }
    return currentUser?.tenantId || '';
  };

  const [selectedTenantId, setSelectedTenantId] = useState<string>(getInitialTenantId);

  // Automatically sync selectedTenantId when tenants array loads or changes asynchronously for technicians
  useEffect(() => {
    if (isTechnician && tenants.length > 0) {
      const validTenants = tenants.filter(t => t.id && t.id !== 'platform-ops' && t.id !== 'tenant-default');
      const isCurrentlyValid = validTenants.some(t => t.id === selectedTenantId);
      if (!isCurrentlyValid && validTenants.length > 0) {
        setSelectedTenantId(validTenants[0].id);
      }
    }
  }, [isTechnician, tenants.length, selectedTenantId]);

  const [activeSubTab, setActiveSubTab] = useState<'permissions' | 'register_staff'>('permissions');
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // New Staff Form State
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('pharmacist');
  const [newStaffDepartment, setNewStaffDepartment] = useState('Outpatient Pharmacy');
  const [newStaffPermissions, setNewStaffPermissions] = useState({
    dispensation: true,
    payments: false,
    inventory: true,
    registration: true,
    alerts: true,
    audit: false,
    staffManagement: false,
    accessControl: false,
  });
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);

  const hasMountedStaffRef = React.useRef(false);

  // Fetch staff for selected tenant (Explicit manual call or tenant change only - NO auto refresh)
  const loadStaff = useCallback(async (forcedTenantId?: string) => {
    setIsLoading(true);
    try {
      let queryId: string | undefined = undefined;
      if (isTechnician) {
        const activeT = forcedTenantId || selectedTenantId;
        if (activeT && activeT !== 'platform-ops' && activeT !== 'tenant-default') {
          queryId = activeT;
        } else if (tenants.length > 0) {
          const firstValid = tenants.find(t => t.id && t.id !== 'platform-ops' && t.id !== 'tenant-default');
          queryId = firstValid?.id;
        }
      }
      const data = await api.getStaff(queryId);
      setStaffList(data);
      if (data.length > 0) {
        setSelectedStaffId(prev => (prev && data.some(s => s.id === prev) ? prev : data[0].id));
      } else {
        setSelectedStaffId(null);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load staff list.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isTechnician, selectedTenantId, tenants, onShowToast]);

  // Load staff strictly ONCE on mount. Auto-refresh is 100% disabled so admin can edit safely.
  useEffect(() => {
    if (!hasMountedStaffRef.current) {
      hasMountedStaffRef.current = true;
      loadStaff();
    }
  }, [loadStaff]);

  // Handle staff registration
  const handleRegisterStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) {
      onShowToast('Please provide both staff member name and email address.', 'warning');
      return;
    }

    setIsSubmittingStaff(true);
      let effectiveTenant = isTechnician ? selectedTenantId : currentUser?.tenantId;
      if (isTechnician && (!effectiveTenant || effectiveTenant === 'platform-ops' || effectiveTenant === 'tenant-default')) {
        const valid = tenants.find(t => t.id && t.id !== 'platform-ops' && t.id !== 'tenant-default');
        if (valid) effectiveTenant = valid.id;
      }

    try {
      const payload = {
        name: newStaffName.trim(),
        email: newStaffEmail.trim().toLowerCase(),
        role: newStaffRole,
        department: newStaffDepartment,
        permissions: newStaffPermissions,
        tenantId: effectiveTenant,
      };

      const result = await api.registerStaff(payload);
      onShowToast(
        `Staff member "${result.name}" registered. Initial password set to email (${result.email}). Staff will be prompted to change password upon first login.`,
        'success'
      );

      // Reset form
      setNewStaffName('');
      setNewStaffEmail('');
      setActiveSubTab('permissions');
      await loadStaff();
    } catch (err: any) {
      onShowToast(err.message || 'Staff registration failed.', 'error');
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  // Handle toggle of a permission for a staff member
  const handleTogglePermission = (staffId: string, permissionKey: string) => {
    setStaffList(prev => prev.map(staff => {
      if (staff.id !== staffId) return staff;
      const currentPerms = (staff.permissions as any) || {};
      return {
        ...staff,
        permissions: {
          ...currentPerms,
          [permissionKey]: !currentPerms[permissionKey],
        }
      };
    }));
  };

  // Save updated permissions
  const handleSavePermissions = async (staff: StaffAccount) => {
    try {
      await api.updateStaffPermissions(staff.id, {
        permissions: staff.permissions,
        role: staff.role,
        department: staff.department,
      });
      onShowToast(`Security access permissions updated for ${staff.name}.`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to save permissions.', 'error');
    }
  };

  const filteredStaff = staffList.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.role.toLowerCase().includes(q);
  });

  const selectedStaff = staffList.find(s => s.id === selectedStaffId) || filteredStaff[0];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 font-mono">
            <span>Hospital Administration &amp; Governance</span>
            <span>·</span>
            <span>Role-Based Access Control</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-teal-700" />
            <span>Staff Registration &amp; Module Access Control</span>
          </h1>
        </div>

        {/* Developer / Technician Hospital Selector */}
        {isTechnician && (
          <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded-xl text-xs">
            <Building2 className="w-4 h-4 text-teal-400" />
            <span className="font-semibold text-slate-300">Target Facility:</span>
            <select
              value={selectedTenantId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedTenantId(val);
                loadStaff(val);
              }}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-hidden cursor-pointer"
            >
              {tenants
                .filter(t => t.id && t.id !== 'platform-ops' && t.id !== 'tenant-default')
                .map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.accountStatus})
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('permissions')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'permissions'
              ? 'border-teal-700 text-teal-800 bg-teal-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Access Control Matrix ({staffList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('register_staff')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'register_staff'
              ? 'border-teal-700 text-teal-800 bg-teal-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Staff Member</span>
        </button>
      </div>

      {/* TAB 1: ACCESS CONTROL MATRIX */}
      {activeSubTab === 'permissions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff by name or role..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2">
              
              <button
                onClick={() => loadStaff()}
                disabled={isLoading}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                title="Manually fetch latest staff accounts"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Staff List</span>
              </button>
            </div>
          </div>

          {filteredStaff.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
              <UserIcon className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No staff members registered yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click &quot;Register New Staff Member&quot; to onboard clinical staff, pharmacists, and cashiers to this facility.
              </p>
              <button
                onClick={() => setActiveSubTab('register_staff')}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register First Staff Member</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <h3 className="font-bold text-slate-900">Module Access Control Matrix</h3>
                  <p className="text-slate-500 text-[11px]">
                    Select which modules each staff member can view and interact with on their dashboard and sidebar.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Staff Member &amp; Role</th>
                      <th className="py-3 px-3 text-center">Dispense Medication</th>
                      <th className="py-3 px-3 text-center">Payments</th>
                      <th className="py-3 px-3 text-center">Inventory</th>
                      <th className="py-3 px-3 text-center">Register Medication</th>
                      <th className="py-3 px-3 text-center">Stock Alerts</th>
                      <th className="py-3 px-3 text-center">Audit Trails</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredStaff.map((staff) => {
                      const perms = staff.permissions || {
                        dispensation: false,
                        payments: false,
                        inventory: false,
                        registration: false,
                        alerts: false,
                        audit: false,
                      };
                      const isAdmin = staff.role === 'admin';

                      return (
                        <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs shrink-0">
                                {staff.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{staff.name}</span>
                                  {isAdmin && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                      ADMIN
                                    </span>
                                  )}
                                  {staff.mustChangePassword && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-rose-700 bg-rose-50 border border-rose-200">
                                      Needs Password Change
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {staff.email} · <span className="capitalize">{staff.role}</span> ({staff.department})
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Dispensation */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perms.dispensation)}
                              disabled={isAdmin}
                              onChange={() => handleTogglePermission(staff.id, 'dispensation')}
                              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Payments */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perms.payments)}
                              disabled={isAdmin}
                              onChange={() => handleTogglePermission(staff.id, 'payments')}
                              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Inventory */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perms.inventory)}
                              disabled={isAdmin}
                              onChange={() => handleTogglePermission(staff.id, 'inventory')}
                              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Registration */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perms.registration)}
                              disabled={isAdmin}
                              onChange={() => handleTogglePermission(staff.id, 'registration')}
                              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Alerts */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perms.alerts)}
                              disabled={isAdmin}
                              onChange={() => handleTogglePermission(staff.id, 'alerts')}
                              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Audit */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perms.audit)}
                              disabled={isAdmin}
                              onChange={() => handleTogglePermission(staff.id, 'audit')}
                              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Save Button */}
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleSavePermissions(staff)}
                              className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs"
                            >
                              Save
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REGISTER NEW STAFF MEMBER */}
      {activeSubTab === 'register_staff' && (
        <div className="max-w-2xl bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-teal-700 text-xs font-semibold uppercase tracking-wider mb-1">
              <UserPlus className="w-4 h-4" />
              <span>Hospital Staff Onboarding Panel</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Register New Hospital / Pharmacy Staff Member
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              As specified: The staff member&apos;s email address is automatically assigned as their initial password. 
              Upon their first login, the system will immediately prompt them to configure a private personal password.
            </p>
          </div>

          <form onSubmit={handleRegisterStaff} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Dr. Olumide Adeleke"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Staff Email Address (Will be initial password) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="e.g. o.adeleke@pharmacy.org"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clinical Role *
                </label>
                <select
                  value={newStaffRole}
                  onChange={(e) => {
                    const r = e.target.value as UserRole;
                    setNewStaffRole(r);
                    if (r === 'cashier') {
                      setNewStaffPermissions(prev => ({ ...prev, payments: true, dispensation: false }));
                      setNewStaffDepartment('Billing & Cashier Desk');
                    } else if (r === 'pharmacist') {
                      setNewStaffPermissions(prev => ({ ...prev, payments: false, dispensation: true, inventory: true, registration: true }));
                      setNewStaffDepartment('Outpatient Pharmacy');
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs"
                >
                  <option value="pharmacist">Pharmacist</option>
                  <option value="cashier">Cashier / Billing Clerk</option>
                  <option value="doctor">Prescribing Doctor</option>
                  <option value="nurse">Nurse / Clinical Attendant</option>
                  <option value="admin">Hospital Administrator</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Department / Ward
                </label>
                <input
                  type="text"
                  value={newStaffDepartment}
                  onChange={(e) => setNewStaffDepartment(e.target.value)}
                  placeholder="e.g. Central Dispensary"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs"
                />
              </div>
            </div>

            {/* Initial Module Permissions */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
              <span className="font-semibold text-slate-800 block text-xs">
                Assign Module Access Clearances:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newStaffPermissions.dispensation}
                    onChange={(e) => setNewStaffPermissions(p => ({ ...p, dispensation: e.target.checked }))}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <span>Dispense Medication</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newStaffPermissions.payments}
                    onChange={(e) => setNewStaffPermissions(p => ({ ...p, payments: e.target.checked }))}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <span>Payments</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newStaffPermissions.inventory}
                    onChange={(e) => setNewStaffPermissions(p => ({ ...p, inventory: e.target.checked }))}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <span>Inventory</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newStaffPermissions.registration}
                    onChange={(e) => setNewStaffPermissions(p => ({ ...p, registration: e.target.checked }))}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <span>Register Medication</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newStaffPermissions.alerts}
                    onChange={(e) => setNewStaffPermissions(p => ({ ...p, alerts: e.target.checked }))}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <span>Stock Alerts</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newStaffPermissions.audit}
                    onChange={(e) => setNewStaffPermissions(p => ({ ...p, audit: e.target.checked }))}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <span>Audit Trails</span>
                </label>
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
              <KeyRound className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Automatic Password Setup:</strong> The staff member will use their email as their initial password. 
                They will be required to change it on their first login session before gaining clinical workstation access.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveSubTab('permissions')}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmittingStaff}
                className="px-5 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmittingStaff ? 'Registering Staff...' : 'Register Staff Member'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
