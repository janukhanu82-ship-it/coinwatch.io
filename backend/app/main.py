import asyncio
import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.core.config import settings
from app.core.ring_buffer import market_store
from app.core.feed import feed_store
from app.engine.status import classify_signal_status
from app.ingestors.hyperliquid import HyperliquidIngestor
from app.ingestors.binance import BinanceIngestor
from app.ingestors.bybit import BybitIngestor
from app.api.routes import router as api_router, build_scanner_row_for_buffer
from app.api.ws import ws_hub
from app.alerts.rules import alert_engine
from app.alerts.telegram import telegram_dispatcher

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("main")

# Instantiate Ingestors
hl_ingestor = HyperliquidIngestor()
binance_ingestor = BinanceIngestor()
bybit_ingestor = BybitIngestor()

from app.engine.pump_dump_tracker import pump_dump_tracker

signal_event_cooldowns: dict[str, float] = {}

async def background_scanner_loop():
    """Periodically scans buffers, computes scores, triggers alerts, and broadcasts WS updates."""
    while True:
        try:
            updates = []
            now = time.time()
            for buf in market_store.get_all_buffers():
                if buf.volume_24h_usd < settings.MIN_24H_VOLUME_USD and not buf.candles:
                    continue
                if buf.latest_tick_price <= 0:
                    continue

                row = build_scanner_row_for_buffer(buf)
                status = classify_signal_status(buf)
                row.signal_status = status

                # Check if alert should trigger
                if alert_engine.should_alert(row):
                    payload = alert_engine.build_alert_payload(row)
                    asyncio.create_task(telegram_dispatcher.send_alert(payload))
                    # Also broadcast alert event to connected UI clients
                    asyncio.create_task(ws_hub.broadcast("ALERT_TRIGGERED", payload))

                    alert_event = feed_store.add_event(
                        type="ALERT",
                        symbol=row.symbol,
                        exchange=row.exchange,
                        message=f"{row.symbol} ({row.exchange.upper()}) ALERT: {row.bias.value} | {status} (Score {row.composite_score})",
                        data=payload
                    )
                    asyncio.create_task(ws_hub.broadcast("FEED_EVENT", alert_event))

                # Log events to feed_store when signals trigger
                buf_key = f"{row.exchange}:{row.symbol}"
                if row.volume_spike_ratio >= 2.5 or row.composite_score >= 60:
                    last_logged = signal_event_cooldowns.get(buf_key, 0)
                    if (now - last_logged) >= 60.0:  # 60s cooldown per symbol
                        signal_event_cooldowns[buf_key] = now
                        sig_event = feed_store.add_event(
                            type="SIGNAL",
                            symbol=row.symbol,
                            exchange=row.exchange,
                            message=f"{row.symbol} ({row.exchange.upper()}): {status} | Score: {row.composite_score} | Vol: {row.volume_spike_ratio}x",
                            data={
                                "price": row.price,
                                "composite_score": row.composite_score,
                                "volume_spike_ratio": row.volume_spike_ratio,
                                "signal_status": status,
                                "bias": row.bias.value,
                                "flow": row.flow_quadrant.value,
                            }
                        )
                        asyncio.create_task(ws_hub.broadcast("FEED_EVENT", sig_event))

                # Track pump / dump moves across multiple timeframes (1m, 5m, 15m, 1h)
                for tf in ["1m", "5m", "15m", "1h"]:
                    pd_signal = pump_dump_tracker.add_signal_from_buffer(buf, sensitivity=0.4, timeframe=tf)
                    if pd_signal:
                        asyncio.create_task(ws_hub.broadcast("NEW_PUMP_DUMP_SIGNAL", pd_signal))
                        total_m = max(len([b for b in market_store.get_all_buffers() if b.latest_tick_price > 0 or b.candles]), 821)
                        stats_payload = pump_dump_tracker.get_stats(sensitivity=0.5, total_monitored=total_m, timeframe=tf)
                        asyncio.create_task(ws_hub.broadcast("STATS_UPDATE", stats_payload))

                # If score or volume is notable, include in diff
                if row.composite_score >= 40 or row.volume_spike_ratio >= 1.5:
                    updates.append(row.model_dump())

            if updates:
                # Sort top 50 movers and broadcast
                updates.sort(key=lambda x: x["composite_score"], reverse=True)
                await ws_hub.broadcast("SCANNER_TICK", updates[:60])

        except Exception as e:
            logger.error(f"Error in background scanner loop: {e}")

        await asyncio.sleep(0.5)  # 500ms broadcast cycle (ultra smooth, zero lag)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}...")
    
    # 1. Start Exchange Ingestors
    if "hyperliquid" in settings.EXCHANGES_ENABLED:
        asyncio.create_task(hl_ingestor.start())
    if "binance" in settings.EXCHANGES_ENABLED:
        asyncio.create_task(binance_ingestor.start())
    if "bybit" in settings.EXCHANGES_ENABLED:
        asyncio.create_task(bybit_ingestor.start())

    # 2. Start Scanner & Alert Dispatcher loop
    scanner_task = asyncio.create_task(background_scanner_loop())

    yield

    logger.info("Shutting down Perp Scanner...")
    scanner_task.cancel()
    await hl_ingestor.stop()
    await binance_ingestor.stop()
    await bybit_ingestor.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
import os

# Mount REST API
app.include_router(api_router, prefix="/api")

# Mount Live WebSocket
@app.websocket("/ws/scanner")
async def websocket_scanner_endpoint(websocket: WebSocket):
    await ws_hub.connect(websocket)
    try:
        while True:
            # Keep alive and listen for client filter changes
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_hub.disconnect(websocket)
    except Exception:
        ws_hub.disconnect(websocket)

# Mount Frontend static files if built
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")


if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=False)
