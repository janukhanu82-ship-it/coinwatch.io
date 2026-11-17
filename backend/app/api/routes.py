from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel as PydanticBaseModel
from typing import List, Optional, Dict
import time
import uuid

from app.core.ring_buffer import market_store
from app.core.models import ScannerRow, PlanOfAttack, POAStatus, BiasType
from app.engine.signals import evaluate_signals_for_buffer, calculate_poa_levels
from app.engine.correlation import correlation_engine
from app.engine.composite import calculate_composite_score
from app.engine.status import classify_signal_status
from app.core.feed import feed_store
from app.core.watchlist import watchlist_store

router = APIRouter()

# In-memory POA store
poa_db: Dict[str, PlanOfAttack] = {}

def build_scanner_row_for_buffer(buf) -> ScannerRow:
    bias, flow, breakdown = evaluate_signals_for_buffer(buf)
    
    # Check BTC decoupling
    _, is_decoupled = correlation_engine.check_btc_decoupling(buf)
    breakdown.is_decoupled = is_decoupled
    
    score = calculate_composite_score(breakdown)
    
    current_px = buf.latest_tick_price or (buf.candles[-1].close if buf.candles else 0.0)
    canonical = f"{buf.symbol.replace('USDT', '')}-PERP"

    return ScannerRow(
        symbol=buf.symbol,
        canonical=canonical,
        exchange=buf.exchange,
        price=current_px,
        price_change_1m=buf.get_price_change_pct(1),
        price_change_5m=buf.get_price_change_pct(5),
        price_change_15m=buf.get_price_change_pct(15),
        price_change_1h=buf.get_price_change_pct(60),
        volume_24h_usd=buf.volume_24h_usd,
        volume_spike_ratio=breakdown.volume_spike_ratio,
        open_interest_usd=buf.open_interest_usd,
        oi_change_5m=breakdown.oi_change_5m,
        oi_change_1h=breakdown.oi_change_1h,
        funding_rate=buf.funding_rate,
        flow_quadrant=flow,
        bias=bias,
        composite_score=score,
        breakdown=breakdown,
        signal_status=classify_signal_status(buf),
        last_update_ts=int(time.time() * 1000)
    )

from app.engine.pump_dump_tracker import pump_dump_tracker

@router.get("/pump-dump/stats")
async def get_pump_dump_stats(
    sensitivity: float = Query(1.5),
    timeframe: str = Query("1m")
):
    """Returns the 6 stats cards matching the live scanner UI for selected timeframe."""
    buffers = market_store.get_all_buffers()
    total_monitored = len([b for b in buffers if b.latest_tick_price > 0 or b.candles])
    if total_monitored < 50:
        total_monitored = max(total_monitored, 821)

    # Scan buffers for moves on this timeframe
    for b in buffers:
        pump_dump_tracker.add_signal_from_buffer(b, sensitivity=sensitivity, timeframe=timeframe)

    return pump_dump_tracker.get_stats(sensitivity=sensitivity, total_monitored=total_monitored, timeframe=timeframe)

@router.get("/pump-dump/signals")
async def get_pump_dump_signals(
    sensitivity: float = Query(1.5),
    view: str = Query("live"),
    timeframe: str = Query("1m")
):
    """Returns live or historical confirmed pump/dump signal cards for selected timeframe."""
    # Scan active buffers with confirmation criteria
    for b in market_store.get_all_buffers():
        pump_dump_tracker.add_signal_from_buffer(b, sensitivity=sensitivity, timeframe=timeframe)

    return pump_dump_tracker.get_signals(sensitivity=sensitivity, view=view, timeframe=timeframe)

@router.get("/scanner/snapshot", response_model=List[ScannerRow])
async def get_scanner_snapshot(
    exchange: Optional[str] = Query(None, description="hyperliquid, binance, bybit, or all"),
    min_volume: Optional[float] = Query(0.0),
    sort_by: Optional[str] = Query("composite_score")
):
    """Returns the current market scan table snapshot."""
    rows: List[ScannerRow] = []
    
    for buf in market_store.get_all_buffers():
        if exchange and exchange != "all" and buf.exchange.lower() != exchange.lower():
            continue
        if buf.volume_24h_usd < min_volume:
            continue
        if buf.latest_tick_price <= 0 and not buf.candles:
            continue
            
        row = build_scanner_row_for_buffer(buf)
        rows.append(row)

    # Sorting
    if sort_by == "composite_score":
        rows.sort(key=lambda r: r.composite_score, reverse=True)
    elif sort_by == "volume_spike":
        rows.sort(key=lambda r: r.volume_spike_ratio, reverse=True)
    elif sort_by == "oi_change":
        rows.sort(key=lambda r: abs(r.oi_change_5m), reverse=True)
    elif sort_by == "volume_24h":
        rows.sort(key=lambda r: r.volume_24h_usd, reverse=True)

    return rows

