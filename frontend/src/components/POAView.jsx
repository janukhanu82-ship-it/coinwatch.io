import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, Clock, XCircle, TrendingUp, Plus, Shield } from 'lucide-react';

export default function POAView({ onOpenNewPOA }) {
  const [poaList, setPoaList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPOAs = () => {
    fetch('/api/poa')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPoaList(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchPOAs();
  }, []);

  const updateStatus = async (id, status) => {
    await fetch(`/api/poa/${id}/status?status=${status}`, { method: 'PATCH' });
    fetchPOAs();
  };

  return (
    <div className="space-y-6 font-mono select-none">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase mb-1">
            TRADE EXECUTION BLUEPRINTS
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-sans">
            Plan of Attack (POA)
          </h1>
          <p className="text-xs text-[#8E9BAE] mt-1">
            Structured trade plans with mathematical position sizing & invalidation tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <div className="text-emerald-400 font-bold">{poaList.filter(p => p.status === 'ARMED').length} Armed</div>
            <div className="text-[#5A6882]">Active watches</div>
          </div>
        </div>
      </div>

      {/* POA List Cards */}
      {poaList.length === 0 ? (
        <div className="bg-[#0C101A] border border-[#1A2234] rounded-2xl p-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <Target className="w-6 h-6" />
          </div>
          <div className="text-white font-bold text-base">No Active Plan of Attack Setups</div>
          <p className="text-xs text-[#8E9BAE] max-w-md mx-auto">
            Click on any live signal from the <span className="text-emerald-400 font-bold">Pump / Dump</span> scanner to generate an automated mathematical Plan of Attack.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {poaList.map((poa) => {
            const isLong = poa.side === 'LONG';
            return (
              <div 
                key={poa.id}
                className="bg-[#0C101A] border border-[#1A2234] rounded-2xl p-5 space-y-4 hover:border-emerald-500/40 transition-colors shadow-xl"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-white font-sans">#{poa.symbol}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#101522] border border-[#1A2234] text-[#8E9BAE] uppercase">
                        {poa.exchange}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isLong ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {poa.side}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#5A6882] mt-1 line-clamp-1">{poa.thesis}</div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    poa.status === 'ARMED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' :
                    poa.status === 'TRIGGERED' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' :
                    'bg-[#101522] text-[#8E9BAE] border-[#1A2234]'
                  }`}>
                    {poa.status}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-[11px] bg-[#07090E] p-3 rounded-xl border border-[#151B28]">
                  <div>
                    <div className="text-[10px] text-[#5A6882]">ENTRY</div>
                    <div className="text-emerald-400 font-bold">${poa.entry_zone_low} - ${poa.entry_zone_high}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#5A6882]">STOP LOSS</div>
                    <div className="text-rose-400 font-bold">${poa.stop_loss}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#5A6882]">TARGET 1</div>
                    <div className="text-emerald-400 font-bold">${poa.tp1}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#5A6882]">POSITION</div>
                    <div className="text-white font-bold">${poa.suggested_position_usd || 0}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#151B28]">
                  <span className="text-[#5A6882]">Risk: ${poa.risk_usd} ({poa.risk_percentage}%)</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(poa.id, 'TRIGGERED')}
                      className="px-2 py-1 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold"
                    >
                      Triggered
                    </button>
                    <button
                      onClick={() => updateStatus(poa.id, 'CLOSED')}
                      className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold"
                    >
                      Close R
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
