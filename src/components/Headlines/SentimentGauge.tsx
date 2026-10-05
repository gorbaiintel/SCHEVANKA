import React from 'react';
import { Gauge, Zap, Flame, AlertCircle } from 'lucide-react';

interface SentimentGaugeProps {
  score?: number; // Score from -100 (Max Bearish) to +100 (Max Bullish), or 0 to 100
  sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  impact?: 'HIGH' | 'MEDIUM' | 'LOW';
  impactScore?: number; // 0 to 100
  estimatedPips?: string;
  variant?: 'card' | 'compact' | 'header';
  showDetails?: boolean;
}

export const SentimentGauge: React.FC<SentimentGaugeProps> = ({
  score: rawScore,
  sentiment = 'NEUTRAL',
  impact = 'MEDIUM',
  impactScore: rawImpactScore,
  estimatedPips: rawEstimatedPips,
  variant = 'card',
  showDetails = true,
}) => {
  // Normalize raw score to -100 to +100
  let score = 0;
  if (rawScore !== undefined && rawScore !== null) {
    if (rawScore >= 0 && rawScore <= 100 && (sentiment === 'BEARISH' || rawScore < 45)) {
      // If provided on 0 to 100 scale where 50 is neutral
      score = Math.round((rawScore - 50) * 2);
    } else {
      score = Math.max(-100, Math.min(100, Math.round(rawScore)));
    }
  } else {
    // Fallback derivation based on sentiment & impact
    if (sentiment === 'BULLISH') {
      score = impact === 'HIGH' ? 88 : impact === 'MEDIUM' ? 68 : 42;
    } else if (sentiment === 'BEARISH') {
      score = impact === 'HIGH' ? -88 : impact === 'MEDIUM' ? -68 : -42;
    } else {
      score = 0;
    }
  }

  // Derive impact score (0 - 100)
  const impactScore = rawImpactScore ?? (impact === 'HIGH' ? 88 : impact === 'MEDIUM' ? 56 : 28);

  // Derive estimated pips
  const estimatedPips = rawEstimatedPips ?? (
    impact === 'HIGH' ? '±90-160 pips' : impact === 'MEDIUM' ? '±40-75 pips' : '±15-30 pips'
  );

  // Convert -100..+100 score to 0..100 percentage for the needle (0 = max bearish left, 100 = max bullish right)
  const percentage = Math.max(0, Math.min(100, (score + 100) / 2));
  
  // Angle for semi-circular needle: 180deg (left/bearish) to 0deg (right/bullish)
  // angle in radians: PI to 0
  const needleAngleDeg = 180 - (percentage / 100) * 180;
  const needleRad = (needleAngleDeg * Math.PI) / 180;

  // Center coordinate for SVG arc
  const cx = 50;
  const cy = 46;
  const r = 36;

  // Needle tip
  const needleLen = 30;
  const nx = cx + needleLen * Math.cos(needleRad);
  const ny = cy - needleLen * Math.sin(needleRad);

  // Theme color for score
  const isBullish = score > 15;
  const isBearish = score < -15;
  const isNeutral = !isBullish && !isBearish;

  const scoreColor = isBullish 
    ? 'text-emerald-400' 
    : isBearish 
    ? 'text-rose-400' 
    : 'text-amber-400';

  const scoreBorderColor = isBullish
    ? 'border-emerald-500/40 bg-emerald-500/10'
    : isBearish
    ? 'border-rose-500/40 bg-rose-500/10'
    : 'border-amber-500/40 bg-amber-500/10';

  const needleColor = isBullish ? '#34d399' : isBearish ? '#f43f5e' : '#f59e0b';

  // Sentiment category text
  const sentimentLabel = score >= 60 
    ? 'STRONG BUY' 
    : score >= 20 
    ? 'MODERATE BUY' 
    : score <= -60 
    ? 'STRONG SELL' 
    : score <= -20 
    ? 'MODERATE SELL' 
    : 'NEUTRAL DRIFT';

  if (variant === 'header') {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-3 p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800/90 shadow-md">
        {/* Semi-Circle Speedometer Gauge */}
        <div className="relative w-36 h-22 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 100 56" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="gaugeGradientHeader" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="25%" stopColor="#fb7185" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="75%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <filter id="needleGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor={needleColor} floodOpacity="0.8" />
              </filter>
            </defs>

            {/* Gauge Background Track */}
            <path
              d="M 12 46 A 38 38 0 0 1 88 46"
              fill="none"
              stroke="#1e293b"
              strokeWidth="7"
              strokeLinecap="round"
            />

            {/* Colored Segment Arc */}
            <path
              d="M 12 46 A 38 38 0 0 1 88 46"
              fill="none"
              stroke="url(#gaugeGradientHeader)"
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.9"
            />

            {/* Tick Markers */}
            <line x1="12" y1="46" x2="16" y2="46" stroke="#f43f5e" strokeWidth="1.5" />
            <line x1="50" y1="8" x2="50" y2="12" stroke="#f59e0b" strokeWidth="1.5" />
            <line x1="84" y1="46" x2="88" y2="46" stroke="#10b981" strokeWidth="1.5" />

            {/* Pointer Needle */}
            <line
              x1={cx}
              y1={cy}
              x2={nx}
              y2={ny}
              stroke={needleColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#needleGlow)"
              className="transition-all duration-700 ease-out"
            />

            {/* Center Pivot Hub */}
            <circle cx={cx} cy={cy} r="4.5" fill="#0f172a" stroke={needleColor} strokeWidth="2" />
            <circle cx={cx} cy={cy} r="1.5" fill="#f8fafc" />

            {/* Labels */}
            <text x="10" y="54" fill="#f43f5e" fontSize="6" fontWeight="bold" fontFamily="monospace">BEAR</text>
            <text x="50" y="54" fill="#94a3b8" fontSize="6" textAnchor="middle" fontFamily="monospace">0</text>
            <text x="90" y="54" fill="#10b981" fontSize="6" textAnchor="end" fontWeight="bold" fontFamily="monospace">BULL</text>
          </svg>
        </div>

        {/* Gauge Metrics Summary */}
        <div className="flex-1 space-y-1 font-mono text-xs w-full">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-sans">Market Bias & Sentiment:</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${scoreBorderColor} ${scoreColor}`}>
              {score > 0 ? `+${score}` : score} / 100 • {sentimentLabel}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span className="text-slate-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Volatility Potential:</span>
            </span>
            <span className="text-amber-300 font-semibold">{estimatedPips}</span>
          </div>

          {/* Impact Energy Bar */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-slate-400">Impact Meter:</span>
            <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden flex">
              <div 
                className={`h-full transition-all duration-500 ${
                  impact === 'HIGH' ? 'bg-amber-400' : impact === 'MEDIUM' ? 'bg-cyan-400' : 'bg-slate-500'
                }`}
                style={{ width: `${impactScore}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-amber-400">{impact}</span>
          </div>
        </div>
      </div>
    );
  }

  // Card Variant: Sleek Mini Gauge Component inside Headline Cards
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 transition-colors">
      {/* Left: Mini SVG Gauge with Needle */}
      <div className="flex items-center gap-2.5">
        <div className="relative w-20 h-12 shrink-0">
          <svg viewBox="0 0 100 56" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id={`gaugeGrad-${score}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>

            {/* Background Arch */}
            <path
              d="M 14 46 A 36 36 0 0 1 86 46"
              fill="none"
              stroke="#262626"
              strokeWidth="6"
              strokeLinecap="round"
            />

            {/* Colored Arch Track */}
            <path
              d="M 14 46 A 36 36 0 0 1 86 46"
              fill="none"
              stroke={`url(#gaugeGrad-${score})`}
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.85"
            />

            {/* Needle */}
            <line
              x1={cx}
              y1={cy}
              x2={nx}
              y2={ny}
              stroke={needleColor}
              strokeWidth="2.2"
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />

            {/* Center Pivot Hub */}
            <circle cx={cx} cy={cy} r="3.5" fill="#171717" stroke={needleColor} strokeWidth="1.5" />

            {/* Range markers */}
            <text x="12" y="55" fill="#f43f5e" fontSize="7" fontWeight="bold" fontFamily="monospace">-</text>
            <text x="88" y="55" fill="#10b981" fontSize="7" fontWeight="bold" fontFamily="monospace" textAnchor="end">+</text>
          </svg>
        </div>

        {/* Score & Sentiment Tag */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-mono">Sentiment Score:</span>
            <span className={`text-[12px] font-mono font-bold px-1.5 py-0.2 rounded border ${scoreBorderColor} ${scoreColor}`}>
              {score > 0 ? `+${score}` : score}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono font-semibold text-slate-300">
            <span className={`w-1.5 h-1.5 rounded-full ${isBullish ? 'bg-emerald-400' : isBearish ? 'bg-rose-500' : 'bg-amber-400'}`} />
            <span>{sentimentLabel}</span>
          </div>
        </div>
      </div>

      {/* Right: Market Impact Visualization & Volatility Range */}
      {showDetails && (
        <div className="flex items-center gap-3 sm:border-l sm:border-neutral-800/80 sm:pl-3 font-mono text-[10px]">
          {/* Volatility Estimate */}
          <div className="flex flex-col">
            <span className="text-slate-400 text-[9px] uppercase tracking-wider">Est. Pip Range</span>
            <span className="text-amber-300 font-bold flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5 text-amber-400" />
              <span>{estimatedPips}</span>
            </span>
          </div>

          {/* Impact Gauge Level with Energy Bars */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-slate-400 text-[9px] uppercase tracking-wider">
              <span>Impact</span>
              <span className={`font-bold ${
                impact === 'HIGH' ? 'text-amber-400' : impact === 'MEDIUM' ? 'text-cyan-400' : 'text-slate-400'
              }`}>
                {impact}
              </span>
            </div>
            
            {/* 3 Energy Bars */}
            <div className="flex items-center gap-0.5 mt-0.5" title={`Market Impact: ${impact} (${impactScore}%)`}>
              <span className={`w-3 h-1.5 rounded-xs ${
                impactScore >= 20 ? (impact === 'HIGH' ? 'bg-amber-400' : impact === 'MEDIUM' ? 'bg-cyan-400' : 'bg-slate-400') : 'bg-neutral-800'
              }`} />
              <span className={`w-3 h-1.5 rounded-xs ${
                impactScore >= 50 ? (impact === 'HIGH' ? 'bg-amber-400' : 'bg-cyan-400') : 'bg-neutral-800'
              }`} />
              <span className={`w-3 h-1.5 rounded-xs ${
                impactScore >= 80 ? 'bg-amber-400 animate-pulse' : 'bg-neutral-800'
              }`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
