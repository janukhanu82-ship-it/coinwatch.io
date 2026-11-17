# Perp Scanner 2.0 – PRD, TRD, Flow & System Design
**Next-Generation Multi-Exchange Crypto Perpetuals Terminal**
*Inspired by `ppkr.io` · Engineered for Zero Lag & Institutional Accuracy*
*Version: 2.0 · Date: November 2026*

---

## 1. Executive Summary & Core Philosophy

Perp Scanner 2.0 is an ultra-low-latency, self-hosted crypto perpetuals scanning terminal and trade planning engine. It reverse-engineers and fundamentally upgrades the concepts of `app.ppkr.io/scanner` by delivering:
1. **Multi-Exchange Native Priority:** Hyperliquid (#1 on-chain DEX), Binance USDT-M (#2), and Bybit Linear (#3).
2. **Correlation & Squeeze Engine:** BTC Decoupling (Relative Strength) + 4-Quadrant Price/OI Flow Matrix + Cross-Exchange Lead-Lag.
3. **Transparent & Confluent Signals:** Eliminates black-box scores with mathematical formulas (Volume Spike Ratio, Price Z-Score, Follow vs. Counter classification).
4. **Zero-Lag Architecture:** In-memory $O(1)$ Ring Buffers, C-compiled JSON parsing (`orjson`), batched WebSocket diffs, and virtualized 60fps rendering.
5. **Interactive Charting with Visual POA:** Canvas-based TradingView `lightweight-charts` with real-time candles, signal markers on trigger candles, and dynamic price lines for Entry Zone, DCA 1/2, Stop Loss, and Take Profit (TP1/TP2/TP3).
6. **Zero API-Key Risk:** Strictly operates on public market WebSocket/REST streams. Non-custodial, no order execution keys, zero account drain risk.

---

## 2. Product Requirements Document (PRD)

### 2.1 The Problem
In crypto perpetual markets:
* Sudden momentum moves (pumps, dumps, short squeezes, liquidation cascades) happen within 60 to 180 seconds.
* Traders watching single charts miss moves on 300+ contracts across different exchanges.
* Commercial tools (`ppkr.io`) charge high monthly subscriptions, use black-box mysterious formulas, lack Hyperliquid on-chain DEX priority, and do not track trade execution life-cycles.
* False alerts on illiquid scam wicks damage trader trust and account capital.

### 2.2 Core Goals
* **Real-time Detection:** Flag unusual moves across Hyperliquid, Binance, and Bybit within $<1$ second of the exchange tick.
* **Exchange Attribution:** Clearly badge and allow filtering by origin exchange (`Hyperliquid`, `Binance`, `Bybit`).
* **Confluence & Accuracy:** Ensure false alerts are $<15\%$ by enforcing minimum liquidity floors ($\ge \$10\text{M}$ 24h volume) and multi-factor confirmation (Volume + Z-Score + Flow).
* **Plan of Attack (POA):** 1-click modal to pre-calculate Entry Zone, DCA laddering, Invalidation (Stop Loss), Take Profit targets, and position size based on custom risk.
* **Interactive Charting:** Immediate visual verification on the chart without opening third-party platforms.

### 2.3 Non-Goals
* Automated execution / trading bots (Strictly an analytical intelligence tool).
* Guaranteed price predictions.

---

## 3. Signal Engine & Mathematical Formulations

### 3.1 Signal 1: Time-Normalized Volume Spike Ratio ($V_{\text{ratio}}$)
To prevent the "half-candle" distortion where the first 5 seconds of a candle create false infinite spikes:
$$V_{\text{projected}} = V_{\text{elapsed}} \times \left( \frac{60}{\max(t_{\text{elapsed}}, 15)} \right)$$
$$V_{\text{ratio}} = \frac{V_{\text{projected}}}{\text{SMA}_{20}(V_{1m})}$$
* **Threshold:** $V_{\text{ratio}} \ge 3.0x$ qualifies as an Unusual Volume Surge.

### 3.2 Signal 2: Price Return Z-Score ($Z_{\text{price}}$)
Log return of the 1-minute candle compared against rolling 60-candle window:
$$r_t = \ln(P_t / P_{t-1})$$
$$Z_t = \frac{r_t - \mu_{60}}{\sigma_{60}}$$
* $|Z_t| \ge 2.5$: Statistical Outlier move.
* $|Z_t| \ge 3.5$: Extreme Volatility Extension.

### 3.3 Signal 3: Bias Matrix (`FOLLOW` vs. `COUNTER`)
Borrowed from `ppkr.io` terminology and made strictly algorithmic:
* **`FOLLOW` (Momentum Continuation):**
  * $V_{\text{ratio}} \ge 3.0x$
  * Candle Close within top 20% of range (for Longs) or bottom 20% of range (for Shorts)
  * Open Interest expanding ($\Delta\text{OI}_{5m} > +2.0\%$)
  * *Verdict:* Fresh aggressive capital entering market. Ride the breakout.
* **`COUNTER` (Exhaustion Fade / Mean Reversion):**
  * Extreme Z-Score ($|Z_t| \ge 3.5$)
  * Rejection wick $> 40\%$ of candle range
  * Liquidation spike triggered, followed by Open Interest drop ($\Delta\text{OI}_{5m} < -1.0\%$)
  * *Verdict:* Forced liquidations completed, momentum exhausted. High probability mean-reversion setup.

### 3.4 Signal 4: Flow Quadrant (Price vs. Open Interest Matrix)
* **🟢 Long Buildup:** Price $\uparrow$ + OI $\uparrow$ (Real organic buyers entering)
* **⚠️ Short Squeeze:** Price $\uparrow$ + OI $\downarrow$ (Shorts trapped & liquidating, risky fake pump)
* **🔴 Short Buildup:** Price $\downarrow$ + OI $\uparrow$ (Aggressive short sellers entering)
* **💥 Long Liquidation:** Price $\downarrow$ + OI $\downarrow$ (Cascading long stops being wiped out)

### 3.5 Signal 5: BTC Decoupling / Relative Strength (Beta)
$$\text{Beta} = \frac{\text{Return}_{\text{Coin}, 15m}}{\max(|\text{Return}_{\text{BTC}, 15m}|, 0.001)}$$
* If $|\text{Return}_{\text{BTC}}| < 0.3\%$ but $\text{Return}_{\text{Coin}} \ge 3.5\%$ with $V_{\text{ratio}} \ge 3.5x \rightarrow$ **Decoupled Strong Mover**.

### 3.6 Signal 6: Composite Momentum Score ($0 - 100$)
$$\text{Score} = \left( 0.30 \cdot \text{clip}\left(\frac{|Z|}{4}, 0, 1\right) + 0.25 \cdot \text{clip}\left(\frac{V_{\text{ratio}}}{6}, 0, 1\right) + 0.20 \cdot \text{clip}\left(\frac{|\Delta\text{OI}_{5m}|}{10}, 0, 1\right) + 0.15 \cdot \text{clip}\left(\text{LiqBurst}, 0, 1\right) + 0.10 \cdot \text{clip}\left(\text{FundingExt}, 0, 1\right) \right) \times 100$$

---

## 4. Technical Requirements & Architecture (TRD)

### 4.1 System Components
1. **Exchange Adapters:**
   * `HyperliquidAdapter`: `wss://api.hyperliquid.xyz/ws` + Info API (`/info`).
   * `BinanceAdapter`: `wss://fstream.binance.com/ws` (`!miniTicker@arr`, `!markPrice@arr@1s`, `!forceOrder@arr`, `<symbol>@kline_1m`).
   * `BybitAdapter`: `wss://stream.bybit.com/v5/public/linear`.
2. **In-Memory Ring Buffers (RAM):**
   * Double-ended queues (`collections.deque`) maintaining fixed rolling windows of 60 candles per symbol.
   * Provides $O(1)$ instant updates without disk I/O.
3. **Signal & Correlation Engine:**
   * Computes Z-scores, Volume Spikes, OI Deltas, Flow Quadrants, and Composite Scores in sub-millisecond vectorized passes.
4. **Alert Dispatcher & Cooldown Service:**
   * Rule evaluator with a sliding 15-minute per-symbol cooldown.
   * Dispatches rich Telegram messages with action buttons.
5. **FastAPI Backend (REST + WebSocket):**
   * `/api/scanner/snapshot`: Initial state load.
   * `/ws/scanner`: 100ms batched JSON diffs.
   * `/api/poa`: Full CRUD for Plan of Attack records.
6. **Frontend Terminal (React + Vite + Tailwind + TanStack):**
   * Virtualized live table with exchange badges, score meters, flow badges.
   * TradingView `lightweight-charts` instance with auto-rendered POA price lines and signal markers.

---

## 5. Plan of Attack (POA) & Chart Overlay Specs

### 5.1 Auto-Calculated POA Parameters
When a signal triggers or user selects a pair:
* **Entry Zone:** Current price to 38.2% Fibonacci retrace of trigger candle.
* **DCA Level 1:** 50% retrace of trigger candle.
* **DCA Level 2:** 78.6% retrace of trigger candle.
* **Invalidation (Stop Loss):** 0.5% below trigger candle low (for Longs) or above trigger candle high (for Shorts).
* **TP 1:** $1.5 \times \text{Risk}$ (1.5 R).
* **TP 2:** $2.5 \times \text{Risk}$ (2.5 R).
* **TP 3:** $3.5 \times \text{Risk}$ (3.5 R).

### 5.2 Position Size Calculator Formula
$$\text{Risk Amount (\$) } = \text{Account Size} \times \left( \frac{\text{Risk \%}}{100} \right)$$
$$\text{Price Distance \%} = \frac{|\text{Entry} - \text{Stop Loss}|}{\text{Entry}}$$
$$\text{Position Size (\$) } = \frac{\text{Risk Amount}}{\text{Price Distance \%}}$$
$$\text{Contracts Qty} = \frac{\text{Position Size (\$) }}{\text{Entry Price}}$$
$$\text{Margin Required} = \frac{\text{Position Size}}{\text{Suggested Leverage}}$$

---

## 6. Development & Deployment Roadmap

* **Phase 1 (Active):** Project scaffolding, In-Memory Ring Buffer core, Hyperliquid + Binance live ingestors.
* **Phase 2:** Signal Engine (Z-Score, $V_{\text{ratio}}$, Follow/Counter, Flow Quadrants, Composite Score).
* **Phase 3:** React + Vite Terminal UI (Virtualized table, live WebSocket updates, ppkr dark theme).
* **Phase 4:** TradingView Lightweight Charts integration with live candles, signal markers & POA lines.
* **Phase 5:** Plan of Attack (POA) state machine, Risk Calculator, and Telegram Bot Dispatcher.
* **Phase 6:** VPS Dockerization, Caddy Reverse Proxy, and Bybit adapter.
