import React from 'react';
import { PriceNode } from '../../types/market';
import { 
  X, 
  GitCommit, 
  Target, 
  AlertCircle, 
  ArrowRight, 
  Zap, 
  CheckCircle2,
  Layers,
  Flame,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { sound } from '../../services/soundService';

interface NodeDetailsModalProps {
  node: PriceNode | null;
  onClose: () => void;
  onTradeAtNode: (price: number) => void;
}

export const NodeDetailsModal: React.FC<NodeDetailsModalProps> = ({
  node,
  onClose,
  onTradeAtNode,
}) => {
  if (!node) return null;

  const handleTrade = (price: number = node.price) => {
    sound.playNodeTrigger();
    onTradeAtNode(price);
    onClose();
  };

  const sweep = node.liquiditySweep;
  const htf = node.htfProfileInfo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#0f141c] border border-neutral-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: node.color }}
            />
            <span className="font-bold text-slate-100 text-sm">
              {node.label}
            </span>
            {sweep && (
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold border border-rose-500/30">
                Liquidity Sweep
              </span>
            )}
            {htf && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                HTF Profile
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Main Price Callout */}
          <div className="flex items-baseline justify-between p-3 bg-neutral-950/70 border border-neutral-800 rounded-lg">
            <div>
              <span className="text-[11px] text-slate-400 font-mono">Structural Node Price</span>
              <div className="text-xl font-bold font-mono text-amber-400">
                ${node.price.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-mono block">Classification</span>
              <span className="font-semibold text-slate-200">
                {node.type.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-slate-300 leading-relaxed text-[11px] bg-neutral-900/40 p-2.5 rounded border border-neutral-800/80">
            {node.description}
          </p>

          {/* Liquidity Sweep Dedicated Box */}
          {sweep && (
            <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-lg space-y-2 font-mono">
              <div className="flex items-center justify-between text-rose-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-rose-400" />
                  <span>Institutional Liquidity Sweep</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-rose-500/30 text-[10px]">
                  {sweep.sweepType === 'SWING' ? 'SWING LIQUIDITY SWEEP (SSL/BSL PURGE)' : 'CANDLE WICK GRAB'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-rose-500/20">
                <div>
                  <span className="text-slate-400 block">Swept Reference Level:</span>
                  <span className="text-slate-100 font-bold">${sweep.sweptLevel.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Wick Probe Depth:</span>
                  <span className="text-amber-300 font-bold">${sweep.sweepDepth.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Rejection Wick Ratio:</span>
                  <span className="text-emerald-400 font-bold">{(sweep.wickRejectionRatio * 100).toFixed(0)}% absorption</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Swept Stop Liquidity:</span>
                  <span className="text-slate-100 font-bold">{sweep.sweptVolumeOz} Troy Oz</span>
                </div>
              </div>
            </div>
          )}

          {/* HTF Volume Profile Box */}
          {htf && (
            <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg space-y-2 font-mono">
              <div className="flex items-center justify-between text-amber-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>HTF {htf.htfTimeframe} Volume Profile</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-[10px] pt-1 border-t border-amber-500/20 text-center">
                <div className="p-1.5 bg-neutral-950/60 rounded">
                  <span className="text-slate-400 block">VAL (70%)</span>
                  <span className="text-indigo-400 font-bold">${htf.val.toFixed(2)}</span>
                </div>
                <div className="p-1.5 bg-neutral-950/60 rounded border border-amber-500/40">
                  <span className="text-slate-400 block">POC Magnet</span>
                  <span className="text-amber-400 font-bold">${htf.poc.toFixed(2)}</span>
                </div>
                <div className="p-1.5 bg-neutral-950/60 rounded">
                  <span className="text-slate-400 block">VAH (70%)</span>
                  <span className="text-cyan-400 font-bold">${htf.vah.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800/80">
              <span className="text-slate-500 block text-[10px]">Institutional Strength</span>
              <span className="font-bold text-amber-300">★ {node.strength} / 5</span>
            </div>

            <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800/80">
              <span className="text-slate-500 block text-[10px]">Current Status</span>
              <span className="font-bold text-emerald-400">{node.status}</span>
            </div>

            <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800/80">
              <span className="text-slate-500 block text-[10px]">Volume Density</span>
              <span className="font-bold text-slate-200">{node.volume} Troy Oz</span>
            </div>

            <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800/80">
              <span className="text-slate-500 block text-[10px]">Tested Count</span>
              <span className="font-bold text-slate-200">{node.testedCount} Re-tests</span>
            </div>
          </div>

          {/* Target Extension Projection */}
          {node.targetExtension && (
            <div className="flex items-center justify-between p-2.5 bg-cyan-950/20 border border-cyan-500/30 rounded-lg text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-cyan-300">
                <Target className="w-4 h-4" />
                <span>Projected Target Extension:</span>
              </div>
              <span className="font-bold text-cyan-300">${node.targetExtension.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-neutral-800 bg-neutral-900/50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-slate-400 hover:text-slate-200 transition-colors"
          >
            Dismiss
          </button>

          {node.targetExtension && (
            <button
              onClick={() => handleTrade(node.targetExtension!)}
              className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded transition-all font-mono"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Target @ ${node.targetExtension.toFixed(2)}</span>
            </button>
          )}

          <button
            onClick={() => handleTrade(node.price)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded transition-all active:scale-95 shadow-md"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Place Limit @ ${node.price.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
