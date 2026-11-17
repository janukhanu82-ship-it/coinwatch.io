import React from 'react';
import { Search, Filter, Zap, SlidersHorizontal } from 'lucide-react';

export default function FilterBar({ filters, setFilters, totalMatching }) {
  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-terminal-card border-b border-terminal-border px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
      {/* Exchange Pills */}
      <div className="flex items-center gap-1.5 bg-terminal-dark p-1 rounded-lg border border-terminal-border">
        {[
          { id: 'all', label: 'ALL EXCHANGES' },
          { id: 'hyperliquid', label: '🟢 HYPERLIQUID', color: 'text-exchange-hl' },
          { id: 'binance', label: '🟡 BINANCE', color: 'text-exchange-binance' },
          { id: 'bybit', label: '🟠 BYBIT', color: 'text-exchange-bybit' },
        ].map(ex => (
          <button
            key={ex.id}
            onClick={() => updateFilter('exchange', ex.id)}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              filters.exchange === ex.id
                ? 'bg-terminal-card text-white shadow-sm border border-terminal-border'
                : 'text-terminal-muted hover:text-white'
            }`}
          >
            <span className={ex.color || ''}>{ex.label}</span>
          </button>
        ))}
      </div>

      {/* Center Group: Flow & Min Volume */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Min 24h Volume */}
        <div className="flex items-center gap-1 bg-terminal-dark px-2.5 py-1.5 rounded-lg border border-terminal-border">
          <span className="text-terminal-muted mr-1">MIN VOL:</span>
          {[0, 5000000, 10000000, 25000000].map(vol => (
            <button
              key={vol}
              onClick={() => updateFilter('minVolume', vol)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                filters.minVolume === vol
                  ? 'bg-terminal-cyan/20 text-terminal-cyan border border-terminal-cyan/40'
                  : 'text-terminal-muted hover:text-white'
              }`}
            >
              {vol === 0 ? 'ALL' : `$${vol / 1000000}M`}
            </button>
          ))}
        </div>

        {/* Flow Quadrant */}
        <select
          value={filters.flow}
          onChange={(e) => updateFilter('flow', e.target.value)}
          className="bg-terminal-dark border border-terminal-border text-terminal-text rounded-lg px-3 py-1.5 outline-none focus:border-terminal-cyan cursor-pointer"
        >
          <option value="ALL">FLOW: ALL REGIMES</option>
          <option value="LONG_BUILDUP">🟢 LONG BUILDUP (Price↑ OI↑)</option>
          <option value="SHORT_SQUEEZE">⚠️ SHORT SQUEEZE (Price↑ OI↓)</option>
          <option value="SHORT_BUILDUP">🔴 SHORT BUILDUP (Price↓ OI↑)</option>
          <option value="LONG_LIQUIDATION">💥 LONG LIQUIDATION (Price↓ OI↓)</option>
        </select>

        {/* Decoupled Only Toggle */}
        <button
          onClick={() => updateFilter('decoupledOnly', !filters.decoupledOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
            filters.decoupledOnly
              ? 'bg-terminal-yellow/20 text-terminal-yellow border-terminal-yellow/50'
              : 'bg-terminal-dark border-terminal-border text-terminal-muted hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>DECOUPLED (BTC INDEPENDENT)</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative min-w-[200px]">
        <Search className="w-3.5 h-3.5 text-terminal-muted absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Search Symbol (e.g. SOL, BTC)..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value.toUpperCase())}
          className="w-full bg-terminal-dark border border-terminal-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-terminal-muted outline-none focus:border-terminal-cyan uppercase font-mono"
        />
      </div>
    </div>
  );
}
