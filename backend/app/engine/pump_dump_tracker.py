import time
import threading
from typing import Dict, List, Optional, Set
from datetime import datetime

class PumpDumpTracker:
    def __init__(self, max_history: int = 500):
        self.max_history = max_history
        self._signals: List[Dict] = []
        self._cooldowns: Dict[str, float] = {}
        self._seen_candle_keys: Set[str] = set()
        self._lock = threading.Lock()
        self._next_id = 1
        self._last_event_time = datetime.now().strftime("%I:%M:%S %p")
        self.pumps_count = 0
        self.dumps_count = 0

    def _evaluate_candle(self, buf, candle, sensitivity: float, timeframe: str = "1m") -> Optional[Dict]:
        """Evaluates a candle for confirmation, directional indication, and High RR trade levels."""
        # Handle dict or Candle object
        if isinstance(candle, dict):
            open_px = float(candle.get("open", 0))
            close_px = float(candle.get("close", 0))
            high_px = float(candle.get("high", 0))
            low_px = float(candle.get("low", 0))
            vol = float(candle.get("volume", 0))
            candle_ts = int(candle.get("time", 0)) * 1000
            is_closed = True
        else:
            open_px = candle.open
            close_px = candle.close
            high_px = candle.high
            low_px = candle.low
            vol = candle.volume
            candle_ts = candle.ts
            is_closed = candle.closed

        candle_range = high_px - low_px
        if open_px <= 0 or candle_range <= 0:
            return None

        # Calculate price change & amplitude
        change_pct = ((close_px - open_px) / open_px) * 100
        amplitude = (candle_range / open_px) * 100

        # Magnitude check against user sensitivity
        if abs(change_pct) < sensitivity:
            return None

        # Volume confirmation
        vol_spike = buf.get_volume_spike_ratio(20)
        candle_vol = vol * close_px if (vol > 0 and vol < 1e9) else (buf.volume_24h_usd / 1440.0)
        
        # Thresholds scale with timeframe
        min_vol_req = 8_000.0 if timeframe == "1m" else (18_000.0 if timeframe == "5m" else 30_000.0)
        has_volume = (vol_spike >= 1.3) or (candle_vol >= min_vol_req) or (buf.volume_24h_usd >= 3_000_000.0)
        if not has_volume:
            return None

        # Directional Wick rejection analysis
        upper_wick = high_px - max(open_px, close_px)
        lower_wick = min(open_px, close_px) - low_px

        tf_label = timeframe.upper()
        if change_pct > 0:
            # Bullish / Long: close must be near the high (upper wick <= 45% of range)
            if (upper_wick / candle_range) > 0.45:
                return None
            direction = "LONG"
            signal_type = "PUMP"
            
            # Risk:Reward math for Long
            stop_loss = round(low_px * 0.995, 6)
            risk = max(1e-6, close_px - stop_loss)
            
            if timeframe == "1m":
                rr = 2.0
                signal_label = "CONFIRMED LONG (1M SCALP)"
                tp1 = round(close_px + (risk * 1.5), 6)
                tp2 = round(close_px + (risk * 2.5), 6)
                tp3 = round(close_px + (risk * 3.5), 6)
            elif timeframe == "5m":
                rr = 2.8
                signal_label = "CONFIRMED LONG (5M MOMENTUM)"
                tp1 = round(close_px + (risk * 2.0), 6)
                tp2 = round(close_px + (risk * 3.5), 6)
                tp3 = round(close_px + (risk * 5.0), 6)
            elif timeframe == "15m":
                rr = 3.8
                signal_label = "CONFIRMED LONG (15M INTRADAY)"
                tp1 = round(close_px + (risk * 2.5), 6)
                tp2 = round(close_px + (risk * 4.5), 6)
                tp3 = round(close_px + (risk * 6.5), 6)
            elif timeframe == "1h":
                rr = 5.5
                signal_label = "CONFIRMED LONG (1H HIGH RR SWING)"
                tp1 = round(close_px + (risk * 3.5), 6)
                tp2 = round(close_px + (risk * 6.0), 6)
                tp3 = round(close_px + (risk * 9.0), 6)
            else: # 4h
                rr = 8.0
                signal_label = "CONFIRMED LONG (4H MACRO TREND)"
                tp1 = round(close_px + (risk * 5.0), 6)
                tp2 = round(close_px + (risk * 8.5), 6)
                tp3 = round(close_px + (risk * 12.0), 6)
        else:
            # Bearish / Short: close must be near the low (lower wick <= 45% of range)
            if (lower_wick / candle_range) > 0.45:
                return None
            direction = "SHORT"
            signal_type = "DUMP"
            
            # Risk:Reward math for Short
            stop_loss = round(high_px * 1.005, 6)
            risk = max(1e-6, stop_loss - close_px)
            
            if timeframe == "1m":
                rr = 2.0
                signal_label = "CONFIRMED SHORT (1M SCALP)"
                tp1 = round(close_px - (risk * 1.5), 6)
                tp2 = round(close_px - (risk * 2.5), 6)
                tp3 = round(close_px - (risk * 3.5), 6)
            elif timeframe == "5m":
                rr = 2.8
                signal_label = "CONFIRMED SHORT (5M MOMENTUM)"
                tp1 = round(close_px - (risk * 2.0), 6)
                tp2 = round(close_px - (risk * 3.5), 6)
                tp3 = round(close_px - (risk * 5.0), 6)
            elif timeframe == "15m":
                rr = 3.8
                signal_label = "CONFIRMED SHORT (15M INTRADAY)"
                tp1 = round(close_px - (risk * 2.5), 6)
                tp2 = round(close_px - (risk * 4.5), 6)
                tp3 = round(close_px - (risk * 6.5), 6)
            elif timeframe == "1h":
                rr = 5.5
                signal_label = "CONFIRMED SHORT (1H HIGH RR SWING)"
                tp1 = round(close_px - (risk * 3.5), 6)
                tp2 = round(close_px - (risk * 6.0), 6)
                tp3 = round(close_px - (risk * 9.0), 6)
            else: # 4h
                rr = 8.0
                signal_label = "CONFIRMED SHORT (4H MACRO TREND)"
                tp1 = round(close_px - (risk * 5.0), 6)
                tp2 = round(close_px - (risk * 8.5), 6)
                tp3 = round(close_px - (risk * 12.0), 6)

        # Format strings
        raw_ts = candle_ts / 1000.0 if candle_ts > 0 else time.time()
        candle_dt = datetime.fromtimestamp(raw_ts)
        timestamp_str = candle_dt.strftime("%I:%M:%S %p")
        candle_at_str = candle_dt.strftime("%b %d, %I:%M:%S %p")

        if candle_vol >= 1_000_000:
            vol_str = f"{candle_vol / 1_000_000:.2f}M USDT"
        elif candle_vol >= 1_000:
            vol_str = f"{candle_vol / 1_000:.2f}K USDT"
        else:
            vol_str = f"{candle_vol:.2f} USDT"

        clean_symbol = buf.symbol.replace("USDT", "")
        formatted_pair = f"{clean_symbol} / USDT"
        confirmation_str = f"CONFIRMED ({tf_label} CLOSE)" if is_closed else f"CONFIRMED ({tf_label} ACTIVE)"

        return {
            "symbol": buf.symbol,
            "pair": formatted_pair,
            "exchange": buf.exchange,
            "timeframe": timeframe,
            "raw_ts": raw_ts,
            "timestamp": timestamp_str,
            "candle_at": candle_at_str,
            "type": signal_type,
            "direction": direction,
            "signal_label": signal_label,
            "confirmation": confirmation_str,
            "change_pct": round(change_pct, 2),
            "amplitude": round(amplitude, 2),
            "open": round(open_px, 6),
            "high": round(high_px, 6),
            "low": round(low_px, 6),
            "close": round(close_px, 6),
            "volume": vol_str,
            "price": round(close_px, 6),
            "vol_spike": round(vol_spike, 1),
            "rr_ratio": f"1:{rr:.1f}R",
            "entry_price": round(close_px, 6),
            "stop_loss": stop_loss,
            "tp1": tp1,
            "tp2": tp2,
            "tp3": tp3,
            "oi_change_5m": buf.get_oi_change_pct(300),
            "funding_rate": buf.funding_rate
        }

    def add_signal_from_buffer(self, buf, sensitivity: float = 1.0, timeframe: str = "1m") -> Optional[Dict]:
        """Evaluates buffer for a specific timeframe with strict multi-factor confirmation."""
        now = time.time()
        buf_key = f"{buf.exchange}:{buf.symbol}:{timeframe}"

        # Cooldown check: 90s for 1m, 180s for 5m, 300s for 15m+
        cooldown_window = 90.0 if timeframe == "1m" else (180.0 if timeframe == "5m" else 300.0)
        last_sig_time = self._cooldowns.get(buf_key, 0)
        if (now - last_sig_time) < cooldown_window:
            return None

        if not buf.candles:
            return None

        candidate = None
        if timeframe == "1m":
            # A) Freshly closed 1m candle (buf.candles[-2])
            if len(buf.candles) >= 2 and buf.candles[-2].closed:
                prev_c = buf.candles[-2]
                if (now - (prev_c.ts / 1000.0)) <= 120.0:
                    c_key = f"{buf_key}:{prev_c.ts}"
                    if c_key not in self._seen_candle_keys:
                        candidate = prev_c

            # B) Or current 1m candle if >= 45s elapsed
            if not candidate:
                curr_c = buf.candles[-1]
                elapsed_sec = (int(now * 1000) - curr_c.ts) / 1000.0
                if curr_c.closed or elapsed_sec >= 45.0:
                    c_key = f"{buf_key}:{curr_c.ts}"
                    if c_key not in self._seen_candle_keys:
                        candidate = curr_c
        else:
            # Multi-timeframe aggregated candles
            agg = buf.get_aggregated_candles(timeframe)
            if agg:
                candidate = agg[-1]
                cand_t = candidate.get("time", 0) * 1000
                c_key = f"{buf_key}:{cand_t}"
                if c_key in self._seen_candle_keys:
                    candidate = None

        if not candidate:
            return None

        eval_result = self._evaluate_candle(buf, candidate, sensitivity, timeframe=timeframe)
        if not eval_result:
            return None

        cand_ts = candidate.get("time", 0) * 1000 if isinstance(candidate, dict) else candidate.ts
        c_key = f"{buf_key}:{cand_ts}"

        with self._lock:
            if c_key in self._seen_candle_keys:
                return None
            self._seen_candle_keys.add(c_key)
            self._cooldowns[buf_key] = now

            eval_result["id"] = self._next_id
            self._next_id += 1
            self._signals.append(eval_result)
            if len(self._signals) > self.max_history:
                self._signals.pop(0)

            self._last_event_time = eval_result["timestamp"]
            if eval_result["type"] == "PUMP":
                self.pumps_count += 1
            else:
                self.dumps_count += 1

            return eval_result

    def seed_history_from_buffer(self, buf, sensitivity: float = 0.8):
        """Backfills verified past signals across timeframes (1m, 5m, 15m, 1h) into History."""
        if not buf.candles or len(buf.candles) < 2:
            return

        now = time.time()

        # Seed 1m historical signals
        for candle in list(buf.candles)[:-1]:
            if not candle.closed:
                continue
            candle_age_sec = now - (candle.ts / 1000.0)
            if candle_age_sec > 3600:  # Within last 1 hour
                continue

            c_key = f"{buf.exchange}:{buf.symbol}:1m:{candle.ts}"
            with self._lock:
                if c_key in self._seen_candle_keys:
                    continue

            eval_res = self._evaluate_candle(buf, candle, sensitivity, timeframe="1m")
            if eval_res:
                with self._lock:
                    if c_key in self._seen_candle_keys:
                        continue
                    self._seen_candle_keys.add(c_key)
                    eval_res["id"] = self._next_id
                    self._next_id += 1
                    self._signals.append(eval_res)

        # Seed 5m and 15m historical signals
        for tf in ["5m", "15m", "1h"]:
            agg = buf.get_aggregated_candles(tf)
            if len(agg) >= 2:
                for cand in agg[:-1]: # Closed multi-tf candles
                    c_time = cand.get("time", 0) * 1000
                    c_key = f"{buf.exchange}:{buf.symbol}:{tf}:{c_time}"
                    with self._lock:
                        if c_key in self._seen_candle_keys:
                            continue
                    eval_res = self._evaluate_candle(buf, cand, sensitivity, timeframe=tf)
                    if eval_res:
                        with self._lock:
                            if c_key in self._seen_candle_keys:
                                continue
                            self._seen_candle_keys.add(c_key)
                            eval_res["id"] = self._next_id
                            self._next_id += 1
                            self._signals.append(eval_res)

    def get_stats(self, sensitivity: float, total_monitored: int, timeframe: str = "1m") -> Dict:
        now = time.time()
        active_window = 180.0 if timeframe == "1m" else (600.0 if timeframe == "5m" else 1800.0)
        with self._lock:
            active_signals = [
                s for s in self._signals
                if (now - s["raw_ts"]) <= active_window 
                and abs(s["change_pct"]) >= sensitivity
                and s.get("timeframe", "1m") == timeframe
            ]
            pumps_crossing = sum(1 for s in active_signals if s["type"] == "PUMP")
            dumps_crossing = sum(1 for s in active_signals if s["type"] == "DUMP")

            return {
                "monitored": total_monitored,
                "stream_batches": "5 / 5",
                "timeframe": timeframe,
                "last_event": self._last_event_time,
                "crossing_now": len(active_signals),
                "pumps": pumps_crossing,
                "dumps": dumps_crossing
            }

    def get_signals(self, sensitivity: float = 1.0, view: str = "live", timeframe: str = "1m") -> List[Dict]:
        now = time.time()
        active_window = 180.0 if timeframe == "1m" else (600.0 if timeframe == "5m" else 1800.0)
        with self._lock:
            matched = [
                s for s in self._signals
                if abs(s["change_pct"]) >= sensitivity
                and s.get("timeframe", "1m") == timeframe
            ]

            if view == "live":
                return [s for s in reversed(matched) if (now - s["raw_ts"]) <= active_window]
            else:
                return [s for s in reversed(matched) if (now - s["raw_ts"]) > active_window]

pump_dump_tracker = PumpDumpTracker()
