import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onSuccess: (newToken: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
  jwtToken: string | null;
  userName: string;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onSuccess,
  onShowToast,
  jwtToken,
  userName,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      onShowToast('New password must be at least 4 characters long.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      onShowToast('Passwords do not match.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }

      onShowToast('Personal password configured successfully. Welcome to your workstation!', 'success');
      onSuccess(data.token);
    } catch (err: any) {
      onShowToast(err.message || 'Error updating password.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-slate-900">
        <div className="p-6 bg-amber-50 border-b border-amber-200/80 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              First-Time Sign In: Update Password
            </h3>
            <p className="text-xs text-amber-900 mt-0.5">
              Welcome, <strong>{userName}</strong>. As required by clinical security compliance, please set your private password to replace your temporary email-based password.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              New Personal Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={4}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 4 chars)"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Confirm New Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={4}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Securing Account...' : 'Set Password & Enter Workstation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
