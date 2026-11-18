import React from 'react';
import { Star, ArrowUpRight, TrendingUp, TrendingDown, Zap, LineChart } from 'lucide-react';

export default function FavoritesTab({
  favorites = [],
  scannerData = [],
  onSelectCoin,
  onRemoveFavorite,
}) {
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
            {(ex || 'EX').substring(0, 3).toUpperCase()}
          </span>
        );
    }
  };

  const getSignalBadge = (status) => {
    if (!status || status === 'ACTIVE') return null;
    const isPump = status.includes('PUMP');
    const isDump = status.includes('DUMP');
    const isBreakout = status.includes('BREAKOUT');
    return (
      <span
        className={`px-1.5 py-0.5 rounded text-[9px] font-bold truncate max-w-[140px] border ${
          isPump
            ? 'bg-terminal-green/20 text-terminal-green border-terminal-green/30'
            : isDump
            ? 'bg-terminal-red/20 text-terminal-red border-terminal-red/30'
            : isBreakout
            ? 'bg-terminal-cyan/20 text-terminal-cyan border-terminal-cyan/30'
            : 'bg-terminal-yellow/20 text-terminal-yellow border-terminal-yellow/30'
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-4 space-y-4 font-mono select-none overflow-y-auto">
      {/* Top Header */}
      <div className="bg-terminal-card border border-terminal-border rounded-xl p-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-terminal-yellow fill-terminal-yellow" />
          <span className="text-white font-bold tracking-wider">STARRED FAVORITES</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-terminal-dark border border-terminal-border text-terminal-muted">
            {favorites.length} saved
          </span>
        </div>
        <p className="text-[11px] text-terminal-muted hidden sm:block">
          Quickly monitor your starred instruments with live multi-exchange pricing
        </p>
      </div>

      {/* Grid of Cards */}
      {favorites.length === 0 ? (
        <div className="flex-1 rounded-xl border border-terminal-border bg-terminal-dark py-24 flex flex-col items-center justify-center space-y-3 text-center">
          <div className="p-3 rounded-full bg-terminal-card border border-terminal-border">
            <Star className="w-8 h-8 text-terminal-muted/40 animate-pulse" />
          </div>
          <p className="text-white font-bold text-sm">No favorites yet</p>
          <p className="text-xs text-terminal-muted max-w-sm">
            Star coins from the RADAR tab to build your quick-access watchlist here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {favorites.map((fav) => {
            const coin =
              scannerData.find(
                (c) =>
                  c.symbol?.toUpperCase() === fav.symbol?.toUpperCase() &&
                  c.exchange?.toLowerCase() === fav.exchange?.toLowerCase()
              ) || {
                symbol: fav.symbol,
                exchange: fav.exchange,
                price: 0,
                price_change_1m: 0,
                price_change_5m: 0,
                volume_spike_ratio: 1.0,
                composite_score: 0,
                signal_status: 'ACTIVE',
              };

            const price = coin.price || 0;
            const change1m = coin.price_change_1m || 0;
            const isUp = change1m >= 0;

            return (
              <div
                key={`${fav.exchange}:${fav.symbol}`}
                onClick={() => onSelectCoin && onSelectCoin(coin)}
                className="bg-terminal-card border border-terminal-border rounded-xl p-4 hover:border-terminal-cyan/60 hover:bg-terminal-hover/40 transition-all cursor-pointer shadow-lg group relative flex flex-col justify-between space-y-3"
              >
                {/* Header: Exchange Badge, Symbol, Star Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getExchangeBadge(fav.exchange)}
                    <span className="font-extrabold text-white text-base tracking-wide group-hover:text-terminal-cyan transition-colors">
                      {fav.symbol}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onRemoveFavorite) onRemoveFavorite(fav);
                    }}
                    title="Remove from favorites"
                    className="p-1 rounded text-terminal-yellow hover:scale-110 transition-transform"
                  >
                    <Star className="w-4 h-4 fill-terminal-yellow" />
                  </button>
                </div>

                {/* Price & 1m Change */}
                <div className="flex items-baseline justify-between pt-1">
                  <div className="text-xl font-extrabold text-white">
                    $
                    {price < 1
                      ? price.toFixed(4)
                      : price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                  </div>
                  <div
                    className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded ${
                      isUp
                        ? 'bg-terminal-green/15 text-terminal-green border border-terminal-green/30'
                        : 'bg-terminal-red/15 text-terminal-red border border-terminal-red/30'
                    }`}
                  >
                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>
                      {isUp ? '+' : ''}
                      {change1m.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Stats Row: Vol Spike, 5m Change, Score */}
                <div className="pt-2 border-t border-terminal-border/60 grid grid-cols-3 gap-2 text-[10px] text-terminal-muted">
                  <div>
                    <div>VOL SPIKE</div>
                    <div
                      className={`font-bold text-xs ${
                        (coin.volume_spike_ratio || 1) >= 2.5
                          ? 'text-terminal-green font-extrabold'
                          : 'text-white'
                      }`}
                    >
                      {(coin.volume_spike_ratio || 1.0).toFixed(1)}x
                    </div>
                  </div>

                  <div>
                    <div>5M CHANGE</div>
                    <div
                      className={`font-bold text-xs ${
                        (coin.price_change_5m || 0) >= 0
                          ? 'text-terminal-green'
                          : 'text-terminal-red'
                      }`}
                    >
                      {(coin.price_change_5m || 0) >= 0 ? '+' : ''}
                      {(coin.price_change_5m || 0).toFixed(2)}%
                    </div>
                  </div>

                  <div>
                    <div>SCORE</div>
                    <div
                      className={`font-bold text-xs ${
                        (coin.composite_score || 0) >= 75
                          ? 'text-terminal-green'
                          : (coin.composite_score || 0) >= 50
                          ? 'text-terminal-cyan'
                          : 'text-terminal-muted'
                      }`}
                    >
                      {Math.round(coin.composite_score || 0)}
                    </div>
                  </div>
                </div>

                {/* Footer: Signal Status & Detail prompt */}
                <div className="flex items-center justify-between pt-1">
                  {getSignalBadge(coin.signal_status) || (
                    <span className="text-[10px] text-terminal-muted font-mono uppercase">
                      {coin.flow_quadrant || 'NEUTRAL'}
                    </span>
                  )}
                  <span className="text-[10px] text-terminal-cyan font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    <span>CHART</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
