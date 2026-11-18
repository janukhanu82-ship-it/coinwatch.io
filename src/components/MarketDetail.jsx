import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import {
  ArrowLeft,
  ArrowsClockwise,
  TrendUp,
  TrendDown,
  Info,
  ShieldCheck,
  Lock,
  Minus,
  Plus,
  Crosshair,
  CornersOut,
  ArrowLineRight,
  ChartBar,
} from '@phosphor-icons/react';
import CoinIcon, { baseAsset } from './CoinIcon';
import { exchangeName } from './ExchangeLogo';
import { PageHeader, LivePill, PanelTitle, Segmented, StatCard, FlashValue } from './ui';
import { fetchKlines, openMarketStream, INTERVALS } from '../lib/marketStream';
import { fmtPrice, fmtUsd, pct, fmtDateTime } from '../lib/format';

const TZ_SHIFT = -new Date().getTimezoneOffset() * 60;
const IV_SEC = { '1m': 60, '3m': 180, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 };
const ACTIVE_WINDOW_S = { '1m': 180, '5m': 600 };

function precisionFor(p) {
  if (!p) return 2;
  if (p >= 1000) return 2;
  if (p >= 1) return 4;
  if (p >= 0.01) return 5;
  if (p >= 0.0001) return 7;
  return 9;
}

/** Follow vs counter split from candle shape and volume. */
function biasFrom(candle, spike = 1) {
  if (!candle) return { long: 50, short: 50, isPump: true };
  const { o, h, l, c } = candle;
  const range = h - l || 1e-12;
  const isPump = c >= o;
  const retrace = isPump ? (h - c) / range : (c - l) / range;
  let counter = 30 + retrace * 55;
  if (spike >= 3) counter -= 8;
  else if (spike < 1.2) counter += 4;
  counter = Math.max(10, Math.min(90, counter));
  const follow = 100 - counter;
  return { long: isPump ? follow : counter, short: isPump ? counter : follow, isPump };
}

