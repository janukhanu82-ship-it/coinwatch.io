/*
  Browser-side market engine.
  Streams public tickers straight from the exchanges (no API keys, no backend):
    - Binance USDT-M futures: !miniTicker@arr (all markets, 1s)
    - Bybit linear perps:     tickers.{SYMBOL}
    - Hyperliquid perps:      allMids + metaAndAssetCtxs (24h volume)
  Ticks are folded into 1-minute candles; timeframe candles are aggregated on demand
  and turned into Pump / Dump signals and Markets rows.
*/
import { fmtPrice, fmtVol, fmtTime, fmtDateTime } from './format';

const TF_MIN = { '1m': 1, '5m': 5, '15m': 15, '1h': 60, '4h': 240 };
const TF_RR = { '1m': 2, '5m': 3, '15m': 4, '1h': 6, '4h': 8.5 };
const TF_LABEL = { '1m': '1M SCALP', '5m': '5M MOMENTUM', '15m': '15M INTRADAY', '1h': '1H HIGH RR SWING', '4h': '4H MACRO TREND' };
const ACTIVE_WINDOW_S = { '1m': 180, '5m': 600 };
const MIN_TRACK_PCT = 0.5; // lowest sensitivity preset
const MAX_MINUTES = 260;
const MAX_SIGNALS_PER_TF = 1500;

const BINANCE_WS = 'wss://fstream.binance.com/ws/!miniTicker@arr';
const BYBIT_WS = 'wss://stream.bybit.com/v5/public/linear';
const BYBIT_TICKERS = 'https://api.bybit.com/v5/market/tickers?category=linear';
const HL_WS = 'wss://api.hyperliquid.xyz/ws';
const HL_INFO = 'https://api.hyperliquid.xyz/info';

class LiveEngine {
  constructor() {
    this.markets = new Map();
    this.signals = Object.fromEntries(Object.keys(TF_MIN).map((tf) => [tf, new Map()]));
    this.status = { binance: 'idle', bybit: 'idle', hyperliquid: 'idle' };
    this.sockets = {};
    this.timers = [];
    this.refs = 0;
    this.timeframe = '1m';
    this.lastSignalAt = 0;
    this.version = 0;
  }

  /* ───────────── lifecycle ───────────── */
  start() {
    this.refs += 1;
    if (this.refs > 1) return;
    this.stopped = false;
    this.connectBinance();
    this.connectBybit();
    this.connectHyperliquid();
    this.timers.push(setInterval(() => this.evaluate(), 1000));
  }

  stop() {
    this.refs = Math.max(0, this.refs - 1);
    if (this.refs > 0) return;
    this.stopped = true;
    this.timers.forEach(clearInterval);
    this.timers = [];
    this.hlVolTimer = null;
    Object.values(this.sockets).forEach((ws) => {
      try {
        ws.onclose = null;
        ws.close();
      } catch {
        /* noop */
      }
    });
    this.sockets = {};
    Object.keys(this.status).forEach((k) => (this.status[k] = 'idle'));
  }

  setTimeframe(tf) {
    if (TF_MIN[tf]) this.timeframe = tf;
  }

  connected() {
    return Object.values(this.status).filter((s) => s === 'live').length;
  }

  /* ───────────── ticks → minute candles ───────────── */
  tick(exchange, symbol, price, { cumQuote, vol24, coin } = {}) {
    const p = Number(price);
    if (!Number.isFinite(p) || p <= 0) return;
    const key = `${exchange}:${symbol}`;
    let m = this.markets.get(key);
    if (!m) {
      m = { key, exchange, symbol, coin, price: p, vol24: 0, lastQ: null, mins: [], firstSeen: Date.now() };
      this.markets.set(key, m);
    }
    const now = Date.now();
    const t = Math.floor(now / 60000) * 60000;
    let c = m.mins[m.mins.length - 1];
    if (!c || c.t !== t) {
      c = { t, o: c ? c.c : p, h: p, l: p, c: p, v: 0 };
      if (c.o > c.h) c.h = c.o;
      if (c.o < c.l) c.l = c.o;
      m.mins.push(c);
      if (m.mins.length > MAX_MINUTES) m.mins.splice(0, m.mins.length - MAX_MINUTES);
    }
    if (p > c.h) c.h = p;
    if (p < c.l) c.l = p;
    c.c = p;
    m.price = p;
    m.updated = now;
    if (cumQuote != null) {
      const q = Number(cumQuote);
      if (m.lastQ != null) {
        const d = q - m.lastQ;
        if (d > 0 && d < q * 0.25) c.v += d;
      }
      m.lastQ = q;
      m.vol24 = q;
    }
    if (vol24 != null) m.vol24 = Number(vol24) || m.vol24;
  }

