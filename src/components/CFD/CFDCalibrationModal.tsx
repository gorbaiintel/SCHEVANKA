import React, { useState, useEffect } from 'react';
import { TickerData, CFDCalibrationSettings } from '../../types/market';
import { 
  X, 
  Check, 
  Sliders, 
  Zap, 
  RotateCcw, 
  Globe, 
  ShieldCheck, 
  Info,
  DollarSign,
  TrendingUp,
  Radio
} from 'lucide-react';
import { sound } from '../../services/soundService';

interface CFDCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: TickerData;
  onApplyCalibration: (settings: CFDCalibrationSettings) => void;
  currentSettings: CFDCalibrationSettings;
}

const BROKER_PROFILES = [
  {
    id: 'TRADINGVIEW_CFD',
    name: 'TradingView Spot CFD',
    description: 'Standard institutional OTC composite reference rate',
    spread: 0.18,
    defaultOffset: 0,
    badge: 'RECOMMENDED',
  },
  {
    id: 'OANDA_CFD',
    name: 'OANDA Gold CFD',
    description: 'OANDA division XAU/USD CFD quotes',
    spread: 0.20,
    defaultOffset: -0.15,
    badge: 'POPULAR',
  },
  {
    id: 'EXNESS_CFD',
    name: 'Exness Pro CFD',
    description: 'Ultra-low spread retail broker feed',
    spread: 0.16,
    defaultOffset: +0.10,
    badge: 'LOW SPREAD',
  },
  {
    id: 'INTERBANK_RAW',
    name: 'Interbank Raw ECN',
    description: 'Tier-1 liquidity provider zero-markup raw spot',
    spread: 0.12,
    defaultOffset: 0,
    badge: 'RAW ECN',
  },
  {
    id: 'BINANCE_PAXG',
    name: 'Binance PAXG Crypto',
    description: 'Paxos Gold 1:1 allocated physical gold token',
    spread: 0.35,
    defaultOffset: +1.50,
    badge: 'CRYPTO GOLD',
  },
  {
    id: 'CUSTOM',
    name: 'Custom Broker Alignment',
    description: 'Manually align to your exact MetaTrader/TradingView broker rate',
    spread: 0.18,
    defaultOffset: 0,
    badge: 'CUSTOM',
  },
];

