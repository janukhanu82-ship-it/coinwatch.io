import React from 'react';
import { TrendingUp, FileText, BarChart2, Settings, LogOut, Radio } from 'lucide-react';

export default function Sidebar({ activeNav, setActiveNav }) {
  const navItems = [
    { id: 'pump_dump', label: 'Pump / Dump', icon: TrendingUp },
    { id: 'poa', label: 'POA', icon: FileText },
    { id: 'markets', label: 'Markets', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-60 bg-[#07090E] border-r border-[#151B28] flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div>
        <div className="p-5 flex items-center gap-3 border-b border-[#151B28]/60">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-base tracking-tight font-sans">coinwach</span>
              <span className="text-[10px] text-emerald-400 font-mono">.io</span>
            </div>
            <p className="text-[10px] text-emerald-500/80 font-mono tracking-wider font-semibold">MARKET INTELLIGENCE</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold font-mono transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)] font-bold'
                    : 'text-[#8E9BAE] hover:text-white hover:bg-[#0E131F]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-[#8E9BAE]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Session Box & Public Data badge */}
      <div className="p-4 border-t border-[#151B28]/80 space-y-3 font-mono">
        <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#151B28] space-y-2">
          <div className="text-[10px] text-[#5A6882] font-semibold">PRODUCT SESSION</div>
          <div className="text-xs text-white font-bold flex items-center justify-between">
            <span>Trader Session</span>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#07090E] border border-[#1A2234] text-[11px] text-[#8E9BAE] hover:text-white transition-colors"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign out</span>
          </button>
        </div>

        <div className="px-1 text-[10px] text-[#5A6882] leading-tight space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>PUBLIC DATA</span>
          </div>
          <p>Account authorisation. No exchange API key. No orders.</p>
        </div>
      </div>
    </aside>
  );
}
