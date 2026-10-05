import { 
  Candle, 
  PriceNode, 
  OrderBookItem, 
  ICTKillzone, 
  LiquidityDensityMetrics,
  LiquiditySweepDetails,
  HTFCandleProfile,
  HTFProfileBin,
  HTFTimeframe
} from '../types/market';

export const ICT_KILLZONES: Omit<ICTKillzone, 'isActive' | 'high' | 'low' | 'pivotsCount'>[] = [
  {
    id: 'ASIAN',
    name: 'Asian Session Killzone',
    shortName: 'Asian KZ',
    startHourUtc: 0,
    startMinuteUtc: 0,
    endHourUtc: 8,
    endMinuteUtc: 0,
    color: '#818cf8', // Indigo
    accentBg: 'rgba(129, 140, 248, 0.08)',
    description: 'Asian range accumulation. Sets initial daily high & low liquidity references.',
  },
  {
    id: 'LONDON_OPEN',
    name: 'London Open Killzone',
    shortName: 'London KZ',
    startHourUtc: 7,
    startMinuteUtc: 0,
    endHourUtc: 10,
    endMinuteUtc: 0,
    color: '#38bdf8', // Sky
    accentBg: 'rgba(56, 189, 248, 0.12)',
    description: 'Judas Swing liquidity grab. High statistical odds of forming the daily high/low for Gold.',
  },
  {
    id: 'NY_OPEN',
    name: 'New York Open Killzone',
    shortName: 'NY Open KZ',
    startHourUtc: 12,
    startMinuteUtc: 0,
    endHourUtc: 15,
    endMinuteUtc: 0,
    color: '#f59e0b', // Amber
    accentBg: 'rgba(245, 158, 11, 0.12)',
    description: 'Maximum institutional volume injection. US economic data releases and trend expansion.',
  },
  {
    id: 'LONDON_CLOSE',
    name: 'London Close Killzone',
    shortName: 'London Close',
    startHourUtc: 15,
    startMinuteUtc: 0,
    endHourUtc: 17,
    endMinuteUtc: 0,
    color: '#ec4899', // Pink
    accentBg: 'rgba(236, 72, 153, 0.10)',
    description: 'Institutional profit-taking and counter-trend liquidity rebalancing.',
  },
];

export function getCandleKillzone(timeMs: number): string | null {
  const date = new Date(timeMs);
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const timeInMinutes = hour * 60 + minute;

  for (const kz of ICT_KILLZONES) {
    const startMin = kz.startHourUtc * 60 + kz.startMinuteUtc;
    const endMin = kz.endHourUtc * 60 + kz.endMinuteUtc;
    if (timeInMinutes >= startMin && timeInMinutes < endMin) {
      return kz.shortName;
    }
  }
  return null;
}

export function getCurrentKillzones(nowMs: number = Date.now()): ICTKillzone[] {
  const date = new Date(nowMs);
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const timeInMinutes = hour * 60 + minute;

  return ICT_KILLZONES.map(kz => {
    const startMin = kz.startHourUtc * 60 + kz.startMinuteUtc;
    const endMin = kz.endHourUtc * 60 + kz.endMinuteUtc;
    const isActive = timeInMinutes >= startMin && timeInMinutes < endMin;
    return {
      ...kz,
      isActive,
    };
  });
}

/**
 * Calculates resting DOM liquidity density around a given price level
 */
export function calculateLiquidityDensityAroundPrice(
  targetPrice: number,
  bids: OrderBookItem[],
  asks: OrderBookItem[],
  proximityRange: number = 2.0
): LiquidityDensityMetrics {
  let nearbyBidOz = 0;
  let nearbyAskOz = 0;

  for (const bid of bids) {
    if (Math.abs(bid.price - targetPrice) <= proximityRange) {
      nearbyBidOz += bid.amount;
    }
  }

  for (const ask of asks) {
    if (Math.abs(ask.price - targetPrice) <= proximityRange) {
      nearbyAskOz += ask.amount;
    }
  }

  const totalOz = nearbyBidOz + nearbyAskOz;
  const imbalanceRatio = totalOz > 0 ? nearbyBidOz / totalOz : 0.5;

  let wallType: 'BID_WALL' | 'ASK_WALL' | 'BALANCED' = 'BALANCED';
  let wallStrength = 2;

  if (nearbyBidOz > nearbyAskOz * 1.6) {
    wallType = 'BID_WALL';
    wallStrength = nearbyBidOz > nearbyAskOz * 2.5 ? 5 : 4;
  } else if (nearbyAskOz > nearbyBidOz * 1.6) {
    wallType = 'ASK_WALL';
    wallStrength = nearbyAskOz > nearbyBidOz * 2.5 ? 5 : 4;
  } else {
    wallType = 'BALANCED';
    wallStrength = 3;
  }

  // Density score normalized 0 - 100
  const densityScore = Math.min(100, Math.round((totalOz / 120) * 100));

  let sweepRisk: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (totalOz > 60) {
    sweepRisk = 'HIGH';
  } else if (totalOz > 30) {
    sweepRisk = 'MEDIUM';
  }

  return {
    restingOz: +totalOz.toFixed(2),
    restingUsd: +(totalOz * targetPrice).toFixed(0),
    imbalanceRatio: +imbalanceRatio.toFixed(2),
    wallType,
    wallStrength,
    sweepRisk,
    densityScore,
  };
}

