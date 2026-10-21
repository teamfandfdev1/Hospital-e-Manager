import React, { useState } from 'react';
import { 
  AlertOctagon, 
  AlertTriangle, 
  ShieldAlert, 
  PackageX, 
  ArrowRight, 
  CheckCircle2, 
  FileCheck, 
  Calendar, 
  TrendingDown, 
  RefreshCw 
} from 'lucide-react';
import { StockAlert, Drug } from '../types';
import { formatNaira } from '../utils/currency';

interface StockAlertsViewProps {
  alerts: StockAlert[];
  drugs: Drug[];
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
  onNavigate: (tab: string) => void;
}

export const StockAlertsView: React.FC<StockAlertsViewProps> = ({
  alerts,
  drugs,
  onShowToast,
  onNavigate,
}) => {
  const [quarantinedBatchIds, setQuarantinedBatchIds] = useState<Record<string, boolean>>({});

  const expiredAlerts = alerts.filter(a => a.alertType === 'expired');
  const expiringSoonAlerts = alerts.filter(a => a.alertType === 'expiring_soon');
  const lowStockAlerts = alerts.filter(a => a.alertType === 'low_stock' || a.alertType === 'out_of_stock');

  const totalAtRiskExpiredValue = expiredAlerts.reduce((sum, a) => sum + a.potentialRevenueLoss, 0);

  const handleQuarantine = (alert: StockAlert) => {
    setQuarantinedBatchIds(prev => ({ ...prev, [alert.id]: true }));
    onShowToast(`Batch #${alert.batchNumber} quarantined! Removed from active dispensation line.`, 'success');
  };

  const handleGeneratePO = (alert: StockAlert) => {
    onShowToast(`Purchase Order #PO-${Math.floor(1000 + Math.random() * 9000)} generated for ${alert.brandName} (50 units).`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-rose-600" />
            <span>Automated Stock Alert Center</span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-rose-50 border border-rose-200 px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-2 max-w-full">
            <TrendingDown className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="text-rose-900 font-semibold truncate">
              At-Risk Expired Value: <strong className="font-mono">{formatNaira(totalAtRiskExpiredValue, false)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-rose-50/70 border border-rose-200 p-4 rounded-xl min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-rose-700 text-xs font-semibold mb-1">
            <span>Critical Expired Batches</span>
            <AlertOctagon className="w-4 h-4 shrink-0" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-950 tabular-nums">
            {expiredAlerts.length}
          </div>
          <p className="text-xs text-rose-800 mt-1">
            Dispensation automatically blocked by clinical protocol.
          </p>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold mb-1">
            <span>Expiring Within 45 Days</span>
            <AlertTriangle className="w-4 h-4 shrink-0" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-950 tabular-nums">
            {expiringSoonAlerts.length}
          </div>
          <p className="text-xs text-amber-800 mt-1">
            FIFO priority recommended to clear stock before expiration.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-slate-700 text-xs font-semibold mb-1">
            <span>Low Stock Under Reorder Point</span>
            <PackageX className="w-4 h-4 text-slate-500 shrink-0" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {lowStockAlerts.length}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Reorder replenishment required to prevent stockout.
          </p>
        </div>
      </div>

      {/* SECTION 1: CRITICAL EXPIRED MEDICATIONS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-600" />
            <h3 className="text-sm font-bold text-rose-950">
              Expired Medications (Immediate Isolation Required)
            </h3>
          </div>
          <span className="text-xs text-rose-800 font-mono">
            {expiredAlerts.length} batches affected
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {expiredAlerts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No expired medications detected. All active batches are compliant.
            </div>
          ) : (
            expiredAlerts.map((alert) => {
              const isQuarantined = !!quarantinedBatchIds[alert.id];

              return (
                <div key={alert.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{alert.brandName}</h4>
                      <span className="text-[11px] text-slate-500">{alert.genericName}</span>
                      <span className="font-mono font-bold text-[10px] text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                        Expired: {alert.expiryDate} ({Math.abs(alert.daysRemaining || 0)}d ago)
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-600 mt-1 text-[11px]">
                      <span>Lot/Batch: <strong className="font-mono text-slate-900">{alert.batchNumber}</strong></span>
                      <span>Affected Units: <strong className="font-mono text-rose-600">{alert.currentStock}</strong></span>
                      <span>At-Risk Cost Loss: <strong className="font-mono text-rose-700">{formatNaira(alert.potentialRevenueLoss)}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isQuarantined ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded text-xs font-semibold border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Quarantined & Isolated
                      </span>
                    ) : (
                      <button
                        onClick={() => handleQuarantine(alert)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Quarantine & Log for Disposal</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SECTION 2: EXPIRING SOON (<45 DAYS) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-amber-950">
              Batches Expiring Soon (Prioritize First-In First-Out)
            </h3>
          </div>
          <span className="text-xs text-amber-800 font-mono">
            {expiringSoonAlerts.length} items approaching expiry
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {expiringSoonAlerts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No batches expiring in the next 45 days.
            </div>
          ) : (
            expiringSoonAlerts.map((alert) => (
              <div key={alert.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900">{alert.brandName}</h4>
                    <span className="text-[11px] text-slate-500">{alert.genericName}</span>
                    <span className="font-mono text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-semibold">
                      {alert.daysRemaining} days left ({alert.expiryDate})
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-slate-600 mt-1 text-[11px]">
                    <span>Batch: <strong className="font-mono text-slate-900">{alert.batchNumber}</strong></span>
                    <span>Units to Dispense: <strong className="font-mono text-slate-900">{alert.currentStock}</strong></span>
                    <span>Estimated Retail Value: <strong className="font-mono text-emerald-700">{formatNaira(alert.potentialRevenueLoss)}</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('dispensation')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  <span>Dispense via POS</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 3: LOW STOCK ITEMS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageX className="w-5 h-5 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Low Stock Replenishment Radar
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {lowStockAlerts.length} items below reorder point
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {lowStockAlerts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              All inventory levels are safely above reorder points.
            </div>
          ) : (
            lowStockAlerts.map((alert) => (
              <div key={alert.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900">{alert.brandName}</h4>
                    <span className="text-[11px] text-slate-500">{alert.genericName}</span>
                    <span className="font-mono text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-bold border border-rose-200">
                      Stock: {alert.currentStock} / Reorder: {alert.threshold}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Critical stock shortfall. Immediate wholesale purchase order required.
                  </p>
                </div>

                <button
                  onClick={() => handleGeneratePO(alert)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Generate Purchase Order</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
