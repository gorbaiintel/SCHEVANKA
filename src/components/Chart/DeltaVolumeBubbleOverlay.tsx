import React from 'react';
import { 
  DeltaBubble, 
  DeltaBubbleConfig, 
  DeltaBubbleMetrics 
} from '../../services/deltaVolumeBubbleService';
import { 
  Zap, 
  ExternalLink, 
  SlidersHorizontal, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  Grid,
  Info,
  X
} from 'lucide-react';

interface DeltaVolumeBubbleOverlayProps {
  metrics: DeltaBubbleMetrics;
  config: DeltaBubbleConfig;
  onUpdateConfig: (partial: Partial<DeltaBubbleConfig>) => void;
  hoveredBubble: DeltaBubble | null;
  isOpenSettings: boolean;
  onCloseSettings: () => void;
  showGridLines: boolean;
  onToggleGridLines: () => void;
  showDeltaBubbles: boolean;
  onToggleDeltaBubbles: () => void;
}

export const DeltaVolumeBubbleOverlay: React.FC<DeltaVolumeBubbleOverlayProps> = ({
  metrics,
  config,
  onUpdateConfig,
  hoveredBubble,
  isOpenSettings,
  onCloseSettings,
  showGridLines,
  onToggleGridLines,
  showDeltaBubbles,
  onToggleDeltaBubbles,
}) => {
  return (
    <>
      {/* Floating Hovered Bubble Order Flow Card */}
      {hoveredBubble && (
        <div className="absolute top-14 left-4 z-40 p-3.5 bg-neutral-950/95 border border-cyan-500/40 rounded-xl shadow-2xl backdrop-blur-xl max-w-sm pointer-events-none text-xs animate-in fade-in zoom-in-95 duration-100 font-sans">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800 gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full animate-pulse shadow-md ${
                  hoveredBubble.type === 'BULLISH'
                    ? 'bg-cyan-400 shadow-cyan-500/50'
                    : hoveredBubble.type === 'BEARISH'
                    ? 'bg-rose-500 shadow-rose-500/50'
                    : 'bg-amber-400 shadow-amber-500/50'
                }`}
              />
              <span className="font-bold text-slate-100 font-mono tracking-tight text-[12px]">
                {hoveredBubble.type === 'BULLISH'
                  ? 'BULLISH DELTA BUBBLE'
                  : hoveredBubble.type === 'BEARISH'
                  ? 'BEARISH DELTA BUBBLE'
                  : 'VOLUME CHURN ANOMALY'}
              </span>
            </div>
            <span
              className={`font-mono font-bold text-xs px-1.5 py-0.5 rounded border ${
                hoveredBubble.zScore > 0
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}
            >
              {hoveredBubble.zScore > 0 ? '+' : ''}
              {hoveredBubble.zScore}σ
            </span>
          </div>

          <div className="mt-2.5 space-y-2 font-mono text-[11px]">
            {/* VWAP Anchor & Time */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Intra VWAP:</span>
              <span className="font-bold text-amber-400">
                ${hoveredBubble.price.toFixed(2)}
              </span>
            </div>

            {/* Net Delta Volume */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Net Delta:</span>
              <span
                className={`font-bold ${
                  hoveredBubble.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {hoveredBubble.delta >= 0 ? '+' : ''}
                {hoveredBubble.delta.toLocaleString()} Oz
              </span>
            </div>

            {/* Total Volume & Volume Z-Score */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Bar Volume:</span>
              <span className="text-slate-200">
                {hoveredBubble.volume.toLocaleString()} Oz{' '}
                <span className="text-slate-400 text-[10px]">
                  (Vol Z: {hoveredBubble.volZScore > 0 ? '+' : ''}
                  {hoveredBubble.volZScore}σ)
                </span>
              </span>
            </div>

            {/* Buy / Sell Pressure Ratio Bar */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span className="text-emerald-400">
                  Buy {hoveredBubble.buyPercent}%
                </span>
                <span className="text-rose-400">
                  Sell {100 - hoveredBubble.buyPercent}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-rose-500/40 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-emerald-400"
                  style={{ width: `${hoveredBubble.buyPercent}%` }}
                />
              </div>
            </div>

            {/* Absorption Badge Alert */}
            {hoveredBubble.isAbsorption && (
              <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-1.5 text-[10.5px]">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">PASSIVE ABSORPTION DETECTED:</span>{' '}
                  <span className="text-slate-300 font-sans">
                    Aggressive market orders were absorbed by massive limit order liquidity.
                  </span>
                </div>
              </div>
            )}

            {/* Climax / Exhaustion Alert */}
            {hoveredBubble.isExhaustion && (
              <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-1.5 text-[10.5px]">
                <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">VOLUME EXHAUSTION / CLIMAX:</span>{' '}
                  <span className="text-slate-300 font-sans">
                    Statistical anomaly exceeding 2.4σ standard deviations.
                  </span>
                </div>
              </div>
            )}

            {/* Engine Info */}
            <div className="pt-1.5 border-t border-neutral-800/80 flex items-center justify-between text-[9.5px] text-slate-400 font-sans">
              <span>Order Flow Engine</span>
              <span className="text-cyan-400 font-mono">Quant Z-Score</span>
            </div>
          </div>
        </div>
      )}

      {/* Delta Volume Bubble Settings Popover Modal */}
      {isOpenSettings && (
        <div className="absolute top-12 left-16 z-50 w-80 bg-neutral-900/98 border border-neutral-700 rounded-xl shadow-2xl backdrop-blur-xl p-3.5 text-slate-200 font-sans animate-in fade-in zoom-in-95 duration-150 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                  <span>Delta Volume Bubble</span>
                  <span className="px-1 py-0.2 rounded text-[9px] bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                    Quant Z-Score
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">Institutional Order Flow & Z-Score</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onCloseSettings}
                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-neutral-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Master Enable Toggle */}
          <div className="flex items-center justify-between p-2 bg-neutral-950/80 rounded-lg border border-neutral-800">
            <span className="text-xs font-semibold text-slate-200">Aktifkan Delta Volume Bubble</span>
            <button
              type="button"
              onClick={onToggleDeltaBubbles}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                showDeltaBubbles
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                  : 'bg-neutral-800 text-slate-500'
              }`}
            >
              {showDeltaBubbles ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          {/* Background Grid Lines Controller */}
          <div className="p-2 bg-neutral-950/80 rounded-lg border border-neutral-800 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-300">Grid Chart (Vertikal & Horizontal)</span>
              </div>
              <button
                type="button"
                onClick={onToggleGridLines}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                  showGridLines
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                    : 'bg-neutral-800 text-slate-400'
                }`}
              >
                {showGridLines ? 'AKTIF' : 'TERHAPUS (BERSIH)'}
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              {showGridLines
                ? 'Garis grid latar belakang aktif di kanvas chart.'
                : 'Grid vertikal dan horizontal dihapus untuk tampilan chart bersih tanpa garis.'}
            </p>
          </div>

          {/* Lookback Length */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>Z-Score Lookback Length</span>
              <span className="text-cyan-300 font-bold">{config.length} bars</span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-[11px] font-mono">
              {[14, 20, 30, 50].map((len) => (
                <button
                  key={len}
                  type="button"
                  onClick={() => onUpdateConfig({ length: len })}
                  className={`py-1 rounded border text-center transition-colors cursor-pointer ${
                    config.length === len
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold'
                      : 'bg-neutral-950 border-neutral-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {len}
                </button>
              ))}
            </div>
          </div>

          {/* Z-Score Threshold Trigger */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>Threshold Anomali (Z-Score)</span>
              <span className="text-amber-300 font-bold">{config.zThreshold.toFixed(2)}σ</span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-[11px] font-mono">
              {[0.75, 1.0, 1.5, 2.0].map((thresh) => (
                <button
                  key={thresh}
                  type="button"
                  onClick={() => onUpdateConfig({ zThreshold: thresh })}
                  className={`py-1 rounded border text-center transition-colors cursor-pointer ${
                    Math.abs(config.zThreshold - thresh) < 0.05
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                      : 'bg-neutral-950 border-neutral-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {thresh.toFixed(2)}σ
                </button>
              ))}
            </div>
          </div>

          {/* Bubble Size Multiplier */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>Ukuran Bubble (Radius Scale)</span>
              <span className="text-cyan-300 font-bold">{config.bubbleSizeMultiplier}x</span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-[11px] font-mono">
              {[0.7, 1.0, 1.3, 1.6].map((scale) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => onUpdateConfig({ bubbleSizeMultiplier: scale })}
                  className={`py-1 rounded border text-center transition-colors cursor-pointer ${
                    Math.abs(config.bubbleSizeMultiplier - scale) < 0.05
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold'
                      : 'bg-neutral-950 border-neutral-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {scale}x
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-1.5 text-xs font-mono pt-1 border-t border-neutral-800">
            <label className="flex items-center justify-between p-1.5 bg-neutral-950/60 rounded hover:bg-neutral-950 cursor-pointer">
              <span className="text-slate-300 text-[11px]">Deteksi Passive Absorption</span>
              <input
                type="checkbox"
                checked={config.showAbsorption}
                onChange={(e) => onUpdateConfig({ showAbsorption: e.target.checked })}
                className="accent-cyan-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 bg-neutral-950/60 rounded hover:bg-neutral-950 cursor-pointer">
              <span className="text-slate-300 text-[11px]">Tampilkan Label Z-Score (+2.1σ)</span>
              <input
                type="checkbox"
                checked={config.showLabels}
                onChange={(e) => onUpdateConfig({ showLabels: e.target.checked })}
                className="accent-cyan-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 bg-neutral-950/60 rounded hover:bg-neutral-950 cursor-pointer">
              <span className="text-slate-300 text-[11px]">Garis S/R Intra-VWAP Ray</span>
              <input
                type="checkbox"
                checked={config.showUnmitigatedRay}
                onChange={(e) => onUpdateConfig({ showUnmitigatedRay: e.target.checked })}
                className="accent-cyan-500 cursor-pointer"
              />
            </label>
          </div>

          <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-neutral-800">
            <span>TradingView Pine Script</span>
            <button
              type="button"
              onClick={onCloseSettings}
              className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/40 cursor-pointer transition-colors"
            >
              Simpan & Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
};
