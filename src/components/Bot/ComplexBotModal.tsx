import React, { useState, useEffect } from 'react';
import { 
  BotStrategyType, 
  BotRiskProfile, 
  BotParameters, 
  BotTelemetry, 
  BotLog 
} from '../../types/bot';
import { 
  complexBotEngine, 
  STRATEGY_CATALOG, 
  DEFAULT_BOT_PARAMETERS 
} from '../../services/complexBotEngine';
import { sound } from '../../services/soundService';
import { 
  X, 
  Cpu, 
  Zap, 
  Power, 
  Sliders, 
  Terminal, 
  TrendingUp, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';

interface ComplexBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrice: number;
  onManualTriggerTestTrade?: () => void;
}

export const ComplexBotModal: React.FC<ComplexBotModalProps> = ({
  isOpen,
  onClose,
  currentPrice,
  onManualTriggerTestTrade,
}) => {
  const [isArmed, setIsArmed] = useState<boolean>(complexBotEngine.getIsArmed());
  const [activeStrategy, setActiveStrategy] = useState<BotStrategyType>(complexBotEngine.getStrategy());
  const [activeRisk, setActiveRisk] = useState<BotRiskProfile>(complexBotEngine.getRiskProfile());
  const [params, setParams] = useState<BotParameters>(complexBotEngine.getParameters());
  const [telemetry, setTelemetry] = useState<BotTelemetry>(complexBotEngine.getTelemetry());
  const [logs, setLogs] = useState<BotLog[]>(complexBotEngine.getLogs());
  const [activeTab, setActiveTab] = useState<'STRATEGIES' | 'PARAMETERS' | 'TELEMETRY' | 'TERMINAL_LOG'>('STRATEGIES');

  // Subscribe to engine state
  useEffect(() => {
    const unsubscribe = complexBotEngine.subscribe(() => {
      setIsArmed(complexBotEngine.getIsArmed());
      setActiveStrategy(complexBotEngine.getStrategy());
      setActiveRisk(complexBotEngine.getRiskProfile());
      setParams(complexBotEngine.getParameters());
      setTelemetry(complexBotEngine.getTelemetry());
      setLogs([...complexBotEngine.getLogs()]);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const handleToggleArm = () => {
    const nextState = !isArmed;
    complexBotEngine.setArmed(nextState);
  };

  const handleSelectStrategy = (stratId: BotStrategyType) => {
    setActiveStrategy(stratId);
    complexBotEngine.setStrategy(stratId);
    sound.playNodeTrigger();
  };

  const handleSelectRiskProfile = (profile: BotRiskProfile) => {
    setActiveRisk(profile);
    complexBotEngine.setRiskProfile(profile);
    setParams(complexBotEngine.getParameters());
    sound.playNodeTrigger();
  };

  const handleParamChange = <K extends keyof BotParameters>(key: K, value: BotParameters[K]) => {
    const updated = { ...params, [key]: value };
    setParams(updated);
    complexBotEngine.updateParameters({ [key]: value });
  };

  const handleTestSignal = () => {
    sound.playOrderExecuted();
    complexBotEngine.addLog(
      'SIGNAL',
      `[SIMULATION TEST] Sinyal ${activeStrategy} terverifikasi @ $${currentPrice.toFixed(2)} (Delta Z: +2.1, Confidence: 91%)`
    );
    if (onManualTriggerTestTrade) {
      onManualTriggerTestTrade();
    }
  };

  const currentStrategyMeta = STRATEGY_CATALOG.find((s) => s.id === activeStrategy) || STRATEGY_CATALOG[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-[#0b0e14] border border-neutral-700/80 rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] max-h-[850px] flex flex-col overflow-hidden text-xs text-slate-200">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-neutral-800 bg-[#0f141c]/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border transition-all ${
              isArmed 
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/20' 
                : 'bg-neutral-800 border-neutral-700 text-slate-400'
            }`}>
              <Cpu className={`w-5 h-5 ${isArmed ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
                  <span>AURA QUANT BOT ENGINE</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                    v4.8 INSTITUTIONAL
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isArmed ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                <span className={isArmed ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                  {isArmed ? `LIVE ALGO ACTIVE [${activeStrategy}]` : 'STANDBY / DISARMED'}
                </span>
                <span>• Spot: ${currentPrice.toFixed(2)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Master Arm Toggle Button */}
            <button
              onClick={handleToggleArm}
              className={`px-3.5 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                isArmed
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20 border border-rose-400/50'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20 border border-emerald-400/50'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{isArmed ? 'DISARM BOT (STOP)' : '⚡ ARM ALGO BOT'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub Header Navigation Tabs */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2 border-b border-neutral-800 bg-[#0d121a] shrink-0 overflow-x-auto gap-2">
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setActiveTab('STRATEGIES')}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'STRATEGIES'
                  ? 'bg-neutral-800 text-amber-300 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Model Strategi ({STRATEGY_CATALOG.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('PARAMETERS')}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'PARAMETERS'
                  ? 'bg-neutral-800 text-amber-300 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Parameter & Risiko</span>
            </button>

            <button
              onClick={() => setActiveTab('TELEMETRY')}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'TELEMETRY'
                  ? 'bg-neutral-800 text-amber-300 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Telemetri & Radar</span>
            </button>

            <button
              onClick={() => setActiveTab('TERMINAL_LOG')}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'TERMINAL_LOG'
                  ? 'bg-neutral-800 text-amber-300 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Terminal Log ({logs.length})</span>
            </button>
          </div>

          {/* Quick Risk Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 font-mono uppercase mr-1">Profil:</span>
            {(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE', 'CUSTOM'] as BotRiskProfile[]).map((prof) => (
              <button
                key={prof}
                onClick={() => handleSelectRiskProfile(prof)}
                className={`px-2 py-1 rounded text-[10px] font-mono transition cursor-pointer border ${
                  activeRisk === prof
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                    : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {prof}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body Panels */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0b0e14]">
          {activeTab === 'STRATEGIES' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Katalog Model Strategi Kuantitatif</h3>
                  <p className="text-[11px] text-slate-400">Pilih algoritma eksekusi spesifik untuk pasar Gold XAU/USD</p>
                </div>
                <div className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Historical Win Rate: {currentStrategyMeta.winRateHistorical}%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {STRATEGY_CATALOG.map((strat) => {
                  const isSelected = activeStrategy === strat.id;
                  return (
                    <div
                      key={strat.id}
                      onClick={() => handleSelectStrategy(strat.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-gradient-to-br from-neutral-900 to-neutral-950 border-amber-500 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/30'
                          : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                              <span>{strat.name}</span>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              )}
                            </div>
                            <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                              {strat.tagline}
                            </div>
                          </div>
                        </div>

                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          {strat.description}
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-neutral-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <div>
                          Kondisi Ideal: <span className="text-slate-200 font-medium">{strat.bestMarketCondition}</span>
                        </div>
                        <div className="flex items-center gap-2 font-bold">
                          <span className="text-emerald-400">WR: {strat.winRateHistorical}%</span>
                          <span className="text-cyan-400">PF: {strat.profitFactorHistorical}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Strategy Details Box */}
              <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Strategi Terpilih Saat Ini: {currentStrategyMeta.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Expected Risk/Reward: <span className="text-emerald-400 font-mono font-bold">{currentStrategyMeta.expectedRtoR}</span> • Auto Stop-Loss & Take-Profit diatur dinamis via ATR.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTestSignal}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-slate-200 font-mono text-[11px] transition cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 text-emerald-400" />
                  <span>Uji Coba Sinyal Sekarang</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'PARAMETERS' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Parameter Kustom & Manajemen Risiko</h3>
                  <p className="text-[11px] text-slate-400">Sesuaikan ukuran lot, jarak trailing stop, batasan drawdown harian, dan filter spread</p>
                </div>
                <button
                  onClick={() => handleSelectRiskProfile('MODERATE')}
                  className="px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 text-slate-400 hover:text-slate-200 font-mono text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Default</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Lot Size */}
                <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-medium">Ukuran Lot Dasar</label>
                    <span className="text-amber-400 font-mono font-bold">{params.lotSize} Lot</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="1.0"
                    step="0.01"
                    value={params.lotSize}
                    onChange={(e) => handleParamChange('lotSize', parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="text-[10px] text-slate-500 flex justify-between font-mono">
                    <span>0.01 (Micro)</span>
                    <span>1.00 (Standard)</span>
                  </div>
                </div>

                {/* Take Profit */}
                <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-medium">Take Profit Target</label>
                    <span className="text-emerald-400 font-mono font-bold">{params.takeProfitPips} Pips</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={params.takeProfitPips}
                    onChange={(e) => handleParamChange('takeProfitPips', parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="text-[10px] text-slate-500 flex justify-between font-mono">
                    <span>10 pips ($1.00)</span>
                    <span>100 pips ($10.00)</span>
                  </div>
                </div>

                {/* Stop Loss */}
                <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-medium">Stop Loss Proteksi</label>
                    <span className="text-rose-400 font-mono font-bold">{params.stopLossPips} Pips</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={params.stopLossPips}
                    onChange={(e) => handleParamChange('stopLossPips', parseInt(e.target.value, 10))}
                    className="w-full accent-rose-500"
                  />
                  <div className="text-[10px] text-slate-500 flex justify-between font-mono">
                    <span>5 pips ($0.50)</span>
                    <span>50 pips ($5.00)</span>
                  </div>
                </div>

                {/* Trailing Stop */}
                <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-medium">Trailing Stop Step</label>
                    <span className="text-cyan-400 font-mono font-bold">{params.trailingStopPips} Pips</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={params.trailingStopPips}
                    onChange={(e) => handleParamChange('trailingStopPips', parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-500"
                  />
                  <div className="text-[10px] text-slate-500 font-mono">
                    Kunci profit dinamis saat harga bergerak searah.
                  </div>
                </div>

                {/* Auto Break Even */}
                <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-medium">Trigger Auto Break-Even</label>
                    <span className="text-amber-400 font-mono font-bold">+{params.breakEvenTriggerPips} Pips</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="25"
                    step="1"
                    value={params.breakEvenTriggerPips}
                    onChange={(e) => handleParamChange('breakEvenTriggerPips', parseInt(e.target.value, 10))}
                    className="w-full accent-amber-500"
                  />
                  <div className="text-[10px] text-slate-500 font-mono">
                    Pindahkan SL ke Entry saat running profit.
                  </div>
                </div>

                {/* Max Open Trades */}
                <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-medium">Batas Maksimal Posisi Terbuka</label>
                    <span className="text-slate-200 font-mono font-bold">{params.maxOpenTrades} Posisi</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={params.maxOpenTrades}
                    onChange={(e) => handleParamChange('maxOpenTrades', parseInt(e.target.value, 10))}
                    className="w-full accent-slate-400"
                  />
                  <div className="text-[10px] text-slate-500 font-mono">
                    Cegah over-exposure di kondisi fluktuasi liar.
                  </div>
                </div>
              </div>

              {/* Switches & Filters */}
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.allowBuy}
                    onChange={(e) => handleParamChange('allowBuy', e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-neutral-950 border-neutral-700"
                  />
                  <div>
                    <div className="font-semibold text-slate-200">Izinkan Posisi BUY</div>
                    <div className="text-[10px] text-slate-500">Eksekusi sinyal beli saat momentum bullish</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.allowSell}
                    onChange={(e) => handleParamChange('allowSell', e.target.checked)}
                    className="w-4 h-4 rounded text-rose-500 focus:ring-0 bg-neutral-950 border-neutral-700"
                  />
                  <div>
                    <div className="font-semibold text-slate-200">Izinkan Posisi SELL</div>
                    <div className="text-[10px] text-slate-500">Eksekusi sinyal jual saat momentum bearish</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.newsFilter}
                    onChange={(e) => handleParamChange('newsFilter', e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-neutral-950 border-neutral-700"
                  />
                  <div>
                    <div className="font-semibold text-slate-200">Filter Berita High Impact</div>
                    <div className="text-[10px] text-slate-500">Jeda bot 5 menit sebelum & sesudah CPI/FOMC</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'TELEMETRY' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Live Telemetri Kuantitatif & Radar Sinyal</h3>
                  <p className="text-[11px] text-slate-400">Monitoring real-time matriks matematika & status pasar aktif</p>
                </div>
                <div className="text-[11px] font-mono text-cyan-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  <span>Tick Engine: 100% Synchronized</span>
                </div>
              </div>

              {/* Status Big Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[10px] text-slate-500">MARKET REGIME</span>
                  <div className="text-sm font-bold text-amber-400 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>{telemetry.currentRegime.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[10px] text-slate-500">DELTA VOLUME Z-SCORE</span>
                  <div className={`text-base font-bold mt-1 ${
                    telemetry.deltaZScore >= 1.5 ? 'text-emerald-400' : telemetry.deltaZScore <= -1.5 ? 'text-rose-400' : 'text-slate-200'
                  }`}>
                    {telemetry.deltaZScore > 0 ? '+' : ''}{telemetry.deltaZScore} σ
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[10px] text-slate-500">ATR 14 VOLATILITAS</span>
                  <div className="text-base font-bold text-cyan-400 mt-1">
                    ${telemetry.atr14.toFixed(2)} USD
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[10px] text-slate-500">RSI 14 MOMENTUM</span>
                  <div className="text-base font-bold text-slate-200 mt-1">
                    {telemetry.rsi14}
                  </div>
                </div>
              </div>

              {/* Signal Confidence Gauge */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    <span>Composite Signal Score (-100 Strong Bearish to +100 Strong Bullish):</span>
                  </span>
                  <span className={`text-sm font-bold ${
                    telemetry.signalScore > 20 ? 'text-emerald-400' : telemetry.signalScore < -20 ? 'text-rose-400' : 'text-slate-300'
                  }`}>
                    {telemetry.signalScore > 0 ? '+' : ''}{telemetry.signalScore} / 100
                  </span>
                </div>

                {/* Progress Meter Bar */}
                <div className="h-3 w-full bg-neutral-950 rounded-full border border-neutral-800 overflow-hidden relative flex">
                  {/* Bearish side */}
                  <div className="w-1/2 h-full bg-neutral-900 relative">
                    {telemetry.signalScore < 0 && (
                      <div 
                        className="h-full bg-rose-500 transition-all duration-300 absolute right-0"
                        style={{ width: `${Math.min(100, Math.abs(telemetry.signalScore))}%` }}
                      />
                    )}
                  </div>
                  {/* Bullish side */}
                  <div className="w-1/2 h-full bg-neutral-900 relative border-l border-neutral-700">
                    {telemetry.signalScore > 0 && (
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-300 absolute left-0"
                        style={{ width: `${Math.min(100, telemetry.signalScore)}%` }}
                      />
                    )}
                  </div>
                </div>

                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>-100 (Max Sell Pressure)</span>
                  <span>0 (Net Neutral Equilibrium)</span>
                  <span>+100 (Max Buy Breakout)</span>
                </div>
              </div>

              {/* Historical Performance Stats */}
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2 font-mono text-[11px]">
                <div className="text-xs font-bold text-slate-200">STATISTIK PERFORMA BOT REAL-TIME</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-400">
                  <div>
                    Total Profit Bot: <span className="text-emerald-400 font-bold">+${telemetry.totalProfitUsd.toFixed(2)} USD</span>
                  </div>
                  <div>
                    Win Rate Terverifikasi: <span className="text-emerald-400 font-bold">{telemetry.winRate}%</span>
                  </div>
                  <div>
                    Total Eksekusi: <span className="text-slate-200 font-bold">{telemetry.tradesExecuted} Trade</span>
                  </div>
                  <div>
                    Max Drawdown: <span className="text-amber-400 font-bold">{telemetry.maxDrawdownRecorded}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'TERMINAL_LOG' && (
            <div className="space-y-3 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>Live Algorithmic Execution Terminal</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Log jejak pemindaian, konfirmasi Z-Score, dan eksekusi order</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => complexBotEngine.clearLogs()}
                    className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-slate-400 hover:text-slate-200 font-mono text-[10px] cursor-pointer"
                  >
                    Clear Logs
                  </button>
                  <button
                    onClick={handleTestSignal}
                    className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    <span>Uji Eksekusi</span>
                  </button>
                </div>
              </div>

              {/* Monospace Log Viewer */}
              <div className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl p-3 font-mono text-[11px] overflow-y-auto space-y-1.5 max-h-[420px] select-text">
                {logs.length === 0 ? (
                  <div className="text-slate-600 text-center py-10">Belum ada riwayat log eksekusi.</div>
                ) : (
                  logs.map((log) => {
                    const timeStr = new Date(log.timestamp).toLocaleTimeString();
                    return (
                      <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-slate-600 shrink-0">[{timeStr}]</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                          log.level === 'EXEC'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : log.level === 'PROFIT'
                            ? 'bg-emerald-500/30 text-emerald-300'
                            : log.level === 'SIGNAL'
                            ? 'bg-amber-500/20 text-amber-300'
                            : log.level === 'RISK' || log.level === 'WARN'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-neutral-800 text-slate-400'
                        }`}>
                          {log.level}
                        </span>
                        <span className={`break-all ${
                          log.level === 'EXEC' 
                            ? 'text-emerald-300 font-semibold' 
                            : log.level === 'PROFIT'
                            ? 'text-emerald-400 font-bold'
                            : log.level === 'RISK'
                            ? 'text-rose-400'
                            : 'text-slate-300'
                        }`}>
                          {log.message}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="px-4 sm:px-6 py-3 border-t border-neutral-800 bg-[#0f141c] flex items-center justify-between shrink-0 font-mono text-[11px]">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Mode Eksekusi: <span className="text-slate-200 font-bold">Client Spot Gateway (Direct Fix / Webhook)</span></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-slate-300 border border-neutral-800 transition cursor-pointer font-medium"
            >
              Tutup
            </button>
            <button
              onClick={() => {
                sound.playNotification();
                onClose();
              }}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Simpan & Aktifkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
