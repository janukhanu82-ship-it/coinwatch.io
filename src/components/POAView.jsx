import React, { useEffect, useState } from 'react';
import { CaretRight, Lock, ArrowUpRight, ArrowDownRight, Clock, CheckCircle, Pulse, ShieldCheck, ClipboardText, Stack, Hourglass, Gauge, Warning, Lightning } from '@phosphor-icons/react';
import CoinIcon, { baseAsset } from './CoinIcon';
import { PageHeader, StatCard, Segmented, PanelTitle, Metric } from './ui';
import { exchangeName } from './ExchangeLogo';

const ACTIVITY_LABEL = {
  armed: 'Plan armed',
  draft: 'Draft saved',
  triggered: 'Marked triggered',
  closed: 'Closed in R',
};

function strengthOf(signal, sensitivity) {
  const s = Math.abs(Number(signal.change_pct) || 0) / Math.max(0.1, sensitivity * 2);
  return Math.min(100, s * 100);
}

function timeAgo(ts) {
  const d = Math.max(0, Date.now() - ts) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function POAView({
  onOpenNewPOA,
  historySignals = [],
  sensitivity = 1.5,
  risk,
  activity = [],
  onActivity,
  setActiveNav,
}) {
  const [poaList, setPoaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('poa1');
  const [panel, setPanel] = useState('plans'); // 'plans' | 'activity'
  const [showAll, setShowAll] = useState(false);

  const readLocal = () => {
    try {
      return JSON.parse(localStorage.getItem('cw.poa.local') || '[]');
    } catch {
      return [];
    }
  };

  const fetchPOAs = () => {
    fetch('/api/poa')
      .then((res) => (res.ok ? res.json() : []))
      .catch(() => [])
      .then((remote) => {
        const list = Array.isArray(remote) ? remote : [];
        const ids = new Set(list.map((p) => p.id));
        setPoaList([...list, ...readLocal().filter((p) => !ids.has(p.id))]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPOAs();
  }, []);

  const updateStatus = async (poa, status) => {
    if (poa.local) {
      const next = readLocal().map((p) => (p.id === poa.id ? { ...p, status } : p));
      localStorage.setItem('cw.poa.local', JSON.stringify(next));
    } else {
      try {
        await fetch(`/api/poa/${poa.id}/status?status=${status}`, { method: 'PATCH' });
      } catch {
        /* offline */
      }
    }
    onActivity?.({ type: status.toLowerCase(), symbol: poa.symbol, exchange: poa.exchange, side: poa.side, poaId: poa.id });
    fetchPOAs();
  };

  const open = poaList.filter((p) => p.status !== 'CLOSED');
  const pending = poaList.filter((p) => ['ARMED', 'DRAFT', 'TRIGGERED'].includes(p.status)).length;
  const ready = historySignals;
  const shown = showAll ? ready : ready.slice(0, 8);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Plan of action"
        eyebrowIcon={ClipboardText}
        title="POA"
        description="Manual Long/Short plans built from exact finalized Pump / Dump events, with immutable risk and conservative one-minute replay."
        actions={
          <>
            <button
              onClick={() => setPanel(panel === 'activity' ? 'plans' : 'activity')}
              className={`cw-btn !text-[12px] ${panel === 'activity' ? '!border-mint/40 !text-mint' : ''}`}
            >
              <Pulse weight="duotone" className="w-4 h-4" />
              Activity
            </button>
            <button onClick={() => setActiveNav?.('pump_dump')} className="cw-btn-primary !text-[12px]">
              Find signal
            </button>
            {risk?.configured ? (
              <button
                onClick={() => setActiveNav?.('settings')}
                className="h-8 px-3 rounded-full border border-mint/30 bg-mint/[0.06] text-mint text-[11px] font-medium inline-flex items-center gap-1.5"
              >
                <ShieldCheck weight="fill" className="w-3.5 h-3.5" />
                Risk · {risk.label}
              </button>
            ) : (
              <button
                onClick={() => setActiveNav?.('settings')}
                className="h-8 px-3 rounded-full border border-terminal-yellow/35 bg-terminal-yellow/[0.06] text-terminal-yellow text-[11px] font-medium inline-flex items-center gap-1.5"
              >
                <Warning weight="fill" className="w-3.5 h-3.5" />
                Risk setup required
              </button>
            )}
          </>
        }
      />

      <Segmented
        size="sm"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'poa1', label: `POA 1 (${poaList.length})` },
          {
            value: 'poa2',
            label: (
              <>
                POA 2 (0) <Lock weight="fill" className="w-3 h-3" />
              </>
            ),
          },
        ]}
      />

      {mode === 'poa2' ? (
        <div className="cw-panel py-20 text-center">
          <div className="cw-disc mx-auto w-12 h-12 text-terminal-yellow">
            <Lock weight="duotone" className="w-6 h-6" />
          </div>
          <div className="mt-4 text-[14px] font-medium text-snow">POA 2 is locked</div>
          <p className="mt-1.5 text-[12px] text-fog-2">Multi-leg plans unlock with a higher plan tier.</p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 @3xl:grid-cols-3 @6xl:grid-cols-6 gap-3">
            <StatCard icon={ClipboardText} label="POA 1 plans" value={poaList.length} caption="Immutable local snapshots" />
            <StatCard icon={Hourglass} label="Open / pending" value={pending} caption="No terminal replay event" />
            <StatCard icon={Pulse} label="Activity" value={activity.length} caption="Up to 2,000 local events" />
            <StatCard icon={ShieldCheck} label="Risk profile" value={risk?.configured ? risk.label : '—'} caption="Captured on new plans" />
            <StatCard
              icon={Gauge}
              label="Maximum loss"
              value={risk?.configured ? `${Number(risk.maxLoss).toFixed(1)}%` : '—'}
              caption={risk?.configured ? `$${((risk.balance * risk.maxLoss) / 100).toLocaleString()} at saved balance` : 'Set in Settings'}
            />
            <StatCard icon={Lightning} highlight label="Eligible signals" value={ready.length} caption="Recent finalized local events" />
          </section>

          <section className="grid gap-3 @5xl:grid-cols-[1.55fr_1fr] items-start">
            {/* Left: plans / activity */}
            <div className="cw-panel cw-glow p-4 md:p-5 min-h-[420px] flex flex-col">
              <PanelTitle
                eyebrow={panel === 'plans' ? 'POA 1 plans' : 'Local events'}
                title={panel === 'plans' ? 'Recent POA 1 plans' : 'All activity'}
                right={
                  <button onClick={() => setPanel(panel === 'plans' ? 'activity' : 'plans')} className="cw-btn !h-8 !text-[12px]">
                    {panel === 'plans' ? 'All activity' : 'Recent plans'}
                  </button>
                }
              />

              {panel === 'plans' ? (
                open.length === 0 ? (
                  <EmptyState
                    title={loading ? 'Loading plans…' : 'No POA 1 plans yet'}
                    text="Open a finalized scanner event, review the complementary Long/Short heuristic, then create a plan manually."
                    action={
                      <button onClick={() => setActiveNav?.('pump_dump')} className="cw-btn-primary !text-[12px]">
                        Open scanner
                      </button>
                    }
                  />
                ) : (
                  <ul className="mt-4 space-y-2">
                    {open.map((poa) => (
                      <PlanRow key={poa.id} poa={poa} onStatus={updateStatus} />
                    ))}
                  </ul>
                )
              ) : activity.length === 0 ? (
                <EmptyState title="No activity yet" text="Arming, triggering and closing plans is logged here on this device." />
              ) : (
                <ol className="mt-4 relative border-l border-white/[0.07] ml-2 space-y-3">
                  {activity.slice(0, 200).map((a) => (
                    <li key={a.id} className="pl-4 relative">
                      <span
                        className={`absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full ${
                          a.type === 'closed' ? 'bg-mint' : a.type === 'triggered' ? 'bg-terminal-yellow' : 'bg-fog'
                        }`}
                      />
                      <div className="flex items-center gap-2 text-[12px]">
                        <CoinIcon symbol={a.symbol} exchange={a.exchange} className="w-5 h-5" />
                        <span className="text-snow font-medium">{baseAsset(a.symbol)}</span>
                        <span className="text-fog">{ACTIVITY_LABEL[a.type] || a.type}</span>
                        {a.side && <span className={`text-[10px] font-semibold ${a.side === 'LONG' ? 'text-mint' : 'text-coral'}`}>{a.side}</span>}
                        <span className="ml-auto text-[11px] text-fog-2">{timeAgo(a.at)}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Right: finalized signals */}
            <div className="cw-panel cw-glow-r p-4 md:p-5">
              <PanelTitle
                eyebrow="Finalized signals"
                title="Ready for review"
                right={
                  <span className="cw-num text-[11px] text-fog-2 mt-1">
                    Showing {shown.length} of {ready.length}
                  </span>
                }
              />
              {ready.length === 0 ? (
                <EmptyState title="Nothing to review" text="Finalized Pump / Dump events appear here once their candle closes." />
              ) : (
                <>
                  <ul className="mt-4 space-y-2">
                    {shown.map((s) => {
                      const isLong = (s.direction || (s.type === 'PUMP' ? 'LONG' : 'SHORT')) === 'LONG';
                      return (
                        <li key={s.id ?? `${s.exchange}-${s.symbol}-${s.raw_ts}`}>
                          <button
                            onClick={() => onOpenNewPOA(s)}
                            className="cw-press w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-[#0c0d10] hover:border-white/[0.14] transition-colors duration-150 text-left"
                          >
                            <CoinIcon symbol={s.symbol} exchange={s.exchange} isPump={isLong} className="w-7 h-7" />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[12px] font-semibold text-snow truncate">{s.symbol}</span>
                              <span className="block text-[10px] text-fog-2 truncate">{s.candle_at}</span>
                            </span>
                            <Metric label="Strength" value={`${strengthOf(s, sensitivity).toFixed(1)}%`} className="text-right" />
                            <Metric label="Signal" value={isLong ? 'LONG' : 'SHORT'} tone={isLong ? 'up' : 'down'} className="text-right w-12" />
                            <CaretRight weight="bold" className="w-4 h-4 text-fog shrink-0" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {ready.length > 8 && (
                    <button onClick={() => setShowAll(!showAll)} className="mt-3 w-full h-9 rounded-lg text-[12px] text-fog hover:text-snow hover:bg-white/[0.03]">
                      {showAll ? 'Show less' : `Show all ${ready.length}`}
                    </button>
                  )}
                </>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function EmptyState({ title, text, action }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-14 px-4">
      <div className="text-[14px] font-semibold text-snow">{title}</div>
      <p className="mt-1.5 text-[12px] text-fog-2 max-w-md leading-relaxed">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function PlanRow({ poa, onStatus }) {
  const isLong = poa.side === 'LONG';
  const SideIcon = isLong ? ArrowUpRight : ArrowDownRight;
  return (
    <li className="rounded-xl border border-white/[0.06] bg-[#0c0d10] p-3.5">
      <div className="flex items-center gap-3">
        <CoinIcon symbol={poa.symbol} exchange={poa.exchange} isPump={isLong} className="w-8 h-8" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-snow">{baseAsset(poa.symbol)}</span>
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${isLong ? 'text-mint' : 'text-coral'}`}>
              <SideIcon weight="bold" className="w-3 h-3" />
              {poa.side}
            </span>
            <span className="text-[10px] text-fog-2">{exchangeName(poa.exchange)}</span>
          </div>
          <p className="text-[11px] text-fog-2 truncate">{poa.thesis}</p>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
            poa.status === 'ARMED'
              ? 'border-mint/30 text-mint bg-mint/[0.06]'
              : poa.status === 'TRIGGERED'
                ? 'border-terminal-yellow/30 text-terminal-yellow bg-terminal-yellow/[0.06]'
                : 'border-white/10 text-fog'
          }`}
        >
          {poa.status}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <Metric label="Entry" value={`${poa.entry_zone_low} – ${poa.entry_zone_high}`} tone="accent" />
        <Metric label="Stop" value={poa.stop_loss} tone="down" />
        <Metric label="TP 1" value={poa.tp1} tone="up" />
        <Metric label="Risk" value={`$${poa.risk_usd} · ${poa.risk_percentage}%`} />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={() => onStatus(poa, 'TRIGGERED')} className="cw-btn !h-8 !text-[12px]">
          <Clock weight="duotone" className="w-4 h-4" /> Triggered
        </button>
        <button onClick={() => onStatus(poa, 'CLOSED')} className="cw-btn !h-8 !text-[12px] hover:!text-mint">
          <CheckCircle weight="duotone" className="w-4 h-4" /> Close R
        </button>
      </div>
    </li>
  );
}
