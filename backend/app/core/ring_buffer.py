from collections import deque
from typing import Dict, List, Optional, Tuple
import math
import time
from app.core.models import Candle, LiquidationEvent

class SymbolBuffer:
    def __init__(self, symbol: str, exchange: str, max_candles: int = 360):
        self.symbol = symbol
        self.exchange = exchange
        self.max_candles = max_candles
        self.candles: deque[Candle] = deque(maxlen=max_candles)
        self.price_history: deque[Tuple[int, float]] = deque(maxlen=600) # (timestamp_sec, price)
        self.oi_history: deque[Tuple[int, float]] = deque(maxlen=360) # (timestamp_sec, oi_usd)
        self.liquidations: deque[LiquidationEvent] = deque() # rolling window 60s
        self.funding_history: deque[float] = deque(maxlen=168) # 7 days if 1h interval
        self.latest_tick_price: float = 0.0
        self.volume_24h_usd: float = 0.0
        self._prev_vol_24h: float = 0.0
        self.open_interest_usd: float = 0.0
        self.funding_rate: float = 0.0

    def update_price(self, price: float, volume_usd: float = 0.0, ts_ms: Optional[int] = None):
        """Update live price, append to rolling price history, and synthesize 1m candle."""
        if price <= 0:
            return
        self.latest_tick_price = price
        if volume_usd > 0:
            if self._prev_vol_24h > 0 and volume_usd >= self._prev_vol_24h:
                delta_vol = volume_usd - self._prev_vol_24h
                if self.candles:
                    self.candles[-1].volume += delta_vol
            self._prev_vol_24h = volume_usd
            self.volume_24h_usd = volume_usd

        now = ts_ms or int(time.time() * 1000)
        now_sec = int(now / 1000)
        self.price_history.append((now_sec, price))

        # Synthesize / update current 1m candle
        minute_bucket = (now // 60000) * 60000
        if not self.candles or self.candles[-1].ts < minute_bucket:
            if self.candles:
                self.candles[-1].closed = True
            candle = Candle(
                exchange=self.exchange,
                symbol=self.symbol,
                canonical=f"{self.symbol}-PERP",
                tf="1m",
                open=price,
                high=price,
                low=price,
                close=price,
                volume=0.0,
                closed=False,
                ts=minute_bucket
            )
            self.add_candle(candle)
        else:
            curr = self.candles[-1]
            curr.high = max(curr.high, price)
            curr.low = min(curr.low, price)
            curr.close = price

    def add_candle(self, candle: Candle):
        """Append closed candle or update current in-progress candle."""
        if len(self.candles) > 0 and self.candles[-1].ts == candle.ts:
            # Update existing in-progress candle
            self.candles[-1] = candle
        else:
            if self.candles and self.candles[-1].ts < candle.ts:
                self.candles[-1].closed = True
            # New candle arrived
            self.candles.append(candle)
        self.latest_tick_price = candle.close
        # Also add to price history
        c_sec = int(candle.ts / 1000)
        self.price_history.append((c_sec, candle.close))

    def record_oi(self, oi_usd: float, ts_sec: Optional[int] = None):
        now = ts_sec or int(time.time())
        self.open_interest_usd = oi_usd
        self.oi_history.append((now, oi_usd))

    def add_liquidation(self, liq: LiquidationEvent):
        self.liquidations.append(liq)
        self.cleanup_liquidations()

    def cleanup_liquidations(self, window_sec: int = 60):
        cutoff = int(time.time() * 1000) - (window_sec * 1000)
        while self.liquidations and self.liquidations[0].ts < cutoff:
            self.liquidations.popleft()

    def get_recent_liquidation_notional(self, window_sec: int = 60) -> float:
        self.cleanup_liquidations(window_sec)
        return sum(l.notional_usd for l in self.liquidations)

    def get_volume_spike_ratio(self, lookback_candles: int = 20) -> float:
        """
        Calculate current 1m candle volume vs average of previous N candles.
        Includes time-normalization for in-progress candles to avoid distortion.
        """
        if len(self.candles) < 3:
            return 1.0

        current_candle = self.candles[-1]
        
        # Calculate past candles average
        history_candles = list(self.candles)[:-1]
        subset = history_candles[-lookback_candles:] if len(history_candles) >= lookback_candles else history_candles
        
        if not subset:
            return 1.0
            
        avg_vol = sum(c.volume for c in subset) / len(subset)
        if avg_vol <= 0:
            return 1.0

        curr_vol = current_candle.volume
        
        # If candle is in progress, project volume based on elapsed seconds
        now_ms = int(time.time() * 1000)
        elapsed_sec = max(10, min(60, (now_ms - current_candle.ts) / 1000.0))
        projected_vol = curr_vol * (60.0 / elapsed_sec)

        ratio = projected_vol / avg_vol
        return round(ratio, 2)

    def get_price_zscore(self, window: int = 60) -> float:
        """
        Calculate log returns and z-score of current 1m return vs rolling window.
        """
        if len(self.candles) < 10:
            return 0.0

        candles_list = list(self.candles)[-window:]
        returns = []
        for i in range(1, len(candles_list)):
            prev_close = candles_list[i - 1].close
            curr_close = candles_list[i].close
            if prev_close > 0 and curr_close > 0:
                returns.append(math.log(curr_close / prev_close))

        if len(returns) < 5:
            return 0.0

        mean_r = sum(returns) / len(returns)
        var_r = sum((r - mean_r) ** 2 for r in returns) / len(returns)
        std_r = math.sqrt(var_r)

        if std_r <= 1e-8:
            return 0.0

        latest_return = returns[-1]
        z = (latest_return - mean_r) / std_r
        return round(z, 2)

    def get_price_change_pct(self, minutes_ago: int) -> float:
        """Calculate price change % from N minutes ago using rolling price history or candles."""
        current_price = self.latest_tick_price or (self.candles[-1].close if self.candles else 0.0)
        if current_price <= 0:
            return 0.0

        now_sec = int(time.time())
        target_sec = now_sec - (minutes_ago * 60)

        # Check rolling price history first
        if self.price_history:
            past_price = None
            for t, p in self.price_history:
                if t <= target_sec:
                    past_price = p
                else:
                    break
            if past_price and past_price > 0:
                return round(((current_price - past_price) / past_price) * 100, 2)

        # Fallback to candles
        if self.candles:
            if len(self.candles) <= minutes_ago:
                base_price = self.candles[0].open
            else:
                base_price = self.candles[-minutes_ago].open
            if base_price > 0:
                return round(((current_price - base_price) / base_price) * 100, 2)

        return 0.0

    def get_amplitude_pct(self, minutes_ago: int = 1) -> float:
        """Calculate amplitude (high - low) / open over rolling window in percent."""
        now_sec = int(time.time())
        cutoff = now_sec - (minutes_ago * 60)
        
        recent_prices = [p for t, p in self.price_history if t >= cutoff]
        if len(recent_prices) >= 2:
            hi = max(recent_prices)
            lo = min(recent_prices)
            op = recent_prices[0]
            if op > 0:
                return round(((hi - lo) / op) * 100, 2)

        if self.candles:
            c = self.candles[-1]
            if c.open > 0:
                return round(((c.high - c.low) / c.open) * 100, 2)

        return 0.0

    def get_oi_change_pct(self, seconds_ago: int) -> float:
        """Calculate Open Interest change % from N seconds ago."""
        if len(self.oi_history) < 2:
            return 0.0

        now = int(time.time())
        target_time = now - seconds_ago
        curr_oi = self.open_interest_usd

        # Find closest historical point
        past_oi = None
        for t, val in self.oi_history:
            if t <= target_time:
                past_oi = val
            else:
                break

        if past_oi is None:
            past_oi = self.oi_history[0][1]

        if past_oi <= 0:
            return 0.0

        return round(((curr_oi - past_oi) / past_oi) * 100, 2)

    def get_aggregated_candles(self, interval: str = "1m") -> List[Dict]:
        """Aggregates 1m candles into 3m, 5m, 15m, 1h, 4h candles."""
        interval_map = {
            "1m": 1, "3m": 3, "5m": 5, "15m": 15, "30m": 30, "1h": 60, "4h": 240, "1d": 1440
        }
        minutes = interval_map.get(interval.lower(), 1)
        
        if not self.candles:
            if self.latest_tick_price > 0:
                now_sec = int(time.time())
                return [{
                    "time": now_sec,
                    "open": self.latest_tick_price,
                    "high": self.latest_tick_price,
                    "low": self.latest_tick_price,
                    "close": self.latest_tick_price,
                    "volume": 0.0
                }]
            return []

        if minutes == 1:
            res = []
            for c in self.candles:
                res.append({
                    "time": int(c.ts / 1000),
                    "open": c.open,
                    "high": c.high,
                    "low": c.low,
                    "close": c.close,
                    "volume": c.volume
                })
            res.sort(key=lambda x: x["time"])
            return res

        bucket_ms = minutes * 60 * 1000
        buckets: Dict[int, List[Candle]] = {}
        for c in self.candles:
            b_key = (c.ts // bucket_ms) * bucket_ms
            if b_key not in buckets:
                buckets[b_key] = []
            buckets[b_key].append(c)

        agg = []
        for b_ts in sorted(buckets.keys()):
            group = buckets[b_ts]
            agg.append({
                "time": int(b_ts / 1000),
                "open": group[0].open,
                "high": max(c.high for c in group),
                "low": min(c.low for c in group),
                "close": group[-1].close,
                "volume": sum(c.volume for c in group)
            })
        return agg


class MarketStateStore:
    """Singleton in-memory store for all symbols across exchanges."""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MarketStateStore, cls).__new__(cls)
            cls._instance.buffers: Dict[str, SymbolBuffer] = {}
        return cls._instance

    def get_or_create(self, exchange: str, symbol: str) -> SymbolBuffer:
        key = f"{exchange.lower()}:{symbol.upper()}"
        if key not in self.buffers:
            self.buffers[key] = SymbolBuffer(symbol=symbol.upper(), exchange=exchange.lower())
        return self.buffers[key]

    def get_all_buffers(self) -> List[SymbolBuffer]:
        return list(self.buffers.values())

market_store = MarketStateStore()
