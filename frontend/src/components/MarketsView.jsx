import React from 'react';
import ScannerTable from './ScannerTable';
import FilterBar from './FilterBar';

export default function MarketsView({ 
  scannerData, 
  filters, 
  setFilters, 
  onSelectCoin, 
  onOpenPOA 
}) {
  const filteredData = scannerData.filter(item => {
    if (filters.exchange !== 'all' && item.exchange.toLowerCase() !== filters.exchange.toLowerCase()) {
      return false;
    }
    if (item.volume_24h_usd < filters.minVolume) {
      return false;
    }
    if (filters.flow !== 'ALL' && item.flow_quadrant !== filters.flow) {
      return false;
    }
    if (filters.decoupledOnly && !item.breakdown?.is_decoupled) {
      return false;
    }
    if (filters.search && !item.symbol.includes(filters.search)) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 font-mono select-none">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase mb-1">
            ALL MONITORED CONTRACTS
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-sans">
            Markets
          </h1>
          <p className="text-xs text-[#8E9BAE] mt-1">
            Real-time multi-exchange perpetual metrics (Hyperliquid #1, Binance #2, Bybit #3).
          </p>
        </div>

        <div className="text-right text-xs font-mono">
          <div className="text-white font-bold">{filteredData.length} Matching Pairs</div>
          <div className="text-[#5A6882]">Out of {scannerData.length} tracked</div>
        </div>
      </div>

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        totalMatching={filteredData.length}
      />

      <div className="rounded-2xl border border-[#1A2234] bg-[#0C101A] overflow-hidden shadow-2xl">
        <ScannerTable
          data={filteredData}
          onSelectCoin={onSelectCoin}
          onOpenPOA={onOpenPOA}
        />
      </div>
    </div>
  );
}
