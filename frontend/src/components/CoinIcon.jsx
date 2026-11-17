import React, { useState } from 'react';

export default function CoinIcon({ symbol, className = "w-10 h-10", isPump = true }) {
  const [srcIndex, setSrcIndex] = useState(0);

  // Clean the base symbol: e.g. "BTCUSDT" -> "btc", "MNT-PERP" -> "mnt", "SOL" -> "sol"
  const raw = (symbol || 'btc').toUpperCase();
  const base = raw
    .replace(/USDT$/i, '')
    .replace(/-PERP$/i, '')
    .replace(/\/USDT$/i, '')
    .trim()
    .toLowerCase();

  const sources = [
    `https://assets.coincap.io/assets/icons/${base}@2x.png`,
    `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${base}.png`,
    `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/assets/${base.toUpperCase()}/logo.png`,
  ];

  if (srcIndex >= sources.length) {
    // Elegant fallback monogram badge
    return (
      <div className={`${className} rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border ${
        isPump 
          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' 
          : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
      }`}>
        {base.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={sources[srcIndex]}
      alt={base}
      onError={() => setSrcIndex(prev => prev + 1)}
      className={`${className} rounded-full object-contain p-1 bg-[#0A0D15] border border-[#1A2234] shadow-sm shrink-0`}
      loading="lazy"
    />
  );
}