  bucket(m, tf, now = Date.now()) {
    const span = TF_MIN[tf] * 60000;
    const start = Math.floor(now / span) * span;
    let o;
    let h = -Infinity;
    let l = Infinity;
    let c;
    let v = 0;
    for (const k of m.mins) {
      if (k.t < start) continue;
      if (o === undefined) o = k.o;
      if (k.h > h) h = k.h;
      if (k.l < l) l = k.l;
      c = k.c;
      v += k.v;
    }
    if (o === undefined) return null;
    return { start, o, h, l, c, v };
  }

  spike(m) {
    const n = m.mins.length;
    if (n < 3) return 1;
    const cur = m.mins[n - 1].v;
    let sum = 0;
    let cnt = 0;
    for (let i = Math.max(0, n - 21); i < n - 1; i++) {
      sum += m.mins[i].v;
      cnt += 1;
    }
    const avg = cnt ? sum / cnt : 0;
    if (!avg) return 1;
    return Math.min(99, cur / avg);
  }

  changeOver(m, minutes) {
    const n = m.mins.length;
    if (!n) return 0;
    const target = m.mins[n - 1].t - minutes * 60000;
    let ref = null;
    for (let i = n - 1; i >= 0; i--) {
      if (m.mins[i].t <= target) {
        ref = m.mins[i].c;
        break;
      }
    }
    if (ref == null) ref = m.mins[0].o;
    return ref ? ((m.price - ref) / ref) * 100 : 0;
  }

  /* ───────────── signals ───────────── */
  evaluate() {
    const tf = this.timeframe;
    const store = this.signals[tf];
    const now = Date.now();
    for (const m of this.markets.values()) {
      if (now - m.firstSeen < 20000) continue; // let the first candle settle
      const b = this.bucket(m, tf, now);
      if (!b || !b.o) continue;
      const change = ((b.c - b.o) / b.o) * 100;
      if (Math.abs(change) < MIN_TRACK_PCT) continue;
      const id = `${m.key}|${tf}|${b.start}`;
      const isPump = change > 0;
      const amplitude = ((b.h - b.l) / b.l) * 100;
      const rr = TF_RR[tf];
      const risk = Math.max(Math.abs(b.c - (isPump ? b.l : b.h)), b.c * 0.002);
      const prev = store.get(id);
      const sig = {
        id,
        key: m.key,
        symbol: m.symbol,
        coin: m.coin,
        pair: `${m.symbol.replace(/USDT$/, '')} / USDT`,
        exchange: m.exchange,
        timeframe: tf,
        type: isPump ? 'PUMP' : 'DUMP',
        direction: isPump ? 'LONG' : 'SHORT',
        signal_label: `CONFIRMED ${isPump ? 'LONG' : 'SHORT'} (${TF_LABEL[tf]})`,
        change_pct: +change.toFixed(2),
        peak_pct: prev ? (Math.abs(change) > Math.abs(prev.peak_pct) ? +change.toFixed(2) : prev.peak_pct) : +change.toFixed(2),
        amplitude: +amplitude.toFixed(2),
        open: fmtPrice(b.o),
        high: fmtPrice(b.h),
        low: fmtPrice(b.l),
        close: fmtPrice(b.c),
        o: b.o,
        h: b.h,
        l: b.l,
        c: b.c,
        price: b.c,
        volume: fmtVol(b.v),
        vol_spike: +this.spike(m).toFixed(1),
        rr_ratio: `1:${rr}R`,
        entry_price: b.c,
        stop_loss: +(isPump ? b.c - risk : b.c + risk).toPrecision(6),
        tp1: +(isPump ? b.c + risk * 1.5 : b.c - risk * 1.5).toPrecision(6),
        tp2: +(isPump ? b.c + risk * rr : b.c - risk * rr).toPrecision(6),
        candle_ts: b.start,
        candle_at: fmtDateTime(b.start),
        first_ts: prev ? prev.first_ts : now,
        timestamp: prev ? prev.timestamp : fmtTime(now),
        updated_ts: now,
        raw_ts: Math.floor((prev ? prev.first_ts : now) / 1000),
      };
      store.set(id, sig);
      this.lastSignalAt = now;
    }
    if (store.size > MAX_SIGNALS_PER_TF) {
      const sorted = [...store.values()].sort((a, b) => a.updated_ts - b.updated_ts);
      for (let i = 0; i < store.size - MAX_SIGNALS_PER_TF; i++) store.delete(sorted[i].id);
    }
    this.version += 1;
  }

