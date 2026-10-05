import { Candle } from '../types/market';

export interface DeltaBubble {
  id: string;
  candleIndex: number;
  time: number;
  price: number; // Intra-candle Volume-Weighted Price (VWAP)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  delta: number; // Net Delta (Buy Vol - Sell Vol)
  buyVolume: number;
  sellVolume: number;
  buyPercent: number; // 0 - 100%
  zScore: number; // Delta Z-Score (standard deviations σ)
  volZScore: number; // Volume Z-Score
  radius: number; // Pixel radius dynamically scaled to Z-Score
  type: 'BULLISH' | 'BEARISH' | 'CONFLICT';
  isAbsorption: boolean; // Aggressive volume absorbed by passive limit orders
  isExhaustion: boolean; // Climax volume near extremes
  isMitigated: boolean; // Tested/mitigated by subsequent price action
  mitigatedIndex?: number;
  mitigatedPrice?: number;
  sourceUrl: string;
}

export interface DeltaBubbleConfig {
  length: number; // Lookback period for Z-Score calculation (default: 20)
  zThreshold: number; // Z-Score trigger threshold (default: 1.0σ)
  bubbleSizeMultiplier: number; // Scale factor for bubble radius (default: 1.0)
  showAbsorption: boolean; // Detect and flag institutional absorption (default: true)
  showExhaustion: boolean; // Flag volume climax/exhaustion (default: true)
  showLabels: boolean; // Display Z-score sigma labels (default: true)
  showUnmitigatedRay: boolean; // Project support/resistance ray from intra VWAP (default: true)
  minRadius: number; // Minimum bubble radius in px (default: 6)
  maxRadius: number; // Maximum bubble radius in px (default: 24)
}

export const DEFAULT_DELTA_BUBBLE_CONFIG: DeltaBubbleConfig = {
  length: 20,
  zThreshold: 1.0,
  bubbleSizeMultiplier: 1.0,
  showAbsorption: true,
  showExhaustion: true,
  showLabels: true,
  showUnmitigatedRay: true,
  minRadius: 6,
  maxRadius: 24,
};

export interface DeltaBubbleMetrics {
  bubbles: DeltaBubble[];
  latestDelta: number;
  latestZScore: number;
  latestVolZScore: number;
  bullishCount: number;
  bearishCount: number;
  absorptionCount: number;
  cvd: number[]; // Cumulative Volume Delta
}

/**
 * Calculates Delta Volume and Quant Z-Score Bubbles
 * Based on TradingView Indicator:
 * https://id.tradingview.com/script/m2Z0v7Jw-Delta-Volume-Bubble-Quant-Z-Score-by-tncylyv/
 */
