import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User as UserIcon, 
  CheckCircle2, 
  X, 
  LogOut,
  Copy,
  Building2,
  KeyRound,
  UserPlus,
  BadgeCheck
} from 'lucide-react';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  jwtToken: string | null;
  onLogout: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  activeDomain?: 'pharmacy' | 'technician';
  onOpenChangePassword?: () => void;
  onRegisterNewHospital?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  jwtToken,
  onLogout,
  onShowToast,
  activeDomain = 'pharmacy',
  onOpenChangePassword,
  onRegisterNewHospital,
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const copyToken = () => {
    if (jwtToken) {
      navigator.clipboard.writeText(jwtToken);
      onShowToast('JWT Session Bearer token copied to clipboard!', 'success');
    }
  };

  const perms = currentUser?.permissions || {};

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden relative flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[84vh] my-2 sm:my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - Sticky at Top */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-slate-900 to-teal-950 text-white px-4 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between shrink-0 border-b border-teal-900/40 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 font-bold text-sm shadow-inner shrink-0">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                  {currentUser?.name || 'Staff User Profile'}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0">
                  {currentUser?.role || 'Staff'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-1.5 font-mono truncate">
                <Building2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="truncate">{currentUser?.tenantName || 'Hospital Facility'}</span>
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="text-white bg-white/10 hover:bg-white/25 p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer shrink-0 ml-2 border border-white/20 focus:outline-hidden focus:ring-2 focus:ring-teal-400"
            title="Close dialog (Esc)"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
        </div>

        {/* Modal Body: Active Session Information (Scrollable if height exceeds screen) */}
        <div className="p-3.5 sm:p-4 space-y-2.5 text-xs text-slate-700 bg-slate-50/50 flex-1 overflow-y-auto min-h-0">
          {/* Identity & Department Grid */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
            <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-teal-700" />
              <span>Identity &amp; Account Credentials</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-0.5">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Email Address</span>
                <span className="font-semibold text-slate-900 font-mono text-[11px] truncate block">{currentUser?.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Facility ID</span>
                <span className="font-semibold text-slate-900 font-mono text-[11px] truncate block">{currentUser?.tenantId || 'Hospital Facility'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Assigned Role</span>
                <span className="font-bold text-teal-800 capitalize text-[11px]">{currentUser?.role || 'Staff'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Clinical Portal</span>
                <span className="font-mono text-slate-700 text-[11px] truncate block">
                  Hospital e-Manager Secure
                </span>
              </div>
            </div>
          </div>

          {/* Module Access Privileges */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
            <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <BadgeCheck className="w-3.5 h-3.5 text-teal-700" />
              <span>Active Clearance &amp; Module Permissions</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] pt-0.5">
              {[
                { label: 'Dispense Meds', allowed: perms.dispensation ?? true },
                { label: 'Cashier Payments', allowed: perms.payments ?? true },
                { label: 'Inventory Directory', allowed: perms.inventory ?? true },
                { label: 'Register Formularies', allowed: perms.registration ?? (currentUser?.role === 'admin' || currentUser?.role === 'pharmacist') },
                { label: 'Stock & Expiry Radar', allowed: perms.alerts ?? true },
                { label: 'Audit Records', allowed: perms.audit ?? (currentUser?.role === 'admin') },
                { label: 'Staff Registration', allowed: perms.staffManagement ?? (currentUser?.role === 'admin') },
                { label: 'Access Control', allowed: perms.accessControl ?? (currentUser?.role === 'admin') },
              ].map((p, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] sm:text-[11px] ${
                    p.allowed 
                      ? 'bg-teal-50/60 border-teal-200 text-teal-900 font-medium' 
                      : 'bg-slate-100/60 border-slate-200 text-slate-400 line-through'
                  }`}
                >
                  <CheckCircle2 className={`w-3 h-3 shrink-0 ${p.allowed ? 'text-teal-700' : 'text-slate-300'}`} />
                  <span className="truncate">{p.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* JWT Security & Token Copy */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 truncate">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-slate-800 block text-[11px]">Active Clinical Session</span>
                <span className="text-[10px] text-slate-400 font-mono truncate block">
                  {jwtToken ? `${jwtToken.slice(0, 18)}••••••••${jwtToken.slice(-6)}` : 'Hospital Session Active'}
                </span>
              </div>
            </div>

            {jwtToken && (
              <button
                type="button"
                onClick={copyToken}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>Copy Token</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Actions Footer - Fixed at Bottom */}
        <div className="bg-slate-100 px-4 py-2.5 sm:px-5 sm:py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>

            {onOpenChangePassword && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenChangePassword();
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <KeyRound className="w-3.5 h-3.5 text-teal-700" />
                <span>Change Password</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs ml-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};
