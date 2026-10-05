export type BotStrategyType = 
  | 'LIQUIDITY_SWEEP'
  | 'QUANT_MOMENTUM_BREAKOUT'
  | 'MEAN_REVERSION_VWAP'
  | 'DYNAMIC_GRID_HEDGE'
  | 'ASIAN_SESSION_RANGE';

export type BotRiskProfile = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'CUSTOM';

export type BotStatus = 'IDLE' | 'ARMED' | 'SCANNING' | 'SIGNAL_DETECTED' | 'EXECUTING' | 'COOLDOWN' | 'HALTED';

export type MarketRegime = 'TRENDING_BULL' | 'TRENDING_BEAR' | 'RANGING_CONSOLIDATION' | 'VOLATILITY_EXPANSION';

export interface BotParameters {
  lotSize: number;
  riskPercent: number;
  takeProfitPips: number;
  stopLossPips: number;
  useAtrTpSl: boolean;
  atrMultiplierSl: number;
  atrMultiplierTp: number;
  trailingStopPips: number;
  breakEvenTriggerPips: number;
  maxOpenTrades: number;
  maxDailyLossUsd: number;
  maxSpreadCents: number;
  allowBuy: boolean;
  allowSell: boolean;
  martingaleMultiplier: number;
  zScoreThreshold: number;
  cooldownSeconds: number;
  tradingSession: 'ALL' | 'LONDON' | 'NEW_YORK' | 'ASIAN';
  newsFilter: boolean;
}

export interface BotTelemetry {
  status: BotStatus;
  currentRegime: MarketRegime;
  deltaZScore: number;
  rsi14: number;
  atr14: number;
  spreadCents: number;
  distanceToNearestNode: number;
  signalScore: number; // -100 (Strong Sell) to +100 (Strong Buy)
  lastAction: string;
  lastActionTime: number;
  tradesExecuted: number;
  profitableTrades: number;
  winRate: number;
  totalProfitUsd: number;
  maxDrawdownRecorded: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

export interface BotSignal {
  id: string;
  timestamp: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  confidence: number;
  strategy: BotStrategyType;
  reason: string;
  sl: number;
  tp: number;
  indicators: {
    zScore: number;
    rsi: number;
    atr: number;
    nearestZone: string;
  };
}

export interface BotLog {
  id: string;
  timestamp: number;
  level: 'INFO' | 'SCAN' | 'SIGNAL' | 'EXEC' | 'PROFIT' | 'WARN' | 'RISK';
  message: string;
}

export interface StrategyDescriptor {
  id: BotStrategyType;
  name: string;
  tagline: string;
  winRateHistorical: number;
  profitFactorHistorical: number;
  expectedRtoR: string;
  description: string;
  bestMarketCondition: string;
  badgeColor: string;
}
