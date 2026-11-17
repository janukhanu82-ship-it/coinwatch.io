import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Calculator, CheckCircle2, Zap, ArrowRight } from 'lucide-react';

export default function POAModal({ coin, onClose, onSave }) {
  if (!coin) return null;

  const [side, setSide] = useState('LONG');
  const [entryLow, setEntryLow] = useState(coin.price || 0);
  const [entryHigh, setEntryHigh] = useState(coin.price || 0);
  const [dca1, setDca1] = useState((coin.price || 0) * 0.99);
  const [stopLoss, setStopLoss] = useState((coin.price || 0) * 0.98);
  const [tp1, setTp1] = useState((coin.price || 0) * 1.03);
  const [tp2, setTp2] = useState((coin.price || 0) * 1.05);
  const [thesis, setThesis] = useState(
    `Unusual 1m volume surge (${coin.volume_spike_ratio || 2.5}x) with ${coin.flow_quadrant || 'BUILDUP'} on ${coin.exchange?.toUpperCase()}.`
  );

  // Position Sizing Calculator state
  const [accountSize, setAccountSize] = useState(10000);
  const [riskPct, setRiskPct] = useState(1.0);
  const [leverage, setLeverage] = useState(5);
  const [calculatedSize, setCalculatedSize] = useState(null);
  const [saving, setSaving] = useState(false);

  // Pre-populate suggested values on open
  useEffect(() => {
    if (!coin.exchange || !coin.symbol) return;
    fetch(`/api/chart/${coin.exchange.toLowerCase()}/${coin.symbol.toUpperCase()}/candles`)
      .then((res) => res.json())
      .then((data) => {
        if (data.poa_levels) {
          const p = data.poa_levels;
          if (p.side) setSide(p.side);
          if (p.entry_zone_low) setEntryLow(p.entry_zone_low);
          if (p.entry_zone_high) setEntryHigh(p.entry_zone_high);
          if (p.dca1) setDca1(p.dca1);
          if (p.stop_loss) setStopLoss(p.stop_loss);
          if (p.tp1) setTp1(p.tp1);
          if (p.tp2) setTp2(p.tp2);
        }
      })
      .catch(console.error);
  }, [coin.exchange, coin.symbol]);

  // Recalculate position sizing
  useEffect(() => {
    const entry = (Number(entryLow) + Number(entryHigh)) / 2;
    const sl = Number(stopLoss);
    if (entry > 0 && sl > 0 && entry !== sl) {
      const riskAmount = accountSize * (riskPct / 100);
      const priceDistancePct = Math.abs(entry - sl) / entry;
      const positionUsd = riskAmount / priceDistancePct;
      const contracts = positionUsd / entry;
      const margin = positionUsd / leverage;

      setCalculatedSize({
        riskAmount: riskAmount.toFixed(2),
        priceDistancePct: (priceDistancePct * 100).toFixed(2),
        positionUsd: positionUsd.toFixed(2),
        contracts: contracts.toFixed(4),
        margin: margin.toFixed(2),
      });
    }
  }, [accountSize, riskPct, entryLow, entryHigh, stopLoss, leverage]);

  const handleSave = async (status = 'ARMED') => {
    setSaving(true);
    const poaRecord = {
      id: Math.random().toString(36).substring(2, 10),
      symbol: coin.symbol.toUpperCase(),
      canonical: coin.canonical || `${coin.symbol.toUpperCase()}-PERP`,
      exchange: coin.exchange.toLowerCase(),
      side: side,
      thesis: thesis,
      current_price: coin.price || 0,
      entry_zone_low: Number(entryLow),
      entry_zone_high: Number(entryHigh),
      dca1: Number(dca1),
      stop_loss: Number(stopLoss),
      tp1: Number(tp1),
      tp2: Number(tp2),
      account_size_usd: Number(accountSize),
      risk_percentage: Number(riskPct),
      risk_usd: calculatedSize ? Number(calculatedSize.riskAmount) : 100,
      suggested_position_usd: calculatedSize ? Number(calculatedSize.positionUsd) : 0,
      suggested_contracts: calculatedSize ? Number(calculatedSize.contracts) : 0,
      suggested_leverage: Number(leverage),
      margin_required_usd: calculatedSize ? Number(calculatedSize.margin) : 0,
      status: status,
    };

    try {
      await fetch('/api/poa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poaRecord),
      });
      if (onSave) onSave(poaRecord);
      onClose();
    } catch (err) {
      console.error('Error saving POA:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-mono select-none">
      <div className="bg-terminal-card border border-terminal-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-terminal-border flex items-center justify-between bg-terminal-dark">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-terminal-cyan/15 border border-terminal-cyan/30 text-terminal-cyan">
              <Zap className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
                <span>PLAN OF ATTACK (POA)</span>
                <span className="text-terminal-cyan">#{coin.symbol}</span>
              </h2>
              <p className="text-xs text-terminal-muted">
                Exchange: <span className="text-white font-bold uppercase">{coin.exchange}</span> | Current Price:{' '}
                <span className="text-terminal-green font-bold">
                  ${coin.price < 1 ? (coin.price || 0).toFixed(4) : (coin.price || 0).toLocaleString()}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-terminal-muted hover:text-white hover:bg-terminal-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {/* Side & Thesis */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="w-full sm:w-1/2">
              <label className="text-terminal-muted mb-1 block uppercase text-[11px] font-bold">
                FAVORED SIDE
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSide('LONG')}
                  className={`flex-1 py-2 rounded-lg font-bold border transition-all text-xs ${
                    side === 'LONG'
                      ? 'bg-terminal-green/20 text-terminal-green border-terminal-green shadow-sm shadow-terminal-green/20'
                      : 'bg-terminal-dark border-terminal-border text-terminal-muted hover:text-white'
                  }`}
                >
                  🟢 LONG / BUY
                </button>
                <button
                  type="button"
                  onClick={() => setSide('SHORT')}
                  className={`flex-1 py-2 rounded-lg font-bold border transition-all text-xs ${
                    side === 'SHORT'
                      ? 'bg-terminal-red/20 text-terminal-red border-terminal-red shadow-sm shadow-terminal-red/20'
                      : 'bg-terminal-dark border-terminal-border text-terminal-muted hover:text-white'
                  }`}
                >
                  🔴 SHORT / SELL
                </button>
              </div>
            </div>

            <div className="w-full sm:w-1/2">
              <label className="text-terminal-muted mb-1 block uppercase text-[11px] font-bold">
                SETUP THESIS
              </label>
              <input
                type="text"
                value={thesis}
                onChange={(e) => setThesis(e.target.value)}
                placeholder="Market thesis for this execution..."
                className="w-full bg-terminal-dark border border-terminal-border rounded-lg px-3 py-2 text-white outline-none focus:border-terminal-cyan text-xs"
              />
            </div>
          </div>

          {/* Key Price Levels */}
          <div>
            <label className="text-terminal-muted mb-2 block uppercase text-[11px] font-bold">
              EXECUTION PARAMETERS
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-terminal-muted text-[10px] mb-1 block">ENTRY LOW</label>
                <input
                  type="number"
                  step="any"
                  value={entryLow}
                  onChange={(e) => setEntryLow(e.target.value)}
                  className="w-full bg-terminal-dark border border-terminal-border rounded-lg px-3 py-2 text-terminal-cyan font-bold outline-none focus:border-terminal-cyan text-xs"
                />
              </div>
              <div>
                <label className="text-terminal-muted text-[10px] mb-1 block">ENTRY HIGH</label>
                <input
                  type="number"
                  step="any"
                  value={entryHigh}
                  onChange={(e) => setEntryHigh(e.target.value)}
                  className="w-full bg-terminal-dark border border-terminal-border rounded-lg px-3 py-2 text-terminal-cyan font-bold outline-none focus:border-terminal-cyan text-xs"
                />
              </div>
              <div>
                <label className="text-terminal-muted text-[10px] mb-1 block text-blue-400">DCA 1</label>
                <input
                  type="number"
                  step="any"
                  value={dca1}
                  onChange={(e) => setDca1(e.target.value)}
                  className="w-full bg-terminal-dark border border-terminal-border rounded-lg px-3 py-2 text-blue-400 font-bold outline-none focus:border-terminal-cyan text-xs"
                />
              </div>
              <div>
                <label className="text-terminal-muted text-[10px] mb-1 block text-terminal-red">
                  STOP LOSS
                </label>
                <input
                  type="number"
                  step="any"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full bg-terminal-dark border border-terminal-red/50 rounded-lg px-3 py-2 text-terminal-red font-bold outline-none focus:border-terminal-red text-xs"
                />
              </div>
            </div>
          </div>

          {/* Take Profit Targets */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-terminal-muted text-[10px] mb-1 block text-terminal-green">
                TAKE PROFIT 1 (1.5R)
              </label>
              <input
                type="number"
                step="any"
                value={tp1}
                onChange={(e) => setTp1(e.target.value)}
                className="w-full bg-terminal-dark border border-terminal-green/50 rounded-lg px-3 py-2 text-terminal-green font-bold outline-none focus:border-terminal-green text-xs"
              />
            </div>
            <div>
              <label className="text-terminal-muted text-[10px] mb-1 block text-terminal-green">
                TAKE PROFIT 2 (2.5R)
              </label>
              <input
                type="number"
                step="any"
                value={tp2}
                onChange={(e) => setTp2(e.target.value)}
                className="w-full bg-terminal-dark border border-terminal-green/50 rounded-lg px-3 py-2 text-terminal-green font-bold outline-none focus:border-terminal-green text-xs"
              />
            </div>
          </div>

          {/* Position Sizer Card */}
          <div className="p-4 rounded-xl bg-terminal-dark border border-terminal-border space-y-3">
            <div className="flex items-center justify-between text-xs text-white font-bold border-b border-terminal-border pb-2">
              <span className="flex items-center gap-1.5 text-terminal-yellow">
                <Calculator className="w-4 h-4" />
                <span>POSITION SIZER & RISK ENGINE</span>
              </span>
              <span className="text-[10px] text-terminal-muted uppercase">Fixed Fractional Risk</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-terminal-muted text-[10px] mb-1 block">ACCOUNT SIZE ($)</label>
                <input
                  type="number"
                  value={accountSize}
                  onChange={(e) => setAccountSize(Number(e.target.value))}
                  className="w-full bg-terminal-card border border-terminal-border rounded-lg px-2.5 py-1.5 text-white font-bold outline-none text-xs"
                />
              </div>

              <div>
                <label className="text-terminal-muted text-[10px] mb-1 block">RISK % OF ACCOUNT</label>
                <input
                  type="number"
                  step="0.25"
                  value={riskPct}
                  onChange={(e) => setRiskPct(Number(e.target.value))}
                  className="w-full bg-terminal-card border border-terminal-border rounded-lg px-2.5 py-1.5 text-white font-bold outline-none text-xs"
                />
              </div>

              <div>
                <label className="text-terminal-muted text-[10px] mb-1 block">LEVERAGE</label>
                <select
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="w-full bg-terminal-card border border-terminal-border rounded-lg px-2.5 py-1.5 text-white font-bold outline-none text-xs cursor-pointer"
                >
                  {[2, 3, 5, 10, 15, 20].map((x) => (
                    <option key={x} value={x}>
                      {x}x Isolated
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {calculatedSize && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-terminal-border/60 text-[11px]">
                <div className="bg-terminal-card p-2 rounded border border-terminal-border">
                  <div className="text-terminal-muted text-[9px]">MAX RISK ($)</div>
                  <div className="text-terminal-red font-bold text-xs">${calculatedSize.riskAmount}</div>
                </div>
                <div className="bg-terminal-card p-2 rounded border border-terminal-border">
                  <div className="text-terminal-muted text-[9px]">SL DISTANCE</div>
                  <div className="text-white font-bold text-xs">{calculatedSize.priceDistancePct}%</div>
                </div>
                <div className="bg-terminal-card p-2 rounded border border-terminal-border">
                  <div className="text-terminal-muted text-[9px]">POSITION VALUE</div>
                  <div className="text-terminal-cyan font-bold text-xs">${calculatedSize.positionUsd}</div>
                </div>
                <div className="bg-terminal-card p-2 rounded border border-terminal-border">
                  <div className="text-terminal-muted text-[9px]">MARGIN REQ</div>
                  <div className="text-terminal-green font-bold text-xs">${calculatedSize.margin}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-terminal-border bg-terminal-dark flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-terminal-border text-terminal-muted hover:text-white transition-colors text-xs"
          >
            Cancel
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSave('DRAFT')}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-terminal-border bg-terminal-card text-terminal-text hover:text-white font-semibold transition-colors text-xs"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => handleSave('ARMED')}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-terminal-green text-terminal-bg font-extrabold hover:brightness-110 shadow-lg shadow-terminal-green/20 transition-all text-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ARM PLAN OF ATTACK</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
