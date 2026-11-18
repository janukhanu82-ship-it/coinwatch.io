import React, { useMemo, useState } from 'react';
import { Lock, MagnifyingGlass, Trash, Broadcast, Stack, Waveform, Clock, Crosshair, TrendUp, TrendDown, ChartLineUp } from '@phosphor-icons/react';
import SignalCard from './SignalCard';
import { PageHeader, StatCard, Segmented, LivePill } from './ui';

const PRESETS = [0.5, 1, 1.5, 2, 3, 5, 10, 15, 25];

const TIMEFRAMES = [
  { id: '1m', label: '1M', rr: '1:2R', title: 'Scalp' },
  { id: '5m', label: '5M', rr: '1:3R', title: 'Momentum' },
  { id: '15m', label: '15M', rr: '1:4R', title: 'Intraday' },
  { id: '1h', label: '1H', rr: '1:6R', title: 'Swing' },
  { id: '4h', label: '4H', rr: '1:8R+', title: 'Macro' },
];

/** The strongest absolute mover in a list. */
function topMoverId(list) {
  let best = null;
  for (const s of list) {
    if (!best || Math.abs(s.change_pct || 0) > Math.abs(best.change_pct || 0)) best = s;
  }
  return best?.id ?? null;
}

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
  onOpenPOA,
  isConnected,
  historyClearedAt = 0,
  onClearHistory,
  sourceLabel,
}) {
  const [tab, setTab] = useState('live');
  const [poaMode, setPoaMode] = useState('poa1');
  const [query, setQuery] = useState('');
  const [timeFrom, setTimeFrom] = useState('');

  const visibleHistory = useMemo(
    () => historySignals.filter((s) => !historyClearedAt || (s.raw_ts || 0) * 1000 > historyClearedAt),
    [historySignals, historyClearedAt],
  );

  const source = tab === 'live' ? liveSignals : visibleHistory;

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const fromMs = timeFrom ? new Date(timeFrom).getTime() : 0;
    return source.filter((s) => {
      if (q && !String(s.symbol || '').toUpperCase().includes(q)) return false;
      if (fromMs && (s.raw_ts || 0) * 1000 < fromMs) return false;
      return true;
    });
  }, [source, query, timeFrom]);

  const hotId = topMoverId(filtered);
  const tf = TIMEFRAMES.find((t) => t.id === timeframe) || TIMEFRAMES[0];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Live scanner"
        eyebrowIcon={ChartLineUp}
        title="Pump / Dump"
        description="Live market signals across all monitored contracts."
        actions={<LivePill isConnected={isConnected} label={sourceLabel} />}
      />

      <div className="flex justify-center">
        <Segmented
          value={poaMode}
          onChange={setPoaMode}
          options={[
            { value: 'poa1', label: 'POA 1' },
            {
              value: 'poa2',
              label: (
                <>
                  POA 2 <Lock weight="fill" className="w-3 h-3" />
                </>
              ),
            },
          ]}
        />
      </div>

      {/* Controls */}
      <section className="cw-panel cw-glow p-4 md:p-5 space-y-4">
        <div className="grid gap-4 @4xl:grid-cols-[180px_90px_1fr] items-center">
          <div className="text-[14px] font-medium text-snow">Sensitivity</div>
          <div className="cw-num text-[26px] font-semibold text-mint @4xl:text-right">{sensitivity.toFixed(1)}%</div>
          <div className="space-y-3 min-w-0">
            <input
              type="range"
              min="0.5"
              max="25"
              step="0.5"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              className="w-full h-1 cursor-pointer"
              aria-label="Sensitivity threshold"
            />
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((v) => (
                <button
                  key={v}
                  onClick={() => setSensitivity(v)}
                  className={`cw-num h-7 px-2.5 rounded-full border text-[11px] transition-colors ${
                    sensitivity === v
                      ? 'border-mint/45 bg-mint/10 text-mint'
                      : 'border-white/[0.08] text-fog hover:text-snow hover:border-white/20'
                  }`}
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="h-px bg-white/[0.05]" />
        <div className="grid gap-3 @4xl:grid-cols-[180px_90px_1fr] items-center">
          <div className="text-[14px] font-medium text-snow">Timeframe</div>
          <div className="cw-num text-[13px] text-fog @4xl:text-right">{tf.rr}</div>
          <div className="flex flex-wrap gap-1.5">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                className={`h-7 px-3 rounded-full border text-[11px] transition-colors inline-flex items-center gap-1.5 ${
                  timeframe === t.id
                    ? 'border-mint/45 bg-mint/10 text-mint'
                    : 'border-white/[0.08] text-fog hover:text-snow hover:border-white/20'
                }`}
              >
                <span className="cw-num font-medium">{t.label}</span>
                <span className="opacity-70">{t.title}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 @3xl:grid-cols-3 @6xl:grid-cols-6 gap-3">
        <StatCard icon={Stack} label="Monitored" value={stats.monitored ?? 0} caption="Monitored active markets" />
        <StatCard icon={Waveform} label="Stream batches" value={stats.stream_batches || '0 / 3'} caption="Live WebSocket feeds" />
        <StatCard icon={Clock} label="Last event" value={stats.last_event || '—'} caption="Most recent trigger" />
        <StatCard
          icon={Crosshair}
          label="Crossing now"
          value={stats.crossing_now ?? liveSignals.length}
          caption="At or above the threshold"
          highlight
        />
        <StatCard icon={TrendUp} label="Pumps" value={stats.pumps || 0} caption="Positive signals" tone="up" />
        <StatCard icon={TrendDown} label="Dumps" value={stats.dumps || 0} caption="Negative signals" tone="down" />
      </section>

      {/* Signals */}
      <section className="cw-panel p-3 md:p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'live', label: 'Live', badge: liveSignals.length },
              { value: 'history', label: 'History', badge: visibleHistory.length },
            ]}
          />
          {tab === 'history' && (
            <button
              onClick={onClearHistory}
              disabled={visibleHistory.length === 0}
              className="cw-btn !h-8 !text-[12px] disabled:opacity-40 disabled:pointer-events-none"
            >
              <Trash weight="duotone" className="w-4 h-4" />
              Clear history
            </button>
          )}
        </div>

        {tab === 'history' && (
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="relative flex-1 min-w-[220px]">
              <MagnifyingGlass weight="bold" className="w-4 h-4 text-fog-2 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by coin name (e.g. BTC or SOLUSDT)"
                className="cw-input !rounded-lg !py-2 pl-9 placeholder:text-fog-2"
                aria-label="Filter signals by coin name"
              />
            </label>
            <label className="flex items-center gap-2 cw-input !w-auto !rounded-lg !py-1.5 min-w-[250px]">
              <span className="text-[11px] text-fog-2 shrink-0">From</span>
              <input
                type="datetime-local"
                value={timeFrom}
                onChange={(e) => setTimeFrom(e.target.value)}
                className="bg-transparent outline-none text-[12px] text-snow/90 cw-num flex-1"
                aria-label="Show signals from this time"
              />
            </label>
            <span className="cw-num text-[11px] text-fog-2 ml-auto">
              {filtered.length} / {visibleHistory.length} signals
            </span>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="cw-disc mx-auto w-12 h-12 text-mint">
              <Broadcast weight="duotone" className="w-6 h-6" />
            </div>
            <div className="mt-4 text-[14px] font-medium text-snow">
              {tab === 'live'
                ? `Scanning for ${tf.label} moves above ${sensitivity}%`
                : source.length
                  ? 'No signals match these filters'
                  : 'History is empty'}
            </div>
            <p className="mt-1.5 text-[12px] text-fog-2 max-w-sm mx-auto">
              {tab === 'live'
                ? 'Streaming live from Hyperliquid, Binance and Bybit. New moves appear here the moment they cross your threshold.'
                : 'Finalized signals are saved here once their candle window closes.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 @3xl:grid-cols-2 @6xl:grid-cols-3 gap-3">
            {filtered.map((s, i) => (
              <SignalCard
                key={s.id ?? `${s.exchange}-${s.symbol}-${s.raw_ts}`}
                signal={s}
                index={i}
                view={tab}
                hot={hotId != null && s.id === hotId}
                selected={selectedCoin && selectedCoin.symbol === s.symbol && selectedCoin.exchange === s.exchange}
                onSelect={onSelectCoin}
                onOpenPOA={onOpenPOA}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
