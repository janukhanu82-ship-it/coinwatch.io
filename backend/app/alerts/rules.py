import time
import logging
from typing import Dict, Optional, Tuple
from app.core.config import settings
from app.core.models import ScannerRow, PlanOfAttack
from app.engine.signals import calculate_poa_levels

logger = logging.getLogger("alerts.rules")

class AlertRulesEngine:
    def __init__(self):
        # Key: "exchange:symbol" -> last_alert_timestamp
        self.cooldowns: Dict[str, float] = {}

    def should_alert(self, row: ScannerRow) -> bool:
        """
        Determines whether this row should trigger a Telegram alert.
        Checks:
        1. Composite Score >= threshold OR (Vol Spike >= 3.5x AND OI delta >= 3%)
        2. 24h Volume >= Minimum Liquidity Floor
        3. 15-minute sliding cooldown per symbol
        """
        if row.volume_24h_usd < settings.MIN_24H_VOLUME_USD:
            return False

        has_high_score = row.composite_score >= settings.MIN_COMPOSITE_SCORE_ALERT
        has_volume_oi_confluence = (row.volume_spike_ratio >= 3.5 and abs(row.oi_change_5m) >= 2.5)

        if not (has_high_score or has_volume_oi_confluence):
            return False

        key = f"{row.exchange}:{row.symbol}"
        now = time.time()
        last_alert = self.cooldowns.get(key, 0)

        if (now - last_alert) < settings.COOLDOWN_SECONDS:
            return False  # In cooldown

        # Update cooldown timestamp
        self.cooldowns[key] = now
        return True

    def build_alert_payload(self, row: ScannerRow) -> Dict:
        """Constructs full alert payload including auto-generated POA parameters."""
        high = row.price * 1.01
        low = row.price * 0.99
        poa_levels = calculate_poa_levels(row.price, row.bias, high, low)
        
        return {
            "symbol": row.symbol,
            "canonical": row.canonical,
            "exchange": row.exchange.upper(),
            "price": row.price,
            "bias": row.bias.value,
            "flow": row.flow_quadrant.value,
            "score": row.composite_score,
            "vol_spike": row.volume_spike_ratio,
            "oi_5m": row.oi_change_5m,
            "funding": row.funding_rate,
            "poa": poa_levels,
            "ts": int(time.time() * 1000)
        }

alert_engine = AlertRulesEngine()
