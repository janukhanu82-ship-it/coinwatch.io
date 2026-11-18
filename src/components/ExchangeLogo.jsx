import React from 'react';

/*
  Exchange marks. Binance / Bybit / OKX paths from web3icons (MIT);
  Hyperliquid mark from the official Hyperliquid asset.
*/
const MARKS = {
  binance: {
    name: 'Binance',
    bg: '#16130a',
    svg: (
      <svg viewBox="0 0 24 24" className="w-[70%] h-[70%]" aria-hidden="true">
        <path
          fill="#F0B90B"
          d="m7.068 12-2.03 2.03L3.003 12l2.03-2.03zm4.935-4.935 3.482 3.483 2.03-2.03L12.003 3 6.485 8.518l2.03 2.03zm6.964 2.905L16.937 12l2.03 2.03 2.03-2.03zm-6.964 6.965L8.52 13.452l-2.03 2.03L12.003 21l5.512-5.518-2.03-2.03zm0-2.905 2.03-2.03-2.03-2.03L9.967 12z"
        />
      </svg>
    ),
  },
  bybit: {
    name: 'Bybit',
    bg: '#0b0b0d',
    svg: (
      <svg viewBox="2.6 8.6 18.8 6.8" className="w-[82%] h-auto" aria-hidden="true">
        <path fill="#F6A500" d="M15.829 13.626V9h.93v4.626z" />
        <path
          fill="#fff"
          d="M4.993 15H3v-4.626h1.913c.93 0 1.471.507 1.471 1.3 0 .513-.348.845-.588.955.287.13.655.423.655 1.04 0 .863-.609 1.33-1.458 1.33m-.154-3.82h-.91v1.065h.91c.395 0 .615-.214.615-.533 0-.317-.22-.532-.615-.532m.06 1.877h-.97v1.137h.97c.42 0 .622-.259.622-.571s-.201-.565-.622-.565zm4.388.046V15h-.923v-1.898l-1.431-2.728h1.01l.889 1.864.877-1.864h1.01zM13.355 15h-1.993v-4.626h1.913c.93 0 1.47.507 1.47 1.3 0 .513-.347.845-.588.955.287.13.655.423.655 1.04 0 .863-.608 1.33-1.457 1.33m-.155-3.82h-.91v1.065h.91c.395 0 .616-.214.616-.533 0-.317-.22-.532-.616-.532m.06 1.877h-.97v1.137h.97c.422 0 .622-.259.622-.571s-.2-.565-.622-.565zm6.495-1.876V15h-.929v-3.82h-1.245v-.806H21v.806z"
        />
      </svg>
    ),
  },
  hyperliquid: {
    name: 'Hyperliquid',
    bg: '#062723',
    svg: (
      <svg viewBox="0 0 144 144" className="w-[68%] h-[68%]" aria-hidden="true">
        <path
          fill="#97FCE4"
          d="M144 71.7c0 47.6-29.13 62.88-44.48 49.28C86.88 109.89 83.12 86.45 64.12 84.05 39.99 81.01 37.91 113.13 22.03 113.13 3.55 113.13 0 86.24 0 72.43 0 58.31 3.97 39.05 19.74 39.05c18.38 0 19.42 27.52 42.39 26.06C85 63.54 85.42 34.87 100.25 22.63 113.2 12.06 144 23.46 144 71.7Z"
        />
      </svg>
    ),
  },
  okx: {
    name: 'OKX',
    bg: '#0b0b0d',
    svg: (
      <svg viewBox="2.9 9.2 18.2 5.6" className="w-[78%] h-auto" aria-hidden="true">
        <path
          fill="#fff"
          d="M8.28 9.3H3.12a.12.12 0 0 0-.12.12v5.16a.12.12 0 0 0 .12.12h5.16a.12.12 0 0 0 .12-.12V9.42a.12.12 0 0 0-.12-.12M6.6 12.78a.12.12 0 0 1-.12.12H4.92a.12.12 0 0 1-.12-.12v-1.56a.12.12 0 0 1 .12-.12h1.56a.12.12 0 0 1 .12.12zm12.48-1.68h-1.56a.12.12 0 0 0-.12.12v1.56c0 .07.05.12.12.12h1.56a.12.12 0 0 0 .12-.12v-1.56a.12.12 0 0 0-.12-.12M17.28 9.3h-1.56a.12.12 0 0 0-.12.12v1.56c0 .07.05.12.12.12h1.56a.12.12 0 0 0 .12-.12V9.42a.12.12 0 0 0-.12-.12m3.6 0h-1.56a.12.12 0 0 0-.12.12v1.56c0 .07.05.12.12.12h1.56a.12.12 0 0 0 .12-.12V9.42a.12.12 0 0 0-.12-.12m-3.6 3.6h-1.56a.12.12 0 0 0-.12.12v1.56c0 .07.05.12.12.12h1.56a.12.12 0 0 0 .12-.12v-1.56a.12.12 0 0 0-.12-.12m3.6 0h-1.56a.12.12 0 0 0-.12.12v1.56c0 .07.05.12.12.12h1.56a.12.12 0 0 0 .12-.12v-1.56a.12.12 0 0 0-.12-.12m-6.6-3.6h-1.56a.12.12 0 0 0-.12.12v1.56c0 .07.05.12.12.12h1.56a.12.12 0 0 0 .12-.12V9.42a.12.12 0 0 0-.12-.12m-1.8 1.8h-1.56a.12.12 0 0 0-.12.12v1.56c0 .07.05.12.12.12h1.56a.12.12 0 0 0 .12-.12v-1.56a.12.12 0 0 0-.12-.12m1.8 1.8h-1.56a.12.12 0 0 0-.12.12v1.56c0 .07.05.12.12.12h1.56a.12.12 0 0 0 .12-.12v-1.56a.12.12 0 0 0-.12-.12m-3.6 0H9.6a.12.12 0 0 0-.12.12v1.56c0 .07.05.12.12.12h1.56a.12.12 0 0 0 .12-.12v-1.56a.12.12 0 0 0-.12-.12m0-3.6H9.6a.12.12 0 0 0-.12.12v1.56c0 .07.05.12.12.12h1.56a.12.12 0 0 0 .12-.12V9.42a.12.12 0 0 0-.12-.12"
        />
      </svg>
    ),
  },
};

