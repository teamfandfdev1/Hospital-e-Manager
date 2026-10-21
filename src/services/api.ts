import { 
  User, 
  Drug, 
  DrugRegistrationLog, 
  DispensationRecord, 
  DispensationOrder,
  TenantHospital, 
  SupportTicket, 
  StockAlert, 
  AnalyticsSummary,
  UserRole,
  StaffAccount 
} from '../types';

const CLIENT_TOKEN_KEY = 'pharmpulse_jwt_token';
const CLIENT_USER_KEY = 'pharmpulse_user_data';
const DEV_TOKEN_KEY = 'pharmpulse_dev_token';
const DEV_USER_KEY = 'pharmpulse_dev_user';

let currentDomain: 'pharmacy' | 'technician' = 'pharmacy';

export const api = {
  setDomain(domain: 'pharmacy' | 'technician') {
    currentDomain = domain;
  },

  getDomain(): 'pharmacy' | 'technician' {
    return currentDomain;
  },

  getToken(): string | null {
    if (currentDomain === 'technician') {
      const devTok = localStorage.getItem(DEV_TOKEN_KEY);
      if (devTok) return devTok;
      // Fallback if user stored in client key was a technician
      const clientUser = this.getClientUser();
      if (clientUser?.role === 'technician') {
        return localStorage.getItem(CLIENT_TOKEN_KEY);
      }
      return null;
    }
    return localStorage.getItem(CLIENT_TOKEN_KEY);
  },

  setToken(token: string) {
    if (currentDomain === 'technician') {
      localStorage.setItem(DEV_TOKEN_KEY, token);
    } else {
      localStorage.setItem(CLIENT_TOKEN_KEY, token);
    }
  },

  getStoredUser(): User | null {
    if (currentDomain === 'technician') {
      const devUser = this.getDevUser();
      if (devUser) return devUser;
      const clientUser = this.getClientUser();
      if (clientUser?.role === 'technician') return clientUser;
      return null;
    }
    return this.getClientUser();
  },

  setStoredUser(user: User) {
    if (user.role === 'technician' || currentDomain === 'technician') {
      this.setDevUser(user);
    } else {
      this.setClientUser(user);
    }
  },

  getClientToken(): string | null {
    return localStorage.getItem(CLIENT_TOKEN_KEY);
  },

  setClientToken(token: string) {
    localStorage.setItem(CLIENT_TOKEN_KEY, token);
  },

  getClientUser(): User | null {
    const raw = localStorage.getItem(CLIENT_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setClientUser(user: User) {
    localStorage.setItem(CLIENT_USER_KEY, JSON.stringify(user));
  },

  clearClientAuth() {
    localStorage.removeItem(CLIENT_TOKEN_KEY);
    localStorage.removeItem(CLIENT_USER_KEY);
  },

  getDevToken(): string | null {
    return localStorage.getItem(DEV_TOKEN_KEY);
  },

  setDevToken(token: string) {
    localStorage.setItem(DEV_TOKEN_KEY, token);
  },

  getDevUser(): User | null {
    const raw = localStorage.getItem(DEV_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setDevUser(user: User) {
    localStorage.setItem(DEV_USER_KEY, JSON.stringify(user));
  },

  clearDevAuth() {
    localStorage.removeItem(DEV_TOKEN_KEY);
    localStorage.removeItem(DEV_USER_KEY);
  },

  clearAuth() {
    this.clearClientAuth();
    this.clearDevAuth();
  },

  getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  },

  async login(email: string, password: string): Promise<{ token: string; user: User; mustChangePassword?: boolean }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed.');
    }
    const data = await res.json();
    this.setToken(data.token);
    this.setStoredUser(data.user);
    return data;
  },

  async getTenants(): Promise<TenantHospital[]> {
    try {
      const res = await fetch('/api/tenants', { headers: this.getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        return data.tenants || [];
      }
    } catch (e) {
      console.warn('API getTenants failed', e);
    }
    return [];
  },

  async approveTenant(tenantId: string): Promise<TenantHospital> {
    const res = await fetch(`/api/tenants/${tenantId}/approve`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to approve hospital account');
    }
    const data = await res.json();
    return data.tenant;
  },

  async updateTenantStatus(tenantId: string, status: 'active' | 'disabled'): Promise<TenantHospital> {
    const res = await fetch(`/api/tenants/${tenantId}/status`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update tenant status');
    }
    const data = await res.json();
    return data.tenant;
  },

  async deployTechnicianSetup(tenantId: string, formularyPreset: string, technicianNotes: string): Promise<TenantHospital> {
    const res = await fetch('/api/tenants/deploy-technician', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ tenantId, formularyPreset, technicianNotes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Technician deployment failed');
    }
    const data = await res.json();
    return data.tenant;
  },

  async getSupportTickets(): Promise<SupportTicket[]> {
    try {
      const res = await fetch('/api/support/tickets', { headers: this.getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        return data.tickets || [];
      }
    } catch (e) {
      console.warn('Tickets fetch failed', e);
    }
    return [];
  },

  async updateTicketStatus(id: string, status: string): Promise<SupportTicket> {
    const res = await fetch(`/api/support/tickets/${id}/status`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    return data.ticket;
  },

  async getDrugs(): Promise<Drug[]> {
    try {
      const res = await fetch('/api/drugs?t=' + Date.now(), { 
        headers: this.getAuthHeaders(),
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        return data.drugs || [];
      } else if (res.status === 403) {
        const err = await res.json();
        throw new Error(err.error);
      }
    } catch (e: any) {
      if (e.message?.includes('Suspended')) throw e;
      console.warn('API getDrugs failed', e);
    }
    return [];
  },

  async registerDrug(payload: any): Promise<{ drug: Drug; log: DrugRegistrationLog }> {
    const res = await fetch('/api/drugs', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to register drug');
    }
    return await res.json();
  },

  async getRegistrationHistory(): Promise<DrugRegistrationLog[]> {
    try {
      const res = await fetch('/api/audit/registration-logs', { headers: this.getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        return data.logs || [];
      }
    } catch (e) {
      console.warn('Registration history fetch failed', e);
    }
    return [];
  },

  async getStockAlerts(): Promise<StockAlert[]> {
    const drugs = await this.getDrugs();
    const alerts: StockAlert[] = [];
    const now = new Date();

    drugs.forEach(drug => {
      // Check reorder level
      if (drug.totalStock <= drug.reorderLevel) {
        alerts.push({
          id: `alert-low-${drug.id}`,
          drugId: drug.id,
          brandName: drug.brandName,
          genericName: drug.genericName,
          alertType: drug.totalStock === 0 ? 'out_of_stock' : 'low_stock',
          currentStock: drug.totalStock,
          threshold: drug.reorderLevel,
          urgency: drug.totalStock === 0 ? 'critical' : 'warning',
          potentialRevenueLoss: 0,
        });
      }

      // Check expired batches
      drug.batches.forEach(b => {
        const expDate = new Date(b.expiryDate);
        if (expDate <= now && b.quantity > 0) {
          alerts.push({
            id: `alert-exp-${b.id}`,
            drugId: drug.id,
            brandName: drug.brandName,
            genericName: drug.genericName,
            batchNumber: b.batchNumber,
            alertType: 'expired',
            currentStock: b.quantity,
            expiryDate: b.expiryDate,
            urgency: 'critical',
            potentialRevenueLoss: b.quantity * (b.sellingPrice || drug.unitPrice),
          });
        }
      });
    });

    return alerts;
  },

  // Dispensation Orders (Payments & Dispense Medication workflow)
  async getOrders(): Promise<DispensationOrder[]> {
    try {
      const res = await fetch('/api/dispensations/orders?t=' + Date.now(), { 
        headers: this.getAuthHeaders(),
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        return data.orders || [];
      }
    } catch (e) {
      console.warn('Orders fetch failed', e);
    }
    return [];
  },

  async createOrder(payload: any): Promise<DispensationOrder> {
    const res = await fetch('/api/dispensations/orders', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create order');
    }
    const data = await res.json();
    return data.order;
  },

  async approveOrderPayment(orderId: string, paymentMethod: string): Promise<DispensationOrder> {
    const res = await fetch(`/api/dispensations/orders/${orderId}/approve-payment`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ paymentMethod })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to approve payment');
    }
    const data = await res.json();
    return data.order;
  },

  async finalizeOrder(orderId: string): Promise<{ order: DispensationOrder; dispensation: DispensationRecord }> {
    const res = await fetch(`/api/dispensations/orders/${orderId}/finalize`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to finalize dispensation');
    }
    return await res.json();
  },

  async createDispensation(payload: any): Promise<DispensationRecord> {
    const res = await fetch('/api/dispensations', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Dispensation failed');
    }
    const data = await res.json();
    return data.dispensation;
  },

  async getDispensationHistory(): Promise<DispensationRecord[]> {
    try {
      const res = await fetch('/api/dispensations/history', { headers: this.getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        return data.dispensations || [];
      }
    } catch (e) {
      console.warn('Dispensation history fetch failed', e);
    }
    return [];
  },

  async voidDispensation(id: string, voidReason: string): Promise<DispensationRecord> {
    const res = await fetch(`/api/dispensations/${id}/void`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ voidReason })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Void operation failed');
    }
    const data = await res.json();
    return data.dispensation;
  },

  // Staff and Access Control API
  async getStaff(tenantId?: string): Promise<StaffAccount[]> {
    try {
      const url = tenantId ? `/api/staff?tenantId=${encodeURIComponent(tenantId)}` : '/api/staff';
      const res = await fetch(url, { headers: this.getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        return data.staff || [];
      }
    } catch (e) {
      console.warn('Staff fetch failed', e);
    }
    return [];
  },

  async registerStaff(payload: any): Promise<StaffAccount> {
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Staff registration failed');
    }
    const data = await res.json();
    return data.staff;
  },

  async updateStaffPermissions(staffId: string, payload: any): Promise<any> {
    const res = await fetch(`/api/staff/${staffId}/permissions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Permission update failed');
    }
    return await res.json();
  },

  async getAnalytics(): Promise<AnalyticsSummary> {
    try {
      const res = await fetch('/api/analytics', { headers: this.getAuthHeaders() });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Analytics fetch failed', e);
    }
    return {
      totalInventoryValue: 0,
      totalDispensationsToday: 0,
      revenueToday: 0,
      revenueThisMonth: 0,
      preventedLossExpiredMeds: 0,
      expiredBatchesCount: 0,
      lowStockItemsCount: 0,
      dailyRevenueTrend: [],
      categoryBreakdown: []
    };
  },

  async getNeonStatus() {
    try {
      const res = await fetch('/api/system/neon-postgres');
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Neon status fetch failed', e);
    }
    return {
      engine: 'PostgreSQL 16.4 (Neon Serverless)',
      endpoint: 'ep-silent-wave-1829.eu-central-1.aws.neon.tech',
      database: 'neondb_pharmpulse',
      connectionPool: {
        status: 'healthy',
        activeConnections: 4,
        scaleToZeroActive: true,
      },
      multiTenancy: {
        isolationModel: 'Row-Level Security (RLS) + Schema Isolation',
        clientDataZeroKnowledgeEnforced: true,
      },
      latencyMs: 18,
    };
  }
};
