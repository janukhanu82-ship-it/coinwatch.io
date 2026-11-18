/*
  Per-market public data for the Market Detail page.
  History: exchange REST klines (falls back to Binance spot data-api if blocked).
  Live:    exchange WebSocket — kline, order book, ticker, trades.
*/
const HL_INFO = 'https://api.hyperliquid.xyz/info';

export const INTERVALS = ['1m', '3m', '5m', '15m', '1h', '4h', '1d'];
const BYBIT_IV = { '1m': '1', '3m': '3', '5m': '5', '15m': '15', '1h': '60', '4h': '240', '1d': 'D' };
const IV_MS = { '1m': 6e4, '3m': 18e4, '5m': 3e5, '15m': 9e5, '1h': 36e5, '4h': 144e5, '1d': 864e5 };

export function hlCoin(symbol, coin) {
  if (coin) return coin;
  return String(symbol || '').replace(/USDT$/i, '');
}

const num = (x) => Number(x);

async function binanceSpotKlines(symbol, interval) {
  const r = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`);
  if (!r.ok) throw new Error('spot klines');
  const rows = await r.json();
  return rows.map((k) => ({ time: k[0] / 1000, open: num(k[1]), high: num(k[2]), low: num(k[3]), close: num(k[4]), volume: num(k[7]) }));
}

export async function fetchKlines(exchange, symbol, interval, coin) {
  try {
    if (exchange === 'binance') {
      const r = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=500`);
      if (!r.ok) throw new Error('binance');
      const rows = await r.json();
      return rows.map((k) => ({ time: k[0] / 1000, open: num(k[1]), high: num(k[2]), low: num(k[3]), close: num(k[4]), volume: num(k[7]) }));
    }
    if (exchange === 'bybit') {
      const r = await fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${BYBIT_IV[interval]}&limit=500`);
      const j = await r.json();
      const list = j?.result?.list;
      if (!list?.length) throw new Error('bybit');
      return list
        .map((k) => ({ time: num(k[0]) / 1000, open: num(k[1]), high: num(k[2]), low: num(k[3]), close: num(k[4]), volume: num(k[6]) }))
        .reverse();
    }
    if (exchange === 'hyperliquid') {
      const endTime = Date.now();
      const r = await fetch(HL_INFO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'candleSnapshot',
          req: { coin: hlCoin(symbol, coin), interval, startTime: endTime - IV_MS[interval] * 500, endTime },
        }),
      });
      const rows = await r.json();
      if (!Array.isArray(rows) || !rows.length) throw new Error('hl');
      return rows.map((k) => ({ time: k.t / 1000, open: num(k.o), high: num(k.h), low: num(k.l), close: num(k.c), volume: num(k.v) * num(k.c) }));
    }
  } catch {
    /* fall through to spot fallback */
  }
  try {
    return await binanceSpotKlines(symbol, interval);
  } catch {
    return [];
  }
}

/** Opens the live stream; returns a close() function. */
export function openMarketStream(exchange, symbol, interval, coin, h) {
  let ws;
  let closed = false;
  let pingTimer;
  let retry;

  const book = { bids: new Map(), asks: new Map() };
  const emitBook = () => {
    const bids = [...book.bids.entries()].map(([p, s]) => [num(p), s]).sort((a, b) => b[0] - a[0]).slice(0, 45);
    const asks = [...book.asks.entries()].map(([p, s]) => [num(p), s]).sort((a, b) => a[0] - b[0]).slice(0, 45);
    h.onBook?.({ bids, asks });
  };
  const setBook = (bids, asks, replace) => {
    if (replace) {
      book.bids.clear();
      book.asks.clear();
    }
    for (const [p, s] of bids) (num(s) === 0 ? book.bids.delete(p) : book.bids.set(p, num(s)));
    for (const [p, s] of asks) (num(s) === 0 ? book.asks.delete(p) : book.asks.set(p, num(s)));
    emitBook();
  };

  const connect = () => {
    if (closed) return;
    h.onStatus?.('connecting');
    if (exchange === 'binance') {
      const s = symbol.toLowerCase();
      ws = new WebSocket(
        `wss://fstream.binance.com/stream?streams=${s}@kline_${interval}/${s}@depth20@500ms/${s}@ticker/${s}@bookTicker/${s}@aggTrade`,
      );
      ws.onmessage = (e) => {
        const { stream, data: d } = JSON.parse(e.data);
        if (!d) return;
        if (stream.includes('@kline')) {
          const k = d.k;
          h.onKline?.({ time: k.t / 1000, open: num(k.o), high: num(k.h), low: num(k.l), close: num(k.c), volume: num(k.q) });
        } else if (stream.includes('@depth')) setBook(d.b || [], d.a || [], true);
        else if (stream.endsWith('@ticker')) h.onTicker?.({ last: num(d.c), change24: num(d.P), vol24: num(d.q) });
        else if (stream.includes('@bookTicker')) h.onTicker?.({ bid: num(d.b), ask: num(d.a) });
        else if (stream.includes('@aggTrade')) h.onTrade?.({ price: num(d.p), size: num(d.q), side: d.m ? 'sell' : 'buy', time: d.T });
      };
    } else if (exchange === 'bybit') {
      ws = new WebSocket('wss://stream.bybit.com/v5/public/linear');
      ws.onopen = () => {
        h.onStatus?.('live');
        ws.send(
          JSON.stringify({
            op: 'subscribe',
            args: [`kline.${BYBIT_IV[interval]}.${symbol}`, `orderbook.50.${symbol}`, `tickers.${symbol}`, `publicTrade.${symbol}`],
          }),
        );
        pingTimer = setInterval(() => ws.readyState === 1 && ws.send(JSON.stringify({ op: 'ping' })), 20000);
      };
      let tick = {};
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (!m.topic) return;
        if (m.topic.startsWith('kline.')) {
          for (const k of m.data || [])
            h.onKline?.({ time: k.start / 1000, open: num(k.open), high: num(k.high), low: num(k.low), close: num(k.close), volume: num(k.turnover) });
        } else if (m.topic.startsWith('orderbook.')) {
          setBook(m.data.b || [], m.data.a || [], m.type === 'snapshot');
        } else if (m.topic.startsWith('tickers.')) {
          tick = m.type === 'snapshot' ? m.data : { ...tick, ...m.data };
          h.onTicker?.({
            last: num(tick.lastPrice),
            change24: num(tick.price24hPcnt) * 100,
            vol24: num(tick.turnover24h),
            bid: num(tick.bid1Price),
            ask: num(tick.ask1Price),
          });
        } else if (m.topic.startsWith('publicTrade.')) {
          for (const t of m.data || []) h.onTrade?.({ price: num(t.p), size: num(t.v), side: t.S === 'Buy' ? 'buy' : 'sell', time: t.T });
        }
      };
    } else {
      const c = hlCoin(symbol, coin);
      ws = new WebSocket('wss://api.hyperliquid.xyz/ws');
      ws.onopen = () => {
        h.onStatus?.('live');
        for (const sub of [
          { type: 'candle', coin: c, interval },
          { type: 'l2Book', coin: c },
          { type: 'trades', coin: c },
          { type: 'activeAssetCtx', coin: c },
        ])
          ws.send(JSON.stringify({ method: 'subscribe', subscription: sub }));
        pingTimer = setInterval(() => ws.readyState === 1 && ws.send(JSON.stringify({ method: 'ping' })), 30000);
      };
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        const d = m.data;
        if (m.channel === 'candle' && d) {
          h.onKline?.({ time: d.t / 1000, open: num(d.o), high: num(d.h), low: num(d.l), close: num(d.c), volume: num(d.v) * num(d.c) });
        } else if (m.channel === 'l2Book' && d?.levels) {
          const [bids, asks] = d.levels;
          setBook(bids.map((l) => [l.px, l.sz]), asks.map((l) => [l.px, l.sz]), true);
          if (bids[0] && asks[0]) h.onTicker?.({ bid: num(bids[0].px), ask: num(asks[0].px) });
        } else if (m.channel === 'trades' && Array.isArray(d)) {
          for (const t of d) h.onTrade?.({ price: num(t.px), size: num(t.sz), side: t.side === 'B' ? 'buy' : 'sell', time: t.time });
        } else if (m.channel === 'activeAssetCtx' && d?.ctx) {
          const x = d.ctx;
          const last = num(x.midPx || x.markPx);
          const prev = num(x.prevDayPx);
          h.onTicker?.({ last, change24: prev ? ((last - prev) / prev) * 100 : 0, vol24: num(x.dayNtlVlm) });
        }
      };
    }
    if (exchange === 'binance') ws.onopen = () => h.onStatus?.('live');
    ws.onerror = () => h.onStatus?.('error');
    ws.onclose = () => {
      clearInterval(pingTimer);
      if (closed) return;
      h.onStatus?.('reconnecting');
      retry = setTimeout(connect, 3000);
    };
  };

  connect();
  return () => {
    closed = true;
    clearTimeout(retry);
    clearInterval(pingTimer);
    try {
      ws && (ws.onclose = null);
      ws?.close();
    } catch {
      /* noop */
    }
  };
}
