import React from 'react';
import { MagnifyingGlass, Lightning } from '@phosphor-icons/react';
import ExchangeLogo from './ExchangeLogo';

const EXCHANGES = ['all', 'hyperliquid', 'binance', 'bybit'];
const LABEL = { all: 'All', hyperliquid: 'Hyperliquid', binance: 'Binance', bybit: 'Bybit' };

const selectCls =
  'h-9 rounded-full bg-[#101114] border border-white/[0.07] text-[12px] text-snow/90 px-3.5 outline-none focus:border-mint/40 cursor-pointer hover:border-white/15 transition-colors';

export default function FilterBar({ filters, setFilters }) {
  const update = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="cw-seg" role="tablist" aria-label="Exchange">
        {EXCHANGES.map((ex) => (
          <button
            key={ex}
            role="tab"
            aria-selected={filters.exchange === ex}
            data-active={filters.exchange === ex}
            onClick={() => update('exchange', ex)}
            className="inline-flex items-center gap-1.5"
          >
            {ex !== 'all' && <ExchangeLogo exchange={ex} className="w-4 h-4" rounded="rounded-[4px]" />}
            {LABEL[ex]}
          </button>
        ))}
      </div>

      <select value={filters.minVolume} onChange={(e) => update('minVolume', Number(e.target.value))} className={selectCls} aria-label="Minimum 24h volume">
        <option value={0}>Vol: any</option>
        <option value={5000000}>Vol ≥ $5M</option>
        <option value={10000000}>Vol ≥ $10M</option>
        <option value={25000000}>Vol ≥ $25M</option>
      </select>

      <select value={filters.signal || 'ALL'} onChange={(e) => update('signal', e.target.value)} className={selectCls} aria-label="Signal status">
        <option value="ALL">Signal: all</option>
        <option value="PUMP DETECTED">Pump detected</option>
        <option value="DUMP DETECTED">Dump detected</option>
        <option value="BREAKOUT CONFIRMED">Breakout confirmed</option>
        <option value="MOMENTUM BUILDING">Momentum building</option>
        <option value="SQUEEZE ALERT">Squeeze alert</option>
        <option value="CONSOLIDATION">Consolidation</option>
      </select>

      <select value={filters.flow} onChange={(e) => update('flow', e.target.value)} className={selectCls} aria-label="Flow regime">
        <option value="ALL">Flow: all</option>
        <option value="LONG_BUILDUP">Long buildup</option>
        <option value="SHORT_SQUEEZE">Short squeeze</option>
        <option value="SHORT_BUILDUP">Short buildup</option>
        <option value="LONG_LIQUIDATION">Long liquidation</option>
      </select>

      <button
        onClick={() => update('decoupledOnly', !filters.decoupledOnly)}
        aria-pressed={filters.decoupledOnly}
        className={`h-9 inline-flex items-center gap-1.5 px-3.5 rounded-full border text-[12px] transition-colors ${
          filters.decoupledOnly
            ? 'border-terminal-yellow/40 bg-terminal-yellow/[0.07] text-terminal-yellow'
            : 'border-white/[0.07] bg-[#101114] text-fog hover:text-snow'
        }`}
      >
        <Lightning weight="fill" className="w-3.5 h-3.5" />
        BTC-decoupled
      </button>

      <label className="relative ml-auto min-w-[200px] flex-1 sm:flex-none">
        <MagnifyingGlass weight="bold" className="w-4 h-4 text-fog-2 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search symbol"
          value={filters.search}
          onChange={(e) => update('search', e.target.value.toUpperCase())}
          className="cw-input !rounded-full !py-2 pl-9 uppercase placeholder:normal-case placeholder:text-fog-2"
          aria-label="Search symbol"
        />
      </label>
    </div>
  );
}
