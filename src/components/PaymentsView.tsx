import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  CheckCircle2, 
  Clock, 
  Receipt, 
  User as UserIcon, 
  ShieldCheck, 
  Filter, 
  RefreshCw,
  Printer,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { DispensationOrder, User } from '../types';
import { formatNaira } from '../utils/currency';

interface PaymentsViewProps {
  orders: DispensationOrder[];
  currentUser: User | null;
  onApprovePayment: (orderId: string, paymentMethod: string) => Promise<void>;
  onRefreshOrders: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
  isRefreshing?: boolean;
  lastSyncTime?: Date | null;
}

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
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'all'>('pending');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedMethods, setSelectedMethods] = useState<Record<string, 'Cash' | 'Credit/Debit Card' | 'Health Insurance' | 'Mobile Transfer'>>({});
  const [cashTendered, setCashTendered] = useState<Record<string, string>>({});
  const [isApproving, setIsApproving] = useState<Record<string, boolean>>({});

  const pendingOrders = orders.filter(o => o.status === 'pending_payment');
  const approvedOrders = orders.filter(o => o.status === 'payment_approved' || o.status === 'dispensed');

  const filteredOrders = orders.filter(order => {
    if (filterStatus === 'pending' && order.status !== 'pending_payment') return false;
    if (filterStatus === 'approved' && order.status === 'pending_payment') return false;

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
  const totalApprovedToday = approvedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const handleApprove = async (order: DispensationOrder) => {
    const method = selectedMethods[order.id] || 'Cash';
    setIsApproving(prev => ({ ...prev, [order.id]: true }));
    try {
      await onApprovePayment(order.id, method);
      onShowToast(`Payment authorized for order #${order.orderNumber} via ${method}. Dispenser may now finalize medication handout.`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Payment approval failed.', 'error');
    } finally {
      setIsApproving(prev => ({ ...prev, [order.id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 font-mono">
            <span>Cashier Settlement Desk</span>
            <span>·</span>
            <span>Two-Step Clinical Verification</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pending Orders Count & Total */}
        <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold mb-1">
            <span>Awaiting Cashier Approval</span>
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
            Orders created by dispensers awaiting payment verification.
          </p>
        </div>

        {/* Approved & Cleared */}
        <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold mb-1">
            <span>Approved / Cleared Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <span className="text-2xl font-bold font-mono text-emerald-950 tabular-nums">
              {approvedOrders.length} cleared
            </span>
            <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-200/60 px-2 py-0.5 rounded">
              {formatNaira(totalApprovedToday, false)}
            </span>
          </div>
          <p className="text-xs text-emerald-800 mt-1">
            Authorized transactions ready for or finalized in dispensation.
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
            Cryptographically logs payment approvals to audit logs.
          </p>
        </div>
      </div>

      {/* Main Order Queue Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Filter and Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Segmented Filter */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg font-semibold w-full sm:w-auto">
            <button
              onClick={() => setFilterStatus('pending')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
                filterStatus === 'pending'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Awaiting Approval ({pendingOrders.length})
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
                filterStatus === 'approved'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved / Settled ({approvedOrders.length})
            </button>
            <button
              onClick={() => setFilterStatus('all')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Orders ({orders.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
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
                <th className="py-3 px-4 text-right">Amount Due</th>
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
                  const isDispensed = order.status === 'dispensed';
                  const isExpanded = expandedOrderId === order.id;
                  const currentMethod = selectedMethods[order.id] || 'Cash';
                  const tendered = cashTendered[order.id] || '';
                  const tenderedNum = parseFloat(tendered);
                  const changeDue = !isNaN(tenderedNum) && tenderedNum >= order.totalAmount 
                    ? tenderedNum - order.totalAmount 
                    : 0;

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
                            {order.items.map(it => `${it.brandName} (${it.quantity}x)`).join(', ')}
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                            className="text-[10px] text-teal-700 hover:underline mt-0.5 flex items-center gap-0.5"
                          >
                            <span>{isExpanded ? 'Hide item breakdown' : 'View item breakdown'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="font-mono font-bold text-base text-slate-900 tabular-nums">
                            {formatNaira(order.totalAmount)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Subtotal: {formatNaira(order.subtotal)}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 animate-pulse text-amber-600" />
                              <span>Awaiting Payment</span>
                            </span>
                          ) : isApproved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                              <CheckCircle2 className="w-3 h-3 text-teal-600" />
                              <span>Payment Approved</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Dispensed</span>
                            </span>
                          )}
                          {order.paymentApprovedBy && (
                            <span className="block text-[10px] text-slate-400 mt-1">
                              Approved by {order.paymentApprovedBy}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isPending ? (
                            <div className="flex flex-col gap-1.5 max-w-[200px] mx-auto">
                              <select
                                value={currentMethod}
                                onChange={(e) => setSelectedMethods(prev => ({ ...prev, [order.id]: e.target.value as any }))}
                                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800"
                              >
                                <option value="Cash">Cash Settlement</option>
                                <option value="Credit/Debit Card">Credit/Debit Card</option>
                                <option value="Mobile Transfer">Bank / Mobile Transfer</option>
                                <option value="Health Insurance">Health Insurance HMO</option>
                              </select>

                              {currentMethod === 'Cash' && (
                                <input
                                  type="number"
                                  placeholder="Cash Received (₦)"
                                  value={tendered}
                                  onChange={(e) => setCashTendered(prev => ({ ...prev, [order.id]: e.target.value }))}
                                  className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                                />
                              )}

                              {currentMethod === 'Cash' && changeDue > 0 && (
                                <div className="text-[10px] font-mono text-emerald-700 font-semibold">
                                  Change: {formatNaira(changeDue)}
                                </div>
                              )}

                              <button
                                onClick={() => handleApprove(order)}
                                disabled={isApproving[order.id]}
                                className="w-full py-1.5 px-3 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{isApproving[order.id] ? 'Approving...' : 'Approve Payment'}</span>
                              </button>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500 font-mono">
                              Paid via {order.paymentMethod || 'Cash'}
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Item Breakdown */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={6} className="p-4 px-6">
                            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-2">
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
    </div>
  );
};