  view(sensitivity, tf) {
    const now = Date.now();
    const windowMs = (ACTIVE_WINDOW_S[tf] || 1800) * 1000;
    const span = TF_MIN[tf] * 60000;
    const live = [];
    const history = [];
    for (const s of this.signals[tf].values()) {
      if (Math.abs(s.change_pct) < sensitivity && Math.abs(s.peak_pct) < sensitivity) continue;
      const closedAt = s.candle_ts + span;
      const isLive = now < closedAt || now - closedAt <= windowMs;
      (isLive ? live : history).push(s);
    }
    live.sort((a, b) => b.updated_ts - a.updated_ts);
    history.sort((a, b) => b.updated_ts - a.updated_ts);
    const monitored = this.markets.size;
    const lastLive = live[0]?.updated_ts || history[0]?.updated_ts;
    return {
      live,
      history,
      stats: {
        monitored,
        stream_batches: `${this.connected()} / 3`,
        last_event: lastLive ? fmtTime(lastLive) : '—',
        crossing_now: live.length,
        pumps: live.filter((s) => s.type === 'PUMP').length,
        dumps: live.filter((s) => s.type === 'DUMP').length,
      },
    };
  }

  rows() {
    const out = [];
    for (const m of this.markets.values()) {
      const c1 = this.changeOver(m, 1);
      const c5 = this.changeOver(m, 5);
      const spike = this.spike(m);
      let status = 'CONSOLIDATION';
      if (Math.abs(c1) >= 1 && spike >= 2) status = c1 > 0 ? 'PUMP DETECTED' : 'DUMP DETECTED';
      else if (Math.abs(c5) >= 2) status = 'BREAKOUT CONFIRMED';
      else if (spike >= 1.8) status = 'MOMENTUM BUILDING';
      const volFactor = m.vol24 > 0 ? Math.min(20, Math.log10(m.vol24) * 2) : 0;
      const score = Math.max(0, Math.min(100, Math.abs(c1) * 18 + Math.abs(c5) * 6 + (spike - 1) * 10 + volFactor));
      out.push({
        symbol: m.symbol,
        coin: m.coin,
        exchange: m.exchange,
        price: m.price,
        price_change_1m: c1,
        price_change_5m: c5,
        volume_24h_usd: m.vol24,
        volume_spike_ratio: spike,
        signal_status: status,
        composite_score: score,
        flow_quadrant: null,
        bias: null,
        breakdown: {},
      });
    }
    return out;
  }

  /* ───────────── exchange connections ───────────── */
  open(name, url, { onOpen, onMessage, ping }) {
    if (this.stopped) return;
    this.status[name] = 'connecting';
    let ws;
    try {
      ws = new WebSocket(url);
    } catch {
      this.status[name] = 'error';
      return;
    }
    this.sockets[name] = ws;
    let pingTimer;
    ws.onopen = () => {
      this.status[name] = 'live';
      this.backoff = { ...this.backoff, [name]: 1000 };
      onOpen?.(ws);
      if (ping) pingTimer = setInterval(() => ws.readyState === 1 && ws.send(ping), 20000);
    };
    ws.onmessage = (e) => {
      try {
        onMessage(JSON.parse(e.data), ws);
      } catch {
        /* malformed frame */
      }
    };
    ws.onerror = () => {
      this.status[name] = 'error';
    };
    ws.onclose = () => {
      clearInterval(pingTimer);
      if (this.stopped) return;
      this.status[name] = 'reconnecting';
      const delay = Math.min(30000, (this.backoff?.[name] || 1000) * 2);
      this.backoff = { ...this.backoff, [name]: delay };
      setTimeout(() => this.reconnect(name), delay);
    };
  }

