import React, { useMemo } from 'react';
import { OrderBookItem, TickerData, PriceNode } from '../../types/market';
import { ArrowDown, ArrowUp, Crosshair } from 'lucide-react';

interface OrderBookDOMProps {
  bids: OrderBookItem[];
  asks: OrderBookItem[];
  spread: number;
  ticker: TickerData;
  onSelectPrice: (price: number) => void;
  nodes?: PriceNode[];
  syncedPrice?: number | null;
  crosshairSyncSource?: 'chart' | 'dom' | null;
  crosshairSyncEnabled?: boolean;
  onHoverPrice?: (price: number | null) => void;
  onToggleCrosshairSync?: () => void;
}

export const OrderBookDOM: React.FC<OrderBookDOMProps> = ({
  bids,
  asks,
  spread,
  ticker,
  onSelectPrice,
  nodes = [],
  syncedPrice = null,
  crosshairSyncSource = null,
  crosshairSyncEnabled = true,
  onHoverPrice,
  onToggleCrosshairSync,
}) => {
  // Asks are displayed top-to-bottom in descending order so lowest ask is closest to spread
  const sortedAsks = useMemo(() => [...asks].slice(0, 9).reverse(), [asks]);
  const sortedBids = useMemo(() => [...bids].slice(0, 9), [bids]);

  // Determine closest row when synchronized price is received from Chart
  const isSyncActive = crosshairSyncEnabled && syncedPrice != null;

  const closestTarget = useMemo(() => {
    if (!isSyncActive || syncedPrice == null) return null;

    let closest: { type: 'ask' | 'bid' | 'mid'; price: number; diff: number } | null = null;

    for (const ask of sortedAsks) {
      const diff = Math.abs(ask.price - syncedPrice);
      if (!closest || diff < closest.diff) {
        closest = { type: 'ask', price: ask.price, diff };
      }
    }

    const midDiff = Math.abs(ticker.price - syncedPrice);
    if (!closest || midDiff < closest.diff) {
      closest = { type: 'mid', price: ticker.price, diff: midDiff };
    }

    for (const bid of sortedBids) {
      const diff = Math.abs(bid.price - syncedPrice);
      if (!closest || diff < closest.diff) {
        closest = { type: 'bid', price: bid.price, diff };
      }
    }

    // In gold market with ~0.20 DOM intervals, match within 0.28 tolerance
    if (closest && closest.diff <= 0.28) {
      return closest;
    }
    return null;
  }, [isSyncActive, syncedPrice, sortedAsks, sortedBids, ticker.price]);

  // Out of range check
  const highestAsk = sortedAsks[0]?.price ?? 0;
  const lowestBid = sortedBids[sortedBids.length - 1]?.price ?? 0;
  const isAboveDom = isSyncActive && syncedPrice != null && syncedPrice > highestAsk + 0.28;
  const isBelowDom = isSyncActive && syncedPrice != null && syncedPrice < lowestBid - 0.28;

  // Helper to find nearby structural node for a given price
  const getNearbyNodeTag = (price: number): { label: string; color: string } | null => {
    for (const node of nodes) {
      if (Math.abs(node.price - price) <= 0.45) {
        if (node.type === 'EQH') return { label: 'EQH/BSL', color: '#f43f5e' };
        if (node.type === 'EQL') return { label: 'EQL/SSL', color: '#10b981' };
        if (node.type === 'ORDER_BLOCK_BULL') return { label: '+OB', color: '#10b981' };
        if (node.type === 'ORDER_BLOCK_BEAR') return { label: '-OB', color: '#f43f5e' };
        if (node.type === 'FVG_BULL') return { label: '+FVG', color: '#06b6d4' };
        if (node.type === 'FVG_BEAR') return { label: '-FVG', color: '#f97316' };
        if (node.type === 'HVN') return { label: 'POC', color: '#eab308' };
        if (node.type === 'SWING_HIGH') return { label: node.swingType || 'Peak', color: '#fb7185' };
        if (node.type === 'SWING_LOW') return { label: node.swingType || 'Floor', color: '#34d399' };
      }
    }
    return null;
  };

  const handleRowHover = (price: number) => {
    if (crosshairSyncEnabled && onHoverPrice) {
      onHoverPrice(price);
    }
  };

  const handleContainerLeave = () => {
    if (crosshairSyncEnabled && onHoverPrice) {
      onHoverPrice(null);
    }
  };

  return (
    <div 
      className="flex flex-col h-full bg-[#0b0e14] border border-neutral-800 rounded-lg overflow-hidden text-xs select-none"
      onMouseLeave={handleContainerLeave}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-[#0f141c]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-100">Order Book (DOM)</span>
          <span className="text-[10px] font-mono text-slate-500">· Liquidity</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Crosshair Sync Toggle Button */}
          {onToggleCrosshairSync && (
            <button
              onClick={onToggleCrosshairSync}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                crosshairSyncEnabled
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold shadow-[0_0_8px_rgba(6,182,212,0.25)]'
                  : 'bg-neutral-900 border-neutral-800 text-slate-500 hover:text-slate-300'
              }`}
              title={
                crosshairSyncEnabled
                  ? 'Sinkronisasi Crosshair Aktif: Gerakan kursor di Chart & DOM terkoordinasi'
                  : 'Aktifkan Sinkronisasi Crosshair Chart ↔ DOM'
              }
            >
              <Crosshair className={`w-3 h-3 ${crosshairSyncEnabled ? 'text-cyan-400 animate-spin-slow' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">SYNC</span>
              <span className={`w-1.5 h-1.5 rounded-full ${crosshairSyncEnabled ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
            </button>
          )}

          <div className="text-[11px] font-mono text-slate-400">
            Spread: <strong className="text-slate-200">{(spread * 100).toFixed(0)}¢</strong> ({spread.toFixed(2)})
          </div>
        </div>
      </div>

      {/* Synchronized Above DOM Indicator */}
      {isAboveDom && (
        <div className="px-2 py-0.5 bg-cyan-950/80 border-b border-cyan-500/30 text-[10px] font-mono text-cyan-300 flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-1 font-semibold">
            <Crosshair className="w-2.5 h-2.5 text-cyan-400" />
            <span>Chart Cursor:</span>
          </span>
          <span className="font-bold">${syncedPrice?.toFixed(2)} (Di atas ladder)</span>
        </div>
      )}

      {/* Columns Label */}
      <div className="grid grid-cols-3 px-3 py-1.5 text-[10px] font-mono text-slate-500 border-b border-neutral-900 bg-neutral-950/40">
        <span className="text-left">Price (USD)</span>
        <span className="text-right">Size (Oz)</span>
        <span className="text-right">Total (Oz)</span>
      </div>

      {/* Asks (Sell Orders - Red) */}
      <div className="flex-1 flex flex-col justify-end overflow-y-auto px-1 py-0.5 space-y-0.5 font-mono text-[11px]">
        {sortedAsks.map((ask, idx) => {
          const nodeTag = getNearbyNodeTag(ask.price);
          const isSyncedRow = closestTarget?.type === 'ask' && closestTarget.price === ask.price;

          return (
            <div
              key={`ask-${idx}-${ask.price}`}
              onClick={() => onSelectPrice(ask.price)}
              onMouseEnter={() => handleRowHover(ask.price)}
              onMouseMove={() => handleRowHover(ask.price)}
              className={`relative grid grid-cols-3 px-2 py-0.5 rounded cursor-pointer transition-all group ${
                isSyncedRow
                  ? 'bg-cyan-500/25 border-l-2 border-l-cyan-400 ring-1 ring-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'hover:bg-neutral-800/60'
              }`}
            >
              {/* Depth visual bar from right to left */}
              <div
                className="absolute top-0 right-0 bottom-0 bg-rose-500/15 transition-all pointer-events-none rounded-r"
                style={{ width: `${ask.percent}%` }}
              />
              <div className="flex items-center gap-1.5 relative z-10">
                <span className={`font-semibold group-hover:underline ${isSyncedRow ? 'text-cyan-200 font-bold' : 'text-rose-400'}`}>
                  {ask.price.toFixed(2)}
                </span>

                {/* Synchronized Crosshair Indicator Badge */}
                {isSyncedRow && (
                  <span className="text-[9px] font-bold px-1 py-0 rounded bg-cyan-500/30 text-cyan-200 border border-cyan-400/60 flex items-center gap-0.5 leading-none animate-pulse">
                    <Crosshair className="w-2.5 h-2.5 text-cyan-300" />
                    SYNC
                  </span>
                )}

                {nodeTag && !isSyncedRow && (
                  <span 
                    className="text-[9px] font-bold px-1 py-0 rounded border leading-none"
                    style={{ 
                      color: nodeTag.color, 
                      borderColor: `${nodeTag.color}40`,
                      backgroundColor: `${nodeTag.color}15` 
                    }}
                  >
                    {nodeTag.label}
                  </span>
                )}
              </div>
              <span className={`text-right relative z-10 ${isSyncedRow ? 'text-cyan-100 font-bold' : 'text-slate-300'}`}>
                {ask.amount.toFixed(1)}
              </span>
              <span className={`text-right relative z-10 ${isSyncedRow ? 'text-cyan-300 font-bold' : 'text-slate-500'}`}>
                {ask.total.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mid Market Spread Bar */}
      {(() => {
        const isSyncedMid = closestTarget?.type === 'mid';
        return (
          <div 
            onMouseEnter={() => handleRowHover(ticker.price)}
            onMouseMove={() => handleRowHover(ticker.price)}
            className={`flex items-center justify-between px-3 py-1.5 my-0.5 border-y font-mono transition-all cursor-pointer ${
              isSyncedMid 
                ? 'bg-cyan-950/80 border-cyan-400 ring-1 ring-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                : 'bg-neutral-900/90 border-neutral-800 hover:bg-neutral-800/80'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-bold ${
                isSyncedMid
                  ? 'text-cyan-300'
                  : ticker.lastTickDirection === 'up' 
                  ? 'text-emerald-400' 
                  : ticker.lastTickDirection === 'down'
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }`}>
                ${ticker.price.toFixed(2)}
              </span>
              {ticker.lastTickDirection === 'up' ? (
                <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-rose-400" />
              )}
              {isSyncedMid && (
                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-cyan-500/30 text-cyan-200 border border-cyan-400/60 flex items-center gap-0.5">
                  <Crosshair className="w-2.5 h-2.5 text-cyan-300" />
                  SYNC SPOT
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400">
              Mark: <span className="text-slate-200">${((ticker.bid + ticker.ask) / 2).toFixed(2)}</span>
            </div>
          </div>
        );
      })()}

      {/* Bids (Buy Orders - Green) */}
      <div className="flex-1 flex flex-col justify-start overflow-y-auto px-1 py-0.5 space-y-0.5 font-mono text-[11px]">
        {sortedBids.map((bid, idx) => {
          const nodeTag = getNearbyNodeTag(bid.price);
          const isSyncedRow = closestTarget?.type === 'bid' && closestTarget.price === bid.price;

          return (
            <div
              key={`bid-${idx}-${bid.price}`}
              onClick={() => onSelectPrice(bid.price)}
              onMouseEnter={() => handleRowHover(bid.price)}
              onMouseMove={() => handleRowHover(bid.price)}
              className={`relative grid grid-cols-3 px-2 py-0.5 rounded cursor-pointer transition-all group ${
                isSyncedRow
                  ? 'bg-cyan-500/25 border-l-2 border-l-cyan-400 ring-1 ring-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'hover:bg-neutral-800/60'
              }`}
            >
              {/* Depth visual bar from right to left */}
              <div
                className="absolute top-0 right-0 bottom-0 bg-emerald-500/15 transition-all pointer-events-none rounded-r"
                style={{ width: `${bid.percent}%` }}
              />
              <div className="flex items-center gap-1.5 relative z-10">
                <span className={`font-semibold group-hover:underline ${isSyncedRow ? 'text-cyan-200 font-bold' : 'text-emerald-400'}`}>
                  {bid.price.toFixed(2)}
                </span>

                {/* Synchronized Crosshair Indicator Badge */}
                {isSyncedRow && (
                  <span className="text-[9px] font-bold px-1 py-0 rounded bg-cyan-500/30 text-cyan-200 border border-cyan-400/60 flex items-center gap-0.5 leading-none animate-pulse">
                    <Crosshair className="w-2.5 h-2.5 text-cyan-300" />
                    SYNC
                  </span>
                )}

                {nodeTag && !isSyncedRow && (
                  <span 
                    className="text-[9px] font-bold px-1 py-0 rounded border leading-none"
                    style={{ 
                      color: nodeTag.color, 
                      borderColor: `${nodeTag.color}40`,
                      backgroundColor: `${nodeTag.color}15` 
                    }}
                  >
                    {nodeTag.label}
                  </span>
                )}
              </div>
              <span className={`text-right relative z-10 ${isSyncedRow ? 'text-cyan-100 font-bold' : 'text-slate-300'}`}>
                {bid.amount.toFixed(1)}
              </span>
              <span className={`text-right relative z-10 ${isSyncedRow ? 'text-cyan-300 font-bold' : 'text-slate-500'}`}>
                {bid.total.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Synchronized Below DOM Indicator */}
      {isBelowDom && (
        <div className="px-2 py-0.5 bg-cyan-950/80 border-t border-cyan-500/30 text-[10px] font-mono text-cyan-300 flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-1 font-semibold">
            <Crosshair className="w-2.5 h-2.5 text-cyan-400" />
            <span>Chart Cursor:</span>
          </span>
          <span className="font-bold">${syncedPrice?.toFixed(2)} (Di bawah ladder)</span>
        </div>
      )}
    </div>
  );
};
