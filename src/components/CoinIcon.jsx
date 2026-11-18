import React, { useEffect, useState } from 'react';
import ExchangeLogo from './ExchangeLogo';

/** Normalise "BTCUSDT", "1000PEPEUSDT", "kPEPE", "SOL-PERP", "WIF / USDT" → "BTC", "PEPE", … */
export function baseAsset(symbol) {
  let s = String(symbol || 'BTC').trim();
  s = s.replace(/\s*\/\s*USDT?$/i, '').replace(/-PERP$/i, '').replace(/USDT$/i, '').replace(/USDC$/i, '');
  s = s.replace(/^k(?=[A-Z]{2,})/, ''); // Hyperliquid kPEPE / kSHIB
  s = s.toUpperCase().replace(/^(1000000|100000|10000|1000)(?=[A-Z])/, '');
  return s || 'BTC';
}

/**
 * Coin logo with layered CDN fallbacks and a monogram as last resort.
 * Pass `exchange` to overlay a small exchange mark at the bottom-right.
 */
export default function CoinIcon({ symbol, className = 'w-10 h-10', isPump = true, exchange }) {
  const base = baseAsset(symbol);
  const lower = base.toLowerCase();
  const sources = [
    `https://app.hyperliquid.xyz/coins/${base}.svg`,
    `https://assets.coincap.io/assets/icons/${lower}@2x.png`,
    `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${lower}.png`,
  ];
  const [srcIndex, setSrcIndex] = useState(0);
  useEffect(() => setSrcIndex(0), [base]);

  const failed = srcIndex >= sources.length;

  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      {failed ? (
        <span
          className={`w-full h-full rounded-full flex items-center justify-center font-semibold text-[11px] border ${
            isPump ? 'bg-mint/10 border-mint/25 text-mint' : 'bg-coral/10 border-coral/25 text-coral'
          }`}
        >
          {base.slice(0, 1)}
        </span>
      ) : (
        <img
          key={sources[srcIndex]}
          src={sources[srcIndex]}
          alt={base}
          onError={() => setSrcIndex((i) => i + 1)}
          className="w-full h-full rounded-full object-cover bg-ink-3 ring-1 ring-white/10"
          loading="lazy"
        />
      )}
      {exchange && (
        <span className="absolute -bottom-0.5 -right-0.5 rounded-[5px] ring-2 ring-ink">
          <ExchangeLogo exchange={exchange} className="w-3.5 h-3.5" rounded="rounded-[4px]" />
        </span>
      )}
    </span>
  );
}
