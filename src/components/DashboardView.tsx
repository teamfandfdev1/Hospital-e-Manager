import React from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  PackageX, 
  ShoppingCart, 
  PlusCircle, 
  ShieldCheck, 
  Clock, 
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  BarChart3,
  Calendar,
  AlertOctagon,
  RefreshCw,
  Coins
} from 'lucide-react';
import { AnalyticsSummary, StockAlert, Drug } from '../types';
import { formatNaira, formatNairaCompact } from '../utils/currency';

interface DashboardViewProps {
  analytics: AnalyticsSummary;
  alerts: StockAlert[];
  drugs: Drug[];
  onNavigate: (tab: string) => void;
  onRefresh: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  analytics,
  alerts,
  drugs,
  onNavigate,
  onRefresh,
}) => {
  const criticalAlerts = alerts.filter(a => a.urgency === 'critical');
  const warningAlerts = alerts.filter(a => a.urgency === 'warning');
  
  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-800">Live Formulary & Real-Time Dispensing Analytics</span>
          <span className="text-slate-300 hidden sm:inline">·</span>
          <span className="text-xs text-slate-500 hidden sm:inline">Updated automatically</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5`}  />
            <span>Sync Stock</span>
          </button>

        </div>
      </div>

      {/* Automated Stock Alerts & Expiry Radar Ticker */}
      {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-950 flex items-center gap-2">
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
              onClick={() => onNavigate('alerts')}
              className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-900 bg-white border border-rose-300 hover:bg-rose-100 rounded-md transition-colors shrink-0"
            >
              <span>Open Expiry Radar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            {alerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className="bg-white p-3 rounded-lg border border-rose-200 flex items-start justify-between gap-2 min-w-0 overflow-hidden"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 truncate">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${alert.alertType === 'expired' ? 'bg-rose-600' : 'bg-amber-500'}`} />
                    <span className="truncate">{alert.brandName}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{alert.genericName}</p>
                  <p className="text-[11px] font-mono mt-1 text-rose-700 truncate">
                    {alert.alertType === 'expired' && `Expired batch (${alert.batchNumber}) · Qty: ${alert.currentStock}`}
                    {alert.alertType === 'expiring_soon' && `Expiring in ${alert.daysRemaining} days (${alert.expiryDate})`}
                    {alert.alertType === 'low_stock' && `Stock: ${alert.currentStock} units (Below reorder ${alert.threshold})`}
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Stock Value */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs min-w-0 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2 gap-2">
            <span className="text-xs font-semibold tracking-wide uppercase truncate">Total Inventory Value</span>
            <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 font-bold text-xs flex items-center justify-center shrink-0">₦</span>
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
            <span className="text-emerald-600 font-medium shrink-0">Verified in Neon DB</span>
          </div>
        </div>

        {/* Daily Dispensation Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs min-w-0 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2 gap-2">
            <span className="text-xs font-semibold tracking-wide uppercase truncate">Revenue Today</span>
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
        </div>

        {/* Expired / Low Stock Batches */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs min-w-0 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2 gap-2">
            <span className="text-xs font-semibold tracking-wide uppercase truncate">Stock Alert Status</span>
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
            <span className="text-rose-600 font-semibold shrink-0">Action Pending</span>
          </div>
        </div>
      </div>

      {/* Analytics Trend & Formulary Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Revenue & Volume Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Daily Dispensation Revenue & Margin Trend
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

          {/* Simple High-Density CSS Bar Chart */}
          <div className="h-48 flex items-end justify-between gap-4 pt-4 border-b border-slate-200 pb-2">
            {analytics.dailyRevenueTrend.map((day, idx) => {
              const maxRev = Math.max(...analytics.dailyRevenueTrend.map(d => d.revenue), 1000000);
              const revHeight = (day.revenue / maxRev) * 100;
              const profitHeight = (day.profit / maxRev) * 100;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
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

        {/* Inventory Category Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Formulary Value Breakdown
            </h3>
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
      </div>
    </div>
  );
};