  reconnect(name) {
    if (this.stopped) return;
    if (name === 'binance') this.connectBinance();
    if (name === 'bybit') this.connectBybit();
    if (name === 'hyperliquid') this.connectHyperliquid();
  }

  connectBinance() {
    this.open('binance', BINANCE_WS, {
      onMessage: (arr) => {
        if (!Array.isArray(arr)) return;
        for (const t of arr) {
          if (!t.s || !t.s.endsWith('USDT')) continue;
          this.tick('binance', t.s, t.c, { cumQuote: t.q });
        }
      },
    });
  }

  async bybitSymbols() {
    try {
      const r = await fetch(BYBIT_TICKERS);
      const j = await r.json();
      const list = j?.result?.list || [];
      const syms = [];
      for (const t of list) {
        if (!t.symbol?.endsWith('USDT')) continue;
        syms.push(t.symbol);
        this.tick('bybit', t.symbol, t.lastPrice, { cumQuote: t.turnover24h });
      }
      if (syms.length) return syms;
    } catch {
      /* CORS or geo-block — fall back to Binance's symbol universe */
    }
    await new Promise((r) => setTimeout(r, 4000));
    return [...this.markets.values()].filter((m) => m.exchange === 'binance').map((m) => m.symbol);
  }

  connectBybit() {
    const state = new Map();
    this.open('bybit', BYBIT_WS, {
      ping: JSON.stringify({ op: 'ping' }),
      onOpen: async (ws) => {
        const syms = this.bybitSyms || (this.bybitSyms = await this.bybitSymbols());
        for (let i = 0; i < syms.length; i += 10) {
          if (ws.readyState !== 1) return;
          ws.send(JSON.stringify({ op: 'subscribe', args: syms.slice(i, i + 10).map((s) => `tickers.${s}`) }));
        }
      },
      onMessage: (msg) => {
        if (!msg.topic?.startsWith('tickers.') || !msg.data) return;
        const d = msg.data;
        const prev = state.get(d.symbol) || {};
        const merged = msg.type === 'snapshot' ? d : { ...prev, ...d };
        state.set(d.symbol, merged);
        if (merged.lastPrice) this.tick('bybit', d.symbol, merged.lastPrice, { cumQuote: merged.turnover24h });
      },
    });
  }

  async hlVolumes() {
    try {
      const r = await fetch(HL_INFO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
      });
      const [meta, ctxs] = await r.json();
      meta.universe.forEach((u, i) => {
        const ctx = ctxs[i];
        if (!ctx || u.isDelisted) return;
        this.tick('hyperliquid', `${u.name}USDT`, ctx.midPx || ctx.markPx, { cumQuote: ctx.dayNtlVlm, coin: u.name });
      });
    } catch {
      /* ignore */
    }
  }

  connectHyperliquid() {
    this.hlVolumes();
    if (!this.hlVolTimer) {
      this.hlVolTimer = setInterval(() => !this.stopped && this.hlVolumes(), 30000);
      this.timers.push(this.hlVolTimer);
    }
    this.open('hyperliquid', HL_WS, {
      ping: JSON.stringify({ method: 'ping' }),
      onOpen: (ws) => ws.send(JSON.stringify({ method: 'subscribe', subscription: { type: 'allMids' } })),
      onMessage: (msg) => {
        if (msg.channel !== 'allMids') return;
        const mids = msg.data?.mids || {};
        for (const coin in mids) {
          if (coin.startsWith('@') || coin.includes('/')) continue; // spot pairs
          this.tick('hyperliquid', `${coin}USDT`, mids[coin], { coin });
        }
      },
    });
  }
}

export const liveEngine = new LiveEngine();
export { TF_MIN };
