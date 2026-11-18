import React, { useMemo, useState } from 'react';
import { ChartLine, Star, Lightning, ArrowsDownUp, ArrowUp, ArrowDown, Broadcast } from '@phosphor-icons/react';
import CoinIcon, { baseAsset } from './CoinIcon';
import { exchangeName } from './ExchangeLogo';

const SIGNAL_TONE = [
  ['PUMP DETECTED', 'text-mint border-mint/30 bg-mint/[0.07]'],
  ['DUMP DETECTED', 'text-coral border-coral/30 bg-coral/[0.07]'],
  ['BREAKOUT CONFIRMED', 'text-terminal-cyan border-terminal-cyan/30 bg-terminal-cyan/[0.07]'],
  ['MOMENTUM BUILDING', 'text-terminal-yellow border-terminal-yellow/30 bg-terminal-yellow/[0.06]'],
  ['SQUEEZE ALERT', 'text-exchange-bybit border-exchange-bybit/30 bg-exchange-bybit/[0.06]'],
];

const FLOW = {
  LONG_BUILDUP: ['Long buildup', 'text-mint'],
  SHORT_SQUEEZE: ['Short squeeze', 'text-terminal-yellow'],
  SHORT_BUILDUP: ['Short buildup', 'text-coral'],
  LONG_LIQUIDATION: ['Long liquidation', 'text-exchange-bybit'],
};

