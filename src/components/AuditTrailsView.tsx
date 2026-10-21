import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  History, 
  Receipt, 
  Search, 
  Download, 
  RotateCcw, 
  Printer, 
  UserCheck, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  Layers,
  Eye,
  X,
  Filter,
  Check
} from 'lucide-react';
import { DrugRegistrationLog, DispensationRecord } from '../types';
import { formatNaira } from '../utils/currency';

interface AuditTrailsViewProps {
  registrationLogs: DrugRegistrationLog[];
  dispensations: DispensationRecord[];
  onVoidDispensation: (id: string, reason: string) => Promise<any>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

export const AuditTrailsView: React.FC<AuditTrailsViewProps> = ({
  registrationLogs,
  dispensations,
  onVoidDispensation,
  onShowToast,
}) => {
  const [activeModule, setActiveModule] = useState<'dispensation' | 'registration'>('dispensation');
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState('ALL');

  // Filter options: Date range, Drug, Dispenser, Payment approver (Prompt requirement!)
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [filterDrug, setFilterDrug] = useState('ALL');
  const [filterDispenser, setFilterDispenser] = useState('ALL');
  const [filterApprover, setFilterApprover] = useState('ALL');

  // Void Modal State
  const [voidRecord, setVoidRecord] = useState<DispensationRecord | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // Receipt Inspection Modal
  const [viewReceipt, setViewReceipt] = useState<DispensationRecord | null>(null);

  // Extract unique filter options from dispensations
  const uniqueDrugs = useMemo(() => {
    const set = new Set<string>();
    dispensations.forEach(d => {
      d.items.forEach(it => {
        if (it.brandName) set.add(it.brandName);
      });
    });
    return Array.from(set).sort();
  }, [dispensations]);

  const uniqueDispensers = useMemo(() => {
    const set = new Set<string>();
    dispensations.forEach(d => {
      if (d.dispensedBy) set.add(d.dispensedBy);
    });
    return Array.from(set).sort();
  }, [dispensations]);

  const uniqueApprovers = useMemo(() => {
    const set = new Set<string>();
    dispensations.forEach(d => {
      set.add(d.paymentApprovedBy || 'Cashier Desk');
    });
    return Array.from(set).sort();
  }, [dispensations]);

  // Filtered Dispensations with Date Range, Drug, Dispenser, and Approver
  const filteredDispensations = useMemo(() => {
    return dispensations.filter(d => {
      // Date Range Filter
      if (dateStart) {
        const itemDate = new Date(d.dispensedAt).toISOString().split('T')[0];
        if (itemDate < dateStart) return false;
      }
      if (dateEnd) {
        const itemDate = new Date(d.dispensedAt).toISOString().split('T')[0];
        if (itemDate > dateEnd) return false;
      }

      // Particular Drug Filter
      if (filterDrug !== 'ALL') {
        const hasDrug = d.items.some(it => it.brandName.toLowerCase() === filterDrug.toLowerCase());
        if (!hasDrug) return false;
      }

      // Particular Dispenser Filter
      if (filterDispenser !== 'ALL' && d.dispensedBy !== filterDispenser) {
        return false;
      }

      // Payment Approver Filter
      if (filterApprover !== 'ALL') {
        const approver = d.paymentApprovedBy || 'Cashier Desk';
        if (approver !== filterApprover) return false;
      }

      // Text Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchReceipt = d.receiptNumber.toLowerCase().includes(q);
        const matchPatient = d.patientName.toLowerCase().includes(q);
        const matchDoctor = d.prescribingDoctor?.toLowerCase().includes(q);
        const matchDispenser = d.dispensedBy.toLowerCase().includes(q);
        const matchApprover = (d.paymentApprovedBy || '').toLowerCase().includes(q);
        const matchDrug = d.items.some(it => it.brandName.toLowerCase().includes(q) || it.batchNumber.toLowerCase().includes(q));

        if (!matchReceipt && !matchPatient && !matchDoctor && !matchDispenser && !matchApprover && !matchDrug) {
          return false;
        }
      }

      return true;
    });
  }, [dispensations, dateStart, dateEnd, filterDrug, filterDispenser, filterApprover, search]);

