export type UserRole = 'admin' | 'pharmacist' | 'cashier' | 'technician';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tenantName: string;
  avatarUrl?: string;
  mustChangePassword?: boolean;
  permissions?: {
    dispensation?: boolean;
    payments?: boolean;
    inventory?: boolean;
    registration?: boolean;
    alerts?: boolean;
    audit?: boolean;
    staffManagement?: boolean;
    accessControl?: boolean;
  };
}

export type DosageForm = 
  | 'Tablet' 
  | 'Capsule' 
  | 'Syrup' 
  | 'Injection' 
  | 'Ointment' 
  | 'Suspension' 
  | 'Drops' 
  | 'Inhaler' 
  | 'IV Infusion';

export type DrugCategory = string;

export interface BatchItem {
  id: string;
  batchNumber: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  manufactureDate: string;
  expiryDate: string;
  supplier: string;
  status: 'active' | 'quarantined' | 'expired' | 'depleted';
}

export interface Drug {
  id: string;
  tenantId: string;
  brandName: string;
  genericName: string;
  barcode: string;
  category: string;
  dosageForm: DosageForm;
  strength: string; // e.g. "500mg" or "10mg/ml"
  manufacturer: string;
  reorderLevel: number; // Low stock alert threshold
  storageCondition: 'Room Temp (15-25°C)' | 'Refrigerated (2-8°C)' | 'Frozen (-20°C)' | 'Cool & Dry';
  isControlled: boolean;
  batches: BatchItem[];
  totalStock: number;
  unitCost: number;
  unitPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface DrugRegistrationLog {
  id: string;
  tenantId: string;
  drugId: string;
  brandName: string;
  genericName: string;
  batchNumber: string;
  quantityAdded: number;
  costPrice: number;
  sellingPrice: number;
  expiryDate: string;
  supplier: string;
  registeredBy: string; // User name
  registeredByRole: UserRole;
  registeredAt: string;
  reason: 'Initial Registration' | 'Stock Replenishment' | 'Technician Data Ingestion' | 'Inventory Adjustment';
  notes?: string;
}

export interface DispensationLineItem {
  drugId: string;
  brandName: string;
  genericName: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  dosage: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface DispensationOrder {
  id: string;
  tenantId: string;
  orderNumber: string;
  patientName: string;
  patientAge?: number;
  patientContact?: string;
  prescribingDoctor?: string;
  prescriptionNumber?: string;
  items: DispensationLineItem[];
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  status: 'pending_payment' | 'payment_approved' | 'dispensed' | 'cancelled';
  createdBy: string;
  createdByRole: UserRole;
  createdAt: string;
  paymentApprovedBy?: string;
  paymentApprovedAt?: string;
  paymentMethod?: 'Cash' | 'Credit/Debit Card' | 'Health Insurance' | 'Mobile Transfer';
  finalizedBy?: string;
  finalizedAt?: string;
}

export interface DispensationRecord {
  id: string;
  tenantId: string;
  receiptNumber: string;
  patientName: string;
  patientAge?: number;
  patientContact?: string;
  prescribingDoctor?: string;
  prescriptionNumber?: string;
  items: DispensationLineItem[];
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paymentMethod: 'Cash' | 'Credit/Debit Card' | 'Health Insurance' | 'Mobile Transfer';
  dispensedBy: string; // Pharmacist
  dispensedByRole: UserRole;
  dispensedAt: string;
  paymentApprovedBy?: string; // Cashier / payment approver
  status: 'completed' | 'voided';
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: string;
}

export interface TenantHospital {
  id: string;
  name: string;
  adminName?: string;
  adminPhone?: string;
  adminEmail?: string;
  type?: 'General Hospital' | 'Private Clinic' | 'Retail Pharmacy Chain' | 'Community Dispensary';
  licenseNumber?: string;
  contactEmail: string;
  contactPhone: string;
  address?: string;
  accountStatus: 'active' | 'disabled' | 'pending_setup';
  subscriptionPlan?: 'Starter' | 'Hospital Pro' | 'Enterprise Health';
  subscriptionStatus?: 'active' | 'past_due' | 'trial' | 'suspended';
  monthlyFee?: number;
  registeredAt: string;
  lastActiveAt?: string;
  technicianSetupDeployed?: boolean;
  technicianDeployedAt?: string;
  technicianNotes?: string;
}

export interface StaffAccount {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatarSeed?: string;
  mustChangePassword?: boolean;
  registeredAt: string;
  permissions: {
    dispensation: boolean;
    payments: boolean;
    inventory: boolean;
    registration: boolean;
    alerts: boolean;
    audit: boolean;
    staffManagement?: boolean;
    accessControl?: boolean;
  };
}

export interface SupportTicket {
  id: string;
  tenantId: string;
  tenantName: string;
  title: string;
  category: 'Hardware/Scanner' | 'Data Import' | 'Billing & Subscription' | 'User Access' | 'Clinical Workflow' | 'Complaint';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  lastUpdated: string;
  messagesCount: number;
  submittedBy?: string;
  description?: string;
}

export interface StockAlert {
  id: string;
  drugId: string;
  brandName: string;
  genericName: string;
  batchNumber?: string;
  alertType: 'expired' | 'expiring_soon' | 'low_stock' | 'out_of_stock';
  currentStock: number;
  threshold?: number;
  expiryDate?: string;
  daysRemaining?: number;
  urgency: 'critical' | 'warning' | 'info';
  potentialRevenueLoss: number;
}

export interface AnalyticsSummary {
  totalInventoryValue: number;
  totalDispensationsToday: number;
  revenueToday: number;
  revenueThisMonth: number;
  preventedLossExpiredMeds: number;
  expiredBatchesCount: number;
  lowStockItemsCount: number;
  dailyRevenueTrend: { date: string; revenue: number; profit: number; transactions: number }[];
  categoryBreakdown: { category: string; value: number; count: number }[];
}
