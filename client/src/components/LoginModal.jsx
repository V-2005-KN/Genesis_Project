import React, { useState } from 'react';
import { Shield, User, ChefHat, Lock, AlertCircle, Sparkles, ArrowRight, X, UserCheck, Check, GraduationCap, Zap, Key } from 'lucide-react';
import { api } from '../api';

export function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);

  if (!isOpen) return null;

  const demoAccounts = [
    { role: 'faculty', label: 'Faculty VIP', user: 'cb.fac.cse301', pass: 'Faculty@Pass301', desc: 'Dr. Balakrishnan P (Priority Queue)' },
    { role: 'student', label: 'Student', user: 'cb.ps.i5das23101', pass: 'Student@Pass101', desc: 'Aarav Sharma (Canteen & Token)' },
    { role: 'staff', label: 'Canteen Staff', user: 'CANTEEN1-COUNTER-01', pass: 'Staff@C1Pass101', desc: 'Kitchen KDS & Token Dispatcher' },
    { role: 'admin', label: 'Root Admin', user: 'SYS-ADMIN-SUPER', pass: 'Admin@SecureRoot01', desc: 'Security Vault & AI Forecast' }
  ];

  const fillDemo = (acc) => {
    setSelectedRole(acc.role);
    setIdentifier(acc.user);
    setPassword(acc.pass);
    setErrorMessage('');
  };

  const rolePerks = [
    {
      role: 'faculty',
      title: 'Faculty Portal ⚡',
      perk: 'VIP Priority Queue tokens, fast-track preparation & express counter pickup',
      icon: GraduationCap,
      activeColor: 'ring-2 ring-[#0D6EFD] border-[#0D6EFD] bg-[#EBF3FF] text-[#0D6EFD] shadow-md scale-[1.02]',
      normalColor: 'border-[#B6D4FE] bg-[#EBF3FF]/60 text-[#0D6EFD] hover:bg-[#EBF3FF] hover:scale-[1.01]'
    },
    {
      role: 'student',
      title: 'Student Portal',
      perk: 'Fast order tokening, live wait-time tracking, campus guide & personal spending tracker',
      icon: User,
      activeColor: 'ring-2 ring-[#B0003A] border-[#B0003A] bg-[#FFF0F4] text-[#B0003A] shadow-md scale-[1.02]',
      normalColor: 'border-[#F8C0CE] bg-[#FFF0F4]/60 text-[#B0003A] hover:bg-[#FFF0F4] hover:scale-[1.01]'
    },
    {
      role: 'staff',
      title: 'Kitchen & Staff',
      perk: 'Kitchen Display System (KDS), order status progress controls & live stock toggling',
      icon: ChefHat,
      activeColor: 'ring-2 ring-[#FD7E14] border-[#FD7E14] bg-[#FFF2E6] text-[#FD7E14] shadow-md scale-[1.02]',
      normalColor: 'border-[#FECB9F] bg-[#FFF2E6]/60 text-[#FD7E14] hover:bg-[#FFF2E6] hover:scale-[1.01]'
    },
    {
      role: 'admin',
      title: 'Campus Admin',
      perk: 'Master inventory control, campus facility map updates & lost & found moderation',
      icon: Shield,
      activeColor: 'ring-2 ring-[#6F42C1] border-[#6F42C1] bg-[#F3EEF9] text-[#6F42C1] shadow-md scale-[1.02]',
      normalColor: 'border-[#C8B3E6] bg-[#F3EEF9]/60 text-[#6F42C1] hover:bg-[#F3EEF9] hover:scale-[1.01]'
    },
    {
      role: 'guest',
      title: 'Guest Visitor',
      perk: 'Instant 1-click access to browse canteens, map & lost belongings with throw-away session',
      icon: UserCheck,
      activeColor: 'ring-2 ring-[#198754] border-[#198754] bg-[#E8F5E9] text-[#198754] shadow-md scale-[1.02]',
      normalColor: 'border-[#A3D9B5] bg-[#E8F5E9]/60 text-[#198754] hover:bg-[#E8F5E9] hover:scale-[1.01]'
    }
  ];

  const handleCardClick = (item) => {
    setSelectedRole(item.role);
    setErrorMessage('');
    if (item.role === 'guest') {
      handleGuestLogin();
    }
  };

  const handleGuestLogin = async () => {
    setErrorMessage('');
    setIsGuestSubmitting(true);
    try {
      const res = await api.guestLogin();
      if (res.success && res.user) {
        onLoginSuccess(res.user);
        if (onClose) onClose();
      } else {
        setErrorMessage(res.message || 'Failed to initiate guest session');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to initiate guest session');
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
        password: password.trim(),
        expectedRole: selectedRole
      });
      if (res.success && res.user) {
        onLoginSuccess(res.user);
        if (onClose) onClose();
      } else {
        setErrorMessage(res.message || 'Invalid credentials');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-20 px-4 pb-4 bg-[#8F002E]/60 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white border border-[#E8E3D7] rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 mb-8 text-slate-800">
        
        {/* Shaded Amrita Emblem in Login Modal Background */}
        <img
          src="/amrita-logo.svg"
          alt=""
          aria-hidden="true"
          className="absolute -right-16 -bottom-16 w-80 h-80 opacity-[0.05] pointer-events-none select-none"
        />

        {/* Top Header Bar in Official Amrita Maroon */}
        <div className="bg-[#B0003A] -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 p-6 mb-6 text-white flex items-center justify-between border-b border-[#8F002E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 p-0.5 shadow-sm flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-[#D4A017]" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white leading-tight">Smart Campus Hub Portal</h3>
              <p className="text-xs text-rose-100/90 font-medium">Amrita Vishwa Vidyapeetham • Ettimadai Campus</p>
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

        {/* System Capabilities & Animated Role Selectors */}
        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#B0003A] mb-2">
            Select Target Role Capability (Click card to select role)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rolePerks.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedRole === item.role;
              return (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => handleCardClick(item)}
                  className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all duration-300 transform active:scale-95 flex items-start gap-3 relative overflow-hidden select-none ${
                    isSelected
                      ? `${item.activeColor} ring-2 shadow-lg`
                      : `${item.normalColor} hover:-translate-y-0.5 shadow-sm hover:shadow-md`
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 transition-colors duration-200 ${
                    isSelected ? 'bg-[#B0003A] text-white shadow-sm' : 'bg-white/70 text-slate-700'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="w-full">
                    <div className="font-bold text-xs flex items-center justify-between gap-1">
                      <span className="truncate">{item.title}</span>
                      {isSelected ? (
                        <span className="flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#B0003A] text-white uppercase shadow-sm animate-in zoom-in-75 duration-200 shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" /> Selected
                        </span>
                      ) : item.role === 'guest' ? (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#198754] text-white uppercase shrink-0">1-Click</span>
                      ) : (
                        <span className="text-[9px] font-semibold text-slate-400 group-hover:text-slate-600 transition shrink-0">Select</span>
                      )}
                    </div>
                    <p className="text-[10px] opacity-90 leading-relaxed mt-1 font-normal">{item.perk}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick 1-Click Demo Profiles (Faculty, Student, Canteen Staff, Admin) */}
        <div className="mt-4 pt-3 border-t border-[#E8E3D7]/60">
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-[#D4A017]" />
            <span>Quick 1-Click Test Credentials (Click to autofill)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {demoAccounts.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => fillDemo(acc)}
                className={`p-2 rounded-xl border text-left transition group shadow-xs ${
                  selectedRole === acc.role
                    ? 'border-[#B0003A] bg-[#FFF0F4] ring-1 ring-[#B0003A]'
                    : 'border-[#E8E3D7] bg-[#FAF7F0] hover:bg-white hover:border-[#B0003A]'
                }`}
              >
                <div className="font-extrabold text-[11px] text-slate-800 group-hover:text-[#B0003A] truncate flex items-center justify-between">
                  <span>{acc.label}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">{acc.user}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Prominent Guest Login Button */}
        <div>
          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={isGuestSubmitting}
            className="w-full py-2.5 rounded-2xl bg-[#198754] hover:bg-[#146c43] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-[#198754]/20 active:scale-[0.99]"
          >
            <UserCheck className="w-4 h-4" />
            <span>{isGuestSubmitting ? 'Launching Guest Session...' : 'Continue as Guest (1-Time Throw-Away Access)'}</span>
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-[#FFF0F4] border border-[#F8C0CE] text-[#B0003A] text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-[#B0003A] shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Secure Credentials Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 pt-2 border-t border-[#E8E3D7]/60">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Username or Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                required
                placeholder="Enter your campus username or email"
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
                className="w-full pl-10 pr-10 py-2.5 bg-[#FAF7F0] border border-[#E8E3D7] rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#B0003A] focus:ring-1 focus:ring-[#B0003A] transition font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-[#B0003A] font-semibold"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-2xl bg-[#B0003A] hover:bg-[#8F002E] text-white font-bold text-xs transition shadow-lg shadow-[#B0003A]/25 flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            {isSubmitting ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In with Credentials</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
