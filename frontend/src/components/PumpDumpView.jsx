import React, { useState } from 'react';
import { ChevronRight, Radio, Shield, Lock, Activity, ArrowUpRight, ArrowDownRight, Zap, Target, TrendingUp } from 'lucide-react';
import CoinIcon from './CoinIcon';

export default function PumpDumpView({ 
  sensitivity, 
  setSensitivity, 
  timeframe = '1m',
  setTimeframe,
  stats, 
  liveSignals, 
  historySignals, 
  selectedCoin,
  onSelectCoin, 
  onOpenPOA 
}) {
  const [activeSubTab, setActiveSubTab] = useState('live'); // 'live' | 'history'
  const [poaMode, setPoaMode] = useState('poa1'); // 'poa1' | 'poa2'

  const presets = [0.5, 1, 1.5, 2, 3, 5, 10, 15, 25];

  const timeframes = [
    { id: '1m', label: '1M', title: 'SCALP', rr: '1:2R', desc: 'Fast Scalping (1.5R - 2R)' },
    { id: '5m', label: '5M', title: 'MOMENTUM', rr: '1:3R', desc: 'Momentum Waves (2.5R - 3.5R)' },
    { id: '15m', label: '15M', title: 'INTRADAY', rr: '1:4R', desc: 'Day Trade Trend (3.5R - 4.5R)' },
    { id: '1h', label: '1H', title: 'HIGH RR SWING', rr: '1:6R', desc: 'Institutional High RR (5R - 7R)' },
    { id: '4h', label: '4H', title: 'MACRO TREND', rr: '1:8R+', desc: 'Macro Trend Continuation (8R+)' },
  ];

  // Current display signal list
  const currentSignals = activeSubTab === 'live' ? liveSignals : historySignals;

  return (
    <div className="space-y-6 font-mono select-none">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase mb-1">
            LIVE SCANNER • COINWACH.IO
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-sans">
            Pump / Dump Intelligence
          </h1>
          <p className="text-xs text-[#8E9BAE] mt-1">
            Confirmed institutional breakout & breakdown signals across 800+ contracts.
          </p>
        </div>

        {/* Top Right: Mode Toggle + Sensitivity Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#0C101A] p-1 rounded-xl border border-[#1A2234]">
            <button
              onClick={() => setPoaMode('poa1')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                poaMode === 'poa1' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm' 
                  : 'text-[#8E9BAE] hover:text-white'
              }`}
            >
              POA 1
            </button>
            <button
              onClick={() => setPoaMode('poa2')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                poaMode === 'poa2' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm' 
                  : 'text-[#5A6882] hover:text-[#8E9BAE]'
              }`}
            >
              <span>POA 2</span>
              <Lock className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{sensitivity}% • {timeframe.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Multi-Timeframe High RR Selector Bar */}
      <div className="bg-[#0C101A] border border-[#1A2234] rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-[#8E9BAE] tracking-wider uppercase">
              SCANNER TIMEFRAME & RISK:REWARD TARGET
            </span>
          </div>
          <span className="text-xs text-[#5A6882]">
            Higher timeframes deliver greater Risk:Reward setups
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {timeframes.map((tf) => {
            const isSelected = timeframe === tf.id;
            return (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                  isSelected
                    ? 'bg-emerald-500/15 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'bg-[#101522] border-[#1A2234] text-[#8E9BAE] hover:border-[#2A354C] hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-base font-extrabold ${isSelected ? 'text-white' : 'text-[#8E9BAE]'}`}>
                    {tf.label}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    isSelected ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' : 'bg-[#151B28] text-[#5A6882]'
                  }`}>
                    {tf.rr}
                  </span>
                </div>
                <div className={`text-[11px] font-bold ${isSelected ? 'text-emerald-400' : 'text-[#5A6882]'}`}>
                  {tf.title}
                </div>
                <div className="text-[10px] text-[#5A6882] mt-0.5 truncate">
                  {tf.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sensitivity Slider Card */}
      <div className="bg-[#0C101A] border border-[#1A2234] rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#8E9BAE] tracking-wider uppercase">
            MINIMUM THRESHOLD SENSITIVITY
          </span>
          <span className="text-2xl font-extrabold text-emerald-400 font-mono tracking-tight">
            {sensitivity}%
          </span>
        </div>

        {/* Slider */}
        <div className="relative py-1">
          <input
            type="range"
            min="0.5"
            max="25"
            step="0.5"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#151B28] rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>

        {/* Preset Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {presets.map((val) => {
            const isSelected = sensitivity === val;
            return (
              <button
                key={val}
                onClick={() => setSensitivity(val)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                    : 'bg-[#101522] border border-[#1A2234] text-[#8E9BAE] hover:text-white hover:border-[#2A354C]'
                }`}
              >
                {val}%
              </button>
            );
          })}
        </div>
      </div>

      {/* 6 Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Monitored */}
        <div className="bg-[#0C101A] border border-[#1A2234] rounded-xl p-3.5 space-y-1">
          <div className="text-[10px] text-[#5A6882] font-semibold uppercase tracking-wider">MONITORED</div>
          <div className="text-xl font-bold text-white tracking-tight">{stats.monitored || 821}</div>
          <div className="text-[10px] text-[#5A6882]">Active perp contracts</div>
        </div>

        {/* Stream Batches */}
        <div className="bg-[#0C101A] border border-[#1A2234] rounded-xl p-3.5 space-y-1">
          <div className="text-[10px] text-[#5A6882] font-semibold uppercase tracking-wider">STREAM BATCHES</div>
          <div className="text-xl font-bold text-white tracking-tight">{stats.stream_batches || '5 / 5'}</div>
          <div className="text-[10px] text-[#5A6882]">HL #1 • Binance • Bybit</div>
        </div>

        {/* Last Event */}
        <div className="bg-[#0C101A] border border-[#1A2234] rounded-xl p-3.5 space-y-1">
          <div className="text-[10px] text-[#5A6882] font-semibold uppercase tracking-wider">LAST EVENT</div>
          <div className="text-xl font-bold text-white tracking-tight">{stats.last_event || 'Just now'}</div>
          <div className="text-[10px] text-[#5A6882]">Tick synchronized</div>
        </div>

        {/* Crossing Now */}
        <div className="bg-[#0C101A] border border-[#1A2234] rounded-xl p-3.5 space-y-1">
          <div className="text-[10px] text-[#5A6882] font-semibold uppercase tracking-wider">CROSSING NOW</div>
          <div className="text-xl font-bold text-emerald-400 tracking-tight">{stats.crossing_now || liveSignals.length}</div>
          <div className="text-[10px] text-[#5A6882]">At or above threshold</div>
        </div>

        {/* Pumps */}
        <div className="bg-[#0C101A] border border-[#1A2234] rounded-xl p-3.5 space-y-1">
          <div className="text-[10px] text-[#5A6882] font-semibold uppercase tracking-wider">PUMPS (LONG)</div>
          <div className="text-xl font-bold text-emerald-400 tracking-tight">{stats.pumps || 0}</div>
          <div className="text-[10px] text-[#5A6882]">Confirmed bullish moves</div>
        </div>

        {/* Dumps */}
        <div className="bg-[#0C101A] border border-[#1A2234] rounded-xl p-3.5 space-y-1">
          <div className="text-[10px] text-[#5A6882] font-semibold uppercase tracking-wider">DUMPS (SHORT)</div>
          <div className="text-xl font-bold text-rose-400 tracking-tight">{stats.dumps || 0}</div>
          <div className="text-[10px] text-[#5A6882]">Confirmed bearish moves</div>
        </div>
      </div>

      {/* Signal Stream Panel */}
      <div className="space-y-3">
        {/* Sub-tabs: Live (N) & History (M) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('live')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'live'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-[#0C101A] border border-[#1A2234] text-[#8E9BAE] hover:text-white'
            }`}
          >
            Live {liveSignals.length}
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'history'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-[#0C101A] border border-[#1A2234] text-[#8E9BAE] hover:text-white'
            }`}
          >
            History {historySignals.length}
          </button>
        </div>

        {/* Signals List / Cards */}
        {currentSignals.length === 0 ? (
          <div className="bg-[#0C101A] border border-[#1A2234] rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto animate-pulse">
              ⚡
            </div>
            <div className="text-white font-bold text-sm tracking-wide">
              {activeSubTab === 'live' ? `SCANNING FOR CONFIRMED ${timeframe.toUpperCase()} MOVES...` : `NO PAST SIGNALS IN HISTORY FOR ${timeframe.toUpperCase()}`}
            </div>
            <p className="text-xs text-[#5A6882] max-w-md mx-auto">
              {activeSubTab === 'live'
                ? `Listening on Hyperliquid, Binance, and Bybit for confirmed moves crossing ${sensitivity}% on ${timeframe.toUpperCase()} candles.`
                : `Past triggers on ${timeframe.toUpperCase()} will be logged here as market candles conclude.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentSignals.map((signal) => {
              const isPump = signal.type === 'PUMP';
              const isCardSelected = selectedCoin && (selectedCoin.symbol === signal.symbol);

              return (
                <div
                  key={signal.id}
                  onClick={() => onSelectCoin(signal)}
                  className={`group relative rounded-2xl transition-all p-4 cursor-pointer overflow-hidden ${
                    isCardSelected
                      ? 'border-2 border-emerald-400 bg-gradient-to-r from-emerald-950/40 via-[#0C121E] to-emerald-950/40 shadow-[0_0_30px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/50'
                      : 'border border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-[#07090E] to-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.08)] hover:border-emerald-400 hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]'
                  }`}
                  style={{
                    backgroundImage: `radial-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px)`,
                    backgroundSize: '16px 16px'
                  }}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Coin Icon, Pair, Time, Confirmed Tag */}
                    <div className="flex items-center gap-3">
                      <CoinIcon 
                        symbol={signal.symbol} 
                        className="w-10 h-10" 
                        isPump={isPump} 
                      />

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-base tracking-wide font-sans">
                            {signal.pair}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#101522] border border-[#1A2234] text-[10px] text-[#8E9BAE]">
                            {signal.timestamp}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                            {signal.timeframe?.toUpperCase() || timeframe.toUpperCase()}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold text-emerald-400 flex-wrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>{signal.signal_label || (isPump ? 'CONFIRMED LONG' : 'CONFIRMED SHORT')}</span>
                          <span className="text-[#5A6882]">• {signal.exchange?.toUpperCase()}</span>
                          {signal.rr_ratio && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9px] font-bold">
                              RR {signal.rr_ratio}
                            </span>
                          )}
                          {signal.vol_spike && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[9px]">
                              {signal.vol_spike}x VOL
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Data Columns */}
                    <div className="grid grid-cols-3 sm:grid-cols-7 gap-3 text-[11px] font-mono border-t md:border-t-0 md:border-l border-[#1A2234] pt-3 md:pt-0 md:pl-5 flex-1">
                      <div>
                        <div className="text-[10px] text-[#5A6882]">OPEN</div>
                        <div className="text-white font-semibold">{signal.open}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#5A6882]">HIGH</div>
                        <div className="text-emerald-400 font-semibold">{signal.high}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#5A6882]">LOW</div>
                        <div className="text-rose-400 font-semibold">{signal.low}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#5A6882]">CLOSE</div>
                        <div className="text-white font-semibold">{signal.close}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#5A6882]">AMPLITUDE</div>
                        <div className={`font-bold ${signal.amplitude >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {signal.amplitude}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#5A6882]">VOLUME</div>
                        <div className="text-white font-semibold">{signal.volume}</div>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <div className="text-[10px] text-[#5A6882]">CANDLE AT</div>
                        <div className="text-[#8E9BAE] truncate text-[10px]">{signal.candle_at}</div>
                      </div>
                    </div>

                    {/* Right: Direction Pill + Click to Chart */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1 shadow-md ${
                        isPump 
                          ? 'bg-emerald-500 text-black shadow-emerald-500/20' 
                          : 'bg-rose-500 text-white shadow-rose-500/20'
                      }`}>
                        {isPump ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        <span>{signal.direction || (isPump ? 'LONG' : 'SHORT')} {signal.change_pct >= 0 ? '+' : ''}{signal.change_pct}%</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPOA(signal);
                        }}
                        className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        title="Open Plan of Attack"
                      >
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
