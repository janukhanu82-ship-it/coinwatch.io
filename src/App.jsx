import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import useLocalStorage, { RISK_PROFILES } from "./lib/useLocalStorage";
import PumpDumpView from "./components/PumpDumpView";
import MarketsView from "./components/MarketsView";
import POAView from "./components/POAView";
import SettingsView from "./components/SettingsView";
import MarketDetail from "./components/MarketDetail";
import useLiveMarket from "./lib/useLiveMarket";
import POAModal from "./components/POAModal";

export default function App() {
  const [activeNav, setActiveNavState] = useState("pump_dump"); // 'pump_dump' | 'poa' | 'markets' | 'settings' | 'market'
  const [sensitivity, setSensitivity] = useState(1.5);
  const [timeframe, setTimeframe] = useState("1m"); // '1m' | '5m' | '15m' | '1h' | '4h'
  const [stats, setStats] = useState({
    monitored: 821,
    stream_batches: "5 / 5",
    last_event: "03:11:23 AM",
    crossing_now: 1,
    pumps: 1,
    dumps: 0,
  });

  const [liveSignals, setLiveSignals] = useState([]);
  const [historySignals, setHistorySignals] = useState([]);
  const [scannerData, setScannerData] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // Filters for Markets view
  const [filters, setFilters] = useState({
    exchange: "all",
    minVolume: 5000000,
    flow: "ALL",
    decoupledOnly: false,
    signal: "ALL",
    search: "",
  });

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useLocalStorage("cw.sound.enabled", true);
  const [historyClearedAt, setHistoryClearedAt] = useLocalStorage("cw.history.clearedAt", 0);
  const [risk, setRisk] = useLocalStorage("cw.risk", {
    configured: false,
    profile: "easy",
    balance: 10000,
    ...RISK_PROFILES.easy,
  });
  const [activity, setActivity] = useLocalStorage("cw.activity", []);
  const logActivity = (entry) =>
    setActivity((prev) =>
      [{ id: Date.now() + Math.random(), at: Date.now(), ...entry }, ...prev].slice(0, 2000),
    );

  // Market detail + modal state
  const [selectedCoin, setSelectedCoinState] = useState(null);
  const [returnNav, setReturnNav] = useState("pump_dump");
  const [poaTargetCoin, setPoaTargetCoin] = useState(null);

  // Hash routing: #/scanner, #/poa, #/markets, #/settings, #/market/SYMBOL?ex=binance
  const NAV_TO_PATH = {
    pump_dump: "scanner",
    poa: "poa",
    markets: "markets",
    settings: "settings",
  };
  const setActiveNav = (nav) => {
    setActiveNavState(nav);
    if (NAV_TO_PATH[nav]) window.location.hash = `/${NAV_TO_PATH[nav]}`;
  };
  const openMarket = (coin) => {
    if (!coin?.symbol) return;
    if (activeNav !== "market") setReturnNav(activeNav);
    setSelectedCoinState(coin);
    setActiveNavState("market");
    window.location.hash = `/market/${coin.symbol}?ex=${(coin.exchange || "binance").toLowerCase()}${coin.coin ? `&coin=${coin.coin}` : ""}`;
  };
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.replace(/^#\/?/, "");
      const [path, query = ""] = h.split("?");
      const [seg, sym] = path.split("/");
      if (seg === "market" && sym) {
        const q = new URLSearchParams(query);
        setSelectedCoinState((cur) =>
          cur && cur.symbol === sym
            ? cur
            : { symbol: sym, exchange: q.get("ex") || "binance", coin: q.get("coin") || undefined },
        );
        setActiveNavState("market");
        return;
      }
      const nav = Object.entries(NAV_TO_PATH).find(([, v]) => v === seg)?.[0];
      if (nav) setActiveNavState(nav);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  // Keep one audio context alive and gate every signal source through the
  // persisted sound preference.
  const soundEnabledRef = React.useRef(soundEnabled);
  const audioContextRef = React.useRef(null);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(
    () => () => {
      audioContextRef.current?.close().catch(() => {});
    },
    [],
  );

  // Web Audio Ping
  const playAlertSound = () => {
    if (!soundEnabledRef.current) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const audioCtx = audioContextRef.current || new AudioContext();
      audioContextRef.current = audioCtx;

      const ping = () => {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      };

      if (audioCtx.state === "suspended") {
        audioCtx
          .resume()
          .then(ping)
          .catch(() => {});
      } else {
        ping();
      }
    } catch (e) {}
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    soundEnabledRef.current = next;
    setSoundEnabled(next);
    if (next) playAlertSound();
  };

  // Fetch Pump/Dump data for active timeframe & sensitivity
  const fetchPumpDumpData = () => {
    fetch(`/api/pump-dump/stats?sensitivity=${sensitivity}&timeframe=${timeframe}`)
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d === "object") setStats(d);
      })
      .catch(() => {});

    fetch(`/api/pump-dump/signals?sensitivity=${sensitivity}&view=live&timeframe=${timeframe}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setLiveSignals(d);
      })
      .catch(() => {});

    fetch(`/api/pump-dump/signals?sensitivity=${sensitivity}&view=history&timeframe=${timeframe}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setHistorySignals(d);
      })
      .catch(() => {});
  };

  // Fetch Markets snapshot
  const fetchMarketsSnapshot = () => {
    fetch("/api/scanner/snapshot")
      .then((r) => r.json())
      .then((data) => {
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
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws/scanner`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => setIsConnected(true);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "NEW_PUMP_DUMP_SIGNAL") {
            const sig = payload.data;
            const matchesTf = !sig.timeframe || sig.timeframe === timeframe;
            if (
              matchesTf &&
              (Math.abs(sig.change_pct) >= sensitivity || sig.amplitude >= sensitivity)
            ) {
              setLiveSignals((prev) => [sig, ...prev.filter((x) => x.id !== sig.id)].slice(0, 10));
              playAlertSound();
            }
          } else if (payload.type === "STATS_UPDATE") {
            if (payload.data && typeof payload.data === "object") {
              if (!payload.data.timeframe || payload.data.timeframe === timeframe) {
                setStats(payload.data);
              }
            }
          } else if (payload.type === "SCANNER_TICK") {
            const updates = payload.data;
            setScannerData((prev) => {
              const map = new Map(prev.map((row) => [`${row.exchange}:${row.symbol}`, row]));
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

  // Browser-side exchange engine — used whenever the backend has no market data.
  const backendLive = scannerData.length > 0;
  const engine = useLiveMarket({ enabled: !backendLive, sensitivity, timeframe });
  const viewStats = backendLive
    ? stats
    : engine.stats || {
        monitored: 0,
        stream_batches: "0 / 3",
        last_event: "—",
        crossing_now: 0,
        pumps: 0,
        dumps: 0,
      };
  const viewLive = backendLive ? liveSignals : engine.live;
  const viewHistory = backendLive ? historySignals : engine.history;
  const viewRows = backendLive ? scannerData : engine.rows;
  const viewConnected = backendLive ? isConnected : engine.connected > 0;
  const sourceLabel = backendLive
    ? "coinwach backend stream"
    : `Direct exchange streams · ${Object.entries(engine.status || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ")}`;

  // Alert ping for new live signals from the engine
  const seenIds = React.useRef(new Set());
  useEffect(() => {
    if (backendLive) return;
    let fresh = false;
    for (const s of engine.live) {
      if (!seenIds.current.has(s.id)) {
        if (seenIds.current.size) fresh = true;
        seenIds.current.add(s.id);
      }
    }
    if (fresh) playAlertSound();
  }, [engine.live, backendLive]);

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-ink text-snow font-sans antialiased">
      <Sidebar
        activeNav={activeNav === "market" ? returnNav : activeNav}
        setActiveNav={setActiveNav}
        mobileOpen={mobileNavOpen}
        setMobileOpen={setMobileNavOpen}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
      />

      <main className="@container flex-1 min-h-0 min-w-0 h-full overflow-y-auto">
        <div
          key={activeNav}
          className="tab-transition mx-auto max-w-[1240px] px-4 md:px-8 py-6 md:py-8"
        >
          {activeNav === "pump_dump" && (
            <PumpDumpView
              sensitivity={sensitivity}
              setSensitivity={setSensitivity}
              timeframe={timeframe}
              setTimeframe={setTimeframe}
              stats={viewStats}
              liveSignals={viewLive}
              historySignals={viewHistory}
              selectedCoin={selectedCoin}
              onSelectCoin={openMarket}
              onOpenPOA={(coin) => setPoaTargetCoin(coin)}
              isConnected={viewConnected}
              sourceLabel={sourceLabel}
              historyClearedAt={historyClearedAt}
              onClearHistory={() => setHistoryClearedAt(Date.now())}
            />
          )}

          {activeNav === "markets" && (
            <MarketsView
              scannerData={viewRows}
              filters={filters}
              setFilters={setFilters}
              onSelectCoin={openMarket}
              onOpenPOA={(coin) => setPoaTargetCoin(coin)}
              isConnected={viewConnected}
              sourceLabel={sourceLabel}
            />
          )}

          {activeNav === "poa" && (
            <POAView
              onOpenNewPOA={(coin) => setPoaTargetCoin(coin)}
              historySignals={viewHistory.filter(
                (s) => !historyClearedAt || (s.raw_ts || 0) * 1000 > historyClearedAt,
              )}
              sensitivity={sensitivity}
              risk={risk}
              activity={activity}
              onActivity={logActivity}
              setActiveNav={setActiveNav}
            />
          )}

          {activeNav === "settings" && <SettingsView risk={risk} setRisk={setRisk} />}

          {activeNav === "market" && selectedCoin && (
            <MarketDetail
              key={`${selectedCoin.exchange}:${selectedCoin.symbol}`}
              coin={selectedCoin}
              sensitivity={sensitivity}
              onBack={() => setActiveNav(returnNav)}
              onOpenPOA={(coin) => setPoaTargetCoin(coin)}
              setActiveNav={setActiveNav}
            />
          )}
        </div>
      </main>

      {poaTargetCoin && (
        <POAModal
          coin={poaTargetCoin}
          risk={risk}
          onClose={() => setPoaTargetCoin(null)}
          onSave={(poa) =>
            logActivity({
              type: poa.status === "ARMED" ? "armed" : "draft",
              symbol: poa.symbol,
              exchange: poa.exchange,
              side: poa.side,
              poaId: poa.id,
            })
          }
        />
      )}
    </div>
  );
}
