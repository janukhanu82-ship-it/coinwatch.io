import math
from typing import Tuple, Dict, Any
from app.core.ring_buffer import SymbolBuffer
from app.core.models import BiasType, FlowQuadrant, SignalBreakdown

def evaluate_signals_for_buffer(buf: SymbolBuffer) -> Tuple[BiasType, FlowQuadrant, SignalBreakdown]:
    """
    Evaluates statistical signals and market flow for a given SymbolBuffer.
    Returns: (BiasType, FlowQuadrant, SignalBreakdown)
    """
    zscore = buf.get_price_zscore(window=60)
    vol_spike = buf.get_volume_spike_ratio(lookback_candles=20)
    oi_5m = buf.get_oi_change_pct(seconds_ago=300)
    oi_1h = buf.get_oi_change_pct(seconds_ago=3600)
    liq_60s = buf.get_recent_liquidation_notional(window_sec=60)
    price_change_1m = buf.get_price_change_pct(minutes_ago=1)

    # 1. Determine Flow Quadrant (Price vs. OI Matrix)
    # --------------------------------------------------
    flow = FlowQuadrant.NEUTRAL
    if price_change_1m > 0.15:
        if oi_5m > 0.5:
            flow = FlowQuadrant.LONG_BUILDUP      # Price UP + OI UP
        elif oi_5m < -0.5:
            flow = FlowQuadrant.SHORT_SQUEEZE     # Price UP + OI DOWN (Exhaustion squeeze)
    elif price_change_1m < -0.15:
        if oi_5m > 0.5:
            flow = FlowQuadrant.SHORT_BUILDUP     # Price DOWN + OI UP
        elif oi_5m < -0.5:
            flow = FlowQuadrant.LONG_LIQUIDATION  # Price DOWN + OI DOWN (Cascade)

    # 2. Determine Strategy Bias (FOLLOW vs COUNTER)
    # --------------------------------------------------
    bias = BiasType.NEUTRAL
    
    # We inspect the trigger candle if available
    latest_candle = buf.candles[-1] if buf.candles else None
    
    if latest_candle and vol_spike >= 2.5:
        candle_range = max(1e-8, latest_candle.high - latest_candle.low)
        upper_wick = latest_candle.high - max(latest_candle.open, latest_candle.close)
        lower_wick = min(latest_candle.open, latest_candle.close) - latest_candle.low
        
        # Bullish scenarios
        if latest_candle.close > latest_candle.open:
            # If candle closes near high (upper wick < 25%) and OI is expanding -> FOLLOW LONG
            if (upper_wick / candle_range) < 0.25 and oi_5m >= 0:
                bias = BiasType.FOLLOW_LONG
            # If huge rejection wick (>40%) at the top or massive short squeeze liquidation -> COUNTER SHORT
            elif (upper_wick / candle_range) > 0.40 or (zscore >= 3.2 and oi_5m < -1.0):
                bias = BiasType.COUNTER_SHORT
                
        # Bearish scenarios
        else:
            # If candle closes near low (lower wick < 25%) and sellers pressing -> FOLLOW SHORT
            if (lower_wick / candle_range) < 0.25 and oi_5m >= 0:
                bias = BiasType.FOLLOW_SHORT
            # If huge rejection wick (>40%) at the bottom -> COUNTER LONG
            elif (lower_wick / candle_range) > 0.40 or (zscore <= -3.2 and oi_5m < -1.0):
                bias = BiasType.COUNTER_LONG

    breakdown = SignalBreakdown(
        zscore_price=zscore,
        volume_spike_ratio=vol_spike,
        oi_change_5m=oi_5m,
        oi_change_1h=oi_1h,
        liquidation_burst_usd=round(liq_60s, 2),
        funding_extreme_pct=50.0  # Normalized baseline
    )

    return bias, flow, breakdown


def calculate_poa_levels(
    current_price: float,
    bias: BiasType,
    trigger_high: float,
    trigger_low: float,
    timeframe: str = "1m"
) -> Dict[str, Any]:
    """
    Computes algorithmic Entry Zone, DCA laddering, Invalidation (Stop Loss),
    and Take Profit targets scaled by timeframe for high RR setups.
    """
    is_long = bias in (BiasType.FOLLOW_LONG, BiasType.COUNTER_LONG) or "LONG" in bias.value
    candle_height = max(trigger_high - trigger_low, current_price * 0.008)

    # Timeframe multipliers for Risk:Reward
    tf = timeframe.lower()
    if tf == "1m":
        m1, m2, m3, rr = 1.5, 2.5, 3.5, 2.5
    elif tf == "5m":
        m1, m2, m3, rr = 2.0, 3.5, 5.0, 3.5
    elif tf == "15m":
        m1, m2, m3, rr = 2.5, 4.5, 6.5, 4.5
    elif tf == "1h":
        m1, m2, m3, rr = 3.5, 6.0, 9.0, 6.0
    else:  # 4h
        m1, m2, m3, rr = 5.0, 8.5, 12.0, 8.5

    if is_long:
        entry_high = current_price
        entry_low = round(current_price - (candle_height * 0.382), 6)
        dca1 = round(current_price - (candle_height * 0.50), 6)
        dca2 = round(current_price - (candle_height * 0.786), 6)
        stop_loss = round(min(trigger_low, entry_low) * 0.995, 6)
        
        risk = max(1e-6, current_price - stop_loss)
        tp1 = round(current_price + (risk * m1), 6)
        tp2 = round(current_price + (risk * m2), 6)
        tp3 = round(current_price + (risk * m3), 6)
        side = "LONG"
    else:
        entry_low = current_price
        entry_high = round(current_price + (candle_height * 0.382), 6)
        dca1 = round(current_price + (candle_height * 0.50), 6)
        dca2 = round(current_price + (candle_height * 0.786), 6)
        stop_loss = round(max(trigger_high, entry_high) * 1.005, 6)
        
        risk = max(1e-6, stop_loss - current_price)
        tp1 = round(current_price - (risk * m1), 6)
        tp2 = round(current_price - (risk * m2), 6)
        tp3 = round(current_price - (risk * m3), 6)
        side = "SHORT"

    return {
        "side": side,
        "timeframe": timeframe,
        "entry_zone_low": min(entry_low, entry_high),
        "entry_zone_high": max(entry_low, entry_high),
        "dca1": dca1,
        "dca2": dca2,
        "stop_loss": stop_loss,
        "tp1": tp1,
        "tp2": tp2,
        "tp3": tp3,
        "risk_reward_ratio": rr
    }
