import asyncio
import aiohttp
import websockets
import orjson
import logging
import time
from typing import Set, List
from app.ingestors.base import BaseExchangeIngestor
from app.core.config import settings
from app.core.ring_buffer import market_store
from app.core.models import Candle, LiquidationEvent

logger = logging.getLogger("ingestor.binance")

class BinanceIngestor(BaseExchangeIngestor):
    def __init__(self):
        super().__init__("binance")
        self.tracked_symbols: Set[str] = set()
        self.session: aiohttp.ClientSession = None
        self._tasks: List[asyncio.Task] = []

    async def fetch_top_symbols(self):
        """Fetch 24h tickers from Binance Futures and select top liquid USDT-M pairs."""
        try:
            url = f"{settings.BINANCE_FUTURES_REST}/fapi/v1/ticker/24hr"
            async with self.session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    qualifying = []
                    for item in data:
                        sym = item.get("symbol", "")
                        if sym.endswith("USDT"):
                            quote_vol = float(item.get("quoteVolume", 0.0))
                            last_px = float(item.get("lastPrice", 0.0))
                            
                            buf = market_store.get_or_create(self.exchange_name, sym)
                            buf.volume_24h_usd = quote_vol
                            buf.latest_tick_price = last_px
                            
                            if quote_vol >= settings.MIN_24H_VOLUME_USD:
                                qualifying.append((sym, quote_vol))

                    qualifying.sort(key=lambda x: x[1], reverse=True)
                    top_list = [x[0] for x in qualifying[:settings.MAX_SYMBOLS_PER_EXCHANGE]]
                    self.tracked_symbols = set(top_list)
                    logger.info(f"[Binance] Loaded {len(self.tracked_symbols)} top liquid pairs (Min Vol: ${settings.MIN_24H_VOLUME_USD:,.0f})")

                    # Startup backfill for top 40 pairs to get immediate candle history
                    async def backfill_klines(sym):
                        try:
                            k_url = f"{settings.BINANCE_FUTURES_REST}/fapi/v1/klines?symbol={sym}&interval=1m&limit=25"
                            async with self.session.get(k_url, timeout=aiohttp.ClientTimeout(total=4)) as k_resp:
                                if k_resp.status == 200:
                                    klines = await k_resp.json()
                                    if isinstance(klines, list):
                                        buf = market_store.get_or_create(self.exchange_name, sym)
                                        for k in klines:
                                            candle = Candle(
                                                exchange=self.exchange_name,
                                                symbol=sym,
                                                canonical=f"{sym.replace('USDT', '')}-PERP",
                                                tf="1m",
                                                open=float(k[1]),
                                                high=float(k[2]),
                                                low=float(k[3]),
                                                close=float(k[4]),
                                                volume=float(k[5]),
                                                closed=True,
                                                ts=int(k[0])
                                            )
                                            buf.add_candle(candle)
                        except Exception:
                            pass

                    # Run backfill concurrently
                    backfill_targets = top_list[:40]
                    await asyncio.gather(*[backfill_klines(s) for s in backfill_targets])
                    logger.info(f"[Binance] Backfilled 1m candles for {len(backfill_targets)} top movers.")

                    # Seed verified past signals into History
                    from app.engine.pump_dump_tracker import pump_dump_tracker
                    for s in backfill_targets:
                        b = market_store.buffers.get(f"{self.exchange_name}:{s}")
                        if b:
                            pump_dump_tracker.seed_history_from_buffer(b, sensitivity=0.8)
        except Exception as e:
            logger.error(f"[Binance] Error fetching 24hr tickers: {e}")

    async def _mini_ticker_loop(self):
        """All-market 24h mini-tickers stream."""
        url = f"{settings.BINANCE_FUTURES_WS}/!miniTicker@arr"
        while self.is_running:
            try:
                async with websockets.connect(url, ping_interval=20, ping_timeout=10) as ws:
                    logger.info("[Binance] Connected to !miniTicker@arr stream.")
                    async for msg in ws:
                        if not self.is_running:
                            break
                        data = orjson.loads(msg)
                        for item in data:
                            sym = item.get("s", "")
                            if sym.endswith("USDT"):
                                close_px = float(item.get("c", 0.0))
                                vol_usd = float(item.get("q", 0.0))
                                buf = market_store.get_or_create(self.exchange_name, sym)
                                buf.update_price(close_px, vol_usd)
            except Exception as e:
                logger.warning(f"[Binance] MiniTicker WS disconnected: {e}. Reconnecting in 3s...")
                await asyncio.sleep(3)

    async def _mark_price_loop(self):
        """All-market mark price and funding rates."""
        url = f"{settings.BINANCE_FUTURES_WS}/!markPrice@arr@1s"
        while self.is_running:
            try:
                async with websockets.connect(url, ping_interval=20, ping_timeout=10) as ws:
                    logger.info("[Binance] Connected to !markPrice@arr@1s stream.")
                    async for msg in ws:
                        if not self.is_running:
                            break
                        data = orjson.loads(msg)
                        for item in data:
                            sym = item.get("s", "")
                            if sym.endswith("USDT"):
                                funding = float(item.get("r", 0.0))
                                buf = market_store.get_or_create(self.exchange_name, sym)
                                buf.funding_rate = funding
            except Exception as e:
                logger.warning(f"[Binance] MarkPrice WS disconnected: {e}. Reconnecting in 3s...")
                await asyncio.sleep(3)

    async def _liquidations_loop(self):
        """Real-time forced orders (liquidations) stream."""
        url = f"{settings.BINANCE_FUTURES_WS}/!forceOrder@arr"
        while self.is_running:
            try:
                async with websockets.connect(url, ping_interval=20, ping_timeout=10) as ws:
                    logger.info("[Binance] Connected to !forceOrder@arr stream.")
                    async for msg in ws:
                        if not self.is_running:
                            break
                        data = orjson.loads(msg)
                        order = data.get("o", {})
                        sym = order.get("s", "")
                        if sym.endswith("USDT"):
                            side = order.get("S", "")
                            qty = float(order.get("q", 0.0))
                            px = float(order.get("p", 0.0))
                            notional = qty * px
                            buf = market_store.get_or_create(self.exchange_name, sym)
                            buf.add_liquidation(LiquidationEvent(
                                exchange=self.exchange_name,
                                symbol=sym,
                                canonical=f"{sym.replace('USDT', '')}-PERP",
                                side=side,
                                qty=qty,
                                price=px,
                                notional_usd=notional,
                                ts=int(time.time() * 1000)
                            ))
            except Exception as e:
                logger.warning(f"[Binance] ForceOrder WS disconnected: {e}. Reconnecting in 3s...")
                await asyncio.sleep(3)

    async def _combined_klines_loop(self):
        """Combined 1m kline streams for top 50 symbols."""
        while self.is_running:
            if not self.tracked_symbols:
                await asyncio.sleep(2)
                continue
                
            top_symbols = list(self.tracked_symbols)[:50]
            streams = "/".join([f"{s.lower()}@kline_1m" for s in top_symbols])
            url = f"wss://fstream.binance.com/stream?streams={streams}"
            
            try:
                async with websockets.connect(url, ping_interval=20, ping_timeout=10) as ws:
                    logger.info(f"[Binance] Connected to combined kline_1m streams ({len(top_symbols)} pairs).")
                    async for msg in ws:
                        if not self.is_running:
                            break
                        data = orjson.loads(msg)
                        kline_data = data.get("data", {}).get("k", {})
                        if kline_data:
                            sym = kline_data.get("s", "")
                            buf = market_store.get_or_create(self.exchange_name, sym)
                            candle = Candle(
                                exchange=self.exchange_name,
                                symbol=sym,
                                canonical=f"{sym.replace('USDT', '')}-PERP",
                                tf="1m",
                                open=float(kline_data.get("o", 0.0)),
                                high=float(kline_data.get("h", 0.0)),
                                low=float(kline_data.get("l", 0.0)),
                                close=float(kline_data.get("c", 0.0)),
                                volume=float(kline_data.get("v", 0.0)),
                                trades_count=int(kline_data.get("n", 0)),
                                closed=bool(kline_data.get("x", False)),
                                ts=int(kline_data.get("t", 0))
                            )
                            buf.add_candle(candle)
            except Exception as e:
                logger.warning(f"[Binance] Combined Klines WS disconnected: {e}. Reconnecting in 3s...")
                await asyncio.sleep(3)

    async def _oi_polling_loop(self):
        """Poll Open Interest for tracked symbols every 30 seconds."""
        while self.is_running:
            for sym in list(self.tracked_symbols)[:40]:
                if not self.is_running:
                    break
                try:
                    url = f"{settings.BINANCE_FUTURES_REST}/fapi/v1/openInterest?symbol={sym}"
                    async with self.session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            oi_contracts = float(data.get("openInterest", 0.0))
                            buf = market_store.get_or_create(self.exchange_name, sym)
                            oi_usd = oi_contracts * buf.latest_tick_price
                            buf.record_oi(oi_usd)
                except Exception:
                    pass
                await asyncio.sleep(0.5)  # Rate-limit budget
            await asyncio.sleep(25)

    async def start(self):
        self.is_running = True
        self.session = aiohttp.ClientSession()
        await self.fetch_top_symbols()
        self._tasks.append(asyncio.create_task(self._mini_ticker_loop()))
        self._tasks.append(asyncio.create_task(self._mark_price_loop()))
        self._tasks.append(asyncio.create_task(self._liquidations_loop()))
        self._tasks.append(asyncio.create_task(self._combined_klines_loop()))
        self._tasks.append(asyncio.create_task(self._oi_polling_loop()))
        logger.info("[Binance] Ingestor started successfully.")

    async def stop(self):
        self.is_running = False
        for t in self._tasks:
            t.cancel()
        if self.session:
            await self.session.close()
        logger.info("[Binance] Ingestor stopped.")
