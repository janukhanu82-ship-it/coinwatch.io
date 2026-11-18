import React from 'react';
import { CaretRight, TrendUp, TrendDown, Fire } from '@phosphor-icons/react';
import CoinIcon, { baseAsset } from './CoinIcon';
import MoverFX from './MoverFX';
import { Metric, FlashValue } from './ui';
import { exchangeName } from './ExchangeLogo';

export default function SignalCard({ signal, view = 'live', hot = false, selected = false, onSelect, onOpenPOA, index = 0 }) {
  const isPump = signal.type === 'PUMP' || (signal.type == null && signal.change_pct >= 0);
  const base = baseAsset(signal.symbol || signal.pair);
  const change = Number(signal.change_pct || 0);
  const DirIcon = isPump ? TrendUp : TrendDown;

  return (
    <article
      onClick={() => onSelect?.(signal)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(signal);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${base} ${isPump ? 'pump' : 'dump'} ${change}% on ${exchangeName(signal.exchange)}`}
      style={{ animationDelay: `${Math.min(index, 10) * 25}ms` }}
      className={`cw-card cw-card-sm cw-card-in cw-press group p-4 cursor-pointer ${
        hot ? 'cw-glow !border-white/[0.1]' : selected ? '!border-mint/35' : 'cw-hover'
      }`}
    >
      {false && <MoverFX direction={isPump ? 'up' : 'down'} />}

      <div className="relative">
        <div className="flex items-start gap-3">
          <span className="relative shrink-0">
            {hot && <span className={`cw-ring absolute inset-0 rounded-full ${isPump ? 'bg-mint/25' : 'bg-coral/25'}`} />}
            <CoinIcon symbol={signal.symbol} coin={signal.coin} exchange={signal.exchange} isPump={isPump} className="relative w-9 h-9" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[16px] font-semibold text-snow truncate">{base}</span>
              <span className="text-[11px] text-fog-2">/USDT</span>
              {signal.timestamp && <span className="cw-chip ml-1">{signal.timestamp}</span>}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] min-w-0">
              {view === 'live' ? (
                <span className={`inline-flex items-center gap-1 font-medium ${isPump ? 'text-mint' : 'text-coral'}`}>
                  <DirIcon weight="bold" className="w-3 h-3" />
                  Live signal
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-fog-2 min-w-0 truncate">Saved · {signal.candle_at}</span>
              )}
              {hot && (
                <span className="shrink-0 inline-flex items-center gap-1 px-1.5 rounded-full bg-white/[0.06] text-snow/90 whitespace-nowrap">
                  <Fire weight="fill" className={`w-3 h-3 ${isPump ? 'text-mint' : 'text-coral'}`} />
                  Top mover
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <span
              className={`px-2 py-px rounded-full text-[10px] font-semibold ${
                isPump ? 'text-mint bg-mint/10' : 'text-coral bg-coral/10'
              }`}
            >
              {isPump ? 'Pump' : 'Dump'}
            </span>
            <FlashValue
              value={`${change >= 0 ? '+' : ''}${change.toFixed(2)}%`}
              direction={isPump ? 'up' : 'down'}
              className={`cw-num text-[18px] font-semibold leading-none ${isPump ? 'text-mint' : 'text-coral'}`}
            />
          </div>
        </div>

        <div className="my-3 h-px bg-white/[0.06]" />

        <div className="grid grid-cols-4 gap-2">
          <Metric label="Open" value={signal.open} />
          <Metric label="High" value={signal.high} tone="up" />
          <Metric label="Low" value={signal.low} tone="down" />
          <Metric label="Close" value={signal.close} tone={isPump ? 'up' : 'down'} />
        </div>

        <div className="mt-3 flex items-end gap-2">
          <div className="grid grid-cols-[0.8fr_1fr_1.6fr] gap-2 flex-1 min-w-0">
            <Metric label="Amplitude" value={`${signal.amplitude}%`} tone="accent" />
            <Metric label="Volume" value={signal.volume} />
            <Metric label="Came at" value={signal.candle_at} tone="muted" />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenPOA?.(signal);
            }}
            title="Create Plan of Attack"
            aria-label={`Create Plan of Attack for ${base}`}
            className="w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-fog hover:text-snow hover:bg-white/[0.06] transition-colors"
          >
            <CaretRight weight="bold" className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
          </button>
        </div>
      </div>
    </article>
  );
}
