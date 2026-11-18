import React, { useState } from 'react';
import { Plus, Bell, BellOff, Trash2, LineChart, ShieldAlert } from 'lucide-react';

export default function WatchlistTab({
  watchlist = [],
  scannerData = [],
  onSelectCoin,
  onAdd,
  onRemove,
  onToggleArmed,
}) {
  const [symbol, setSymbol] = useState('');
  const [exchange, setExchange] = useState('hyperliquid');
  const [threshold, setThreshold] = useState('3.0');

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!symbol.trim()) return;
    onAdd(symbol.trim().toUpperCase(), exchange, parseFloat(threshold) || 3.0);
    setSymbol('');
  };

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

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-4 space-y-3 font-mono select-none overflow-hidden">
      {/* Top Form to Add Watchlist Alert */}
      <form
        onSubmit={handleAddSubmit}
        className="bg-terminal-card border border-terminal-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-white font-bold tracking-wider">
            <ShieldAlert className="w-4 h-4 text-terminal-green" />
            <span>CUSTOM THRESHOLD WATCHLIST</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-terminal-dark border border-terminal-border text-terminal-muted">
            {watchlist.length} tracked
          </span>
        </div>

        {/* Inputs */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Symbol */}
          <input
            type="text"
            placeholder="SYMBOL (e.g. SOL)..."
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="bg-terminal-dark border border-terminal-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-terminal-muted outline-none focus:border-terminal-cyan uppercase w-36 font-mono"
            required
          />

          {/* Exchange */}
          <select
            value={exchange}
            onChange={(e) => setExchange(e.target.value)}
            className="bg-terminal-dark border border-terminal-border text-terminal-text rounded-lg px-3 py-1.5 text-xs outline-none focus:border-terminal-cyan cursor-pointer"
          >
            <option value="hyperliquid">HYPERLIQUID</option>
            <option value="binance">BINANCE</option>
            <option value="bybit">BYBIT</option>
          </select>

          {/* Threshold % */}
          <div className="flex items-center gap-1 bg-terminal-dark px-2.5 py-1.5 rounded-lg border border-terminal-border">
            <span className="text-terminal-muted text-[11px]">ALERT AT:</span>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="50"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-14 bg-terminal-card border border-terminal-border rounded px-1.5 py-0.5 text-terminal-cyan font-bold outline-none text-right text-xs"
            />
            <span className="text-terminal-muted text-[11px]">% 1m</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-terminal-green text-terminal-bg font-bold hover:brightness-110 shadow-sm shadow-terminal-green/30 transition-all text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD ALERT</span>
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="flex-1 rounded-xl border border-terminal-border bg-terminal-dark overflow-auto shadow-2xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-terminal-border bg-terminal-card/90 text-terminal-muted uppercase text-[11px] tracking-wider sticky top-0 z-10 backdrop-blur">
              <th className="py-2.5 px-4">PAIR</th>
              <th className="py-2.5 px-4">EXCHANGE</th>
              <th className="py-2.5 px-4 text-right">PRICE</th>
              <th className="py-2.5 px-4 text-right">1M%</th>
              <th className="py-2.5 px-4 text-center">ALERT THRESHOLD</th>
              <th className="py-2.5 px-4 text-center">STATUS</th>
              <th className="py-2.5 px-4 text-center">ACTIONS</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-terminal-border/40">
            {watchlist.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-terminal-muted">
                  No coins in watchlist. Add coins above with custom volatility thresholds to get alerts.
                </td>
              </tr>
            ) : (
              watchlist.map((item) => {
                const match = scannerData.find(
                  (c) =>
                    c.symbol?.toUpperCase() === item.symbol?.toUpperCase() &&
                    c.exchange?.toLowerCase() === item.exchange?.toLowerCase()
                );
                const price = match ? match.price : 0;
                const change1m = match ? match.price_change_1m : 0;

                return (
                  <tr
                    key={`${item.exchange}:${item.symbol}`}
                    className="hover:bg-terminal-card/70 transition-colors"
                  >
                    {/* PAIR */}
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getExchangeBadge(item.exchange)}
                        <span className="font-bold text-white tracking-wide">
                          {item.symbol}
                        </span>
                      </div>
                    </td>

                    {/* EXCHANGE */}
                    <td className="py-2.5 px-4 uppercase text-terminal-muted font-medium whitespace-nowrap">
                      {item.exchange}
                    </td>

                    {/* PRICE */}
                    <td className="py-2.5 px-4 text-right font-bold text-white whitespace-nowrap">
                      {price > 0 ? (
                        `$${
                          price < 1
                            ? price.toFixed(4)
                            : price.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                        }`
                      ) : (
                        <span className="text-terminal-muted">—</span>
                      )}
                    </td>

                    {/* 1M% */}
                    <td
                      className={`py-2.5 px-4 text-right font-bold whitespace-nowrap ${
                        change1m >= 0 ? 'text-terminal-green' : 'text-terminal-red'
                      }`}
                    >
                      {match ? `${change1m >= 0 ? '+' : ''}${change1m.toFixed(2)}%` : '—'}
                    </td>

                    {/* ALERT THRESHOLD */}
                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-terminal-cyan/15 text-terminal-cyan border border-terminal-cyan/30 font-bold">
                        ±{item.alert_threshold ?? 3.0}% 1m
                      </span>
                    </td>

                    {/* STATUS (ARMED/MUTED) */}
                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      {item.armed ? (
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-terminal-green/20 text-terminal-green border border-terminal-green/40 shadow-sm shadow-terminal-green/20">
                          ARMED
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-400 border border-gray-700">
                          MUTED
                        </span>
                      )}
                    </td>

                    {/* ACTIONS */}
                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Toggle Arm / Mute */}
                        <button
                          type="button"
                          onClick={() => onToggleArmed(item.symbol, item.exchange)}
                          title={item.armed ? 'Mute Alert' : 'Arm Alert'}
                          className={`p-1.5 rounded border transition-colors ${
                            item.armed
                              ? 'bg-terminal-green/15 border-terminal-green/30 text-terminal-green hover:bg-terminal-green/25'
                              : 'bg-terminal-card border-terminal-border text-terminal-muted hover:text-white'
                          }`}
                        >
                          {item.armed ? (
                            <Bell className="w-3.5 h-3.5" />
                          ) : (
                            <BellOff className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Chart / Detail */}
                        <button
                          type="button"
                          onClick={() =>
                            onSelectCoin &&
                            onSelectCoin(
                              match || {
                                symbol: item.symbol,
                                exchange: item.exchange,
                                price: 0,
                              }
                            )
                          }
                          title="Open Chart & POA"
                          className="p-1.5 rounded bg-terminal-card border border-terminal-border text-terminal-muted hover:text-terminal-cyan hover:border-terminal-cyan transition-colors"
                        >
                          <LineChart className="w-3.5 h-3.5" />
                        </button>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => onRemove(item.symbol, item.exchange)}
                          title="Remove from Watchlist"
                          className="p-1.5 rounded bg-terminal-card border border-terminal-border text-terminal-muted hover:text-terminal-red hover:border-terminal-red/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
