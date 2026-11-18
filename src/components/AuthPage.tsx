import React, { useState } from 'react';
import { 
  Building2, 
  User as UserIcon, 
  Phone, 
  Mail, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Boxes, 
  TrendingUp, 
  FileText, 
  Sparkles,
  Server,
  Layers,
  Clock,
  KeyRound,
  Check,
  AlertCircle,
  Scale,
  X
} from 'lucide-react';
import { User } from '../types';

interface AuthPageProps {
  onLoginSuccess: (token: string, user: User, mustChangePassword?: boolean) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onLoginSuccess,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register Form
  const [hospitalName, setHospitalName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);

  // Privacy Policy & Legal Agreement Dialog (shown only after all details are filled & Submit is clicked)
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  // Password Recovery Dialog
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [inputCode, setInputCode] = useState('');
  const [newRecoveryPassword, setNewRecoveryPassword] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      onShowToast('Please provide both email and password.', 'warning');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      onShowToast(`Welcome back, ${data.user.name}!`, 'success');
      onLoginSuccess(data.token, data.user, data.mustChangePassword);
    } catch (err: any) {
      onShowToast(err.message || 'Login failed. Please check your credentials.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Step 1 of Registration: Validate all details are entered, then immediately pop up Privacy Policy & Legal Agreement
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !hospitalName.trim() ||
      !fullName.trim() ||
      !phone.trim() ||
      !registerEmail.trim() ||
      !registerPassword
    ) {
      onShowToast('Please fill out all registration fields.', 'warning');
      return;
    }

    if (registerPassword.length < 4) {
      onShowToast('Admin password must be at least 4 characters.', 'warning');
      return;
    }

    setAcceptedPrivacy(false);
    setAcceptedLegal(false);
    setShowLegalModal(true);
  };

  // Step 2 of Registration: Complete registration after explicit agreement to Privacy Policy & Legal Agreement
  const handleCompleteRegistration = async () => {
    if (!acceptedPrivacy || !acceptedLegal) {
      onShowToast('Please agree to both the Privacy Policy and Legal Registration Agreement to proceed.', 'warning');
      return;
    }

    setIsRegistering(true);
    try {
      const res = await fetch('/api/auth/register-hospital', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalName: hospitalName.trim(),
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: registerEmail.trim(),
          password: registerPassword,
          acceptedPrivacyPolicy: true,
          acceptedLegalAgreement: true,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      setShowLegalModal(false);
      setRegistrationSubmitted(true);
      onShowToast(data.message || 'Registration submitted successfully.', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Registration failed.', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle Forgot Password Code Request
  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    setIsRecovering(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch recovery code.');

      setForgotStep('verify');
      onShowToast(data.message || 'Verification code dispatched to your email.', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Recovery request failed.', 'error');
    } finally {
      setIsRecovering(false);
    }
  };

  // Handle Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode || !newRecoveryPassword) return;

    setIsRecovering(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail,
          code: inputCode,
          newPassword: newRecoveryPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password reset failed.');

      onShowToast('Password updated successfully. You can now log in.', 'success');
      setShowForgotModal(false);
      setForgotStep('request');
      setLoginEmail(forgotEmail);
    } catch (err: any) {
      onShowToast(err.message || 'Reset failed.', 'error');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-teal-600 selection:text-white">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">Hospital e-Manager</h1>
            <p className="text-[11px] text-teal-400 font-mono">Clinical Pharmacy &amp; Healthcare Workstation</p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        {!registrationSubmitted ? (
          <div className="max-w-md w-full mx-auto bg-slate-950/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {/* Header / Tabs */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {activeTab === 'login' ? 'Clinical Staff Sign In' : 'Register Pharmacy / Hospital'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === 'login' 
                  ? 'Access formulary management, dispensation orders, and audit trails.' 
                  : 'Start onboarding your healthcare facility with full zero-knowledge security.'}
              </p>

              {/* Segmented Tab Controls */}
              <div className="mt-5 grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className={`py-2 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className={`py-2 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'register'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Register Facility
                </button>
              </div>
            </div>

            {/* TAB 1: SIGN IN */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="admin@hospital.org"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(true);
                        setForgotEmail(loginEmail);
                      }}
                      className="text-[11px] text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isLoggingIn ? (
                    <span>Authenticating Credentials...</span>
                  ) : (
                    <>
                      <span>Sign In to Clinical Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-3 border-t border-slate-800/80 text-center text-[11px] text-slate-400">
                  New hospital or healthcare branch?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="text-teal-400 font-semibold hover:underline"
                  >
                    Register your facility
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: REGISTER FACILITY */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Hospital / Pharmacy Name *
                  </label>
                  <div className="relative">
                    
                    <input
                      type="text"
                      required
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      placeholder="your business name here"
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Full Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="your full name here"
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Active Phone Number *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 xxx xxx xxxx"
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="admin@hospital-facility.org"
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Create Admin Account Password *
                  </label>
                  <div className="relative">  
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
                >
                  {isRegistering ? (
                    <span>Registering Facility...</span>
                  ) : (
                    <>
                      <span>Submit Facility Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* REGISTRATION CONFIRMATION & EXPANDED SERVICE SHOWCASE */
          /* Prompt requirement: "When the user fills the form and clicks register, a message saying 'you will be contacted by a technician shortly' will come up and the page expands and shows a description of the software service using images and diagrams which show the functionalities of the app (inventory management, analytics, and audits)." */
          <div className="w-full max-w-5xl mx-auto space-y-8 animate-fadeIn">
            {/* Success Confirmation Banner */}
            <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-2xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-bold text-white tracking-tight">
                Registration Submitted Successfully
              </h2>
              
              <div className="inline-block mt-3 px-4 py-2 bg-emerald-500/20 text-emerald-300 font-semibold rounded-full border border-emerald-500/40 text-sm">
                You will be contacted by a technician shortly
              </div>

              <p className="text-xs text-slate-300 max-w-xl mx-auto mt-3 leading-relaxed">
                Thank you for registering <strong>{hospitalName}</strong>. Our field technician will contact{' '}
                <strong>{fullName}</strong> at <strong>{phone}</strong> to verify facility licenses, dispatch barcode scanner integrations, and activate your account.
              </p>

              <div className="mt-5 flex items-center justify-center">
                <button
                  onClick={() => {
                    setRegistrationSubmitted(false);
                    setActiveTab('login');
                  }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-700 flex items-center gap-2 shadow-sm"
                >
                  <span>Back to Sign In</span>
                </button>
              </div>
            </div>

            {/* EXPANDED DIAGRAMS & DESCRIPTION OF SOFTWARE SERVICES */}
            <div className="space-y-6">
              <div className="text-center">
                <span className="text-teal-400 text-xs font-mono font-semibold uppercase tracking-wider">
                  Platform Architecture &amp; Capabilities
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
                  How Hospital e-Manager Protects Your Clinical Workflow
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl mx-auto mt-1">
                  Our platform is designed to ensure zero data loss, secure patient records, and maintain regulatory compliance. Below are the core functionalities that empower your pharmacy and clinical operations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. INVENTORY MANAGEMENT DIAGRAM & DESCRIPTION */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-colors">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center mb-4 border border-teal-500/30">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-white mb-1.5">
                      1. Dynamic Inventory Management
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Tracks every medication line across multiple batch lots, automated First In First Out (FIFO) shelf allocations, and refrigerated storage conditions.
                    </p>

                    {/* Architectural Diagram */}
                    <div className="my-5 p-3.5 bg-slate-900 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-300 space-y-2">
                      <div className="flex items-center justify-between text-teal-400 font-bold border-b border-slate-800 pb-1.5">
                        <span>[Formulary Registry]</span>
                        <span>FIFO Safe</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>↳ Batch Expiry Radar</span>
                        <span className="text-emerald-400">&lt;45d Alert</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>↳ Low Stock Replenish</span>
                        <span className="text-amber-400">Auto PO</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>↳ Quarantine Isolation</span>
                        <span className="text-rose-400">Zero-Dispense</span>
                      </div>
                    </div>
                  </div>

                  <ul className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800/80">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-teal-400" />
                      <span>Formulary barcode NDC lookup</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-teal-400" />
                      <span>Dynamic category creation</span>
                    </li>
                  </ul>
                </div>

                {/* 2. ANALYTICS & REVENUE LOSS PREVENTION DIAGRAM & DESCRIPTION */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-colors">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/30">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-white mb-1.5">
                      2. Live Analytics &amp; Margin Radar
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Real-time revenue velocity, unit margin spread, and waste elimination metrics to prevent financial leakage and optimize operational efficiency.
                    </p>

                    {/* Architectural Diagram */}
                    <div className="my-5 p-3.5 bg-slate-900 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-300 space-y-2">
                      <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-slate-800 pb-1.5">
                        <span>[Financial Metrics]</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>↳ Revenue Velocity</span>
                        <span className="text-emerald-400">Daily Trend</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>↳ Unit Margin Spread</span>
                        <span className="text-teal-400">+60% Avg</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>↳ Waste Elimination</span>
                        <span className="text-emerald-400">Saved: ₦1.8M</span>
                      </div>
                    </div>
                  </div>

                  <ul className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800/80">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Separate Cashier &amp; Dispenser flow</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Order queue eliminates theft</span>
                    </li>
                  </ul>
                </div>

                {/* 3. AUDIT TRAILS & RECORD KEEPING DIAGRAM & DESCRIPTION */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-colors">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4 border border-purple-500/30">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-white mb-1.5">
                      3. Regulatory Audit &amp; Approvals
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Every order, payment approval, and stock movement is cryptographically logged with user identity, timestamp, and payment verification records.
                    </p>

                    {/* Architectural Diagram */}
                    <div className="my-5 p-3.5 bg-slate-900 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-300 space-y-2">
                      <div className="flex items-center justify-between text-purple-400 font-bold border-b border-slate-800 pb-1.5">
                        <span>[Audit Chain]</span>
                        <span>Compliant</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>↳ Order Created</span>
                        <span className="text-slate-400">By Dispenser</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>↳ Payment Approved</span>
                        <span className="text-emerald-400">By Cashier</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>↳ Stock Deducted</span>
                        <span className="text-purple-400">Immutable</span>
                      </div>
                    </div>
                  </div>

                  <ul className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800/80">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-purple-400" />
                      <span>Filter by date, drug &amp; approver</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-purple-400" />
                      <span>PDF &amp; thermal receipt printing</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-teal-400" />
                <span>Password Recovery</span>
              </h3>
              <button
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotStep('request');
                }}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {forgotStep === 'request' ? (
              <form onSubmit={handleRequestRecovery} className="space-y-3 text-xs">
                <p className="text-slate-400">
                  Enter your registered clinical email address. We will generate a verification reset code.
                </p>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="staff@hospital.org"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isRecovering}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg cursor-pointer transition-colors"
                >
                  {isRecovering ? 'Dispatching Code...' : 'Send Recovery Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
                <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl text-teal-200 text-xs flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-teal-100">Verification Code Dispatched</p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      We have sent a 6-digit security code to <strong className="text-white font-mono">{forgotEmail}</strong>. Please check your inbox and spam folder.
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
                  <label className="block text-slate-300 font-semibold mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={newRecoveryPassword}
                    onChange={(e) => setNewRecoveryPassword(e.target.value)}
                    placeholder="New secure password"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isRecovering}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer transition-colors"
                >
                  {isRecovering ? 'Resetting Password...' : 'Save New Password'}
                </button>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Didn&apos;t receive the email?</span>
                  <button
                    type="button"
                    onClick={handleRequestRecovery}
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

      {/* Privacy Policy & Legal Business Registration Agreement Modal */}
      {showLegalModal && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-950/85 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isRegistering) {
              setShowLegalModal(false);
            }
          }}
        >
          <div
            className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[88vh] my-2 sm:my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800 px-4 py-3.5 sm:px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                    Privacy Policy &amp; Legal Compliance Agreement
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    Required before completing registration for <span className="text-teal-300 font-semibold">{hospitalName}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isRegistering}
                onClick={() => setShowLegalModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-2 disabled:opacity-50"
                aria-label="Close agreement dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Legal & Privacy Content */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0 text-xs text-slate-300 leading-relaxed bg-slate-900/70">
              {/* 1. Privacy Policy */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
                  
                  <span>Privacy Policy &amp; Security</span>
                </div>
                <p className="text-slate-300">
                  Hospital e-Manager is committed to safeguarding the confidentiality, integrity, and availability of your facility&apos;s clinical, operational, and staff data:
                </p>
                <ul className="space-y-1.5 text-[11px] text-slate-400 list-disc pl-4">
                  <li>
                    <strong className="text-slate-200">Strict Multi-Tenant Isolation:</strong> Your hospital or pharmacy operates within an isolated tenant workspace. Formulary inventories, batch numbers, patient dispensation orders, and revenue records are logically partitioned and inaccessible to any other facility.
                  </li>
                  <li>
                    <strong className="text-slate-200">Encryption &amp; Access Controls:</strong> All data in transit is secured over encrypted HTTPS/TLS channels. Access is authenticated via signed session tokens and governed strictly by Role-Based Access Control (RBAC) managed by your designated facility administrator.
                  </li>
                  <li>
                    <strong className="text-slate-200">Data Ownership &amp; Purpose Limitation:</strong> Your facility retains full ownership of all uploaded formulary, prescription, and audit data. Data is processed exclusively for inventory management, dispensing workflows, billing authorization, expiry monitoring, and compliance auditing—never sold or shared with third-party advertisers.
                  </li>
                  <li>
                    <strong className="text-slate-200">Immutable Audit Logs:</strong> Critical actions—including medication registration, payment approval, dispensation finalization, and voids—are logged with user attribution and timestamps to prevent tampering and support regulatory audits.
                  </li>
                </ul>
              </div>

              {/* 2. Legal Business Registration Agreement */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <span>Legal Registration &amp; Regulatory Compliance Agreement</span>
                </div>
                <p className="text-slate-300">
                  By proceeding with registration on behalf of <strong className="text-white">{hospitalName}</strong>, you legally represent and warrant that:
                </p>
                <ul className="space-y-1.5 text-[11px] text-slate-400 list-disc pl-4">
                  <li>
                    <strong className="text-slate-200">Legally Registered Business Entity:</strong> Your organization is a legally incorporated and registered business, hospital, clinic, or pharmacy in good standing under applicable local, state, and national laws.
                  </li>
                  <li>
                    <strong className="text-slate-200">Valid Healthcare &amp; Pharmacy Licensing:</strong> Your facility holds active, valid regulatory permits and pharmaceutical licenses required to procure, store, and dispense medications, including controlled substances where applicable.
                  </li>
                  <li>
                    <strong className="text-slate-200">Authorized Representative &amp; Verification:</strong> <strong className="text-slate-200">{fullName}</strong> is duly authorized to register this facility and agrees to cooperate with license verification during onboarding before full clinical activation.
                  </li>
                </ul>
              </div>

              {/* Mandatory Consent Checkboxes */}
              <div className="space-y-2.5 pt-1">
                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-700/60 transition-colors cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acceptedPrivacy}
                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-900 text-teal-600 focus:ring-teal-500 cursor-pointer shrink-0"
                  />
                  <span className="text-xs text-slate-200 leading-snug">
                    I have read and agree to the <strong className="text-teal-400">Privacy Policy</strong> regarding how facility, staff, and clinical data is handled, isolated, and secured.
                  </span>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-600/60 transition-colors cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acceptedLegal}
                    onChange={(e) => setAcceptedLegal(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-900 text-teal-600 focus:ring-teal-500 cursor-pointer shrink-0"
                  />
                  <span className="text-xs text-slate-200 leading-snug">
                    I legally confirm that <strong className="text-white">{hospitalName}</strong> is a <strong className="text-amber-300">legally registered and licensed business/healthcare facility</strong>, and I agree to the Legal Compliance Agreement.
                  </span>
                </label>
              </div>
            </div>

            {/* Sticky Modal Footer */}
            <div className="bg-slate-950 border-t border-slate-800 px-4 py-3 sm:px-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                disabled={isRegistering}
                onClick={() => setShowLegalModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel &amp; Edit Details
              </button>
              <button
                type="button"
                disabled={!acceptedPrivacy || !acceptedLegal || isRegistering}
                onClick={handleCompleteRegistration}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {isRegistering ? (
                  <span>Completing Registration...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Agree &amp; Complete Registration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Footer (No site URL or DB name, per prompt requirement) */}
      <footer className="border-t border-slate-800/60 py-4 text-center text-xs text-slate-500">
        Hospital e-Manager by Team F&F &copy; {new Date().getFullYear()} Clinical Pharmacy Platform. All rights reserved.
      </footer>
    </div>
  );
};
