import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Percent,
  Tag,
  AlertTriangle,
  X,
  Wallet,
  Banknote,
  Receipt,
} from 'lucide-react';
import {
  DispensationOrder,
  User,
  PaymentMethod,
  PaymentEntry,
  ApprovePaymentPayload,
} from '../types';
import { formatNaira } from '../utils/currency';

interface PaymentsViewProps {
  orders: DispensationOrder[];
  currentUser: User | null;
  onApprovePayment: (orderId: string, payload: ApprovePaymentPayload) => Promise<void>;
  onRefreshOrders: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
  isRefreshing?: boolean;
  lastSyncTime?: Date | null;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'Cash', label: 'Cash Settlement' },
  { value: 'Mobile Transfer', label: 'Bank / Mobile Transfer' },
  { value: 'Credit/Debit Card', label: 'Credit / Debit Card (POS)' },
  { value: 'Health Insurance', label: 'Health Insurance (HMO)' },
];

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  orders,
  currentUser,
  onApprovePayment,
  onRefreshOrders,
  onShowToast,
  isRefreshing = false,
  lastSyncTime = null,
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'incomplete' | 'all'>('pending');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Payment Processing Modal State
  const [activeOrder, setActiveOrder] = useState<DispensationOrder | null>(null);
  const [stackedPayments, setStackedPayments] = useState<PaymentEntry[]>([]);
  const [entryMethod, setEntryMethod] = useState<PaymentMethod>('Cash');
  const [entryAmount, setEntryAmount] = useState<string>('');
  const [entryReference, setEntryReference] = useState<string>('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [discountReason, setDiscountReason] = useState<string>('');
  const [showModalItems, setShowModalItems] = useState<boolean>(false);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);

  const pendingOrders = orders.filter((o) => o.status === 'pending_payment');
  const approvedOrders = orders.filter((o) => o.status === 'payment_approved' || o.status === 'dispensed');
  const incompleteOrders = approvedOrders.filter((o) => (o.balanceDue ?? 0) > 0 || o.paymentStatus === 'partial' || o.paymentStatus === 'unpaid');

  const filteredOrders = orders.filter((order) => {
    if (filterStatus === 'pending' && order.status !== 'pending_payment') return false;
    if (filterStatus === 'approved' && order.status === 'pending_payment') return false;
    if (
      filterStatus === 'incomplete' &&
      (order.status === 'pending_payment' || ((order.balanceDue ?? 0) <= 0 && order.paymentStatus === 'paid'))
    ) {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchPatient = order.patientName.toLowerCase().includes(q);
      const matchOrder = order.orderNumber.toLowerCase().includes(q);
      const matchDoctor = order.prescribingDoctor?.toLowerCase().includes(q);
      if (!matchPatient && !matchOrder && !matchDoctor) return false;
    }
    return true;
  });

  const totalPendingAmount = pendingOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalCollectedAmount = approvedOrders.reduce(
    (sum, o) => sum + (o.amountPaid !== undefined ? o.amountPaid : o.totalAmount),
    0
  );
  const totalOutstandingBalance = approvedOrders.reduce((sum, o) => sum + (o.balanceDue ?? 0), 0);

  // Modal calculations
  const modalMath = useMemo(() => {
    if (!activeOrder) {
      return {
        grossTotal: 0,
        computedDiscount: 0,
        netTotal: 0,
        totalStackedPaid: 0,
        remainingBalance: 0,
        changeDue: 0,
        isIncomplete: false,
      };
    }

    const grossTotal = Number(activeOrder.subtotal.toFixed(2));
    const parsedDiscountVal = Math.max(0, parseFloat(discountInput) || 0);
    let computedDiscount = 0;

    if (discountType === 'percent') {
      const clampedPct = Math.min(100, parsedDiscountVal);
      computedDiscount = Number(((grossTotal * clampedPct) / 100).toFixed(2));
    } else {
      computedDiscount = Number(Math.min(grossTotal, parsedDiscountVal).toFixed(2));
    }

    const netTotal = Number(Math.max(0, grossTotal - computedDiscount).toFixed(2));
    const totalStackedPaid = Number(
      stackedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0).toFixed(2)
    );
    const remainingBalance = Number(Math.max(0, netTotal - totalStackedPaid).toFixed(2));
    const changeDue = Number(Math.max(0, totalStackedPaid - netTotal).toFixed(2));
    const isIncomplete = remainingBalance > 0;

    return {
      grossTotal,
      computedDiscount,
      netTotal,
      totalStackedPaid,
      remainingBalance,
      changeDue,
      isIncomplete,
    };
  }, [activeOrder, discountType, discountInput, stackedPayments]);

  const openPaymentModal = (order: DispensationOrder) => {
    const existingPayments = Array.isArray(order.payments) ? [...order.payments] : [];
    const existingPaid = existingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const netWithoutTax = Number(Math.max(0, order.subtotal - (order.discount || 0)).toFixed(2));
    const initialRemaining = Number(Math.max(0, netWithoutTax - existingPaid).toFixed(2));

    setActiveOrder(order);
    setStackedPayments(existingPayments);
    setDiscountType('fixed');
    setDiscountInput(order.discount > 0 ? String(order.discount) : '0');
    setDiscountReason(order.discountReason || '');
    setEntryMethod('Cash');
    setEntryAmount(initialRemaining > 0 ? String(initialRemaining) : '');
    setEntryReference('');
    setShowModalItems(false);
  };

  const closePaymentModal = () => {
    if (isFinalizing) return;
    setActiveOrder(null);
    setStackedPayments([]);
    setEntryAmount('');
    setEntryReference('');
    setDiscountInput('0');
    setDiscountReason('');
  };

  const handleAddStackedPayment = () => {
    const amountNum = Number((parseFloat(entryAmount) || 0).toFixed(2));
    if (amountNum <= 0) {
      onShowToast('Enter a valid payment amount greater than ₦0 to stack.', 'warning');
      return;
    }

    const newEntry: PaymentEntry = {
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      method: entryMethod,
      amount: amountNum,
      reference: entryReference.trim() || undefined,
      recordedAt: new Date().toISOString(),
      recordedBy: currentUser?.name || 'Cashier Desk',
    };

    const nextStack = [...stackedPayments, newEntry];
    setStackedPayments(nextStack);
    setEntryReference('');

    // Auto-fill next remaining balance for convenient split payment stacking
    const nextTotalPaid = nextStack.reduce((sum, p) => sum + p.amount, 0);
    const nextRemaining = Number(Math.max(0, modalMath.netTotal - nextTotalPaid).toFixed(2));
    setEntryAmount(nextRemaining > 0 ? String(nextRemaining) : '');

    // Automatically rotate method suggestion when a partial payment leaves a remainder
    if (nextRemaining > 0 && entryMethod === 'Cash') {
      setEntryMethod('Mobile Transfer');
    }
  };

  const handleRemoveStackedPayment = (entryId: string) => {
    const nextStack = stackedPayments.filter((p) => p.id !== entryId);
    setStackedPayments(nextStack);
    const nextTotalPaid = nextStack.reduce((sum, p) => sum + p.amount, 0);
    const nextRemaining = Number(Math.max(0, modalMath.netTotal - nextTotalPaid).toFixed(2));
    if (!entryAmount || parseFloat(entryAmount) <= 0) {
      setEntryAmount(nextRemaining > 0 ? String(nextRemaining) : '');
    }
  };

  const handleFinalizePayment = async () => {
    if (!activeOrder) return;
    setIsFinalizing(true);
    try {
      const payload: ApprovePaymentPayload = {
        payments: stackedPayments,
        discount: modalMath.computedDiscount,
        discountReason: discountReason.trim() || undefined,
      };
      await onApprovePayment(activeOrder.id, payload);

      if (modalMath.isIncomplete) {
        onShowToast(
          `Incomplete payment finalized for #${activeOrder.orderNumber} (Paid: ${formatNaira(modalMath.totalStackedPaid)}, Balance: ${formatNaira(modalMath.remainingBalance)}). Ready for dispensation.`,
          'warning'
        );
      } else {
        onShowToast(
          `Payment finalized for #${activeOrder.orderNumber} (${formatNaira(modalMath.totalStackedPaid)} collected). Dispenser may now hand out medications.`,
          'success'
        );
      }
      setActiveOrder(null);
      setStackedPayments([]);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to finalize payment.', 'error');
    } finally {
      setIsFinalizing(false);
    }
  };

  const unstackedAmountNum = parseFloat(entryAmount) || 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 font-mono">
            <span>Cashier Settlement Desk</span>
            <span>·</span>
            <span>Partial, Split &amp; Discount Billing</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-teal-700" />
            <span>Payments &amp; Billing Authorization</span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-mono shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold">Live Sync (3s)</span>
            {lastSyncTime && (
              <span className="text-emerald-700/80 text-[11px] hidden sm:inline">
                · {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>

          <button
            onClick={onRefreshOrders}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-60 shadow-2xs"
            title="Refresh payment queue immediately"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Orders Count & Total */}
        <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold mb-1">
            <span>Awaiting Payment</span>
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          </div>
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <span className="text-2xl font-bold font-mono text-amber-950 tabular-nums">
              {pendingOrders.length} orders
            </span>
            <span className="text-xs font-mono font-bold text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded">
              {formatNaira(totalPendingAmount, false)}
            </span>
          </div>
          <p className="text-xs text-amber-800 mt-1">
            Pending cashier settlement &amp; authorization.
          </p>
        </div>

        {/* Collected Amount */}
        <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold mb-1">
            <span>Collected / Cleared</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <span className="text-2xl font-bold font-mono text-emerald-950 tabular-nums">
              {approvedOrders.length} orders
            </span>
            <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-200/60 px-2 py-0.5 rounded">
              {formatNaira(totalCollectedAmount, false)}
            </span>
          </div>
          <p className="text-xs text-emerald-800 mt-1">
            Total payments stacked &amp; cleared today.
          </p>
        </div>

        {/* Incomplete / Outstanding Balances */}
        <div className="bg-rose-50/70 border border-rose-200 p-4 rounded-xl min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-rose-800 text-xs font-semibold mb-1">
            <span>Incomplete Balances</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          </div>
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <span className="text-2xl font-bold font-mono text-rose-950 tabular-nums">
              {incompleteOrders.length} partial
            </span>
            <span className="text-xs font-mono font-bold text-rose-900 bg-rose-200/60 px-2 py-0.5 rounded">
              {formatNaira(totalOutstandingBalance, false)}
            </span>
          </div>
          <p className="text-xs text-rose-800 mt-1">
            Finalized orders carrying unpaid patient balance.
          </p>
        </div>

        {/* Cashier Station Info */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl min-w-0 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Cashier Station Duty</span>
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
          </div>
          <div>
            <span className="text-base font-bold text-slate-900 truncate block">
              {currentUser?.name || 'Cashier Desk'}
            </span>
            <span className="text-xs font-mono text-teal-700 font-semibold">
              Role: {currentUser?.role?.toUpperCase() || 'CASHIER'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Logs split methods, discounts &amp; balances to audit trails.
          </p>
        </div>
      </div>

      {/* Main Order Queue Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Filter and Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-3 text-xs">
          {/* Segmented Filter */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-200/80 p-1 rounded-lg font-semibold w-full lg:w-auto">
            <button
              onClick={() => setFilterStatus('pending')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filterStatus === 'pending'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Awaiting Payment ({pendingOrders.length})
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filterStatus === 'approved'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Finalized ({approvedOrders.length})
            </button>
            <button
              onClick={() => setFilterStatus('incomplete')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filterStatus === 'incomplete'
                  ? 'bg-white text-rose-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Incomplete ({incompleteOrders.length})
            </button>
            <button
              onClick={() => setFilterStatus('all')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({orders.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, order #, doctor..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Order # / Created</th>
                <th className="py-3 px-4">Patient &amp; Prescriber</th>
                <th className="py-3 px-4">Prescribed Items</th>
                <th className="py-3 px-4 text-right">Bill &amp; Paid</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Cashier Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No dispensation orders found matching current filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isPending = order.status === 'pending_payment';
                  const isApproved = order.status === 'payment_approved';
                  const isExpanded = expandedOrderId === order.id;
                  const amountPaid = order.amountPaid !== undefined ? order.amountPaid : isPending ? 0 : order.totalAmount;
                  const balanceDue = order.balanceDue !== undefined ? order.balanceDue : Math.max(0, order.totalAmount - amountPaid);
                  const hasIncompleteBalance = !isPending && balanceDue > 0;
                  const paymentList = order.payments || [];

                  return (
                    <React.Fragment key={order.id}>
                      <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? 'bg-slate-50/60' : ''}`}>
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-900 text-sm">
                            {order.orderNumber}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-teal-700 mt-0.5">
                            Created by: {order.createdBy}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {order.patientName} {order.patientAge ? `(${order.patientAge}y)` : ''}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {order.prescribingDoctor}
                          </div>
                          {order.patientContact && (
                            <div className="text-[10px] text-slate-400">
                              Tel: {order.patientContact}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800">
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {order.items.map((it) => `${it.brandName} (${it.quantity}x)`).join(', ')}
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                            className="text-[10px] text-teal-700 hover:underline mt-0.5 flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>{isExpanded ? 'Hide item breakdown' : 'View item breakdown'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="font-mono font-bold text-base text-slate-900 tabular-nums">
                            {formatNaira(order.totalAmount)}
                          </div>
                          {order.discount > 0 && (
                            <div className="text-[10px] font-mono font-semibold text-emerald-700">
                              Discount: -{formatNaira(order.discount)}
                            </div>
                          )}
                          {!isPending && (
                            <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                              Paid: <span className="font-semibold text-slate-900">{formatNaira(amountPaid)}</span>
                              {balanceDue > 0 && (
                                <span className="block font-bold text-rose-700">
                                  Bal: {formatNaira(balanceDue)}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 animate-pulse text-amber-600" />
                              <span>Awaiting Payment</span>
                            </span>
                          ) : hasIncompleteBalance ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-700" />
                                <span>{isApproved ? 'Partial · Ready' : 'Dispensed (Partial)'}</span>
                              </span>
                            </div>
                          ) : isApproved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                              <CheckCircle2 className="w-3 h-3 text-teal-600" />
                              <span>Paid · Ready</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Dispensed · Paid</span>
                            </span>
                          )}
                          {order.paymentApprovedBy && (
                            <span className="block text-[10px] text-slate-400 mt-1">
                              By {order.paymentApprovedBy}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isPending ? (
                            <button
                              type="button"
                              onClick={() => openPaymentModal(order)}
                              className="py-2 px-3.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                              <span>Process Payment</span>
                            </button>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="text-[11px] text-slate-600 font-mono">
                                {paymentList.length > 1 ? (
                                  <div className="space-y-0.5">
                                    {paymentList.map((p) => (
                                      <div key={p.id} className="text-[10px] text-slate-700">
                                        {p.method}: <strong>{formatNaira(p.amount)}</strong>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span>{order.paymentMethod || 'Cash'}</span>
                                )}
                              </div>
                              {hasIncompleteBalance && (
                                <button
                                  type="button"
                                  onClick={() => openPaymentModal(order)}
                                  className="py-1 px-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add Payment</span>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Item Breakdown */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={6} className="p-4 px-6">
                            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
                              <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                                Order Line Items for #{order.orderNumber}
                              </h4>
                              <div className="divide-y divide-slate-100 text-xs">
                                {order.items.map((it, idx) => (
                                  <div key={idx} className="py-2 flex items-center justify-between">
                                    <div>
                                      <span className="font-semibold text-slate-900">{it.brandName}</span>
                                      <span className="text-slate-500 ml-1.5">({it.genericName})</span>
                                      <span className="text-[10px] text-teal-700 block italic">Dir: {it.dosage}</span>
                                      <span className="text-[10px] text-slate-400 font-mono">Lot: #{it.batchNumber}</span>
                                    </div>
                                    <div className="text-right font-mono">
                                      <span className="font-semibold text-slate-900">{formatNaira(it.totalPrice)}</span>
                                      <span className="text-[11px] text-slate-500 block">
                                        {it.quantity} units @ {formatNaira(it.unitPrice)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {order.discount > 0 && (
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700">
                                  <span>
                                    Discount Applied{order.discountReason ? ` (${order.discountReason})` : ''}
                                  </span>
                                  <span className="font-mono font-bold">-{formatNaira(order.discount)}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYMENT PROCESSING MODAL (Stacked Partial Payments, Incomplete Payment Support & Discounts) */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-teal-300 uppercase tracking-wider">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Payment Processing Terminal</span>
                  <span>·</span>
                  <span>#{activeOrder.orderNumber}</span>
                </div>
                <h3 className="text-base font-bold mt-0.5">
                  {activeOrder.patientName}{' '}
                  {activeOrder.patientAge ? <span className="font-normal text-slate-300 text-xs">({activeOrder.patientAge}y)</span> : null}
                </h3>
                <p className="text-[11px] text-slate-300">
                  Prescriber: {activeOrder.prescribingDoctor || 'Attending Physician'} · {activeOrder.items.length} item{activeOrder.items.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={closePaymentModal}
                disabled={isFinalizing}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Collapsible Items Summary */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowModalItems((v) => !v)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
                >
                  <span>Prescribed Medications ({activeOrder.items.length} items)</span>
                  <span className="inline-flex items-center gap-1 text-teal-700">
                    <span>{showModalItems ? 'Hide' : 'View'}</span>
                    {showModalItems ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </button>
                {showModalItems && (
                  <div className="p-3 bg-white divide-y divide-slate-100 max-h-40 overflow-y-auto">
                    {activeOrder.items.map((it, i) => (
                      <div key={i} className="py-1.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900">{it.brandName}</span>
                          <span className="text-slate-500 ml-1">× {it.quantity}</span>
                        </div>
                        <span className="font-mono font-semibold text-slate-900 shrink-0">
                          {formatNaira(it.totalPrice)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 1: Bill Summary & Patient Discount */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <Tag className="w-3.5 h-3.5 text-teal-700" />
                    <span>Bill Breakdown &amp; Patient Discount</span>
                  </h4>
                  <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountType('fixed');
                        setDiscountInput(modalMath.computedDiscount > 0 ? String(modalMath.computedDiscount) : '0');
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                        discountType === 'fixed' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      ₦ Fixed
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountType('percent');
                        const pct = modalMath.grossTotal > 0 ? Number(((modalMath.computedDiscount / modalMath.grossTotal) * 100).toFixed(1)) : 0;
                        setDiscountInput(String(pct));
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors inline-flex items-center gap-0.5 ${
                        discountType === 'percent' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      <Percent className="w-3 h-3" />
                      <span>Percent</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Discount ({discountType === 'fixed' ? '₦ Amount' : '% Off'})
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={discountType === 'percent' ? 100 : modalMath.grossTotal}
                      step={discountType === 'percent' ? '0.5' : '50'}
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="sm:col-span-7">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Discount Reason / Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      placeholder="e.g. Staff concession, Senior citizen, Compassionate waiver"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 font-mono text-[11px]">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block font-sans">Subtotal</span>
                    <span className="font-bold text-slate-900">{formatNaira(activeOrder.subtotal)}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-emerald-200">
                    <span className="text-emerald-700 block font-sans">Discount</span>
                    <span className="font-bold text-emerald-700">-{formatNaira(modalMath.computedDiscount)}</span>
                  </div>
                  <div className="bg-teal-50 p-2 rounded-lg border border-teal-200">
                    <span className="text-teal-800 block font-sans font-semibold">Net Bill</span>
                    <span className="font-bold text-teal-900 text-xs">{formatNaira(modalMath.netTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Stack Partial / Split Payments */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <Banknote className="w-4 h-4 text-teal-700" />
                    <span>Stack Payments (Split / Partial Settlement)</span>
                  </h4>
                  {modalMath.remainingBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setEntryAmount(String(modalMath.remainingBalance))}
                      className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-md cursor-pointer transition-colors"
                    >
                      Fill Remaining ({formatNaira(modalMath.remainingBalance)})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={entryMethod}
                      onChange={(e) => setEntryMethod(e.target.value as PaymentMethod)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Amount (₦)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="100"
                      value={entryAmount}
                      onChange={(e) => setEntryAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddStackedPayment();
                        }
                      }}
                      placeholder="e.g. 10000"
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Ref / Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={entryReference}
                      onChange={(e) => setEntryReference(e.target.value)}
                      placeholder="POS / Transfer ref"
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddStackedPayment}
                      className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Stacked Payments List */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1.5">
                    <span>Stacked Payments ({stackedPayments.length})</span>
                    {stackedPayments.length > 0 && (
                      <span className="font-mono text-slate-800">
                        Total Stacked: {formatNaira(modalMath.totalStackedPaid)}
                      </span>
                    )}
                  </div>

                  {stackedPayments.length === 0 ? (
                    <div className="py-4 px-3 border border-dashed border-slate-200 rounded-lg text-center text-[11px] text-slate-500 bg-slate-50/50">
                      No payments stacked yet. Add one or more partial payments above (e.g. Cash + Mobile Transfer), or finalize directly as an incomplete/unpaid bill.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                      {stackedPayments.map((pay, idx) => (
                        <div
                          key={pay.id}
                          className="px-3 py-2.5 bg-white flex items-center justify-between gap-2 hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                                <span>{pay.method}</span>
                                {pay.reference && (
                                  <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                    Ref: {pay.reference}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Recorded {new Date(pay.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                              {formatNaira(pay.amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveStackedPayment(pay.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Remove payment entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Live Settlement Status Banner */}
              <div
                className={`rounded-xl p-4 border space-y-2 ${
                  modalMath.isIncomplete
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                }`}
              >
                <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                  <div>
                    <span className="font-sans text-[11px] opacity-75 block">Net Bill Total</span>
                    <span className="font-bold text-sm">{formatNaira(modalMath.netTotal)}</span>
                  </div>
                  <div>
                    <span className="font-sans text-[11px] opacity-75 block">Total Paid</span>
                    <span className="font-bold text-sm">{formatNaira(modalMath.totalStackedPaid)}</span>
                  </div>
                  <div className="text-right">
                    {modalMath.isIncomplete ? (
                      <>
                        <span className="font-sans text-[11px] text-amber-800 font-semibold block">
                          Remaining Balance
                        </span>
                        <span className="font-bold text-sm text-rose-700">
                          {formatNaira(modalMath.remainingBalance)}
                        </span>
                      </>
                    ) : modalMath.changeDue > 0 ? (
                      <>
                        <span className="font-sans text-[11px] text-emerald-800 font-semibold block">
                          Change Due
                        </span>
                        <span className="font-bold text-sm text-emerald-800">
                          {formatNaira(modalMath.changeDue)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-sans text-[11px] text-emerald-800 font-semibold block">
                          Settlement Status
                        </span>
                        <span className="font-bold text-sm text-emerald-800">Paid in Full</span>
                      </>
                    )}
                  </div>
                </div>

                {modalMath.isIncomplete && (
                  <div className="pt-2 border-t border-amber-200/80 flex items-start gap-2 text-[11px] text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Incomplete Payment Allowed:</strong> You can finalize this transaction now with a remaining balance of{' '}
                      <strong className="font-mono">{formatNaira(modalMath.remainingBalance)}</strong>. The unpaid balance will be recorded on the order, receipt, and audit trail.
                    </span>
                  </div>
                )}

                {unstackedAmountNum > 0 && stackedPayments.length === 0 && (
                  <div className="pt-1 text-[11px] text-amber-800 font-medium">
                    Note: You have <span className="font-mono font-bold">{formatNaira(unstackedAmountNum)}</span> typed in the amount box — click <strong>+ Add</strong> above to include it in stacked payments before finalizing.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
              <button
                type="button"
                onClick={closePaymentModal}
                disabled={isFinalizing}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleFinalizePayment}
                disabled={isFinalizing}
                className={`w-full sm:w-auto px-5 py-2.5 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 ${
                  modalMath.isIncomplete
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-teal-700 hover:bg-teal-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isFinalizing
                    ? 'Finalizing Payment...'
                    : modalMath.isIncomplete
                    ? `Finalize Payment (Incomplete · ${formatNaira(modalMath.remainingBalance)} Bal)`
                    : 'Finalize Payment'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
