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
from app.core.models import Candle

logger = logging.getLogger("ingestor.bybit")

class BybitIngestor(BaseExchangeIngestor):
    def __init__(self):
        super().__init__("bybit")
        self.tracked_symbols: Set[str] = set()
        self.session: aiohttp.ClientSession = None
        self._ws_task: asyncio.Task = None

    async def fetch_top_symbols(self):
        """Fetch linear tickers from Bybit v5 and select top liquid pairs."""
        try:
            url = f"{settings.BYBIT_REST_URL}/market/tickers?category=linear"
            async with self.session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    tickers = data.get("result", {}).get("list", [])
                    qualifying = []
                    for item in tickers:
                        sym = item.get("symbol", "")
                        if sym.endswith("USDT"):
                            turnover_24h = float(item.get("turnover24h", 0.0))
                            last_px = float(item.get("lastPrice", 0.0))
                            funding = float(item.get("fundingRate", 0.0))
                            oi_val = float(item.get("openInterestValue", 0.0))
                            
                            buf = market_store.get_or_create(self.exchange_name, sym)
                            buf.volume_24h_usd = turnover_24h
                            buf.latest_tick_price = last_px
                            buf.funding_rate = funding
                            buf.record_oi(oi_val)
                            
                            if turnover_24h >= settings.MIN_24H_VOLUME_USD:
                                qualifying.append((sym, turnover_24h))

                    qualifying.sort(key=lambda x: x[1], reverse=True)
                    top_list = [x[0] for x in qualifying[:settings.MAX_SYMBOLS_PER_EXCHANGE]]
                    self.tracked_symbols = set(top_list)
                    logger.info(f"[Bybit] Loaded {len(self.tracked_symbols)} top liquid linear pairs")

                    # Startup backfill for top 25 Bybit pairs
                    async def backfill_bybit(sym):
                        try:
                            k_url = f"{settings.BYBIT_REST_URL}/market/kline?category=linear&symbol={sym}&interval=1&limit=25"
                            async with self.session.get(k_url, timeout=aiohttp.ClientTimeout(total=4)) as k_resp:
                                if k_resp.status == 200:
                                    k_data = await k_resp.json()
                                    k_list = k_data.get("result", {}).get("list", [])
                                    if isinstance(k_list, list):
                                        buf = market_store.get_or_create(self.exchange_name, sym)
                                        for item in reversed(k_list):
                                            candle = Candle(
                                                exchange=self.exchange_name,
                                                symbol=sym,
                                                canonical=f"{sym.replace('USDT', '')}-PERP",
                                                tf="1m",
                                                open=float(item[1]),
                                                high=float(item[2]),
                                                low=float(item[3]),
                                                close=float(item[4]),
                                                volume=float(item[5]),
                                                closed=True,
                                                ts=int(item[0])
                                            )
                                            buf.add_candle(candle)
                        except Exception:
                            pass

                    backfill_targets = top_list[:25]
                    await asyncio.gather(*[backfill_bybit(s) for s in backfill_targets])
                    logger.info(f"[Bybit] Backfilled 1m candles for {len(backfill_targets)} top movers.")

                    from app.engine.pump_dump_tracker import pump_dump_tracker
                    for s in backfill_targets:
                        b = market_store.buffers.get(f"{self.exchange_name}:{s}")
                        if b:
                            pump_dump_tracker.seed_history_from_buffer(b, sensitivity=0.8)
        except Exception as e:
            logger.error(f"[Bybit] Error fetching tickers: {e}")

    async def _ws_consumer_loop(self):
        """Bybit v5 public linear WebSocket."""
        url = settings.BYBIT_WS_URL
        while self.is_running:
            try:
                async with websockets.connect(url, ping_interval=20, ping_timeout=10) as ws:
                    logger.info("[Bybit] Connected to Bybit v5 public WebSocket.")
                    
                    # Subscribe to tickers and 1m klines for top symbols
                    top_coins = list(self.tracked_symbols)[:30]
                    topics = [f"tickers.{s}" for s in top_coins] + [f"kline.1.{s}" for s in top_coins]
                    
                    # Batch subscribe (max 10 per request)
                    for i in range(0, len(topics), 10):
                        batch = topics[i:i+10]
                        sub_msg = {"op": "subscribe", "args": batch}
                        await ws.send(orjson.dumps(sub_msg).decode())
                        await asyncio.sleep(0.05)

                    async for msg in ws:
                        if not self.is_running:
                            break
                        data = orjson.loads(msg)
                        topic = data.get("topic", "")
                        
                        if topic.startswith("tickers."):
                            item = data.get("data", {})
                            sym = item.get("symbol", "")
                            if sym:
                                buf = market_store.get_or_create(self.exchange_name, sym)
                                if "lastPrice" in item and item["lastPrice"]:
                                    buf.latest_tick_price = float(item["lastPrice"])
                                if "turnover24h" in item and item["turnover24h"]:
                                    buf.volume_24h_usd = float(item["turnover24h"])
                                if "fundingRate" in item and item["fundingRate"]:
                                    buf.funding_rate = float(item["fundingRate"])
                                if "openInterestValue" in item and item["openInterestValue"]:
                                    buf.record_oi(float(item["openInterestValue"]))

                        elif topic.startswith("kline.1."):
                            k_list = data.get("data", [])
                            if k_list:
                                item = k_list[0]
                                sym = topic.replace("kline.1.", "")
                                buf = market_store.get_or_create(self.exchange_name, sym)
                                candle = Candle(
                                    exchange=self.exchange_name,
                                    symbol=sym,
                                    canonical=f"{sym.replace('USDT', '')}-PERP",
                                    tf="1m",
                                    open=float(item.get("open", 0.0)),
                                    high=float(item.get("high", 0.0)),
                                    low=float(item.get("low", 0.0)),
                                    close=float(item.get("close", 0.0)),
                                    volume=float(item.get("volume", 0.0)),
                                    closed=bool(item.get("confirm", False)),
                                    ts=int(item.get("start", 0))
                                )
                                buf.add_candle(candle)

            except Exception as e:
                logger.warning(f"[Bybit] WS disconnected: {e}. Reconnecting in 3s...")
                await asyncio.sleep(3)

    async def start(self):
        self.is_running = True
        self.session = aiohttp.ClientSession()
        await self.fetch_top_symbols()
        self._ws_task = asyncio.create_task(self._ws_consumer_loop())
        logger.info("[Bybit] Ingestor started successfully.")

    async def stop(self):
        self.is_running = False
        if self._ws_task:
            self._ws_task.cancel()
        if self.session:
            await self.session.close()
        logger.info("[Bybit] Ingestor stopped.")
