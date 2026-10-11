import React, { useState } from 'react';
import {
  Utensils,
  Clock,
  MapPin,
  ChefHat,
  QrCode,
  Shield,
  GraduationCap,
  User,
  LogIn,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Compass,
  AlertCircle
} from 'lucide-react';

export function CampusIntroHero({
  activeTab,
  currentRole,
  currentUser,
  onNavigate,
  onOpenLogin,
  onQuickRoleLogin
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const demoRoles = [
    {
      role: 'student',
      label: 'Student',
      user: 'cb.ps.i5das23101',
      pass: 'Student@Pass101',
      name: 'Aarav Sharma',
      badge: 'Food Ordering & Wallet',
      color: 'bg-[#B0003A] hover:bg-[#8F002E] text-white',
      border: 'border-[#F8C0CE]',
      icon: User,
      targetTab: 'canteen'
    },
    {
      role: 'faculty',
      label: 'Faculty VIP',
      user: 'cb.fac.cse301',
      pass: 'Faculty@Pass301',
      name: 'Dr. Balakrishnan',
      badge: '⚡ Priority Fast-Lane',
      color: 'bg-[#0D6EFD] hover:bg-[#0b5ed7] text-white',
      border: 'border-[#A2C8FD]',
      icon: GraduationCap,
      targetTab: 'canteen'
    },
    {
      role: 'cook',
      label: 'Kitchen Cook',
      user: 'canteen.cook',
      pass: 'Cook@Kitchen102',
      name: 'Chef Ramesh',
      badge: '👨‍🍳 Prep KDS Terminal',
      color: 'bg-[#FD7E14] hover:bg-[#e36d0b] text-white',
      border: 'border-[#FECB9F]',
      icon: ChefHat,
      targetTab: 'cook'
    },
    {
      role: 'staff',
      label: 'Counter Staff',
      user: 'canteen.staff',
      pass: 'Staff@Counter101',
      name: 'Murugan K',
      badge: '🏷️ Menu & Token Scanner',
      color: 'bg-[#0D9488] hover:bg-[#0f766e] text-white',
      border: 'border-[#99F6E4]',
      icon: QrCode,
      targetTab: 'staff'
    },
    {
      role: 'admin',
      label: 'Campus Admin',
      user: 'SYS-ADMIN-SUPER',
      pass: 'Admin@SecureRoot01',
      name: 'Dean’s Office',
      badge: '🛡️ Master Control',
      color: 'bg-[#6F42C1] hover:bg-[#59339d] text-white',
      border: 'border-[#C8B3E6]',
      icon: Shield,
      targetTab: 'overview'
    }
  ];

  const handleRoleClick = (r) => {
    if (onQuickRoleLogin) {
      onQuickRoleLogin(r);
    } else if (onNavigate) {
      onNavigate(r.targetTab, r.role);
    }
  };

  return (
    <section className="mb-6 rounded-3xl bg-white border border-[#E8E3D7] shadow-sm overflow-hidden transition-all duration-300">
      {/* Top Banner & Header Bar */}
      <div className="bg-gradient-to-r from-[#B0003A] via-[#9B0033] to-[#80002A] p-4 sm:p-6 text-white relative overflow-hidden">
        {/* Subtle Watermark Amrita Emblem */}
        <img
          src="/amrita-logo.svg"
          alt=""
          aria-hidden="true"
          className="absolute -right-8 -bottom-10 w-48 sm:w-64 h-48 sm:h-64 opacity-10 pointer-events-none select-none brightness-0 invert"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 p-1.5 shadow-sm flex items-center justify-center shrink-0">
              <img
                src="/amrita-logo.svg"
                alt="Amrita Vishwa Vidyapeetham Emblem"
                className="w-9 h-9 object-contain brightness-0 invert"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 bg-black/25 px-2.5 py-0.5 rounded-full border border-amber-300/30">
                  Amrita Vishwa Vidyapeetham • Ettimadai Campus
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-200 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-400/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Campus System Active
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight mt-1 leading-snug">
                Smart Campus Hub — Digital Canteen & Services
              </h1>
              <p className="text-xs sm:text-sm text-rose-100/90 font-medium max-w-3xl mt-1 leading-relaxed">
                Order meals from campus canteens, track live kitchen preparation tokens in real time,
                navigate campus facilities, and manage kitchen prep operations — all in one unified platform.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold transition shadow-xs"
              title={isCollapsed ? 'Expand Platform Guide' : 'Collapse Platform Guide'}
            >
              {isCollapsed ? (
                <>
                  <Compass className="w-3.5 h-3.5 text-amber-300" />
                  <span>Show Intro Guide</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <Compass className="w-3.5 h-3.5 text-amber-300" />
                  <span>Minimize Guide</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Platform Overview & Pillars */}
      {!isCollapsed && (
        <div className="p-4 sm:p-6 bg-gradient-to-b from-[#FAF7F0]/60 to-white">
          {/* 4 Core Pillars of the Platform */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#B0003A] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D4A017]" />
                What You Can Do on Smart Campus Hub:
              </h2>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                Click any feature card to launch directly into that section
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Pillar 1: Canteen Ordering */}
              <div
                onClick={() => onNavigate && onNavigate('canteen')}
                className={`group p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left relative flex flex-col justify-between ${
                  activeTab === 'canteen'
                    ? 'bg-[#FFF0F4] border-[#B0003A] shadow-md ring-2 ring-[#B0003A]/20'
                    : 'bg-white border-[#E8E3D7] hover:border-[#B0003A]/50 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#FFF0F4] border border-[#F8C0CE] text-[#B0003A] flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
                      <Utensils className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      3 Canteens Open
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#B0003A] transition-colors">
                    1. Food Pre-Ordering
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Browse daily menus for <strong>Main</strong>, <strong>IT</strong> & <strong>MBA</strong> canteens. Add items to cart, pay via student wallet or UPI, and skip the physical lines.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-[#E8E3D7]/60 flex items-center justify-between text-xs font-bold text-[#B0003A]">
                  <span>Order Meals Now</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>

              {/* Pillar 2: Live Token & Queue */}
              <div
                onClick={() => onNavigate && onNavigate('queue')}
                className={`group p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left relative flex flex-col justify-between ${
                  activeTab === 'queue'
                    ? 'bg-[#FFF0F4] border-[#B0003A] shadow-md ring-2 ring-[#B0003A]/20'
                    : 'bg-white border-[#E8E3D7] hover:border-[#B0003A]/50 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      Live Prep ETA
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-amber-700 transition-colors">
                    2. Live Token Queues
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Watch prep stages in real time: <em>Cooking ➔ Ready ➔ Picked Up</em>. View live crowd wait times, countdown timer ETAs, and faculty priority lanes.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-[#E8E3D7]/60 flex items-center justify-between text-xs font-bold text-amber-700">
                  <span>Track Token Status</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>

              {/* Pillar 3: Campus Map & Lost & Found */}
              <div
                onClick={() => onNavigate && onNavigate('map')}
                className={`group p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left relative flex flex-col justify-between ${
                  activeTab === 'map' || activeTab === 'lost-found' || activeTab === 'issues'
                    ? 'bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-white border-[#E8E3D7] hover:border-blue-400 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      Interactive GPS
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
                    3. Campus Map & Services
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Explore Ettimadai campus blocks, seminar halls & sports facilities. Drop GPS pins to report lost belongings or flag campus maintenance issues.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-[#E8E3D7]/60 flex items-center justify-between text-xs font-bold text-blue-700">
                  <span>Explore Campus Map</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>

              {/* Pillar 4: Kitchen Cook & Staff Operations */}
              <div
                onClick={() => onNavigate && onNavigate(currentRole === 'cook' ? 'cook' : 'staff')}
                className={`group p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left relative flex flex-col justify-between ${
                  activeTab === 'cook' || activeTab === 'staff'
                    ? 'bg-teal-50 border-teal-600 shadow-md ring-2 ring-teal-600/20'
                    : 'bg-white border-[#E8E3D7] hover:border-teal-500 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
                      <ChefHat className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                      Kitchen Operations
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors">
                    4. Cook & Staff Portals
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    <strong>Cook KDS:</strong> update food prep stage (Cooking, Ready, Served) & crowd pace.<br />
                    <strong>Staff Station:</strong> edit menu items, change prices, manage inventory & scan tokens.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-[#E8E3D7]/60 flex items-center justify-between text-xs font-bold text-teal-700">
                  <span>Open Operations Terminal</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick 1-Click Role Switcher Ribbon */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E8E3D7] shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-[#B0003A] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#D4A017]" />
                  Experience The Platform As (Instant 1-Click Role Switcher):
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any role button below to preview that specific role's tailored interface and privileges:
                </p>
              </div>

              {/* Login Button with University Account */}
              {!currentUser && onOpenLogin && (
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF7F0] hover:bg-white text-slate-800 hover:text-[#B0003A] border border-[#E8E3D7] text-xs font-extrabold transition shadow-2xs self-start md:self-auto shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#B0003A]" />
                  <span>Sign In with Amrita SSO</span>
                </button>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {demoRoles.map((r) => {
                const Icon = r.icon;
                const isActive = currentRole === r.role || (currentUser && currentUser.role === r.role);
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => handleRoleClick(r)}
                    className={`p-2.5 rounded-xl border text-left transition-all duration-200 group relative flex flex-col justify-between ${
                      isActive
                        ? `${r.color} shadow-sm ring-2 ring-black/15 scale-[1.01]`
                        : `bg-[#FAF7F0] hover:bg-white border-[#E8E3D7] text-slate-800 hover:border-slate-400`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full mb-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                        <span className="text-xs font-black truncate">{r.label}</span>
                      </div>
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-white shrink-0 animate-pulse" />
                      )}
                    </div>
                    <div className="text-[10px] opacity-80 truncate font-medium">
                      {r.name}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-wider mt-1 opacity-90 truncate">
                      {r.badge}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inspirational Quote from Chancellor Amma */}
          <div className="mt-3 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-[#FEF9E7] to-white border border-[#F6DF97] flex items-start gap-3">
            <span className="text-2xl sm:text-3xl text-[#D4A017] font-serif leading-none shrink-0 select-none">“</span>
            <div className="min-w-0">
              <p className="text-xs text-slate-700 italic leading-relaxed">
                Youngsters need to understand the real purpose of life. They need courage and wisdom to face the challenges of life. Only with that understanding can they become the light of the world. Mold their character with love, and the future will be safe.
              </p>
              <span className="block mt-0.5 text-[11px] font-bold text-[#B0003A]">
                — Amma (Chancellor, Amrita Vishwa Vidyapeetham)
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
