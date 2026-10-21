import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Lock, 
  Mail, 
  KeyRound, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  Building2,
  ChevronRight
} from 'lucide-react';
import { User } from '../types';

interface DeveloperAuthPageProps {
  onLoginSuccess: (token: string, user: User) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onSwitchToClientDomain: () => void;
  activeClientUser?: User | null;
}

export const DeveloperAuthPage: React.FC<DeveloperAuthPageProps> = ({
  onLoginSuccess,
  onShowToast,
  onSwitchToClientDomain,
  activeClientUser,
}) => {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('pharmpulse_developer_configured') === 'true') {
        return true;
      }
    } catch {}
    return null;
  });
  const [developerEmail, setDeveloperEmail] = useState('');
  
  // Setup fields
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Login field (Password ONLY, per prompt requirement!)
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Forgot password
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [inputCode, setInputCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    checkDeveloperStatus();
  }, []);

  const checkDeveloperStatus = async () => {
    try {
      const res = await fetch(`/api/developer/status?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      const data = await res.json();
      const configured = Boolean(data.isConfigured);
      setIsConfigured(configured);
      if (configured) {
        try {
          localStorage.setItem('pharmpulse_developer_configured', 'true');
        } catch {}
      }
      if (data.email) setDeveloperEmail(data.email);
    } catch (err) {
      try {
        const cached = localStorage.getItem('pharmpulse_developer_configured') === 'true';
        setIsConfigured(cached);
      } catch {
        setIsConfigured(false);
      }
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupEmail || !setupPassword) {
      onShowToast('Please provide both recovery email and master password.', 'warning');
      return;
    }
    if (setupPassword !== setupConfirm) {
      onShowToast('Passwords do not match.', 'error');
      return;
    }

    setIsSettingUp(true);
    try {
      const res = await fetch('/api/developer/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: setupEmail, password: setupPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.isConfigured || (data.error && data.error.includes('already initialized'))) {
          setIsConfigured(true);
          try {
            localStorage.setItem('pharmpulse_developer_configured', 'true');
          } catch {}
          onShowToast('Developer account is already initialized. Please sign in with your master password.', 'info');
          return;
        }
        throw new Error(data.error || 'Setup failed.');
      }

      try {
        localStorage.setItem('pharmpulse_developer_configured', 'true');
      } catch {}
      setIsConfigured(true);
      onShowToast('Developer master account initialized.', 'success');
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      onShowToast(err.message || 'Setup error.', 'error');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPassword) {
      onShowToast('Please enter the developer master password.', 'warning');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/developer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.needsSetup) {
          setIsConfigured(false);
          try {
            localStorage.removeItem('pharmpulse_developer_configured');
          } catch {}
        }
        throw new Error(data.error || 'Authentication failed.');
      }

      try {
        localStorage.setItem('pharmpulse_developer_configured', 'true');
      } catch {}
      onShowToast('Welcome to SaaS Developer Command Console.', 'success');
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      onShowToast(err.message || 'Authentication error.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setIsRecovering(true);
    try {
      const res = await fetch('/api/developer/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Recovery failed.');
      setForgotStep('verify');
      onShowToast(data.message || 'Recovery verification code dispatched to your email.', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Recovery request error.', 'error');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode || !newPassword) return;
    setIsRecovering(true);
    try {
      const res = await fetch('/api/developer/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inputCode, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset error.');
      onShowToast('Master developer password updated successfully. Please log in.', 'success');
      setShowForgot(false);
      setForgotStep('request');
      setInputCode('');
      setNewPassword('');
    } catch (err: any) {
      onShowToast(err.message || 'Reset failed.', 'error');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-teal-600 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">SaaS Server-Side Ops Console</h1>
            <p className="text-[10px] text-teal-400 font-mono">ops.hospital-emanager.health</p>
          </div>
        </div>

        <button
          onClick={onSwitchToClientDomain}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
        >
          <Building2 className="w-3.5 h-3.5 text-teal-400" />
          <span>Pharmacy Client App (app.hospital-emanager.health)</span>
        </button>
      </header>

      {/* Main Form */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {activeClientUser && (
            <div className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200">
              <div className="flex items-center gap-2 font-bold text-amber-400 mb-1.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Developer Console Access Restricted</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                You are currently signed in as <span className="font-semibold text-white">{activeClientUser.name}</span> ({activeClientUser.role.toUpperCase()}) on <em>app.hospital-emanager.health</em>.
                Only platform developers can access ops and server management.
              </p>
              <button
                type="button"
                onClick={onSwitchToClientDomain}
                className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>← Return to Pharmacy Workstation</span>
              </button>
            </div>
          )}

          {isConfigured === false ? (
            /* ONE-TIME INITIAL DEVELOPER REGISTRATION */
            /* Prompt requirement: "password which would be set from a one-time registration page when the system is run for the first time. (This is the page which loads first). The registration would be done with an email (for password recovery), and a password." */
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white">Initial Developer Setup</h2>
                <p className="text-xs text-slate-400 mt-1">
                  First-time system startup. Please define master credentials for server operations and technician management.
                </p>
              </div>

              <form onSubmit={handleSetup} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Recovery Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={setupEmail}
                      onChange={(e) => setSetupEmail(e.target.value)}
                      placeholder="developer@hospital-emanager.health"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Used strictly for master password recovery verification.</p>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Master Developer Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={setupPassword}
                      onChange={(e) => setSetupPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Confirm Master Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={setupConfirm}
                      onChange={(e) => setSetupConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSettingUp}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
                >
                  {isSettingUp ? 'Saving Master Setup...' : 'Complete Master Setup & Enter Console'}
                </button>

                <div className="pt-3 text-center border-t border-slate-800">
                  <p className="text-slate-400 text-[11px] mb-1.5">
                    Already configured this developer console?
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfigured(true);
                      try {
                        localStorage.setItem('pharmpulse_developer_configured', 'true');
                      } catch {}
                    }}
                    className="text-xs text-teal-400 hover:text-teal-300 font-semibold cursor-pointer hover:underline inline-flex items-center gap-1"
                  >
                    <span>Sign in with Master Password</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* SUBSEQUENT DEVELOPER LOGIN - PASSWORD ONLY */
            /* Prompt requirement: "The developer would only need to provide a password when logging in" */
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-teal-400 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white">Developer Sign In</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enter master password to access platform ops, hospital approvals, and facility access controls.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">Master Password</label>
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-[11px] text-teal-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      autoFocus
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter developer password"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? 'Verifying...' : 'Unlock Server Console'}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfigured(false);
                      try {
                        localStorage.removeItem('pharmpulse_developer_configured');
                      } catch {}
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-400 cursor-pointer"
                  >
                    Need first-time setup instead?
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Developer Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-teal-400" />
                <span>Developer Password Recovery</span>
              </h3>
              <button
                onClick={() => setShowForgot(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {forgotStep === 'request' ? (
              <form onSubmit={handleForgotRequest} className="space-y-3.5 text-xs">
                <p className="text-slate-300">
                  Enter your registered developer email address to receive a secure 6-digit password verification code.
                </p>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Developer Email</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="developer@hospital.health"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isRecovering}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  {isRecovering ? 'Dispatching Code...' : 'Send Recovery Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleReset} className="space-y-3.5 text-xs">
                <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl text-teal-200 text-xs flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-teal-100">Verification Code Dispatched</p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      A 6-digit security code has been sent to <strong className="text-white font-mono">{forgotEmail}</strong>. Please check your inbox and spam folder.
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Verification Code</label>
                  <input
                    type="text"
                    required
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">New Master Password</label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New master password"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isRecovering}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  {isRecovering ? 'Saving Password...' : 'Save New Password'}
                </button>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Didn&apos;t receive the email?</span>
                  <button
                    type="button"
                    onClick={handleForgotRequest}
                    disabled={isRecovering}
                    className="text-teal-400 hover:text-teal-300 font-semibold hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Resend Code
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Clean Footer (No site URL or DB name) */}
      <footer className="border-t border-slate-800/60 py-3 text-center text-xs text-slate-500">
        Hospital e-Manager Platform Infrastructure
      </footer>
    </div>
  );
};
