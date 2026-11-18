import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function Header({ isConnected, soundEnabled, setSoundEnabled, stats }) {
  const trackedCount = stats?.trackedCount ?? 0;

  return (
    <header className="border-b border-terminal-border bg-terminal-dark px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 font-mono select-none">
      {/* Left: Brand & Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-terminal-card border border-terminal-border flex items-center justify-center font-bold text-terminal-green text-sm shadow-sm">
            ⚡
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-sm tracking-wider font-sans">
              PERP SCANNER
            </span>
            <span className="text-[10px] px-1.5 py-0.5 font-mono font-bold bg-terminal-card border border-terminal-green/40 text-terminal-green rounded">
              v2.0
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-terminal-border mx-1" />

        {/* System Status & Pulse */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="relative flex h-2 w-2">
            {isConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terminal-green opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isConnected ? 'bg-terminal-green' : 'bg-terminal-red'
              }`}
            />
          </span>
          <span
            className={`text-[11px] font-bold tracking-wider ${
              isConnected ? 'text-terminal-green' : 'text-terminal-red'
            }`}
          >
            {isConnected ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Center: Exchange Priority Badges */}
      <div className="hidden md:flex items-center gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-terminal-card border border-exchange-hl/40 text-exchange-hl">
          <span className="w-1.5 h-1.5 rounded-full bg-exchange-hl" />
          <span className="font-bold tracking-tight">#1 HYPERLIQUID</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-terminal-card border border-exchange-binance/40 text-exchange-binance">
          <span className="w-1.5 h-1.5 rounded-full bg-exchange-binance" />
          <span className="font-bold tracking-tight">#2 BINANCE</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-terminal-card border border-exchange-bybit/40 text-exchange-bybit">
          <span className="w-1.5 h-1.5 rounded-full bg-exchange-bybit" />
          <span className="font-bold tracking-tight">#3 BYBIT</span>
        </div>
      </div>

      {/* Right: Sound & Stats */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`px-2.5 py-1 rounded border text-[11px] transition-all flex items-center gap-1.5 font-bold ${
            soundEnabled
              ? 'bg-terminal-card border-terminal-green/40 text-terminal-green hover:bg-terminal-hover'
              : 'bg-terminal-card border-terminal-border text-terminal-muted hover:text-white'
          }`}
          title="Toggle Audio Alert Ping"
          type="button"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>{soundEnabled ? 'SOUND ON' : 'MUTED'}</span>
        </button>

        <div className="text-right text-xs hidden sm:block">
          <div className="text-white font-bold leading-tight">{trackedCount}</div>
          <div className="text-terminal-muted text-[9px] uppercase tracking-wider">Tracked Pairs</div>
        </div>
      </div>
    </header>
  );
}