export function calculateDeltaVolumeBubbles(
  candles: Candle[],
  config: Partial<DeltaBubbleConfig> = {}
): DeltaBubbleMetrics {
  const cfg: DeltaBubbleConfig = { ...DEFAULT_DELTA_BUBBLE_CONFIG, ...config };
  const n = candles.length;

  if (n === 0) {
    return {
      bubbles: [],
      latestDelta: 0,
      latestZScore: 0,
      latestVolZScore: 0,
      bullishCount: 0,
      bearishCount: 0,
      absorptionCount: 0,
      cvd: [],
    };
  }

  // 1. Calculate intra-bar Delta Volume and Intra-VWAP for each candle
  const deltas: number[] = new Array(n);
  const buyVolumes: number[] = new Array(n);
  const sellVolumes: number[] = new Array(n);
  const intraVwaps: number[] = new Array(n);
  const candleBodies: number[] = new Array(n);
  const cvdSeries: number[] = new Array(n);
  let runningCvd = 0;

  for (let i = 0; i < n; i++) {
    const c = candles[i];
    const totalVol = Math.max(1, c.volume || 1);
    const range = Math.max(0.02, c.high - c.low);
    const body = Math.abs(c.close - c.open);
    candleBodies[i] = body;

    // Estimate realistic intrabar volume delta:
    // Buying pressure from close relative to low, selling pressure from high relative to close
    const buyPressure = (c.close - c.low) / range;
    const sellPressure = (c.high - c.close) / range;
    const rawDeltaRatio = Math.max(-0.95, Math.min(0.95, buyPressure - sellPressure));

    // Directional bias boost for solid bodies
    const bodyRatio = (c.close - c.open) / range;
    const deltaRatio = Math.max(-1, Math.min(1, rawDeltaRatio * 0.7 + bodyRatio * 0.3));

    const delta = Math.round(totalVol * deltaRatio);
    deltas[i] = delta;

    const buyVol = Math.round(totalVol * Math.max(0, Math.min(1, (1 + deltaRatio) / 2)));
    buyVolumes[i] = buyVol;
    sellVolumes[i] = Math.max(0, totalVol - buyVol);

    runningCvd += delta;
    cvdSeries[i] = runningCvd;

    // Intra-candle VWAP weighted towards close & body center
    intraVwaps[i] = +( (c.open + c.high + c.low + 2 * c.close) / 5 ).toFixed(2);
  }

  // 2. Rolling Z-Score normalization over specified lookback length
  const zScores: number[] = new Array(n);
  const volZScores: number[] = new Array(n);
  const avgBodies: number[] = new Array(n);
  const pLen = Math.max(5, cfg.length);

  for (let i = 0; i < n; i++) {
    const windowStart = Math.max(0, i - pLen + 1);
    const windowCount = i - windowStart + 1;

    let deltaSum = 0;
    let volSum = 0;
    let bodySum = 0;

    for (let k = windowStart; k <= i; k++) {
      deltaSum += deltas[k];
      volSum += candles[k].volume || 1;
      bodySum += candleBodies[k];
    }

    const meanDelta = deltaSum / windowCount;
    const meanVol = volSum / windowCount;
    avgBodies[i] = bodySum / windowCount;

    let deltaVarianceSum = 0;
    let volVarianceSum = 0;

    for (let k = windowStart; k <= i; k++) {
      deltaVarianceSum += Math.pow(deltas[k] - meanDelta, 2);
      volVarianceSum += Math.pow((candles[k].volume || 1) - meanVol, 2);
    }

    const stdevDelta = Math.sqrt(deltaVarianceSum / windowCount) || 1;
    const stdevVol = Math.sqrt(volVarianceSum / windowCount) || 1;

    zScores[i] = +((deltas[i] - meanDelta) / stdevDelta).toFixed(2);
    volZScores[i] = +(((candles[i].volume || 1) - meanVol) / stdevVol).toFixed(2);
  }

  // 3. Detect and classify Quant Z-Score Bubbles
  const bubbles: DeltaBubble[] = [];
  let bullishCount = 0;
  let bearishCount = 0;
  let absorptionCount = 0;

  for (let i = 1; i < n; i++) {
    const z = zScores[i];
    const vz = volZScores[i];
    const absZ = Math.abs(z);
    const c = candles[i];
    const body = candleBodies[i];
    const avgBody = avgBodies[i] || 1;
    const range = Math.max(0.02, c.high - c.low);

    // Is there a statistically significant anomaly?
    const isAnomaly = absZ >= cfg.zThreshold || (vz >= 1.8 && absZ >= cfg.zThreshold * 0.7);

    if (!isAnomaly) continue;

    let type: 'BULLISH' | 'BEARISH' | 'CONFLICT' = 'BULLISH';
    if (vz >= 1.8 && absZ < 0.6) {
      type = 'CONFLICT'; // High volume churn / deadlock battle
    } else if (z < 0) {
      type = 'BEARISH';
      bearishCount++;
    } else {
      type = 'BULLISH';
      bullishCount++;
    }

    // Absorption Detection:
    // Large aggressive delta (|Z| >= 1.3), but body is compressed relative to recent candles,
    // or strong rejection wick counteracting the delta direction.
    let isAbsorption = false;
    if (cfg.showAbsorption && absZ >= 1.25) {
      const isCompressedBody = body <= avgBody * 0.65;
      const upperWick = c.high - Math.max(c.open, c.close);
      const lowerWick = Math.min(c.open, c.close) - c.low;

      // Bullish delta with heavy upper wick rejection OR Bearish delta with heavy lower wick rejection
      const isWickRejection =
        (z > 0 && upperWick >= range * 0.45) ||
        (z < 0 && lowerWick >= range * 0.45);

      if (isCompressedBody || isWickRejection) {
        isAbsorption = true;
        absorptionCount++;
      }
    }

    // Exhaustion Climax:
    // Extreme Z-Score (|Z| >= 2.5) or Volume Z >= 2.6
    const isExhaustion = cfg.showExhaustion && (absZ >= 2.4 || vz >= 2.5);

    // Dynamic radius calculation
    const excess = Math.max(0, absZ - cfg.zThreshold);
    const dynamicR = cfg.minRadius + excess * 6 * cfg.bubbleSizeMultiplier;
    const clampedRadius = Math.max(
      cfg.minRadius,
      Math.min(cfg.maxRadius, Math.round(dynamicR))
    );

    // Check future mitigation (did price cross the intra VWAP level?)
    const vwapPrice = intraVwaps[i];
    let isMitigated = false;
    let mitigatedIndex: number | undefined;
    let mitigatedPrice: number | undefined;

    for (let k = i + 1; k < n; k++) {
      const nextC = candles[k];
      if (nextC.low <= vwapPrice && nextC.high >= vwapPrice) {
        isMitigated = true;
        mitigatedIndex = k;
        mitigatedPrice = vwapPrice;
        break;
      }
    }

    const buyVol = buyVolumes[i];
    const sellVol = sellVolumes[i];
    const totalVol = Math.max(1, c.volume || 1);
    const buyPct = Math.round((buyVol / totalVol) * 100);

    bubbles.push({
      id: `delta-bubble-${i}-${c.time}`,
      candleIndex: i,
      time: c.time,
      price: vwapPrice,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: totalVol,
      delta: deltas[i],
      buyVolume: buyVol,
      sellVolume: sellVol,
      buyPercent: buyPct,
      zScore: z,
      volZScore: vz,
      radius: clampedRadius,
      type,
      isAbsorption,
      isExhaustion,
      isMitigated,
      mitigatedIndex,
      mitigatedPrice,
      sourceUrl: 'https://id.tradingview.com/script/m2Z0v7Jw-Delta-Volume-Bubble-Quant-Z-Score-by-tncylyv/',
    });
  }

  const latestIdx = n - 1;
  return {
    bubbles,
    latestDelta: deltas[latestIdx] || 0,
    latestZScore: zScores[latestIdx] || 0,
    latestVolZScore: volZScores[latestIdx] || 0,
    bullishCount,
    bearishCount,
    absorptionCount,
    cvd: cvdSeries,
  };
}
