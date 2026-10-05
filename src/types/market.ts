export interface Candle {
  time: number; // Unix timestamp in seconds or ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '1s' | '1m' | '5m' | '15m' | '1h' | '4h' | '1D';

export type ChartType = 'candles' | 'line' | 'heikin_ashi';

export type NodeChartMode = 'structure' | 'strategy_flow' | 'volume_profile' | 'dom';

export type NodeCategory = 
  | 'SWING_HIGH' 
  | 'SWING_LOW' 
  | 'ORDER_BLOCK_BULL' 
  | 'ORDER_BLOCK_BEAR' 
  | 'LIQUIDITY_POOL' 
  | 'HVN' 
  | 'LVN' 
  | 'BOS' 
  | 'CHOCH'
  | 'FVG_BULL'
  | 'FVG_BEAR'
  | 'EQH'
  | 'EQL'
  | 'KILLZONE_PIVOT'
  | 'CANDLE_SWEEP_BULL'
  | 'CANDLE_SWEEP_BEAR'
  | 'SWING_SWEEP_BULL'
  | 'SWING_SWEEP_BEAR'
  | 'HTF_POC'
  | 'HTF_VAH'
  | 'HTF_VAL';

export type HTFTimeframe = '15m' | '1h' | '4h' | '1D';

export interface CFDCalibrationSettings {
  brokerProfile: string;
  priceOffset: number;
  spread: number;
  baseReferencePrice: number;
}

export interface LiquiditySweepDetails {
  sweepType: 'CANDLE' | 'SWING';
  sweepSide: 'BSL' | 'SSL'; // Buy-Side Liquidity (swept high) or Sell-Side Liquidity (swept low)
  sweptLevel: number; // The price level that was swept
  sweepExtreme: number; // The wick peak or trough of the sweep
  sweepDepth: number; // In dollars ($)
  sweptVolumeOz: number; // Volume absorbed during sweep
  wickRejectionRatio: number; // Rejection wick percentage
  targetReversalPrice: number; // Projected target extension
  isMitigated: boolean;
}

export interface HTFProfileBin {
  priceLow: number;
  priceHigh: number;
  priceMid: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  isPoc: boolean;
  isValueArea: boolean;
}

export interface HTFCandleProfile {
  id: string;
  htfTimeframe: HTFTimeframe;
  startTime: number;
  endTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isBullish: boolean;
  pocPrice: number;
  vahPrice: number; // Value Area High (70%)
  valPrice: number; // Value Area Low (70%)
  totalVolume: number;
  bins: HTFProfileBin[];
  isDeveloping: boolean;
  unmitigatedPoc: boolean;
  candleCount: number;
}

export interface LiquidityDensityMetrics {
  restingOz: number;
  restingUsd: number;
  imbalanceRatio: number; // e.g. 0.65 = 65% bids / 35% asks nearby
  wallType: 'BID_WALL' | 'ASK_WALL' | 'BALANCED';
  wallStrength: number; // 1 - 5
  sweepRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  densityScore: number; // 0 - 100
}

export interface PriceNode {
  id: string;
  type: NodeCategory;
  price: number;
  time: number;
  candleIndex: number;
  label: string;
  strength: number; // 1 - 5
  volume: number;
  testedCount: number;
  status: 'ACTIVE' | 'SWEPT' | 'BROKEN' | 'TESTED';
  description: string;
  targetExtension?: number;
  fibLevel?: string;
  color: string;
  // ICT specific fields
  swingType?: 'HH' | 'HL' | 'LH' | 'LL' | 'EQH' | 'EQL';
  killzoneName?: string;
  fvgTop?: number;
  fvgBottom?: number;
  isMitigated?: boolean;
  liquidityDensity?: LiquidityDensityMetrics;
  liquiditySweep?: LiquiditySweepDetails;
  htfProfileInfo?: {
    htfTimeframe: HTFTimeframe;
    poc: number;
    vah: number;
    val: number;
  };
}

export type StructuralNode = PriceNode;

export interface ICTKillzone {
  id: 'ASIAN' | 'LONDON_OPEN' | 'NY_OPEN' | 'LONDON_CLOSE';
  name: string;
  shortName: string;
  startHourUtc: number; // UTC hour
  startMinuteUtc: number;
  endHourUtc: number;
  endMinuteUtc: number;
  color: string;
  accentBg: string;
  isActive: boolean;
  description: string;
  high?: number;
  low?: number;
  pivotsCount?: number;
}

export interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  change24hPercent: number;
  high24h: number;
  low24h: number;
  volume24h: number; // in Troy Ounces
  volumeUsd24h: number;
  bid: number;
  ask: number;
  spread: number;
  lastTickDirection: 'up' | 'down' | 'same';
  timestamp: number;
  dataSource: 'LIVE_WEBSOCKET' | 'LIVE_REST' | 'SYNTHETIC_MICRO';
}

