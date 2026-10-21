import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  AlertTriangle, 
  Lock, 
  PhoneCall, 
  HelpCircle,
  RefreshCw,
  Headphones
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardView } from './components/DashboardView';
import { DispensationPosView } from './components/DispensationPosView';
import { PaymentsView } from './components/PaymentsView';
import { InventoryView } from './components/InventoryView';
import { DrugRegistrationView } from './components/DrugRegistrationView';
import { AuditTrailsView } from './components/AuditTrailsView';
import { StockAlertsView } from './components/StockAlertsView';
import { TechnicianOpsView } from './components/TechnicianOpsView';
import { AccessControlView } from './components/AccessControlView';
import { AuthModal } from './components/AuthModal';
import { AuthPage } from './components/AuthPage';
import { DeveloperAuthPage } from './components/DeveloperAuthPage';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { CustomerServiceModal } from './components/CustomerServiceModal';
import { ToastContainer, ToastItem } from './components/Toast';
import { api } from './services/api';
import { 
  User, 
  Drug, 
  StockAlert, 
  AnalyticsSummary, 
  DrugRegistrationLog, 
  DispensationRecord, 
  DispensationOrder,
  TenantHospital, 
  SupportTicket, 
  UserRole 
} from './types';

// Detect whether current session is accessing the isolated developer ops portal
const checkIsOpsRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    host.startsWith('ops.') ||
    host.startsWith('dev.') ||
    host.startsWith('technician.') ||
    path === '/developer' ||
    path === '/ops' ||
    path === '/console' ||
    path.startsWith('/developer/') ||
    path.startsWith('/ops/') ||
    search.includes('portal=developer') ||
    search.includes('portal=ops') ||
    search.includes('mode=developer') ||
    search.includes('dev=1') ||
    hash.includes('/developer') ||
    hash.includes('/ops')
  );
};