export const EXCHANGE_NAMES = { binance: 'Binance', bybit: 'Bybit', hyperliquid: 'Hyperliquid', okx: 'OKX' };

export function exchangeName(ex) {
  return EXCHANGE_NAMES[(ex || '').toLowerCase()] || (ex ? ex.toUpperCase() : 'Exchange');
}

/** Square exchange mark. `size` is a Tailwind size class pair, e.g. "w-5 h-5". */
export default function ExchangeLogo({ exchange, className = 'w-5 h-5', rounded = 'rounded-md', title }) {
  const key = (exchange || '').toLowerCase();
  const mark = MARKS[key];
  const label = title ?? exchangeName(exchange);
  if (!mark) {
    return (
      <span
        title={label}
        className={`${className} ${rounded} inline-flex items-center justify-center bg-ink-4 text-[9px] font-semibold text-fog shrink-0`}
      >
        {(exchange || '?').slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    <span
      title={label}
      role="img"
      aria-label={label}
      className={`${className} ${rounded} inline-flex items-center justify-center shrink-0 ring-1 ring-white/10`}
      style={{ background: mark.bg }}
    >
      {mark.svg}
    </span>
  );
}

/** Logo + exchange name inline label. */
export function ExchangeTag({ exchange, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <ExchangeLogo exchange={exchange} className="w-3.5 h-3.5" rounded="rounded-[4px]" />
      <span>{exchangeName(exchange)}</span>
    </span>
  );
}
