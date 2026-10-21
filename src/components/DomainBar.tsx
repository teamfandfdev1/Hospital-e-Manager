import React from 'react';
import { Globe, Lock, ArrowUpRight, Server, ShieldCheck } from 'lucide-react';

interface DomainBarProps {
  activeDomain: 'pharmacy' | 'technician';
  setActiveDomain: (domain: 'pharmacy' | 'technician') => void;
  currentTab: string;
}

export const DomainBar: React.FC<DomainBarProps> = ({
  activeDomain,
  setActiveDomain,
  currentTab,
}) => {
  const currentPath = activeDomain === 'pharmacy' 
    ? `/${currentTab === 'dashboard' ? '' : currentTab}` 
    : `/console/${currentTab}`;

  const currentDomainHost = activeDomain === 'pharmacy'
    ? 'app.hospital-emanager.health'
    : 'ops.hospital-emanager.health';

  const targetDomainHost = activeDomain === 'pharmacy'
    ? 'ops.hospital-emanager.health'
    : 'app.hospital-emanager.health';

  return (
    <div className="domain-bar bg-slate-950 text-slate-300 border-b border-slate-800 text-xs select-none shrink-0 h-9 flex items-center px-3 sm:px-4 z-40">
      <div className="w-full flex items-center justify-between gap-2 max-w-7xl mx-auto">
        {/* Left: Active Domain URL Simulation */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-mono text-[11px] truncate">
            <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="text-emerald-400 font-bold hidden xs:inline">https://</span>
            <span className="font-semibold text-slate-100 truncate">{currentDomainHost}</span>
            <span className="text-slate-500 hidden sm:inline">{currentPath}</span>
          </div>

          <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-slate-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            {activeDomain === 'pharmacy' ? 'Client Domain' : 'Ops Domain (Isolated)'}
          </span>
        </div>

        {/* Right: Switch to other Domain button (Explicitly demonstrating Separate Domains) */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-slate-400 hidden lg:inline">
            Separate Domain:
          </span>
          <button
            onClick={() => setActiveDomain(activeDomain === 'pharmacy' ? 'technician' : 'pharmacy')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/90 hover:bg-slate-700 text-teal-300 hover:text-white border border-slate-700/80 text-[11px] font-semibold transition-colors cursor-pointer"
            title={`Switch domain to ${targetDomainHost}`}
          >
            {activeDomain === 'pharmacy' ? (
              <>
                <Server className="w-3 h-3 text-teal-400" />
                <span>Go to ops domain ({targetDomainHost})</span>
              </>
            ) : (
              <>
                <Globe className="w-3 h-3 text-teal-400" />
                <span>Go to pharmacy domain ({targetDomainHost})</span>
              </>
            )}
            <ArrowUpRight className="w-3 h-3 opacity-70" />
          </button>
        </div>
      </div>
    </div>
  );
};
