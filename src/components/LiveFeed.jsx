import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Radio, Search, Filter, ArrowUpRight } from 'lucide-react';

export default function LiveFeed({ events = [], onSelectCoin }) {
  const containerRef = useRef(null);
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');

  // Auto-scroll to top when new events arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [events]);

  const formatTime = (ts) => {
    if (!ts) return '--:--:--';
    const date = new Date(ts > 1e11 ? ts : ts * 1000);
    return date.toTimeString().split(' ')[0];
  };

  const getExchangeBadge = (ex) => {
    switch (ex?.toLowerCase()) {
      case 'hyperliquid':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-exchange-hl/15 text-exchange-hl border border-exchange-hl/30">
            HL
          </span>
        );
      case 'binance':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-exchange-binance/15 text-exchange-binance border border-exchange-binance/30">
            BIN
          </span>
        );
      case 'bybit':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-exchange-bybit/15 text-exchange-bybit border border-exchange-bybit/30">
            BYB
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-terminal-dark text-terminal-muted border border-terminal-border">
            {(ex || 'EX').substring(0, 3).toUpperCase()}
          </span>
        );
    }
  };

  const getTypeBadge = (type) => {
    const t = (type || 'INFO').toUpperCase();
    switch (t) {
      case 'ALERT':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-terminal-red/20 text-terminal-red border border-terminal-red/40 tracking-wider">
            [ALERT]
          </span>
        );
      case 'SIGNAL':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-terminal-cyan/20 text-terminal-cyan border border-terminal-cyan/40 tracking-wider">
            [SIGNAL]
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-terminal-card text-terminal-muted border border-terminal-border tracking-wider">
            [INFO]
          </span>
        );
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (filterType !== 'ALL' && ev.type?.toUpperCase() !== filterType) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toUpperCase();
        const sym = (ev.symbol || '').toUpperCase();
        const msg = (ev.message || '').toUpperCase();
        return sym.includes(q) || msg.includes(q);
      }
      return true;
    });
  }, [events, filterType, search]);

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-4 space-y-3 font-mono select-none overflow-hidden">
      {/* Controls Bar */}
      <div className="bg-terminal-card border border-terminal-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-terminal-cyan font-bold tracking-wider">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>REAL-TIME MARKET FEED</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-terminal-dark border border-terminal-border text-terminal-muted">
            {events.length} events logged
          </span>
        </div>

        {/* Filter by Type pills */}
        <div className="flex items-center gap-1 bg-terminal-dark p-1 rounded-lg border border-terminal-border text-[11px]">
          {['ALL', 'ALERT', 'SIGNAL', 'INFO'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-0.5 rounded font-semibold transition-all ${
                filterType === t
                  ? 'bg-terminal-card text-white shadow-sm border border-terminal-border'
                  : 'text-terminal-muted hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-terminal-muted absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="FILTER FEED..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-terminal-dark border border-terminal-border rounded-lg pl-8 pr-2.5 py-1 text-[11px] text-white placeholder-terminal-muted outline-none focus:border-terminal-cyan uppercase font-mono"
          />
        </div>
      </div>

      {/* Feed Container */}
      <div
        ref={containerRef}
        className="flex-1 rounded-xl border border-terminal-border bg-terminal-dark overflow-y-auto shadow-2xl divide-y divide-terminal-border/30"
      >
        {filteredEvents.length === 0 ? (
          <div className="py-24 text-center text-terminal-muted flex flex-col items-center justify-center space-y-2">
            <Radio className="w-8 h-8 text-terminal-muted/40 animate-pulse" />
            <p className="text-xs">Waiting for market events...</p>
            <p className="text-[11px] text-terminal-muted/70">
              New volume surges, signal triggers, and regime changes will stream here.
            </p>
          </div>
        ) : (
          filteredEvents.map((ev) => (
            <div
              key={ev.id ?? `${ev.ts}-${ev.symbol}`}
              className="px-4 py-2.5 hover:bg-terminal-card/60 transition-colors flex items-center justify-between gap-4 text-xs group"
            >
              {/* Left: Time, Type, Exchange, Symbol */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[11px] text-terminal-muted font-semibold tracking-tighter">
                  {formatTime(ev.ts)}
                </span>
                {getTypeBadge(ev.type)}
                {getExchangeBadge(ev.exchange)}
                {ev.symbol && (
                  <button
                    type="button"
                    onClick={() =>
                      onSelectCoin &&
                      onSelectCoin({
                        symbol: ev.symbol,
                        exchange: ev.exchange || 'binance',
                      })
                    }
                    className="font-bold text-white hover:text-terminal-cyan transition-colors flex items-center gap-1 group/sym"
                  >
                    <span>{ev.symbol}</span>
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover/sym:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>

              {/* Center/Right: Message */}
              <div className="flex-1 text-terminal-text text-xs tracking-wide font-sans text-right sm:text-left truncate">
                {ev.message}
              </div>

              {/* Data tags if present */}
              {ev.data && (ev.data.vol_spike || ev.data.volume_spike_ratio || ev.data.score) && (
                <div className="hidden md:flex items-center gap-2 text-[10px] text-terminal-muted">
                  {(ev.data.vol_spike || ev.data.volume_spike_ratio) && (
                    <span className="px-1.5 py-0.5 rounded bg-terminal-card border border-terminal-border">
                      VOL:{' '}
                      <b className="text-terminal-green">
                        {ev.data.vol_spike || ev.data.volume_spike_ratio}x
                      </b>
                    </span>
                  )}
                  {ev.data.score && (
                    <span className="px-1.5 py-0.5 rounded bg-terminal-card border border-terminal-border">
                      SCORE: <b className="text-terminal-cyan">{ev.data.score}</b>
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