  // Filtered Registration Logs
  const filteredRegLogs = useMemo(() => {
    return registrationLogs.filter(log => {
      if (reasonFilter !== 'ALL' && log.reason !== reasonFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return log.brandName.toLowerCase().includes(q) ||
          log.genericName.toLowerCase().includes(q) ||
          log.batchNumber.toLowerCase().includes(q) ||
          log.registeredBy.toLowerCase().includes(q) ||
          log.supplier.toLowerCase().includes(q);
      }
      return true;
    });
  }, [registrationLogs, search, reasonFilter]);

  const handleClearFilters = () => {
    setDateStart('');
    setDateEnd('');
    setFilterDrug('ALL');
    setFilterDispenser('ALL');
    setFilterApprover('ALL');
    setSearch('');
  };

  const handleExecuteVoid = async () => {
    if (!voidRecord) return;
    if (!voidReason.trim()) {
      onShowToast('Clinical supervisor void justification is required.', 'error');
      return;
    }

    try {
      setIsVoiding(true);
      await onVoidDispensation(voidRecord.id, voidReason);
      onShowToast(`Dispensation ${voidRecord.receiptNumber} successfully voided and inventory reversed.`, 'success');
      setVoidRecord(null);
      setVoidReason('');
    } catch (err: any) {
      onShowToast(err.message || 'Void operation failed', 'error');
    } finally {
      setIsVoiding(false);
    }
  };

  const handleExportCSV = () => {
    if (activeModule === 'dispensation') {
      const headers = ['Receipt #', 'Date', 'Patient Name', 'Prescriber', 'Items Count', 'Total (₦)', 'Payment', 'Dispensed By', 'Approved By', 'Status'];
      const rows = filteredDispensations.map(d => [
        `"${d.receiptNumber}"`,
        `"${d.dispensedAt}"`,
        `"${d.patientName}"`,
        `"${d.prescribingDoctor}"`,
        d.items.length,
        d.totalAmount,
        `"${d.paymentMethod}"`,
        `"${d.dispensedBy}"`,
        `"${d.paymentApprovedBy || 'Cashier Desk'}"`,
        `"${d.status}"`
      ]);
      const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const link = document.createElement('a');
      link.href = encodeURI(csv);
      link.download = `dispensation_audit_${Date.now()}.csv`;
      link.click();
    } else {
      const headers = ['Log ID', 'Timestamp', 'Brand Name', 'Batch #', 'Qty Added', 'Cost (₦)', 'Selling (₦)', 'Supplier', 'Registered By', 'Reason'];
      const rows = filteredRegLogs.map(l => [
        `"${l.id}"`,
        `"${l.registeredAt}"`,
        `"${l.brandName}"`,
        `"${l.batchNumber}"`,
        l.quantityAdded,
        l.costPrice,
        l.sellingPrice,
        `"${l.supplier}"`,
        `"${l.registeredBy} (${l.registeredByRole})"`,
        `"${l.reason}"`
      ]);
      const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const link = document.createElement('a');
      link.href = encodeURI(csv);
      link.download = `registration_audit_${Date.now()}.csv`;
      link.click();
    }
    onShowToast('Audit trail exported to CSV.', 'success');
  };

  const hasActiveFilters = Boolean(dateStart || dateEnd || filterDrug !== 'ALL' || filterDispenser !== 'ALL' || filterApprover !== 'ALL');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 font-mono">
            <span>Regulatory &amp; Clinical Record Keeping</span>
            <span>·</span>
            <span>Immutable Ledger</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-700" />
            <span>Audit Trails &amp; Record Keeping</span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Active Log (CSV)</span>
          </button>
        </div>
      </div>

