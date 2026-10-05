import { Candle } from '../types/market';

export interface BigBelugaLiquidityZone {
  id: string;
  type: 'HIGH_ZONE' | 'LOW_ZONE'; // HIGH_ZONE = Buy-Side Liquidity (Resistance), LOW_ZONE = Sell-Side Liquidity (Support)
  pivotPrice: number;
  zoneTop: number;
  zoneBottom: number;
  pivotIndex: number;
  pivotTime: number;
  volume: number;
  volRatio: number;
  volStrength: 'LOW' | 'MID' | 'HIGH';
  isGrabbed: boolean;
  grabIndex?: number;
  grabTime?: number;
  grabPrice?: number;
  atrAtPivot: number;
  sourceUrl: string;
}

export interface BigBelugaConfig {
  pivotLength: number; // Lookback & lookahead bars (default 8)
  mode: 'dynamic' | 'simple'; // 'dynamic' adjusts zone height with normalized volume; 'simple' uses ATR
  volumeFilter: 'ALL' | 'MID_HIGH' | 'HIGH_ONLY';
  showGrabbed: boolean;
  atrPeriod: number;
}

export const DEFAULT_BIG_BELUGA_CONFIG: BigBelugaConfig = {
  pivotLength: 8,
  mode: 'dynamic',
  volumeFilter: 'ALL',
  showGrabbed: true,
  atrPeriod: 14,
};

/**
 * Calculates 14-period Average True Range (ATR)
 */
function calculateATR(candles: Candle[], period = 14): number[] {
  const n = candles.length;
  const atr: number[] = new Array(n).fill(1.8);
  if (n < 2) return atr;

  let trSum = 0;
  for (let i = 1; i < n; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    if (i <= period) {
      trSum += tr;
      atr[i] = trSum / i;
    } else {
      atr[i] = (atr[i - 1] * (period - 1) + tr) / period;
    }
  }
  return atr;
}

/**
 * Detects BigBeluga Liquidity Zones based on:
 * https://id.tradingview.com/script/7d2zeIlZ-Liquidity-Zones-BigBeluga/
 */
export function detectBigBelugaLiquidityZones(
  candles: Candle[],
  config: Partial<BigBelugaConfig> = {}
): BigBelugaLiquidityZone[] {
  const cfg: BigBelugaConfig = { ...DEFAULT_BIG_BELUGA_CONFIG, ...config };
  const n = candles.length;
  if (n < cfg.pivotLength * 2 + 1) return [];

  const atrValues = calculateATR(candles, cfg.atrPeriod);

  // Compute Volume SMA (20 period)
  const volSma: number[] = new Array(n).fill(1);
  const volPeriod = 20;
  let runningVol = 0;
  for (let i = 0; i < n; i++) {
    runningVol += candles[i].volume || 1;
    if (i >= volPeriod) {
      runningVol -= candles[i - volPeriod].volume || 1;
      volSma[i] = runningVol / volPeriod;
    } else {
      volSma[i] = runningVol / (i + 1);
    }
  }

  const zones: BigBelugaLiquidityZone[] = [];
  const pLen = cfg.pivotLength;

  // Search for pivot highs and lows
  for (let i = pLen; i < n - pLen; i++) {
    const cur = candles[i];
    const curAtr = atrValues[i] || 1.8;
    const curVol = cur.volume || 1;
    const avgVol = volSma[i] || 1;
    const volRatio = +(curVol / avgVol).toFixed(2);

    let volStrength: 'LOW' | 'MID' | 'HIGH' = 'LOW';
    if (volRatio >= 1.4) {
      volStrength = 'HIGH';
    } else if (volRatio >= 0.95) {
      volStrength = 'MID';
    }

    // Volume filter check
    if (cfg.volumeFilter === 'HIGH_ONLY' && volStrength !== 'HIGH') continue;
    if (cfg.volumeFilter === 'MID_HIGH' && volStrength === 'LOW') continue;

    // Check Pivot High (Buy-Side Liquidity)
    let isPivotHigh = true;
    for (let offset = 1; offset <= pLen; offset++) {
      if (candles[i - offset].high >= cur.high || candles[i + offset].high > cur.high) {
        isPivotHigh = false;
        break;
      }
    }

    if (isPivotHigh) {
      // Calculate zone height (Dynamic vs Simple)
      let height = curAtr * 0.45;
      if (cfg.mode === 'dynamic') {
        const factor = Math.min(2.0, Math.max(0.6, Math.sqrt(volRatio)));
        height = curAtr * 0.45 * factor;
      }
      height = +Math.max(0.40, height).toFixed(2);

      const zoneBottom = cur.high;
      const zoneTop = +(cur.high + height).toFixed(2);

      // Detect Liquidity Grab in subsequent bars
      let isGrabbed = false;
      let grabIndex: number | undefined;
      let grabTime: number | undefined;
      let grabPrice: number | undefined;

      for (let k = i + 1; k < n; k++) {
        if (candles[k].high >= zoneBottom) {
          isGrabbed = true;
          grabIndex = k;
          grabTime = candles[k].time;
          grabPrice = candles[k].high;
          break;
        }
      }

      if (!isGrabbed || cfg.showGrabbed) {
        zones.push({
          id: `bb-high-${cur.time}-${i}`,
          type: 'HIGH_ZONE',
          pivotPrice: cur.high,
          zoneTop,
          zoneBottom,
          pivotIndex: i,
          pivotTime: cur.time,
          volume: curVol,
          volRatio,
          volStrength,
          isGrabbed,
          grabIndex,
          grabTime,
          grabPrice,
          atrAtPivot: curAtr,
          sourceUrl: 'https://id.tradingview.com/script/7d2zeIlZ-Liquidity-Zones-BigBeluga/',
        });
      }
    }

    // Check Pivot Low (Sell-Side Liquidity)
    let isPivotLow = true;
    for (let offset = 1; offset <= pLen; offset++) {
      if (candles[i - offset].low <= cur.low || candles[i + offset].low < cur.low) {
        isPivotLow = false;
        break;
      }
    }

    if (isPivotLow) {
      let height = curAtr * 0.45;
      if (cfg.mode === 'dynamic') {
        const factor = Math.min(2.0, Math.max(0.6, Math.sqrt(volRatio)));
        height = curAtr * 0.45 * factor;
      }
      height = +Math.max(0.40, height).toFixed(2);

      const zoneTop = cur.low;
      const zoneBottom = +(cur.low - height).toFixed(2);

      let isGrabbed = false;
      let grabIndex: number | undefined;
      let grabTime: number | undefined;
      let grabPrice: number | undefined;

      for (let k = i + 1; k < n; k++) {
        if (candles[k].low <= zoneTop) {
          isGrabbed = true;
          grabIndex = k;
          grabTime = candles[k].time;
          grabPrice = candles[k].low;
          break;
        }
      }

      if (!isGrabbed || cfg.showGrabbed) {
        zones.push({
          id: `bb-low-${cur.time}-${i}`,
          type: 'LOW_ZONE',
          pivotPrice: cur.low,
          zoneTop,
          zoneBottom,
          pivotIndex: i,
          pivotTime: cur.time,
          volume: curVol,
          volRatio,
          volStrength,
          isGrabbed,
          grabIndex,
          grabTime,
          grabPrice,
          atrAtPivot: curAtr,
          sourceUrl: 'https://id.tradingview.com/script/7d2zeIlZ-Liquidity-Zones-BigBeluga/',
        });
      }
    }
  }

  // Sort chronologically
  return zones.sort((a, b) => a.pivotTime - b.pivotTime);
}
