import asyncio
import aiohttp
import websockets
import orjson
import logging
import time
from typing import Dict, List, Set
from app.ingestors.base import BaseExchangeIngestor
from app.core.config import settings
from app.core.ring_buffer import market_store
from app.core.models import Candle

logger = logging.getLogger("ingestor.hyperliquid")

class HyperliquidIngestor(BaseExchangeIngestor):
    def __init__(self):
        super().__init__("hyperliquid")
        self.tracked_coins: Set[str] = set()
        self.session: aiohttp.ClientSession = None
        self.ws = None

    async def fetch_meta_and_assets(self):
        """Fetch universe, funding rates, open interest, and 24h volume from Hyperliquid."""
        try:
            url = settings.HYPERLIQUID_INFO_URL
            payload = {"type": "metaAndAssetCtxs"}
            async with self.session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    meta, asset_ctxs = data[0], data[1]
                    universe = meta.get("universe", [])
                    
                    qualifying_coins = []
                    for idx, coin_meta in enumerate(universe):
                        coin_name = coin_meta.get("name")
                        if idx < len(asset_ctxs):
                            ctx = asset_ctxs[idx]
                            day_volume = float(ctx.get("dayNtlVlm", 0.0))
                            mark_px = float(ctx.get("markPx", 0.0))
                            funding = float(ctx.get("funding", 0.0))
                            oi_contracts = float(ctx.get("openInterest", 0.0))
                            oi_usd = oi_contracts * mark_px

                            # Update buffer
                            buf = market_store.get_or_create(self.exchange_name, coin_name)
                            buf.funding_rate = funding
                            buf.record_oi(oi_usd)
                            if mark_px > 0:
                                buf.update_price(mark_px, day_volume)

                            if day_volume >= settings.MIN_24H_VOLUME_USD:
                                qualifying_coins.append((coin_name, day_volume))

                    # Sort by volume descending and take top N
                    qualifying_coins.sort(key=lambda x: x[1], reverse=True)
                    top_coins = {c[0] for c in qualifying_coins[:settings.MAX_SYMBOLS_PER_EXCHANGE]}
                    self.tracked_coins = top_coins
                    logger.info(f"[Hyperliquid] Loaded {len(top_coins)} active liquid coins (Min Vol: ${settings.MIN_24H_VOLUME_USD:,.0f})")

                    # Startup backfill for top 20 Hyperliquid coins
                    async def backfill_hl(cname):
                        try:
                            now_ms = int(time.time() * 1000)
                            payload = {"type": "candleSnapshot", "req": {"coin": cname, "interval": "1m", "startTime": now_ms - (20 * 60 * 1000)}}
                            async with self.session.post(settings.HYPERLIQUID_INFO_URL, json=payload, timeout=aiohttp.ClientTimeout(total=4)) as c_resp:
                                if c_resp.status == 200:
                                    c_list = await c_resp.json()
                                    if isinstance(c_list, list):
                                        buf = market_store.get_or_create(self.exchange_name, cname)
                                        for c in c_list:
                                            buf.add_candle(Candle(
                                                exchange=self.exchange_name,
                                                symbol=cname,
                                                canonical=f"{cname}-PERP",
                                                tf="1m",
                                                open=float(c.get("o", 0)),
                                                high=float(c.get("h", 0)),
                                                low=float(c.get("l", 0)),
                                                close=float(c.get("c", 0)),
                                                volume=float(c.get("v", 0)),
                                                closed=True,
                                                ts=int(c.get("t", 0))
                                            ))
                        except Exception:
                            pass

                    await asyncio.gather(*[backfill_hl(c) for c in list(top_coins)[:20]])
                    logger.info("[Hyperliquid] Backfilled candles for top 20 DEX coins.")

                    # Seed verified past signals into History
                    from app.engine.pump_dump_tracker import pump_dump_tracker
                    for c in list(top_coins)[:20]:
                        b = market_store.buffers.get(f"{self.exchange_name}:{c}")
                        if b:
                            pump_dump_tracker.seed_history_from_buffer(b, sensitivity=0.8)
        except Exception as e:
            logger.error(f"[Hyperliquid] Error fetching meta/assets: {e}")

    async def _poll_meta_loop(self):
        """Periodically refresh Open Interest, Funding, and 24h volume every 30 seconds."""
        while self.is_running:
            await self.fetch_meta_and_assets()
            await asyncio.sleep(30)

    async def _ws_consumer_loop(self):
        """Maintain persistent WebSocket connection to Hyperliquid for live prices and candles."""
        while self.is_running:
            try:
                async with websockets.connect(settings.HYPERLIQUID_WS_URL, ping_interval=20, ping_timeout=10) as ws:
                    self.ws = ws
                    logger.info("[Hyperliquid] Connected to live WebSocket stream.")

                    # 1. Subscribe to all mids (real-time price updates for all coins)
                    await ws.send(orjson.dumps({
                        "method": "subscribe",
                        "subscription": {"type": "allMids"}
                    }).decode())

                    # 2. Subscribe to 1m candles for top tracked coins
                    for coin in list(self.tracked_coins)[:50]:
                        await ws.send(orjson.dumps({
                            "method": "subscribe",
                            "subscription": {"type": "candle", "coin": coin, "interval": "1m"}
                        }).decode())
                        await asyncio.sleep(0.02)  # avoid message burst

                    async for message in ws:
                        if not self.is_running:
                            break
                        data = orjson.loads(message)
                        channel = data.get("channel")
                        
                        if channel == "allMids":
                            mids = data.get("data", {}).get("mids", {})
                            for coin, px_str in mids.items():
                                try:
                                    price = float(px_str)
                                    buf = market_store.get_or_create(self.exchange_name, coin)
                                    buf.update_price(price)
                                except (ValueError, TypeError):
                                    continue
                                    
                        elif channel == "candle":
                            cdata = data.get("data", {})
                            coin = cdata.get("s")
                            if coin:
                                buf = market_store.get_or_create(self.exchange_name, coin)
                                candle = Candle(
                                    exchange=self.exchange_name,
                                    symbol=coin,
                                    canonical=f"{coin}-PERP",
                                    tf="1m",
                                    open=float(cdata.get("o", 0)),
                                    high=float(cdata.get("h", 0)),
                                    low=float(cdata.get("l", 0)),
                                    close=float(cdata.get("c", 0)),
                                    volume=float(cdata.get("v", 0)),
                                    trades_count=int(cdata.get("n", 0)),
                                    closed=False,
                                    ts=int(cdata.get("t", 0))
                                )
                                buf.add_candle(candle)

            except (websockets.ConnectionClosed, asyncio.TimeoutError) as e:
                logger.warning(f"[Hyperliquid] WebSocket disconnected: {e}. Reconnecting in 3s...")
                await asyncio.sleep(3)
            except Exception as e:
                logger.error(f"[Hyperliquid] Unexpected error in WS loop: {e}. Reconnecting in 5s...")
                await asyncio.sleep(5)

    async def start(self):
        self.is_running = True
        self.session = aiohttp.ClientSession()
        await self.fetch_meta_and_assets()
        self._meta_task = asyncio.create_task(self._poll_meta_loop())
        self._ws_task = asyncio.create_task(self._ws_consumer_loop())
        logger.info("[Hyperliquid] Ingestor started successfully.")

    async def stop(self):
        self.is_running = False
        if self._meta_task:
            self._meta_task.cancel()
        if self._ws_task:
            self._ws_task.cancel()
        if self.ws:
            await self.ws.close()
        if self.session:
            await self.session.close()
        logger.info("[Hyperliquid] Ingestor stopped.")
