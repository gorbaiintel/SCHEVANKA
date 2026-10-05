export interface GroundingSource {
  title: string;
  url: string;
}

export interface GoldHeadlineItem {
  id: string;
  title: string;
  source: string;
  url?: string;
  country?: string; // Currency / Country code from Forex Factory e.g. 'USD', 'JPY', 'EUR', 'GBP', 'CAD', 'AUD', 'CNY', 'All'
  eventDate?: string; // ISO date string from Forex Factory calendar
  actual?: string;
  forecast?: string;
  previous?: string;
  ffImpact?: 'High' | 'Medium' | 'Low' | 'Holiday';
  category: 'Fed & Macro' | 'Geopolitics' | 'Central Banks' | 'DXY & Yields' | 'Physical & Flows';
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  sentimentScore?: number; // Normalized score: -100 (Max Bearish) to +100 (Max Bullish) or 0 to 100
  impactScore?: number; // 0 to 100 indicating market volatility / liquidity displacement
  estimatedPips?: string; // Estimated gold price move range e.g. '80-150 pips'
  analysis: string;
  published: string;
  suggestedTrade?: {
    side: 'BUY' | 'SELL';
    reason: string;
  };
}

export interface GoldHeadlinesResponse {
  success: boolean;
  source: 'forexfactory-live' | 'gemini-grounded' | 'curated-cache' | 'fallback';
  sourceUrl?: string;
  isRateLimited?: boolean;
  summary: string;
  netBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  bullishScore: number; // 0 to 100
  items: GoldHeadlineItem[];
  groundingSources: GroundingSource[];
  lastUpdated: string;
  searchQueries?: string[];
  errorMessage?: string;
}
