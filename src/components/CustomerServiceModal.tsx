import React, { useState } from 'react';
import { Headphones, X, Send, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CustomerServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  jwtToken: string | null;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

export const CustomerServiceModal: React.FC<CustomerServiceModalProps> = ({
  isOpen,
  onClose,
  jwtToken,
  onShowToast,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'Complaint' | 'Hardware/Scanner' | 'Data Import' | 'Billing & Subscription' | 'Clinical Workflow'>('Complaint');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      onShowToast('Please provide a title and detailed description for your complaint/inquiry.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          title,
          description,
          category,
          priority,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit complaint.');

      onShowToast(data.message || 'Complaint submitted to customer service desk.', 'success');
      setTitle('');
      setDescription('');
      onClose();
    } catch (err: any) {
      onShowToast(err.message || 'Error submitting complaint.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden text-slate-900 flex flex-col max-h-[calc(100vh-2rem)] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 bg-teal-50 border-b border-teal-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Contact Customer Service Desk</h3>
              <p className="text-xs text-slate-600">Submit operational complaints, technical feedback, or service inquiries.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer transition-colors"
            title="Close dialog (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto min-h-0">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            >
              <option value="Complaint">Clinical Complaint / Escalation</option>
              <option value="Hardware/Scanner">Barcode Scanner / Receipt Printer</option>
              <option value="Data Import">Formulary Data Ingestion</option>
              <option value="Billing & Subscription">Subscription &amp; Payments</option>
              <option value="Clinical Workflow">Workflow &amp; Feature Request</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Subject / Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Discrepancy in batch barcode recognition"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Complaint Details *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue, facility station, or technician assistance needed..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 resize-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Urgency Level
            </label>
            <div className="grid grid-cols-4 gap-2 text-center">
              {(['low', 'medium', 'high', 'urgent'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setPriority(lvl)}
                  className={`py-1.5 rounded-lg font-semibold capitalize border cursor-pointer ${
                    priority === lvl 
                      ? 'bg-teal-700 text-white border-teal-700' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Send Complaint to Technician Desk'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
