import { Candle } from '../types/market';

export interface BloombergChannelPoint {
  index: number;
  time: number;
  midline: number;
  upperBand: number;
  lowerBand: number;
  upperInnerBand?: number; // +1.0σ
  lowerInnerBand?: number; // -1.0σ
}

export type ChannelRegime = 'BULLISH_ASCENDING' | 'BEARISH_DESCENDING' | 'HORIZONTAL_RANGE';
export type ChannelSignal = 'OVERBOUGHT_RESISTANCE' | 'OVERSOLD_SUPPORT' | 'MIDLINE_EQUILIBRIUM' | 'NEUTRAL_FLOW';

export interface BloombergChannelConfig {
  lookback: number; // Number of bars to fit channel (default 40, range 15 - 120)
  autoLookback: boolean; // Auto-detect best swing cycle length (default true)
  deviation: number; // Standard deviation multiplier (default 2.0)
  projectionBars: number; // Bars projected into the future (default 12)
  channelType: 'STANDARD_DEV' | 'RAFF_EXTREME' | 'ATR_VOLATILITY';
  showFill: boolean;
  showInnerBands: boolean; // Show ±1.0σ bands
  showLabels: boolean;
  showProjectedFuture: boolean;
}

export const DEFAULT_BLOOMBERG_CHANNEL_CONFIG: BloombergChannelConfig = {
  lookback: 45,
  autoLookback: true,
  deviation: 2.0,
  projectionBars: 12,
  channelType: 'STANDARD_DEV',
  showFill: true,
  showInnerBands: true,
  showLabels: true,
  showProjectedFuture: true,
};

export interface BloombergChannelResult {
  isValid: boolean;
  regime: ChannelRegime;
  signal: ChannelSignal;
  slope: number; // $ per bar
  slopeAngleDeg: number; // -90 to +90 degrees visual inclination
  rSquared: number; // 0 to 1 (Trend goodness of fit)
  standardError: number;
  currentMidline: number;
  currentUpper: number;
  currentLower: number;
  currentUpperInner: number;
  currentLowerInner: number;
  channelWidth: number; // in $ (e.g. $18.40)
  targetPrice: number; // Projected mean reversion or breakout target
  priceZScore: number; // Number of standard deviations from midline
  points: BloombergChannelPoint[]; // Historical points across lookback
  futurePoints: BloombergChannelPoint[]; // Projected forward points
  startIndex: number;
  endIndex: number;
  startTime: number;
  endTime: number;
}

/**
 * Calculates Bloomberg Auto Smart Channel (Regression & Volatility Envelope)
 * Standard in Bloomberg Terminal Commodities & FX Pro Desk
 */
