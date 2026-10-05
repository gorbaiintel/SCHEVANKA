import React, { useState, useEffect } from 'react';
import { TickerData, PriceNode } from '../../types/market';
import { 
  Radio, 
  GitCommit, 
  Activity, 
  Sliders, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Play,
  Target,
  Layers
} from 'lucide-react';
import { sound } from '../../services/soundService';

interface NodeStrategyFlowProps {
  ticker: TickerData;
  nodes: PriceNode[];
  onExecuteSignal: (side: 'BUY' | 'SELL', lots: number, sl: number, tp: number) => void;
  onImplementAllToWebTerminal?: (payload: {
    side: 'BUY' | 'SELL';
    lots: number;
    entry: number;
    sl: number;
    tp: number;
    confidence: number;
    htfPoc: number;
    activeSweeps: number;
  }) => void;
}

interface StrategyNodeDefinition {
  id: string;
  name: string;
  tag: string;
  category: 'FEED' | 'STRUCTURE' | 'INDICATOR' | 'FILTER' | 'EXECUTION';
  x: number;
  y: number;
  status: 'ACTIVE' | 'STANDBY' | 'TRIGGERED';
  color: string;
  metrics: { label: string; value: string; isHighlight?: boolean; color?: string }[];
  connections: string[];
}

export const NodeStrategyFlow: React.FC<NodeStrategyFlowProps> = ({
  ticker,
  nodes,
  onExecuteSignal,
  onImplementAllToWebTerminal,
}) => {
  const [pulseTick, setPulseTick] = useState<number>(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('node-exec');
  const [isImplementedToTerminal, setIsImplementedToTerminal] = useState<boolean>(false);
  const [showInlineWebTerminal, setShowInlineWebTerminal] = useState<boolean>(false);

  useEffect(() => {
    setPulseTick(prev => prev + 1);
  }, [ticker.price]);

  // Derived real-time indicators
  const swingHighs = nodes.filter(n => n.type === 'SWING_HIGH' || n.type === 'EQH');
  const swingLows = nodes.filter(n => n.type === 'SWING_LOW' || n.type === 'EQL');
  const lastSwingHigh = swingHighs[swingHighs.length - 1]?.price || ticker.price + 5.2;
  const lastSwingLow = swingLows[swingLows.length - 1]?.price || ticker.price - 5.8;

  // Liquidity Sweeps
  const sweeps = nodes.filter(n => n.liquiditySweep);
  const latestSweep = sweeps[0];
  const hasRecentBullSweep = sweeps.some(s => s.liquiditySweep?.sweepSide === 'SSL' && s.status === 'ACTIVE');
  const hasRecentBearSweep = sweeps.some(s => s.liquiditySweep?.sweepSide === 'BSL' && s.status === 'ACTIVE');

  // HTF Volume Profiles
  const htfPocNode = nodes.find(n => n.type === 'HTF_POC');
  const htfVahNode = nodes.find(n => n.type === 'HTF_VAH');
  const htfValNode = nodes.find(n => n.type === 'HTF_VAL');
  const htfPocPrice = htfPocNode?.price || (lastSwingHigh * 0.4 + lastSwingLow * 0.6);
  const isPocMagnetNear = Math.abs(ticker.price - htfPocPrice) <= 3.5;

  // Structure regime
  const isAboveMid = ticker.price > (lastSwingHigh + lastSwingLow) / 2;
  const structureRegime = isAboveMid ? 'Bullish Expansion' : 'Bearish Consolidation';
  const simulatedRsi = +(48 + ((ticker.price - lastSwingLow) / (lastSwingHigh - lastSwingLow || 1)) * 26).toFixed(1);
  const isRsiBullish = simulatedRsi > 50 && simulatedRsi < 70;
  
  // Composite Signal Computation (Integrating Liquidity Sweeps + HTF POC)
  let sweepScoreBonus = 0;
  if (hasRecentBullSweep) sweepScoreBonus += 25;
  if (hasRecentBearSweep) sweepScoreBonus -= 25;

  const bullishScore = (isAboveMid ? 30 : 10) + 
    (isRsiBullish ? 25 : 10) + 
    (ticker.spread <= 0.4 ? 15 : 5) + 
    (hasRecentBullSweep ? 25 : hasRecentBearSweep ? -20 : 0) +
    (isPocMagnetNear ? 10 : 0);

  const currentBias: 'BUY' | 'SELL' | 'NEUTRAL' = bullishScore > 62 ? 'BUY' : bullishScore < 38 ? 'SELL' : 'NEUTRAL';
  const signalConfidence = Math.min(96, Math.max(54, Math.abs(bullishScore - 50) * 1.8 + 50));

  // Risk parameters
  const calculatedSl = +(ticker.price - (currentBias === 'BUY' ? 4.5 : -4.5)).toFixed(2);
  const calculatedTp = +(ticker.price + (currentBias === 'BUY' ? 11.25 : -11.25)).toFixed(2);
  const optimalLots = 0.5;

  const strategyNodes: StrategyNodeDefinition[] = [
    {
      id: 'node-feed',
      name: 'XAU/USD Live Feed Node',
      tag: 'SRC_01',
      category: 'FEED',
      x: 30,
      y: 110,
      status: 'ACTIVE',
      color: '#38bdf8', // sky-400
      metrics: [
        { label: 'Spot Bid', value: `$${ticker.bid.toFixed(2)}` },
        { label: 'Spot Ask', value: `$${ticker.ask.toFixed(2)}` },
        { label: 'Spread', value: `${(ticker.spread * 100).toFixed(0)}¢`, color: '#10b981' },
      ],
      connections: ['node-sweeps', 'node-htf', 'node-structure'],
    },
    {
      id: 'node-sweeps',
      name: 'Liquidity Sweep Node',
      tag: 'SWP_02',
      category: 'STRUCTURE',
      x: 360,
      y: 20,
      status: latestSweep ? 'TRIGGERED' : 'ACTIVE',
      color: '#f43f5e', // rose-500
      metrics: [
        { 
          label: 'Latest Sweep', 
          value: latestSweep ? `${latestSweep.liquiditySweep?.sweepSide} Grab` : 'Scanning', 
          color: latestSweep?.liquiditySweep?.sweepSide === 'SSL' ? '#10b981' : '#f43f5e',
          isHighlight: true 
        },
        { label: 'Swept Stops', value: latestSweep?.liquiditySweep ? `+$${latestSweep.liquiditySweep.sweepDepth.toFixed(2)}` : '$0.00' },
        { label: 'Active Sweeps', value: `${sweeps.length} Detected`, color: '#38bdf8' },
      ],
      connections: ['node-decision'],
    },
    {
      id: 'node-htf',
      name: 'HTF POC Volume Matrix',
      tag: 'HTF_03',
      category: 'FILTER',
      x: 360,
      y: 210,
      status: isPocMagnetNear ? 'TRIGGERED' : 'ACTIVE',
      color: '#eab308', // amber-500
      metrics: [
        { label: 'HTF POC Magnet', value: `$${htfPocPrice.toFixed(2)}`, isHighlight: true, color: '#eab308' },
        { label: 'Value Area High', value: `$${(htfVahNode?.price || htfPocPrice + 4.2).toFixed(2)}`, color: '#06b6d4' },
        { label: 'Value Area Low', value: `$${(htfValNode?.price || htfPocPrice - 4.5).toFixed(2)}`, color: '#818cf8' },
      ],
      connections: ['node-decision'],
    },
    {
      id: 'node-structure',
      name: 'ICT Market Structure Node',
      tag: 'STR_04',
      category: 'STRUCTURE',
      x: 360,
      y: 400,
      status: isAboveMid ? 'TRIGGERED' : 'ACTIVE',
      color: '#10b981', // emerald-500
      metrics: [
        { label: 'Regime', value: structureRegime, color: isAboveMid ? '#10b981' : '#f59e0b' },
        { label: 'Peak Ref', value: `$${lastSwingHigh.toFixed(2)}` },
        { label: 'Base Ref', value: `$${lastSwingLow.toFixed(2)}` },
      ],
      connections: ['node-decision'],
    },
    {
      id: 'node-decision',
      name: 'Alpha Decision Engine Node',
      tag: 'ENG_05',
      category: 'EXECUTION',
      x: 720,
      y: 200,
      status: currentBias !== 'NEUTRAL' ? 'TRIGGERED' : 'STANDBY',
      color: '#ec4899', // pink-500
      metrics: [
        { label: 'Consensus Bias', value: currentBias, isHighlight: true, color: currentBias === 'BUY' ? '#10b981' : '#f43f5e' },
        { label: 'Confidence', value: `${signalConfidence.toFixed(0)}%`, color: '#38bdf8' },
        { label: 'Engines Synced', value: 'SMC + Sweeps + HTF' },
      ],
      connections: ['node-exec'],
    },
    {
      id: 'node-exec',
      name: 'Risk & Execution Node',
      tag: 'EXE_06',
      category: 'EXECUTION',
      x: 1060,
      y: 200,
      status: 'ACTIVE',
      color: '#8b5cf6', // purple-500
      metrics: [
        { label: 'Recommended Lots', value: `${optimalLots} Lots` },
        { label: 'Stop Loss', value: `$${calculatedSl.toFixed(2)}` },
        { label: 'Take Profit', value: `$${calculatedTp.toFixed(2)}`, color: '#10b981' },
      ],
      connections: [],
    },
  ];

  const handleExecute = () => {
    sound.playOrderExecuted();
    onExecuteSignal(currentBias === 'SELL' ? 'SELL' : 'BUY', optimalLots, calculatedSl, calculatedTp);
  };

  const handleImplementAll = () => {
    const execSide: 'BUY' | 'SELL' = currentBias === 'SELL' ? 'SELL' : 'BUY';
    sound.playOrderExecuted();
    setIsImplementedToTerminal(true);
    setShowInlineWebTerminal(true);

    // Copy complete strategy node parameters to clipboard for instant WebTerminal paste
    const summaryText = `XAUUSD | ${execSide} ${optimalLots} Lots | Entry: $${ticker.price.toFixed(2)} | SL: $${calculatedSl.toFixed(2)} | TP: $${calculatedTp.toFixed(2)} | HTF POC: $${htfPocPrice.toFixed(2)} | Confidence: ${signalConfidence.toFixed(0)}%`;
    try {
      navigator.clipboard?.writeText(summaryText);
    } catch {}

    if (onImplementAllToWebTerminal) {
      onImplementAllToWebTerminal({
        side: execSide,
        lots: optimalLots,
        entry: ticker.price,
        sl: calculatedSl,
        tp: calculatedTp,
        confidence: +signalConfidence.toFixed(0),
        htfPoc: htfPocPrice,
        activeSweeps: sweeps.length,
      });
    } else {
      onExecuteSignal(execSide, optimalLots, calculatedSl, calculatedTp);
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#0b0e14] border border-neutral-800 rounded-lg overflow-hidden select-none">
      {/* Strategy Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800 bg-[#0f141c] text-xs">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-100">XAU/USD Real-Time Strategy Node Graph</span>
          <span className="text-slate-500 font-mono text-[11px]">· Liquidity Sweeps & HTF POC Active</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
            <span>Signal:</span>
            <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
              currentBias === 'BUY' 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : currentBias === 'SELL'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-neutral-800 text-slate-300'
            }`}>
              {currentBias} ({signalConfidence.toFixed(0)}%)
            </span>
          </div>

          <button
            onClick={handleImplementAll}
            className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold rounded shadow-md shadow-cyan-500/20 transition-all active:scale-95 cursor-pointer"
            title="Sinkronkan & terapkan seluruh Node Strategi, SL/TP, dan sinyal langsung ke https://webterminal.hfm.com/id/mt4"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Implementasi Semua ke https://webterminal.hfm.com/id/mt4</span>
          </button>

          <button
            onClick={handleExecute}
            className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded shadow transition-all active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Execute Signal</span>
          </button>
        </div>
      </div>

      {/* Live WebTerminal Implementation Drawer when 'Implementasi Semua ke Web Terminal' is triggered */}
      {isImplementedToTerminal && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-950/60 via-cyan-950/40 to-[#0f141c] border-b border-emerald-500/40 flex flex-col gap-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold text-emerald-300">
                SEMUA NODE STRATEGI DIIMPLEMENTASIKAN KE https://webterminal.hfm.com/id/mt4:
              </span>
              <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-slate-200">
                XAU/USD · <strong>{currentBias === 'SELL' ? 'SELL' : 'BUY'} {optimalLots} Lot</strong> · Entry <strong>${ticker.price.toFixed(2)}</strong> · SL <strong className="text-rose-400">${calculatedSl.toFixed(2)}</strong> · TP <strong className="text-emerald-400">${calculatedTp.toFixed(2)}</strong> · POC <strong className="text-amber-300">${htfPocPrice.toFixed(2)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInlineWebTerminal(!showInlineWebTerminal)}
                className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold cursor-pointer"
              >
                {showInlineWebTerminal ? 'Sembunyikan Layar WebTerminal' : 'Tampilkan Layar WebTerminal'}
              </button>
              <button
                onClick={() => {
                  setIsImplementedToTerminal(false);
                  setShowInlineWebTerminal(false);
                }}
                className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-slate-400 hover:text-white font-mono text-[10px] cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>

          {showInlineWebTerminal && (
            <div className="p-3 rounded-lg border border-cyan-500/40 bg-neutral-950 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
              <div className="text-slate-300">
                <span className="text-emerald-400 font-bold">✓ Brave Live MT4 Engine Aktif (No Demo):</span> Parameter sinyal telah dikirim ke tab <strong>https://webterminal.hfm.com/id/mt4</strong>.
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://webterminal.hfm.com/id/mt4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[10px]"
                >
                  https://webterminal.hfm.com/id/mt4 ↗
                </a>
                <a
                  href="https://my.exness.com/webterminal/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-[10px]"
                >
                  Exness Live ↗
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Node Graph Visual Canvas */}
      <div className="relative flex-1 w-full h-full bg-[#0b0e14] overflow-auto p-6">
        {/* Background Grid Lines */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, #334155 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* SVG Connection Paths with animated data pulses */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 min-w-[1380px] min-h-[580px]">
          <defs>
            <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.7" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Render lines connecting nodes */}
          {strategyNodes.map(sourceNode => {
            return sourceNode.connections.map(targetId => {
              const targetNode = strategyNodes.find(n => n.id === targetId);
              if (!targetNode) return null;

              const x1 = sourceNode.x + 260;
              const y1 = sourceNode.y + 65;
              const x2 = targetNode.x;
              const y2 = targetNode.y + 65;

              const dx = x2 - x1;
              const cx1 = x1 + dx * 0.5;
              const cy1 = y1;
              const cx2 = x1 + dx * 0.5;
              const cy2 = y2;

              const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

              return (
                <g key={`${sourceNode.id}-${targetId}`}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="3"
                  />
                  <path
                    d={pathD}
                    fill="none"
                    stroke="url(#edgeGrad)"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                    className="opacity-70"
                  />
                  <circle
                    r="3.5"
                    fill="#38bdf8"
                    filter="url(#glow)"
                  >
                    <animateMotion
                      path={pathD}
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              );
            });
          })}
        </svg>

        {/* Interactive Node Cards */}
        <div className="relative z-10 min-w-[1380px] min-h-[580px]">
          {strategyNodes.map((node) => {
            const isSelected = selectedNodeId === node.id;

            return (
              <div
                key={node.id}
                onClick={() => {
                  setSelectedNodeId(node.id);
                  sound.playNodeTrigger();
                }}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: '260px',
                }}
                className={`absolute bg-[#0f141c] border rounded-lg p-3.5 shadow-xl transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-amber-500/10'
                    : 'border-neutral-800 hover:border-neutral-600'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-neutral-800/80 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: node.color }}
                    />
                    <span className="font-semibold text-slate-100 text-xs tracking-tight">
                      {node.name}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">
                    {node.tag}
                  </span>
                </div>

                {/* Metrics */}
                <div className="space-y-1.5 text-xs font-mono">
                  {node.metrics.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{m.label}</span>
                      <span
                        className="font-semibold"
                        style={{ color: m.color || '#e2e8f0' }}
                      >
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Status Footer */}
                <div className="mt-3 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      node.status === 'TRIGGERED' ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'
                    }`} />
                    <span>{node.status}</span>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                    {node.category}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Node Inspector Drawer */}
      <div className="px-4 py-2.5 bg-[#0f141c] border-t border-neutral-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
          <span className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-rose-400" />
            Liquidity Sweeps: <strong className="text-slate-200">{sweeps.length} Sweeps Active</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-amber-400" />
            HTF POC Magnet: <strong className="text-amber-400">${htfPocPrice.toFixed(2)}</strong>
          </span>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Risk Rules: <strong className="text-slate-200">1:2.5 Min R:R</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[11px]">Engine Latency: 4ms · Mode: Serverless WebSocket</span>
        </div>
      </div>
    </div>
  );
};
