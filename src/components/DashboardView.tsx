import React from 'react';
import {
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  PlusCircle,
  ShieldCheck,
  Clock,
  ArrowRight,
  AlertOctagon,
  RefreshCw,
  CreditCard,
  CheckCircle2,
  FileText,
  Lock,
  Boxes,
} from 'lucide-react';
import {
  AnalyticsSummary,
  StockAlert,
  Drug,
  User,
  DispensationOrder,
  DispensationRecord,
  DrugRegistrationLog,
} from '../types';
import { formatNaira } from '../utils/currency';

interface DashboardViewProps {
  analytics: AnalyticsSummary;
  alerts: StockAlert[];
  drugs: Drug[];
  orders?: DispensationOrder[];
  dispensations?: DispensationRecord[];
  registrationLogs?: DrugRegistrationLog[];
  user?: User | null;
  onNavigate: (tab: string) => void;
  onRefresh: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  analytics,
  alerts,
  drugs,
  orders = [],
  dispensations = [],
  registrationLogs = [],
  user,
  onNavigate,
  onRefresh,
}) => {
  const isAdmin = user?.role === 'admin';
  const perms = user?.permissions || {
    dispensation: true,
    payments: true,
    inventory: true,
    registration: true,
    alerts: true,
    audit: true,
  };

  const canDispensation = isAdmin || Boolean(perms.dispensation);
  const canPayments = isAdmin || Boolean(perms.payments);
  const canInventory = isAdmin || Boolean(perms.inventory);
  const canRegistration = isAdmin || Boolean(perms.registration);
  const canAlerts = isAdmin || Boolean(perms.alerts);
  const canAudit = isAdmin || Boolean(perms.audit);

  const hasAnyModule =
    canDispensation ||
    canPayments ||
    canInventory ||
    canRegistration ||
    canAlerts ||
    canAudit;

  const pendingPaymentOrders = orders.filter((o) => o.status === 'pending_payment');
  const approvedOrders = orders.filter((o) => o.status === 'payment_approved');
  const pendingPaymentTotal = pendingPaymentOrders.reduce(
    (sum, o) => sum + (Number(o.totalAmount) || 0),
    0
  );

  const criticalAlerts = alerts.filter((a) => a.urgency === 'critical');
  const warningAlerts = alerts.filter((a) => a.urgency === 'warning');

  const showRevenueAnalytics = canPayments || canAudit;
  const showFormularyBreakdown = canInventory;
  const showDispenserActivity = canDispensation && !showRevenueAnalytics;
  const showRegistrationPanel =
    canRegistration && !showRevenueAnalytics && !showFormularyBreakdown && !showDispenserActivity;
  const showAuditPanel = canAudit && !showFormularyBreakdown;

  const hasSecondaryRightPanel = showFormularyBreakdown || showAuditPanel;

  // Build visible KPI count to keep grid balanced
  const showInventoryKpi = canInventory;
  const showRevenueKpi = canPayments || canAudit;
  const showPaymentsQueueKpi = canPayments;
  const showDispensationKpi = canDispensation && !canPayments;
  const showAlertsKpi = canAlerts;
  const showRegistrationKpi = canRegistration && !canInventory;
  const showAuditKpi = canAudit && !canPayments && !canInventory;

  const visibleKpiCount = [
    showInventoryKpi,
    showRevenueKpi,
    showPaymentsQueueKpi,
    showDispensationKpi,
    showAlertsKpi,
    showRegistrationKpi,
    showAuditKpi,
  ].filter(Boolean).length;

  const kpiGridCols =
    visibleKpiCount <= 1
      ? 'grid-cols-1 max-w-md'
      : visibleKpiCount === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : visibleKpiCount === 3
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4';

  const headerSubtitle = (() => {
    const labels: string[] = [];
    if (canInventory) labels.push('Formulary');
    if (canDispensation) labels.push('Dispensing');
    if (canPayments) labels.push('Payments');
    if (canAlerts) labels.push('Stock Alerts');
    if (canRegistration && !canInventory) labels.push('Registrations');
    if (canAudit) labels.push('Audits');
    if (labels.length === 0) return 'Workspace Overview';
    return `Live ${labels.slice(0, 3).join(' · ')} Overview`;
  })();

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-800">{headerSubtitle}</span>
          <span className="text-slate-300 hidden sm:inline">·</span>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Showing authorized modules for your role
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{canInventory ? 'Sync Stock' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* Empty State if user has no modules assigned */}
      {!hasAnyModule && (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center max-w-xl mx-auto shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Clinical Modules Assigned</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your account does not currently have module permissions enabled. Please contact your Hospital Administrator to grant access to your assigned clinical modules.
          </p>
        </div>
      )}

      {/* LIVE POP-UP 1: Dispensation Orders Awaiting Payment Approval (Payments Access Only) */}
      {canPayments && pendingPaymentOrders.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2 flex-wrap">
                  <span>Dispensation Orders Awaiting Payment Approval</span>
                  <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 font-mono font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                    {pendingPaymentOrders.length}{' '}
                    {pendingPaymentOrders.length === 1 ? 'Order Pending' : 'Orders Pending'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-amber-300 text-amber-900 font-mono font-semibold">
                    {formatNaira(pendingPaymentTotal, false)}
                  </span>
                </h3>
                <p className="text-xs text-amber-900/80">
                  New dispensation orders require payment confirmation before medications can be handed out. Click any order to open Payments.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('payments')}
              className="self-start sm:self-center inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shrink-0 cursor-pointer shadow-2xs"
            >
              <span>Go to Payments</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            {pendingPaymentOrders.slice(0, 3).map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => onNavigate('payments')}
                className="text-left bg-white hover:bg-amber-50/60 p-3 rounded-lg border border-amber-200 hover:border-amber-400 flex items-start justify-between gap-2 min-w-0 overflow-hidden transition-all cursor-pointer group shadow-2xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 truncate">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                    <span className="truncate">{order.patientName}</span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                    #{order.orderNumber} · {order.items.length}{' '}
                    {order.items.length === 1 ? 'medication' : 'medications'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                    <span className="truncate">By {order.createdBy}</span>
                  </p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end justify-between gap-1.5">
                  <span className="font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                    {formatNaira(order.totalAmount, false)}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-800 bg-amber-100 group-hover:bg-amber-600 group-hover:text-white px-2 py-0.5 rounded transition-colors">
                    <span>Approve</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>

          {pendingPaymentOrders.length > 3 && (
            <div className="mt-2.5 text-right">
              <button
                type="button"
                onClick={() => onNavigate('payments')}
                className="text-xs font-semibold text-amber-900 hover:text-amber-700 hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <span>
                  View all {pendingPaymentOrders.length} orders awaiting payment approval
                </span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* LIVE POP-UP 2: Payment-Approved Orders Ready for Dispensation Handout (Dispensation Access Only) */}
      {canDispensation && approvedOrders.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2 flex-wrap">
                  <span>Paid Orders Ready for Medication Handout</span>
                  <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-950 font-mono font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    {approvedOrders.length}{' '}
                    {approvedOrders.length === 1 ? 'Order Ready' : 'Orders Ready'}
                  </span>
                </h3>
                <p className="text-xs text-emerald-900/80">
                  Payment has been verified by the cashier. Click any order to finalize dispensation and print the receipt.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('dispensation')}
              className="self-start sm:self-center inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shrink-0 cursor-pointer shadow-2xs"
            >
              <span>Open Dispense Medication</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            {approvedOrders.slice(0, 3).map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => onNavigate('dispensation')}
                className="text-left bg-white hover:bg-emerald-50/60 p-3 rounded-lg border border-emerald-200 hover:border-emerald-400 flex items-start justify-between gap-2 min-w-0 overflow-hidden transition-all cursor-pointer group shadow-2xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">{order.patientName}</span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                    #{order.orderNumber} · {order.items.length}{' '}
                    {order.items.length === 1 ? 'item' : 'items'}
                  </p>
                  <p className="text-[11px] text-emerald-700 truncate mt-1">
                    Paid{order.paymentMethod ? ` (${order.paymentMethod})` : ''}
                    {order.paymentApprovedBy ? ` · ${order.paymentApprovedBy}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end justify-between gap-1.5">
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-100 group-hover:bg-emerald-600 group-hover:text-white px-2 py-0.5 rounded transition-colors">
                    <span>Dispense</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LIVE POP-UP 3: Automated Stock Alerts & Expiry Radar Ticker (Alerts Access Only) */}
      {canAlerts && (criticalAlerts.length > 0 || warningAlerts.length > 0) && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-950 flex items-center gap-2 flex-wrap">
                  <span>Automated Stock Alert Center</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 font-mono font-semibold">
                    {alerts.length} Issues Detected
                  </span>
                </h3>
                <p className="text-xs text-rose-800">
                  Immediate action required to prevent dispensation errors, patient safety violations, and revenue loss.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('alerts')}
              className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-900 bg-white border border-rose-300 hover:bg-rose-100 rounded-md transition-colors shrink-0 cursor-pointer"
            >
              <span>Open Expiry Radar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            {alerts.slice(0, 3).map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => onNavigate('alerts')}
                className="text-left bg-white hover:bg-rose-50/40 p-3 rounded-lg border border-rose-200 hover:border-rose-300 flex items-start justify-between gap-2 min-w-0 overflow-hidden transition-colors cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 truncate">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        alert.alertType === 'expired' ? 'bg-rose-600' : 'bg-amber-500'
                      }`}
                    />
                    <span className="truncate">{alert.brandName}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{alert.genericName}</p>
                  <p className="text-[11px] font-mono mt-1 text-rose-700 truncate">
                    {alert.alertType === 'expired' &&
                      `Expired batch (${alert.batchNumber}) · Qty: ${alert.currentStock}`}
                    {alert.alertType === 'expiring_soon' &&
                      `Expiring in ${alert.daysRemaining} days (${alert.expiryDate})`}
                    {alert.alertType === 'low_stock' &&
                      `Stock: ${alert.currentStock} units (Below reorder ${alert.threshold})`}
                  </p>
                </div>
                {alert.potentialRevenueLoss > 0 && (
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block">At-Risk Value</span>
                    <span className="font-mono font-bold text-rose-600 text-xs whitespace-nowrap">
                      {formatNaira(alert.potentialRevenueLoss, false)}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Permission-Filtered KPI Cards Grid */}
      {visibleKpiCount > 0 && (
        <div className={`grid ${kpiGridCols} gap-4`}>
          {/* Total Inventory Value (Inventory Access) */}
          {showInventoryKpi && (
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="text-left bg-white hover:border-teal-300 p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs min-w-0 overflow-hidden flex flex-col justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2 gap-2">
                <span className="text-xs font-semibold tracking-wide uppercase truncate">
                  Total Inventory Value
                </span>
                <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 font-bold text-xs flex items-center justify-center shrink-0">
                  ₦
                </span>
              </div>
              <div className="my-1">
                <div
                  className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums tracking-tight truncate"
                  title={formatNaira(analytics.totalInventoryValue)}
                >
                  {formatNaira(analytics.totalInventoryValue, false)}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 gap-1">
                <span className="truncate">{drugs.length} formulary lines</span>
                <span className="text-teal-700 font-medium shrink-0 inline-flex items-center gap-0.5">
                  Inventory <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          )}

          {/* Daily Dispensation Revenue (Payments or Audit Access) */}
          {showRevenueKpi && (
            <button
              type="button"
              onClick={() => onNavigate(canPayments ? 'payments' : 'audit')}
              className="text-left bg-white hover:border-emerald-300 p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs min-w-0 overflow-hidden flex flex-col justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2 gap-2">
                <span className="text-xs font-semibold tracking-wide uppercase truncate">
                  Revenue Today
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>
              <div className="my-1 flex items-baseline justify-between gap-2 flex-wrap">
                <div
                  className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums tracking-tight truncate"
                  title={formatNaira(analytics.revenueToday)}
                >
                  {formatNaira(analytics.revenueToday, false)}
                </div>
                <span className="text-xs text-emerald-600 font-semibold font-mono bg-emerald-50 px-2 py-0.5 rounded shrink-0">
                  +{analytics.totalDispensationsToday} sales
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 gap-1">
                <span className="shrink-0">Month-to-date</span>
                <span
                  className="font-mono font-medium text-slate-700 truncate"
                  title={formatNaira(analytics.revenueThisMonth)}
                >
                  {formatNaira(analytics.revenueThisMonth, false)}
                </span>
              </div>
            </button>
          )}

          {/* Pending Payment Approvals Queue KPI (Payments Access) */}
          {showPaymentsQueueKpi && (
            <button
              type="button"
              onClick={() => onNavigate('payments')}
              className={`text-left p-4 sm:p-5 rounded-xl border shadow-2xs min-w-0 overflow-hidden flex flex-col justify-between transition-colors cursor-pointer ${
                pendingPaymentOrders.length > 0
                  ? 'bg-amber-50/60 border-amber-300 hover:border-amber-400'
                  : 'bg-white border-slate-200 hover:border-teal-300'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 mb-2 gap-2">
                <span className="text-xs font-semibold tracking-wide uppercase truncate">
                  Pending Payments
                </span>
                <CreditCard
                  className={`w-4 h-4 shrink-0 ${
                    pendingPaymentOrders.length > 0 ? 'text-amber-600' : 'text-teal-600'
                  }`}
                />
              </div>
              <div className="my-1 flex items-baseline justify-between gap-2 flex-wrap">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${
                      pendingPaymentOrders.length > 0 ? 'text-amber-700' : 'text-slate-900'
                    }`}
                  >
                    {pendingPaymentOrders.length}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {pendingPaymentOrders.length === 1 ? 'order' : 'orders'}
                  </span>
                </div>
                {pendingPaymentOrders.length > 0 && (
                  <span className="text-xs text-amber-800 font-semibold font-mono bg-amber-100 px-2 py-0.5 rounded shrink-0">
                    {formatNaira(pendingPaymentTotal, false)}
                  </span>
                )}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 gap-1">
                <span className="truncate">
                  {pendingPaymentOrders.length > 0 ? 'Awaiting cashier' : 'Queue clear'}
                </span>
                <span className="text-teal-700 font-semibold shrink-0 inline-flex items-center gap-0.5">
                  Payments <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          )}

          {/* Dispensation Queue KPI (Dispensation Access when Payments is NOT enabled) */}
          {showDispensationKpi && (
            <button
              type="button"
              onClick={() => onNavigate('dispensation')}
              className={`text-left p-4 sm:p-5 rounded-xl border shadow-2xs min-w-0 overflow-hidden flex flex-col justify-between transition-colors cursor-pointer ${
                approvedOrders.length > 0
                  ? 'bg-emerald-50/50 border-emerald-300 hover:border-emerald-400'
                  : 'bg-white border-slate-200 hover:border-teal-300'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 mb-2 gap-2">
                <span className="text-xs font-semibold tracking-wide uppercase truncate">
                  Dispensation Queue
                </span>
                <ShoppingCart className="w-4 h-4 text-teal-600 shrink-0" />
              </div>
              <div className="my-1 flex items-baseline gap-3 flex-wrap">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 tabular-nums">
                    {approvedOrders.length}
                  </span>
                  <span className="text-xs text-slate-500 ml-0.5 font-medium">Ready</span>
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-slate-800 tabular-nums">
                    {analytics.totalDispensationsToday}
                  </span>
                  <span className="text-xs text-slate-500 ml-0.5 font-medium">Dispensed Today</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 gap-1">
                <span className="truncate">{pendingPaymentOrders.length} awaiting cashier</span>
                <span className="text-teal-700 font-semibold shrink-0 inline-flex items-center gap-0.5">
                  Dispense <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          )}

          {/* Expired / Low Stock Batches (Alerts Access) */}
          {showAlertsKpi && (
            <button
              type="button"
              onClick={() => onNavigate('alerts')}
              className="text-left bg-white hover:border-rose-300 p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs min-w-0 overflow-hidden flex flex-col justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2 gap-2">
                <span className="text-xs font-semibold tracking-wide uppercase truncate">
                  Stock Alert Status
                </span>
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              </div>
              <div className="my-1 flex items-baseline gap-3 flex-wrap">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-rose-600 tabular-nums">
                    {analytics.expiredBatchesCount}
                  </span>
                  <span className="text-xs text-slate-500 ml-0.5 font-medium">Expired</span>
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-amber-600 tabular-nums">
                    {analytics.lowStockItemsCount}
                  </span>
                  <span className="text-xs text-slate-500 ml-0.5 font-medium">Low Stock</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 gap-1">
                <span>Compliance status</span>
                <span
                  className={`font-semibold shrink-0 ${
                    alerts.length > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {alerts.length > 0 ? 'Action Pending' : 'All Clear'}
                </span>
              </div>
            </button>
          )}

          {/* Medication Registrations KPI (Registration Access when Inventory is hidden) */}
          {showRegistrationKpi && (
            <button
              type="button"
              onClick={() => onNavigate('registration')}
              className="text-left bg-white hover:border-teal-300 p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs min-w-0 overflow-hidden flex flex-col justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2 gap-2">
                <span className="text-xs font-semibold tracking-wide uppercase truncate">
                  Registered Batches
                </span>
                <PlusCircle className="w-4 h-4 text-teal-600 shrink-0" />
              </div>
              <div className="my-1 flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
                  {registrationLogs.length}
                </span>
                <span className="text-xs text-slate-500 font-medium">intake logs</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 gap-1">
                <span>Formulary intake</span>
                <span className="text-teal-700 font-semibold shrink-0 inline-flex items-center gap-0.5">
                  Register <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          )}

          {/* Audit Trails KPI (Audit Access when Payments & Inventory are hidden) */}
          {showAuditKpi && (
            <button
              type="button"
              onClick={() => onNavigate('audit')}
              className="text-left bg-white hover:border-teal-300 p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs min-w-0 overflow-hidden flex flex-col justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2 gap-2">
                <span className="text-xs font-semibold tracking-wide uppercase truncate">
                  Audit Records
                </span>
                <FileText className="w-4 h-4 text-teal-600 shrink-0" />
              </div>
              <div className="my-1 flex items-baseline gap-3 flex-wrap">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
                    {dispensations.length}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Receipts</span>
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-slate-700 tabular-nums">
                    {registrationLogs.length}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Stock Logs</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 gap-1">
                <span>Compliance ledger</span>
                <span className="text-teal-700 font-semibold shrink-0 inline-flex items-center gap-0.5">
                  Audit Trails <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Analytics Trend & Module-Scoped Panels */}
      {(showRevenueAnalytics ||
        showFormularyBreakdown ||
        showDispenserActivity ||
        showRegistrationPanel ||
        showAuditPanel) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Revenue & Margin Trend (Payments or Audit Access) */}
          {showRevenueAnalytics && (
            <div
              className={`${
                hasSecondaryRightPanel ? 'lg:col-span-2' : 'lg:col-span-3'
              } bg-white p-6 rounded-xl border border-slate-200 shadow-2xs`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Daily Dispensation Revenue &amp; Margin Trend
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tracking transactions and eliminating manual billing discrepancies
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-teal-600 rounded-sm"></span>
                    <span>Revenue (₦)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>
                    <span>Net Margin (₦)</span>
                  </span>
                </div>
              </div>

              {/* High-Density CSS Bar Chart */}
              <div className="h-48 flex items-end justify-between gap-4 pt-4 border-b border-slate-200 pb-2">
                {analytics.dailyRevenueTrend.map((day, idx) => {
                  const maxRev = Math.max(
                    ...analytics.dailyRevenueTrend.map((d) => d.revenue),
                    1000000
                  );
                  const revHeight = (day.revenue / maxRev) * 100;
                  const profitHeight = (day.profit / maxRev) * 100;

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group"
                    >
                      <div className="w-full flex items-end justify-center gap-1 h-36">
                        {/* Revenue Bar */}
                        <div
                          style={{ height: `${revHeight}%` }}
                          className="w-1/2 max-w-[28px] bg-teal-600 rounded-t-sm group-hover:bg-teal-700 transition-all relative"
                        >
                          <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap z-10 pointer-events-none">
                            {formatNaira(day.revenue, false)}
                          </div>
                        </div>
                        {/* Profit Bar */}
                        <div
                          style={{ height: `${profitHeight}%` }}
                          className="w-1/2 max-w-[28px] bg-emerald-500 rounded-t-sm group-hover:bg-emerald-600 transition-all relative"
                        >
                          <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap z-10 pointer-events-none">
                            Margin: {formatNaira(day.profit, false)}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-slate-600 truncate">
                        {day.date}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {day.transactions} rx
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dispenser Queue Overview (When user has Dispensation access without Payments/Audit) */}
          {showDispenserActivity && (
            <div
              className={`${
                hasSecondaryRightPanel ? 'lg:col-span-2' : 'lg:col-span-3'
              } bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Active Dispensation Queue
                    </h3>
                    <p className="text-xs text-slate-500">
                      Live status of orders created for patient medication dispensing
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('dispensation')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Open Dispensation</span>
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    No active dispensation orders yet. Create an order in Dispense Medication to get started.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {orders.slice(0, 5).map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => onNavigate('dispensation')}
                        className="w-full text-left py-2.5 px-2 hover:bg-slate-50 rounded-lg flex items-center justify-between gap-3 transition-colors cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            {order.patientName}{' '}
                            <span className="font-mono text-[11px] font-normal text-slate-500">
                              #{order.orderNumber}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {order.items.length}{' '}
                            {order.items.length === 1 ? 'medication' : 'medications'} · Created by{' '}
                            {order.createdBy}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                            order.status === 'payment_approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'pending_payment'
                              ? 'bg-amber-100 text-amber-800'
                              : order.status === 'dispensed'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {order.status === 'payment_approved'
                            ? 'Ready to Dispense'
                            : order.status === 'pending_payment'
                            ? 'Awaiting Cashier'
                            : order.status === 'dispensed'
                            ? 'Dispensed'
                            : 'Cancelled'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inventory Category Breakdown (Inventory Access Only) */}
          {showFormularyBreakdown && (
            <div
              className={`${
                showRevenueAnalytics || showDispenserActivity
                  ? 'lg:col-span-1'
                  : 'lg:col-span-3'
              } bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-base font-bold text-slate-900">
                    Formulary Value Breakdown
                  </h3>
                  <Boxes className="w-4 h-4 text-teal-600 shrink-0" />
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Real-time capital distribution by therapeutic category (in NGN)
                </p>

                <div className="space-y-3">
                  {analytics.categoryBreakdown.slice(0, 5).map((cat, idx) => {
                    const totalVal = analytics.totalInventoryValue || 1;
                    const pct = Math.round((cat.value / totalVal) * 100);

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700 truncate max-w-[150px]">
                            {cat.category}
                          </span>
                          <span className="font-mono tabular-nums text-slate-900">
                            {formatNaira(cat.value, false)} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-teal-600 h-1.5 rounded-full"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Recent Audit Activity Panel (Audit Access when Inventory is hidden) */}
          {showAuditPanel && (
            <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-base font-bold text-slate-900">Recent Audit Trails</h3>
                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Latest verified dispensation receipts &amp; compliance logs
                </p>

                {dispensations.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    No dispensation receipts logged yet.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {dispensations.slice(0, 5).map((rec) => (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => onNavigate('audit')}
                        className="w-full text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs gap-2">
                          <span className="font-semibold text-slate-900 truncate">
                            {rec.patientName}
                          </span>
                          <span className="font-mono font-bold text-teal-800 shrink-0">
                            {formatNaira(rec.totalAmount, false)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                          #{rec.receiptNumber} · {rec.dispensedBy}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Medication Registrations Panel (Registration-only staff) */}
          {showRegistrationPanel && (
            <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Recent Medication Registrations
                  </h3>
                  <p className="text-xs text-slate-500">
                    Latest drug batches logged into the hospital formulary
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('registration')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Register Medication</span>
                </button>
              </div>

              {registrationLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  No medication registration entries logged yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {registrationLogs.slice(0, 6).map((log) => (
                    <div
                      key={log.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {log.brandName}{' '}
                          <span className="text-slate-500 font-normal">({log.genericName})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">
                          Batch {log.batchNumber} · Exp: {log.expiryDate} · By {log.registeredBy}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-teal-700 shrink-0">
                        +{log.quantityAdded} units
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};