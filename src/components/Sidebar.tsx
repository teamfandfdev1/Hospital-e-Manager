import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  CreditCard,
  Boxes, 
  PlusCircle, 
  AlertTriangle, 
  FileText, 
  Building2, 
  Wrench, 
  Headphones, 
  Database, 
  ShieldCheck, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Pill,
  X,
  Server,
  Command,
  Sparkles,
  LogOut
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: User | null;
  onOpenAuth: () => void;
  activeDomain: 'pharmacy' | 'technician';
  alertCount: number;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  onOpenAuth,
  activeDomain,
  alertCount,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  onLogout,
}) => {
  const handleNavClick = (tab: string) => {
    setCurrentTab(tab);
    setIsMobileOpen(false);
  };

  const handleProfileClick = () => {
    onOpenAuth();
    setIsMobileOpen(false);
  };

  const isAdmin = user?.role === 'admin';
  const perms = user?.permissions || {
    dispensation: true,
    payments: true,
    inventory: true,
    registration: true,
    alerts: true,
    audit: true,
  };

  return (
    <>
      {/* Mobile & Tablet Backdrop Overlay (<lg): touching anywhere else collapses the sidebar */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          onTouchStart={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden transition-opacity cursor-pointer"
          aria-label="Close sidebar backdrop"
        />
      )}

      {/* Collapsible Sidebar: Off-canvas drawer on Mobile & Tablet (<lg); Docked on Desktop (>=lg) */}
      <aside
        className={`fixed top-9 bottom-0 left-0 z-50 flex flex-col bg-slate-900 border-r border-slate-800 text-slate-300 transition-all duration-300 ease-in-out select-none
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
          ${isMobileOpen ? 'w-64 translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header / Brand Emblem */}
        <div className={`h-14 flex items-center border-b border-slate-800/80 px-4 transition-all ${isCollapsed ? 'lg:justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              {activeDomain === 'pharmacy' ? (
                <Pill className="w-4 h-4" />
              ) : (
                <Server className="w-4 h-4 text-teal-400" />
              )}
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="overflow-hidden">
                <h1 className="text-sm font-bold text-white tracking-tight truncate">
                  Hospital e-Manager
                </h1>
                <p className="text-[10px] text-teal-400 truncate">
                  {activeDomain === 'pharmacy' ? 'Clinical Hospital Workstation' : 'Cloud Ops & Server Console'}
                </p>
              </div>
            )}
          </div>

          {/* Close button on mobile & tablet view */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 text-xs">
          {activeDomain === 'pharmacy' ? (
            <div className="space-y-1">
              {(!isCollapsed || isMobileOpen) && (
                <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Clinical Modules
                </p>
              )}

              {/* Dashboard */}
              <button
                onClick={() => handleNavClick('dashboard')}
                title="Dashboard"
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                  currentTab === 'dashboard'
                    ? 'bg-teal-700 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                } ${isCollapsed && !isMobileOpen ? 'lg:justify-center' : ''}`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                {(!isCollapsed || isMobileOpen) && <span>Dashboard</span>}
              </button>

              {/* Dispense Medication (Prompt: Change name from "dispense pos" to "Dispense Medication") */}
              {(isAdmin || perms.dispensation) && (
                <button
                  onClick={() => handleNavClick('dispensation')}
                  title="Dispense Medication (Alt+D)"
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                    currentTab === 'dispensation'
                      ? 'bg-teal-700 text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  } ${isCollapsed && !isMobileOpen ? 'lg:justify-center' : ''}`}
                >
                  <ShoppingCart className="w-4 h-4 shrink-0" />
                  {(!isCollapsed || isMobileOpen) && (
                    <div className="flex items-center justify-between flex-1">
                      <span>Dispense Medication</span>
                      <kbd className="hidden lg:inline text-[10px] font-mono px-1 py-0.2 bg-slate-800 border border-slate-700 rounded text-slate-400">
                        Alt+D
                      </kbd>
                    </div>
                  )}
                </button>
              )}

              {/* Payments (Prompt requirement: "Create a new module called 'payments' on the sidebar, the module will work hand in hand with the dispensation module") */}
              {(isAdmin || perms.payments) && (
                <button
                  onClick={() => handleNavClick('payments')}
                  title="Payments & Billing Authorization"
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                    currentTab === 'payments'
                      ? 'bg-teal-700 text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  } ${isCollapsed && !isMobileOpen ? 'lg:justify-center' : ''}`}
                >
                  <CreditCard className="w-4 h-4 shrink-0 text-emerald-400" />
                  {(!isCollapsed || isMobileOpen) && <span>Payments</span>}
                </button>
              )}

              {/* Inventory (Prompt: Change name from "Medication Directory" to just "Inventory") */}
              {(isAdmin || perms.inventory) && (
                <button
                  onClick={() => handleNavClick('inventory')}
                  title="Inventory"
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                    currentTab === 'inventory'
                      ? 'bg-teal-700 text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  } ${isCollapsed && !isMobileOpen ? 'lg:justify-center' : ''}`}
                >
                  <Boxes className="w-4 h-4 shrink-0" />
                  {(!isCollapsed || isMobileOpen) && (
                    <div className="flex items-center justify-between flex-1">
                      <span>Inventory</span>
                      <kbd className="hidden lg:inline text-[10px] font-mono px-1 py-0.2 bg-slate-800 border border-slate-700 rounded text-slate-400">
                        Alt+I
                      </kbd>
                    </div>
                  )}
                </button>
              )}

              {/* Register Medication */}
              {(isAdmin || perms.registration) && (
                <button
                  onClick={() => handleNavClick('registration')}
                  title="Register Medication (Alt+R)"
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                    currentTab === 'registration'
                      ? 'bg-teal-700 text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  } ${isCollapsed && !isMobileOpen ? 'lg:justify-center' : ''}`}
                >
                  <PlusCircle className="w-4 h-4 shrink-0" />
                  {(!isCollapsed || isMobileOpen) && (
                    <div className="flex items-center justify-between flex-1">
                      <span>Register Medication</span>
                      <kbd className="hidden lg:inline text-[10px] font-mono px-1 py-0.2 bg-slate-800 border border-slate-700 rounded text-slate-400">
                        Alt+R
                      </kbd>
                    </div>
                  )}
                </button>
              )}

              {/* Stock & Expiry Alerts */}
              {(isAdmin || perms.alerts) && (
                <button
                  onClick={() => handleNavClick('alerts')}
                  title="Stock & Expiry Alerts (Alt+A)"
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                    currentTab === 'alerts'
                      ? 'bg-teal-700 text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  } ${isCollapsed && !isMobileOpen ? 'lg:justify-center' : ''}`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  {(!isCollapsed || isMobileOpen) && (
                    <div className="flex items-center justify-between flex-1">
                      <span>Stock &amp; Expiry Alerts</span>
                      <div className="flex items-center gap-1.5">
                        <kbd className="hidden lg:inline text-[10px] font-mono px-1 py-0.2 bg-slate-800 border border-slate-700 rounded text-slate-400">
                          Alt+A
                        </kbd>
                        {alertCount > 0 && (
                          <span className="w-5 h-5 flex items-center justify-center text-[10px] font-mono font-bold text-white bg-rose-600 rounded-full">
                            {alertCount}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              )}

              {/* Audit Trails */}
              {(isAdmin || perms.audit) && (
                <button
                  onClick={() => handleNavClick('audit')}
                  title="Audit Trails & Records"
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                    currentTab === 'audit'
                      ? 'bg-teal-700 text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  } ${isCollapsed && !isMobileOpen ? 'lg:justify-center' : ''}`}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  {(!isCollapsed || isMobileOpen) && <span>Audit Trails</span>}
                </button>
              )}

              {/* Hospital Admin Only Modules: Staff Management & Access Control */}
              {/* Prompt requirement: "only the admin can register staff and access the access control panel, the two modules would not appear on the dashboard of other staff members" */}
              {isAdmin && (
                <>
                  {(!isCollapsed || isMobileOpen) && (
                    <p className="px-3 pt-3 text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1">
                      Hospital Administration
                    </p>
                  )}

                  <button
                    onClick={() => handleNavClick('access')}
                    title="Staff Registration & Access Control"
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                      currentTab === 'access'
                        ? 'bg-teal-700 text-white font-semibold shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    } ${isCollapsed && !isMobileOpen ? 'lg:justify-center' : ''}`}
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
                    {(!isCollapsed || isMobileOpen) && <span>Staff &amp; Access Control</span>}
                  </button>
                </>
              )}

              {/* RAPID CLINICAL KEYBOARD SHORTCUTS PANEL (Prompt requirement: "let the shortcuts only be shown on the sidebar, strictly in desktop mode (the shortcuts won’t appear for tablet and mobile)") */}
              {!isCollapsed && (
                <div className="hidden lg:block pt-5 px-1">
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-2">
                    <div className="flex items-center gap-1.5 text-teal-400 font-bold uppercase tracking-wider text-[10px] font-mono">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Desktop Shortcuts</span>
                    </div>

                    <div className="space-y-1.5 text-[10px] font-mono text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Dispense Meds</span>
                        <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-teal-300">Alt+D</kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Register Drug</span>
                        <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-teal-300">Alt+R</kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Inventory</span>
                        <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-teal-300">Alt+I</kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Stock Alerts</span>
                        <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-teal-300">Alt+A</kbd>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* SERVER-SIDE MANAGER ONLY (When rendered) */
            <div className="space-y-1">
              {(!isCollapsed || isMobileOpen) && (
                <p className="px-3 text-[10px] font-semibold text-teal-400 uppercase tracking-wider mb-2">
                  Server Operations
                </p>
              )}

              <button
                onClick={() => handleNavClick('hospitals')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                  currentTab === 'hospitals'
                    ? 'bg-teal-700 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span>Registered Hospitals</span>
              </button>

              <button
                onClick={() => handleNavClick('access')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                  currentTab === 'access'
                    ? 'bg-teal-700 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Access Control</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer / Profile & Desktop Collapse Toggle */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          {/* User Session Quick Click */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleProfileClick}
              title="User Profile & Session Details"
              className={`flex-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer min-w-0 ${
                isCollapsed && !isMobileOpen ? 'lg:justify-center' : ''
              }`}
            >
              <Settings className="w-4 h-4 shrink-0 text-slate-400" />
              {(!isCollapsed || isMobileOpen) && (
                <div className="text-left flex-1 truncate">
                  <p className="font-semibold text-white truncate text-xs">{user?.name || 'Staff User'}</p>
                  <p className="text-[10px] text-teal-400 truncate capitalize">{user?.role || 'Pharmacist'}</p>
                </div>
              )}
            </button>

            {onLogout && (!isCollapsed || isMobileOpen) && (
              <button
                onClick={onLogout}
                title="Sign Out / Switch Hospital"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Desktop Collapse/Expand Button (>=lg only) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex w-full items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
};