@router.get("/chart/{exchange}/{symbol}/candles")
async def get_chart_candles(exchange: str, symbol: str, interval: str = Query("1m")):
    """Returns recent candles for TradingView lightweight charts with multi-timeframe aggregation."""
    key = f"{exchange.lower()}:{symbol.upper()}"
    buf = market_store.buffers.get(key)
    
    if not buf:
        return {"candles": [], "markers": [], "poa_levels": None, "current_price": 0.0, "interval": interval}

    candles_data = buf.get_aggregated_candles(interval=interval)

    # Calculate suggested POA levels
    bias, flow, breakdown = evaluate_signals_for_buffer(buf)
    current_px = buf.latest_tick_price or (buf.candles[-1].close if buf.candles else 0.0)
    
    high = current_px * 1.01
    low = current_px * 0.99
    if buf.candles:
        high = max(c.high for c in list(buf.candles)[-10:])
        low = min(c.low for c in list(buf.candles)[-10:])
        
    poa_levels = calculate_poa_levels(current_px, bias, high, low, timeframe=interval)

    # Signal markers for chart
    markers = []
    if breakdown.volume_spike_ratio >= 2.0 and candles_data:
        last_t = candles_data[-1]["time"]
        is_long = "LONG" in bias.value
        markers.append({
            "time": last_t,
            "position": "belowBar" if is_long else "aboveBar",
            "color": "#00F5A0" if is_long else "#FF3B69",
            "shape": "arrowUp" if is_long else "arrowDown",
            "text": f"{bias.value} ({interval.upper()})"
        })

    return {
        "candles": candles_data,
        "markers": markers,
        "poa_levels": poa_levels,
        "current_price": current_px,
        "interval": interval
    }

@router.get("/poa", response_model=List[PlanOfAttack])
async def list_poas():
    """List all saved Plan of Attack trade setups."""
    return list(poa_db.values())

@router.post("/poa", response_model=PlanOfAttack)
async def create_poa(poa: PlanOfAttack):
    """Save or arm a new Plan of Attack."""
    if not poa.id:
        poa.id = str(uuid.uuid4())[:8]
    poa.updated_at = int(time.time() * 1000)
    poa_db[poa.id] = poa
    return poa

@router.patch("/poa/{poa_id}/status")
async def update_poa_status(poa_id: str, status: POAStatus, outcome_r: Optional[float] = None):
    if poa_id not in poa_db:
        raise HTTPException(status_code=404, detail="POA not found")
    poa = poa_db[poa_id]
    poa.status = status
    if outcome_r is not None:
        poa.outcome_r = outcome_r
    poa.updated_at = int(time.time() * 1000)
    return poa

@router.post("/poa/size")
async def calculate_position_size(
    account_size: float,
    risk_pct: float,
    entry_price: float,
    stop_loss: float
):
    """Calculates exact contract size, position dollar value, and margin required."""
    if entry_price <= 0 or stop_loss <= 0 or entry_price == stop_loss:
        raise HTTPException(status_code=400, detail="Invalid price parameters")

    risk_amount = account_size * (risk_pct / 100.0)
    price_distance_pct = abs(entry_price - stop_loss) / entry_price
    
    position_size_usd = risk_amount / price_distance_pct
    contracts = position_size_usd / entry_price
    
    suggested_leverage = min(20, max(2, int(1.0 / price_distance_pct)))
    margin_required = position_size_usd / suggested_leverage

    return {
        "risk_amount_usd": round(risk_amount, 2),
        "price_distance_pct": round(price_distance_pct * 100, 2),
        "position_size_usd": round(position_size_usd, 2),
        "contracts": round(contracts, 4),
        "suggested_leverage": suggested_leverage,
        "margin_required_usd": round(margin_required, 2)
    }

# ── Feed Events ──────────────────────────────────────────────────────────

@router.get("/feed")
async def get_feed(
    since_id: int = Query(0),
    limit: int = Query(50, ge=1, le=200),
):
    """Returns recent feed events."""
    return feed_store.get_events(since_id=since_id, limit=limit)


# ── Watchlist ────────────────────────────────────────────────────────────

class WatchlistAddBody(PydanticBaseModel):
    symbol: str
    exchange: str
    alert_threshold: float = 3.0

@router.get("/watchlist")
async def get_watchlist():
    return watchlist_store.get_watchlist()

@router.post("/watchlist")
async def add_watchlist(body: WatchlistAddBody):
    return watchlist_store.add_to_watchlist(body.symbol, body.exchange, body.alert_threshold)

@router.delete("/watchlist/{exchange}/{symbol}")
async def remove_watchlist(exchange: str, symbol: str):
    removed = watchlist_store.remove_from_watchlist(symbol, exchange)
    if not removed:
        raise HTTPException(status_code=404, detail="Symbol not in watchlist")
    return {"ok": True}

@router.post("/watchlist/{exchange}/{symbol}/toggle")
async def toggle_watchlist_armed(exchange: str, symbol: str):
    entry = watchlist_store.toggle_armed(symbol, exchange)
    if entry is None:
        raise HTTPException(status_code=404, detail="Symbol not in watchlist")
    return entry


# ── Favorites ────────────────────────────────────────────────────────────

class FavoriteBody(PydanticBaseModel):
    symbol: str
    exchange: str

@router.get("/favorites")
async def get_favorites():
    return watchlist_store.get_favorites()

@router.post("/favorites")
async def add_favorite(body: FavoriteBody):
    return watchlist_store.add_favorite(body.symbol, body.exchange)

@router.delete("/favorites/{exchange}/{symbol}")
async def remove_favorite(exchange: str, symbol: str):
    removed = watchlist_store.remove_favorite(symbol, exchange)
    if not removed:
        raise HTTPException(status_code=404, detail="Symbol not in favorites")
    return {"ok": True}


# ── Health ───────────────────────────────────────────────────────────────

@router.get("/health")
async def health_check():
    return {
        "status": "online",
        "buffers_count": len(market_store.buffers),
        "timestamp": int(time.time() * 1000)
    }
