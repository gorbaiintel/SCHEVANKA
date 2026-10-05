# DOKUMENTASI MASTER: DESAIN ARSITEKTUR, TAMPILAN UI, & SCRIPT LENGKAP OVERLAY INDICATOR — SCHEVANKA GOLD TERMINAL & BROKERBRIDGESYNC APK

Dokumen Markdown (`.md`) ini memuat secara lengkap:
1. **Desain Arsitektur Sistem Full-Stack & Real-Time Pipeline**
2. **Desain Tampilan UI, 3-Zone Layout, & Sistem 11 Tema + 10 Candle Estetik**
3. **Script & Algoritma Lengkap 6 Overlay Indicator Kuantitatif (SMC/ICT, BigBeluga Liquidity Zones, Delta Volume Bubble Z-Score, Bloomberg Smart Channel, HTF Volume Profile, & Auto Fibonacci)**
4. **Pipeline Rendering HTML5 Canvas 60 FPS (`NodeTradingCanvas.tsx`)**
5. **Spesifikasi Biner Android `.APK` (v1 JAR PKCS#7 + v2 APK Sig Block 42) & Kode Kotlin Jetpack Compose**

---

## BAGIAN 1: DESAIN ARSITEKTUR SISTEM FULL-STACK

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                        SCHEVANKA GOLD TERMINAL (XAU/USD INSTITUTIONAL)                   │
├───────────────────────────────────────────────┬──────────────────────────────────────────┤
│               FRONTEND LAYER                  │              BACKEND LAYER               │
│  React 19 + TypeScript + Tailwind CSS v4      │  Node.js + Express + Vite Middleware     │
│                                               │                                          │
│  ┌─────────────────────────────────────────┐  │  ┌────────────────────────────────────┐  │
│  │ 1. HTML5 Canvas 60FPS Chart Engine      │  │  │ 1. Live Gold Spot & Futures Engine │  │
│  │    (NodeTradingCanvas.tsx)              │◄─┼──┤    - Multi-Feed XAU/USD Aggregator │  │
│  │    - Layer 1: Grid & ICT Killzone Bands │  │  │    - CFD Broker Spread Calibration │  │
│  │    - Layer 2: Bloomberg Smart Channel   │  │  └────────────────────────────────────┘  │
│  │    - Layer 3: HTF Candle Volume Profile │  │                                          │
│  │    - Layer 4: BigBeluga Liquidity Zones │  │  ┌────────────────────────────────────┐  │
│  │    - Layer 5: SMC Order Blocks & FVG    │  │  │ 2. Broker Bridge & SSE Gateway     │  │
│  │    - Layer 6: Candlesticks & Wicks      │  │  │    - POST /api/broker/bridge/      │  │
│  │    - Layer 7: Delta Volume Z-Bubbles    │  │  │      webhook                       │  │
│  │    - Layer 8: Structural Nodes & Fib    │  │  │    - GET  /api/broker/stream (SSE) │  │
│  │    - Layer 9: Live Bid/Ask & Positions  │  │  │    - POST /api/broker/connect      │  │
│  └─────────────────────────────────────────┘  │  │    - POST /api/broker/execute-order│  │
│                                               │  └────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────┐  │                                          │
│  │ 2. Real-Time Order Book DOM & Execution │  │  ┌────────────────────────────────────┐  │
│  │    - Level-2 Bid/Ask Liquidity Depth    │◄─┼──┤ 3. Binary Android APK Compiler     │  │
│  │    - 2-Way Crosshair Price Sync         │  │  │    (apk-builder.ts)                │  │
│  │    - Complex Quant Algo Bot Engine      │  │  │    - Binary AXML Manifest (0x0003) │  │
│  └─────────────────────────────────────────┘  │  │    - Dalvik Bytecode (classes.dex) │  │
│                                               │  │    - 4-Byte Aligned resources.arsc │  │
│  ┌─────────────────────────────────────────┐  │  │    - RSA-2048 v1 + v2 APK Signer   │  │
│  │ 3. Embedded Instant Binary APK & MD     │◄─┼──┘                                       │
│  │    (src/services/prebuiltApks.ts)       │  │                                          │
│  └─────────────────────────────────────────┘  │                                          │
└───────────────────────────────────────────────┴──────────────────────────────────────────┘
```

---

## BAGIAN 2: DESAIN TAMPILAN UI & SISTEM TEMA ESTETIK

### 2.1 Tata Letak 3-Zona Utama (Institutional Viewport Budget)
1. **Top Bar & 3-Zone Header (`src/components/Header/Header.tsx`)**:
   - **Zone 1 (Brand & Live Ticker)**: Logo Golden Dragon, Harga Spot XAU/USD Real-Time dengan animasi flash hijau/merah, Perubahan 24 Jam (`$ / %`), High/Low 24H, dan indikator latensi feed.
   - **Zone 2 (View Switcher)**: Navigasi cepat dengan shortcut keyboard:
     - `[1] Price & Nodes` (Full Interactive Chart + Overlay Indicators)
     - `[2] Strategy DAG` (Node Strategy Directed Acyclic Graph Flow)
     - `[3] Split View` (Chart + Strategy Graph berdampingan)
   - **Zone 3 (Institutional Tools & Modals)**:
     - `Hotkeys [?]` • `Layar Penuh [F]` • `FF Calendar` • `Algo Bot` • `Source GitHub` • `APK Sync` • `Studio Tema` • `Connect Broker / Sync Balance`.
2. **Main Interactive Workspace (`src/components/Chart/NodeTradingCanvas.tsx`)**:
   - Toolbar kontrol atas: Timeframe (`1m`, `5m`, `15m`, `1h`, `4h`, `1D`), Tipe Chart (`Candles`, `Hollow`, `Heikin-Ashi`, `Line`, `Area`), dan tombol pengaktif seluruh **Overlay Indicator**.
3. **Right Dock Panel (`OrderBookDOM.tsx` & `TradeExecutionPanel.tsx`)**:
   - **Tab DOM**: Order Book Level-2 dengan visualisasi *Bid/Ask Wall*, *Cumulative Volume Bars*, dan sinkronisasi *crosshair* dua arah dengan chart.
   - **Tab Trade**: Eksekusi order instan (`Market` / `Limit`), kalkulasi otomatis *Margin Required*, *Risk/Reward Ratio*, tombol cepat *Break-Even (BE)*, dan *Close All*.
   - **Tab Headlines**: Berita emas global real-time, kalender ekonomi *Forex Factory*, dan *Sentiment Gauge*.

### 2.2 Script Konfigurasi 11 Tema Terminal & 10 Preset Warna Candle (`src/types/theme.ts`)
```typescript
export type AppTheme =
  | 'obsidian'
  | 'white'
  | 'gold'
  | 'cyber'
  | 'emerald'
  | 'light'
  | 'tokyo_neon'
  | 'sakura'
  | 'nordic_ice'
  | 'midnight_violet'
  | 'warm_mocha';

export type BorderCandleStyle = 'matching' | 'contrast' | 'hollow' | 'gold' | 'neon' | 'monochrome';
export type BorderCandleWidth = '1px' | '1.5px' | '2px';

export type CandleThemeId =
  | 'tradingview'
  | 'mt5'
  | 'tokyo_neon'
  | 'gold_luxury'
  | 'nordic_ice'
  | 'sakura_dream'
  | 'violet_aurora'
  | 'emerald_mint'
  | 'monochrome_ghost'
  | 'hollow_pro';

export interface CandleThemePreset {
  id: CandleThemeId;
  name: string;
  category: 'CLASSIC' | 'AESTHETIC' | 'PRO';
  description: string;
  bullColor: string;
  bullBorder: string;
  bullWick: string;
  bearColor: string;
  bearBorder: string;
  bearWick: string;
  isHollow?: boolean;
}
```

---

## BAGIAN 3: SCRIPT LENGKAP 6 OVERLAY INDICATOR KUANTITATIF

### 3.1 OVERLAY 1: ICT Killzones, DOM Liquidity Density, & ChartPrime HTF Volume Profile (`src/services/structuralNodeDetector.ts`)
Mendeteksi sesi institusional (*Asian, London Open, New York Open, London Close*), menghitung kepadatan likuiditas *Order Book* di sekitar node harga, membentuk profil volume *Higher Timeframe (HTF)* beserta *Point of Control (POC)* dan *Naked POC*, serta mendeteksi struktur *Smart Money Concepts (Order Block, FVG, BOS, CHoCH, Liquidity Sweep)*.

```typescript
import {
  Candle,
  PriceNode,
  OrderBookItem,
  ICTKillzone,
  LiquidityDensityMetrics,
  HTFCandleProfile,
  HTFProfileBin,
  HTFTimeframe,
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
    color: '#818cf8',
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
    color: '#38bdf8',
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
    color: '#f59e0b',
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
    color: '#ec4899',
    accentBg: 'rgba(236, 72, 153, 0.10)',
    description: 'Institutional profit-taking and counter-trend liquidity rebalancing.',
  },
];

