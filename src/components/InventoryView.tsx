import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Printer, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Pill, 
  Calendar, 
  ShieldAlert, 
  ShoppingCart, 
  FileText, 
  Download,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ArrowUpDown,
  X
} from 'lucide-react';
import { Drug, BatchItem } from '../types';
import { formatNaira } from '../utils/currency';

interface InventoryViewProps {
  drugs: Drug[];
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
  onNavigate: (tab: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  drugs,
  onShowToast,
  onNavigate,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Optimal' | 'Expiring' | 'Low' | 'Expired'>('ALL');
  const [expandedDrugId, setExpandedDrugId] = useState<string | null>(null);

  // Sorting state (Prompt requirement: spreadsheet should be able to be sorted by name, category, or status)
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'status'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Print as PDF Modal state
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    drugs.forEach(d => {
      if (d.category) set.add(d.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [drugs]);

  // Sorting helper
  const handleSort = (field: 'name' | 'category' | 'status') => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  // Filtered and Sorted drugs
  const filteredDrugs = useMemo(() => {
    const now = new Date();
    let list = drugs.filter(drug => {
      if (categoryFilter !== 'ALL' && drug.category !== categoryFilter) return false;

      const isLow = drug.totalStock <= drug.reorderLevel;
      const hasExpired = drug.batches.some(b => new Date(b.expiryDate) <= now && b.quantity > 0);
      const hasExpiring = drug.batches.some(b => {
        const diff = (new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diff > 0 && diff <= 45 && b.quantity > 0;
      });

      if (statusFilter === 'Expired' && !hasExpired) return false;
      if (statusFilter === 'Expiring' && !hasExpiring) return false;
      if (statusFilter === 'Low' && !isLow) return false;
      if (statusFilter === 'Optimal' && (hasExpired || hasExpiring || isLow)) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesDrug = drug.brandName.toLowerCase().includes(q) ||
          drug.genericName.toLowerCase().includes(q) ||
          drug.barcode.includes(q) ||
          drug.manufacturer.toLowerCase().includes(q);
        const matchesBatch = drug.batches.some(b => b.batchNumber.toLowerCase().includes(q));
        if (!matchesDrug && !matchesBatch) return false;
      }

      return true;
    });

    // Apply Sorting
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.brandName.localeCompare(b.brandName);
      } else if (sortBy === 'category') {
        comparison = (a.category || '').localeCompare(b.category || '');
      } else if (sortBy === 'status') {
        const getPriority = (d: Drug) => {
          const isExp = d.batches.some(b => new Date(b.expiryDate) <= now && b.quantity > 0);
          if (isExp) return 4;
          const isExpSoon = d.batches.some(b => {
            const diff = (new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            return diff > 0 && diff <= 45 && b.quantity > 0;
          });
          if (isExpSoon) return 3;
          if (d.totalStock <= d.reorderLevel) return 2;
          return 1;
        };
        comparison = getPriority(a) - getPriority(b);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [drugs, categoryFilter, statusFilter, search, sortBy, sortDirection]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredDrugs.length / itemsPerPage));
  const paginatedDrugs = filteredDrugs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleExpand = (id: string) => {
    setExpandedDrugId(prev => prev === id ? null : id);
  };

  const handleTriggerPrintPdf = () => {
    setShowPdfModal(false);
    window.print();
    onShowToast('Prepared inventory report for PDF export / printing.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Main Inventory Card */}
      {/* Prompt requirement: Rename module from "Medication Directory" to "Inventory" */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Top Control Bar inside Card */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Inventory
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live formulary stock levels, batch lot shelf allocations, and clinical expiry tracking.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Print Directory Button -> Brings up Save as PDF option */}
            <button
              type="button"
              onClick={() => setShowPdfModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print Directory (Save as PDF)</span>
            </button>

          </div>
        </div>

        {/* Search, Filter, and Sort Control Bar */}
        <div className="p-6 pt-4 pb-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search medication name, generic chemical, barcode, or lot number..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500 transition-all font-sans"
            />
          </div>

          {/* Filter Dropdown 1: Categories */}
          <div className="shrink-0">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full md:w-auto px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              {categories.map(c => (
                <option key={c} value={c}>
                  {c === 'ALL' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Dropdown 2: Batch Statuses */}
          <div className="shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full md:w-auto px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="Optimal">Optimal Stock</option>
              <option value="Expiring">Expiring Soon (&lt;45d)</option>
              <option value="Low">Low Stock (&lt; Reorder)</option>
              <option value="Expired">Expired Batches</option>
            </select>
          </div>
        </div>

        {/* Sort Bar Indicator */}
        <div className="px-6 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>Sort spreadsheet by:</span>
            <button
              onClick={() => handleSort('name')}
              className={`px-2 py-0.5 rounded cursor-pointer font-semibold ${
                sortBy === 'name' ? 'bg-teal-700 text-white' : 'hover:bg-slate-200 text-slate-700'
              }`}
            >
              Name {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleSort('category')}
              className={`px-2 py-0.5 rounded cursor-pointer font-semibold ${
                sortBy === 'category' ? 'bg-teal-700 text-white' : 'hover:bg-slate-200 text-slate-700'
              }`}
            >
              Category {sortBy === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleSort('status')}
              className={`px-2 py-0.5 rounded cursor-pointer font-semibold ${
                sortBy === 'status' ? 'bg-teal-700 text-white' : 'hover:bg-slate-200 text-slate-700'
              }`}
            >
              Status {sortBy === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
          </div>
          <span>{filteredDrugs.length} medication items listed</span>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th 
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Medication Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Formulary ID / Barcode</th>
                <th 
                  onClick={() => handleSort('category')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Category</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Dosage Form &amp; Strength</th>
                <th className="py-3 px-4 font-mono">Stock Balance</th>
                <th 
                  onClick={() => handleSort('status')}
                  className="py-3 px-4 text-center cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center w-16">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {paginatedDrugs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    No medications found in inventory matching current filters.
                  </td>
                </tr>
              ) : (
                paginatedDrugs.map((drug, index) => {
                  const isExpanded = expandedDrugId === drug.id;
                  const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  const now = new Date();

                  const isLow = drug.totalStock <= drug.reorderLevel;
                  const hasExpired = drug.batches.some(b => new Date(b.expiryDate) <= now && b.quantity > 0);
                  const hasExpiring = drug.batches.some(b => {
                    const diff = (new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                    return diff > 0 && diff <= 45 && b.quantity > 0;
                  });

                  const activeBatch = drug.batches.find(b => new Date(b.expiryDate) > now && b.quantity > 0) || drug.batches[0];

                  return (
                    <React.Fragment key={drug.id}>
                      <tr 
                        onClick={() => toggleExpand(drug.id)}
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-slate-50/80' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center font-mono text-slate-500 font-medium">
                          {rowNumber}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {drug.brandName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {drug.genericName}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-600 text-xs">
                          {drug.barcode ? `RX-${drug.barcode.slice(-6)}` : 'RX-NEW'}
                        </td>

                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {drug.category || 'General Medicine'}
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          {drug.dosageForm} · {drug.strength}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {drug.totalStock} units
                        </td>

                        <td className="py-3 px-4 text-center">
                          {hasExpired ? (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              Expired
                            </span>
                          ) : hasExpiring ? (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Expiring Soon
                            </span>
                          ) : isLow ? (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Low Stock ({drug.totalStock})
                            </span>
                          ) : (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Optimal ({drug.totalStock})
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center text-slate-400 hover:text-slate-700">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 mx-auto text-slate-700" />
                          ) : (
                            <ChevronDown className="w-4 h-4 mx-auto" />
                          )}
                        </td>
                      </tr>

                      {/* Expandable Detail View Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={8} className="p-5">
                            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-100 pb-4">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                                    Stock Availability &amp; Reserve
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                                      {drug.totalStock} units
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    Reorder threshold: {drug.reorderLevel} units · {drug.batches.length} active lots
                                  </p>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                                    Next Expiry &amp; Batch Lot
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold text-slate-900 font-mono">
                                      {activeBatch ? activeBatch.expiryDate : 'N/A'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    Active Lot: #{activeBatch?.batchNumber || 'N/A'} · Storage: {drug.storageCondition}
                                  </p>
                                </div>

                                <div className="space-y-1 min-w-0">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                                    Pricing &amp; Gross Margin
                                  </span>
                                  <div className="flex items-baseline gap-2 flex-wrap min-w-0">
                                    <span className="text-2xl font-bold font-mono text-teal-700 tabular-nums">
                                      {formatNaira(drug.unitPrice)}
                                    </span>
                                    <span className="text-xs text-slate-500 font-mono">
                                      (Cost: {formatNaira(drug.unitCost)})
                                    </span>
                                  </div>
                                  <p className="text-xs text-emerald-600 font-semibold font-mono">
                                    +{(((drug.unitPrice - drug.unitCost) / (drug.unitPrice || 1)) * 100).toFixed(1)}% Gross Margin per unit
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-3 pt-1">
                                <button
                                  type="button"
                                  onClick={() => onNavigate('dispensation')}
                                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                  <span>Dispense This Drug in Dispensation Module</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onNavigate('registration')}
                                  className="px-4 py-2 bg-white hover:bg-slate-50 text-teal-700 border border-teal-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add New Batch Lot to {drug.brandName}</span>
                                </button>
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

        {/* Pagination Bar */}
        <div className="p-4 px-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Showing {filteredDrugs.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, filteredDrugs.length)} of {filteredDrugs.length} medications
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                  currentPage === i + 1 
                    ? 'bg-slate-900 text-white shadow-2xs' 
                    : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Save as PDF / Print Modal */}
      {/* Prompt requirement: "the 'print directory' button should bring up an option to save as pdf" */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-slate-900">
            <div className="p-5 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Export &amp; Print Directory</h3>
                  <p className="text-xs text-slate-500">Official Clinical Formulary Document</p>
                </div>
              </div>
              <button
                onClick={() => setShowPdfModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>Document Title:</span>
                  <span>Formulary Medication Directory</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Formulary Lines:</span>
                  <span>{drugs.length} medications</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Export Format:</span>
                  <span className="font-bold text-teal-700">Portable Document Format (PDF)</span>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed">
                Choose <strong>Save as PDF</strong> in your browser print dialogue destination to download a clinical PDF copy of the formulary inventory.
              </p>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTriggerPrintPdf}
                  className="flex-1 py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Save as PDF / Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
