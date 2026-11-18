# coinwach — roadmap

## Domains
- `coinwach.io` — public marketing / landing page (indexed by Google). **Not built yet — planned next.**
- `app.coinwach.io` — this project: the authenticated dashboard users land on after login.
  Kept out of search indexing (`robots.index: false` in `.figma/make/site.json`).

## Dashboard (this app) — done
- Sidebar layout: Pump / Dump, POA, Markets, Settings.
- Coin logos (Hyperliquid coin CDN → CoinCap → spothq fallback) with exchange badges.
- Exchange marks for Hyperliquid, Binance, Bybit, OKX.
- Top-mover signal card motion effect (`src/components/MoverFX.jsx`).
- Local risk setup, POA activity log and history clearing (browser localStorage).

## Next
- Landing page on `coinwach.io` (reuse brand mark, sage/mint palette, Inter Tight + Geist Mono).
- Real login flow so `app.coinwach.io` is gated behind authentication.
