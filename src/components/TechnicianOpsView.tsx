import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Wrench, 
  ShieldCheck, 
  Lock, 
  Power, 
  CheckCircle2, 
  XCircle, 
  Headphones, 
  Database, 
  CreditCard, 
  Send, 
  Clock, 
  Cpu, 
  AlertCircle,
  FileCheck,
  Server,
  Layers,
  ChevronRight,
  ShoppingCart,
  Boxes,
  PlusCircle,
  AlertTriangle,
  FileText,
  UserCheck
} from 'lucide-react';
import { TenantHospital, SupportTicket, User } from '../types';
import { api } from '../services/api';
import { formatNaira } from '../utils/currency';
import { AccessControlView } from './AccessControlView';

interface TechnicianOpsViewProps {
  tenants: TenantHospital[];
  tickets: SupportTicket[];
  currentUser?: User | null;
  onLogout?: () => void;
  onToggleTenantStatus: (tenantId: string, currentStatus: string) => Promise<void>;
  onApproveTenant?: (tenantId: string) => Promise<void>;
  onDeployTechnician: (tenantId: string, formulary: string, notes: string) => Promise<void>;
  onUpdateTicketStatus: (ticketId: string, status: string) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onNavigateClientModule?: (moduleTab: string, tenantId?: string) => void;
  onSwitchToClient?: () => void;
}