export function calculateLiquidityDensityAroundPrice(
  targetPrice: number,
  bids: OrderBookItem[],
  asks: OrderBookItem[],
  proximityRange: number = 2.0
): LiquidityDensityMetrics {
  let nearbyBidOz = 0;
  let nearbyAskOz = 0;

  for (const bid of bids) {
    if (Math.abs(bid.price - targetPrice) <= proximityRange) nearbyBidOz += bid.amount;
  }
  for (const ask of asks) {
    if (Math.abs(ask.price - targetPrice) <= proximityRange) nearbyAskOz += ask.amount;
  }

  const totalOz = nearbyBidOz + nearbyAskOz;
  const imbalanceRatio = totalOz > 0 ? nearbyBidOz / totalOz : 0.5;

  let wallType: 'BID_WALL' | 'ASK_WALL' | 'BALANCED' = 'BALANCED';
  let wallStrength = 3;
  if (nearbyBidOz > nearbyAskOz * 1.6) {
    wallType = 'BID_WALL';
    wallStrength = nearbyBidOz > nearbyAskOz * 2.5 ? 5 : 4;
  } else if (nearbyAskOz > nearbyBidOz * 1.6) {
    wallType = 'ASK_WALL';
    wallStrength = nearbyAskOz > nearbyBidOz * 2.5 ? 5 : 4;
  }

  const densityScore = Math.min(100, Math.round((totalOz / 120) * 100));
  const sweepRisk: 'HIGH' | 'MEDIUM' | 'LOW' =
    totalOz > 60 ? 'HIGH' : totalOz > 30 ? 'MEDIUM' : 'LOW';

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
```

---

### 3.2 OVERLAY 2: BigBeluga Liquidity Zones (`src/services/bigBelugaLiquidityZones.ts`)
Mendeteksi kolam likuiditas *Buy-Side (Pivot High Resistance)* dan *Sell-Side (Pivot Low Support)* dengan tinggi zona adaptif berbasis **ATR(14)** dan **Rasio Volume SMA(20)**, serta melacak apakah likuiditas sudah tersapu (*Liquidity Grabbed*) atau masih *Unmitigated*.

```typescript
import { Candle } from '../types/market';

export interface BigBelugaLiquidityZone {
  id: string;
  type: 'HIGH_ZONE' | 'LOW_ZONE';
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
  pivotLength: number;
  mode: 'dynamic' | 'simple';
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

export function detectBigBelugaLiquidityZones(
  candles: Candle[],
  config: Partial<BigBelugaConfig> = {}
): BigBelugaLiquidityZone[] {
  const cfg: BigBelugaConfig = { ...DEFAULT_BIG_BELUGA_CONFIG, ...config };
  const n = candles.length;
  if (n < cfg.pivotLength * 2 + 1) return [];

  const atrValues = calculateATR(candles, cfg.atrPeriod);
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

  for (let i = pLen; i < n - pLen; i++) {
    const cur = candles[i];
    const curAtr = atrValues[i] || 1.8;
    const curVol = cur.volume || 1;
    const avgVol = volSma[i] || 1;
    const volRatio = +(curVol / avgVol).toFixed(2);

    const volStrength: 'LOW' | 'MID' | 'HIGH' =
      volRatio >= 1.4 ? 'HIGH' : volRatio >= 0.95 ? 'MID' : 'LOW';

    if (cfg.volumeFilter === 'HIGH_ONLY' && volStrength !== 'HIGH') continue;
    if (cfg.volumeFilter === 'MID_HIGH' && volStrength === 'LOW') continue;

    let isPivotHigh = true;
    let isPivotLow = true;
    for (let offset = 1; offset <= pLen; offset++) {
      if (candles[i - offset].high >= cur.high || candles[i + offset].high > cur.high) isPivotHigh = false;
      if (candles[i - offset].low <= cur.low || candles[i + offset].low < cur.low) isPivotLow = false;
    }

    const factor = cfg.mode === 'dynamic' ? Math.min(2.0, Math.max(0.6, Math.sqrt(volRatio))) : 1.0;
    const height = +Math.max(0.4, curAtr * 0.45 * factor).toFixed(2);

    if (isPivotHigh) {
      const zoneBottom = cur.high;
      const zoneTop = +(cur.high + height).toFixed(2);
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

    if (isPivotLow) {
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

  return zones.sort((a, b) => a.pivotTime - b.pivotTime);
}
```

---

### 3.3 OVERLAY 3: Delta Volume Bubble Quant Z-Score (`src/services/deltaVolumeBubbleService.ts`)
Menghitung *Net Volume Delta (`Buy Vol - Sell Vol`)* dan *Cumulative Volume Delta (CVD)* pada setiap candle, menormalisasi dengan *Rolling Z-Score (`σ`)*, mendeteksi **Institutional Passive Absorption** (volume agresif besar yang ditahan oleh *limit wall* lawan), serta memproyeksikan garis *Unmitigated Intra-VWAP Ray*.

```typescript
import { Candle } from '../types/market';

export interface DeltaBubble {
  id: string;
  candleIndex: number;
  time: number;
  price: number; // Intra-candle VWAP
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  delta: number;
  buyVolume: number;
  sellVolume: number;
  buyPercent: number;
  zScore: number;
  volZScore: number;
  radius: number;
  type: 'BULLISH' | 'BEARISH' | 'CONFLICT';
  isAbsorption: boolean;
  isExhaustion: boolean;
  isMitigated: boolean;
  mitigatedIndex?: number;
  mitigatedPrice?: number;
  sourceUrl: string;
}

export function calculateDeltaVolumeBubbles(candles: Candle[], length = 20, zThreshold = 1.0) {
  const n = candles.length;
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
    candleBodies[i] = Math.abs(c.close - c.open);

    const buyPressure = (c.close - c.low) / range;
    const sellPressure = (c.high - c.close) / range;
    const rawDeltaRatio = Math.max(-0.95, Math.min(0.95, buyPressure - sellPressure));
    const bodyRatio = (c.close - c.open) / range;
    const deltaRatio = Math.max(-1, Math.min(1, rawDeltaRatio * 0.7 + bodyRatio * 0.3));

    const delta = Math.round(totalVol * deltaRatio);
    deltas[i] = delta;
    const buyVol = Math.round(totalVol * Math.max(0, Math.min(1, (1 + deltaRatio) / 2)));
    buyVolumes[i] = buyVol;
    sellVolumes[i] = Math.max(0, totalVol - buyVol);

    runningCvd += delta;
    cvdSeries[i] = runningCvd;
    intraVwaps[i] = +((c.open + c.high + c.low + 2 * c.close) / 5).toFixed(2);
  }

  // Rolling Z-Score calculation over lookback window
  const zScores: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - length + 1);
    const count = i - start + 1;
    let sum = 0;
    for (let k = start; k <= i; k++) sum += deltas[k];
    const mean = sum / count;
    let varSum = 0;
    for (let k = start; k <= i; k++) varSum += Math.pow(deltas[k] - mean, 2);
    const stdev = Math.sqrt(varSum / count) || 1;
    zScores[i] = +((deltas[i] - mean) / stdev).toFixed(2);
  }

  return { deltas, buyVolumes, sellVolumes, intraVwaps, zScores, cvdSeries };
}
```

---

### 3.4 OVERLAY 4: Bloomberg Auto Smart Channel (`src/services/bloombergChannelService.ts`)
Menghitung kanal regresi linier otomatis (*Auto-Lookback R² Optimization*), lengkap dengan pita deviasi standar dalam (`±1.0σ`) dan luar (`±2.0σ`), *Raff Extreme Channel*, proyeksi masa depan (*Forward Projection Bars*), sudut kemiringan (*Slope Angle*), serta sinyal *Overbought / Oversold / Equilibrium*.

```typescript
import { Candle } from '../types/market';

export function computeLinearRegressionChannel(candles: Candle[], lookback = 45, deviation = 2.0) {
  const n = candles.length;
  const startIdx = Math.max(0, n - lookback);
  const sample = candles.slice(startIdx);
  const len = sample.length;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  const yValues: number[] = new Array(len);

  for (let i = 0; i < len; i++) {
    const c = sample[i];
    const y = (c.high + c.low + c.close * 2) / 4; // Weighted Close
    yValues[i] = y;
    sumX += i;
    sumY += y;
    sumXY += i * y;
    sumXX += i * i;
  }

  const denom = len * sumXX - sumX * sumX;
  const slope = (len * sumXY - sumX * sumY) / (denom || 1);
  const intercept = (sumY - slope * sumX) / len;

  const meanY = sumY / len;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < len; i++) {
    const fitted = intercept + slope * i;
    const diff = yValues[i] - fitted;
    ssRes += diff * diff;
    ssTot += Math.pow(yValues[i] - meanY, 2);
  }

  const rSquared = ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0;
  const standardError = Math.sqrt(ssRes / Math.max(1, len - 2)) || 1.2;
  const bandDist = standardError * deviation;

  return { slope, intercept, rSquared, standardError, bandDist };
}
```

---

### 3.5 OVERLAY 5: Auto-Snap & Interactive Fibonacci Retracement (`src/services/fibonacciService.ts`)
Secara otomatis mengunci (*Auto-Snap*) ke *Swing High* dan *Swing Low* struktural paling signifikan di layar, serta merender zona *Equilibrium (50.0%)*, *Golden Pocket OTE (61.8%)*, dan *Extension Target (127.2% & 161.8%)*.

```typescript
export const FIBONACCI_LEVELS = [
  { level: 0.0, ratio: 0.0, label: '0.0%', name: 'Target', color: '#94a3b8', bgColor: 'rgba(148, 163, 184, 0.05)' },
  { level: 0.236, ratio: 0.236, label: '23.6%', name: 'Shallow', color: '#38bdf8', bgColor: 'rgba(56, 189, 248, 0.08)' },
  { level: 0.382, ratio: 0.382, label: '38.2%', name: 'Pullback', color: '#34d399', bgColor: 'rgba(52, 211, 153, 0.09)' },
  { level: 0.5, ratio: 0.5, label: '50.0%', name: 'Equilibrium (EQ)', color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.14)', isKeyZone: true },
  { level: 0.618, ratio: 0.618, label: '61.8%', name: 'Golden Pocket (OTE)', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.18)', isKeyZone: true },
  { level: 0.786, ratio: 0.786, label: '78.6%', name: 'Deep Retrace', color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.09)' },
  { level: 1.0, ratio: 1.0, label: '100.0%', name: 'Origin', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.06)' },
  { level: 1.272, ratio: 1.272, label: '127.2%', name: 'Extension 1', color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.06)' },
  { level: 1.618, ratio: 1.618, label: '161.8%', name: 'Golden Target', color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.08)' },
];
```

---

### 3.6 OVERLAY 6: Pipeline Rendering HTML5 Canvas (`src/components/Chart/NodeTradingCanvas.tsx`)
Urutan *Z-Order Layering* pada fungsi `drawCanvas()` di `NodeTradingCanvas.tsx`:
1. **Layer 0 — Background & Institutional Grid**: Merender latar sesuai tema aktif (`--terminal-bg`) beserta garis grid harga horizontal dan waktu vertikal.
2. **Layer 1 — ICT Session Killzone Shaded Bands**: Merender blok warna vertikal untuk *Asian Range*, *London Open*, *NY Open*, dan *London Close* beserta garis batas High/Low sesi.
3. **Layer 2 — Bloomberg Auto Smart Channel**: Merender poligon gradien antara *Upper Band (`+2σ`)* dan *Lower Band (`-2σ`)*, garis putus-putus *Inner Band (`±1σ`)*, *Midline Regression*, dan proyeksi masa depan (*Future Cone*).
4. **Layer 3 — ChartPrime HTF Candle Volume Profile**: Merender blok candle *Higher Timeframe* (`15m`/`1h`/`4h`/`1D`), histogram horizontal *Buy/Sell Volume Bin*, garis merah **POC (Point of Control)**, dan sinar horizontal **Naked POC**.
5. **Layer 4 — BigBeluga Liquidity Density Zones**: Merender kotak likuiditas *Buy-Side (Merah/Amber)* dan *Sell-Side (Hijau/Cyan)* dengan label rasio volume (`1.8x Vol`) dan penanda *Liquidity Grab (`⚡ GRABBED`)*.
6. **Layer 5 — SMC Order Blocks (OB) & Fair Value Gaps (FVG)**: Merender zona *Bullish/Bearish Order Block* dan celah ketidakseimbangan *FVG* yang belum termitigasi.
7. **Layer 6 — Candlesticks / Hollow / Heikin-Ashi & Volume Histogram**: Merender sumbu (*wick*), badan candle (*body*) dengan kustomisasi *Border Candle Studio*, dan bar volume di dasar chart.
8. **Layer 7 — Delta Volume Quant Z-Score Bubbles**: Merender lingkaran *Bubble Orderflow* transparan di titik *Intra-VWAP* dengan cincin luar khusus untuk **Absorption (`ABS`)** dan **Exhaustion (`EXH`)**, ditambah badge nilai `±Zσ`.
9. **Layer 8 — Structural Price Nodes, BOS/CHoCH Lines, & Fibonacci Overlay**: Merender titik node interaktif (`HH`, `HL`, `LH`, `LL`, `EQH`, `EQL`, `SWEEP`) dan level-level Fibonacci.
10. **Layer 9 — Live Bid/Ask Spread Lines, Active Positions (Entry/SL/TP), & Synced Crosshair**: Merender garis harga Bid/Ask real-time, penghitung mundur penutupan bar (*Candle Countdown Timer*), serta garis *Crosshair* yang tersinkronisasi dua arah dengan *Order Book DOM*.

---

## BAGIAN 4: SPESIFIKASI BINER ANDROID `.APK` & KODE SUMBER KOTLIN

### 4.1 Spesifikasi File Release `.APK` yang Telah Di-build
1. **`BrokerBridgeSync-v1.0.0-signed.apk`** (`com.example.brokerbridgesync`) — `22.5 KB`
   - Binary `AndroidManifest.xml` (`AXML 0x00080003`)
   - Dalvik `classes.dex` (`dex\n035\0`, SHA-1: `aed5eb3db75327c61dd24e81eb397afc513601c1`, Adler32: `0d30d28b`)
   - 4-Byte Aligned `resources.arsc` (`RES_TABLE_TYPE 0x0002`)
   - Dual Signature: `v1 (JAR PKCS#7 RSA-2048)` + `v2 (APK Sig Block 42 • ID 0x7109871a)`
2. **`SCHEVANKA-Gold-Terminal-v1.0.0-signed.apk`** (`com.schevanka.goldterminal`) — `16.4 KB`
   - DEX SHA-1: `eb82c15f935c3a888b65d8c362594d0a584a059d`, Adler32: `5e9ad05e`
   - Dual Signature: `v1 (JAR PKCS#7 RSA-2048)` + `v2 (APK Sig Block 42 • ID 0x7109871a)`

### 4.2 Perintah Build Otomatis
```bash
# Compile & tandatangani seluruh file APK (v1 + v2) dan perbarui bundle:
npm run build:apk

# Jalankan build produksi penuh:
npm run build
```