export default function App() {
  // Domain isolation: 'pharmacy' (Hospital Workstation) vs 'technician' (Isolated Developer Console)
  const [activeDomain, setActiveDomain] = useState<'pharmacy' | 'technician'>(() => {
    return checkIsOpsRoute() ? 'technician' : 'pharmacy';
  });

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Collapsible Sidebar state on all devices
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Developer configuration status (Prompt: developer one-time registration is the page which loads first)
  const [isDevConfigured, setIsDevConfigured] = useState<boolean | null>(null);

  // Domain-Isolated Auth & Sessions:
  // 1. Client Pharmacy Session
  const [clientUser, setClientUser] = useState<User | null>(() => {
    const u = api.getClientUser();
    return u && u.role !== 'technician' ? u : null;
  });
  const [clientToken, setClientToken] = useState<string | null>(() => {
    const u = api.getClientUser();
    return u && u.role !== 'technician' ? api.getClientToken() : null;
  });

  // 2. Developer Operations Session (strictly restricted to role === 'technician')
  const [devUser, setDevUser] = useState<User | null>(() => {
    const du = api.getDevUser();
    if (du && du.role === 'technician') return du;
    const cu = api.getClientUser();
    if (cu && cu.role === 'technician') return cu;
    return null;
  });
  const [devToken, setDevToken] = useState<string | null>(() => {
    const dt = api.getDevToken();
    if (dt) return dt;
    const cu = api.getClientUser();
    if (cu && cu.role === 'technician') return api.getClientToken();
    return null;
  });

  // Active user context strictly enforced by domain:
  // In 'technician' domain: ONLY the developer session (role: 'technician') is valid!
  // In 'pharmacy' domain: client hospital user (or developer inspecting modules)
  const user = activeDomain === 'technician'
    ? (devUser && devUser.role === 'technician' ? devUser : null)
    : (clientUser && clientUser.role !== 'technician' ? clientUser : (devUser && devUser.role === 'technician' ? devUser : null));

  const jwtToken = activeDomain === 'technician'
    ? (devUser && devUser.role === 'technician' ? devToken : null)
    : (clientToken || (devUser && devUser.role === 'technician' ? devToken : null));

  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);

  // App Data (Started clean, no mock data)
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [orders, setOrders] = useState<DispensationOrder[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [registrationLogs, setRegistrationLogs] = useState<DrugRegistrationLog[]>([]);
  const [dispensations, setDispensations] = useState<DispensationRecord[]>([]);
  const [tenants, setTenants] = useState<TenantHospital[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // Modals & UI
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCustomerServiceOpen, setIsCustomerServiceOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isAccountDisabled, setIsAccountDisabled] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Toast Helper
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Route Synchronization: Listen for popstate and hash changes
  useEffect(() => {
    const handleRouteSync = () => {
      const isOps = checkIsOpsRoute();
      const targetDomain = isOps ? 'technician' : 'pharmacy';
      setActiveDomain(targetDomain);
      api.setDomain(targetDomain);
    };
    window.addEventListener('popstate', handleRouteSync);
    window.addEventListener('hashchange', handleRouteSync);
    return () => {
      window.removeEventListener('popstate', handleRouteSync);
      window.removeEventListener('hashchange', handleRouteSync);
    };
  }, []);

  // Check Developer System Status on mount
  useEffect(() => {
    fetch('/api/developer/status?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const configured = Boolean(data.isConfigured);
        setIsDevConfigured(configured);
        if (configured) {
          try {
            localStorage.setItem('pharmpulse_developer_configured', 'true');
          } catch {}
        }
        // Only if developer is unconfigured AND user is explicitly visiting an ops route
        const wasConfigured = typeof window !== 'undefined' && localStorage.getItem('pharmpulse_developer_configured') === 'true';
        if (configured === false && !wasConfigured && checkIsOpsRoute()) {
          setActiveDomain('technician');
          api.setDomain('technician');
        }
      })
      .catch(() => {
        const wasConfigured = typeof window !== 'undefined' && localStorage.getItem('pharmpulse_developer_configured') === 'true';
        setIsDevConfigured(wasConfigured);
      });
  }, []);

  // Initial Authentication & Data Hydration
  const loadInitialData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      // Hydrate Dev Session
      const storedDevUser = api.getDevUser();
      const storedDevToken = api.getDevToken();
      const legacyUser = api.getClientUser();
      const legacyToken = api.getClientToken();

      if (storedDevUser && storedDevUser.role === 'technician' && storedDevToken) {
        setDevUser(storedDevUser);
        setDevToken(storedDevToken);
      } else if (legacyUser?.role === 'technician' && legacyToken) {
        api.setDevUser(legacyUser);
        api.setDevToken(legacyToken);
        setDevUser(legacyUser);
        setDevToken(legacyToken);
      }

      // Hydrate Client Session
      if (legacyUser && legacyUser.role !== 'technician' && legacyToken) {
        // Validate with backend
        const meRes = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${legacyToken}` }
        }).catch(() => null);

        if (meRes && meRes.ok) {
          setClientUser(legacyUser);
          setClientToken(legacyToken);
          setMustChangePassword(Boolean(legacyUser.mustChangePassword));
        } else {
          api.clearClientAuth();
          setClientUser(null);
          setClientToken(null);
        }
      }

      // Fetch tenants
      const tenantList = await api.getTenants();
      setTenants(tenantList);

      const activeTenant = tenantList.find(t => t.id === legacyUser?.tenantId);
      if (activeTenant && activeTenant.accountStatus === 'disabled') {
        setIsAccountDisabled(true);
      } else {
        setIsAccountDisabled(false);
      }

      const [fetchedDrugs, fetchedOrders, fetchedAlerts, fetchedAnalytics, fetchedLogs, fetchedDispensations, fetchedTickets] = await Promise.all([
        api.getDrugs().catch(() => []),
        api.getOrders().catch(() => []),
        api.getStockAlerts().catch(() => []),
        api.getAnalytics().catch(() => null),
        api.getRegistrationHistory().catch(() => []),
        api.getDispensationHistory().catch(() => []),
        api.getSupportTickets().catch(() => []),
      ]);

      setDrugs(fetchedDrugs);
      setOrders(fetchedOrders);
      setAlerts(fetchedAlerts);
      setAnalytics(fetchedAnalytics);
      setRegistrationLogs(fetchedLogs);
      setDispensations(fetchedDispensations);
      setTickets(fetchedTickets);
    } catch (err: any) {
      console.error('Data load error:', err);
      if (err.message?.includes('Suspended')) {
        setIsAccountDisabled(true);
      }
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());

  // Real-time silent background data refresher for Dispensation & Payments
  const refreshRealtimeData = useCallback(async (silent = true) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [fetchedOrders, fetchedDrugs, fetchedDispensations] = await Promise.all([
        api.getOrders().catch(() => []),
        api.getDrugs().catch(() => []),
        api.getDispensationHistory().catch(() => []),
      ]);
      if (fetchedOrders) setOrders(fetchedOrders);
      if (fetchedDrugs && fetchedDrugs.length > 0) setDrugs(fetchedDrugs);
      if (fetchedDispensations) setDispensations(fetchedDispensations);
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('Realtime sync silent polling error:', err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  // Automatic real-time refresh interval (every 3 seconds) for Dispensation & Payments modules
  useEffect(() => {
    if (activeDomain !== 'pharmacy' || isAccountDisabled) return;
    if (currentTab !== 'dispensation' && currentTab !== 'payments') return;

    // Immediately trigger silent refresh upon entering either tab
    refreshRealtimeData(true);

    const intervalId = setInterval(() => {
      refreshRealtimeData(true);
    }, 3000); // Poll every 3 seconds for real-time order & payment updates

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshRealtimeData(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [activeDomain, isAccountDisabled, currentTab, refreshRealtimeData]);

  // Handle Domain Switching (Internal / Developer routing)
  const handleDomainChange = (domain: 'pharmacy' | 'technician') => {
    setActiveDomain(domain);
    api.setDomain(domain);
    if (domain === 'pharmacy') {
      setCurrentTab('dashboard');
      try {
        if (window.location.pathname.includes('developer') || window.location.pathname.includes('ops')) {
          window.history.pushState({}, '', '/');
        }
      } catch {}
      if (devUser && devUser.role === 'technician') {
        showToast('Switched to Client Workstation View', 'info');
      }
    } else {
      setCurrentTab('hospitals');
      try {
        if (!window.location.pathname.includes('developer') && !window.location.pathname.includes('ops')) {
          window.history.pushState({}, '', '/developer');
        }
      } catch {}
      if (devUser && devUser.role === 'technician') {
        showToast('Developer Console unlocked with master authority.', 'info');
      } else {
        showToast('Developer Console: Master password authentication required.', 'warning');
      }
    }
  };

  // Global Keyboard Shortcuts (Alt+D, Alt+R, Alt+I, Alt+A and Developer Shortcut Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

      if (e.key === 'Escape') {
        setIsAuthOpen(false);
        setIsMobileSidebarOpen(false);
        setIsCustomerServiceOpen(false);
      }

      // Secret Developer Access Shortcut (Ctrl+Shift+D or Cmd+Shift+D)
      // Completely invisible in UI; enables developer to switch to developer portal directly from any screen
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        handleDomainChange(activeDomain === 'pharmacy' ? 'technician' : 'pharmacy');
        return;
      }

      if (e.altKey && !isInput && activeDomain === 'pharmacy') {
        if (e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          setCurrentTab('dispensation');
          showToast('Navigated to Dispense Medication (Alt+D)', 'info');
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          setCurrentTab('registration');
          showToast('Navigated to Register Medication (Alt+R)', 'info');
        } else if (e.key === 'i' || e.key === 'I') {
          e.preventDefault();
          setCurrentTab('inventory');
          showToast('Navigated to Inventory (Alt+I)', 'info');
        } else if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          setCurrentTab('alerts');
          showToast('Navigated to Stock Alerts (Alt+A)', 'info');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showToast, activeDomain]);

  // Authentication Callbacks
  const handleLoginSuccess = (token: string, authUser: User, needsPasswordChange?: boolean) => {
    if (authUser.role === 'technician') {
      setDevUser(authUser);
      setDevToken(token);
      api.setDevUser(authUser);
      api.setDevToken(token);
      setActiveDomain('technician');
      api.setDomain('technician');
      setCurrentTab('hospitals');
      showToast('Developer Console unlocked with master authority.', 'success');
    } else {
      setClientUser(authUser);
      setClientToken(token);
      api.setClientUser(authUser);
      api.setClientToken(token);
      setActiveDomain('pharmacy');
      api.setDomain('pharmacy');
      setCurrentTab('dashboard');
      if (needsPasswordChange || authUser.mustChangePassword) {
        setMustChangePassword(true);
      } else {
        setMustChangePassword(false);
      }
      showToast(`Welcome to ${authUser.tenantName || 'Hospital Pharmacy Workstation'}, ${authUser.name}.`, 'success');
    }

    loadInitialData();
  };

  const handleLogout = () => {
    if (activeDomain === 'technician') {
      api.clearDevAuth();
      setDevUser(null);
      setDevToken(null);
      showToast('Signed out of Developer Operations Console.', 'warning');
    } else {
      api.clearClientAuth();
      setClientUser(null);
      setClientToken(null);
      setMustChangePassword(false);
      showToast('Signed out of hospital workstation session.', 'warning');
    }
  };

  const handleDevLogout = () => {
    api.clearDevAuth();
    setDevUser(null);
    setDevToken(null);
    showToast('Signed out of Developer Operations Console.', 'warning');
  };

  const handlePasswordChanged = (newToken: string) => {
    setClientToken(newToken);
    api.setClientToken(newToken);
    if (clientUser) {
      const updatedUser = { ...clientUser, mustChangePassword: false };
      setClientUser(updatedUser);
      api.setClientUser(updatedUser);
    }
    setMustChangePassword(false);
    showToast('Password changed successfully. Full clinical access enabled.', 'success');
  };

  // Pharmacy Clinical Handlers
  const handleRegisterDrug = async (payload: any) => {
    const res = await api.registerDrug(payload);
    const [updatedDrugs, updatedAlerts, updatedLogs, updatedAnalytics] = await Promise.all([
      api.getDrugs(),
      api.getStockAlerts(),
      api.getRegistrationHistory(),
      api.getAnalytics()
    ]);
    setDrugs(updatedDrugs);
    setAlerts(updatedAlerts);
    setRegistrationLogs(updatedLogs);
    setAnalytics(updatedAnalytics);
    return res;
  };

  // Orders & Payments Handlers
  const handleCreateOrder = async (payload: any) => {
    const order = await api.createOrder(payload);
    const updatedOrders = await api.getOrders();
    setOrders(updatedOrders);
    showToast(`Dispensation order #${order.orderNumber} created. Awaiting cashier payment approval in Payments.`, 'info');
    return order;
  };

  const handleApprovePayment = async (orderId: string, paymentMethod: string) => {
    await api.approveOrderPayment(orderId, paymentMethod);
    const updatedOrders = await api.getOrders();
    setOrders(updatedOrders);
  };

  const handleFinalizeOrder = async (orderId: string) => {
    const res = await api.finalizeOrder(orderId);
    const [updatedOrders, updatedDrugs, updatedAlerts, updatedDispensations, updatedAnalytics] = await Promise.all([
      api.getOrders(),
      api.getDrugs(),
      api.getStockAlerts(),
      api.getDispensationHistory(),
      api.getAnalytics(),
    ]);
    setOrders(updatedOrders);
    setDrugs(updatedDrugs);
    setAlerts(updatedAlerts);
    setDispensations(updatedDispensations);
    setAnalytics(updatedAnalytics);
    showToast(`Dispensation finalized. Receipt #${res.dispensation.receiptNumber} issued.`, 'success');
    return res.dispensation;
  };

  const handleVoidDispensation = async (id: string, reason: string) => {
    const res = await api.voidDispensation(id, reason);
    const [updatedDrugs, updatedDispensations, updatedAlerts, updatedAnalytics] = await Promise.all([
      api.getDrugs(),
      api.getDispensationHistory(),
      api.getStockAlerts(),
      api.getAnalytics(),
    ]);
    setDrugs(updatedDrugs);
    setDispensations(updatedDispensations);
    setAlerts(updatedAlerts);
    setAnalytics(updatedAnalytics);
    return res;
  };

  // Developer / Technician Handlers
  const handleApproveTenant = async (tenantId: string) => {
    await api.approveTenant(tenantId);
    const updatedTenants = await api.getTenants();
    setTenants(updatedTenants);
    showToast('Hospital account approved! Admin promoted with full access privileges.', 'success');
  };

  const handleToggleTenantStatus = async (tenantId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'disabled' : 'active';
    const updated = await api.updateTenantStatus(tenantId, nextStatus);
    setTenants(prev => prev.map(t => t.id === tenantId ? updated : t));
    showToast(`Facility account ${updated.name} is now ${nextStatus.toUpperCase()}.`, nextStatus === 'active' ? 'success' : 'warning');
    
    if (user?.tenantId === tenantId) {
      setIsAccountDisabled(nextStatus === 'disabled');
    }
  };

  const handleDeployTechnician = async (tenantId: string, formulary: string, notes: string) => {
    const updated = await api.deployTechnicianSetup(tenantId, formulary, notes);
    setTenants(prev => prev.map(t => t.id === tenantId ? updated : t));
    if (user?.tenantId === tenantId) {
      const updatedDrugs = await api.getDrugs();
      setDrugs(updatedDrugs);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    const updated = await api.updateTicketStatus(ticketId, status);
    setTickets(prev => prev.map(t => t.id === ticketId ? updated : t));
    showToast(`Customer Service ticket #${ticketId} marked as ${status.toUpperCase()}.`, 'success');
  };

  // Developer Direct Module Launcher handler
  const handleLaunchClientModule = (moduleTab: string, tenantId?: string) => {
    setActiveDomain('pharmacy');
    setCurrentTab(moduleTab);
    showToast(`Navigated directly to ${moduleTab.toUpperCase()} module.`, 'info');
  };

  /* ======================================================================== */
  /* SCREEN 1: UNAUTHENTICATED USERS (SIGN IN / REGISTER FACILITY PAGE)        */
  /* ======================================================================== */
  if (!user || !jwtToken) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100" style={{ fontFamily: "Calibri, 'Candara', 'Segoe UI', Optima, Arial, sans-serif" }}>
        {/* If on technician ops domain: show DeveloperAuthPage; If on client pharmacy domain: show AuthPage */}
        {activeDomain === 'technician' ? (
          <DeveloperAuthPage
            onLoginSuccess={handleLoginSuccess}
            onShowToast={showToast}
            onSwitchToClientDomain={() => handleDomainChange('pharmacy')}
            activeClientUser={clientUser}
          />
        ) : (
          <AuthPage
            onLoginSuccess={handleLoginSuccess}
            onShowToast={showToast}
          />
        )}

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  /* ======================================================================== */
  /* SCREEN 2: AUTHENTICATED WORKSTATION                                       */
  /* ======================================================================== */
  const isTechnicianDomain = activeDomain === 'technician';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-teal-600 selection:text-white" style={{ fontFamily: "Calibri, 'Candara', 'Segoe UI', Optima, Arial, sans-serif" }}>
      <div className="flex-1 flex min-h-0 relative">
        {/* Collapsible Sidebar: Prompt: "the sidebar is not necessary on the developer dashboard since all the modules can be accessed directly from the dashboard" */}
        {!isTechnicianDomain && (
          <Sidebar
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            user={user}
            onOpenAuth={() => setIsAuthOpen(true)}
            activeDomain={activeDomain}
            alertCount={alerts.length}
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
            isMobileOpen={isMobileSidebarOpen}
            setIsMobileOpen={setIsMobileSidebarOpen}
            onLogout={handleLogout}
          />
        )}

        {/* Main Content Area */}
        <div 
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
            !isTechnicianDomain ? (isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64') : 'w-full'
          }`}
        >
          {/* Top Header */}
          <TopHeader
            currentTab={currentTab}
            user={user}
            onOpenAuth={() => setIsAuthOpen(true)}
            activeDomain={activeDomain}
            setActiveDomain={handleDomainChange}
            alertCount={alerts.length}
            onToggleSidebarMobile={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            isCollapsed={isSidebarCollapsed}
            onToggleSidebarDesktop={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            onNavigate={setCurrentTab}
            onOpenCustomerService={() => setIsCustomerServiceOpen(true)}
            onLogout={handleLogout}
            onRegisterNewHospital={() => {
              handleLogout();
              setActiveDomain('pharmacy');
            }}
          />

          {/* Viewport Content */}
          <main className="flex-1 p-3 sm:p-5 lg:p-7 max-w-7xl w-full mx-auto">
            {/* Account Suspended Notice */}
            {activeDomain === 'pharmacy' && isAccountDisabled ? (
              <div className="bg-white rounded-xl border border-rose-200 p-8 text-center max-w-xl mx-auto shadow-xs my-8 space-y-4">
                <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  Hospital Facility Account Disabled
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  This facility account has been suspended by the administrator. Contact customer service to reactivate.
                </p>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center justify-center gap-2">
                  <PhoneCall className="w-4 h-4 text-teal-600" />
                  <span>Support: support@hospital-emanager.health</span>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setIsCustomerServiceOpen(true)}
                    className="px-5 py-2.5 bg-teal-700 text-white rounded-lg text-xs font-semibold hover:bg-teal-800 transition-colors cursor-pointer shadow-xs inline-flex items-center gap-2"
                  >
                    <Headphones className="w-4 h-4" />
                    <span>Contact Customer Service Desk</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* DOMAIN 1: CLIENT PHARMACY VIEWS */}
                {activeDomain === 'pharmacy' && (
                  <>
                    {currentTab === 'dashboard' && analytics && (
                      <DashboardView
                        analytics={analytics}
                        alerts={alerts}
                        drugs={drugs}
                        onNavigate={setCurrentTab}
                        onRefresh={loadInitialData}
                      />
                    )}

                    {currentTab === 'dispensation' && (
                      <DispensationPosView
                        drugs={drugs}
                        orders={orders}
                        onCreateOrder={handleCreateOrder}
                        onFinalizeOrder={handleFinalizeOrder}
                        onShowToast={showToast}
                        onNavigateToPayments={() => setCurrentTab('payments')}
                        onRefreshOrders={() => refreshRealtimeData(false)}
                        isRefreshing={isRefreshing}
                        lastSyncTime={lastSyncTime}
                      />
                    )}

                    {currentTab === 'payments' && (
                      <PaymentsView
                        orders={orders}
                        currentUser={user}
                        onApprovePayment={handleApprovePayment}
                        onRefreshOrders={() => refreshRealtimeData(false)}
                        onShowToast={showToast}
                        isRefreshing={isRefreshing}
                        lastSyncTime={lastSyncTime}
                      />
                    )}

                    {currentTab === 'inventory' && (
                      <InventoryView
                        drugs={drugs}
                        onShowToast={showToast}
                        onNavigate={setCurrentTab}
                      />
                    )}

                    {currentTab === 'registration' && (
                      <DrugRegistrationView
                        drugs={drugs}
                        jwtToken={jwtToken}
                        onRegisterDrug={handleRegisterDrug}
                        onShowToast={showToast}
                        onNavigate={setCurrentTab}
                      />
                    )}

                    {currentTab === 'alerts' && (
                      <StockAlertsView
                        alerts={alerts}
                        drugs={drugs}
                        onShowToast={showToast}
                        onNavigate={setCurrentTab}
                      />
                    )}

                    {currentTab === 'audit' && (
                      <AuditTrailsView
                        registrationLogs={registrationLogs}
                        dispensations={dispensations}
                        onVoidDispensation={handleVoidDispensation}
                        onShowToast={showToast}
                      />
                    )}

                    {currentTab === 'access' && user?.role === 'admin' && (
                      <AccessControlView
                        currentUser={user}
                        activeDomain="pharmacy"
                        tenants={tenants}
                        onShowToast={showToast}
                      />
                    )}
                  </>
                )}

                {/* DOMAIN 2: DEVELOPER & SERVER OPS (NO SIDEBAR MODE) */}
                {activeDomain === 'technician' && (
                  devUser && devUser.role === 'technician' ? (
                    <TechnicianOpsView
                      currentUser={devUser}
                      onLogout={handleDevLogout}
                      tenants={tenants}
                      tickets={tickets}
                      onToggleTenantStatus={handleToggleTenantStatus}
                      onApproveTenant={handleApproveTenant}
                      onDeployTechnician={handleDeployTechnician}
                      onUpdateTicketStatus={handleUpdateTicketStatus}
                      onShowToast={showToast}
                      onNavigateClientModule={handleLaunchClientModule}
                    />
                  ) : (
                    <div className="max-w-2xl mx-auto my-8">
                      <DeveloperAuthPage
                        onLoginSuccess={handleLoginSuccess}
                        onShowToast={showToast}
                        onSwitchToClientDomain={() => handleDomainChange('pharmacy')}
                        activeClientUser={clientUser}
                      />
                    </div>
                  )
                )}
              </>
            )}
          </main>

          {/* Minimalist Footer: Prompt requirement: "In the footer, remove the site URL and the database name, they are unnecessary." */}
          <footer className="bg-white border-t border-slate-200/80 text-slate-500 text-xs py-3 px-4 sm:px-6 mt-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">Hospital e-Manager</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAuthOpen(true)}
                className="hover:text-teal-700 transition-colors font-mono"
              >
                Session: {user?.role || 'active'}
              </button>
              <span>·</span>
              <span>© 2026 Hospital e-Manager</span>
            </div>
          </footer>
        </div>
      </div>

      {/* Mandatory First-Time Password Change Modal */}
      {mustChangePassword && (
        <ChangePasswordModal
          isOpen={mustChangePassword}
          onSuccess={handlePasswordChanged}
          onShowToast={showToast}
          jwtToken={jwtToken}
          userName={user?.name || 'Staff User'}
        />
      )}

      {/* Customer Service Complaint Submission Modal */}
      <CustomerServiceModal
        isOpen={isCustomerServiceOpen}
        onClose={() => setIsCustomerServiceOpen(false)}
        jwtToken={jwtToken}
        onShowToast={showToast}
      />

      {/* Profile & Session Modal (Clean, no mock users) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={user}
        jwtToken={jwtToken}
        onLogout={handleLogout}
        onShowToast={showToast}
        activeDomain={activeDomain}
        onOpenChangePassword={() => setMustChangePassword(true)}
        onRegisterNewHospital={() => {
          handleLogout();
          setActiveDomain('pharmacy');
        }}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}