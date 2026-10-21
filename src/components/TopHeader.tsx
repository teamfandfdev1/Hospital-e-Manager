import React from 'react';
import { 
  Menu, 
  Bell, 
  ChevronDown, 
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  Server,
  Headphones,
  LogOut
} from 'lucide-react';
import { User } from '../types';

interface TopHeaderProps {
  currentTab: string;
  user: User | null;
  onOpenAuth: () => void;
  activeDomain: 'pharmacy' | 'technician';
  setActiveDomain: (domain: 'pharmacy' | 'technician') => void;
  alertCount: number;
  onToggleSidebarMobile: () => void;
  isCollapsed: boolean;
  onToggleSidebarDesktop: () => void;
  onNavigate: (tab: string) => void;
  onOpenCustomerService?: () => void;
  onLogout?: () => void;
  onRegisterNewHospital?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentTab,
  user,
  onOpenAuth,
  activeDomain,
  setActiveDomain,
  alertCount,
  onToggleSidebarMobile,
  isCollapsed,
  onToggleSidebarDesktop,
  onNavigate,
  onOpenCustomerService,
  onLogout,
  onRegisterNewHospital,
}) => {
  const getTabLabel = () => {
    if (activeDomain === 'technician') {
      switch (currentTab) {
        case 'hospitals': return 'Registered Hospitals & Subscriptions';
        case 'deployment': return 'Technician Setup & Deployment';
        case 'tickets': return 'Customer Support Desk';
        case 'neon': return 'Neon Postgres Health';
        case 'access': return 'Staff Access Control';
        case 'modules': return 'Direct Clinical Modules';
        default: return 'Developer & Server Operations Console';
      }
    }

    switch (currentTab) {
      case 'dashboard': return 'Dashboard';
      case 'dispensation': return 'Dispense Medication';
      case 'payments': return 'Payments';
      case 'inventory': return 'Inventory';
      case 'registration': return 'Register Medication';
      case 'alerts': return 'Stock & Expiry Alerts';
      case 'audit': return 'Audit Trails';
      case 'access': return 'Staff Registration & Access Control';
      default: return 'Hospital e-Manager';
    }
  };

  const pageTitle = getTabLabel();
  const showSidebarToggles = activeDomain === 'pharmacy';

  return (
    <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 sm:px-6 flex items-center justify-between transition-all select-none">
      {/* Left: Sidebar Toggle & Page Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        {showSidebarToggles && (
          <>
            {/* On mobile and tablet (<lg), opens slide-out drawer via hamburger button */}
            <button
              onClick={onToggleSidebarMobile}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              title="Toggle Navigation Menu"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* On desktop (>=lg), expands/collapses icon rail */}
            <button
              onClick={onToggleSidebarDesktop}
              className="hidden lg:flex p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-5 h-5 text-teal-700" />
              ) : (
                <PanelLeftClose className="w-5 h-5 text-slate-600" />
              )}
            </button>
          </>
        )}

        {/* Crisp Single-line Page Title */}
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="font-bold text-slate-900 text-sm sm:text-base truncate whitespace-nowrap tracking-tight">
            {pageTitle}
          </h1>

          {/* Active Facility or Domain Tag */}
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] text-slate-600 font-medium shrink-0">
            {activeDomain === 'pharmacy' ? (
              <>
                <Building2 className="w-3 h-3 text-teal-700" />
                <span className="truncate max-w-[160px]">{user?.tenantName || 'Hospital Facility'}</span>
              </>
            ) : (
              <>
                <Server className="w-3 h-3 text-teal-700" />
                <span>Cloud Platform Ops (No Sidebar Mode)</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Right: Customer Service, Notifications & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Customer Service Complaint Button */}
        {onOpenCustomerService && (
          <button
            onClick={onOpenCustomerService}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors cursor-pointer"
            title="Write complaint to customer service"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Customer Service</span>
          </button>
        )}

        {/* Alert Notification Bell */}
        <button
          onClick={() => {
            if (activeDomain === 'pharmacy') onNavigate('alerts');
            else onNavigate('tickets');
          }}
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          title="View Alerts"
        >
          <Bell className="w-4 h-4" />
          {alertCount > 0 && activeDomain === 'pharmacy' && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white"></span>
          )}
        </button>

        {/* User Profile Pill */}
        <button
          onClick={onOpenAuth}
          className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full hover:bg-slate-100 transition-colors text-left cursor-pointer border border-slate-200"
          title="Account & Session Details"
        >
          <div className="w-7 h-7 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
            {user?.name ? user.name.charAt(0) : 'U'}
          </div>

          <div className="hidden lg:block text-left leading-tight truncate max-w-[120px]">
            <p className="text-xs font-bold text-slate-900 truncate">
              {user?.name ? user.name.split(' ')[0] : 'Staff'}
            </p>
            <p className="text-[10px] text-slate-500 truncate capitalize">
              {user?.role || 'User'}
            </p>
          </div>

          <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block shrink-0" />
        </button>

        {/* Quick Sign Out Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Sign Out / Switch Facility"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
