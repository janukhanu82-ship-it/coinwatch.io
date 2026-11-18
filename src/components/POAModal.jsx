import React, { useState, useEffect } from 'react';
import { X, Calculator, CheckCircle } from '@phosphor-icons/react';
import CoinIcon from './CoinIcon';
import { exchangeName } from './ExchangeLogo';

export default function POAModal({ coin, onClose, onSave, risk }) {
  if (!coin) return null;

  const initialSide = coin.preferredSide || (coin.type === 'DUMP' ? 'SHORT' : 'LONG');
  const px = Number(coin.price) || 0;
  const dir = initialSide === 'LONG' ? 1 : -1;
  // Use the scanner's levels when the plan follows the signal; otherwise mirror around price.
  const follows = coin.stop_loss != null && (coin.type === 'DUMP' ? 'SHORT' : 'LONG') === initialSide;
  const round = (v) => +Number(v).toPrecision(6);
  const [side, setSide] = useState(initialSide);
  const [entryLow, setEntryLow] = useState(round(px));
  const [entryHigh, setEntryHigh] = useState(round(px));
  const [dca1, setDca1] = useState(round(px * (1 - dir * 0.01)));
  const [stopLoss, setStopLoss] = useState(follows ? coin.stop_loss : round(px * (1 - dir * 0.02)));
  const [tp1, setTp1] = useState(follows ? coin.tp1 : round(px * (1 + dir * 0.03)));
  const [tp2, setTp2] = useState(follows ? coin.tp2 : round(px * (1 + dir * 0.05)));
  const [thesis, setThesis] = useState(
    coin.change_pct != null
      ? `${coin.timeframe?.toUpperCase() || '1M'} ${coin.type === 'DUMP' ? 'dump' : 'pump'} of ${coin.change_pct}% on ${exchangeName(coin.exchange)} with ${coin.vol_spike || coin.volume_spike_ratio || 1}x volume.`
      : `Manual ${initialSide.toLowerCase()} plan on ${exchangeName(coin.exchange)}.`,
  );

  // Position Sizing Calculator state
  const [accountSize, setAccountSize] = useState(risk?.configured ? Number(risk.balance) || 10000 : 10000);
  const [riskPct, setRiskPct] = useState(risk?.configured ? Number(risk.riskPerTrade) || 1 : 1.0);
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
          if (p.side && !coin.preferredSide) setSide(p.side);
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

    let savedRemotely = false;
    try {
      const res = await fetch('/api/poa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poaRecord),
      });
      savedRemotely = res.ok;
    } catch {
      savedRemotely = false;
    }
    if (!savedRemotely) {
      // Backend unavailable — keep the plan on this device.
      try {
        const local = JSON.parse(localStorage.getItem('cw.poa.local') || '[]');
        localStorage.setItem('cw.poa.local', JSON.stringify([{ ...poaRecord, local: true, created_at: Date.now() }, ...local].slice(0, 500)));
      } catch {
        /* storage unavailable */
      }
    }
    setSaving(false);
    if (onSave) onSave(poaRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none">
      <div className="cw-card w-full max-w-2xl tab-transition">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CoinIcon symbol={coin.symbol} exchange={coin.exchange} className="w-11 h-11" />
            <div>
              <h2 className="text-[18px] font-medium text-snow tracking-tight flex items-center gap-2">
                <span>Plan of Attack</span>
                <span className="text-mint">#{coin.symbol}</span>
              </h2>
              <p className="text-[12px] text-fog mt-0.5">
                Exchange: <span className="text-snow">{exchangeName(coin.exchange)}</span> | Current Price:{' '}
                <span className="text-mint cw-num">
                  ${coin.price < 1 ? (coin.price || 0).toFixed(4) : (coin.price || 0).toLocaleString()}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-fog hover:text-snow hover:border-white/20 transition-colors"
          >
            <X weight="bold" className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {/* Side & Thesis */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="w-full sm:w-1/2">
              <label className="text-terminal-muted mb-1 block text-[11px] font-medium tracking-[0.06em] uppercase">
                FAVORED SIDE
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSide('LONG')}
                  className={`flex-1 py-2 rounded-xl font-bold border transition-all text-xs ${
                    side === 'LONG'
                      ? 'bg-terminal-green/20 text-terminal-green border-terminal-green shadow-sm shadow-terminal-green/20'
                      : 'bg-terminal-dark border-terminal-border text-terminal-muted hover:text-white'
                  }`}
                >
                  Long / buy
                </button>
                <button
                  type="button"
                  onClick={() => setSide('SHORT')}
                  className={`flex-1 py-2 rounded-xl font-bold border transition-all text-xs ${
                    side === 'SHORT'
                      ? 'bg-terminal-red/20 text-terminal-red border-terminal-red shadow-sm shadow-terminal-red/20'
                      : 'bg-terminal-dark border-terminal-border text-terminal-muted hover:text-white'
                  }`}
                >
                  Short / sell
                </button>
              </div>
            </div>

            <div className="w-full sm:w-1/2">
              <label className="text-terminal-muted mb-1 block text-[11px] font-medium tracking-[0.06em] uppercase">
                SETUP THESIS
              </label>
              <input
                type="text"
                value={thesis}
                onChange={(e) => setThesis(e.target.value)}
                placeholder="Market thesis for this execution..."
                className="w-full bg-terminal-dark border border-terminal-border rounded-xl px-3 py-2 text-white outline-none focus:border-terminal-cyan text-xs"
              />
            </div>
          </div>

          {/* Key Price Levels */}
          <div>
            <label className="text-terminal-muted mb-2 block text-[11px] font-medium tracking-[0.06em] uppercase">
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
                  className="w-full bg-terminal-dark border border-terminal-border rounded-xl px-3 py-2 text-terminal-cyan cw-num outline-none focus:border-terminal-cyan text-xs"
                />
              </div>
              <div>
                <label className="text-terminal-muted text-[10px] mb-1 block">ENTRY HIGH</label>
                <input
                  type="number"
                  step="any"
                  value={entryHigh}
                  onChange={(e) => setEntryHigh(e.target.value)}
                  className="w-full bg-terminal-dark border border-terminal-border rounded-xl px-3 py-2 text-terminal-cyan cw-num outline-none focus:border-terminal-cyan text-xs"
                />
              </div>
              <div>
                <label className="text-terminal-muted text-[10px] mb-1 block text-terminal-cyan">DCA 1</label>
                <input
                  type="number"
                  step="any"
                  value={dca1}
                  onChange={(e) => setDca1(e.target.value)}
                  className="w-full bg-terminal-dark border border-terminal-border rounded-xl px-3 py-2 text-terminal-cyan cw-num outline-none focus:border-terminal-cyan text-xs"
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
                  className="w-full bg-terminal-dark border border-terminal-red/50 rounded-xl px-3 py-2 text-terminal-red cw-num outline-none focus:border-terminal-red text-xs"
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
                className="w-full bg-terminal-dark border border-terminal-green/50 rounded-xl px-3 py-2 text-terminal-green cw-num outline-none focus:border-terminal-green text-xs"
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
                className="w-full bg-terminal-dark border border-terminal-green/50 rounded-xl px-3 py-2 text-terminal-green cw-num outline-none focus:border-terminal-green text-xs"
              />
            </div>
          </div>

          {/* Position Sizer Card */}
          <div className="p-4 rounded-2xl bg-ink-2/80 border border-white/[0.05] space-y-3">
            <div className="flex items-center justify-between text-xs text-white font-bold border-b border-terminal-border pb-2">
              <span className="flex items-center gap-1.5 text-terminal-yellow">
                <Calculator weight="duotone" className="w-4 h-4" />
                <span>Position sizer & risk engine</span>
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
                  className="w-full bg-terminal-card border border-terminal-border rounded-xl px-2.5 py-1.5 text-white cw-num outline-none text-xs"
                />
              </div>

              <div>
                <label className="text-terminal-muted text-[10px] mb-1 block">RISK % OF ACCOUNT</label>
                <input
                  type="number"
                  step="0.25"
                  value={riskPct}
                  onChange={(e) => setRiskPct(Number(e.target.value))}
                  className="w-full bg-terminal-card border border-terminal-border rounded-xl px-2.5 py-1.5 text-white cw-num outline-none text-xs"
                />
              </div>

              <div>
                <label className="text-terminal-muted text-[10px] mb-1 block">LEVERAGE</label>
                <select
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="w-full bg-terminal-card border border-terminal-border rounded-xl px-2.5 py-1.5 text-white cw-num outline-none text-xs cursor-pointer"
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
                <div className="bg-terminal-card p-2.5 rounded-xl border border-white/[0.05]">
                  <div className="text-terminal-muted text-[9px]">MAX RISK ($)</div>
                  <div className="text-terminal-red font-bold text-xs">${calculatedSize.riskAmount}</div>
                </div>
                <div className="bg-terminal-card p-2.5 rounded-xl border border-white/[0.05]">
                  <div className="text-terminal-muted text-[9px]">SL DISTANCE</div>
                  <div className="text-white font-bold text-xs">{calculatedSize.priceDistancePct}%</div>
                </div>
                <div className="bg-terminal-card p-2.5 rounded-xl border border-white/[0.05]">
                  <div className="text-terminal-muted text-[9px]">POSITION VALUE</div>
                  <div className="text-terminal-cyan font-bold text-xs">${calculatedSize.positionUsd}</div>
                </div>
                <div className="bg-terminal-card p-2.5 rounded-xl border border-white/[0.05]">
                  <div className="text-terminal-muted text-[9px]">MARGIN REQ</div>
                  <div className="text-terminal-green font-bold text-xs">${calculatedSize.margin}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-fog hover:text-snow transition-colors text-[13px]"
          >
            Cancel
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSave('DRAFT')}
              disabled={saving}
              className="cw-btn"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => handleSave('ARMED')}
              disabled={saving}
              className="cw-btn-primary"
            >
              <CheckCircle weight="fill" className="w-4 h-4" />
              <span>Arm Plan of Attack</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
