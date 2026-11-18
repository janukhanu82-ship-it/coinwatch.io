import React from 'react';
import ScannerTable from './ScannerTable';
import FilterBar from './FilterBar';
import { PageHeader, LivePill } from './ui';
import { ChartBar } from '@phosphor-icons/react';

export default function MarketsView({ scannerData, filters, setFilters, onSelectCoin, onOpenPOA, isConnected, sourceLabel }) {
  const filteredData = scannerData.filter((item) => {
    if (filters.exchange !== 'all' && item.exchange.toLowerCase() !== filters.exchange.toLowerCase()) return false;
    if ((item.volume_24h_usd || 0) < filters.minVolume) return false;
    if (filters.flow !== 'ALL' && item.flow_quadrant !== filters.flow) return false;
    if (filters.decoupledOnly && !item.breakdown?.is_decoupled) return false;
    if (filters.signal && filters.signal !== 'ALL' && !(item.signal_status || '').toUpperCase().includes(filters.signal)) return false;
    if (filters.search && !item.symbol.toUpperCase().includes(filters.search)) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="All monitored contracts"
        eyebrowIcon={ChartBar}
        title="Markets"
        description="Real-time perpetual metrics across Hyperliquid, Binance and Bybit."
        actions={
          <>
            <span className="cw-num text-[12px] text-fog">
              <span className="text-snow">{filteredData.length}</span> / {scannerData.length} pairs
            </span>
            <LivePill isConnected={isConnected} label={sourceLabel} />
          </>
        }
      />

      <FilterBar filters={filters} setFilters={setFilters} />

      <div className="cw-panel overflow-hidden">
        <ScannerTable data={filteredData} onSelectCoin={onSelectCoin} onOpenPOA={onOpenPOA} />
      </div>
    </div>
  );
}
