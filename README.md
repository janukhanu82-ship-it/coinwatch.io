# ⚡ Perp Scanner 2.0 Terminal
**Next-Generation Multi-Exchange Crypto Perpetuals Terminal**
*Inspired by `ppkr.io` · Engineered for Zero Lag & Institutional Accuracy*

---

## 🚀 Features

* **Multi-Exchange Native Priority:**
  * 🟢 **#1 Hyperliquid:** Real-time on-chain DEX perps, native OI, and whale front-run detection.
  * 🟡 **#2 Binance:** USDT-M futures market volume and liquidation cascades.
  * 🟠 **#3 Bybit:** Linear futures altcoin momentum.
* **Zero Lag Engineering:**
  * In-memory $O(1)$ ring buffers (double-ended queues) in RAM.
  * Vectorized rolling statistics and Z-Scores computed in $<0.05\text{ms}$.
  * Batched 500ms WebSocket diff broadcasting.
* **Institutional Accuracy (Zero Noise):**
  * Minimum liquidity floor ($\ge \$5\text{M}$ default) to ignore illiquid scam wicks.
  * Multi-factor confluence: Volume Spike Ratio ($V_{\text{ratio}} \ge 3.0x$) + Price Z-Score ($|Z| \ge 2.5$) + OI expansion.
* **Correlation & Flow Engine:**
  * **BTC Decoupling:** Identifies coins moving independently of Bitcoin.
  * **4-Quadrant Flow Matrix:** `🟢 Long Buildup`, `⚠️ Short Squeeze`, `🔴 Short Buildup`, `💥 Long Liquidation`.
  * **Bias Categorization:** `FOLLOW` (Momentum continuation) vs `COUNTER` (Mean-reversion fade).
* **Interactive TradingView Charting:**
  * 60fps canvas-based `lightweight-charts` with 1m real-time candles.
  * Signal Markers directly on trigger candles.
  * Dynamic visual price lines: **Entry Zone**, **DCA 1 / DCA 2**, **Stop Loss / Invalidation**, and **TP 1 / TP 2 / TP 3**.
* **1-Click Plan of Attack (POA) & Position Sizer:**
  * Pre-populates risk parameters and calculates exact position USD size, contract count, and margin required at suggested leverage.
  * Full trade life-cycle tracking (`Draft` → `Armed` → `Triggered` → `Closed`).
* **Instant Telegram Alerts:**
  * Formatted trade setups with action links and 15-minute sliding cooldowns.

---

## 💻 How to Run Locally (Windows)

### Option 1: 1-Click Batch File
Double-click `run_scanner.bat` in the root folder. It will activate the virtual environment and open `http://localhost:8000` in your browser!

### Option 2: Command Line
```powershell
cd d:\Coinwach.io\backend
.\.venv\Scripts\activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Open your browser and navigate to: **[http://localhost:8000](http://localhost:8000)**

---

## ⚙️ Configuration (.env)

In `d:\Coinwach.io\backend\.env`:
```ini
MIN_24H_VOLUME_USD=5000000
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
COOLDOWN_SECONDS=900
```
