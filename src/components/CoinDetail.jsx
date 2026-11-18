import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import {
  ArrowLeft,
  Star,
  Zap,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Target,
  Activity,
  Radio,
  Clock,
  ExternalLink,
} from 'lucide-react';

export default function CoinDetail({
  coin,
  onBack,
  onOpenPOA,
  feedEvents = [],
  isFavorite = false,
  onToggleFavorite,
  scannerData = [],
}) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const candleSeriesRef = useRef(null);

  const [loadingChart, setLoadingChart] = useState(true);
  const [chartData, setChartData] = useState(null);

  // Exchange Badge Helper
  const getExchangeBadge = (ex) => {
    switch (ex?.toLowerCase()) {
      case 'hyperliquid':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-exchange-hl/20 text-exchange-hl border border-exchange-hl/40">
            HYPERLIQUID
          </span>
        );
      case 'binance':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-exchange-binance/20 text-exchange-binance border border-exchange-binance/40">
            BINANCE
          </span>
        );
      case 'bybit':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-exchange-bybit/20 text-exchange-bybit border border-exchange-bybit/40">
            BYBIT
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-terminal-dark text-terminal-muted border border-terminal-border">
            {(ex || 'EX').toUpperCase()}
          </span>
        );
    }
  };

  // Signal Status Badge
  const getSignalStatusBadge = (status) => {
    const s = status || 'ACTIVE';
    if (s.includes('PUMP DETECTED')) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-extrabold text-sm bg-terminal-green/20 text-terminal-green border border-terminal-green/40 shadow-lg shadow-terminal-green/10">
          <span>🚀</span>
          <span>{s}</span>
        </div>
      );
    }
    if (s.includes('DUMP DETECTED')) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-extrabold text-sm bg-terminal-red/20 text-terminal-red border border-terminal-red/40 shadow-lg shadow-terminal-red/10">
          <span>🔴</span>
          <span>{s}</span>
        </div>
      );
    }
    if (s.includes('BREAKOUT CONFIRMED')) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-extrabold text-sm bg-terminal-cyan/20 text-terminal-cyan border border-terminal-cyan/40 shadow-lg shadow-terminal-cyan/10">
          <span>⚡</span>
          <span>{s}</span>
        </div>
      );
    }
    if (s.includes('MOMENTUM BUILDING')) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-extrabold text-sm bg-terminal-yellow/20 text-terminal-yellow border border-terminal-yellow/40">
          <span>📈</span>
          <span>{s}</span>
        </div>
      );
    }
    if (s.includes('SQUEEZE ALERT')) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-extrabold text-sm bg-orange-500/20 text-orange-400 border border-orange-500/40">
          <span>⚠️</span>
          <span>{s}</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-sm bg-terminal-card text-terminal-muted border border-terminal-border">
        <span>●</span>
        <span>{s}</span>
      </div>
    );
  };

  // Directional Confidence Helper
  const biasStr = coin?.bias || 'NEUTRAL';
  const isLong = biasStr.includes('LONG');
  const isShort = biasStr.includes('SHORT');
  const isFollow = biasStr.includes('FOLLOW');
  const isCounter = biasStr.includes('COUNTER');

  // Breakdown values
  const breakdown = coin?.breakdown || {};
  const zScorePrice = breakdown.zscore_price ?? (coin.price_change_1m ? (coin.price_change_1m / 1.5).toFixed(2) : 0);
  const volSpike = coin.volume_spike_ratio ?? (breakdown.volume_spike_ratio || 1.0);
  const oiDelta5m = coin.oi_change_5m ?? (breakdown.oi_change_5m || 0);
  const oiDelta1h = coin.oi_change_1h ?? (breakdown.oi_change_1h || 0);
  const isDecoupled = breakdown.is_decoupled || false;

  // Chart setup
  useEffect(() => {
    if (!coin || !chartContainerRef.current) return;

    setLoadingChart(true);

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth || 800,
      height: 380,
      layout: {
        background: { type: ColorType.Solid, color: '#080A0F' },
        textColor: '#8B949E',
        fontSize: 11,
        fontFamily: '"JetBrains Mono", monospace',
      },
      grid: {
        vertLines: { color: '#131824' },
        horzLines: { color: '#131824' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#1E2638',
      },
      timeScale: {
        borderColor: '#1E2638',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00F5A0',
      downColor: '#FF3B69',
      borderVisible: false,
      wickUpColor: '#00F5A0',
      wickDownColor: '#FF3B69',
    });

    chartInstanceRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Fetch candles + POA markers
    fetch(`/api/chart/${coin.exchange.toLowerCase()}/${coin.symbol.toUpperCase()}/candles`)
      .then((res) => res.json())
      .then((data) => {
        setChartData(data);
        if (data.candles && data.candles.length > 0) {
          candleSeries.setData(data.candles);

          if (data.markers && data.markers.length > 0) {
            candleSeries.setMarkers(data.markers);
          }

          if (data.poa_levels) {
            const poa = data.poa_levels;

            // Entry line
            candleSeries.createPriceLine({
              price: poa.entry_zone_high || coin.price,
              color: '#00E5FF',
              lineWidth: 2,
              lineStyle: 2, // Dashed
              axisLabelVisible: true,
              title: `ENTRY: $${poa.entry_zone_high || coin.price}`,
            });

            // DCA 1
            if (poa.dca1) {
              candleSeries.createPriceLine({
                price: poa.dca1,
                color: '#38BDF8',
                lineWidth: 1,
                lineStyle: 1,
                axisLabelVisible: true,
                title: `DCA 1: $${poa.dca1}`,
              });
            }

            // Stop Loss
            if (poa.stop_loss) {
              candleSeries.createPriceLine({
                price: poa.stop_loss,
                color: '#FF3B69',
                lineWidth: 2,
                lineStyle: 0,
                axisLabelVisible: true,
                title: `SL: $${poa.stop_loss}`,
              });
            }

            // TP1
            if (poa.tp1) {
              candleSeries.createPriceLine({
                price: poa.tp1,
                color: '#00F5A0',
                lineWidth: 1,
                lineStyle: 1,
                axisLabelVisible: true,
                title: `TP1 (1.5R): $${poa.tp1}`,
              });
            }

            // TP2
            if (poa.tp2) {
              candleSeries.createPriceLine({
                price: poa.tp2,
                color: '#00F5A0',
                lineWidth: 1,
                lineStyle: 0,
                axisLabelVisible: true,
                title: `TP2 (2.5R): $${poa.tp2}`,
              });
            }
          }

          chart.timeScale().fitContent();
        }
        setLoadingChart(false);
      })
      .catch((err) => {
        console.error('Error fetching candles:', err);
        setLoadingChart(false);
      });

    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [coin.exchange, coin.symbol]);

  const poa = chartData?.poa_levels;

  return (
    <div className="flex-1 flex flex-col p-4 space-y-4 font-mono select-none overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Top Navigation / Action Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-terminal-border">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-terminal-card border border-terminal-border text-terminal-muted hover:text-white hover:border-terminal-cyan transition-all text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← BACK TO RADAR</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Star Favorite */}
          <button
            type="button"
            onClick={onToggleFavorite}
            title={isFavorite ? 'Remove Favorite' : 'Star Favorite'}
            className={`p-2 rounded-lg border transition-colors ${
              isFavorite
                ? 'bg-terminal-yellow/15 border-terminal-yellow/40 text-terminal-yellow'
                : 'bg-terminal-card border-terminal-border text-terminal-muted hover:text-terminal-yellow'
            }`}
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-terminal-yellow' : ''}`} />
          </button>

          {/* Create Plan of Attack Button */}
          <button
            type="button"
            onClick={() => onOpenPOA && onOpenPOA(coin)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-terminal-green text-terminal-bg font-extrabold hover:brightness-110 shadow-lg shadow-terminal-green/20 transition-all text-xs"
          >
            <Zap className="w-4 h-4" />
            <span>CREATE PLAN OF ATTACK</span>
          </button>
        </div>
      </div>

      {/* HEADER SECTION: Symbol, Exchange, Price, 24h stats */}
      <div className="bg-terminal-card border border-terminal-border rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-white tracking-wider font-sans">
                {coin.symbol}
              </h1>
              {getExchangeBadge(coin.exchange)}
              {isDecoupled && (
                <span
                  title="Decoupled from BTC price movements"
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-terminal-yellow/20 text-terminal-yellow border border-terminal-yellow/40 flex items-center gap-1"
                >
                  ⚡ BTC DECOUPLED
                </span>
              )}
            </div>
            <p className="text-xs text-terminal-muted mt-0.5">
              Canonical: <span className="text-white font-semibold">{coin.canonical || `${coin.symbol}-PERP`}</span> | 1m Live Updates
            </p>
          </div>
        </div>

        {/* Large Current Price */}
        <div className="text-right">
          <div className="text-3xl font-black text-white tracking-tight">
            $
            {coin.price < 1
              ? (coin.price || 0).toFixed(4)
              : (coin.price || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
          </div>
          <div className="flex items-center justify-end gap-3 text-xs mt-1">
            <span
              className={`font-bold flex items-center gap-0.5 ${
                (coin.price_change_1m || 0) >= 0 ? 'text-terminal-green' : 'text-terminal-red'
              }`}
            >
              {(coin.price_change_1m || 0) >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>
                1m: {(coin.price_change_1m || 0) >= 0 ? '+' : ''}
                {(coin.price_change_1m || 0).toFixed(2)}%
              </span>
            </span>

            <span
              className={`font-bold ${
                (coin.price_change_5m || 0) >= 0 ? 'text-terminal-green' : 'text-terminal-red'
              }`}
            >
              5m: {(coin.price_change_5m || 0) >= 0 ? '+' : ''}
              {(coin.price_change_5m || 0).toFixed(2)}%
            </span>

            <span
              className={`font-bold ${
                (coin.price_change_15m || 0) >= 0 ? 'text-terminal-green' : 'text-terminal-red'
              }`}
            >
              15m: {(coin.price_change_15m || 0) >= 0 ? '+' : ''}
              {(coin.price_change_15m || 0).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Volume & Funding Stats */}
        <div className="w-full pt-4 border-t border-terminal-border/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-terminal-muted text-[11px]">24H VOLUME</div>
            <div className="text-white font-bold text-sm">
              ${((coin.volume_24h_usd || 0) / 1000000).toFixed(2)}M
            </div>
          </div>

          <div>
            <div className="text-terminal-muted text-[11px]">FUNDING RATE</div>
            <div
              className={`font-bold text-sm ${
                (coin.funding_rate || 0) > 0.0005
                  ? 'text-terminal-red'
                  : (coin.funding_rate || 0) < -0.0005
                  ? 'text-terminal-green'
                  : 'text-white'
              }`}
            >
              {((coin.funding_rate || 0) * 100).toFixed(4)}%
            </div>
          </div>

          <div>
            <div className="text-terminal-muted text-[11px]">OPEN INTEREST</div>
            <div className="text-white font-bold text-sm">
              ${((coin.open_interest_usd || 0) / 1000000).toFixed(2)}M
            </div>
          </div>

          <div>
            <div className="text-terminal-muted text-[11px]">5M OI DELTA</div>
            <div
              className={`font-bold text-sm ${
                (coin.oi_change_5m || 0) > 0
                  ? 'text-terminal-green'
                  : (coin.oi_change_5m || 0) < 0
                  ? 'text-terminal-red'
                  : 'text-terminal-muted'
              }`}
            >
              {(coin.oi_change_5m || 0) > 0 ? '+' : ''}
              {(coin.oi_change_5m || 0).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* DIRECTIONAL CONFIDENCE & SIGNAL STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Directional Confidence Card */}
        <div className="bg-terminal-card border border-terminal-border rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="text-terminal-muted text-xs flex items-center justify-between">
            <span>DIRECTIONAL CONFIDENCE</span>
            <span className="text-[10px] text-terminal-cyan">PPKR ALGO</span>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`px-4 py-2.5 rounded-xl font-black text-lg border tracking-wider flex items-center gap-2 ${
                isLong
                  ? 'bg-terminal-green/20 text-terminal-green border-terminal-green shadow-lg shadow-terminal-green/20'
                  : isShort
                  ? 'bg-terminal-red/20 text-terminal-red border-terminal-red shadow-lg shadow-terminal-red/20'
                  : 'bg-terminal-dark text-terminal-muted border-terminal-border'
              }`}
            >
              <span>{isLong ? '🟢 LONG' : isShort ? '🔴 SHORT' : '⚪ NEUTRAL'}</span>
            </div>

            <div>
              <div className="text-xs font-extrabold text-white">
                {isFollow ? '⚡ FOLLOW TREND' : isCounter ? '🔄 COUNTER-REVERSION' : 'SIDEWAYS'}
              </div>
              <div className="text-[11px] text-terminal-muted">
                {coin.bias || 'NEUTRAL'}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-terminal-border/60 flex items-center justify-between text-xs">
            <span className="text-terminal-muted text-[11px]">FLOW REGIME:</span>
            <span className="font-bold text-white">{coin.flow_quadrant || 'NEUTRAL'}</span>
          </div>
        </div>

        {/* Signal Status Card */}
        <div className="bg-terminal-card border border-terminal-border rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="text-terminal-muted text-xs flex items-center justify-between">
            <span>SIGNAL STATUS</span>
            <span className="text-[10px] text-terminal-green font-bold">LIVE EVENT</span>
          </div>

          <div className="py-1">
            {getSignalStatusBadge(coin.signal_status)}
          </div>

          <div className="pt-2 border-t border-terminal-border/60 flex items-center justify-between text-xs">
            <span className="text-terminal-muted text-[11px]">VOL SPIKE RATIO:</span>
            <span
              className={`font-black text-sm ${
                volSpike >= 3.0 ? 'text-terminal-green' : 'text-white'
              }`}
            >
              {volSpike.toFixed(1)}x Normal
            </span>
          </div>
        </div>

        {/* Composite Score Card */}
        <div className="bg-terminal-card border border-terminal-border rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="text-terminal-muted text-xs flex items-center justify-between">
            <span>COMPOSITE SCORE</span>
            <span className="text-[10px] text-terminal-muted">0-100 INDEX</span>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`text-4xl font-black ${
                (coin.composite_score || 0) >= 75
                  ? 'text-terminal-green'
                  : (coin.composite_score || 0) >= 50
                  ? 'text-terminal-cyan'
                  : (coin.composite_score || 0) >= 35
                  ? 'text-terminal-yellow'
                  : 'text-terminal-muted'
              }`}
            >
              {Math.round(coin.composite_score || 0)}
            </div>
            <div className="flex-1 space-y-1">
              <div className="w-full h-2.5 rounded-full bg-terminal-dark border border-terminal-border overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    (coin.composite_score || 0) >= 75
                      ? 'bg-terminal-green'
                      : (coin.composite_score || 0) >= 50
                      ? 'bg-terminal-cyan'
                      : (coin.composite_score || 0) >= 35
                      ? 'bg-terminal-yellow'
                      : 'bg-terminal-muted'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, coin.composite_score || 0))}%` }}
                />
              </div>
              <div className="text-[10px] text-terminal-muted">
                {(coin.composite_score || 0) >= 75
                  ? 'High probability momentum regime'
                  : (coin.composite_score || 0) >= 50
                  ? 'Moderate directional surge'
                  : 'Standard market noise'}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-terminal-border/60 flex items-center justify-between text-xs">
            <span className="text-terminal-muted text-[11px]">CONVICTION:</span>
            <span className="font-bold text-terminal-cyan">
              {(coin.composite_score || 0) >= 75 ? 'VERY HIGH' : (coin.composite_score || 0) >= 50 ? 'MEDIUM' : 'LOW'}
            </span>
          </div>
        </div>
      </div>

      {/* SIGNAL BREAKDOWN CARD */}
      <div className="bg-terminal-card border border-terminal-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs border-b border-terminal-border pb-2">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-terminal-cyan" />
            <span>SIGNAL BREAKDOWN (SUB-METRIC WEIGHTS)</span>
          </span>
          <span className="text-terminal-muted text-[11px]">ENGINE QUANT MATRIX</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {/* Z-Score Price */}
          <div className="bg-terminal-dark p-3 rounded-lg border border-terminal-border space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-terminal-muted">Z-Score Price Move</span>
              <span className="font-bold text-terminal-cyan">{Number(zScorePrice).toFixed(2)}σ</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-terminal-card overflow-hidden">
              <div
                className="h-full bg-terminal-cyan rounded-full"
                style={{ width: `${Math.min(100, (Math.abs(Number(zScorePrice)) / 3.0) * 100)}%` }}
              />
            </div>
          </div>

          {/* Volume Spike Ratio */}
          <div className="bg-terminal-dark p-3 rounded-lg border border-terminal-border space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-terminal-muted">Volume Spike Surge</span>
              <span className="font-bold text-terminal-green">{Number(volSpike).toFixed(1)}x</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-terminal-card overflow-hidden">
              <div
                className="h-full bg-terminal-green rounded-full"
                style={{ width: `${Math.min(100, (Number(volSpike) / 5.0) * 100)}%` }}
              />
            </div>
          </div>

          {/* OI Delta 5m */}
          <div className="bg-terminal-dark p-3 rounded-lg border border-terminal-border space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-terminal-muted">OI Delta (5m)</span>
              <span
                className={`font-bold ${
                  Number(oiDelta5m) >= 0 ? 'text-terminal-green' : 'text-terminal-red'
                }`}
              >
                {Number(oiDelta5m) >= 0 ? '+' : ''}
                {Number(oiDelta5m).toFixed(2)}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-terminal-card overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  Number(oiDelta5m) >= 0 ? 'bg-terminal-green' : 'bg-terminal-red'
                }`}
                style={{ width: `${Math.min(100, Math.abs(Number(oiDelta5m)) * 20)}%` }}
              />
            </div>
          </div>

          {/* OI Delta 1h */}
          <div className="bg-terminal-dark p-3 rounded-lg border border-terminal-border space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-terminal-muted">OI Delta (1h)</span>
              <span
                className={`font-bold ${
                  Number(oiDelta1h) >= 0 ? 'text-terminal-green' : 'text-terminal-red'
                }`}
              >
                {Number(oiDelta1h) >= 0 ? '+' : ''}
                {Number(oiDelta1h).toFixed(2)}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-terminal-card overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  Number(oiDelta1h) >= 0 ? 'bg-terminal-green' : 'bg-terminal-red'
                }`}
                style={{ width: `${Math.min(100, Math.abs(Number(oiDelta1h)) * 10)}%` }}
              />
            </div>
          </div>

          {/* Funding Extreme */}
          <div className="bg-terminal-dark p-3 rounded-lg border border-terminal-border space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-terminal-muted">Funding Rate Stress</span>
              <span className="font-bold text-terminal-yellow">
                {((coin.funding_rate || 0) * 100).toFixed(4)}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-terminal-card overflow-hidden">
              <div
                className="h-full bg-terminal-yellow rounded-full"
                style={{
                  width: `${Math.min(100, Math.abs((coin.funding_rate || 0) * 10000) * 20)}%`,
                }}
              />
            </div>
          </div>

          {/* BTC Decoupling Badge */}
          <div className="bg-terminal-dark p-3 rounded-lg border border-terminal-border flex items-center justify-between">
            <div>
              <div className="text-[11px] text-terminal-muted">BTC Correlation</div>
              <div className="text-xs font-bold text-white">
                {isDecoupled ? '⚡ Independent Surge' : '🔗 Co-Moving with BTC'}
              </div>
            </div>
            <span
              className={`px-2 py-1 rounded text-[10px] font-bold ${
                isDecoupled
                  ? 'bg-terminal-yellow/20 text-terminal-yellow border border-terminal-yellow/40'
                  : 'bg-terminal-card text-terminal-muted border border-terminal-border'
              }`}
            >
              {isDecoupled ? 'DECOUPLED' : 'SYNCED'}
            </span>
          </div>
        </div>
      </div>

      {/* CHART SECTION: TradingView Lightweight-Charts with POA price lines */}
      <div className="bg-terminal-card border border-terminal-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Target className="w-4 h-4 text-terminal-cyan" />
              <span>1-MINUTE CANDLESTICK CHART & EXECUTION LEVELS</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-terminal-dark text-terminal-muted border border-terminal-border">
              REAL-TIME
            </span>
          </div>

          {poa && (
            <div className="hidden sm:flex items-center gap-2 text-[11px]">
              <span className="text-terminal-muted">POA Side:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded ${
                  poa.side === 'LONG'
                    ? 'bg-terminal-green/20 text-terminal-green'
                    : 'bg-terminal-red/20 text-terminal-red'
                }`}
              >
                {poa.side}
              </span>
            </div>
          )}
        </div>

        {/* Chart canvas container */}
        <div className="relative w-full h-[380px] bg-terminal-dark rounded-lg overflow-hidden border border-terminal-border">
          {loadingChart && (
            <div className="absolute inset-0 flex items-center justify-center bg-terminal-bg/80 z-10 text-xs text-terminal-muted">
              <span className="animate-pulse">Loading Live Chart & Execution Levels...</span>
            </div>
          )}
          <div ref={chartContainerRef} className="w-full h-full" />
        </div>

        {/* POA Target Levels Legend Bar */}
        {poa && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-terminal-border/60 text-xs">
            <div className="bg-terminal-dark p-2 rounded border border-terminal-border">
              <div className="text-[10px] text-terminal-cyan font-bold">ENTRY ZONE</div>
              <div className="text-white font-extrabold truncate">
                ${poa.entry_zone_low} - ${poa.entry_zone_high}
              </div>
            </div>

            <div className="bg-terminal-dark p-2 rounded border border-terminal-border">
              <div className="text-[10px] text-blue-400 font-bold">DCA 1 (50%)</div>
              <div className="text-white font-extrabold truncate">${poa.dca1 || 'N/A'}</div>
            </div>

            <div className="bg-terminal-dark p-2 rounded border border-terminal-border">
              <div className="text-[10px] text-terminal-red font-bold">STOP LOSS / INVALIDATION</div>
              <div className="text-terminal-red font-extrabold truncate">${poa.stop_loss}</div>
            </div>

            <div className="bg-terminal-dark p-2 rounded border border-terminal-border">
              <div className="text-[10px] text-terminal-green font-bold">TARGET 1 (1.5R)</div>
              <div className="text-terminal-green font-extrabold truncate">${poa.tp1}</div>
            </div>
          </div>
        )}
      </div>

      {/* SIGNAL HISTORY SECTION */}
      <div className="bg-terminal-card border border-terminal-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs border-b border-terminal-border pb-2">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-terminal-yellow" />
            <span>RECENT SIGNAL EVENTS FOR {coin.symbol}</span>
          </span>
          <span className="text-terminal-muted text-[11px]">{feedEvents.length} events logged</span>
        </div>

        {feedEvents.length === 0 ? (
          <div className="py-8 text-center text-terminal-muted text-xs">
            No recent signal events recorded for {coin.symbol} in this session.
          </div>
        ) : (
          <div className="divide-y divide-terminal-border/40 max-h-48 overflow-y-auto">
            {feedEvents.map((ev) => (
              <div
                key={ev.id ?? `${ev.ts}-${ev.message}`}
                className="py-2 flex items-center justify-between text-xs gap-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-terminal-muted">
                    {new Date(ev.ts > 1e11 ? ev.ts : ev.ts * 1000).toTimeString().split(' ')[0]}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      ev.type === 'ALERT'
                        ? 'bg-terminal-red/20 text-terminal-red'
                        : 'bg-terminal-cyan/20 text-terminal-cyan'
                    }`}
                  >
                    [{ev.type}]
                  </span>
                </div>
                <div className="flex-1 text-terminal-text truncate font-sans">{ev.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM CTA: ARM PLAN OF ATTACK */}
      <div className="bg-terminal-dark border border-terminal-border rounded-xl p-4 flex items-center justify-between shadow-xl">
        <div>
          <div className="font-bold text-white text-sm">Ready to Trade This Setup?</div>
          <div className="text-xs text-terminal-muted">
            Configure risk parameters, position size, and arm this Plan of Attack.
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenPOA && onOpenPOA(coin)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-terminal-green text-terminal-bg font-extrabold hover:brightness-110 shadow-lg shadow-terminal-green/30 transition-all text-xs"
        >
          <Zap className="w-4 h-4" />
          <span>OPEN PLAN OF ATTACK (POA)</span>
        </button>
      </div>
    </div>
  );
}
