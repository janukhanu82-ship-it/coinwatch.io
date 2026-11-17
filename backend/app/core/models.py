from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from enum import Enum
import time

class BiasType(str, Enum):
    FOLLOW_LONG = "FOLLOW_LONG"
    FOLLOW_SHORT = "FOLLOW_SHORT"
    COUNTER_LONG = "COUNTER_LONG"
    COUNTER_SHORT = "COUNTER_SHORT"
    NEUTRAL = "NEUTRAL"

class FlowQuadrant(str, Enum):
    LONG_BUILDUP = "LONG_BUILDUP"         # Price UP + OI UP
    SHORT_SQUEEZE = "SHORT_SQUEEZE"       # Price UP + OI DOWN
    SHORT_BUILDUP = "SHORT_BUILDUP"       # Price DOWN + OI UP
    LONG_LIQUIDATION = "LONG_LIQUIDATION" # Price DOWN + OI DOWN
    NEUTRAL = "NEUTRAL"

class POAStatus(str, Enum):
    DRAFT = "DRAFT"
    ARMED = "ARMED"
    TRIGGERED = "TRIGGERED"
    INVALIDATED = "INVALIDATED"
    CLOSED = "CLOSED"

class Candle(BaseModel):
    exchange: str
    symbol: str
    canonical: str
    tf: str = "1m"
    open: float
    high: float
    low: float
    close: float
    volume: float
    trades_count: Optional[int] = 0
    closed: bool = False
    ts: int  # millisecond epoch

class NormalizedTick(BaseModel):
    exchange: str
    symbol: str
    canonical: str
    price: float
    volume_24h: float
    high_24h: Optional[float] = 0.0
    low_24h: Optional[float] = 0.0
    funding_rate: Optional[float] = 0.0
    open_interest: Optional[float] = 0.0
    ts: int = Field(default_factory=lambda: int(time.time() * 1000))

class LiquidationEvent(BaseModel):
    exchange: str
    symbol: str
    canonical: str
    side: str  # "BUY" (short liq) or "SELL" (long liq)
    qty: float
    price: float
    notional_usd: float
    ts: int

class SignalBreakdown(BaseModel):
    zscore_price: float = 0.0
    volume_spike_ratio: float = 1.0
    oi_change_5m: float = 0.0
    oi_change_1h: float = 0.0
    funding_extreme_pct: float = 50.0
    liquidation_burst_usd: float = 0.0
    btc_correlation: float = 1.0
    is_decoupled: bool = False

class ScannerRow(BaseModel):
    symbol: str
    canonical: str
    exchange: str
    price: float
    price_change_1m: float = 0.0
    price_change_5m: float = 0.0
    price_change_15m: float = 0.0
    price_change_1h: float = 0.0
    price_change_24h: float = 0.0
    volume_24h_usd: float = 0.0
    volume_spike_ratio: float = 1.0
    open_interest_usd: float = 0.0
    oi_change_5m: float = 0.0
    oi_change_1h: float = 0.0
    funding_rate: float = 0.0
    flow_quadrant: FlowQuadrant = FlowQuadrant.NEUTRAL
    bias: BiasType = BiasType.NEUTRAL
    composite_score: float = 0.0
    breakdown: SignalBreakdown = Field(default_factory=SignalBreakdown)
    signal_status: str = "ACTIVE"
    last_update_ts: int = Field(default_factory=lambda: int(time.time() * 1000))
    last_alert_ts: Optional[int] = None

class PlanOfAttack(BaseModel):
    id: str
    symbol: str
    canonical: str
    exchange: str
    side: str  # "LONG" or "SHORT"
    bias: BiasType = BiasType.NEUTRAL
    thesis: str = ""
    current_price: float
    entry_zone_low: float
    entry_zone_high: float
    dca1: Optional[float] = None
    dca2: Optional[float] = None
    stop_loss: float
    tp1: float
    tp2: Optional[float] = None
    tp3: Optional[float] = None
    risk_reward_ratio: float = 2.0
    account_size_usd: float = 10000.0
    risk_percentage: float = 1.0
    risk_usd: float = 100.0
    suggested_position_usd: float = 0.0
    suggested_contracts: float = 0.0
    suggested_leverage: int = 5
    margin_required_usd: float = 0.0
    status: POAStatus = POAStatus.DRAFT
    outcome_r: Optional[float] = None
    created_at: int = Field(default_factory=lambda: int(time.time() * 1000))
    updated_at: int = Field(default_factory=lambda: int(time.time() * 1000))
