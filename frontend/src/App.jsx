import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PumpDumpView from './components/PumpDumpView';
import MarketsView from './components/MarketsView';
import POAView from './components/POAView';
import SettingsView from './components/SettingsView';
import TradingViewChart from './components/TradingViewChart';
import POAModal from './components/POAModal';

export default function App() {
  const [activeNav, setActiveNav] = useState('pump_dump'); // 'pump_dump' | 'poa' | 'markets' | 'settings'
  const [sensitivity, setSensitivity] = useState(1.5);
  const [timeframe, setTimeframe] = useState('1m'); // '1m' | '5m' | '15m' | '1h' | '4h'
  const [stats, setStats] = useState({
    monitored: 821,
    stream_batches: '5 / 5',
    last_event: '03:11:23 AM',
    crossing_now: 1,
    pumps: 1,
    dumps: 0
  });

  const [liveSignals, setLiveSignals] = useState([]);
  const [historySignals, setHistorySignals] = useState([]);
  const [scannerData, setScannerData] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // Filters for Markets view
  const [filters, setFilters] = useState({
    exchange: 'all',
    minVolume: 5000000,
    flow: 'ALL',
    decoupledOnly: false,
    search: '',
  });

  // Modal / Drawer state
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [poaTargetCoin, setPoaTargetCoin] = useState(null);

  // Web Audio Ping
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {}
  };

  // Fetch Pump/Dump data for active timeframe & sensitivity
  const fetchPumpDumpData = () => {
    fetch(`/api/pump-dump/stats?sensitivity=${sensitivity}&timeframe=${timeframe}`)
      .then(r => r.json())
      .then(d => {
        if (d && typeof d === 'object') setStats(d);
      })
      .catch(() => {});

    fetch(`/api/pump-dump/signals?sensitivity=${sensitivity}&view=live&timeframe=${timeframe}`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setLiveSignals(d);
      })
      .catch(() => {});

    fetch(`/api/pump-dump/signals?sensitivity=${sensitivity}&view=history&timeframe=${timeframe}`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setHistorySignals(d);
      })
      .catch(() => {});
  };

  // Fetch Markets snapshot
  const fetchMarketsSnapshot = () => {
    fetch('/api/scanner/snapshot')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setScannerData(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchPumpDumpData();
    fetchMarketsSnapshot();

    const interval = setInterval(() => {
      fetchPumpDumpData();
    }, 2000);

    const marketsInterval = setInterval(() => {
      fetchMarketsSnapshot();
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(marketsInterval);
    };
  }, [sensitivity, timeframe]);

  // WebSocket Live Connection
  useEffect(() => {
    let ws = null;
    let reconnectTimer = null;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/scanner`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => setIsConnected(true);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'NEW_PUMP_DUMP_SIGNAL') {
            const sig = payload.data;
            const matchesTf = !sig.timeframe || sig.timeframe === timeframe;
            if (matchesTf && (Math.abs(sig.change_pct) >= sensitivity || sig.amplitude >= sensitivity)) {
              setLiveSignals(prev => [sig, ...prev.filter(x => x.id !== sig.id)].slice(0, 10));
              playAlertSound();
            }
          } else if (payload.type === 'STATS_UPDATE') {
            if (payload.data && typeof payload.data === 'object') {
              if (!payload.data.timeframe || payload.data.timeframe === timeframe) {
                setStats(payload.data);
              }
            }
          } else if (payload.type === 'SCANNER_TICK') {
            const updates = payload.data;
            setScannerData(prev => {
              const map = new Map(prev.map(row => [`${row.exchange}:${row.symbol}`, row]));
              for (const u of updates) {
                map.set(`${u.exchange}:${u.symbol}`, u);
              }
              return Array.from(map.values());
            });
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimer = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = () => ws.close();
    };

    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [sensitivity, timeframe]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#07090E] text-[#E2E8F0] font-sans antialiased">
      {/* Fixed Left Sidebar */}
      <Sidebar 
        activeNav={activeNav} 
        setActiveNav={setActiveNav} 
      />

      {/* Main Work Area: Side-by-Side Split Dashboard & Docked Chart */}
      <div className="flex-1 h-screen overflow-hidden flex flex-row">
        {/* Left Dashboard Column */}
        <main className={`h-screen overflow-y-auto p-4 md:p-6 space-y-6 transition-all duration-200 ${
          selectedCoin ? 'flex-1 min-w-[480px]' : 'w-full'
        }`}>
          {activeNav === 'pump_dump' && (
            <PumpDumpView
              sensitivity={sensitivity}
              setSensitivity={setSensitivity}
              timeframe={timeframe}
              setTimeframe={setTimeframe}
              stats={stats}
              liveSignals={liveSignals}
              historySignals={historySignals}
              selectedCoin={selectedCoin}
              onSelectCoin={(coin) => setSelectedCoin(coin)}
              onOpenPOA={(coin) => setPoaTargetCoin(coin)}
            />
          )}

          {activeNav === 'markets' && (
            <MarketsView
              scannerData={scannerData}
              filters={filters}
              setFilters={setFilters}
              onSelectCoin={(coin) => setSelectedCoin(coin)}
              onOpenPOA={(coin) => setPoaTargetCoin(coin)}
            />
          )}

          {activeNav === 'poa' && (
            <POAView 
              onOpenNewPOA={(coin) => setPoaTargetCoin(coin)}
            />
          )}

          {activeNav === 'settings' && (
            <SettingsView />
          )}
        </main>

        {/* Right Docked TradingView Pro Chart Column */}
        {selectedCoin && (
          <aside className="w-[480px] lg:w-[560px] xl:w-[660px] 2xl:w-[740px] h-screen border-l border-[#1A2234] bg-[#07090E] shrink-0 flex flex-col z-20 shadow-2xl">
            <TradingViewChart
              selectedCoin={selectedCoin}
              onClose={() => setSelectedCoin(null)}
              onOpenPOA={(coin) => {
                setPoaTargetCoin(coin);
              }}
            />
          </aside>
        )}
      </div>

      {/* Plan of Attack Modal */}
      {poaTargetCoin && (
        <POAModal
          coin={poaTargetCoin}
          onClose={() => setPoaTargetCoin(null)}
          onSave={() => {}}
        />
      )}
    </div>
  );
}