export default function MarketDetail({ coin, sensitivity = 1.5, onBack, onOpenPOA, setActiveNav }) {
  const exchange = (coin.exchange || 'binance').toLowerCase();
  const symbol = String(coin.symbol || 'BTCUSDT');
  const base = baseAsset(symbol);
  const signal = coin.candle_ts || coin.change_pct != null ? coin : null;

  const [interval, setIv] = useState(signal?.timeframe && IV_SEC[signal.timeframe] ? signal.timeframe : '1m');
  const [view, setView] = useState('candles');
  const [status, setStatus] = useState('connecting');
  const [ticker, setTicker] = useState({});
  const [book, setBook] = useState({ bids: [], asks: [] });
  const [bars, setBars] = useState([]);
  const [hover, setHover] = useState(null);
  const [spacing, setSpacing] = useState(8);
  const [showSignal, setShowSignal] = useState(true);
  const [footprint, setFootprint] = useState([]);
  const [trades, setTrades] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const chartEl = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const volRef = useRef(null);
  const barsRef = useRef([]);
  const fpRef = useRef(new Map());
  const tradesRef = useRef(0);
  const pendingBook = useRef(null);
  const fallbackPrice = useRef(coin.price);

  /* chart instance */
  useEffect(() => {
    const chart = createChart(chartEl.current, {
      autoSize: true,
      layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#7c827f', fontFamily: 'Funnel Display, sans-serif', fontSize: 11 },
      grid: { vertLines: { color: 'rgba(255,255,255,0.025)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.06)', timeVisible: true, secondsVisible: false, barSpacing: 8, rightOffset: 4 },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(126,230,163,0.35)', labelBackgroundColor: '#1c1d22' },
        horzLine: { color: 'rgba(126,230,163,0.35)', labelBackgroundColor: '#1c1d22' },
      },
    });
    const candles = chart.addCandlestickSeries({
      upColor: '#7ee6a3',
      downColor: '#f2707c',
      borderVisible: false,
      wickUpColor: '#7ee6a3',
      wickDownColor: '#f2707c',
    });
    const vol = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '' });
    chart.priceScale('').applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
    chart.subscribeCrosshairMove((p) => {
      const d = p?.seriesData?.get(candles);
      setHover(d ? { ...d, t: (p.time - TZ_SHIFT) * 1000 } : null);
    });
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      setSpacing(Math.round(chart.timeScale().options().barSpacing));
    });
    chartRef.current = chart;
    candleRef.current = candles;
    volRef.current = vol;
    return () => chart.remove();
  }, []);

  /* data + stream */
  useEffect(() => {
    let alive = true;
    barsRef.current = [];
    fpRef.current = new Map();
    tradesRef.current = 0;
    setBars([]);
    setBook({ bids: [], asks: [] });
    setFootprint([]);
    setTrades(0);
    setStatus('connecting');

    const toLocal = (b) => ({ ...b, time: b.time + TZ_SHIFT });
    const volColor = (b) => (b.close >= b.open ? 'rgba(126,230,163,0.28)' : 'rgba(242,112,124,0.28)');

    fetchKlines(exchange, symbol, interval, coin.coin).then((rows) => {
      if (!alive || !candleRef.current) return;
      const local = rows.map(toLocal);
      barsRef.current = local;
      const p = local[local.length - 1]?.close || fallbackPrice.current;
      const precision = precisionFor(p);
      candleRef.current.applyOptions({ priceFormat: { type: 'price', precision, minMove: 1 / 10 ** precision } });
      candleRef.current.setData(local);
      volRef.current.setData(local.map((b) => ({ time: b.time, value: b.volume, color: volColor(b) })));
      chartRef.current.timeScale().scrollToRealTime();
      setBars(local);
    });

    const close = openMarketStream(exchange, symbol, interval, coin.coin, {
      onStatus: (s) => alive && setStatus(s),
      onKline: (b) => {
        if (!alive || !candleRef.current) return;
        const lb = toLocal(b);
        const arr = barsRef.current;
        const last = arr[arr.length - 1];
        if (last && lb.time < last.time) return;
        if (last && last.time === lb.time) arr[arr.length - 1] = lb;
        else arr.push(lb);
        candleRef.current.update(lb);
        volRef.current.update({ time: lb.time, value: lb.volume, color: volColor(lb) });
      },
      onTicker: (t) => alive && setTicker((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(t).filter(([, v]) => Number.isFinite(v) && v !== 0)) })),
      onBook: (bk) => {
        pendingBook.current = bk;
      },
      onTrade: (t) => {
        tradesRef.current += 1;
        const step = Math.max(10 ** (Math.floor(Math.log10(t.price)) - 3), 1e-9);
        const key = (Math.round(t.price / step) * step).toPrecision(8);
        const cur = fpRef.current.get(key) || { price: Number(key), buy: 0, sell: 0 };
        cur[t.side] += t.size * t.price;
        fpRef.current.set(key, cur);
      },
    });

    const flush = setInterval(() => {
      if (!alive) return;
      if (pendingBook.current) {
        setBook(pendingBook.current);
        pendingBook.current = null;
      }
      setTrades(tradesRef.current);
      setBars([...barsRef.current]);
      if (fpRef.current.size) {
        setFootprint([...fpRef.current.values()].sort((a, b) => b.price - a.price).slice(0, 60));
      }
    }, 500);

    return () => {
      alive = false;
      close();
      clearInterval(flush);
    };
  }, [exchange, symbol, interval, reloadKey, coin.coin]);

  /* signal marker */
  useEffect(() => {
    if (!candleRef.current) return;
    if (!signal?.candle_ts || !showSignal || !bars.length) {
      candleRef.current.setMarkers([]);
      return;
    }
    const iv = IV_SEC[interval];
    const t = Math.floor(signal.candle_ts / 1000 / iv) * iv + TZ_SHIFT;
    const isPump = signal.type !== 'DUMP';
    if (bars.some((b) => b.time === t)) {
      candleRef.current.setMarkers([
        { time: t, position: isPump ? 'belowBar' : 'aboveBar', color: isPump ? '#7ee6a3' : '#f2707c', shape: isPump ? 'arrowUp' : 'arrowDown', text: 'Signal' },
      ]);
    }
  }, [signal, showSignal, bars, interval]);

  const last = ticker.last || bars[bars.length - 1]?.close || coin.price;
  const change1h = useMemo(() => {
    if (!bars.length || !last) return null;
    const target = bars[bars.length - 1].time - 3600;
    const ref = [...bars].reverse().find((b) => b.time <= target);
    return ref ? ((last - ref.close) / ref.close) * 100 : null;
  }, [bars, last]);
  const bid = ticker.bid || book.bids[0]?.[0];
  const ask = ticker.ask || book.asks[0]?.[0];
  const spread = bid && ask ? ((ask - bid) / ((ask + bid) / 2)) * 100 : null;

  const refCandle = signal?.o
    ? { o: signal.o, h: signal.h, l: signal.l, c: signal.c }
    : bars.length
      ? { o: bars[bars.length - 1].open, h: bars[bars.length - 1].high, l: bars[bars.length - 1].low, c: bars[bars.length - 1].close }
      : null;
  const bias = biasFrom(refCandle, signal?.vol_spike);
  const move = signal ? Number(signal.change_pct) : refCandle ? ((refCandle.c - refCandle.o) / refCandle.o) * 100 : 0;
  const strength = Math.min(100, (Math.abs(move) / Math.max(0.1, sensitivity * 2)) * 100);
  const favors = bias.long >= bias.short ? 'LONG' : 'SHORT';
  const windowOpen = signal?.candle_ts
    ? Date.now() - (signal.candle_ts + IV_SEC[signal.timeframe || '1m'] * 1000) <= (ACTIVE_WINDOW_S[signal.timeframe] || 1800) * 1000
    : false;

  const hasOverlay = useMemo(() => {
    try {
      const local = JSON.parse(localStorage.getItem('cw.poa.local') || '[]');
      return local.some((p) => p.symbol === symbol && p.status !== 'CLOSED');
    } catch {
      return false;
    }
  }, [symbol]);

  const zoom = (dir) => {
    const ts = chartRef.current?.timeScale();
    if (!ts) return;
    const next = Math.max(2, Math.min(40, ts.options().barSpacing * (dir > 0 ? 1.25 : 0.8)));
    ts.applyOptions({ barSpacing: next });
    setSpacing(Math.round(next));
  };

  const plan = (side) =>
    onOpenPOA({
      ...coin,
      symbol,
      exchange,
      price: last,
      preferredSide: side,
      volume_spike_ratio: signal?.vol_spike,
    });

  const maxBook = Math.max(1, ...book.bids.map((b) => b[1] * b[0]), ...book.asks.map((a) => a[1] * a[0]));
  const live = status === 'live';

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Market detail"
        eyebrowIcon={ChartBar}
        title={
          <span className="inline-flex items-center gap-3">
            <CoinIcon symbol={symbol} coin={coin.coin} exchange={exchange} className="w-10 h-10" isPump={move >= 0} />
            {base}/USDT
          </span>
        }
        description={`Live market feed with real-time data · ${exchangeName(exchange)} perpetual`}
        actions={
          <>
            <button onClick={onBack} className="cw-btn !h-9">
              <ArrowLeft weight="bold" className="w-4 h-4" /> Back
            </button>
            <button onClick={() => setReloadKey((k) => k + 1)} className="cw-btn !h-9">
              <ArrowsClockwise weight="bold" className="w-4 h-4" /> Reload
            </button>
            <LivePill isConnected={live} />
          </>
        }
      />

      {/* Stats strip */}
      <section className="cw-panel grid grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-6 divide-white/[0.06] @5xl:divide-x">
        {[
          ['Last', <FlashValue key="l" value={fmtPrice(last)} className="text-snow" />],
          ['24h', ticker.change24 != null ? <span className={ticker.change24 >= 0 ? 'text-mint' : 'text-coral'}>{pct(ticker.change24)}</span> : '—'],
          ['Volume', ticker.vol24 ? fmtUsd(ticker.vol24) : coin.volume_24h_usd ? fmtUsd(coin.volume_24h_usd) : '—'],
          ['1h', change1h != null ? <span className={change1h >= 0 ? 'text-mint' : 'text-coral'}>{pct(change1h)}</span> : '—'],
          ['Bid / Ask', bid && ask ? `${fmtPrice(bid)} / ${fmtPrice(ask)}` : '— / —'],
          ['Spread', spread != null ? `${spread.toFixed(3)}%` : '—'],
        ].map(([k, v]) => (
          <div key={k} className="px-4 py-3.5 min-w-0">
            <div className="text-[11px] text-fog-2">{k}</div>
            <div className="cw-num mt-1 text-[15px] font-medium text-snow truncate">{v}</div>
          </div>
        ))}
      </section>

      {/* Plan of attack */}
      <section className="cw-panel cw-glow p-4 md:p-5 space-y-4">
        <PanelTitle
          eyebrow="Plan of attack"
          title="Choose Long or Short for this coin"
          right={
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-[11px] text-fog-2">{fmtDateTime(Date.now())}</span>
              <button onClick={() => setActiveNav?.('settings')} className="cw-btn !h-8 !text-[12px]">
                <ShieldCheck weight="duotone" className="w-4 h-4" /> Risk
              </button>
            </div>
          }
        />
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center h-7 px-3 rounded-full bg-mint/10 text-mint text-[11px] font-medium">POA 1 · Long or short</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-fog-2">
            <Lock weight="fill" className="w-3 h-3" /> POA 2 · Beta
          </span>
        </div>
        <div className="grid grid-cols-2 @3xl:grid-cols-4 rounded-xl border border-white/[0.06] bg-[#0b0c0f] divide-white/[0.06] @3xl:divide-x">
          {[
            [signal ? 'Signal confirmed' : 'Latest candle', symbol, signal ? 'text-mint' : 'text-fog-2'],
            ['Move', pct(move), move >= 0 ? 'text-mint' : 'text-coral'],
            ['Strength', `${strength.toFixed(1)}%`],
            ['Favors', favors, favors === 'LONG' ? 'text-mint' : 'text-coral'],
          ].map(([k, v, tone]) => (
            <div key={k} className="px-4 py-3 min-w-0">
              <div className={`text-[11px] ${tone && k !== 'Move' && k !== 'Favors' ? tone : 'text-fog-2'}`}>{k}</div>
              <div className={`cw-num mt-0.5 text-[14px] font-medium truncate ${k === 'Move' || k === 'Favors' ? tone : 'text-snow'}`}>{v}</div>
            </div>
          ))}
        </div>
        <div className="grid gap-3 @3xl:grid-cols-2">
          {[
            ['LONG', bias.long, bias.isPump ? 'Follow' : 'Counter', TrendUp, 'mint'],
            ['SHORT', bias.short, bias.isPump ? 'Counter' : 'Follow', TrendDown, 'coral'],
          ].map(([side, p, kind, Icon, tone]) => {
            const fav = favors === side;
            return (
              <button
                key={side}
                onClick={() => plan(side)}
                className={`cw-press relative overflow-hidden h-[72px] rounded-xl border text-center transition-colors duration-150 ${
                  tone === 'mint'
                    ? fav
                      ? 'border-mint/50'
                      : 'border-white/[0.08] hover:border-mint/35'
                    : fav
                      ? 'border-coral/55'
                      : 'border-white/[0.08] hover:border-coral/35'
                }`}
              >
                <span
                  className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${tone === 'mint' ? 'bg-mint/[0.12]' : 'bg-coral/[0.16]'}`}
                  style={{ width: `${p}%` }}
                />
                <span className="relative flex flex-col items-center justify-center h-full">
                  <span className={`inline-flex items-center gap-1.5 text-[17px] font-semibold ${tone === 'mint' ? 'text-mint' : 'text-coral'}`}>
                    <Icon weight="bold" className="w-4 h-4" />
                    {side} <span className="cw-num">{p.toFixed(1)}%</span>
                  </span>
                  <span className="text-[11px] text-fog mt-0.5">
                    {fav ? `Favored · ${kind}` : kind}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2.5">
            <div className={`inline-flex items-center gap-1.5 text-[12px] ${windowOpen ? 'text-mint' : 'text-terminal-yellow'}`}>
              <Info weight="fill" className="w-4 h-4" />
              {signal ? (windowOpen ? 'Signal window open.' : 'Signal window closed.') : 'No scanner signal — split derived from the latest candle.'}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setActiveNav?.('pump_dump')} className="cw-btn !h-9 !text-[12px]">
                Open scanner
              </button>
              <button onClick={() => setActiveNav?.('poa')} className="cw-btn !h-9 !text-[12px]">
                POA dashboard
              </button>
            </div>
          </div>
          <button onClick={() => setActiveNav?.('poa')} className="text-[12px] text-terminal-yellow hover:underline self-end">
            Plan activity
          </button>
        </div>
      </section>

      {/* Chart */}
      <section className="cw-panel p-3 md:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="cw-seg cw-seg-sm">
            {INTERVALS.map((iv) => (
              <button key={iv} data-active={interval === iv} onClick={() => setIv(iv)}>
                {iv}
              </button>
            ))}
          </div>
          <Segmented
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: 'candles', label: 'Candles' },
              { value: 'footprint', label: 'Footprint' },
              { value: 'liquidity', label: 'Liquidity' },
            ]}
          />
        </div>

        <div className="grid gap-3 @5xl:grid-cols-[1fr_250px]">
          <div className="rounded-xl border border-white/[0.06] bg-[#0b0c0f] overflow-hidden flex flex-col">
            <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-2 border-b border-white/[0.05]">
              <button onClick={() => zoom(-1)} className="cw-btn !h-7 !w-7 !p-0" aria-label="Zoom out">
                <Minus weight="bold" className="w-3.5 h-3.5" />
              </button>
              <span className="cw-num text-[11px] text-fog-2 w-14 text-center">{spacing} px/bar</span>
              <button onClick={() => zoom(1)} className="cw-btn !h-7 !w-7 !p-0" aria-label="Zoom in">
                <Plus weight="bold" className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowSignal((v) => !v)}
                disabled={!signal}
                className={`cw-btn !h-7 !px-2.5 !text-[11px] disabled:opacity-40 ${showSignal && signal ? '!border-mint/40 !text-mint' : ''}`}
              >
                <Crosshair weight="duotone" className="w-3.5 h-3.5" /> Signal
              </button>
              <button onClick={() => chartRef.current?.timeScale().fitContent()} className="cw-btn !h-7 !px-2.5 !text-[11px]">
                <CornersOut weight="duotone" className="w-3.5 h-3.5" /> Fit
              </button>
              <button onClick={() => chartRef.current?.timeScale().scrollToRealTime()} className="cw-btn !h-7 !px-2.5 !text-[11px] !border-mint/30 !text-mint">
                <ArrowLineRight weight="bold" className="w-3.5 h-3.5" /> Latest
              </button>
              <span className="ml-auto hidden md:inline text-[10px] text-fog-2">Drag to pan · wheel to zoom</span>
            </div>
            <div className={`relative h-[440px] ${view === 'candles' ? '' : 'hidden'}`}>
              <div ref={chartEl} className="absolute inset-0" />
              {!bars.length && (
                <div className="absolute inset-0 flex items-center justify-center text-[12px] text-fog-2">Loading candles…</div>
              )}
            </div>
            {view === 'footprint' && <Footprint rows={footprint} />}
            {view === 'liquidity' && <Liquidity book={book} />}
            <div className="px-3 py-2 border-t border-white/[0.05] text-[11px] text-fog-2 cw-num truncate">
              {hover
                ? `${fmtDateTime(hover.t)} · O ${fmtPrice(hover.open)} · H ${fmtPrice(hover.high)} · L ${fmtPrice(hover.low)} · C ${fmtPrice(hover.close)}`
                : 'Hover over the chart to inspect a candle.'}
            </div>
          </div>

          {/* Order book */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0b0c0f] flex flex-col min-h-[300px]">
            <div className="px-3 py-2.5 border-b border-white/[0.05] flex items-center justify-between">
              <div>
                <div className="text-[10px] text-fog-2">Order book</div>
                <div className="text-[13px] font-medium text-snow">{symbol}</div>
              </div>
              <span className={`text-[10px] ${book.bids.length ? 'text-mint' : 'text-fog-2'}`}>{book.bids.length ? 'Live' : 'Synchronizing'}</span>
            </div>
            <div className="grid grid-cols-3 px-3 py-1.5 text-[10px] text-fog-2">
              <span>Price</span>
              <span className="text-right">Size</span>
              <span className="text-right">Notional</span>
            </div>
            <div className="flex-1 overflow-hidden text-[11px] cw-num flex flex-col">
              <div className="flex-1 flex flex-col justify-end overflow-hidden">
                {book.asks.slice(0, 12).reverse().map(([p, s]) => (
                  <BookRow key={`a${p}`} p={p} s={s} max={maxBook} side="ask" />
                ))}
              </div>
              <div className="px-3 py-2 my-0.5 border-y border-white/[0.05] flex items-center justify-between">
                <span className="text-[14px] font-semibold text-mint">{fmtPrice(last)}</span>
                <span className="text-[10px] text-fog-2">{signal ? '— signal' : 'mid'}</span>
              </div>
              <div className="flex-1 overflow-hidden">
                {book.bids.slice(0, 12).map(([p, s]) => (
                  <BookRow key={`b${p}`} p={p} s={s} max={maxBook} side="bid" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 @5xl:grid-cols-4 gap-3">
        <StatCard label="Bars" value={bars.length} caption="Visible window rendered" />
        <StatCard label="Footprint" value={footprint.length} caption={`${trades} trades aggregated`} />
        <StatCard label="Liquidity levels" value={book.bids.length + book.asks.length} caption={`${Math.max(book.bids.length, book.asks.length)} current levels per side`} />
        <StatCard label="Overlay" value={hasOverlay ? 'POA plan' : 'None'} caption={hasOverlay ? 'Saved plan for this coin' : 'No saved plan overlay'} />
      </section>
    </div>
  );
}

function BookRow({ p, s, max, side }) {
  const notional = p * s;
  return (
    <div className="relative grid grid-cols-3 px-3 py-[3px]">
      <span
        className={`absolute inset-y-0 right-0 ${side === 'ask' ? 'bg-coral/[0.09]' : 'bg-mint/[0.08]'}`}
        style={{ width: `${Math.min(100, (notional / max) * 100)}%` }}
      />
      <span className={`relative ${side === 'ask' ? 'text-coral' : 'text-mint'}`}>{fmtPrice(p)}</span>
      <span className="relative text-right text-snow/80">{s >= 1000 ? `${(s / 1000).toFixed(1)}K` : +s.toFixed(3)}</span>
      <span className="relative text-right text-fog">{fmtUsd(notional).replace('$', '')}</span>
    </div>
  );
}

function Footprint({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.buy + r.sell));
  if (!rows.length) return <div className="h-[440px] flex items-center justify-center text-[12px] text-fog-2">Collecting trades…</div>;
  return (
    <div className="h-[440px] overflow-auto px-3 py-2 space-y-[3px] text-[11px] cw-num">
      {rows.map((r) => (
        <div key={r.price} className="grid grid-cols-[90px_1fr_1fr] items-center gap-2">
          <span className="text-fog">{fmtPrice(r.price)}</span>
          <div className="flex justify-end">
            <span className="h-3 rounded-l bg-coral/50" style={{ width: `${(r.sell / max) * 100}%` }} />
          </div>
          <div>
            <span className="block h-3 rounded-r bg-mint/50" style={{ width: `${(r.buy / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Liquidity({ book }) {
  const cum = (levels) => {
    let t = 0;
    return levels.slice(0, 30).map(([p, s]) => {
      t += p * s;
      return [p, t];
    });
  };
  const bids = cum(book.bids);
  const asks = cum(book.asks);
  const max = Math.max(1, bids[bids.length - 1]?.[1] || 0, asks[asks.length - 1]?.[1] || 0);
  if (!bids.length && !asks.length) return <div className="h-[440px] flex items-center justify-center text-[12px] text-fog-2">Waiting for order book…</div>;
  return (
    <div className="h-[440px] grid grid-cols-2 gap-3 p-3 text-[11px] cw-num overflow-auto">
      {[
        ['Bids', bids, 'bg-mint/40', 'text-mint'],
        ['Asks', asks, 'bg-coral/40', 'text-coral'],
      ].map(([label, levels, bar, txt]) => (
        <div key={label} className="space-y-[3px]">
          <div className="text-[10px] text-fog-2 mb-1">{label} · cumulative notional</div>
          {levels.map(([p, t]) => (
            <div key={p} className="relative h-4 rounded overflow-hidden bg-white/[0.02]">
              <span className={`absolute inset-y-0 left-0 ${bar}`} style={{ width: `${(t / max) * 100}%` }} />
              <span className={`relative px-1.5 ${txt}`}>{fmtPrice(p)}</span>
              <span className="absolute right-1.5 top-0 text-fog">{fmtUsd(t)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
