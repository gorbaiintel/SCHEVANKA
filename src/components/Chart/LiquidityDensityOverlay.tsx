import React, { useState, useRef, useEffect } from 'react';
import { PriceNode, OrderBookItem, ICTKillzone } from '../../types/market';
import { 
  Layers, 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  Maximize2, 
  Minimize2, 
  Zap, 
  Clock, 
  Sliders,
  ChevronDown,
  ChevronUp,
  Target,
  BarChart2,
  GripVertical,
  RotateCcw
} from 'lucide-react';

interface LiquidityDensityOverlayProps {
  nodes: PriceNode[];
  bids: OrderBookItem[];
  asks: OrderBookItem[];
  spread: number;
  currentPrice: number;
  activeKillzones: ICTKillzone[];
  onSelectNode: (node: PriceNode) => void;
  onPrefillPrice?: (price: number) => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  showKillzones: boolean;
  onToggleKillzones: () => void;
}

export const LiquidityDensityOverlay: React.FC<LiquidityDensityOverlayProps> = ({
  nodes,
  bids,
  asks,
  spread,
  currentPrice,
  activeKillzones,
  onSelectNode,
  onPrefillPrice,
  showHeatmap,
  onToggleHeatmap,
  showKillzones,
  onToggleKillzones,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'sweeps' | 'htf' | 'walls' | 'fvg'>('all');

  // Movable position state persisted to localStorage
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('aura_sessions_overlay_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return { x: 12, y: 48 };
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Mouse drag handler
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return;
      const deltaX = moveEvent.clientX - dragRef.current.startX;
      const deltaY = moveEvent.clientY - dragRef.current.startY;

      const parent = overlayRef.current?.parentElement;
      const parentW = parent?.clientWidth || window.innerWidth;
      const parentH = parent?.clientHeight || window.innerHeight;
      const overlayW = overlayRef.current?.clientWidth || 280;
      const overlayH = overlayRef.current?.clientHeight || 45;

      const maxX = Math.max(10, parentW - overlayW - 10);
      const maxY = Math.max(10, parentH - overlayH - 10);

      const nextX = Math.max(6, Math.min(maxX, dragRef.current.startPosX + deltaX));
      const nextY = Math.max(6, Math.min(maxY, dragRef.current.startPosY + deltaY));

      setPosition({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setPosition(cur => {
        try {
          localStorage.setItem('aura_sessions_overlay_pos', JSON.stringify(cur));
        } catch {
          // ignore
        }
        return cur;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Touch drag handler for mobile/tablet screens
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();

    const touch = e.touches[0];
    setIsDragging(true);
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (!dragRef.current || moveEvent.touches.length !== 1) return;
      const t = moveEvent.touches[0];
      const deltaX = t.clientX - dragRef.current.startX;
      const deltaY = t.clientY - dragRef.current.startY;

      const parent = overlayRef.current?.parentElement;
      const parentW = parent?.clientWidth || window.innerWidth;
      const parentH = parent?.clientHeight || window.innerHeight;
      const overlayW = overlayRef.current?.clientWidth || 280;
      const overlayH = overlayRef.current?.clientHeight || 45;

      const maxX = Math.max(10, parentW - overlayW - 10);
      const maxY = Math.max(10, parentH - overlayH - 10);

      const nextX = Math.max(6, Math.min(maxX, dragRef.current.startPosX + deltaX));
      const nextY = Math.max(6, Math.min(maxY, dragRef.current.startPosY + deltaY));

      setPosition({ x: nextX, y: nextY });
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      dragRef.current = null;
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      setPosition(cur => {
        try {
          localStorage.setItem('aura_sessions_overlay_pos', JSON.stringify(cur));
        } catch {
          // ignore
        }
        return cur;
      });
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  };

  const resetPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    const defaultPos = { x: 12, y: 48 };
    setPosition(defaultPos);
    try {
      localStorage.setItem('aura_sessions_overlay_pos', JSON.stringify(defaultPos));
    } catch {
      // ignore
    }
  };

  // Compute aggregate liquidity metrics from DOM
  const totalBidOz = bids.reduce((acc, b) => acc + b.amount, 0);
  const totalAskOz = asks.reduce((acc, a) => acc + a.amount, 0);
  const totalDOMOz = totalBidOz + totalAskOz || 1;
  const bidRatio = Math.round((totalBidOz / totalDOMOz) * 100);
  const askRatio = 100 - bidRatio;

  // Find nodes with highest resting liquidity density or sweeps
  const filteredNodes = nodes.filter(n => {
    if (selectedFilter === 'sweeps') {
      return Boolean(n.liquiditySweep);
    }
    if (selectedFilter === 'htf') {
      return n.type === 'HTF_POC' || n.type === 'HTF_VAH' || n.type === 'HTF_VAL';
    }
    if (selectedFilter === 'walls') {
      return n.liquidityDensity?.wallType === 'BID_WALL' || n.liquidityDensity?.wallType === 'ASK_WALL';
    }
    if (selectedFilter === 'fvg') {
      return n.type === 'FVG_BULL' || n.type === 'FVG_BEAR' || n.type === 'EQH' || n.type === 'EQL';
    }
    return Boolean(n.liquidityDensity && n.liquidityDensity.restingOz > 0) || Boolean(n.liquiditySweep) || n.type.startsWith('HTF_');
  }).sort((a, b) => {
    if (selectedFilter === 'sweeps') {
      return b.time - a.time;
    }
    return (b.liquidityDensity?.restingOz || 0) - (a.liquidityDensity?.restingOz || 0);
  });

  const activeKz = activeKillzones.find(kz => kz.isActive);
  const latestSweep = nodes.find(n => n.liquiditySweep);
  const activeHtfPoc = nodes.find(n => n.type === 'HTF_POC');

  return (
    <div 
      ref={overlayRef}
      onWheel={(e) => e.stopPropagation()}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        left: 0,
        top: 0,
      }}
      className={`absolute z-30 pointer-events-auto flex flex-col gap-2 max-w-sm font-sans select-none transition-shadow ${
        isDragging ? 'shadow-2xl scale-[1.02] cursor-grabbing opacity-95' : ''
      }`}
    >
      {/* Minimized Compact Mode */}
      {isMinimized ? (
        <div className="flex items-center gap-1.5 p-1 bg-neutral-950/95 border border-neutral-700/80 rounded-lg shadow-2xl backdrop-blur-xl text-xs">
          {/* Grip Drag Handle */}
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="flex items-center justify-center px-1 py-1 text-slate-500 hover:text-amber-400 cursor-grab active:cursor-grabbing rounded hover:bg-neutral-800 transition-colors select-none"
            title="Geser / Drag untuk memindahkan overlay"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          {latestSweep && latestSweep.liquiditySweep && (
            <div
              onClick={() => onSelectNode(latestSweep)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer font-mono text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30"
              title={`Latest ${latestSweep.liquiditySweep.sweepSide} Sweep`}
            >
              <Target className="w-3 h-3 text-rose-400" />
              <span>{latestSweep.liquiditySweep.sweepSide} Sweep</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Perluas Overlay (Expand)"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      ) : (
        /* Primary Full Pill Bar */
        <div className="flex items-center gap-1.5 p-1 bg-neutral-950/95 border border-neutral-700/80 rounded-lg shadow-2xl backdrop-blur-xl text-xs">
          {/* Grip Drag Handle */}
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="flex items-center justify-center px-1 py-1 text-slate-400 hover:text-amber-400 cursor-grab active:cursor-grabbing rounded hover:bg-neutral-850 transition-colors select-none"
            title="Geser / Drag untuk memindahkan tombol overlay ini ke posisi manapun di chart"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          {/* Latest Sweep Indicator Pill (Swap / Sweep) */}
          {latestSweep && latestSweep.liquiditySweep && (
            <div
              onClick={() => onSelectNode(latestSweep)}
              className="flex items-center gap-1 px-2 py-1 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 rounded cursor-pointer text-[11px] font-mono text-rose-300 transition-colors"
              title={`Latest ${latestSweep.label}`}
            >
              <Target className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-bold">{latestSweep.liquiditySweep.sweepSide} Sweep</span>
            </div>
          )}

          {/* Active HTF POC Pill */}
          {activeHtfPoc && (
            <div
              onClick={() => onSelectNode(activeHtfPoc)}
              className="hidden sm:flex items-center gap-1 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded cursor-pointer text-[11px] font-mono text-amber-300 transition-colors"
              title="HTF Point of Control Level"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>POC ${activeHtfPoc.price.toFixed(1)}</span>
            </div>
          )}

          {/* Liquidity Heatmap Toggle */}
          <button
            onClick={onToggleHeatmap}
            className={`flex items-center gap-1.5 px-2 py-1 rounded font-medium text-xs transition-colors cursor-pointer ${
              showHeatmap
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                : 'bg-neutral-900 border border-neutral-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Canvas Order Book Liquidity Density Heatmap & Bands"
          >
            <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'text-cyan-400 fill-cyan-400/20' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">DOM</span>
          </button>

          {/* DOM Order Flow Delta Bar */}
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-2 py-1 bg-neutral-900 hover:bg-neutral-850 rounded border border-neutral-800 cursor-pointer text-[11px] font-mono transition-colors"
            title="Klik untuk melihat matriks likuiditas di sekitar level kunci"
          >
            <div className="flex items-center gap-1">
              <span className="text-emerald-400 font-bold">{bidRatio}%</span>
              <div className="w-10 h-2 bg-neutral-800 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300" 
                  style={{ width: `${bidRatio}%` }} 
                />
                <div 
                  className="bg-rose-500 h-full transition-all duration-300" 
                  style={{ width: `${askRatio}%` }} 
                />
              </div>
              <span className="text-rose-400 font-bold">{askRatio}%</span>
            </div>

            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>

          {/* Minimize & Reset Position Buttons */}
          <div className="flex items-center gap-0.5 pl-1 border-l border-neutral-800">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Perkecil overlay (minimize agar tidak menutupi chart)"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={resetPosition}
              className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Reset posisi overlay ke default"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Expanded Liquidity Density Radar & Node Breakdown */}
      {isExpanded && !isMinimized && (
        <div className="bg-[#0f141c]/98 border border-neutral-700/80 rounded-xl shadow-2xl p-3 backdrop-blur-xl text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400/20" />
              <span className="font-bold text-slate-100">Structural Liquidity Matrix</span>
              <span className="text-[10px] text-slate-500 font-mono">({filteredNodes.length} nodes)</span>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 font-mono text-[10px]">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  selectedFilter === 'all' ? 'bg-neutral-800 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedFilter('sweeps')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  selectedFilter === 'sweeps' ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Liquidity Sweeps"
              >
                Sweeps
              </button>
              <button
                onClick={() => setSelectedFilter('htf')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  selectedFilter === 'htf' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="HTF Candle Volume Profile & POC"
              >
                HTF
              </button>
              <button
                onClick={() => setSelectedFilter('walls')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  selectedFilter === 'walls' ? 'bg-neutral-800 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Walls
              </button>
              <button
                onClick={() => setSelectedFilter('fvg')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  selectedFilter === 'fvg' ? 'bg-neutral-800 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                FVG
              </button>
            </div>
          </div>

          {/* Aggregate Stats */}
          <div className="grid grid-cols-2 gap-2 mb-2 font-mono text-[11px]">
            <div className="p-2 bg-neutral-950/70 rounded border border-neutral-800/80">
              <span className="text-[10px] text-slate-500 block">Resting Bid Liquidity</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-bold text-emerald-400">{totalBidOz.toFixed(1)} Oz</span>
                <span className="text-[10px] text-slate-500">(${((totalBidOz * currentPrice) / 1000).toFixed(0)}k)</span>
              </div>
            </div>

            <div className="p-2 bg-neutral-950/70 rounded border border-neutral-800/80">
              <span className="text-[10px] text-slate-500 block">Resting Ask Liquidity</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-bold text-rose-400">{totalAskOz.toFixed(1)} Oz</span>
                <span className="text-[10px] text-slate-500">(${((totalAskOz * currentPrice) / 1000).toFixed(0)}k)</span>
              </div>
            </div>
          </div>

          {/* List of structural nodes */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
            {filteredNodes.length === 0 ? (
              <div className="py-4 text-center text-slate-500 text-xs">
                No matching structural nodes in this category
              </div>
            ) : (
              filteredNodes.slice(0, 8).map((node) => {
                const distFromPrice = node.price - currentPrice;
                const isAbove = distFromPrice > 0;
                const sweep = node.liquiditySweep;
                const htf = node.htfProfileInfo;

                return (
                  <div
                    key={node.id}
                    onClick={() => onSelectNode(node)}
                    className="p-2 rounded bg-neutral-900/60 hover:bg-neutral-800/70 border border-neutral-800/70 hover:border-neutral-700 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-2 h-2 rounded-full shrink-0" 
                          style={{ backgroundColor: node.color }} 
                        />
                        <span className="font-semibold text-slate-200 text-xs truncate max-w-[140px]">
                          {node.label}
                        </span>
                        {sweep && (
                          <span className="text-[9px] font-mono px-1 py-0.2 bg-rose-500/20 text-rose-300 rounded font-bold">
                            {sweep.sweepType === 'SWING' ? 'SWING' : 'SWEEP'}
                          </span>
                        )}
                        {htf && (
                          <span className="text-[9px] font-mono px-1 py-0.2 bg-amber-500/20 text-amber-300 rounded font-bold">
                            {htf.htfTimeframe}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <span className="font-bold text-slate-100">${node.price.toFixed(2)}</span>
                        <span className={`text-[10px] ${isAbove ? 'text-rose-400' : 'text-emerald-400'}`}>
                          ({isAbove ? '+' : ''}${distFromPrice.toFixed(2)})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-neutral-800/60">
                      <div className="flex items-center gap-1.5">
                        {sweep ? (
                          <span className="text-amber-300">
                            Depth: <strong className="text-slate-200">${sweep.sweepDepth.toFixed(2)}</strong>
                          </span>
                        ) : htf ? (
                          <span className="text-cyan-300">
                            VA: ${htf.val.toFixed(0)} - ${htf.vah.toFixed(0)}
                          </span>
                        ) : node.liquidityDensity ? (
                          <span className={node.liquidityDensity.wallType === 'BID_WALL' ? 'text-emerald-400 font-bold' : node.liquidityDensity.wallType === 'ASK_WALL' ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                            {node.liquidityDensity.wallType === 'BID_WALL' ? 'Buy Wall' : node.liquidityDensity.wallType === 'ASK_WALL' ? 'Sell Wall' : 'Balanced'}
                          </span>
                        ) : (
                          <span className="text-slate-400">{node.type.replace('_', ' ')}</span>
                        )}
                        <span className="text-slate-500">·</span>
                        <span className="text-amber-300 font-semibold">{node.volume} Oz</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {onPrefillPrice && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPrefillPrice(node.price);
                            }}
                            className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-[10px] font-sans font-semibold border border-amber-500/30 transition-colors"
                          >
                            Limit @ ${node.price.toFixed(2)}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Killzone note */}
          {activeKz && (
            <div className="mt-2 pt-2 border-t border-neutral-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="text-amber-300/90 font-medium">ICT Session: {activeKz.name}</span>
              <span className="text-slate-500">{activeKz.startHourUtc}:00 - {activeKz.endHourUtc}:00 UTC</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