export const CFDCalibrationModal: React.FC<CFDCalibrationModalProps> = ({
  isOpen,
  onClose,
  ticker,
  onApplyCalibration,
  currentSettings,
}) => {
  const [selectedProfile, setSelectedProfile] = useState<string>(currentSettings.brokerProfile || 'TRADINGVIEW_CFD');
  const [priceOffset, setPriceOffset] = useState<number>(currentSettings.priceOffset || 0);
  const [spread, setSpread] = useState<number>(currentSettings.spread || 0.18);
  const [targetBrokerPriceInput, setTargetBrokerPriceInput] = useState<string>('');

  useEffect(() => {
    setSelectedProfile(currentSettings.brokerProfile || 'TRADINGVIEW_CFD');
    setPriceOffset(currentSettings.priceOffset || 0);
    setSpread(currentSettings.spread || 0.18);
  }, [currentSettings]);

  if (!isOpen) return null;

  // Uncalibrated raw base price
  const baseRawPrice = ticker.price - (currentSettings.priceOffset || 0);
  const calibratedLivePrice = +(baseRawPrice + priceOffset).toFixed(2);
  const calibratedBid = +(calibratedLivePrice - spread / 2).toFixed(2);
  const calibratedAsk = +(calibratedLivePrice + spread / 2).toFixed(2);

  const handleSelectProfile = (p: typeof BROKER_PROFILES[0]) => {
    setSelectedProfile(p.id);
    setSpread(p.spread);
    if (p.id !== 'CUSTOM') {
      setPriceOffset(p.defaultOffset);
    }
  };

  const handleApplyTargetPrice = () => {
    const target = parseFloat(targetBrokerPriceInput);
    if (!isNaN(target) && target > 1000) {
      const calculatedOffset = +(target - baseRawPrice).toFixed(2);
      setPriceOffset(calculatedOffset);
      setSelectedProfile('CUSTOM');
      sound.playNodeTrigger();
    }
  };

  const handleStepOffset = (delta: number) => {
    setPriceOffset((prev) => +(prev + delta).toFixed(2));
    setSelectedProfile('CUSTOM');
  };

  const handleResetOffset = () => {
    setPriceOffset(0);
    setSpread(0.18);
    setSelectedProfile('TRADINGVIEW_CFD');
    setTargetBrokerPriceInput('');
  };

  const handleSave = () => {
    sound.playOrderExecuted();
    onApplyCalibration({
      brokerProfile: selectedProfile,
      priceOffset: +priceOffset.toFixed(2),
      spread: +spread.toFixed(2),
      baseReferencePrice: calibratedLivePrice,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-[#0b0e14] border border-neutral-700/90 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden text-xs flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-[#0f141c]/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 tracking-tight">
                  Real-Time CFD Price & Broker Calibration
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold">
                  Zero Discrepancy
                </span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Synchronize SCHEVANKA TERMINAL with your exact MetaTrader 4/5, TradingView, or Prop Firm CFD feed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Why prices differ info notice */}
          <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl flex items-start gap-2.5 text-[11px] leading-relaxed text-slate-300">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-100">Why do gold spot CFD prices differ between platforms?</strong>
              <p className="mt-0.5 text-slate-400">
                Gold (XAU/USD) is a decentralized OTC (Over-The-Counter) interbank market. Each broker (OANDA, Pepperstone, Exness, XM, FTMO) connects to different liquidity providers (JPMorgan, UBS, Citadel), which typically quote small spread or pricing variances ($0.10 - $1.50). This calibration tool synchronizes your terminal tick-for-tick with your chosen broker.
              </p>
            </div>
          </div>

          {/* Live Calibrated Quote Preview Box */}
          <div className="p-4 bg-[#0f141c] border border-neutral-800 rounded-xl shadow-inner font-mono">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Calibrated Live CFD Gold Quote:</span>
              </span>
              <span className="text-amber-400">
                Active Offset: <strong className="text-slate-100">{priceOffset >= 0 ? `+${priceOffset.toFixed(2)}` : priceOffset.toFixed(2)} USD</strong>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-neutral-950/80 rounded-lg border border-neutral-800/80">
                <span className="text-[10px] text-slate-500 block uppercase">Calibrated Bid</span>
                <span className="text-lg font-bold text-emerald-400">${calibratedBid.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-neutral-950/80 rounded-lg border border-amber-500/40">
                <span className="text-[10px] text-slate-500 block uppercase">Spot Mid Price</span>
                <span className="text-lg font-bold text-amber-400">${calibratedLivePrice.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-neutral-950/80 rounded-lg border border-neutral-800/80">
                <span className="text-[10px] text-slate-500 block uppercase">Calibrated Ask</span>
                <span className="text-lg font-bold text-rose-400">${calibratedAsk.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>CFD Broker Spread: <strong className="text-emerald-400">{(spread * 100).toFixed(0)}¢ (${spread.toFixed(2)})</strong></span>
              <span>Symbol: <strong className="text-slate-200">XAU/USD · Spot CFD</strong></span>
            </div>
          </div>

          {/* Quick Direct Price Input: Enter your broker's exact quote */}
          <div className="p-3.5 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-2">
            <span className="font-semibold text-slate-200 block text-xs">
              Quick 1-Click Align: Enter your broker's current gold price
            </span>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder={`e.g. ${calibratedLivePrice.toFixed(2)}`}
                  value={targetBrokerPriceInput}
                  onChange={(e) => setTargetBrokerPriceInput(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700/80 rounded-lg pl-7 pr-3 py-1.5 text-slate-100 font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
              <button
                onClick={handleApplyTargetPrice}
                disabled={!targetBrokerPriceInput}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold rounded-lg transition-colors font-sans whitespace-nowrap shadow-sm"
              >
                Sync to this Price
              </button>
            </div>
          </div>

          {/* Fine Tuning Steppers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">Manual Price Offset Stepper:</span>
              <span className="font-mono text-slate-400">
                Offset: <strong className="text-amber-400 font-bold">{priceOffset >= 0 ? `+${priceOffset.toFixed(2)}` : priceOffset.toFixed(2)}</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
              <button
                onClick={() => handleStepOffset(-1.0)}
                className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-rose-400 font-semibold"
              >
                -$1.00
              </button>
              <button
                onClick={() => handleStepOffset(-0.50)}
                className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-rose-400 font-semibold"
              >
                -$0.50
              </button>
              <button
                onClick={() => handleStepOffset(-0.10)}
                className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-rose-400 font-semibold"
              >
                -$0.10
              </button>
              <button
                onClick={handleResetOffset}
                className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-slate-400 font-semibold flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>0.00</span>
              </button>
              <button
                onClick={() => handleStepOffset(0.10)}
                className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-emerald-400 font-semibold"
              >
                +$0.10
              </button>
              <button
                onClick={() => handleStepOffset(0.50)}
                className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-emerald-400 font-semibold"
              >
                +$0.50
              </button>
              <button
                onClick={() => handleStepOffset(1.0)}
                className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-emerald-400 font-semibold"
              >
                +$1.00
              </button>
            </div>
          </div>

          {/* Broker Profiles Grid */}
          <div className="space-y-2">
            <span className="font-semibold text-slate-200 block text-xs">
              Select Broker CFD Profile:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BROKER_PROFILES.map((p) => {
                const isSelected = selectedProfile === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProfile(p)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-sm shadow-amber-500/10'
                        : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-100 text-xs">{p.name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-neutral-800 text-slate-300">
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[10px] leading-snug mb-1.5">{p.description}</p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-neutral-800/60">
                      <span>Spread: <strong className="text-emerald-400">{(p.spread * 100).toFixed(0)}¢</strong></span>
                      {isSelected && (
                        <span className="text-amber-400 font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spread Slider */}
          <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-slate-300 font-sans font-medium">CFD Spread Calibration:</span>
              <span className="text-emerald-400 font-bold">{(spread * 100).toFixed(0)} pips / ${(spread).toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.50"
              step="0.01"
              value={spread}
              onChange={(e) => setSpread(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>0.10 (Raw ECN)</span>
              <span>0.20 (Standard CFD)</span>
              <span>0.50 (High Volatility)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-[#0f141c]/90">
          <button
            onClick={handleResetOffset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-slate-200 transition-colors font-mono text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors font-sans"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md active:scale-95 font-sans"
            >
              <Check className="w-4 h-4" />
              <span>Apply & Synchronize Feeds</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
