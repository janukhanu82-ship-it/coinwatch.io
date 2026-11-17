from app.core.models import SignalBreakdown

def calculate_composite_score(breakdown: SignalBreakdown) -> float:
    """
    Computes a balanced 0 to 100 Composite Score reflecting unusual momentum.
    """
    # 1. Price Z-Score (normalized: 0 to 4.0 -> 0 to 1.0)
    z_norm = min(1.0, abs(breakdown.zscore_price) / 4.0)

    # 2. Volume Spike Ratio (normalized: 1.0 to 6.0x -> 0 to 1.0)
    vol_norm = min(1.0, max(0.0, (breakdown.volume_spike_ratio - 1.0) / 5.0))

    # 3. OI Change 5m (normalized: 0 to 8% -> 0 to 1.0)
    oi_norm = min(1.0, abs(breakdown.oi_change_5m) / 8.0)

    # 4. Liquidation Burst (normalized: 0 to $250k -> 0 to 1.0)
    liq_norm = min(1.0, breakdown.liquidation_burst_usd / 250_000.0)

    # 5. Decoupling Boost (if decoupled, extra bonus)
    decouple_bonus = 0.15 if breakdown.is_decoupled else 0.0

    # Weighted sum
    score = (
        (0.30 * z_norm) +
        (0.25 * vol_norm) +
        (0.20 * oi_norm) +
        (0.15 * liq_norm) +
        decouple_bonus
    ) * 100.0

    return round(min(100.0, max(0.0, score)), 1)