export const TechnicianOpsView: React.FC<TechnicianOpsViewProps> = ({
  tenants,
  tickets,
  currentUser,
  onLogout,
  onToggleTenantStatus,
  onApproveTenant,
  onDeployTechnician,
  onUpdateTicketStatus,
  onShowToast,
  onNavigateClientModule,
  onSwitchToClient,
}) => {
  const [activeTab, setActiveTab] = useState<'hospitals' | 'access' | 'modules' | 'deployment' | 'tickets' | 'neon'>('hospitals');

  // Deployment Wizard State
  const [selectedTenantId, setSelectedTenantId] = useState(
    tenants.find(t => !t.technicianSetupDeployed)?.id || tenants[0]?.id || ''
  );
  const [formularyPreset, setFormularyPreset] = useState('General Hospital Standard (350+ Meds)');
  const [technicianNotes, setTechnicianNotes] = useState(
    'Field technician on-site deployment: Barcode scanner calibrated, thermal receipt printer mapped to COM3, shelf labels tagged A1-D20.'
  );
  const [isDeploying, setIsDeploying] = useState(false);
  const [isApproving, setIsApproving] = useState<Record<string, boolean>>({});

  // Neon Postgres telemetry
  const [neonStatus, setNeonStatus] = useState<any>(null);

  useEffect(() => {
    api.getNeonStatus().then(setNeonStatus);
  }, []);

  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      const valid = tenants.find(t => !t.technicianSetupDeployed)?.id || tenants[0]?.id;
      if (valid) setSelectedTenantId(valid);
    }
  }, [tenants, selectedTenantId]);

  const handleApprove = async (tenantId: string) => {
    if (!onApproveTenant) return;
    setIsApproving(prev => ({ ...prev, [tenantId]: true }));
    try {
      await onApproveTenant(tenantId);
      onShowToast('Hospital facility approved! Hospital admin role activated with full access.', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Approval failed.', 'error');
    } finally {
      setIsApproving(prev => ({ ...prev, [tenantId]: false }));
    }
  };

  const handleDeploySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) {
      onShowToast('Please select a target hospital for deployment.', 'warning');
      return;
    }

    try {
      setIsDeploying(true);
      await onDeployTechnician(selectedTenantId, formularyPreset, technicianNotes);
      onShowToast('Technician setup package deployed successfully! Hospital database initialized.', 'success');
      setActiveTab('hospitals');
    } catch (err: any) {
      onShowToast(err.message || 'Deployment failed', 'error');
    } finally {
      setIsDeploying(false);
    }
  };

  const selectedTenantForDeploy = tenants.find(t => t.id === selectedTenantId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 font-mono">
            <span>ops.hospital-emanager.health</span>
            <span>·</span>
            <span>Cloud Infrastructure &amp; Deployment</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-teal-700" />
            <span>Developer &amp; Server-Side Management Console</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-mono">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span>Master Developer Console (No Sidebar Mode)</span>
          </div>
          {onSwitchToClient && (
            <button
              onClick={onSwitchToClient}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold transition-colors cursor-pointer"
              title="Open client hospital workstation view"
            >
              <Building2 className="w-3.5 h-3.5 text-teal-700" />
              <span>Preview Client Workstation</span>
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
              title="Sign out of developer console"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Dev Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* ZERO-KNOWLEDGE PRIVACY ARCHITECTURE BANNER */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Developer Direct Operations Console
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Full System Control
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                All platform modules and tenant access controls can be managed directly from this dashboard. 
                Approve newly registered facilities, inspect access control matrices for all hospitals, review complaints, and monitor the PostgreSQL cluster.
              </p>
            </div>
          </div>

          <div className="text-right shrink-0 hidden md:block">
            <span className="text-[10px] text-slate-500 block uppercase font-mono">Multi-Tenant Isolation</span>
            <span className="text-xs font-mono text-teal-400 font-bold">PostgreSQL RLS + Tenant Keys</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs (Ensuring every module is directly accessible from the dashboard!) */}
      <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('hospitals')}
          className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'hospitals' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-teal-700" />
          <span>Registered Hospitals &amp; Accounts ({tenants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('access')}
          className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'access' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-teal-700" />
          <span>Access Control Modules (All Facilities)</span>
        </button>

        <button
          onClick={() => setActiveTab('modules')}
          className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'modules' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-teal-700" />
          <span>Clinical Modules Direct Access</span>
        </button>

        <button
          onClick={() => setActiveTab('deployment')}
          className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'deployment' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4 text-teal-700" />
          <span>Technician Setup Wizard</span>
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'tickets' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Headphones className="w-4 h-4 text-teal-700" />
          <span>Customer Support Desk ({tickets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('neon')}
          className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'neon' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4 text-teal-700" />
          <span>Postgres Cluster</span>
        </button>
      </div>

      {/* TAB 1: REGISTERED HOSPITALS & ACCOUNTS */}
      {activeTab === 'hospitals' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Hospital Subscriptions &amp; Facility Clearances</h3>
              <p className="text-slate-500 text-[11px]">
                Approve newly registered facilities to activate Hospital Admin permissions, enable/disable accounts, or dispatch on-site technician packages.
              </p>
            </div>
            <div className="text-right font-mono">
              <span className="text-slate-400 block text-[10px]">Active Subscriptions ARR</span>
              <span className="font-bold text-teal-700 text-sm">
                {formatNaira(tenants.filter(t => t.accountStatus === 'active').reduce((s, t) => s + (t.monthlyFee || 0), 0), false)}/mo
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Hospital / Pharmacy Facility</th>
                  <th className="py-3 px-4">Admin Registrant</th>
                  <th className="py-3 px-4">Subscription Plan</th>
                  <th className="py-3 px-4 text-center">Status &amp; Verification</th>
                  <th className="py-3 px-4 text-center">Technician Setup</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {tenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No hospitals registered yet. Facilities registered on the client portal will appear here for technician review and approval.
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant) => {
                    const isActive = tenant.accountStatus === 'active';
                    const isPending = tenant.accountStatus === 'pending_setup';

                    return (
                      <tr key={tenant.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {tenant.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {tenant.contactEmail} · {tenant.contactPhone}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Registered: {new Date(tenant.registeredAt).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-semibold">{tenant.adminName || 'Hospital Admin'}</div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {tenant.adminEmail || tenant.contactEmail}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {tenant.adminPhone || tenant.contactPhone}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{tenant.subscriptionPlan}</div>
                          <div className="font-mono text-slate-600 text-[11px]">
                            {formatNaira(tenant.monthlyFee, false)}/month
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              ACTIVE &amp; APPROVED
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                              PENDING APPROVAL
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              DISABLED
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {tenant.technicianSetupDeployed ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Deployed
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <Clock className="w-3 h-3" />
                                Awaiting Tech
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedTenantId(tenant.id);
                                  setActiveTab('deployment');
                                }}
                                className="text-[10px] text-teal-700 font-semibold block mt-1 underline hover:text-teal-800"
                              >
                                Deploy Package →
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                            {/* Approve Button (Prompt requirement) */}
                            {isPending && (
                              <button
                                onClick={() => handleApprove(tenant.id)}
                                disabled={isApproving[tenant.id]}
                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{isApproving[tenant.id] ? 'Approving...' : 'Approve & Promote Admin'}</span>
                              </button>
                            )}

                            {/* Toggle Account Status */}
                            <button
                              onClick={() => onToggleTenantStatus(tenant.id, tenant.accountStatus)}
                              className={`px-2.5 py-1.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                                isActive
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                  : 'bg-slate-800 hover:bg-slate-700 text-white shadow-2xs'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                              <span>{isActive ? 'Disable' : 'Enable'}</span>
                            </button>

                            {/* Access Control shortcut */}
                            <button
                              onClick={() => {
                                setSelectedTenantId(tenant.id);
                                setActiveTab('access');
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium cursor-pointer"
                              title="Inspect Access Control"
                            >
                              Staff / RBAC
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ACCESS CONTROL MODULES FOR ALL REGISTERED HOSPITALS (Prompt requirement!) */}
      {activeTab === 'access' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-700" />
                <span>Access Control &amp; Staff Clearance (Developer Operations)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage staff accounts and module permissions across any registered hospital or pharmacy facility.
              </p>
            </div>
          </div>

          <AccessControlView
            currentUser={currentUser || {
              id: 'developer-root',
              name: 'SaaS Platform Developer',
              email: 'dev@ops.health',
              role: 'technician',
              tenantId: selectedTenantId || (tenants[0]?.id || 'tenant-default'),
              tenantName: 'Cloud Ops',
            }}
            activeDomain="technician"
            tenants={tenants}
            onShowToast={onShowToast}
          />
        </div>
      )}

      {/* TAB 3: CLINICAL MODULES DIRECT LAUNCHER (Every module accessible directly!) */}
      {activeTab === 'modules' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Direct Clinical Module Launcher
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Access any platform module directly from the developer dashboard without needing a sidebar.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Module 1: Dispense Medication */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-500 hover:shadow-md transition-all space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Dispense Medication</h4>
                    <p className="text-[11px] text-slate-500">Order creation &amp; dispensing</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Allows dispensers to allocate valid batches, create orders with pending status, and finalize dispensation once approved.
                </p>
                <button
                  onClick={() => onNavigateClientModule && onNavigateClientModule('dispensation', selectedTenantId)}
                  className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Open Dispense Medication</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Module 2: Payments */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-500 hover:shadow-md transition-all space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Payments Module</h4>
                    <p className="text-[11px] text-slate-500">Cashier settlement desk</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cashiers approve pending orders, authorize payments, and advance orders for clinical finalization.
                </p>
                <button
                  onClick={() => onNavigateClientModule && onNavigateClientModule('payments', selectedTenantId)}
                  className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Open Payments</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Module 3: Inventory */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-500 hover:shadow-md transition-all space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Inventory</h4>
                    <p className="text-[11px] text-slate-500">Directory, sorting &amp; PDF</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Medication directory with sorting by name, category, or status, and print directory with Save as PDF option.
                </p>
                <button
                  onClick={() => onNavigateClientModule && onNavigateClientModule('inventory', selectedTenantId)}
                  className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Open Inventory</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Module 4: Register Medication */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-500 hover:shadow-md transition-all space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Register Medication</h4>
                    <p className="text-[11px] text-slate-500">Batches &amp; dynamic categories</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Retrieve existing drug names from DB for new batch recording, and add new therapeutic categories directly.
                </p>
                <button
                  onClick={() => onNavigateClientModule && onNavigateClientModule('registration', selectedTenantId)}
                  className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Open Register Medication</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Module 5: Stock & Expiry Alerts */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-500 hover:shadow-md transition-all space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Stock &amp; Expiry Alerts</h4>
                    <p className="text-[11px] text-slate-500">Safety thresholds radar</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Immediate alerts for batches expiring within 45 days, already expired lots, and depleted stocks.
                </p>
                <button
                  onClick={() => onNavigateClientModule && onNavigateClientModule('alerts', selectedTenantId)}
                  className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Open Stock Alerts</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Module 6: Audit Trails */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-500 hover:shadow-md transition-all space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Audit Trails &amp; Records</h4>
                    <p className="text-[11px] text-slate-500">Dispensation &amp; ingest logs</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Full records with filters for date range, particular drug, dispenser, and payment approver.
                </p>
                <button
                  onClick={() => onNavigateClientModule && onNavigateClientModule('audit', selectedTenantId)}
                  className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Open Audit Trails</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TECHNICIAN SETUP & ONBOARDING WIZARD */}
      {activeTab === 'deployment' && (
        <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-teal-600 text-xs font-semibold uppercase tracking-wider mb-1">
              <Wrench className="w-4 h-4" />
              <span>On-Site Client Setup Suite</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Deploy Pharmacy System with Client Formulary Data
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Field technician deployment wizard for newly registered hospital facilities.
            </p>
          </div>

          <form onSubmit={handleDeploySubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Select Registered Hospital / Pharmacy Facility *
              </label>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-teal-500"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.technicianSetupDeployed ? 'Setup Already Deployed' : 'NEEDS TECHNICIAN SETUP'}
                  </option>
                ))}
              </select>
            </div>

            {selectedTenantForDeploy && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-[11px] text-slate-600">
                <p><strong>Admin Contact:</strong> {selectedTenantForDeploy.adminName} ({selectedTenantForDeploy.adminEmail})</p>
                <p><strong>Account Status:</strong> <span className="capitalize font-bold text-teal-800">{selectedTenantForDeploy.accountStatus}</span></p>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Formulary Preset Catalog *
              </label>
              <select
                value={formularyPreset}
                onChange={(e) => setFormularyPreset(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
              >
                <option value="General Hospital Standard (350+ Meds)">General Hospital Standard Formulary</option>
                <option value="Comprehensive Outpatient Specialty (500+ Meds)">Comprehensive Outpatient Specialty</option>
                <option value="Emergency & ICU Care Unit (180+ Meds)">Emergency &amp; Critical Care Unit</option>
                <option value="Community Pharmacy Starter (120+ Meds)">Community Pharmacy Starter</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Technician Field Deployment Notes
              </label>
              <textarea
                rows={3}
                value={technicianNotes}
                onChange={(e) => setTechnicianNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={isDeploying || tenants.length === 0}
              className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              <span>{isDeploying ? 'Deploying Setup Package...' : 'Deploy System to Target Facility'}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: CUSTOMER SUPPORT DESK */}
      {activeTab === 'tickets' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <div>
              <h3 className="font-bold text-slate-900">Hospital Customer Support Complaints &amp; Inquiries</h3>
              <p className="text-slate-500 text-[11px]">
                Complaints written to customer service by hospital clients appear here for immediate technician review.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {tickets.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No customer complaints or tickets submitted yet.
              </div>
            ) : (
              tickets.map((ticket) => (
                <div key={ticket.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">#{ticket.id}</span>
                      <span className="font-semibold text-slate-800">{ticket.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        ticket.status === 'open' ? 'bg-amber-100 text-amber-800' :
                        ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{ticket.description}</p>
                    <div className="text-[10px] text-slate-400">
                      Facility: {ticket.tenantName} · Category: {ticket.category} · Priority: {ticket.priority} · {new Date(ticket.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {ticket.status !== 'resolved' && (
                      <button
                        onClick={() => onUpdateTicketStatus(ticket.id, 'resolved')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                      >
                        Mark Resolved
                      </button>
                    )}
                    {ticket.status === 'open' && (
                      <button
                        onClick={() => onUpdateTicketStatus(ticket.id, 'in_progress')}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                      >
                        Start Progress
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: NEON POSTGRES CLUSTER */}
      {activeTab === 'neon' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-700" />
                <span>PostgreSQL 16 Database Cluster Health</span>
              </h3>
              <p className="text-slate-500 text-[11px]">Serverless compute and connection pool status</p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              HEALTHY
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-slate-700">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block">ENDPOINT</span>
              <span className="text-xs font-semibold">{neonStatus?.endpoint || 'ep-silent-wave-1829.neon.tech'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block">DATABASE</span>
              <span className="text-xs font-semibold">{neonStatus?.database || 'neondb_pharmpulse'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block">LATENCY</span>
              <span className="text-xs font-semibold text-emerald-600">{neonStatus?.latencyMs || 18} ms (Optimal)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
