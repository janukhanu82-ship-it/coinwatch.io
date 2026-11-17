"""
Signal status classification — maps buffer metrics to ppkr.io-style signal labels.
"""
from app.core.ring_buffer import SymbolBuffer


def classify_signal_status(buf: SymbolBuffer) -> str:
    """
    Classify the current state of a symbol buffer into a human-readable
    signal status string, mirroring the categories used by ppkr.io.
    """
    price_change_1m = buf.get_price_change_pct(1)
    price_change_5m = buf.get_price_change_pct(5)
    price_change_15m = buf.get_price_change_pct(15)
    vol_spike = buf.get_volume_spike_ratio()
    oi_change_5m = buf.get_oi_change_pct(300)   # 5 min in seconds

    abs_1m = abs(price_change_1m)
    abs_5m = abs(price_change_5m)

    # --- PUMP DETECTED ---
    if price_change_1m > 1.5 and vol_spike >= 3.0:
        return "PUMP DETECTED 🚀"

    # --- DUMP DETECTED ---
    if price_change_1m < -1.5 and vol_spike >= 3.0:
        return "DUMP DETECTED 🔴"

    # --- BREAKOUT CONFIRMED (check before MOMENTUM so a breakout isn't downgraded) ---
    if abs_5m > 3.0 and vol_spike >= 2.5 and oi_change_5m > 1.0:
        return "BREAKOUT CONFIRMED"

    # --- MOMENTUM BUILDING ---
    if vol_spike >= 2.0 and 0.5 <= abs_1m <= 1.5:
        return "MOMENTUM BUILDING"

    # --- SQUEEZE ALERT ---
    # Price up + OI dropping  →  short squeeze
    # Price down + OI dropping  →  long squeeze
    if (price_change_1m > 0.3 and oi_change_5m < -0.5) or \
       (price_change_1m < -0.3 and oi_change_5m < -0.5):
        return "SQUEEZE ALERT ⚠️"

    # --- PULLBACK / SUPPORT ---
    if price_change_15m < -2.0 and price_change_1m > 0:
        return "PULLBACK / SUPPORT"

    # --- CONSOLIDATION ---
    if vol_spike < 1.5 and abs_1m < 0.3:
        return "CONSOLIDATION"

    # --- DEFAULT ---
    return "ACTIVE"
