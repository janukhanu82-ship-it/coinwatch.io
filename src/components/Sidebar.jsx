import React from "react";
import {
  ChartLineUp,
  ClipboardText,
  ChartBar,
  GearSix,
  SignOut,
  List,
  X,
  SpeakerHigh,
  SpeakerSlash,
} from "@phosphor-icons/react";
import { BrandMark, BRAND } from "./ui";

export const NAV_ITEMS = [
  { id: "pump_dump", label: "Pump / Dump", icon: ChartLineUp },
  { id: "poa", label: "POA", icon: ClipboardText },
  { id: "markets", label: "Markets", icon: ChartBar },
  { id: "settings", label: "Settings", icon: GearSix },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-9 h-9 rounded-xl bg-ink-3 border border-white/[0.07] flex items-center justify-center">
        <BrandMark className="w-6 h-6" />
      </span>
      <span className="leading-tight">
        <span className="block text-[17px] font-semibold tracking-tight cw-title">{BRAND}</span>
        <span className="block text-[10px] text-fog-2">Market intelligence</span>
      </span>
    </div>
  );
}

function NavList({ activeNav, onNavigate }) {
  return (
    <nav className="space-y-1" aria-label="Dashboard">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const active = activeNav === id;
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            aria-current={active ? "page" : undefined}
            className={`group relative w-full flex items-center gap-3 h-10 px-3 rounded-xl text-[14px] transition-colors duration-150 ${
              active
                ? "bg-white/[0.05] text-snow"
                : "text-fog hover:text-snow hover:bg-white/[0.025]"
            }`}
          >
            <span
              className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full bg-mint transition-all duration-150 ${
                active ? "h-5 opacity-100" : "h-0 opacity-0"
              }`}
            />
            <Icon
              weight={active ? "fill" : "duotone"}
              className={`w-[18px] h-[18px] ${active ? "text-mint" : ""}`}
            />
            {label}
          </button>
        );
      })}
    </nav>
  );
}

function SoundToggle({ enabled, onToggle }) {
  const Icon = enabled ? SpeakerHigh : SpeakerSlash;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Turn signal sounds off" : "Turn signal sounds on"}
      title={enabled ? "Mute signal alerts" : "Enable signal alerts"}
      className={`group w-full h-10 px-3 rounded-xl border flex items-center justify-between transition-all ${
        enabled
          ? "border-mint/20 bg-mint/[0.06] text-snow hover:bg-mint/[0.09]"
          : "border-white/[0.06] bg-white/[0.025] text-fog hover:text-snow hover:border-white/10"
      }`}
    >
      <span className="flex items-center gap-3 text-[13px] font-medium">
        <Icon
          weight="fill"
          className={`w-[18px] h-[18px] ${enabled ? "text-mint" : "text-fog-2"}`}
        />
        Sound
      </span>
      <span
        className={`relative w-8 h-[18px] rounded-full transition-colors ${
          enabled ? "bg-mint" : "bg-white/10"
        }`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-[3px] w-3 h-3 rounded-full shadow-sm transition-all ${
            enabled ? "left-[17px] bg-ink" : "left-[3px] bg-fog"
          }`}
        />
      </span>
    </button>
  );
}

function SessionBox({ soundEnabled, onToggleSound }) {
  return (
    <div className="space-y-3">
      <SoundToggle enabled={soundEnabled} onToggle={onToggleSound} />
      <div className="cw-panel cw-glow cw-glow-soft p-3.5">
        <div className="text-[10px] text-fog-2">Product session</div>
        <div className="mt-0.5 text-[14px] font-medium text-snow">Trader</div>
        <button
          onClick={() => window.location.reload()}
          className="cw-btn mt-3 w-full !h-9 !text-[12px]"
        >
          <SignOut weight="duotone" className="w-4 h-4" />
          Sign out
        </button>
      </div>
      <div className="px-1">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-mint">
          <span className="w-1.5 h-1.5 rounded-full bg-mint" />
          Public data
        </div>
        <p className="mt-1 text-[10px] text-fog-2 leading-snug">
          Account-authorized. No exchange API key. No orders.
        </p>
      </div>
    </div>
  );
}

export default function Sidebar({
  activeNav,
  setActiveNav,
  mobileOpen,
  setMobileOpen,
  soundEnabled,
  onToggleSound,
}) {
  const navigate = (id) => {
    setActiveNav(id);
    setMobileOpen(false);
  };
  return (
    <>
      <aside className="hidden lg:flex w-[236px] shrink-0 h-full flex-col justify-between border-r border-white/[0.05] bg-[#09090c] p-4">
        <div className="space-y-7">
          <div className="px-1 pt-1">
            <Brand />
          </div>
          <NavList activeNav={activeNav} onNavigate={navigate} />
        </div>
        <SessionBox soundEnabled={soundEnabled} onToggleSound={onToggleSound} />
      </aside>

      <div className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-white/[0.05] bg-[#09090c] shrink-0">
        <Brand />
        <button
          onClick={() => setMobileOpen(true)}
          className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-snow"
          aria-label="Open navigation"
        >
          <List weight="bold" className="w-4 h-4" />
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[264px] bg-[#09090c] border-r border-white/[0.06] p-4 flex flex-col justify-between tab-transition">
            <div className="space-y-7">
              <div className="flex items-center justify-between">
                <Brand />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-fog"
                  aria-label="Close navigation"
                >
                  <X weight="bold" className="w-4 h-4" />
                </button>
              </div>
              <NavList activeNav={activeNav} onNavigate={navigate} />
            </div>
            <SessionBox soundEnabled={soundEnabled} onToggleSound={onToggleSound} />
          </aside>
        </div>
      )}
    </>
  );
}