export function calculateBloombergSmartChannel(
  candles: Candle[],
  config: Partial<BloombergChannelConfig> = {}
): BloombergChannelResult | null {
  const cfg: BloombergChannelConfig = { ...DEFAULT_BLOOMBERG_CHANNEL_CONFIG, ...config };
  const n = candles.length;
  if (n < 15) return null;

  // 1. Determine optimal lookback
  let lookback = Math.min(n, Math.max(15, cfg.lookback));
  if (cfg.autoLookback) {
    // Find recent prominent swing structure to anchor channel window
    // Test lookback candidates [30, 45, 60, 80] and select highest R²
    const candidates = [25, 40, 55, 75].filter(len => len <= n);
    let bestR2 = -1;
    let bestLen = lookback;

    for (const len of candidates) {
      const subset = candles.slice(n - len);
      const r2 = computeQuickRSquared(subset);
      if (r2 > bestR2) {
        bestR2 = r2;
        bestLen = len;
      }
    }
    lookback = bestLen;
  }

  const startIdx = n - lookback;
  const sample = candles.slice(startIdx);
  const sampleLen = sample.length;

  // 2. Linear Regression over Typical Prices ((High + Low + Close) / 3)
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  const yValues: number[] = new Array(sampleLen);
  for (let i = 0; i < sampleLen; i++) {
    const c = sample[i];
    const y = (c.high + c.low + c.close * 2) / 4; // Weighted Close
    yValues[i] = y;
    sumX += i;
    sumY += y;
    sumXY += i * y;
    sumXX += i * i;
  }

  const denominator = sampleLen * sumXX - sumX * sumX;
  if (denominator === 0) return null;

  const slope = (sampleLen * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / sampleLen;

  // 3. Compute Residuals, R-Squared, Standard Error, and Maximum Residuals
  const meanY = sumY / sampleLen;
  let ssTot = 0;
  let ssRes = 0;
  let maxPositiveResidual = 0;
  let maxNegativeResidual = 0;

  for (let i = 0; i < sampleLen; i++) {
    const fitted = intercept + slope * i;
    const actual = yValues[i];
    const diff = actual - fitted;
    ssRes += diff * diff;
    ssTot += (actual - meanY) * (actual - meanY);

    const highDiff = sample[i].high - fitted;
    const lowDiff = sample[i].low - fitted;
    if (highDiff > maxPositiveResidual) maxPositiveResidual = highDiff;
    if (lowDiff < maxNegativeResidual) maxNegativeResidual = lowDiff;
  }

  const rSquared = ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0;
  const standardError = Math.sqrt(ssRes / Math.max(1, sampleLen - 2)) || 1.2;

  // 4. Calculate Channel Width & Multipliers
  let upperDist = standardError * cfg.deviation;
  let lowerDist = standardError * cfg.deviation;

  if (cfg.channelType === 'RAFF_EXTREME') {
    // Raff Channel: Equidistant envelope set by max deviation high/low
    const maxDev = Math.max(maxPositiveResidual, Math.abs(maxNegativeResidual), standardError * 1.5);
    upperDist = maxDev;
    lowerDist = maxDev;
  }

  const innerUpperDist = upperDist * 0.5;
  const innerLowerDist = lowerDist * 0.5;

  // 5. Generate Historical Channel Points
  const points: BloombergChannelPoint[] = new Array(sampleLen);
  for (let i = 0; i < sampleLen; i++) {
    const globalIdx = startIdx + i;
    const mid = +(intercept + slope * i).toFixed(2);
    points[i] = {
      index: globalIdx,
      time: sample[i].time,
      midline: mid,
      upperBand: +(mid + upperDist).toFixed(2),
      lowerBand: +(mid - lowerDist).toFixed(2),
      upperInnerBand: +(mid + innerUpperDist).toFixed(2),
      lowerInnerBand: +(mid - innerLowerDist).toFixed(2),
    };
  }

  // 6. Generate Projected Forward Points into the Future
  const futurePoints: BloombergChannelPoint[] = [];
  const lastTime = sample[sampleLen - 1].time;
  // Estimate bar duration from sample
  const barIntervalMs = sampleLen > 1 
    ? Math.max(1000, Math.round((lastTime - sample[0].time) / (sampleLen - 1))) 
    : 60000;

  for (let f = 1; f <= cfg.projectionBars; f++) {
    const futureI = sampleLen - 1 + f;
    const futureMid = +(intercept + slope * futureI).toFixed(2);
    futurePoints.push({
      index: startIdx + futureI,
      time: lastTime + f * barIntervalMs,
      midline: futureMid,
      upperBand: +(futureMid + upperDist).toFixed(2),
      lowerBand: +(futureMid - lowerDist).toFixed(2),
      upperInnerBand: +(futureMid + innerUpperDist).toFixed(2),
      lowerInnerBand: +(futureMid - innerLowerDist).toFixed(2),
    });
  }

  // 7. Regime & Signal Analysis
  const currentCandle = sample[sampleLen - 1];
  const currentClose = currentCandle.close;
  const currentMid = points[sampleLen - 1].midline;
  const currentUpper = points[sampleLen - 1].upperBand;
  const currentLower = points[sampleLen - 1].lowerBand;
  const currentUpperInner = points[sampleLen - 1].upperInnerBand || currentMid;
  const currentLowerInner = points[sampleLen - 1].lowerInnerBand || currentMid;

  const slopeThreshold = 0.05; // $0.05 / bar threshold
  let regime: ChannelRegime = 'HORIZONTAL_RANGE';
  if (slope > slopeThreshold) regime = 'BULLISH_ASCENDING';
  else if (slope < -slopeThreshold) regime = 'BEARISH_DESCENDING';

  const visualAngle = Math.max(-65, Math.min(65, Math.round(Math.atan(slope * 12) * (180 / Math.PI))));

  // Z-Score distance from current midline
  const priceZScore = +((currentClose - currentMid) / standardError).toFixed(2);

  let signal: ChannelSignal = 'NEUTRAL_FLOW';
  if (currentClose >= currentUpper || currentCandle.high >= currentUpper) {
    signal = 'OVERBOUGHT_RESISTANCE';
  } else if (currentClose <= currentLower || currentCandle.low <= currentLower) {
    signal = 'OVERSOLD_SUPPORT';
  } else if (Math.abs(currentClose - currentMid) <= standardError * 0.35) {
    signal = 'MIDLINE_EQUILIBRIUM';
  }

  // Target price calculation:
  // If at extreme overbought -> Mean reversion target to Midline
  // If at extreme oversold -> Mean reversion target to Midline
  // If near midline in bull regime -> Target Upper Channel
  // If near midline in bear regime -> Target Lower Channel
  let targetPrice = currentMid;
  if (signal === 'OVERBOUGHT_RESISTANCE') {
    targetPrice = currentMid;
  } else if (signal === 'OVERSOLD_SUPPORT') {
    targetPrice = currentMid;
  } else if (regime === 'BULLISH_ASCENDING') {
    targetPrice = currentUpper;
  } else if (regime === 'BEARISH_DESCENDING') {
    targetPrice = currentLower;
  }

  return {
    isValid: true,
    regime,
    signal,
    slope: +slope.toFixed(4),
    slopeAngleDeg: visualAngle,
    rSquared: +rSquared.toFixed(3),
    standardError: +standardError.toFixed(2),
    currentMidline: currentMid,
    currentUpper,
    currentLower,
    currentUpperInner,
    currentLowerInner,
    channelWidth: +(upperDist + lowerDist).toFixed(2),
    targetPrice: +targetPrice.toFixed(2),
    priceZScore,
    points,
    futurePoints,
    startIndex: startIdx,
    endIndex: n - 1,
    startTime: sample[0].time,
    endTime: sample[sampleLen - 1].time,
  };
}

function computeQuickRSquared(subset: Candle[]): number {
  const m = subset.length;
  if (m < 5) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < m; i++) {
    const y = subset[i].close;
    sumX += i;
    sumY += y;
    sumXY += i * y;
    sumXX += i * i;
  }
  const denom = m * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  const slope = (m * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / m;
  const meanY = sumY / m;

  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < m; i++) {
    const fitted = intercept + slope * i;
    const diff = subset[i].close - fitted;
    ssRes += diff * diff;
    ssTot += (subset[i].close - meanY) * (subset[i].close - meanY);
  }
  return ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
}
