from typing import Dict, Optional, Tuple
from app.core.ring_buffer import market_store, SymbolBuffer

class CorrelationEngine:
    def __init__(self):
        pass

    def get_btc_buffer(self) -> Optional[SymbolBuffer]:
        """Look for BTC in Hyperliquid, then Binance, then Bybit."""
        for ex, sym in [("hyperliquid", "BTC"), ("binance", "BTCUSDT"), ("bybit", "BTCUSDT")]:
            key = f"{ex}:{sym}"
            if key in market_store.buffers:
                return market_store.buffers[key]
        return None

    def check_btc_decoupling(self, buf: SymbolBuffer) -> Tuple[float, bool]:
        """
        Calculates correlation with BTC over the last 15 minutes.
        Returns: (correlation_score: float, is_decoupled: bool)
        """
        btc_buf = self.get_btc_buffer()
        if not btc_buf or len(btc_buf.candles) < 15 or len(buf.candles) < 15:
            return 1.0, False

        btc_change_15m = btc_buf.get_price_change_pct(15)
        coin_change_15m = buf.get_price_change_pct(15)
        vol_spike = buf.get_volume_spike_ratio(20)

        # If BTC is relatively flat (|change| <= 0.4%) but the coin is ripping (|change| >= 2.5%)
        # with strong volume -> Decoupled Outperformer
        if abs(btc_change_15m) <= 0.40 and abs(coin_change_15m) >= 2.5 and vol_spike >= 2.5:
            return 0.1, True

        # If coin is moving inversely to BTC (e.g. BTC dumping, coin pumping)
        if btc_change_15m < -0.5 and coin_change_15m > 1.5:
            return -0.8, True

        return 0.85, False

    def detect_cross_exchange_divergence(self, canonical_coin: str) -> Optional[Dict[str, str]]:
        """
        Checks if Hyperliquid is leading Binance/Bybit on this canonical coin.
        E.g. canonical: "SOL"
        """
        hl_buf = market_store.buffers.get(f"hyperliquid:{canonical_coin}")
        binance_buf = market_store.buffers.get(f"binance:{canonical_coin}USDT")
        
        if not hl_buf or not binance_buf:
            return None

        hl_1m = hl_buf.get_price_change_pct(1)
        binance_1m = binance_buf.get_price_change_pct(1)

        # If Hyperliquid moved >= 0.8% while Binance is lagging (< 0.2%)
        if abs(hl_1m) >= 0.8 and abs(binance_1m) <= 0.2:
            direction = "UP" if hl_1m > 0 else "DOWN"
            return {
                "type": "HL_LEADING",
                "message": f"Hyperliquid leading Binance {direction} by {abs(hl_1m - binance_1m):.2f}%"
            }

        return None

correlation_engine = CorrelationEngine()
