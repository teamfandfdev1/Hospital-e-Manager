import React, { useState, useMemo } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Trash2, 
  AlertOctagon, 
  CheckCircle2, 
  Printer, 
  Receipt, 
  CreditCard, 
  ShieldAlert, 
  User as UserIcon, 
  FileText, 
  ArrowRight, 
  Clock,
  Layers,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { Drug, BatchItem, DispensationRecord, DispensationOrder } from '../types';
import { formatNaira } from '../utils/currency';

interface DispensationPosViewProps {
  drugs: Drug[];
  orders: DispensationOrder[];
  onCreateOrder: (payload: any) => Promise<DispensationOrder>;
  onFinalizeOrder: (orderId: string) => Promise<DispensationRecord>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
  onNavigateToPayments: () => void;
  onRefreshOrders?: () => void;
  isRefreshing?: boolean;
  lastSyncTime?: Date | null;
}

interface CartItem {
  drug: Drug;
  batch: BatchItem;
  quantity: number;
  dosage: string;
  unitPrice: number;
  totalPrice: number;
}

export const DispensationPosView: React.FC<DispensationPosViewProps> = ({
  drugs,
  orders,
  onCreateOrder,
  onFinalizeOrder,
  onShowToast,
  onNavigateToPayments,
  onRefreshOrders,
  isRefreshing = false,
  lastSyncTime = null,
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrugId, setSelectedDrugId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemDosage, setItemDosage] = useState<string>('1 tablet twice daily with meals');

  // Cart & Prescription State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientContact, setPatientContact] = useState('');
  const [prescribingDoctor, setPrescribingDoctor] = useState('Dr. Vance, MD');
  const [prescriptionNumber, setPrescriptionNumber] = useState(`PRX-${Math.floor(10000 + Math.random() * 90000)}`);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Submission & Receipt State
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isFinalizingId, setIsFinalizingId] = useState<string | null>(null);
  const [receiptRecord, setReceiptRecord] = useState<DispensationRecord | null>(null);
  const [selectedOrderTab, setSelectedOrderTab] = useState<'approved' | 'pending' | 'dispensed'>('approved');

  // Filtered Drugs
  const filteredDrugs = useMemo(() => {
    if (!searchQuery.trim()) return drugs.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return drugs.filter(d => 
      d.brandName.toLowerCase().includes(q) ||
      d.genericName.toLowerCase().includes(q) ||
      d.barcode.includes(q) ||
      (d.category && d.category.toLowerCase().includes(q))
    );
  }, [drugs, searchQuery]);

  const selectedDrug = useMemo(() => {
    return drugs.find(d => d.id === selectedDrugId) || null;
  }, [drugs, selectedDrugId]);

  const selectedBatch = useMemo(() => {
    if (!selectedDrug) return null;
    return selectedDrug.batches.find(b => b.id === selectedBatchId) || selectedDrug.batches[0] || null;
  }, [selectedDrug, selectedBatchId]);

  const handleSelectDrug = (drug: Drug) => {
    setSelectedDrugId(drug.id);
    const validBatch = drug.batches.find(b => new Date(b.expiryDate) > new Date() && b.quantity > 0) || drug.batches[0];
    setSelectedBatchId(validBatch ? validBatch.id : null);
    setItemQuantity(1);
  };

  const handleAddToCart = () => {
    if (!selectedDrug || !selectedBatch) {
      onShowToast('Please select a valid medication and batch.', 'warning');
      return;
    }

    const isExpired = new Date(selectedBatch.expiryDate) <= new Date();
    if (isExpired) {
      onShowToast(`CLINICAL BLOCK: Batch ${selectedBatch.batchNumber} is EXPIRED (${selectedBatch.expiryDate}). Dispensation is strictly prohibited!`, 'error');
      return;
    }

    if (itemQuantity <= 0) {
      onShowToast('Quantity must be at least 1 unit.', 'warning');
      return;
    }

    if (itemQuantity > selectedBatch.quantity) {
      onShowToast(`Stock limit: Batch ${selectedBatch.batchNumber} only has ${selectedBatch.quantity} units available.`, 'error');
      return;
    }

    const existingIndex = cart.findIndex(c => c.batch.id === selectedBatch.id);
    if (existingIndex >= 0) {
      const updated = [...cart];
      const newQty = updated[existingIndex].quantity + itemQuantity;
      if (newQty > selectedBatch.quantity) {
        onShowToast(`Exceeds batch stock limit of ${selectedBatch.quantity} units.`, 'error');
        return;
      }
      updated[existingIndex].quantity = newQty;
      updated[existingIndex].totalPrice = Number((newQty * updated[existingIndex].unitPrice).toFixed(2));
      setCart(updated);
    } else {
      const newItem: CartItem = {
        drug: selectedDrug,
        batch: selectedBatch,
        quantity: itemQuantity,
        dosage: itemDosage || 'As directed by physician',
        unitPrice: selectedBatch.sellingPrice || selectedDrug.unitPrice,
        totalPrice: Number((itemQuantity * (selectedBatch.sellingPrice || selectedDrug.unitPrice)).toFixed(2)),
      };
      setCart([...cart, newItem]);
    }

    onShowToast(`Added ${selectedDrug.brandName} (${itemQuantity}x) to order list.`, 'success');
    setItemQuantity(1);
  };

  const handleRemoveFromCart = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  const subtotal = useMemo(() => {
    return Number(cart.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2));
  }, [cart]);

  const tax = useMemo(() => {
    return Number((subtotal * 0.05).toFixed(2));
  }, [subtotal]);

  const totalAmount = useMemo(() => {
    const total = subtotal + tax - (Number(discountAmount) || 0);
    return Number(Math.max(0, total).toFixed(2));
  }, [subtotal, tax, discountAmount]);

  // Create Dispensation Order
  // Prompt requirement: "Modify the dispensation module to create orders, when an order is created, it appears in the payment module where it would be approved, then the dispenser can now click on the 'finalize dispensation' button"
  const handleCreateOrder = async () => {
    if (!patientName.trim()) {
      onShowToast('Patient full name is mandatory for prescription compliance.', 'error');
      return;
    }
    if (cart.length === 0) {
      onShowToast('Please add at least one medication to create an order.', 'warning');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const payload = {
        patientName: patientName.trim(),
        patientAge: patientAge ? parseInt(patientAge) : undefined,
        patientContact: patientContact.trim() || undefined,
        prescribingDoctor,
        prescriptionNumber,
        items: cart.map(c => ({
          drugId: c.drug.id,
          brandName: c.drug.brandName,
          genericName: c.drug.genericName,
          batchId: c.batch.id,
          batchNumber: c.batch.batchNumber,
          expiryDate: c.batch.expiryDate,
          dosage: c.dosage,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          totalPrice: c.totalPrice,
        })),
        discountAmount,
      };

      const newOrder = await onCreateOrder(payload);
      onShowToast(`Order #${newOrder.orderNumber} created. It has been sent to the Payments module for cashier approval.`, 'success');

      // Clear current form
      setCart([]);
      setPatientName('');
      setPatientAge('');
      setPatientContact('');
      setPrescriptionNumber(`PRX-${Math.floor(10000 + Math.random() * 90000)}`);
      setDiscountAmount(0);
      setSelectedOrderTab('pending');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to create order.', 'error');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Finalize Dispensation (Button has NO amount per user prompt!)
  const handleFinalize = async (orderId: string) => {
    setIsFinalizingId(orderId);
    try {
      const record = await onFinalizeOrder(orderId);
      setReceiptRecord(record);
      onShowToast(`Dispensation finalized. Thermal receipt generated for #${record.receiptNumber}.`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Finalization failed.', 'error');
    } finally {
      setIsFinalizingId(null);
    }
  };

  const pendingOrdersList = orders.filter(o => o.status === 'pending_payment');
  const approvedOrdersList = orders.filter(o => o.status === 'payment_approved');
  const dispensedOrdersList = orders.filter(o => o.status === 'dispensed');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      {/* Prompt requirement: Change name to "Dispense Medication" and remove unnecessary tagline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <ShoppingCart className="w-6 h-6 text-teal-700" />
            <span>Dispense Medication</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create clinical dispensation orders, monitor cashier approval, and finalize medication handouts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-mono shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold">Live Sync (3s)</span>
            {lastSyncTime && (
              <span className="text-emerald-700/80 text-[11px] hidden sm:inline">
                · {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>

          {onRefreshOrders && (
            <button
              type="button"
              onClick={onRefreshOrders}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-60 shadow-2xs"
              title="Refresh dispensation orders queue immediately"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          )}

          <button
            onClick={onNavigateToPayments}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer shadow-2xs"
          >
            <CreditCard className="w-4 h-4 text-amber-700" />
            <span>Open Payments ({pendingOrdersList.length} pending)</span>
          </button>
        </div>
      </div>

      {/* Real-time Alert for newly approved orders ready to dispense */}
      {approvedOrdersList.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <span>{approvedOrdersList.length} Order{approvedOrdersList.length > 1 ? 's' : ''} Approved by Cashier &amp; Ready for Handout!</span>
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-emerald-200 text-emerald-900 rounded-full">Real-time update</span>
              </h4>
              <p className="text-xs text-emerald-800">
                Payment received at Cashier desk. You can now finalize dispensation and issue medication receipts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedOrderTab('approved');
              const queueElem = document.getElementById('dispensation-queue-section');
              if (queueElem) queueElem.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-2xs"
          >
            <ArrowRight className="w-4 h-4" />
            <span>Review &amp; Finalize ({approvedOrdersList.length})</span>
          </button>
        </div>
      )}

      {/* Main Grid: Left Catalog & Order Creator, Right Order Queue & Finalization */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Medication Catalog & Cart Formulation */}
        <div className="lg:col-span-7 space-y-4">
          {/* Catalog Search & Selection Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-teal-600" />
              <span>Medication Catalog &amp; Batch Allocation</span>
            </h3>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medication name, generic chemical, or barcode..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all font-sans"
              />
            </div>

            {/* Quick-Pick Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredDrugs.length === 0 ? (
                <div className="col-span-2 py-6 text-center text-xs text-slate-400">
                  No medications found. Register new drugs in the Register Medication module.
                </div>
              ) : (
                filteredDrugs.map((drug) => {
                  const isSelected = selectedDrugId === drug.id;
                  const activeBatch = drug.batches.find(b => new Date(b.expiryDate) > new Date() && b.quantity > 0) || drug.batches[0];
                  const hasStock = drug.totalStock > 0;

                  return (
                    <div
                      key={drug.id}
                      onClick={() => handleSelectDrug(drug)}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-teal-600 bg-teal-50/70 shadow-xs' 
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-slate-900 text-xs truncate">{drug.brandName}</span>
                        <span className="font-mono text-xs font-semibold text-teal-700 shrink-0">
                          {formatNaira(drug.unitPrice)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{drug.genericName}</p>
                      <div className="flex items-center justify-between text-[10px] mt-1 font-mono">
                        <span className="text-slate-500">{drug.dosageForm} · {drug.strength}</span>
                        <span className={hasStock ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>
                          Stock: {drug.totalStock} units
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Allocation & Add-to-Cart Panel */}
          {selectedDrug ? (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedDrug.brandName}</h3>
                  <p className="text-xs text-slate-500">{selectedDrug.genericName} · {selectedDrug.strength}</p>
                </div>
                <span className="font-mono font-bold text-base text-teal-700">
                  {formatNaira(selectedBatch?.sellingPrice || selectedDrug.unitPrice)}/unit
                </span>
              </div>

              {/* Batches selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shelf Batch Lot Selection (FIFO Recommended)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedDrug.batches.map((batch) => {
                    const isSelected = selectedBatch?.id === batch.id;
                    const isExp = new Date(batch.expiryDate) <= new Date();

                    return (
                      <button
                        key={batch.id}
                        type="button"
                        onClick={() => setSelectedBatchId(batch.id)}
                        disabled={isExp || batch.quantity <= 0}
                        className={`p-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                          isSelected 
                            ? 'border-teal-600 bg-teal-50 text-slate-900' 
                            : isExp || batch.quantity <= 0
                            ? 'border-rose-200 bg-rose-50 text-rose-800 opacity-60 cursor-not-allowed'
                            : 'border-slate-200 hover:border-slate-300 text-slate-800'
                        }`}
                      >
                        <div className="flex justify-between font-mono font-semibold">
                          <span>Lot #{batch.batchNumber}</span>
                          <span>{batch.quantity} left</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Exp: {batch.expiryDate} {isExp && '(EXPIRED - BLOCKED)'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity & Dosage */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Units to Dispense
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedBatch?.quantity || 1}
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div className="sm:col-span-8">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prescription Dosage Directions
                  </label>
                  <input
                    type="text"
                    value={itemDosage}
                    onChange={(e) => setItemDosage(e.target.value)}
                    placeholder="e.g. 1 tab twice daily with meals"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!selectedBatch || new Date(selectedBatch.expiryDate) <= new Date() || selectedBatch.quantity <= 0}
                className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>
                  Add {selectedDrug.brandName} to Order List ({formatNaira((selectedBatch?.sellingPrice || selectedDrug.unitPrice) * itemQuantity)})
                </span>
              </button>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-500">
              <ShoppingCart className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <h4 className="text-sm font-semibold text-slate-700">No Medication Selected</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Click any medication from the catalog above to allocate shelf batch lots safely.
              </p>
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Current Cart Form & Order Creator */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-teal-700" />
                <span>New Dispensation Order</span>
              </h3>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800">
                {cart.length} item{cart.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Patient Form Inputs */}
            <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. David Miller"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="e.g. 54"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={patientContact}
                    onChange={(e) => setPatientContact(e.target.value)}
                    placeholder="+234 803 000 0000"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prescribing Doctor</label>
                  <input
                    type="text"
                    value={prescribingDoctor}
                    onChange={(e) => setPrescribingDoctor(e.target.value)}
                    placeholder="Dr. Name, MD"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Cart Itemized List */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Dispensation order queue is currently empty.
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-start justify-between gap-2 text-xs"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900">{item.drug.brandName}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Lot: #{item.batch.batchNumber} · Exp: {item.batch.expiryDate}
                      </p>
                      <p className="text-[10px] text-teal-700 italic mt-0.5">{item.dosage}</p>
                      <div className="text-[11px] text-slate-600 mt-1 font-mono">
                        {item.quantity} units × {formatNaira(item.unitPrice)}
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between self-stretch">
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(idx)}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {formatNaira(item.totalPrice)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Subtotals & Create Order Button */}
            <div className="border-t border-slate-200 pt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal ({cart.length} items)</span>
                <span className="font-mono tabular-nums">{formatNaira(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Healthcare Sales Tax (5%)</span>
                <span className="font-mono tabular-nums">{formatNaira(tax)}</span>
              </div>

              <div className="flex items-center justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                <span>Order Total Amount</span>
                <span className="font-mono text-base text-teal-700 tabular-nums">
                  {formatNaira(totalAmount)}
                </span>
              </div>
            </div>

            {/* Create Order Button */}
            {/* Prompt requirement: When an order is created, it appears in the payment module where it would be approved */}
            <button
              type="button"
              onClick={handleCreateOrder}
              disabled={isSubmittingOrder || cart.length === 0 || !patientName.trim()}
              className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmittingOrder ? (
                <span>Submitting Order to Payments...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Create Dispensation Order</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ORDERS QUEUE & FINALIZATION WORKBENCH */}
      {/* Prompt requirement:
          "While an order is yet to be approved by the cashier in the payment module, it shows as pending in the dispensation module. Multiple pending orders can be present in the dispensation module. then the dispenser can now click on the 'finalize dispensation' button (also remove the amount from the finalize dispensation button)." */}
      <div id="dispensation-queue-section" className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Active Dispensation Queue &amp; Handout</h3>
            <p className="text-slate-500 text-[11px]">
              Orders approved by the cashier can be finalized and handed out to patients.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onRefreshOrders && (
              <button
                type="button"
                onClick={onRefreshOrders}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-60 shadow-2xs"
                title="Refresh order queue"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}

            <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-lg font-semibold">
              <button
                type="button"
                onClick={() => setSelectedOrderTab('approved')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  selectedOrderTab === 'approved' 
                    ? 'bg-teal-700 text-white shadow-xs' 
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Ready to Dispense ({approvedOrdersList.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrderTab('pending')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  selectedOrderTab === 'pending' 
                    ? 'bg-amber-600 text-white shadow-xs' 
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Pending Cashier Approval ({pendingOrdersList.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrderTab('dispensed')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  selectedOrderTab === 'dispensed' 
                    ? 'bg-slate-800 text-white shadow-xs' 
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Dispensed Today ({dispensedOrdersList.length})
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Order # / Created</th>
                <th className="py-3 px-4">Patient Information</th>
                <th className="py-3 px-4">Prescribed Drugs</th>
                <th className="py-3 px-4 text-center">Payment Approval Status</th>
                <th className="py-3 px-4 text-center">Dispenser Finalization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {(selectedOrderTab === 'approved' ? approvedOrdersList : selectedOrderTab === 'pending' ? pendingOrdersList : dispensedOrdersList).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    No orders currently in this tab.
                  </td>
                </tr>
              ) : (
                (selectedOrderTab === 'approved' ? approvedOrdersList : selectedOrderTab === 'pending' ? pendingOrdersList : dispensedOrdersList).map((order) => {
                  const isApproved = order.status === 'payment_approved';
                  const isPending = order.status === 'pending_payment';
                  const isDispensed = order.status === 'dispensed';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono">
                        <div className="font-bold text-slate-900">{order.orderNumber}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{order.patientName}</div>
                        <div className="text-[11px] text-slate-500">Dr. {order.prescribingDoctor}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">
                          {order.items.map(it => `${it.brandName} (${it.quantity}x)`).join(', ')}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Total Amount: {formatNaira(order.totalAmount)}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                            <span>Awaiting Payment in Payments Module</span>
                          </span>
                        ) : isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                            <CheckCircle2 className="w-3 h-3 text-teal-600" />
                            <span>Approved by {order.paymentApprovedBy || 'Cashier'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            <span>Completed &amp; Handed Out</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isApproved ? (
                          /* Prompt requirement: "also remove the amount from the finalize dispensation button" */
                          <button
                            type="button"
                            onClick={() => handleFinalize(order.id)}
                            disabled={isFinalizingId === order.id}
                            className="py-1.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 mx-auto shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isFinalizingId === order.id ? 'Deducting Stock...' : 'Finalize Dispensation'}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">
                            Handed out at {new Date(order.finalizedAt || order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {receiptRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-200 text-center relative">
              <button
                type="button"
                onClick={() => setReceiptRecord(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Dispensation Completed</h3>
              <p className="text-xs text-slate-500">Official Clinical Thermal Receipt</p>
            </div>

            {/* Receipt Body */}
            <div className="p-6 font-mono text-xs text-slate-800 space-y-4 bg-white">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <h4 className="font-bold text-sm text-slate-900 uppercase">HOSPITAL e-MANAGER CLINICAL PHARMACY</h4>
                <p className="text-[11px] text-slate-500 font-sans">Hospital Outpatient Pharmacy Services</p>
                <p className="text-[10px] text-slate-400 mt-1">Receipt: #{receiptRecord.receiptNumber}</p>
                <p className="text-[10px] text-slate-400">{new Date(receiptRecord.dispensedAt).toLocaleString()}</p>
              </div>

              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-bold">{receiptRecord.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Prescriber:</span>
                  <span>{receiptRecord.prescribingDoctor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dispensed By:</span>
                  <span>{receiptRecord.dispensedBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Approved By:</span>
                  <span className="text-emerald-700 font-semibold">{receiptRecord.paymentApprovedBy || 'Cashier Desk'}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2 border-b border-dashed border-slate-300 pb-3">
                {receiptRecord.items.map((it, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between font-semibold">
                      <span>{it.brandName} ({it.quantity}x)</span>
                      <span>{formatNaira(it.totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Batch: {it.batchNumber} (Exp: {it.expiryDate})</span>
                      <span>@ {formatNaira(it.unitPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatNaira(receiptRecord.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sales Tax (5%):</span>
                  <span>{formatNaira(receiptRecord.tax)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1 text-slate-900">
                  <span>TOTAL PAID ({receiptRecord.paymentMethod}):</span>
                  <span>{formatNaira(receiptRecord.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  window.print();
                  onShowToast('Receipt dispatched to thermal printer.', 'success');
                }}
                className="flex-1 py-2 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Thermal Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptRecord(null)}
                className="flex-1 py-2 px-3 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
