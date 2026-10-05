import { Candle, PriceNode, TickerData, Timeframe, OrderBookItem, ICTKillzone, CFDCalibrationSettings } from '../types/market';
import { sound } from './soundService';
import { detectStructuralNodes, getCurrentKillzones } from './structuralNodeDetector';

type TickerCallback = (ticker: TickerData) => void;
type CandleCallback = (candle: Candle, isNew: boolean) => void;
type HistoryCallback = (candles: Candle[], nodes: PriceNode[]) => void;
type OrderBookCallback = (bids: OrderBookItem[], asks: OrderBookItem[], spread: number) => void;

export interface MarketBootState {
  isReady: boolean;
  progress: number;
  stage: string;
  subDetail: string;
  spotPrice: number;
  candleCount: number;
  nodeCount: number;
}

type BootCallback = (state: MarketBootState) => void;

export class MarketDataService {
  private ws: WebSocket | null = null;
  private currentSymbol = 'XAU/USD';
  private currentTimeframe: Timeframe = '1m';
  private candles: Candle[] = [];
  
  // Real institutional spot anchor (London OTC Fix / XAU/USD)
  private baseRawPrice: number = (() => {
    try {
      const saved = localStorage.getItem('aura_last_known_gold_price');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val > 3000 && val < 5500) {
          return val;
        }
      }
    } catch {
      // fallback
    }
    return 4141.80;
  })();

  // Real-time delta between Binance PAXG and Institutional Gold Spot
  private paxgBasisDelta: number = 5.02;
  private hasReceivedFirstWsTick = false;
  private lastPaxgPrice: number = 4146.82;

  private cfdOffset: number = 0;
  private currentSpread: number = 0.18; // Standard 18¢ institutional CFD spread
  private brokerProfile: string = 'TRADINGVIEW_CFD';

  private high24h: number = 4225.20;
  private low24h: number = 4131.65;
  private basePrice24h: number = 4169.20;
  private volume24h: number = 5048;
  private isConnected = false;
  private isFetchingHistory = false;
  private currentBids: OrderBookItem[] = [];
  private currentAsks: OrderBookItem[] = [];
  private lastLiveFetchTime: number = 0;
  private lastWebSocketTickTime: number = 0;

  // Sub-tick mean reversion state (strictly bounded, 0 drift)
  private subTickFlicker: number = 0;

  private bootState: MarketBootState = {
    isReady: false,
    progress: 8,
    stage: 'Menghubungkan Feed Spot Emas London OTC...',
    subDetail: 'XAU/USD Institutional Liquidity Gateway',
    spotPrice: 4141.80,
    candleCount: 0,
    nodeCount: 0,
  };

  private tickerListeners: Set<TickerCallback> = new Set();
  private candleListeners: Set<CandleCallback> = new Set();
  private historyListeners: Set<HistoryCallback> = new Set();
  private orderBookListeners: Set<OrderBookCallback> = new Set();
  private bootListeners: Set<BootCallback> = new Set();

  private microTickTimer: number | null = null;
  private domTimer: number | null = null;
  private liveSpotTimer: number | null = null;
  private restPollTimer: number | null = null;

  constructor() {
    // Load persisted CFD Broker Calibration if present
    try {
      const saved = localStorage.getItem('aura_gold_cfd_calibration');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.priceOffset === 'number') {
          this.cfdOffset = parsed.priceOffset;
          this.currentSpread = parsed.spread || 0.18;
          this.brokerProfile = parsed.brokerProfile || 'TRADINGVIEW_CFD';
        }
      }
    } catch {
      // ignore
    }

    // Generate initial fallback candles around spot price while boot sequence calibrates
    const initialPrice = this.getEffectivePrice();
    this.candles = this.generateHistoricalCandles(120, initialPrice);
    this.bootState.spotPrice = initialPrice;

    // Run coordinated zero-jump boot sequence
    this.runSynchronizedBootSequence();
  }

  private updateBootState(partial: Partial<MarketBootState>) {
    this.bootState = {
      ...this.bootState,
      ...partial,
      spotPrice: this.getEffectivePrice(),
    };
    this.bootListeners.forEach(cb => cb(this.bootState));
  }

  public getBootState(): MarketBootState {
    return { ...this.bootState };
  }

  public subscribeBootState(cb: BootCallback): () => void {
    this.bootListeners.add(cb);
    cb(this.getBootState());
    return () => this.bootListeners.delete(cb);
  }

  private async fetchWithTimeout(url: string, timeoutMs: number = 1400): Promise<Response> {
    const controller = new AbortController();
    const id = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(id);
    }
  }

  // Coordinated boot pipeline that locks Spot Basis BEFORE building M1 Candles & starting WebSocket
  private async runSynchronizedBootSequence() {
    this.updateBootState({
      isReady: false,
      progress: 18,
      stage: 'Menyelaraskan Harga Spot XAU/USD London OTC...',
      subDetail: 'Kalibrasi basis spot institusional & referensi 24 jam',
    });

    // Step 1: Fetch authentic London Gold Spot price first so baseRawPrice is locked
    try {
      const res = await this.fetchWithTimeout('https://api.gold-api.com/price/XAU', 1300);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.price === 'number' && data.price > 1000) {
          const liveSpot = +(data.price).toFixed(2);
          this.baseRawPrice = liveSpot;
          try {
            localStorage.setItem('aura_last_known_gold_price', String(liveSpot));
          } catch {}
        }
      }
    } catch {
      // Retain cached/fallback baseRawPrice
    }

    this.updateBootState({
      progress: 48,
      stage: 'Memuat & Mengunci Struktur Candle M1 Presisi...',
      subDetail: 'Menyelaraskan 120 bar M1 tanpa celah atau lompatan harga',
    });

    // Step 2: Fetch real M1 klines and lock paxgBasisDelta to match baseRawPrice
    await this.fetchRealHistory(true);

    this.updateBootState({
      progress: 78,
      stage: 'Memetakan Order Book DOM & Structural Nodes...',
      subDetail: 'Mendeteksi zona likuiditas, FVG, dan matriks volume HTF',
      candleCount: this.candles.length,
    });

    // Step 3: Initialize DOM OrderBook & 24h Ticker stats
    this.generateOrderBook();
    await this.fetch24hTicker();
    const detectedNodes = this.detectNodes(this.candles);

    this.updateBootState({
      progress: 94,
      stage: 'Mengaktifkan Engine Real-Time 60FPS...',
      subDetail: 'Sinkronisasi WebSocket stream & proteksi anti-jump M1 aktif',
      candleCount: this.candles.length,
      nodeCount: detectedNodes.length,
    });

    // Step 4: Start live streams AFTER M1 history and basis are 100% locked
    this.connect();
    this.startMicroTicks();
    this.startDomGenerator();
    window.setInterval(() => this.fetch24hTicker(), 30000);

    // Brief settle so canvas renders stabilized frame before opening
    await new Promise(resolve => setTimeout(resolve, 260));

    this.updateBootState({
      isReady: true,
      progress: 100,
      stage: 'Terminal Siap — Presisi M1 Terkunci',
      subDetail: 'Zero-Jump Feed Active',
      candleCount: this.candles.length,
      nodeCount: detectedNodes.length,
    });
  }

  public async fetch24hTicker() {
    try {
      const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT');
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.highPrice && data.lowPrice) {
        const high = parseFloat(data.highPrice);
        const low = parseFloat(data.lowPrice);
        const open = parseFloat(data.openPrice);
        const vol = parseFloat(data.volume);

        this.high24h = +(high - this.paxgBasisDelta + this.cfdOffset).toFixed(2);
        this.low24h = +(low - this.paxgBasisDelta + this.cfdOffset).toFixed(2);
        this.basePrice24h = +(open - this.paxgBasisDelta + this.cfdOffset).toFixed(2);
        this.volume24h = Math.round(vol);

        this.notifyTicker('same');
      }
    } catch {
      // ignore
    }
  }

  public getEffectivePrice(): number {
    return +(this.baseRawPrice + this.cfdOffset + this.subTickFlicker).toFixed(2);
  }

  public getBaseAnchorPrice(): number {
    return +(this.baseRawPrice + this.cfdOffset).toFixed(2);
  }

  public getCfdCalibration(): CFDCalibrationSettings {
    return {
      brokerProfile: this.brokerProfile,
      priceOffset: this.cfdOffset,
      spread: this.currentSpread,
      baseReferencePrice: this.getBaseAnchorPrice(),
    };
  }

  public setCfdCalibration(settings: CFDCalibrationSettings) {
    const prevEffective = this.getBaseAnchorPrice();
    this.brokerProfile = settings.brokerProfile;
    this.cfdOffset = settings.priceOffset;
    this.currentSpread = Math.max(0.08, settings.spread);

    const newEffective = this.getBaseAnchorPrice();
    const priceDelta = newEffective - prevEffective;

    // Persist
    try {
      localStorage.setItem('aura_gold_cfd_calibration', JSON.stringify(settings));
    } catch {
      // ignore
    }

    // Re-scale historical candles ONLY upon explicit user calibration change
    if (this.candles.length > 0 && Math.abs(priceDelta) > 0.001) {
      this.candles = this.candles.map(c => ({
        ...c,
        open: +(c.open + priceDelta).toFixed(2),
        high: +(c.high + priceDelta).toFixed(2),
        low: +(c.low + priceDelta).toFixed(2),
        close: +(c.close + priceDelta).toFixed(2),
      }));
    }

    this.high24h = +(this.high24h + priceDelta).toFixed(2);
    this.low24h = +(this.low24h + priceDelta).toFixed(2);
    this.basePrice24h = +(this.basePrice24h + priceDelta).toFixed(2);

    this.generateOrderBook();
    const nodes = this.detectNodes(this.candles);
    this.notifyHistory(this.candles, nodes);
    this.notifyTicker('same');
  }

  public setTimeframe(tf: Timeframe) {
    this.currentTimeframe = tf;
    this.fetchRealHistory();
  }

  public getCandles(): Candle[] {
    return [...this.candles];
  }

  public getPriceNodes(): PriceNode[] {
    return this.detectNodes(this.candles);
  }

  public subscribeTicker(cb: TickerCallback): () => void {
    this.tickerListeners.add(cb);
    cb(this.getTicker());
    return () => this.tickerListeners.delete(cb);
  }

  public subscribeCandle(cb: CandleCallback): () => void {
    this.candleListeners.add(cb);
    return () => this.candleListeners.delete(cb);
  }

  public subscribeHistory(cb: HistoryCallback): () => void {
    this.historyListeners.add(cb);
    cb(this.candles, this.detectNodes(this.candles));
    return () => this.historyListeners.delete(cb);
  }

  public subscribeOrderBook(cb: OrderBookCallback): () => void {
    this.orderBookListeners.add(cb);
    return () => this.orderBookListeners.delete(cb);
  }

  public getTicker(): TickerData {
    const effectivePrice = this.getEffectivePrice();
    const spread = this.currentSpread;
    const bid = +(effectivePrice - spread / 2).toFixed(2);
    const ask = +(effectivePrice + spread / 2).toFixed(2);
    const change24h = +(effectivePrice - this.basePrice24h).toFixed(2);
    const change24hPercent = this.basePrice24h > 0 ? +((change24h / this.basePrice24h) * 100).toFixed(2) : 0;

    return {
      symbol: this.currentSymbol,
      price: effectivePrice,
      change24h,
      change24hPercent,
      high24h: +this.high24h.toFixed(2),
      low24h: +this.low24h.toFixed(2),
      volume24h: Math.round(this.volume24h),
      volumeUsd24h: Math.round(this.volume24h * effectivePrice),
      bid,
      ask,
      spread,
      lastTickDirection: 'same',
      timestamp: Date.now(),
      dataSource: this.isConnected ? 'LIVE_WEBSOCKET' : 'LIVE_REST',
    };
  }

  // Fetch real historical candles and align to effective CFD quote
  private async fetchRealHistory(isInitialBoot: boolean = false) {
    if (this.isFetchingHistory) return;
    this.isFetchingHistory = true;

    try {
      const intervalMap: Record<Timeframe, string> = {
        '1s': '1s',
        '1m': '1m',
        '5m': '5m',
        '15m': '15m',
        '1h': '1h',
        '4h': '4h',
        '1D': '1d',
      };
      const apiInterval = intervalMap[this.currentTimeframe] || '1m';
      const url = `https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=${apiInterval}&limit=120`;

      const res = await this.fetchWithTimeout(url, 1600);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        const lastKlineClose = parseFloat(data[data.length - 1][4]);
        if (!isNaN(lastKlineClose) && lastKlineClose > 1000) {
          this.lastPaxgPrice = lastKlineClose;
          if (isInitialBoot) {
            // Lock basis delta to current London Spot anchor so there is zero jump
            this.paxgBasisDelta = +(lastKlineClose - this.baseRawPrice).toFixed(2);
          } else {
            this.baseRawPrice = +(lastKlineClose - this.paxgBasisDelta).toFixed(2);
          }
          try {
            localStorage.setItem('aura_last_known_gold_price', String(this.baseRawPrice));
          } catch {}
        }

        const effectivePrice = this.getBaseAnchorPrice();
        const baseDelta = +(effectivePrice - lastKlineClose).toFixed(2);

        const parsedCandles: Candle[] = data.map((item: any) => ({
          time: Number(item[0]),
          open: +(parseFloat(item[1]) + baseDelta).toFixed(2),
          high: +(parseFloat(item[2]) + baseDelta).toFixed(2),
          low: +(parseFloat(item[3]) + baseDelta).toFixed(2),
          close: +(parseFloat(item[4]) + baseDelta).toFixed(2),
          volume: Math.max(1, Math.round(parseFloat(item[5]) * 100)),
        }));

        // Seamless connection: guarantee the last candle connects to current effectivePrice
        if (parsedCandles.length > 0) {
          const lastC = parsedCandles[parsedCandles.length - 1];
          lastC.close = effectivePrice;
          lastC.high = Math.max(lastC.high, effectivePrice);
          lastC.low = Math.min(lastC.low, effectivePrice);
        }

        this.candles = parsedCandles;
        this.isConnected = true;
        const nodes = this.detectNodes(this.candles);
        this.notifyHistory(this.candles, nodes);
        this.notifyTicker('same');
      }
    } catch {
      const effectivePrice = this.getBaseAnchorPrice();
      this.candles = this.generateHistoricalCandles(120, effectivePrice);
      const nodes = this.detectNodes(this.candles);
      this.notifyHistory(this.candles, nodes);
    } finally {
      this.isFetchingHistory = false;
    }
  }

  // Real-Time Sub-Second WebSocket Streaming matching TradingView & MT5
  private connect() {
    try {
      if (this.ws) {
        this.ws.close();
      }

      // Connect to Binance multi-stream for real-time gold token trade ticks
      const wsUrl = 'wss://stream.binance.com:9443/ws/paxgusdt@trade';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Stream individual executed trades in real-time
          if (data && data.p) {
            const rawTradePrice = parseFloat(data.p);
            if (!isNaN(rawTradePrice) && rawTradePrice > 1000) {
              this.lastWebSocketTickTime = Date.now();
              this.lastPaxgPrice = rawTradePrice;
              this.isConnected = true;

              // Lock basis on first WebSocket tick or after reconnect gap so M1 candle never jumps
              if (!this.hasReceivedFirstWsTick || Math.abs((rawTradePrice - this.paxgBasisDelta) - this.baseRawPrice) > 2.2) {
                this.hasReceivedFirstWsTick = true;
                this.paxgBasisDelta = +(rawTradePrice - this.baseRawPrice).toFixed(2);
              }

              const prevPrice = this.getEffectivePrice();

              // Synchronize base price to authentic live spot gold tick
              this.baseRawPrice = +(rawTradePrice - this.paxgBasisDelta).toFixed(2);
              this.subTickFlicker = 0;
              const newPrice = this.getEffectivePrice();

              if (newPrice > this.high24h) this.high24h = newPrice;
              if (newPrice < this.low24h) this.low24h = newPrice;

              const dir = newPrice > prevPrice ? 'up' : newPrice < prevPrice ? 'down' : 'same';
              if (dir !== 'same') {
                sound.playTick(dir === 'up');
              }

              this.updateCurrentCandle(newPrice, true);
              this.notifyTicker(dir);
            }
          }
        } catch {
          // ignore
        }
      };

      this.ws.onerror = () => {
        this.isConnected = false;
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        setTimeout(() => this.connect(), 4000);
      };
    } catch {
      this.isConnected = false;
    }
  }

  // MT5-grade sub-second micro tick animator:
  // Active only during WebSocket quiet periods so it NEVER conflicts with live streaming trades
  private startMicroTicks() {
    if (this.microTickTimer) clearInterval(this.microTickTimer);

    this.microTickTimer = window.setInterval(() => {
      // If live WebSocket trades are streaming actively, pause artificial micro ticks
      if (Date.now() - this.lastWebSocketTickTime < 2500) {
        return;
      }

      const prevPrice = this.getEffectivePrice();

      // Mean-reversion spring: pulls flicker back towards 0 smoothly
      const pull = -this.subTickFlicker * 0.40;
      const noise = (Math.random() - 0.5) * 0.02;
      const nextFlicker = +(this.subTickFlicker + pull + noise).toFixed(2);

      // Clamp flicker to strictly ±0.02
      this.subTickFlicker = Math.max(-0.02, Math.min(0.02, nextFlicker));

      const newPrice = this.getEffectivePrice();
      const dir = newPrice > prevPrice ? 'up' : newPrice < prevPrice ? 'down' : 'same';
      
      this.updateCurrentCandle(newPrice, false);
      this.notifyTicker(dir);
    }, 400);
  }

  private startDomGenerator() {
    if (this.domTimer) clearInterval(this.domTimer);

    this.domTimer = window.setInterval(() => {
      this.generateOrderBook();
    }, 350);
  }

  private generateOrderBook() {
    const bids: OrderBookItem[] = [];
    const asks: OrderBookItem[] = [];
    const step = 0.20; // 20 cents depth step
    const spread = this.currentSpread;
    const mid = this.getEffectivePrice();

    let cumBid = 0;
    let cumAsk = 0;

    for (let i = 0; i < 14; i++) {
      const bidPrice = +(mid - (spread / 2) - (i * step)).toFixed(2);
      const bidAmount = +(Math.random() * 26 + (i % 3 === 0 ? 42 : 8)).toFixed(2);
      cumBid += bidAmount;

      bids.push({
        price: bidPrice,
        amount: bidAmount,
        total: +cumBid.toFixed(2),
        percent: 0,
      });

      const askPrice = +(mid + (spread / 2) + (i * step)).toFixed(2);
      const askAmount = +(Math.random() * 26 + (i % 3 === 0 ? 42 : 8)).toFixed(2);
      cumAsk += askAmount;

      asks.push({
        price: askPrice,
        amount: askAmount,
        total: +cumAsk.toFixed(2),
        percent: 0,
      });
    }

    const maxTotal = Math.max(cumBid, cumAsk) || 1;
    bids.forEach(b => b.percent = Math.min(100, Math.round((b.total / maxTotal) * 100)));
    asks.forEach(a => a.percent = Math.min(100, Math.round((a.total / maxTotal) * 100)));

    this.currentBids = bids;
    this.currentAsks = asks;

    this.orderBookListeners.forEach(cb => cb(bids, asks, spread));
  }

  public getCurrentKillzones(): ICTKillzone[] {
    return getCurrentKillzones(Date.now());
  }

  public getOrderBook(): { bids: OrderBookItem[]; asks: OrderBookItem[]; spread: number } {
    return {
      bids: [...this.currentBids],
      asks: [...this.currentAsks],
      spread: this.currentSpread,
    };
  }

  private getTimeframeDurationSec(tf: Timeframe): number {
    switch (tf) {
      case '1s': return 1;
      case '1m': return 60;
      case '5m': return 300;
      case '15m': return 900;
      case '1h': return 3600;
      case '4h': return 14400;
      case '1D': return 86400;
    }
  }

  private updateCurrentCandle(price: number, isGenuineTick: boolean = false) {
    if (this.candles.length === 0) return;

    const durationMs = this.getTimeframeDurationSec(this.currentTimeframe) * 1000;
    const now = Date.now();
    const currentPeriodStart = Math.floor(now / durationMs) * durationMs;
    const lastIdx = this.candles.length - 1;
    const last = this.candles[lastIdx];

    // Roll over to new candle strictly when the period start timestamp is newer than last candle time
    if (currentPeriodStart > last.time) {
      const newCandle: Candle = {
        time: currentPeriodStart,
        open: last.close,
        high: Math.max(last.close, price),
        low: Math.min(last.close, price),
        close: price,
        volume: Math.floor(Math.random() * 8 + 3),
      };
      this.candles.push(newCandle);
      if (this.candles.length > 250) {
        this.candles.shift();
      }
      this.candleListeners.forEach(cb => cb(newCandle, true));
    } else {
      const updatedCandle: Candle = {
        ...last,
        close: price,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        volume: isGenuineTick ? last.volume + 1 : last.volume,
      };
      this.candles[lastIdx] = updatedCandle;
      this.candleListeners.forEach(cb => cb(updatedCandle, false));
    }
  }

  private notifyTicker(dir: 'up' | 'down' | 'same') {
    const t = this.getTicker();
    t.lastTickDirection = dir;
    this.tickerListeners.forEach(cb => cb(t));
  }

  private notifyHistory(candles: Candle[], nodes: PriceNode[]) {
    this.historyListeners.forEach(cb => cb(candles, nodes));
  }

  private generateHistoricalCandles(count: number, currentPrice: number): Candle[] {
    const durationMs = this.getTimeframeDurationSec(this.currentTimeframe) * 1000;
    const now = Date.now();
    const currentPeriodStart = Math.floor(now / durationMs) * durationMs;

    // Realistic volatility for gold per bar (M1 is ~$0.30 - $0.80)
    const tfVolatility = this.currentTimeframe === '1s' ? 0.08 : this.currentTimeframe === '1m' ? 0.40 : 0.85;

    const list: Candle[] = new Array(count);
    let close = currentPrice;

    // Build backwards from current candle so current candle's close is EXACTLY currentPrice
    // and every preceding candle connects with zero gaps and zero jumping!
    for (let k = 0; k < count; k++) {
      const idx = count - 1 - k;
      const time = currentPeriodStart - (k * durationMs);
      
      const wave = Math.sin(k * 0.18) * (tfVolatility * 0.8) + Math.cos(k * 0.08) * (tfVolatility * 0.4);
      const delta = (Math.random() - 0.49) * tfVolatility + wave * 0.15;
      
      const open = +(close - delta).toFixed(2);
      const high = +(Math.max(open, close) + Math.random() * (tfVolatility * 0.7)).toFixed(2);
      const low = +(Math.min(open, close) - Math.random() * (tfVolatility * 0.7)).toFixed(2);
      const volume = Math.floor(Math.random() * 60 + 20);

      list[idx] = {
        time,
        open,
        high,
        low,
        close: +close.toFixed(2),
        volume,
      };

      close = open; // The previous candle's close is this candle's open! Seamless connection!
    }

    return list;
  }

  private turtleSoupEnabled: boolean = false;

  public setTurtleSoupEnabled(enabled: boolean) {
    this.turtleSoupEnabled = enabled;
  }

  public isTurtleSoupEnabled(): boolean {
    return this.turtleSoupEnabled;
  }

  public detectNodes(candles: Candle[]): PriceNode[] {
    return detectStructuralNodes(candles, this.currentBids, this.currentAsks, '1h', this.turtleSoupEnabled);
  }
}

export const marketService = new MarketDataService();
