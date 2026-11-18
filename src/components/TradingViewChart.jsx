import React, { useEffect, useState } from 'react';
import { X, Target, Zap, ExternalLink, BarChart2 } from 'lucide-react';
import CoinIcon from './CoinIcon';
import ExchangeLogo, { exchangeName } from './ExchangeLogo';

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
    <div className="w-full h-full bg-ink flex flex-col select-none overflow-hidden">
      {/* Top Header */}
      <div className="relative isolate p-4 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <CoinIcon symbol={baseCoin} exchange={coinExchange} className="w-9 h-9" />

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-medium text-snow tracking-tight">{displayPair}</h2>
              <span className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full border border-white/10 text-[10px] font-medium text-snow/80">
                <ExchangeLogo exchange={coinExchange} className="w-4 h-4" rounded="rounded-full" />
                {exchangeName(coinExchange)} perp
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="cw-num text-[14px] text-mint">
                ${selectedCoin.price ? (selectedCoin.price < 1 ? selectedCoin.price.toFixed(6) : selectedCoin.price.toLocaleString(undefined, { minimumFractionDigits: 2 })) : '0.00'}
              </span>
              <span className="cw-num text-[10px] text-fog-2">{activeTvSymbol}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenPOA(selectedCoin)}
            className="cw-btn-primary !py-2 !px-4"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>POA</span>
          </button>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-fog hover:text-snow hover:border-white/20 transition-colors"
            title="Dock / Close chart"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-bar: Intervals + Multi-Exchange Fallback Sources */}
      <div className="px-4 py-2.5 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          <span className="text-[11px] text-fog-2 mr-1">Interval</span>
          {intervals.map((intv) => (
            <button
              key={intv}
              onClick={() => setInterval(intv)}
              className={`cw-num px-2.5 py-1 rounded-full text-[11px] transition-all ${
                interval === intv
                  ? 'bg-ink-4 text-snow ring-1 ring-white/10'
                  : 'text-fog hover:text-snow'
              }`}
            >
              {intv}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-[11px] text-fog-2 mr-1">Feed</span>
          {['bybit', 'binance', 'okx', 'spot'].map((ex) => (
            <button
              key={ex}
              onClick={() => setTvExchange(ex)}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium uppercase transition-all ${
                tvExchange === ex
                  ? 'bg-mint/12 text-mint ring-1 ring-mint/35'
                  : 'text-fog hover:text-snow'
              }`}
            >
              <ExchangeLogo exchange={ex === 'spot' ? 'binance' : ex} className="w-3.5 h-3.5" rounded="rounded-[4px]" />
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Official TradingView Pro Embed Area */}
      <div className="flex-1 w-full bg-ink relative overflow-hidden">
        <iframe
          key={`${activeTvSymbol}-${interval}`}
          src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(activeTvSymbol)}&interval=${tvIntervalMap[interval] || '1'}&theme=dark&style=1&timezone=Etc%2FUTC&studies=%5B%22STD%3BVolume%22%2C%22STD%3BRSI%22%5D&hide_side_toolbar=0&allow_symbol_change=1&save_image=0`}
          className="w-full h-full border-0"
          title="TradingView Pro Chart"
        />
      </div>

      {/* Bottom POA Parameters Card */}
      {poa && (
        <div className="p-4 border-t border-white/[0.06] bg-ink-2 space-y-3 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-snow/85 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-mint" />
              <span>PLAN OF ATTACK TARGETS ({poa.timeframe?.toUpperCase() || interval.toUpperCase()})</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-mint/10 border border-mint/30 text-mint font-bold text-[10px]">
                {poa.risk_reward_ratio ? `1:${poa.risk_reward_ratio}R TARGET` : 'HIGH RR'}
              </span>
              <span className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${
                poa.side === 'LONG' ? 'bg-mint/12 text-mint border border-mint/35' : 'bg-coral/12 text-coral border border-coral/35'
              }`}>
                {poa.side} BIAS
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-ink border border-white/[0.05]">
              <div className="text-[9px] text-fog-2 tracking-[0.06em] uppercase">ENTRY ZONE</div>
              <div className="text-terminal-cyan cw-num text-xs truncate mt-1">
                ${poa.entry_zone_low} - ${poa.entry_zone_high}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-ink border border-white/[0.05]">
              <div className="text-[9px] text-fog-2 tracking-[0.06em] uppercase">STOP LOSS (INV)</div>
              <div className="text-coral cw-num text-xs truncate mt-1">
                ${poa.stop_loss}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-ink border border-white/[0.05]">
              <div className="text-[9px] text-fog-2 tracking-[0.06em] uppercase">TP 1 TARGET</div>
              <div className="text-mint cw-num text-xs truncate mt-1">
                ${poa.tp1}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-ink border border-white/[0.05]">
              <div className="text-[9px] text-fog-2 tracking-[0.06em] uppercase">TP 2 (HIGH RR)</div>
              <div className="text-mint cw-num text-xs truncate mt-1">
                ${poa.tp2}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