/**
 * CHARTPRIME: HTF (Higher Timeframe) Candle Volume Profile Generator
 * Groups LTF candles into HTF candles (15m, 1h, 4h, 1D),
 * generates horizontal volume profiles with Buy/Sell delta,
 * detects Point of Control (POC), and tracks unmitigated Naked POCs.
 */
export function buildHTFCandleProfiles(
  candles: Candle[],
  htfTimeframe: HTFTimeframe = '1h'
): HTFCandleProfile[] {
  if (candles.length === 0) return [];

  const durationMap: Record<HTFTimeframe, number> = {
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1D': 24 * 60 * 60 * 1000,
  };

  let periodMs = durationMap[htfTimeframe] || 60 * 60 * 1000;
  const totalSpan = candles[candles.length - 1].time - candles[0].time;

  // Adaptive adjustment if chart history is short so we always have clean HTF blocks
  if (totalSpan < periodMs * 2) {
    if (periodMs > 15 * 60 * 1000) {
      periodMs = 15 * 60 * 1000;
    } else {
      periodMs = 5 * 60 * 1000;
    }
  }

  // Group candles into HTF buckets
  const groups = new Map<number, Candle[]>();
  for (const c of candles) {
    const bucketStart = Math.floor(c.time / periodMs) * periodMs;
    const list = groups.get(bucketStart) || [];
    list.push(c);
    groups.set(bucketStart, list);
  }

  const profiles: HTFCandleProfile[] = [];
  const sortedBucketKeys = Array.from(groups.keys()).sort((a, b) => a - b);
  const now = Date.now();

  for (let bIdx = 0; bIdx < sortedBucketKeys.length; bIdx++) {
    const bucketTime = sortedBucketKeys[bIdx];
    const bucketCandles = groups.get(bucketTime)!;
    if (bucketCandles.length === 0) continue;

    const open = bucketCandles[0].open;
    const close = bucketCandles[bucketCandles.length - 1].close;
    let high = -Infinity;
    let low = Infinity;
    let totalVolume = 0;

    for (const c of bucketCandles) {
      if (c.high > high) high = c.high;
      if (c.low < low) low = c.low;
      totalVolume += c.volume;
    }

    const range = high - low;
    const binCount = 14;
    const binSize = range > 0 ? range / binCount : 0.5;

    const bins: HTFProfileBin[] = [];
    for (let i = 0; i < binCount; i++) {
      const pLow = low + i * binSize;
      const pHigh = pLow + binSize;
      bins.push({
        priceLow: +pLow.toFixed(2),
        priceHigh: +pHigh.toFixed(2),
        priceMid: +((pLow + pHigh) / 2).toFixed(2),
        volume: 0,
        buyVolume: 0,
        sellVolume: 0,
        isPoc: false,
        isValueArea: false,
      });
    }

    // Distribute candle volumes into price bins with Buy/Sell Delta
    for (const c of bucketCandles) {
      const cLow = c.low;
      const cHigh = c.high;
      const isUp = c.close >= c.open;

      for (const bin of bins) {
        // Check overlap
        const overlapLow = Math.max(cLow, bin.priceLow);
        const overlapHigh = Math.min(cHigh, bin.priceHigh);
        if (overlapHigh > overlapLow) {
          const ratio = (overlapHigh - overlapLow) / (cHigh - cLow || 0.01);
          const allocated = Math.max(1, Math.round(c.volume * ratio));
          bin.volume += allocated;
          if (isUp) {
            bin.buyVolume += allocated;
          } else {
            bin.sellVolume += allocated;
          }
        }
      }
    }

    // Determine POC (Point of Control)
    let maxBinVol = -1;
    let pocBinIdx = 0;
    for (let i = 0; i < bins.length; i++) {
      if (bins[i].volume > maxBinVol) {
        maxBinVol = bins[i].volume;
        pocBinIdx = i;
      }
    }

    if (bins[pocBinIdx]) {
      bins[pocBinIdx].isPoc = true;
    }

    const pocPrice = bins[pocBinIdx]?.priceMid || +((high + low) / 2).toFixed(2);

    // Compute Value Area (70% Volume distribution around POC)
    const targetVaVolume = totalVolume * 0.70;
    let currentVaVol = bins[pocBinIdx]?.volume || 0;
    if (bins[pocBinIdx]) bins[pocBinIdx].isValueArea = true;

    let upIdx = pocBinIdx + 1;
    let downIdx = pocBinIdx - 1;

    while (currentVaVol < targetVaVolume && (upIdx < binCount || downIdx >= 0)) {
      const upVol = upIdx < binCount ? bins[upIdx].volume : -1;
      const downVol = downIdx >= 0 ? bins[downIdx].volume : -1;

      if (upVol >= downVol && upIdx < binCount) {
        currentVaVol += bins[upIdx].volume;
        bins[upIdx].isValueArea = true;
        upIdx++;
      } else if (downIdx >= 0) {
        currentVaVol += bins[downIdx].volume;
        bins[downIdx].isValueArea = true;
        downIdx--;
      } else if (upIdx < binCount) {
        currentVaVol += bins[upIdx].volume;
        bins[upIdx].isValueArea = true;
        upIdx++;
      } else {
        break;
      }
    }

    // Identify VAH and VAL
    let vahPrice = high;
    let valPrice = low;
    for (let i = bins.length - 1; i >= 0; i--) {
      if (bins[i].isValueArea) {
        vahPrice = bins[i].priceHigh;
        break;
      }
    }
    for (let i = 0; i < bins.length; i++) {
      if (bins[i].isValueArea) {
        valPrice = bins[i].priceLow;
        break;
      }
    }

    const isDeveloping = bIdx === sortedBucketKeys.length - 1;
    
    // Check if Naked / Unmitigated POC
    let unmitigatedPoc = true;
    if (!isDeveloping) {
      for (let subsequentIdx = bIdx + 1; subsequentIdx < sortedBucketKeys.length; subsequentIdx++) {
        const futureCandles = groups.get(sortedBucketKeys[subsequentIdx]) || [];
        for (const fc of futureCandles) {
          if (fc.low <= pocPrice && fc.high >= pocPrice) {
            unmitigatedPoc = false;
            break;
          }
        }
        if (!unmitigatedPoc) break;
      }
    }

    profiles.push({
      id: `htf-${htfTimeframe}-${bucketTime}`,
      htfTimeframe,
      startTime: bucketTime,
      endTime: bucketTime + periodMs,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume: totalVolume,
      isBullish: close >= open,
      pocPrice: +pocPrice.toFixed(2),
      vahPrice: +vahPrice.toFixed(2),
      valPrice: +valPrice.toFixed(2),
      totalVolume,
      bins,
      isDeveloping,
      unmitigatedPoc,
      candleCount: bucketCandles.length,
    });
  }

  return profiles;
}

