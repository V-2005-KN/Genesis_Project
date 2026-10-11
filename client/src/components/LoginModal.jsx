import React, { useState } from 'react';
import {
  Shield,
  User,
  ChefHat,
  Lock,
  AlertCircle,
  Sparkles,
  ArrowRight,
  X,
  UserCheck,
  Check,
  GraduationCap,
  Key,
  QrCode,
  LogIn
} from 'lucide-react';
import { api } from '../api';

export function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [activeLoginTab, setActiveLoginTab] = useState('demo'); // 'demo' or 'credentials'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);

  if (!isOpen) return null;

  const demoAccounts = [
    {
      role: 'student',
      label: 'Student',
      user: 'cb.ps.i5das23101',
      pass: 'Student@Pass101',
      name: 'Aarav Sharma',
      desc: 'Browse canteen menu, student wallet balance, order food & track personal prep tokens',
      icon: User,
      color: 'border-[#F8C0CE] bg-[#FFF0F4] text-[#B0003A]',
      btnColor: 'bg-[#B0003A] hover:bg-[#8F002E] text-white'
    },
    {
      role: 'faculty',
      label: 'Faculty VIP',
      user: 'cb.fac.cse301',
      pass: 'Faculty@Pass301',
      name: 'Dr. Balakrishnan P',
      desc: '⚡ VIP Priority Queue tokens, fast-track kitchen preparation & express pickup lane',
      icon: GraduationCap,
      color: 'border-[#A2C8FD] bg-blue-50 text-blue-700',
      btnColor: 'bg-blue-600 hover:bg-blue-700 text-white'
    },
    {
      role: 'cook',
      label: 'Kitchen Cook',
      user: 'canteen.cook',
      pass: 'Cook@Kitchen102',
      name: 'Chef Ramesh Babu',
      desc: '👨‍🍳 Live Kitchen KDS Terminal: food prep statuses (Cooking, Food Ready, Served) & crowd pace',
      icon: ChefHat,
      color: 'border-[#FECB9F] bg-amber-50 text-amber-700',
      btnColor: 'bg-amber-600 hover:bg-amber-700 text-white'
    },
    {
      role: 'staff',
      label: 'Counter Staff',
      user: 'canteen.staff',
      pass: 'Staff@Counter101',
      name: 'Murugan K',
      desc: '🏷️ Edit menu items & pricing, stock management, crowd control & token pickup scanner',
      icon: QrCode,
      color: 'border-[#99F6E4] bg-teal-50 text-teal-700',
      btnColor: 'bg-teal-600 hover:bg-teal-700 text-white'
    },
    {
      role: 'admin',
      label: 'Campus Admin',
      user: 'SYS-ADMIN-SUPER',
      pass: 'Admin@SecureRoot01',
      name: 'Dean’s Office',
      desc: '🛡️ Central administration, campus map management, analytics & system configuration',
      icon: Shield,
      color: 'border-[#C8B3E6] bg-purple-50 text-purple-700',
      btnColor: 'bg-purple-700 hover:bg-purple-800 text-white'
    }
  ];

  const handle1ClickLogin = async (acc) => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const res = await api.login({
        identifier: acc.user,
        password: acc.pass,
        expectedRole: acc.role
      });
      if (res && res.success && res.user) {
        onLoginSuccess(res.user);
        if (onClose) onClose();
      } else {
        // Fallback for offline demo
        onLoginSuccess({
          username: acc.user,
          name: acc.name,
          role: acc.role,
          email: `${acc.user}@campus.edu`
        });
        if (onClose) onClose();
      }
    } catch (err) {
      // Graceful fallback to client session
      onLoginSuccess({
        username: acc.user,
        name: acc.name,
        role: acc.role,
        email: `${acc.user}@campus.edu`
      });
      if (onClose) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestLogin = async () => {
    setErrorMessage('');
    setIsGuestSubmitting(true);
    try {
      const res = await api.guestLogin();
      if (res && res.success && res.user) {
        onLoginSuccess(res.user);
        if (onClose) onClose();
      } else {
        onLoginSuccess({
          username: 'guest_visitor',
          name: 'Guest Visitor',
          role: 'guest'
        });
        if (onClose) onClose();
      }
    } catch (err) {
      onLoginSuccess({
        username: 'guest_visitor',
        name: 'Guest Visitor',
        role: 'guest'
      });
      if (onClose) onClose();
    } finally {
      setIsGuestSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Please enter both username/email and password');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.login({
        identifier: identifier.trim(),
        password: password.trim()
      });
      if (res && res.success && res.user) {
        onLoginSuccess(res.user);
        if (onClose) onClose();
      } else {
        setErrorMessage(res?.message || 'Invalid username or password');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid username or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white border border-[#E8E3D7] rounded-3xl shadow-2xl overflow-hidden my-6 text-slate-800">
        
        {/* Shaded Amrita Emblem in Login Modal Background */}
        <img
          src="/amrita-logo.svg"
          alt=""
          aria-hidden="true"
          className="absolute -right-16 -bottom-16 w-80 h-80 opacity-[0.04] pointer-events-none select-none"
        />

        {/* Top Header Bar in Official Amrita Maroon */}
        <div className="bg-[#B0003A] p-5 sm:p-6 text-white flex items-center justify-between border-b border-[#8F002E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 p-1 shadow-sm flex items-center justify-center shrink-0">
              <img
                src="/amrita-logo.svg"
                alt="Amrita Emblem"
                className="w-7 h-7 object-contain brightness-0 invert"
              />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white leading-tight">
                Amrita Single Sign-On (SSO)
              </h3>
              <p className="text-xs text-rose-100/90 font-medium">
                Amrita Vishwa Vidyapeetham • Ettimadai Campus
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-[#E8E3D7] bg-[#FAF7F0] px-4 pt-3 gap-2">
          <button
            type="button"
            onClick={() => { setActiveLoginTab('demo'); setErrorMessage(''); }}
            className={`pb-2.5 px-3.5 text-xs font-black transition border-b-2 flex items-center gap-1.5 ${
              activeLoginTab === 'demo'
                ? 'border-[#B0003A] text-[#B0003A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D4A017]" />
            <span>⚡ 1-Click Demo Profiles</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveLoginTab('credentials'); setErrorMessage(''); }}
            className={`pb-2.5 px-3.5 text-xs font-black transition border-b-2 flex items-center gap-1.5 ${
              activeLoginTab === 'credentials'
                ? 'border-[#B0003A] text-[#B0003A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Sign In with Credentials</span>
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-[#FFF0F4] border border-[#F8C0CE] text-[#B0003A] text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: 1-Click Demo Profiles */}
          {activeLoginTab === 'demo' && (
            <div>
              <div className="mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#B0003A]">
                  Select Any Role to Sign In Instantly:
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any role card below to test its capabilities without typing passwords:
                </p>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                {demoAccounts.map((acc) => {
                  const Icon = acc.icon;
                  return (
                    <div
                      key={acc.user}
                      className={`p-3 rounded-2xl border ${acc.color} flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:shadow-sm transition-all`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="p-2 rounded-xl bg-white shadow-xs shrink-0 mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black">{acc.label}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-black/5 font-mono">
                              {acc.user}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                            {acc.desc}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handle1ClickLogin(acc)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs shrink-0 self-end sm:self-center ${acc.btnColor}`}
                      >
                        {isSubmitting ? 'Entering...' : `Enter as ${acc.label}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Standard Credentials Form */}
          {activeLoginTab === 'credentials' && (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username, Roll No. or Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. cb.ps.i5das23101, canteen.cook, or staff"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FAF7F0] border border-[#E8E3D7] rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#B0003A] focus:ring-1 focus:ring-[#B0003A] transition font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-2.5 bg-[#FAF7F0] border border-[#E8E3D7] rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#B0003A] focus:ring-1 focus:ring-[#B0003A] transition font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-[#B0003A] font-bold"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                <strong>Hint:</strong> Cook username: <code className="font-mono font-bold">canteen.cook</code> (Pass: <code className="font-mono">Cook@Kitchen102</code>)<br />
                Staff username: <code className="font-mono font-bold">canteen.staff</code> (Pass: <code className="font-mono">Staff@Counter101</code>)
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-[#B0003A] hover:bg-[#8F002E] text-white font-bold text-xs transition shadow-md flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to Smart Campus Hub</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Bottom Guest Option & Close */}
          <div className="mt-5 pt-4 border-t border-[#E8E3D7] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={isGuestSubmitting}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#198754] hover:bg-[#146c43] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isGuestSubmitting ? 'Starting Guest Session...' : 'Continue as Guest Visitor'}</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                Close without signing in
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