      {/* Module Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveModule('dispensation')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 cursor-pointer ${
              activeModule === 'dispensation' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-teal-600" />
            <span>Drug Dispensation History ({dispensations.length})</span>
          </button>

          <button
            onClick={() => setActiveModule('registration')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 cursor-pointer ${
              activeModule === 'registration' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-teal-600" />
            <span>Drug Registration History ({registrationLogs.length})</span>
          </button>
        </div>

        {/* General Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeModule === 'dispensation' ? 'Search patient, doctor, receipt #...' : 'Search drug, batch #, registered by...'}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* DISPENSATION ADVANCED FILTERS BAR (Prompt requirement: date range, drug, dispenser, payment approver) */}
      {activeModule === 'dispensation' && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Filter className="w-4 h-4 text-teal-700" />
              <span>Spreadsheet Filters (Date Range, Drug, Dispenser, Payment Approver)</span>
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-teal-700 hover:text-teal-800 font-semibold text-[11px] hover:underline cursor-pointer flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Date Range: Start Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Date Range: From
              </label>
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>

            {/* 2. Date Range: End Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Date Range: To
              </label>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>

            {/* 3. Particular Drug Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Particular Drug
              </label>
              <select
                value={filterDrug}
                onChange={(e) => setFilterDrug(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
              >
                <option value="ALL">All Drugs ({uniqueDrugs.length})</option>
                {uniqueDrugs.map(drug => (
                  <option key={drug} value={drug}>{drug}</option>
                ))}
              </select>
            </div>

            {/* 4. Particular Dispenser Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Particular Dispenser
              </label>
              <select
                value={filterDispenser}
                onChange={(e) => setFilterDispenser(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
              >
                <option value="ALL">All Dispensers ({uniqueDispensers.length})</option>
                {uniqueDispensers.map(disp => (
                  <option key={disp} value={disp}>{disp}</option>
                ))}
              </select>
            </div>

            {/* 5. Particular Payment Approver Filter (Prompt requirement!) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Payment Approver
              </label>
              <select
                value={filterApprover}
                onChange={(e) => setFilterApprover(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
              >
                <option value="ALL">All Approvers ({uniqueApprovers.length})</option>
                {uniqueApprovers.map(appr => (
                  <option key={appr} value={appr}>{appr}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* VIEW A: DRUG DISPENSATION HISTORY */}
      {activeModule === 'dispensation' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Receipt / Timestamp</th>
                  <th className="py-3 px-4">Patient &amp; Prescriber</th>
                  <th className="py-3 px-4">Medications Dispensed</th>
                  <th className="py-3 px-4 text-right">Settlement Total</th>
                  <th className="py-3 px-4">Dispensed By</th>
                  <th className="py-3 px-4">Approved By</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Audit Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredDispensations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No dispensation records match the active criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDispensations.map((rec) => {
                    const isVoided = rec.status === 'voided';

                    return (
                      <tr key={rec.id} className={`hover:bg-slate-50/80 transition-colors ${isVoided ? 'bg-rose-50/30' : ''}`}>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-900 text-sm block">
                            #{rec.receiptNumber}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {new Date(rec.dispensedAt).toLocaleString()}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {rec.patientName} {rec.patientAge ? `(${rec.patientAge}y)` : ''}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Prescriber: {rec.prescribingDoctor}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Ref: {rec.prescriptionNumber}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {rec.items.map((it, idx) => (
                              <div key={idx} className="text-[11px] text-slate-700">
                                <strong>{it.brandName}</strong> × {it.quantity} units{' '}
                                <span className="text-[10px] text-slate-500 font-mono">(Batch #{it.batchNumber})</span>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          <div className="font-bold text-sm text-slate-900">
                            {formatNaira(rec.totalAmount)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {rec.paymentMethod}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-slate-800 font-medium">{rec.dispensedBy}</div>
                          <div className="text-[10px] text-slate-500 capitalize">{rec.dispensedByRole}</div>
                        </td>

                        {/* Approved By Column (Prompt requirement!) */}
                        <td className="py-3 px-4">
                          <div className="text-slate-800 font-medium flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                            <span>{rec.paymentApprovedBy || 'Cashier Desk'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">Cashier Settlement</div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {isVoided ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                                <XCircle className="w-3 h-3" />
                                VOIDED
                              </span>
                              <p className="text-[10px] text-rose-600 mt-1 truncate max-w-[130px]" title={rec.voidReason}>
                                {rec.voidReason}
                              </p>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3" />
                              Completed
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewReceipt(rec)}
                              className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors"
                              title="Inspect Receipt"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {!isVoided && (
                              <button
                                onClick={() => {
                                  setVoidRecord(rec);
                                  setVoidReason('');
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded transition-colors cursor-pointer"
                                title="Reversal / Void Transaction"
                              >
                                Void
                              </button>
                            )}
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

      {/* VIEW B: DRUG REGISTRATION HISTORY */}
      {activeModule === 'registration' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Filter by Ingestion Reason:</span>
            <div className="flex items-center gap-1">
              {['ALL', 'Initial Registration', 'Stock Replenishment', 'Technician Data Ingestion'].map((rs) => (
                <button
                  key={rs}
                  onClick={() => setReasonFilter(rs)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    reasonFilter === rs ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {rs}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Log Timestamp</th>
                  <th className="py-3 px-4">Medication &amp; Lot</th>
                  <th className="py-3 px-4 text-center">Quantity Added</th>
                  <th className="py-3 px-4 text-right">Pricing (Cost / Sell)</th>
                  <th className="py-3 px-4">Supplier &amp; Lot Expiry</th>
                  <th className="py-3 px-4">Registered By</th>
                  <th className="py-3 px-4 text-center">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredRegLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No drug registration history recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredRegLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(log.registeredAt).toLocaleString()}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{log.brandName}</div>
                        <div className="text-[11px] text-slate-500">{log.genericName}</div>
                        <div className="text-[10px] text-teal-700 font-mono">Lot #{log.batchNumber}</div>
                      </td>

                      <td className="py-3 px-4 text-center font-bold font-mono text-emerald-700">
                        +{log.quantityAdded} units
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-xs">
                        <div className="text-slate-500">Cost: {formatNaira(log.costPrice)}</div>
                        <div className="font-bold text-slate-900">Sell: {formatNaira(log.sellingPrice)}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-800">{log.supplier}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Exp: {log.expiryDate}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">{log.registeredBy}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{log.registeredByRole}</div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {log.reason}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INSPECT RECEIPT MODAL */}
      {viewReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-slate-900">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-900">Official Clinical Receipt #{viewReceipt.receiptNumber}</h3>
              </div>
              <button
                onClick={() => setViewReceipt(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-mono">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h4 className="font-bold text-slate-900 text-sm">HOSPITAL PHARMACY DISPENSARY</h4>
                <p className="text-[10px] text-slate-500">Receipt #{viewReceipt.receiptNumber}</p>
                <p className="text-[10px] text-slate-400">{new Date(viewReceipt.dispensedAt).toLocaleString()}</p>
              </div>

              <div className="space-y-1 text-[11px]">
                <p><strong>Patient:</strong> {viewReceipt.patientName} {viewReceipt.patientAge ? `(${viewReceipt.patientAge}y)` : ''}</p>
                <p><strong>Prescribing Doctor:</strong> {viewReceipt.prescribingDoctor}</p>
                <p><strong>Dispensed By:</strong> {viewReceipt.dispensedBy}</p>
                <p><strong>Payment Approved By:</strong> {viewReceipt.paymentApprovedBy || 'Cashier Desk'}</p>
                <p><strong>Payment Method:</strong> {viewReceipt.paymentMethod}</p>
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1.5">
                {viewReceipt.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <div>
                      <span>{it.brandName} x{it.quantity}</span>
                      <span className="block text-[9px] text-slate-500">Lot: #{it.batchNumber}</span>
                    </div>
                    <span className="font-bold">{formatNaira(it.totalPrice)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-right text-xs">
                <p>Subtotal: {formatNaira(viewReceipt.subtotal)}</p>
                <p>Tax (5%): {formatNaira(viewReceipt.tax)}</p>
                {viewReceipt.discount > 0 && <p className="text-emerald-700">Discount: -{formatNaira(viewReceipt.discount)}</p>}
                <p className="font-bold text-sm text-teal-800 border-t border-slate-300 pt-1">
                  Total Settlement: {formatNaira(viewReceipt.totalAmount)}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setViewReceipt(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VOID CONFIRMATION MODAL */}
      {voidRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Dispensation Reversal / Void</h3>
                <p className="text-slate-600 mt-0.5">
                  Voiding receipt <strong>#{voidRecord.receiptNumber}</strong> will reverse stock deductions back to the inventory batches.
                </p>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Clinical Justification / Void Reason *
              </label>
              <textarea
                rows={3}
                required
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Dispensing error caught before patient exit; incorrect dosage prescribed."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setVoidRecord(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteVoid}
                disabled={isVoiding}
                className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 disabled:bg-slate-300 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                {isVoiding ? 'Processing Void...' : 'Execute Void & Reverse Inventory'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