/**
 * MAXMASERATI 3.0: Liquidity Sweep of Candle & Swing Detection
 * Detects:
 * 1) Candle Sweeps: Wick sweeps previous candle high/low then closes back inside range (SSL/BSL intra-bar grab)
 * 2) Swing Sweeps (Turtle Soup): Wick pierces a multi-bar fractal pivot high/low and closes back inside (optional, default disabled)
 */
export function detectLiquiditySweeps(
  candles: Candle[],
  pivots: { index: number; candle: Candle; isHigh: boolean; price: number; time: number }[],
  bids: OrderBookItem[] = [],
  asks: OrderBookItem[] = [],
  includeTurtleSoup: boolean = false
): PriceNode[] {
  const sweepNodes: PriceNode[] = [];
  if (candles.length < 5) return sweepNodes;

  const currentPrice = candles[candles.length - 1].close;

  // 1. Single-Candle Liquidity Sweeps (MaxMaserati 3.0 Candle Sweep)
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const c = candles[i];
    const cRange = c.high - c.low || 0.5;

    // Bullish Candle Sweep (SSL Grab at Low):
    // Wick drops below previous candle low, but body closes back inside / above prev.low
    if (c.low < prev.low && c.close >= prev.low) {
      const sweepDepth = +(prev.low - c.low).toFixed(2);
      const lowerWick = Math.min(c.open, c.close) - c.low;
      const wickRatio = lowerWick / cRange;

      if (sweepDepth >= 0.20 && wickRatio >= 0.25) {
        // Check if subsequently broken
        let isBroken = false;
        for (let k = i + 1; k < candles.length; k++) {
          if (candles[k].close < c.low) {
            isBroken = true;
            break;
          }
        }

        const density = calculateLiquidityDensityAroundPrice(c.low, bids, asks);
        const sweptVol = Math.round(c.volume * wickRatio * 1.5);
        const targetPrice = +(prev.high + 2.5).toFixed(2);

        sweepNodes.push({
          id: `candle-sweep-bull-${c.time}`,
          type: 'CANDLE_SWEEP_BULL',
          price: c.low,
          time: c.time,
          candleIndex: i,
          label: `Candle SSL Sweep (+$${sweepDepth.toFixed(2)})`,
          strength: 4,
          volume: sweptVol,
          testedCount: isBroken ? 2 : 1,
          status: isBroken ? 'BROKEN' : 'ACTIVE',
          description: `Bullish Candle Sweep: Wick probed $${sweepDepth.toFixed(2)} below prior candle low ($${prev.low.toFixed(2)}) and rejected with ${(wickRatio * 100).toFixed(0)}% lower wick absorption.`,
          targetExtension: targetPrice,
          color: '#10b981', // Emerald
          liquidityDensity: density,
          liquiditySweep: {
            sweepType: 'CANDLE',
            sweepSide: 'SSL',
            sweptLevel: prev.low,
            sweepExtreme: c.low,
            sweepDepth,
            sweptVolumeOz: sweptVol,
            wickRejectionRatio: +wickRatio.toFixed(2),
            targetReversalPrice: targetPrice,
            isMitigated: isBroken,
          },
        });
      }
    }

    // Bearish Candle Sweep (BSL Grab at High):
    // Wick pierces above previous candle high, but body closes back inside / below prev.high
    if (c.high > prev.high && c.close <= prev.high) {
      const sweepDepth = +(c.high - prev.high).toFixed(2);
      const upperWick = c.high - Math.max(c.open, c.close);
      const wickRatio = upperWick / cRange;

      if (sweepDepth >= 0.20 && wickRatio >= 0.25) {
        let isBroken = false;
        for (let k = i + 1; k < candles.length; k++) {
          if (candles[k].close > c.high) {
            isBroken = true;
            break;
          }
        }

        const density = calculateLiquidityDensityAroundPrice(c.high, bids, asks);
        const sweptVol = Math.round(c.volume * wickRatio * 1.5);
        const targetPrice = +(prev.low - 2.5).toFixed(2);

        sweepNodes.push({
          id: `candle-sweep-bear-${c.time}`,
          type: 'CANDLE_SWEEP_BEAR',
          price: c.high,
          time: c.time,
          candleIndex: i,
          label: `Candle BSL Sweep (+$${sweepDepth.toFixed(2)})`,
          strength: 4,
          volume: sweptVol,
          testedCount: isBroken ? 2 : 1,
          status: isBroken ? 'BROKEN' : 'ACTIVE',
          description: `Bearish Candle Sweep: Wick probed $${sweepDepth.toFixed(2)} above prior candle high ($${prev.high.toFixed(2)}) and rejected with ${(wickRatio * 100).toFixed(0)}% upper wick supply.`,
          targetExtension: targetPrice,
          color: '#f43f5e', // Rose
          liquidityDensity: density,
          liquiditySweep: {
            sweepType: 'CANDLE',
            sweepSide: 'BSL',
            sweptLevel: prev.high,
            sweepExtreme: c.high,
            sweepDepth,
            sweptVolumeOz: sweptVol,
            wickRejectionRatio: +wickRatio.toFixed(2),
            targetReversalPrice: targetPrice,
            isMitigated: isBroken,
          },
        });
      }
    }
  }

  // 2. Major Swing Liquidity Sweeps / Turtle Soup (optional, only if includeTurtleSoup is true)
  if (includeTurtleSoup) {
    for (const pivot of pivots) {
      for (let k = pivot.index + 2; k < candles.length; k++) {
        const c = candles[k];

        // Bullish Swing Sweep (SSL Purge / Turtle Soup Long)
        if (!pivot.isHigh && c.low < pivot.price && c.close > pivot.price) {
          const sweepDepth = +(pivot.price - c.low).toFixed(2);
          if (sweepDepth >= 0.35) {
            const density = calculateLiquidityDensityAroundPrice(c.low, bids, asks);
            const targetPrice = +(pivot.price + 9.5).toFixed(2);

            sweepNodes.push({
              id: `swing-sweep-bull-${c.time}-${pivot.time}`,
              type: 'SWING_SWEEP_BULL',
              price: c.low,
              time: c.time,
              candleIndex: k,
              label: `Swing Sweep Bull (SSL Purged)`,
              strength: 5,
              volume: c.volume * 2,
              testedCount: currentPrice > pivot.price ? 1 : 2,
              status: currentPrice > pivot.price ? 'ACTIVE' : 'TESTED',
              description: `Major Swing Sweep: Institutional purge of sell stops below key swing floor ($${pivot.price.toFixed(2)}) with deep $${sweepDepth.toFixed(2)} wick rejection.`,
              targetExtension: targetPrice,
              color: '#059669', // Deep Emerald
              liquidityDensity: density,
              liquiditySweep: {
                sweepType: 'SWING',
                sweepSide: 'SSL',
                sweptLevel: pivot.price,
                sweepExtreme: c.low,
                sweepDepth,
                sweptVolumeOz: c.volume * 2,
                wickRejectionRatio: 0.65,
                targetReversalPrice: targetPrice,
                isMitigated: false,
              },
            });
            break; // Keep earliest strong confirmation per pivot
          }
        }

        // Bearish Swing Sweep (BSL Purge / Turtle Soup Short)
        if (pivot.isHigh && c.high > pivot.price && c.close < pivot.price) {
          const sweepDepth = +(c.high - pivot.price).toFixed(2);
          if (sweepDepth >= 0.35) {
            const density = calculateLiquidityDensityAroundPrice(c.high, bids, asks);
            const targetPrice = +(pivot.price - 9.5).toFixed(2);

            sweepNodes.push({
              id: `swing-sweep-bear-${c.time}-${pivot.time}`,
              type: 'SWING_SWEEP_BEAR',
              price: c.high,
              time: c.time,
              candleIndex: k,
              label: `Swing Sweep Bear (BSL Purged)`,
              strength: 5,
              volume: c.volume * 2,
              testedCount: currentPrice < pivot.price ? 1 : 2,
              status: currentPrice < pivot.price ? 'ACTIVE' : 'TESTED',
              description: `Major Swing Sweep: Institutional purge of buy stops above key swing peak ($${pivot.price.toFixed(2)}) with sharp $${sweepDepth.toFixed(2)} supply rejection.`,
              targetExtension: targetPrice,
              color: '#e11d48', // Deep Rose
              liquidityDensity: density,
              liquiditySweep: {
                sweepType: 'SWING',
                sweepSide: 'BSL',
                sweptLevel: pivot.price,
                sweepExtreme: c.high,
                sweepDepth,
                sweptVolumeOz: c.volume * 2,
                wickRejectionRatio: 0.65,
                targetReversalPrice: targetPrice,
                isMitigated: false,
              },
            });
            break;
          }
        }
      }
    }
  }

  return sweepNodes;
}

