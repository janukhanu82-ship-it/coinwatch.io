import React, { useEffect, useState } from 'react';
import { X, Target, Zap, ExternalLink, BarChart2 } from 'lucide-react';
import CoinIcon from './CoinIcon';

export default function TradingViewChart({ selectedCoin, onClose, onOpenPOA }) {
  const [interval, setInterval] = useState('1m');
  const [chartData, setChartData] = useState(null);

  // Extract clean base asset: e.g. "MNTUSDT" -> "MNT", "MNT" -> "MNT", "BTCUSDT" -> "BTC"
  const rawSymbol = (selectedCoin?.symbol || 'BTCUSDT').toUpperCase();
  const baseCoin = rawSymbol
    .replace(/USDT$/i, '')
    .replace(/-PERP$/i, '')
    .replace(/\/USDT$/i, '')
    .trim();

  const coinExchange = (selectedCoin?.exchange || 'bybit').toLowerCase();

  // For Hyperliquid coins, Bybit has almost all listings (MNT, HYPE, PURR, etc.)
  const defaultSource = coinExchange === 'hyperliquid' ? 'bybit' : (coinExchange === 'binance' ? 'binance' : 'bybit');
  const [tvExchange, setTvExchange] = useState(defaultSource);

  // Keep source synced when coin changes
  useEffect(() => {
    if (selectedCoin) {
      const ex = (selectedCoin.exchange || 'bybit').toLowerCase();
      setTvExchange(ex === 'hyperliquid' ? 'bybit' : (ex === 'binance' ? 'binance' : 'bybit'));
    }
  }, [selectedCoin]);

  // Fetch POA levels from backend
  useEffect(() => {
    if (!selectedCoin) return;
    fetch(`/api/chart/${selectedCoin.exchange}/${selectedCoin.symbol}/candles?interval=${interval}`)
      .then(r => r.json())
      .then(d => {
        if (d) setChartData(d);
      })
      .catch(() => {});
  }, [selectedCoin, interval]);

  if (!selectedCoin) return null;

  const intervals = ['1m', '3m', '5m', '15m', '1h', '4h', '1D'];
  const tvIntervalMap = {
    '1m': '1',
    '3m': '3',
    '5m': '5',
    '15m': '15',
    '1h': '60',
    '4h': '240',
    '1D': 'D'
  };

  // Build accurate TradingView symbol with mandatory USDT pair
  const getTradingViewSymbol = (ex, base) => {
    const sym = `${base.toUpperCase()}USDT`;
    if (ex === 'bybit') {
      return `BYBIT:${sym}.P`;
    }
    if (ex === 'binance') {
      return `BINANCE:${sym}.P`;
    }
    if (ex === 'okx') {
      return `OKX:${sym}.P`;
    }
    if (ex === 'spot') {
      return `BINANCE:${sym}`;
    }
    return `BYBIT:${sym}.P`;
  };

  const activeTvSymbol = getTradingViewSymbol(tvExchange, baseCoin);
  const displayPair = selectedCoin?.pair || `${baseCoin} / USDT`;
  const poa = chartData?.poa_levels;

  return (
    <div className="w-full h-full bg-[#07090E] flex flex-col font-mono select-none overflow-hidden">
      {/* Top Header */}
      <div className="p-3.5 border-b border-[#1A2234] bg-[#0C101A] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <CoinIcon symbol={baseCoin} className="w-9 h-9" />

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-wide font-sans">{displayPair}</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                coinExchange === 'hyperliquid' ? 'bg-[#00F5A0]/15 text-[#00F5A0] border border-[#00F5A0]/30' :
                coinExchange === 'binance' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
              }`}>
                {coinExchange.toUpperCase()} PERP
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-extrabold text-emerald-400 font-mono">
                ${selectedCoin.price ? (selectedCoin.price < 1 ? selectedCoin.price.toFixed(6) : selectedCoin.price.toLocaleString(undefined, { minimumFractionDigits: 2 })) : '0.00'}
              </span>
              <span className="text-[10px] text-[#5A6882]">• {activeTvSymbol}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenPOA(selectedCoin)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs font-bold transition-all shadow-sm"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>POA</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#8E9BAE] hover:text-white hover:bg-[#1A2234] transition-colors"
            title="Dock / Close chart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sub-bar: Intervals + Multi-Exchange Fallback Sources */}
      <div className="px-3 py-2 bg-[#0A0D15] border-b border-[#1A2234] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          <span className="text-[10px] font-bold text-[#5A6882] uppercase tracking-wider mr-1">TF:</span>
          {intervals.map((intv) => (
            <button
              key={intv}
              onClick={() => setInterval(intv)}
              className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                interval === intv
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-sm'
                  : 'bg-[#101522] border border-[#1A2234] text-[#8E9BAE] hover:text-white'
              }`}
            >
              {intv}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-[#5A6882] uppercase font-semibold">FEED:</span>
          {['bybit', 'binance', 'okx', 'spot'].map((ex) => (
            <button
              key={ex}
              onClick={() => setTvExchange(ex)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                tvExchange === ex
                  ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/50'
                  : 'bg-[#101522] text-[#8E9BAE] hover:text-white border border-[#1A2234]'
              }`}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Official TradingView Pro Embed Area */}
      <div className="flex-1 w-full bg-[#07090E] relative overflow-hidden">
        <iframe
          key={`${activeTvSymbol}-${interval}`}
          src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(activeTvSymbol)}&interval=${tvIntervalMap[interval] || '1'}&theme=dark&style=1&timezone=Etc%2FUTC&studies=%5B%22STD%3BVolume%22%2C%22STD%3BRSI%22%5D&hide_side_toolbar=0&allow_symbol_change=1&save_image=0`}
          className="w-full h-full border-0"
          title="TradingView Pro Chart"
        />
      </div>

      {/* Bottom POA Parameters Card */}
      {poa && (
        <div className="p-3.5 border-t border-[#1A2234] bg-[#0C101A] space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8E9BAE] flex items-center gap-1.5 font-bold">
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              <span>PLAN OF ATTACK TARGETS ({poa.timeframe?.toUpperCase() || interval.toUpperCase()})</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
                {poa.risk_reward_ratio ? `1:${poa.risk_reward_ratio}R TARGET` : 'HIGH RR'}
              </span>
              <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                poa.side === 'LONG' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}>
                {poa.side} BIAS
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-[#101522] border border-[#1A2234]">
              <div className="text-[9px] text-[#5A6882] font-semibold uppercase">ENTRY ZONE</div>
              <div className="text-cyan-400 font-bold text-xs truncate mt-0.5">
                ${poa.entry_zone_low} - ${poa.entry_zone_high}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-[#101522] border border-[#1A2234]">
              <div className="text-[9px] text-[#5A6882] font-semibold uppercase">STOP LOSS (INV)</div>
              <div className="text-rose-400 font-bold text-xs truncate mt-0.5">
                ${poa.stop_loss}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-[#101522] border border-[#1A2234]">
              <div className="text-[9px] text-[#5A6882] font-semibold uppercase">TP 1 TARGET</div>
              <div className="text-emerald-400 font-bold text-xs truncate mt-0.5">
                ${poa.tp1}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-[#101522] border border-[#1A2234]">
              <div className="text-[9px] text-[#5A6882] font-semibold uppercase">TP 2 (HIGH RR)</div>
              <div className="text-emerald-300 font-bold text-xs truncate mt-0.5">
                ${poa.tp2}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