export interface StrategyNodeItem {
  id: string;
  title: string;
  category: 'FEED' | 'STRUCTURE' | 'INDICATOR' | 'FILTER' | 'EXECUTION';
  x: number;
  y: number;
  status: 'active' | 'warning' | 'triggered' | 'standby';
  description: string;
  metrics: {
    label: string;
    value: string;
    delta?: string;
    tone?: 'positive' | 'negative' | 'neutral' | 'accent';
  }[];
  connectedTo: string[];
}

export interface OrderBookItem {
  price: number;
  amount: number;
  total: number;
  percent: number;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  lots: number; // 1 lot = 100 oz of gold
  stopLoss?: number;
  takeProfit?: number;
  pnl: number;
  pnlPercent: number;
  openTime: number;
}

export interface TradeHistory {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  lots: number;
  pnl: number;
  pnlPercent: number;
  openTime: number;
  closeTime: number;
  reason: 'TP' | 'SL' | 'MANUAL';
}

export interface AccountState {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  leverage: number;
}

export interface MacroIndicator {
  name: string;
  symbol: string;
  value: string;
  change: string;
  impactOnGold: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  description: string;
}

export type BrokerPlatform = 
  | 'EXNESS'
  | 'IC_MARKETS'
  | 'XM'
  | 'MT5'
  | 'MT4'
  | 'OCTAFX'
  | 'FBS'
  | 'CTRADER'
  | 'IBKR'
  | 'OANDA'
  | 'CUSTOM';

export type AccountMode = 'REAL' | 'DEMO';

export type BrokerConnectionType = 
  | 'WEBTERMINAL'
  | 'CREDENTIALS'
  | 'METAAPI'
  | 'OANDA'
  | 'CTRADER'
  | 'CUSTOM_BRIDGE';

export interface GitHubUser {
  login: string;
  id: number;
  name?: string;
  avatar_url: string;
  html_url: string;
  bio?: string;
  public_repos?: number;
  connectedAt: number;
  tokenType: 'OAUTH' | 'PAT';
  linkedRepo?: string;
}

export interface BrokerAccount {
  id: string;
  platform: BrokerPlatform;
  platformName: string;
  accountMode: AccountMode;
  connectionType?: BrokerConnectionType;
  server: string;
  loginId: string;
  passwordMasked?: string;
  password?: string;
  currency: string;
  balance: number;
  equity?: number;
  freeMargin?: number;
  margin?: number;
  leverage: number;
  serverPingMs: number;
  connectedAt: number;
  isConnected: boolean;
  isVerifiedReal: boolean;
  routingType: 'ECN_STP' | 'RAW_SPREAD' | 'PRO_ZERO' | 'STANDARD';
  isInvestorPassword?: boolean;
  metaApiAccountId?: string;
  metaApiToken?: string;
  oandaAccountId?: string;
  oandaToken?: string;
  bridgeUrl?: string;
  webTerminalUrl?: string;
  linkedGithubRepo?: string;
  lastSyncedAt?: number;
}

export interface BrokerServerPreset {
  id: BrokerPlatform;
  name: string;
  shortName: string;
  logoColor: string;
  typicalSpread: number;
  servers: string[];
  defaultServer: string;
  routing: 'ECN_STP' | 'RAW_SPREAD' | 'PRO_ZERO' | 'STANDARD';
}