/**
 * Advanced ICT Structural Node Detection (ICT Killzones, Pivots, SMC & ChartPrime / MaxMaserati 3.0)
 */
export function detectStructuralNodes(
  candles: Candle[],
  bids: OrderBookItem[] = [],
  asks: OrderBookItem[] = [],
  htfTimeframe: HTFTimeframe = '1h',
  includeTurtleSoup: boolean = false
): PriceNode[] {
  const nodes: PriceNode[] = [];
  if (candles.length < 10) return nodes;

  const currentPrice = candles[candles.length - 1].close;

  // 1. Detect Multi-Bar Pivot Fractals (ICT Swing Highs & Swing Lows)
  const pivotPeriod = 2; // 2 left, 2 right = 5-bar pivot
  const detectedPivots: {
    index: number;
    candle: Candle;
    isHigh: boolean;
    price: number;
    time: number;
  }[] = [];

  for (let i = pivotPeriod; i < candles.length - pivotPeriod; i++) {
    const c = candles[i];
    let isHigh = true;
    let isLow = true;

    for (let j = 1; j <= pivotPeriod; j++) {
      if (candles[i - j].high >= c.high || candles[i + j].high >= c.high) {
        isHigh = false;
      }
      if (candles[i - j].low <= c.low || candles[i + j].low <= c.low) {
        isLow = false;
      }
    }

    if (isHigh) {
      detectedPivots.push({ index: i, candle: c, isHigh: true, price: c.high, time: c.time });
    } else if (isLow) {
      detectedPivots.push({ index: i, candle: c, isHigh: false, price: c.low, time: c.time });
    }
  }

  // 2. Classify Pivots into HH, LH, HL, LL & detect EQH / EQL (Equal Highs / Equal Lows)
  let prevHigh: number | null = null;
  let prevLow: number | null = null;

  for (let pIdx = 0; pIdx < detectedPivots.length; pIdx++) {
    const p = detectedPivots[pIdx];
    const kz = getCandleKillzone(p.time);
    const density = calculateLiquidityDensityAroundPrice(p.price, bids, asks);

    if (p.isHigh) {
      let swingType: 'HH' | 'LH' | 'EQH' = 'HH';
      let isSwept = currentPrice > p.price;

      if (prevHigh !== null) {
        const diffPercent = Math.abs(p.price - prevHigh) / prevHigh;
        if (diffPercent < 0.0006) {
          swingType = 'EQH';
        } else if (p.price > prevHigh) {
          swingType = 'HH';
        } else {
          swingType = 'LH';
        }
      }
      prevHigh = p.price;

      const isEQH = swingType === 'EQH';
      nodes.push({
        id: `node-pivot-high-${p.time}`,
        type: isEQH ? 'EQH' : 'SWING_HIGH',
        price: p.price,
        time: p.time,
        candleIndex: p.index,
        label: isEQH ? 'Equal Highs (BSL Pool)' : `${swingType} Peak Node`,
        strength: isEQH ? 5 : 4,
        volume: p.candle.volume * 2,
        testedCount: isSwept ? 2 : 1,
        status: isSwept ? 'SWEPT' : 'ACTIVE',
        description: isEQH
          ? `Equal Highs Buy-Side Liquidity (BSL) target at $${p.price.toFixed(2)}. Resting buy stops concentrated.`
          : `ICT ${swingType} Pivot High formed during ${kz || 'Market Session'}. Key resistance node.`,
        targetExtension: +(p.price + 8.5).toFixed(2),
        fibLevel: '0.00 (Anchor)',
        color: isEQH ? '#f43f5e' : '#fb7185',
        swingType,
        killzoneName: kz || undefined,
        liquidityDensity: density,
      });
    } else {
      let swingType: 'HL' | 'LL' | 'EQL' = 'LL';
      let isSwept = currentPrice < p.price;

      if (prevLow !== null) {
        const diffPercent = Math.abs(p.price - prevLow) / prevLow;
        if (diffPercent < 0.0006) {
          swingType = 'EQL';
        } else if (p.price > prevLow) {
          swingType = 'HL';
        } else {
          swingType = 'LL';
        }
      }
      prevLow = p.price;

      const isEQL = swingType === 'EQL';
      nodes.push({
        id: `node-pivot-low-${p.time}`,
        type: isEQL ? 'EQL' : 'SWING_LOW',
        price: p.price,
        time: p.time,
        candleIndex: p.index,
        label: isEQL ? 'Equal Lows (SSL Pool)' : `${swingType} Demand Node`,
        strength: isEQL ? 5 : 4,
        volume: p.candle.volume * 2,
        testedCount: isSwept ? 2 : 1,
        status: isSwept ? 'SWEPT' : 'ACTIVE',
        description: isEQL
          ? `Equal Lows Sell-Side Liquidity (SSL) target at $${p.price.toFixed(2)}. Resting sell stops concentrated.`
          : `ICT ${swingType} Pivot Low formed during ${kz || 'Market Session'}. Institutional demand floor.`,
        targetExtension: +(p.price - 7.5).toFixed(2),
        fibLevel: '1.00 (Base)',
        color: isEQL ? '#10b981' : '#34d399',
        swingType,
        killzoneName: kz || undefined,
        liquidityDensity: density,
      });
    }
  }

  // 3. Integrate MAXMASERATI 3.0: Liquidity Sweep of Candle & Swing Nodes
  const sweepNodes = detectLiquiditySweeps(candles, detectedPivots, bids, asks, includeTurtleSoup);
  nodes.push(...sweepNodes);

  // 4. Integrate CHARTPRIME: HTF Candle Volume Profile & POC Nodes
  const htfProfiles = buildHTFCandleProfiles(candles, htfTimeframe);
  if (htfProfiles.length > 0) {
    // Current developing HTF profile + recent completed HTF profile
    const relevantHtf = htfProfiles.slice(-3);
    for (const htf of relevantHtf) {
      const density = calculateLiquidityDensityAroundPrice(htf.pocPrice, bids, asks);

      // HTF POC Node
      nodes.push({
        id: `htf-poc-${htf.id}`,
        type: 'HTF_POC',
        price: htf.pocPrice,
        time: htf.startTime,
        candleIndex: candles.length - 1,
        label: `HTF ${htf.htfTimeframe} POC`,
        strength: 5,
        volume: htf.totalVolume,
        testedCount: htf.unmitigatedPoc ? 0 : 2,
        status: htf.unmitigatedPoc ? 'ACTIVE' : 'TESTED',
        description: `HTF ${htf.htfTimeframe} Point of Control at $${htf.pocPrice.toFixed(2)}. Maximum volume concentration node (${htf.totalVolume.toLocaleString()} oz transacted). ${htf.unmitigatedPoc ? 'Naked unmitigated POC magnet.' : 'Mitigated institutional level.'}`,
        color: '#eab308', // Amber POC
        liquidityDensity: density,
        htfProfileInfo: {
          htfTimeframe: htf.htfTimeframe,
          poc: htf.pocPrice,
          vah: htf.vahPrice,
          val: htf.valPrice,
        },
      });

      // HTF VAH Node
      nodes.push({
        id: `htf-vah-${htf.id}`,
        type: 'HTF_VAH',
        price: htf.vahPrice,
        time: htf.startTime,
        candleIndex: candles.length - 1,
        label: `HTF ${htf.htfTimeframe} VAH (70%)`,
        strength: 4,
        volume: Math.round(htf.totalVolume * 0.35),
        testedCount: 1,
        status: 'ACTIVE',
        description: `HTF ${htf.htfTimeframe} Value Area High (VAH) at $${htf.vahPrice.toFixed(2)}. 70% institutional value boundary and primary resistance.`,
        color: '#06b6d4', // Cyan
        liquidityDensity: calculateLiquidityDensityAroundPrice(htf.vahPrice, bids, asks),
        htfProfileInfo: {
          htfTimeframe: htf.htfTimeframe,
          poc: htf.pocPrice,
          vah: htf.vahPrice,
          val: htf.valPrice,
        },
      });

      // HTF VAL Node
      nodes.push({
        id: `htf-val-${htf.id}`,
        type: 'HTF_VAL',
        price: htf.valPrice,
        time: htf.startTime,
        candleIndex: candles.length - 1,
        label: `HTF ${htf.htfTimeframe} VAL (70%)`,
        strength: 4,
        volume: Math.round(htf.totalVolume * 0.35),
        testedCount: 1,
        status: 'ACTIVE',
        description: `HTF ${htf.htfTimeframe} Value Area Low (VAL) at $${htf.valPrice.toFixed(2)}. 70% institutional value boundary and primary support floor.`,
        color: '#818cf8', // Indigo
        liquidityDensity: calculateLiquidityDensityAroundPrice(htf.valPrice, bids, asks),
        htfProfileInfo: {
          htfTimeframe: htf.htfTimeframe,
          poc: htf.pocPrice,
          vah: htf.vahPrice,
          val: htf.valPrice,
        },
      });
    }
  }

  // 5. Detect ICT Fair Value Gaps (FVG)
  for (let i = 2; i < candles.length - 1; i++) {
    const c1 = candles[i - 2];
    const c2 = candles[i - 1];
    const c3 = candles[i];

    // Bullish FVG (BISI): c1.high < c3.low
    if (c3.low > c1.high && c2.close > c2.open) {
      const gapSize = c3.low - c1.high;
      if (gapSize > 0.40) {
        const midPrice = +((c3.low + c1.high) / 2).toFixed(2);
        let isMitigated = false;
        for (let k = i + 1; k < candles.length; k++) {
          if (candles[k].low <= midPrice) {
            isMitigated = true;
            break;
          }
        }

        const density = calculateLiquidityDensityAroundPrice(midPrice, bids, asks);
        nodes.push({
          id: `fvg-bull-${c2.time}`,
          type: 'FVG_BULL',
          price: midPrice,
          time: c2.time,
          candleIndex: i - 1,
          label: `Bullish FVG (+BISI)`,
          strength: isMitigated ? 2 : 4,
          volume: c2.volume,
          testedCount: isMitigated ? 2 : 0,
          status: isMitigated ? 'TESTED' : 'ACTIVE',
          description: `Bullish Fair Value Gap between $${c1.high.toFixed(2)} and $${c3.low.toFixed(2)}. ${isMitigated ? 'Partially mitigated' : 'Unmitigated institutional imbalance'}.`,
          color: '#06b6d4',
          fvgTop: c3.low,
          fvgBottom: c1.high,
          isMitigated,
          liquidityDensity: density,
        });
      }
    }

    // Bearish FVG (SIBI): c1.low > c3.high
    if (c1.low > c3.high && c2.close < c2.open) {
      const gapSize = c1.low - c3.high;
      if (gapSize > 0.40) {
        const midPrice = +((c1.low + c3.high) / 2).toFixed(2);
        let isMitigated = false;
        for (let k = i + 1; k < candles.length; k++) {
          if (candles[k].high >= midPrice) {
            isMitigated = true;
            break;
          }
        }

        const density = calculateLiquidityDensityAroundPrice(midPrice, bids, asks);
        nodes.push({
          id: `fvg-bear-${c2.time}`,
          type: 'FVG_BEAR',
          price: midPrice,
          time: c2.time,
          candleIndex: i - 1,
          label: `Bearish FVG (-SIBI)`,
          strength: isMitigated ? 2 : 4,
          volume: c2.volume,
          testedCount: isMitigated ? 2 : 0,
          status: isMitigated ? 'TESTED' : 'ACTIVE',
          description: `Bearish Fair Value Gap between $${c3.high.toFixed(2)} and $${c1.low.toFixed(2)}. ${isMitigated ? 'Partially mitigated' : 'Unmitigated sell-side imbalance'}.`,
          color: '#f97316',
          fvgTop: c1.low,
          fvgBottom: c3.high,
          isMitigated,
          liquidityDensity: density,
        });
      }
    }
  }

  // 6. Detect ICT Order Blocks (OB)
  for (let i = 3; i < candles.length - 2; i++) {
    const c = candles[i];
    const nextC = candles[i + 1];
    const afterC = candles[i + 2];

    const isBearish = c.close < c.open;
    const isStrongExpansionUp = nextC.close > c.high && (afterC.close - c.close) > 2.5;

    if (isBearish && isStrongExpansionUp) {
      const obPrice = +( (c.high + c.low) / 2 ).toFixed(2);
      const density = calculateLiquidityDensityAroundPrice(obPrice, bids, asks);

      nodes.push({
        id: `ob-bull-${c.time}`,
        type: 'ORDER_BLOCK_BULL',
        price: obPrice,
        time: c.time,
        candleIndex: i,
        label: `Bullish Order Block (+OB)`,
        strength: 5,
        volume: c.volume * 3,
        testedCount: currentPrice < c.high ? 1 : 0,
        status: 'ACTIVE',
        description: `Institutional Bullish Order Block at $${obPrice.toFixed(2)}. High probability buy re-entry mitigation zone.`,
        targetExtension: +(obPrice + 12.0).toFixed(2),
        color: '#10b981',
        liquidityDensity: density,
      });
      break;
    }
  }

  for (let i = 3; i < candles.length - 2; i++) {
    const c = candles[i];
    const nextC = candles[i + 1];
    const afterC = candles[i + 2];

    const isBullish = c.close > c.open;
    const isStrongExpansionDown = nextC.close < c.low && (c.close - afterC.close) > 2.5;

    if (isBullish && isStrongExpansionDown) {
      const obPrice = +( (c.high + c.low) / 2 ).toFixed(2);
      const density = calculateLiquidityDensityAroundPrice(obPrice, bids, asks);

      nodes.push({
        id: `ob-bear-${c.time}`,
        type: 'ORDER_BLOCK_BEAR',
        price: obPrice,
        time: c.time,
        candleIndex: i,
        label: `Bearish Order Block (-OB)`,
        strength: 5,
        volume: c.volume * 3,
        testedCount: currentPrice > c.low ? 1 : 0,
        status: 'ACTIVE',
        description: `Institutional Bearish Order Block at $${obPrice.toFixed(2)}. High probability short mitigation supply node.`,
        targetExtension: +(obPrice - 12.0).toFixed(2),
        color: '#f43f5e',
        liquidityDensity: density,
      });
      break;
    }
  }

  // 7. Break of Structure (BOS) & Market Structure Shift (CHoCH / MSS)
  const highs = nodes.filter(n => n.type === 'SWING_HIGH' || n.type === 'EQH');
  const lows = nodes.filter(n => n.type === 'SWING_LOW' || n.type === 'EQL');

  if (highs.length > 0) {
    const lastHigh = highs[highs.length - 1];
    if (currentPrice > lastHigh.price) {
      lastHigh.status = 'SWEPT';
      const density = calculateLiquidityDensityAroundPrice(lastHigh.price, bids, asks);
      nodes.push({
        id: `bos-bullish`,
        type: 'BOS',
        price: lastHigh.price,
        time: Date.now(),
        candleIndex: candles.length - 1,
        label: `Bullish BOS Node`,
        strength: 5,
        volume: 850,
        testedCount: 1,
        status: 'ACTIVE',
        description: `Bullish Break of Structure confirmed above previous structural high ($${lastHigh.price.toFixed(2)}). Trend continuation confirmed.`,
        targetExtension: +(lastHigh.price + 10.0).toFixed(2),
        color: '#06b6d4',
        liquidityDensity: density,
      });
    }
  }

  if (lows.length > 0) {
    const lastLow = lows[lows.length - 1];
    if (currentPrice < lastLow.price) {
      lastLow.status = 'SWEPT';
      const density = calculateLiquidityDensityAroundPrice(lastLow.price, bids, asks);
      nodes.push({
        id: `bos-bearish`,
        type: 'BOS',
        price: lastLow.price,
        time: Date.now(),
        candleIndex: candles.length - 1,
        label: `Bearish BOS Node`,
        strength: 5,
        volume: 910,
        testedCount: 1,
        status: 'ACTIVE',
        description: `Bearish Break of Structure confirmed below previous structural low ($${lastLow.price.toFixed(2)}). Downside liquidity run in progress.`,
        targetExtension: +(lastLow.price - 10.0).toFixed(2),
        color: '#f97316',
        liquidityDensity: density,
      });
    }
  }

  return nodes;
}
