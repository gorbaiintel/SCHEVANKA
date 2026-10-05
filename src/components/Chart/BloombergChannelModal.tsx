import React from 'react';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Sliders, 
  Check, 
  RotateCcw, 
  Zap, 
  Layers, 
  ShieldCheck, 
  Target, 
  BarChart2, 
  Eye, 
  Compass, 
  Sparkles 
} from 'lucide-react';
import { 
  BloombergChannelConfig, 
  BloombergChannelResult, 
  DEFAULT_BLOOMBERG_CHANNEL_CONFIG 
} from '../../services/bloombergChannelService';
import { sound } from '../../services/soundService';

interface BloombergChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BloombergChannelConfig;
  onUpdateConfig: (newConfig: Partial<BloombergChannelConfig>) => void;
  channelData: BloombergChannelResult | null;
  onTradeSignal?: (side: 'BUY' | 'SELL', price: number, sl: number, tp: number) => void;
}

export const BloombergChannelModal: React.FC<BloombergChannelModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  channelData,
  onTradeSignal,
}) => {
  if (!isOpen) return null;

  const handleReset = () => {
    onUpdateConfig(DEFAULT_BLOOMBERG_CHANNEL_CONFIG);
    sound.playNodeTrigger();
  };

  const isBullish = channelData?.regime === 'BULLISH_ASCENDING';
  const isBearish = channelData?.regime === 'BEARISH_DESCENDING';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150 select-none overflow-y-auto">
      <div className="bg-[#0b0e14] border border-amber-500/40 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.15)] w-full max-w-2xl overflow-hidden text-xs flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-[#0f141c]/95 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-1.5">
                  <span>BLOOMBERG AUTO SMART CHANNEL</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    PRO TERMINAL
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-slate-400">
                Automated Linear Regression & Standard Deviation Volatility Envelopes for Gold XAU/USD
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Channel Regime & Telemetry Status */}
        {channelData && (
          <div className="p-4 border-b border-neutral-800 bg-neutral-950/60 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
            <div className="p-2 rounded bg-neutral-900/80 border border-neutral-800 flex flex-col justify-between">
              <span className="text-slate-400 text-[10px]">Channel Regime</span>
              <div className="flex items-center gap-1 mt-1 font-bold">
                {isBullish && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
                {isBearish && <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
                <span className={isBullish ? 'text-emerald-400' : isBearish ? 'text-rose-400' : 'text-cyan-400'}>
                  {channelData.regime === 'BULLISH_ASCENDING' ? 'BULL ASCENDING' :
                   channelData.regime === 'BEARISH_DESCENDING' ? 'BEAR DESCENDING' : 'HORIZONTAL RANGE'}
                </span>
              </div>
              <span className="text-slate-500 text-[10px]">Slope: {channelData.slope > 0 ? '+' : ''}${channelData.slope}/bar ({channelData.slopeAngleDeg}°)</span>
            </div>

            <div className="p-2 rounded bg-neutral-900/80 border border-neutral-800 flex flex-col justify-between">
              <span className="text-slate-400 text-[10px]">Trend Fit (R²)</span>
              <span className="text-sm font-bold text-amber-400 mt-1">
                {(channelData.rSquared * 100).toFixed(1)}%
              </span>
              <span className="text-slate-500 text-[10px]">Std Error: ${channelData.standardError.toFixed(2)}</span>
            </div>

            <div className="p-2 rounded bg-neutral-900/80 border border-neutral-800 flex flex-col justify-between">
              <span className="text-slate-400 text-[10px]">Channel Width</span>
              <span className="text-sm font-bold text-slate-200 mt-1">
                ${channelData.channelWidth.toFixed(2)}
              </span>
              <span className="text-slate-500 text-[10px]">Z-Score: {channelData.priceZScore > 0 ? '+' : ''}{channelData.priceZScore}σ</span>
            </div>

            <div className="p-2 rounded bg-neutral-900/80 border border-neutral-800 flex flex-col justify-between">
              <span className="text-slate-400 text-[10px]">Projected Target</span>
              <span className="text-sm font-bold text-cyan-400 mt-1">
                ${channelData.targetPrice.toFixed(2)}
              </span>
              <span className="text-slate-500 text-[10px]">
                {channelData.signal === 'OVERBOUGHT_RESISTANCE' ? 'Mean Reversion Target' :
                 channelData.signal === 'OVERSOLD_SUPPORT' ? 'Mean Reversion Target' : 'Momentum Target'}
              </span>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Quick Trade thesis banner */}
          {channelData && onTradeSignal && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-cyan-500/10 to-transparent border border-amber-500/30 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bloomberg Algorithmic Channel Thesis</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed font-mono">
                  {channelData.signal === 'OVERSOLD_SUPPORT'
                    ? `Harga menyentuh batas bawah channel (${channelData.currentLower.toFixed(2)}). Peluang Rebound Mean Reversion BUY ke Midline $${channelData.currentMidline.toFixed(2)}.`
                    : channelData.signal === 'OVERBOUGHT_RESISTANCE'
                    ? `Harga menyentuh batas atas channel (${channelData.currentUpper.toFixed(2)}). Peluang Rejection Mean Reversion SELL ke Midline $${channelData.currentMidline.toFixed(2)}.`
                    : `Regime ${channelData.regime} terkonfirmasi dengan R² ${(channelData.rSquared * 100).toFixed(0)}%. Midline Equilibrium berada di $${channelData.currentMidline.toFixed(2)}.`}
                </p>
              </div>

              {channelData.signal === 'OVERSOLD_SUPPORT' && (
                <button
                  onClick={() => {
                    sound.playOrderExecuted();
                    onTradeSignal(
                      'BUY',
                      channelData.currentLower,
                      +(channelData.currentLower - 4.0).toFixed(2),
                      channelData.currentMidline
                    );
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs whitespace-nowrap shadow transition active:scale-95 cursor-pointer"
                >
                  BUY Bounce
                </button>
              )}

              {channelData.signal === 'OVERBOUGHT_RESISTANCE' && (
                <button
                  onClick={() => {
                    sound.playOrderExecuted();
                    onTradeSignal(
                      'SELL',
                      channelData.currentUpper,
                      +(channelData.currentUpper + 4.0).toFixed(2),
                      channelData.currentMidline
                    );
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold font-mono text-xs whitespace-nowrap shadow transition active:scale-95 cursor-pointer"
                >
                  SELL Rejection
                </button>
              )}
            </div>
          )}

          {/* Configuration Form */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              Parameter Algoritma Channel
            </h4>

            {/* Auto Lookback Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-900 border border-neutral-800">
              <div>
                <span className="font-semibold text-slate-200">Auto-Detect Lookback (Adaptive Cycle)</span>
                <p className="text-[11px] text-slate-400">
                  Secara otomatis memindai panjang siklus swing yang menghasilkan korelasi R² tertinggi
                </p>
              </div>
              <button
                onClick={() => onUpdateConfig({ autoLookback: !config.autoLookback })}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  config.autoLookback ? 'bg-amber-500' : 'bg-neutral-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    config.autoLookback ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Manual Lookback Slider if auto is off */}
            {!config.autoLookback && (
              <div className="space-y-1.5 p-3 rounded-lg bg-neutral-900 border border-neutral-800 font-mono">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Lookback Period (Bars)</span>
                  <span className="font-bold text-amber-400">{config.lookback} Bars</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={120}
                  step={5}
                  value={config.lookback}
                  onChange={(e) => onUpdateConfig({ lookback: parseInt(e.target.value, 10) })}
                  className="w-full accent-amber-500"
                />
              </div>
            )}

            {/* Channel Envelope Mode */}
            <div className="space-y-2">
              <label className="text-slate-300 font-medium block">Tipe Amplop Channel (Envelope Model)</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onUpdateConfig({ channelType: 'STANDARD_DEV' })}
                  className={`p-2.5 rounded-lg border text-left transition ${
                    config.channelType === 'STANDARD_DEV'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                      : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-xs">Standard Deviation (Gauss)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Batas dihitung dari varians statistik residual ±σ</div>
                </button>

                <button
                  onClick={() => onUpdateConfig({ channelType: 'RAFF_EXTREME' })}
                  className={`p-2.5 rounded-lg border text-left transition ${
                    config.channelType === 'RAFF_EXTREME'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                      : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-xs">Raff Channel (High/Low Extreme)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Batas menyelimuti titik ekstrem tertinggi dan terendah</div>
                </button>
              </div>
            </div>

            {/* Deviation Multiplier */}
            {config.channelType === 'STANDARD_DEV' && (
              <div className="space-y-1.5 p-3 rounded-lg bg-neutral-900 border border-neutral-800 font-mono">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Standard Deviation Multiplier (σ)</span>
                  <span className="font-bold text-amber-400">{config.deviation.toFixed(1)}σ</span>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[1.5, 2.0, 2.5, 3.0].map((dev) => (
                    <button
                      key={dev}
                      onClick={() => onUpdateConfig({ deviation: dev })}
                      className={`py-1 text-xs rounded border transition ${
                        config.deviation === dev
                          ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                          : 'bg-neutral-800 text-slate-300 border-neutral-700 hover:bg-neutral-700'
                      }`}
                    >
                      {dev.toFixed(1)}σ
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Display Switches */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 cursor-pointer">
                <span className="text-slate-300">Gradien Fill Transparan</span>
                <input
                  type="checkbox"
                  checked={config.showFill}
                  onChange={(e) => onUpdateConfig({ showFill: e.target.checked })}
                  className="accent-amber-500 w-4 h-4 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 cursor-pointer">
                <span className="text-slate-300">Garis Inner ±1.0σ Bands</span>
                <input
                  type="checkbox"
                  checked={config.showInnerBands}
                  onChange={(e) => onUpdateConfig({ showInnerBands: e.target.checked })}
                  className="accent-amber-500 w-4 h-4 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 cursor-pointer">
                <span className="text-slate-300">Proyeksi Masa Depan (Forward Rays)</span>
                <input
                  type="checkbox"
                  checked={config.showProjectedFuture}
                  onChange={(e) => onUpdateConfig({ showProjectedFuture: e.target.checked })}
                  className="accent-amber-500 w-4 h-4 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 cursor-pointer">
                <span className="text-slate-300">Label Harga Bloomberg di Axis</span>
                <input
                  type="checkbox"
                  checked={config.showLabels}
                  onChange={(e) => onUpdateConfig({ showLabels: e.target.checked })}
                  className="accent-amber-500 w-4 h-4 rounded"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-[#0f141c] shrink-0 font-mono text-xs">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
