import React, { useState, useMemo } from 'react';
import { Search, LineChart, Star, Zap, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import CoinIcon from './CoinIcon';

export default function ScannerTable({
  data = [],
  onSelectCoin,
  onOpenPOA,
  favorites = [],
  onToggleFavorite,
}) {
  const [exchangeFilter, setExchangeFilter] = useState('all');
  const [minVolumeFilter, setMinVolumeFilter] = useState(0);
  const [signalFilter, setSignalFilter] = useState('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [sortField, setSortField] = useState('composite_score');
  const [sortAsc, setSortAsc] = useState(false);

  // Sorting handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Helper for favorites check
  const isFav = (symbol, exchange) => {
    if (!favorites || !symbol || !exchange) return false;
    return favorites.some(
      (f) =>
        f.symbol?.toUpperCase() === symbol.toUpperCase() &&
        f.exchange?.toLowerCase() === exchange.toLowerCase()
    );
  };

  // Filtered & sorted data
  const processedData = useMemo(() => {
    let result = [...data];

    // Exchange filter
    if (exchangeFilter !== 'all') {
      result = result.filter(
        (item) => item.exchange?.toLowerCase() === exchangeFilter.toLowerCase()
      );
    }

    // Min volume filter
    if (minVolumeFilter > 0) {
      result = result.filter((item) => (item.volume_24h_usd || 0) >= minVolumeFilter);
    }

    // Signal status filter
    if (signalFilter !== 'ALL') {
      result = result.filter((item) => {
        const status = item.signal_status || 'ACTIVE';
        return status.toUpperCase().includes(signalFilter.toUpperCase());
      });
    }

    // Search filter
    if (searchFilter.trim()) {
      const q = searchFilter.trim().toUpperCase();
      result = result.filter((item) => item.symbol?.toUpperCase().includes(q));
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'symbol') {
        aVal = (a.symbol || '').toUpperCase();
        bVal = (b.symbol || '').toUpperCase();
      } else {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, exchangeFilter, minVolumeFilter, signalFilter, searchFilter, sortField, sortAsc]);

  const getExchangeBadge = (ex) => {
    switch (ex?.toLowerCase()) {
      case 'hyperliquid':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-exchange-hl/15 text-exchange-hl border border-exchange-hl/30">
            HL
          </span>
        );
      case 'binance':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-exchange-binance/15 text-exchange-binance border border-exchange-binance/30">
            BIN
          </span>
        );
      case 'bybit':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-exchange-bybit/15 text-exchange-bybit border border-exchange-bybit/30">
            BYB
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-terminal-dark text-terminal-muted border border-terminal-border">
            EX
          </span>
        );
    }
  };

  const getSignalBadge = (status) => {
    const s = status || 'ACTIVE';
    if (s.includes('PUMP DETECTED')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-terminal-green/20 text-terminal-green border border-terminal-green/40 shadow-sm shadow-terminal-green/20">
          {s}
        </span>
      );
    }
    if (s.includes('DUMP DETECTED')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-terminal-red/20 text-terminal-red border border-terminal-red/40 shadow-sm shadow-terminal-red/20">
          {s}
        </span>
      );
    }
    if (s.includes('BREAKOUT CONFIRMED')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-terminal-cyan/20 text-terminal-cyan border border-terminal-cyan/40 shadow-sm shadow-terminal-cyan/20">
          {s}
        </span>
      );
    }
    if (s.includes('MOMENTUM BUILDING')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-terminal-yellow/20 text-terminal-yellow border border-terminal-yellow/40">
          {s}
        </span>
      );
    }
    if (s.includes('SQUEEZE ALERT')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40">
          {s}
        </span>
      );
    }
    if (s.includes('PULLBACK')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/40">
          {s}
        </span>
      );
    }
    if (s.includes('CONSOLIDATION')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-800 text-gray-300 border border-gray-700">
          {s}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-terminal-card text-terminal-muted border border-terminal-border/60">
        {s}
      </span>
    );
  };

  const getFlowBadge = (flow) => {
    switch (flow) {
      case 'LONG_BUILDUP':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-terminal-green/15 text-terminal-green border border-terminal-green/30">
            🟢 LONG BUILDUP
          </span>
        );
      case 'SHORT_SQUEEZE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-terminal-yellow/15 text-terminal-yellow border border-terminal-yellow/30">
            ⚠️ SHORT SQUEEZE
          </span>
        );
      case 'SHORT_BUILDUP':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-terminal-red/15 text-terminal-red border border-terminal-red/30">
            🔴 SHORT BUILDUP
          </span>
        );
      case 'LONG_LIQUIDATION':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
            💥 LONG LIQ
          </span>
        );
      default:
        return <span className="text-[10px] text-terminal-muted">—</span>;
    }
  };

  const getBiasBadge = (bias) => {
    if (!bias || bias === 'NEUTRAL') return <span className="text-terminal-muted">—</span>;
    const isLong = bias.includes('LONG');
    const isFollow = bias.includes('FOLLOW');
    return (
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isLong
            ? 'bg-terminal-green/15 text-terminal-green border-terminal-green/30'
            : 'bg-terminal-red/15 text-terminal-red border-terminal-red/30'
          }`}
      >
        {isFollow ? '⚡ ' : '🔄 '}
        {bias.replace('_', ' ')}
      </span>
    );
  };

  const getScoreColor = (score) => {
    const s = Number(score) || 0;
    if (s >= 75) return 'text-terminal-green font-extrabold';
    if (s >= 50) return 'text-terminal-cyan font-bold';
    if (s >= 35) return 'text-terminal-yellow font-medium';
    return 'text-terminal-muted font-normal';
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-terminal-muted/40 inline ml-1" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3 h-3 text-terminal-cyan inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-terminal-cyan inline ml-1" />
    );
  };

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-4 space-y-3 font-mono select-none overflow-hidden">
      {/* Filter Bar ABOVE the Table */}
      <div className="bg-terminal-card border border-terminal-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Exchange Pills */}
        <div className="flex items-center gap-1 bg-terminal-dark p-1 rounded-lg border border-terminal-border">
          {[
            { id: 'all', label: 'ALL EXCHANGES' },
            { id: 'hyperliquid', label: '🟢 HYPERLIQUID', color: 'text-exchange-hl' },
            { id: 'binance', label: '🟡 BINANCE', color: 'text-exchange-binance' },
            { id: 'bybit', label: '🟠 BYBIT', color: 'text-exchange-bybit' },
          ].map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => setExchangeFilter(ex.id)}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all text-[11px] ${exchangeFilter === ex.id
                  ? 'bg-terminal-card text-white shadow-sm border border-terminal-border'
                  : 'text-terminal-muted hover:text-white'
                }`}
            >
              <span className={ex.color || ''}>{ex.label}</span>
            </button>
          ))}
        </div>

        {/* Center: Min Volume & Signal Status Dropdown */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Min 24h Volume */}
          <div className="flex items-center gap-1 bg-terminal-dark px-2 py-1 rounded-lg border border-terminal-border text-[11px]">
            <span className="text-terminal-muted mr-1">MIN VOL:</span>
            {[0, 5000000, 10000000, 25000000].map((vol) => (
              <button
                key={vol}
                type="button"
                onClick={() => setMinVolumeFilter(vol)}
                className={`px-2 py-0.5 rounded font-semibold transition-colors ${minVolumeFilter === vol
                    ? 'bg-terminal-cyan/20 text-terminal-cyan border border-terminal-cyan/40'
                    : 'text-terminal-muted hover:text-white'
                  }`}
              >
                {vol === 0 ? 'ALL' : `$${vol / 1000000}M`}
              </button>
            ))}
          </div>

          {/* Signal Status Filter Dropdown */}
          <select
            value={signalFilter}
            onChange={(e) => setSignalFilter(e.target.value)}
            className="bg-terminal-dark border border-terminal-border text-terminal-text rounded-lg px-2.5 py-1 text-[11px] outline-none focus:border-terminal-cyan cursor-pointer"
          >
            <option value="ALL">ALL SIGNALS</option>
            <option value="PUMP DETECTED">🚀 PUMP DETECTED</option>
            <option value="DUMP DETECTED">🔴 DUMP DETECTED</option>
            <option value="BREAKOUT CONFIRMED">⚡ BREAKOUT CONFIRMED</option>
            <option value="MOMENTUM BUILDING">📈 MOMENTUM BUILDING</option>
            <option value="SQUEEZE ALERT">⚠️ SQUEEZE ALERT</option>
            <option value="CONSOLIDATION">💤 CONSOLIDATION</option>
          </select>
        </div>

        {/* Right: Search Input & Result Count */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[160px] sm:min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-terminal-muted absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="SEARCH SYMBOL..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value.toUpperCase())}
              className="w-full bg-terminal-dark border border-terminal-border rounded-lg pl-8 pr-2.5 py-1 text-[11px] text-white placeholder-terminal-muted outline-none focus:border-terminal-cyan uppercase font-mono"
            />
          </div>
          <span className="text-[11px] text-terminal-muted px-2 py-1 rounded bg-terminal-dark border border-terminal-border">
            {processedData.length} pairs
          </span>
        </div>
      </div>

      {/* Main Scanner Table */}
      <div className="flex-1 rounded-xl border border-terminal-border bg-terminal-dark overflow-auto shadow-2xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-terminal-border bg-terminal-card/90 text-terminal-muted uppercase text-[11px] tracking-wider sticky top-0 z-10 backdrop-blur">
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-white whitespace-nowrap"
                onClick={() => handleSort('symbol')}
              >
                PAIR {renderSortIcon('symbol')}
              </th>
              <th
                className="py-2.5 px-3 text-right cursor-pointer hover:text-white whitespace-nowrap"
                onClick={() => handleSort('price')}
              >
                PRICE {renderSortIcon('price')}
              </th>
              <th
                className="py-2.5 px-3 text-right cursor-pointer hover:text-white whitespace-nowrap"
                onClick={() => handleSort('price_change_1m')}
              >
                1M% {renderSortIcon('price_change_1m')}
              </th>
              <th
                className="py-2.5 px-3 text-right cursor-pointer hover:text-white whitespace-nowrap"
                onClick={() => handleSort('volume_spike_ratio')}
              >
                VOL SPIKE {renderSortIcon('volume_spike_ratio')}
              </th>
              <th className="py-2.5 px-3 text-center whitespace-nowrap">SIGNAL STATUS</th>
              <th className="py-2.5 px-3 text-center whitespace-nowrap">FLOW</th>
              <th className="py-2.5 px-3 text-center whitespace-nowrap">BIAS</th>
              <th
                className="py-2.5 px-3 text-center cursor-pointer hover:text-white whitespace-nowrap"
                onClick={() => handleSort('composite_score')}
              >
                SCORE {renderSortIcon('composite_score')}
              </th>
              <th className="py-2.5 px-3 text-center whitespace-nowrap">ACTIONS</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-terminal-border/40">
            {processedData.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-terminal-muted">
                  No perpetual pairs match current criteria.
                </td>
              </tr>
            ) : (
              processedData.map((row) => {
                const favorite = isFav(row.symbol, row.exchange);
                const isScoreHigh = (row.composite_score || 0) >= 75;
                const isVolSpike = (row.volume_spike_ratio || 0) >= 3.0;

                return (
                  <tr
                    key={`${row.exchange}:${row.symbol}`}
                    className={`hover:bg-terminal-card/80 transition-colors cursor-pointer group ${isScoreHigh
                        ? 'bg-terminal-yellow/5'
                        : isVolSpike
                          ? 'bg-terminal-green/5'
                          : ''
                      }`}
                    onClick={() => onSelectCoin(row)}
                  >
                    {/* 1. PAIR (with exchange badge & coin icon) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CoinIcon symbol={row.symbol} className="w-5 h-5" />
                        {getExchangeBadge(row.exchange)}
                        <span className="font-bold text-white tracking-wide">
                          {row.symbol}
                        </span>
                        {row.breakdown?.is_decoupled && (
                          <span
                            title="Decoupled from BTC"
                            className="text-terminal-yellow text-[11px]"
                          >
                            ⚡
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 2. PRICE */}
                    <td className="py-2.5 px-3 text-right font-bold text-terminal-text whitespace-nowrap">
                      $
                      {row.price < 1
                        ? (row.price || 0).toFixed(4)
                        : (row.price || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                    </td>

                    {/* 3. 1M% */}
                    <td
                      className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${(row.price_change_1m || 0) >= 0
                          ? 'text-terminal-green'
                          : 'text-terminal-red'
                        }`}
                    >
                      {(row.price_change_1m || 0) >= 0 ? '+' : ''}
                      {(row.price_change_1m || 0).toFixed(2)}%
                    </td>

                    {/* 4. VOL SPIKE */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${isVolSpike
                            ? 'bg-terminal-green text-terminal-bg font-extrabold shadow-sm shadow-terminal-green/30'
                            : (row.volume_spike_ratio || 0) >= 1.8
                              ? 'text-terminal-green bg-terminal-green/15 font-semibold'
                              : 'text-terminal-muted'
                          }`}
                      >
                        {(row.volume_spike_ratio || 1.0).toFixed(1)}x
                      </span>
                    </td>

                    {/* 5. SIGNAL STATUS */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {getSignalBadge(row.signal_status)}
                    </td>

                    {/* 6. FLOW */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {getFlowBadge(row.flow_quadrant)}
                    </td>

                    {/* 7. BIAS */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {getBiasBadge(row.bias)}
                    </td>

                    {/* 8. SCORE (simple colored number) */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className={`text-xs ${getScoreColor(row.composite_score)}`}>
                        {Math.round(row.composite_score || 0)}
                      </span>
                    </td>

                    {/* 9. ACTIONS */}
                    <td
                      className="py-2.5 px-3 text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Star Favorite Button */}
                        <button
                          type="button"
                          onClick={() => onToggleFavorite && onToggleFavorite(row)}
                          title={favorite ? 'Remove Favorite' : 'Add to Favorites'}
                          className={`p-1.5 rounded border transition-colors ${favorite
                              ? 'bg-terminal-yellow/15 border-terminal-yellow/40 text-terminal-yellow'
                              : 'bg-terminal-card border-terminal-border text-terminal-muted hover:text-terminal-yellow'
                            }`}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${favorite ? 'fill-terminal-yellow' : ''}`}
                          />
                        </button>

                        {/* Chart Icon */}
                        <button
                          type="button"
                          onClick={() => onSelectCoin(row)}
                          title="Open Coin Detail & Chart"
                          className="p-1.5 rounded bg-terminal-card border border-terminal-border text-terminal-muted hover:text-terminal-cyan hover:border-terminal-cyan transition-colors"
                        >
                          <LineChart className="w-3.5 h-3.5" />
                        </button>

                        {/* POA Quick Button */}
                        {onOpenPOA && (
                          <button
                            type="button"
                            onClick={() => onOpenPOA(row)}
                            title="Create Plan of Attack"
                            className="p-1.5 rounded bg-terminal-green/15 border border-terminal-green/30 text-terminal-green hover:bg-terminal-green/25 transition-colors font-bold flex items-center gap-1 text-[10px]"
                          >
                            <Zap className="w-3 h-3" />
                            <span>POA</span>
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
    </div>
  );
}
