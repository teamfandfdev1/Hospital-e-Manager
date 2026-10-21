import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Pill, 
  Barcode, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle,
  Sparkles,
  Layers,
  Plus,
  ArrowRight,
  Database
} from 'lucide-react';
import { Drug, DosageForm } from '../types';
import { formatNaira } from '../utils/currency';

interface DrugRegistrationViewProps {
  drugs: Drug[];
  jwtToken: string | null;
  onRegisterDrug: (payload: any) => Promise<any>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
  onNavigate: (tab: string) => void;
}

export const DrugRegistrationView: React.FC<DrugRegistrationViewProps> = ({
  drugs,
  jwtToken,
  onRegisterDrug,
  onShowToast,
  onNavigate,
}) => {
  // Mode: Register brand new drug vs Add batch to existing drug from database
  // Prompt requirement: "When a new drug has been registered into the system, the drug registration module should be able to retrieve the drug names from the database, so when a new batch is being recorded, the user can just select the drug."
  const [mode, setMode] = useState<'new_drug' | 'existing_drug'>('new_drug');
  const [selectedExistingDrugId, setSelectedExistingDrugId] = useState<string>('');

  // Categories state (Prompt requirement: "therapeutic category should be empty when the system launches newly, and the user should be able to add new categories right there")
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Form Fields
  const [brandName, setBrandName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [category, setCategory] = useState('');
  const [dosageForm, setDosageForm] = useState<DosageForm>('Tablet');
  const [strength, setStrength] = useState('500mg');
  const [barcode, setBarcode] = useState('');
  const [manufacturer, setManufacturer] = useState('Pharmaceutical Labs');
  const [reorderLevel, setReorderLevel] = useState<number>(30);
  const [storageCondition, setStorageCondition] = useState<'Room Temp (15-25°C)' | 'Refrigerated (2-8°C)' | 'Frozen (-20°C)' | 'Cool & Dry'>('Room Temp (15-25°C)');
  const [isControlled, setIsControlled] = useState(false);

  // Batch Fields
  const [batchNumber, setBatchNumber] = useState(`LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [quantity, setQuantity] = useState<number>(100);
  const [costPrice, setCostPrice] = useState<number>(1200);
  const [sellingPrice, setSellingPrice] = useState<number>(2400);
  const [manufactureDate, setManufactureDate] = useState('2025-06-01');
  const [expiryDate, setExpiryDate] = useState('2027-12-31');
  const [supplier, setSupplier] = useState('Apex Medical Depot');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch therapeutic categories from backend
  useEffect(() => {
    fetchCategories();
  }, [jwtToken]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
        }
      });
      const data = await res.json();
      if (data.categories) {
        setCategories(data.categories);
        if (data.categories.length > 0 && !category) {
          setCategory(data.categories[0]);
        }
      }
    } catch (err) {
      // Fallback
    }
  };

  // When existing drug is selected, auto-fill metadata
  const handleSelectExistingDrug = (drugId: string) => {
    setSelectedExistingDrugId(drugId);
    const drug = drugs.find(d => d.id === drugId);
    if (drug) {
      setBrandName(drug.brandName);
      setGenericName(drug.genericName);
      setCategory(drug.category);
      setDosageForm(drug.dosageForm);
      setStrength(drug.strength);
      setBarcode(drug.barcode);
      setManufacturer(drug.manufacturer);
      setReorderLevel(drug.reorderLevel);
      setStorageCondition(drug.storageCondition);
      setIsControlled(drug.isControlled);
      setCostPrice(drug.unitCost);
      setSellingPrice(drug.unitPrice);
    }
  };

  // Add new category inline
  const handleAddNewCategory = async () => {
    if (!newCategoryInput.trim()) return;
    const catName = newCategoryInput.trim();

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ categoryName: catName }),
      });
      const data = await res.json();
      if (data.categories) {
        setCategories(data.categories);
        setCategory(catName);
        setNewCategoryInput('');
        setIsAddingCategory(false);
        onShowToast(`Category "${catName}" added successfully.`, 'success');
      }
    } catch (err) {
      onShowToast('Failed to add category.', 'error');
    }
  };

  // Auto-generate barcode
  const handleGenerateBarcode = () => {
    const randomBarcode = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    setBarcode(randomBarcode);
    onShowToast(`Generated clinical barcode: ${randomBarcode}`, 'success');
  };

  const unitProfit = sellingPrice - costPrice;
  const marginPct = sellingPrice > 0 ? (((unitProfit) / sellingPrice) * 100).toFixed(1) : '0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName || !genericName || !batchNumber || !expiryDate) {
      onShowToast('Please fill out mandatory drug details and batch dates.', 'warning');
      return;
    }

    if (new Date(expiryDate) <= new Date()) {
      onShowToast('Batch expiry date must be in the future to prevent dispensing errors.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        existingDrugId: mode === 'existing_drug' ? selectedExistingDrugId : undefined,
        brandName: brandName.trim(),
        genericName: genericName.trim(),
        barcode: barcode || Math.floor(100000000000 + Math.random() * 900000000000).toString(),
        category: category || 'General Medicine',
        dosageForm,
        strength: strength.trim(),
        manufacturer: manufacturer.trim(),
        reorderLevel,
        storageCondition,
        isControlled,
        initialBatch: {
          batchNumber: batchNumber.trim(),
          quantity,
          costPrice,
          sellingPrice,
          manufactureDate,
          expiryDate,
          supplier: supplier.trim(),
        },
        notes: notes.trim(),
      };

      await onRegisterDrug(payload);
      onShowToast(`Recorded ${brandName} (Lot #${batchNumber}, ${quantity} units) to inventory.`, 'success');

      // Refresh categories in case new one was saved
      fetchCategories();

      // Reset batch specifics
      setBatchNumber(`LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      onNavigate('inventory');
    } catch (err: any) {
      onShowToast(err.message || 'Registration failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Register Medication
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Add new formulary lines or record incoming batch lots with wholesale pricing and expiry dates.
            </p>
          </div>

          {/* Mode Selector Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('new_drug');
                setSelectedExistingDrugId('');
                setBrandName('');
                setGenericName('');
              }}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                mode === 'new_drug'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + Register New Drug
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('existing_drug');
                if (drugs.length > 0) {
                  handleSelectExistingDrug(drugs[0].id);
                }
              }}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                mode === 'existing_drug'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Select Existing Drug ({drugs.length} in DB)
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs">
          {/* Mode 2: Existing Drug Selector from Database */}
          {mode === 'existing_drug' && (
            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
              <label className="block font-bold text-teal-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-700" />
                <span>Select Drug from Active Database</span>
              </label>
              {drugs.length === 0 ? (
                <p className="text-slate-500">
                  No existing drugs in database yet. Please switch to &quot;Register New Drug&quot; to create your first medication.
                </p>
              ) : (
                <select
                  value={selectedExistingDrugId}
                  onChange={(e) => handleSelectExistingDrug(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-teal-300 rounded-lg text-xs font-semibold text-slate-900"
                >
                  {drugs.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.brandName} ({d.genericName}) · {d.dosageForm} {d.strength} — Stock: {d.totalStock} units
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Core Drug Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-800 mb-1.5">
                Brand (Trade) Name *
              </label>
              <input
                type="text"
                required
                disabled={mode === 'existing_drug'}
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Amoxil Forte"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1.5">
                Generic (Chemical) Name *
              </label>
              <input
                type="text"
                required
                disabled={mode === 'existing_drug'}
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                placeholder="e.g. Amoxicillin Trihydrate"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 disabled:bg-slate-100"
              />
            </div>

            {/* Dynamic Therapeutic Category Selector */}
            {/* Prompt requirement: "therapeutic category should be empty when the system launches newly, and the user should be able to add new categories right there" */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-800">
                  Therapeutic Category *
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(true)}
                  className="text-teal-700 hover:text-teal-800 font-semibold text-[11px] underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Category</span>
                </button>
              </div>

              {isAddingCategory ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    placeholder="New Category name"
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewCategory}
                    className="px-2.5 py-1.5 bg-teal-700 text-white rounded font-semibold cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(false)}
                    className="px-2 py-1.5 text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <select
                  value={category}
                  disabled={mode === 'existing_drug'}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 disabled:bg-slate-100"
                >
                  {categories.length === 0 ? (
                    <option value="">(No categories created yet - click &apos;Add Category&apos; above)</option>
                  ) : (
                    categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))
                  )}
                </select>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1.5">
                Dosage Form &amp; Strength *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={dosageForm}
                  disabled={mode === 'existing_drug'}
                  onChange={(e) => setDosageForm(e.target.value as any)}
                  className="px-2 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 disabled:bg-slate-100"
                >
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Injection">Injection</option>
                  <option value="Ointment">Ointment</option>
                  <option value="Suspension">Suspension</option>
                  <option value="Drops">Drops</option>
                  <option value="Inhaler">Inhaler</option>
                  <option value="IV Infusion">IV Infusion</option>
                </select>

                <input
                  type="text"
                  required
                  disabled={mode === 'existing_drug'}
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                  placeholder="500mg"
                  className="px-2 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono disabled:bg-slate-100"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-800">Barcode / NDC</label>
                {mode === 'new_drug' && (
                  <button
                    type="button"
                    onClick={handleGenerateBarcode}
                    className="text-teal-700 underline text-[11px] cursor-pointer"
                  >
                    Auto-Generate
                  </button>
                )}
              </div>
              <input
                type="text"
                disabled={mode === 'existing_drug'}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Barcode number"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1.5">
                Manufacturer / Lab
              </label>
              <input
                type="text"
                disabled={mode === 'existing_drug'}
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="Manufacturer name"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Batch Specifics & Pricing Header */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Pill className="w-4 h-4 text-teal-700" />
              <span>Incoming Batch Lot &amp; Financial Margins</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">Batch Lot # *</label>
                <input
                  type="text"
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">Initial Units Added *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">Batch Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">Distributor / Supplier</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Supplier name"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">Unit Wholesale Cost Price (₦) *</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  required
                  value={costPrice}
                  onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">Unit Patient Selling Price (₦) *</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  required
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-teal-800 font-mono font-bold"
                />
                <p className="text-[10px] text-emerald-600 font-mono mt-1">
                  Gross Margin: +{marginPct}% ({formatNaira(unitProfit)} profit per unit)
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">Low Stock Reorder Alert Level</label>
                <input
                  type="number"
                  min={5}
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(parseInt(e.target.value) || 20)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">Storage Protocol</label>
                <select
                  value={storageCondition}
                  onChange={(e) => setStorageCondition(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                >
                  <option value="Room Temp (15-25°C)">Room Temp (15-25°C)</option>
                  <option value="Refrigerated (2-8°C)">Refrigerated (2-8°C)</option>
                  <option value="Frozen (-20°C)">Frozen (-20°C)</option>
                  <option value="Cool & Dry">Cool &amp; Dry</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording Batch...' : 'Register Batch to Inventory'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
