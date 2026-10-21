import React from 'react';
import { CheckCircle2, AlertOctagon, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
          error: <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />,
          warning: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
          info: <Info className="w-4 h-4 text-teal-600 shrink-0" />,
        };

        const borders = {
          success: 'border-emerald-300 bg-white text-slate-800',
          error: 'border-rose-300 bg-rose-50 text-rose-950',
          warning: 'border-amber-300 bg-amber-50 text-amber-950',
          info: 'border-teal-300 bg-white text-slate-800',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3 rounded-lg border shadow-lg flex items-start justify-between gap-2.5 text-xs transition-all ${borders[toast.type]}`}
          >
            <div className="flex items-start gap-2">
              {icons[toast.type]}
              <span className="font-medium leading-relaxed">{toast.message}</span>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