function fmtPrice(p) {
  const n = Number(p) || 0;
  if (n === 0) return '0.00';
  if (n < 0.0001) return n.toPrecision(3);
  if (n < 1) return n.toFixed(5);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ScannerTable({ data = [], onSelectCoin, onOpenPOA, favorites = [], onToggleFavorite }) {
  const [sortField, setSortField] = useState('composite_score');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const isFav = (row) =>
    favorites.some((f) => f.symbol?.toUpperCase() === row.symbol?.toUpperCase() && f.exchange?.toLowerCase() === row.exchange?.toLowerCase());

  const rows = useMemo(() => {
    const out = [...data];
    out.sort((a, b) => {
      let av = a[sortField];
      let bv = b[sortField];
      if (sortField === 'symbol') {
        av = (a.symbol || '').toUpperCase();
        bv = (b.symbol || '').toUpperCase();
      } else {
        av = Number(av) || 0;
        bv = Number(bv) || 0;
      }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return out;
  }, [data, sortField, sortAsc]);

  const SortIcon = ({ field }) =>
    sortField !== field ? (
      <ArrowsDownUp weight="bold" className="w-3 h-3 opacity-30 inline ml-1" />
    ) : sortAsc ? (
      <ArrowUp weight="bold" className="w-3 h-3 text-mint inline ml-1" />
    ) : (
      <ArrowDown weight="bold" className="w-3 h-3 text-mint inline ml-1" />
    );

  const Th = ({ field, children, align = 'left' }) => (
    <th
      scope="col"
      className={`py-3 px-4 font-medium whitespace-nowrap ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'} ${
        field ? 'cursor-pointer hover:text-snow select-none' : ''
      }`}
      onClick={field ? () => handleSort(field) : undefined}
      aria-sort={field && sortField === field ? (sortAsc ? 'ascending' : 'descending') : undefined}
    >
      {children}
      {field && <SortIcon field={field} />}
    </th>
  );

  return (
    <div className="overflow-auto max-h-[calc(100vh-260px)] min-h-[320px]">
      <table className="w-full text-[12px] border-collapse">
        <thead className="sticky top-0 z-10 bg-[#111215]/95 backdrop-blur text-fog-2 text-[11px]">
          <tr className="border-b border-white/[0.06]">
            <Th field="symbol">Pair</Th>
            <Th field="price" align="right">Price</Th>
            <Th field="price_change_1m" align="right">1M %</Th>
            <Th field="volume_spike_ratio" align="right">Vol spike</Th>
            <Th align="center">Signal</Th>
            <Th>Flow</Th>
            <Th>Bias</Th>
            <Th field="composite_score" align="right">Score</Th>
            <Th align="right">
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-20 text-center text-fog-2">
                <Broadcast weight="duotone" className="w-7 h-7 mx-auto mb-3 text-mint" />
                {data.length === 0 ? 'Connecting to exchange streams…' : 'No perpetual pairs match the current filters.'}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const chg = Number(row.price_change_1m) || 0;
              const spike = Number(row.volume_spike_ratio) || 1;
              const score = Math.round(row.composite_score || 0);
              const status = row.signal_status || 'ACTIVE';
              const tone = SIGNAL_TONE.find(([k]) => status.includes(k))?.[1] || 'text-fog border-white/10';
              const flow = FLOW[row.flow_quadrant];
              const bias = row.bias && row.bias !== 'NEUTRAL' ? row.bias : null;
              const fav = isFav(row);
              return (
                <tr
                  key={`${row.exchange}:${row.symbol}`}
                  className="group hover:bg-white/[0.025] transition-colors cursor-pointer"
                  onClick={() => onSelectCoin(row)}
                >
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <CoinIcon symbol={row.symbol} coin={row.coin} exchange={row.exchange} className="w-7 h-7" isPump={chg >= 0} />
                      <div className="leading-tight">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-snow">{baseAsset(row.symbol)}</span>
                          <span className="text-[10px] text-fog-2">/USDT</span>
                          {row.breakdown?.is_decoupled && (
                            <Lightning weight="fill" className="w-3 h-3 text-terminal-yellow" aria-label="Decoupled from BTC" />
                          )}
                        </div>
                        <div className="text-[10px] text-fog-2">{exchangeName(row.exchange)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-right cw-num text-snow/90 whitespace-nowrap">${fmtPrice(row.price)}</td>
                  <td className={`py-2.5 px-4 text-right cw-num whitespace-nowrap ${chg >= 0 ? 'text-mint' : 'text-coral'}`}>
                    {chg >= 0 ? '+' : ''}
                    {chg.toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    <span className={`cw-num ${spike >= 3 ? 'text-mint font-semibold' : spike >= 1.8 ? 'text-mint/80' : 'text-fog'}`}>
                      {spike.toFixed(1)}x
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-medium capitalize ${tone}`}>
                      {status.toLowerCase()}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    {flow ? <span className={`text-[11px] ${flow[1]}`}>{flow[0]}</span> : <span className="text-fog-2">—</span>}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    {bias ? (
                      <span className={`text-[11px] ${bias.includes('LONG') ? 'text-mint' : 'text-coral'}`}>
                        {bias.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    ) : (
                      <span className="text-fog-2">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-12 h-1 rounded-full bg-white/[0.06] overflow-hidden hidden xl:inline-block">
                        <span
                          className={`block h-full rounded-full ${score >= 75 ? 'bg-mint' : score >= 50 ? 'bg-terminal-cyan' : 'bg-fog-2'}`}
                          style={{ width: `${Math.min(100, score)}%` }}
                        />
                      </span>
                      <span className={`cw-num ${score >= 75 ? 'text-mint' : score >= 50 ? 'text-snow' : 'text-fog'}`}>{score}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1">
                      {onToggleFavorite && (
                        <button
                          onClick={() => onToggleFavorite(row)}
                          title={fav ? 'Remove favorite' : 'Add to favorites'}
                          className={`w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/[0.06] ${fav ? 'text-terminal-yellow' : 'text-fog'}`}
                        >
                          <Star weight={fav ? 'fill' : 'duotone'} className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onSelectCoin(row)}
                        title="Open chart"
                        aria-label={`Open chart for ${row.symbol}`}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-fog hover:text-snow hover:bg-white/[0.06]"
                      >
                        <ChartLine weight="duotone" className="w-4 h-4" />
                      </button>
                      {onOpenPOA && (
                        <button
                          onClick={() => onOpenPOA(row)}
                          title="Create Plan of Attack"
                          className="h-7 px-3 rounded-full border border-white/[0.08] text-[11px] text-fog hover:text-mint hover:border-mint/35 transition-colors"
                        >
                          POA
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
