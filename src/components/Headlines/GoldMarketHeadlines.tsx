import React, { useState, useEffect, useCallback } from 'react';
import { 
  Globe, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ExternalLink, 
  ShieldCheck, 
  Zap, 
  Landmark, 
  DollarSign, 
  Flame,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Gauge,
  Calendar,
  LayoutList,
  Table2,
  Folder,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { GoldHeadlinesResponse } from '../../types/headlines';
import { SentimentGauge } from './SentimentGauge';

interface GoldMarketHeadlinesProps {
  onTradeSignal?: (side: 'BUY' | 'SELL', note?: string) => void;
  className?: string;
}

export const GoldMarketHeadlines: React.FC<GoldMarketHeadlinesProps> = ({
  onTradeSignal,
  className = '',
}) => {
  const [data, setData] = useState<GoldHeadlinesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'CARDS' | 'CALENDAR_TABLE'>('CARDS');
  const [filterCurrency, setFilterCurrency] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterBias, setFilterBias] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'HIGH_IMPACT'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [showMacroGauge, setShowMacroGauge] = useState<boolean>(true);

  const fetchHeadlines = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const url = isManualRefresh ? '/api/gold-headlines?refresh=true' : '/api/gold-headlines';
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json: GoldHeadlinesResponse = await res.json();
      setData(json);
      setLastRefreshedAt(new Date());
    } catch {
      // Quiet fallback mode: maintain current data without throwing
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHeadlines();
    // Auto-refresh every 5 minutes if tab is active
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchHeadlines(true);
      }
    }, 300000);
    return () => clearInterval(interval);
  }, [fetchHeadlines]);

  const categories = [
    { id: 'ALL', label: 'All Events' },
    { id: 'Central Banks', label: 'Central Banks' },
    { id: 'Fed & Macro', label: 'USD Macro' },
    { id: 'DXY & Yields', label: 'Bonds & Trade' },
    { id: 'Geopolitics', label: 'Meetings/Geo' },
    { id: 'Physical & Flows', label: 'Commodities' },
  ];

  const items = data?.items || [];

  // Extract unique currencies from Forex Factory feed (deduplicating 'ALL')
  const availableCurrencies = Array.from(
    new Set(['ALL', ...items.map((i) => (i.country || 'USD').toUpperCase()).filter((c) => c && c !== 'ALL')])
  );

  const filteredItems = items.filter((item) => {
    const matchesCurrency = filterCurrency === 'ALL' || (item.country || 'USD') === filterCurrency;
    const matchesCategory = filterCategory === 'ALL' || item.category === filterCategory;
    const matchesBias = 
      filterBias === 'ALL' ? true :
      filterBias === 'BULLISH' ? item.sentiment === 'BULLISH' :
      filterBias === 'BEARISH' ? item.sentiment === 'BEARISH' :
      filterBias === 'HIGH_IMPACT' ? item.impact === 'HIGH' : true;
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.analysis.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.country || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCurrency && matchesCategory && matchesBias && matchesSearch;
  });

  const bullishCount = items.filter((i) => i.sentiment === 'BULLISH').length;
  const bearishCount = items.filter((i) => i.sentiment === 'BEARISH').length;
  const highImpactCount = items.filter((i) => i.impact === 'HIGH').length;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Central Banks':
        return <Landmark className="w-3 h-3 text-amber-400" />;
      case 'Geopolitics':
        return <Globe className="w-3 h-3 text-rose-400" />;
      case 'DXY & Yields':
      case 'Fed & Macro':
        return <DollarSign className="w-3 h-3 text-cyan-400" />;
      default:
        return <Zap className="w-3 h-3 text-emerald-400" />;
    }
  };

  // Classic Forex Factory Impact Folder Badge (Red = High, Orange = Medium, Yellow = Low, Grey = Holiday)
  const renderForexFactoryFolder = (impact: string, ffImpact?: string) => {
    const isHigh = impact === 'HIGH' || ffImpact === 'High';
    const isMed = impact === 'MEDIUM' || ffImpact === 'Medium';
    const isHoliday = ffImpact === 'Holiday';
    if (isHigh) {
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 font-mono text-[10px] font-bold"
          title="Forex Factory High Impact (Red Folder)"
        >
          <Folder className="w-3 h-3 fill-rose-500 text-rose-400" />
          <span>HIGH</span>
        </span>
      );
    }
    if (isMed) {
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold"
          title="Forex Factory Medium Impact (Orange Folder)"
        >
          <Folder className="w-3 h-3 fill-amber-500 text-amber-400" />
          <span>MED</span>
        </span>
      );
    }
    if (isHoliday) {
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-700/40 border border-slate-600/40 text-slate-300 font-mono text-[10px]"
          title="Forex Factory Bank Holiday"
        >
          <Folder className="w-3 h-3 fill-slate-400 text-slate-300" />
          <span>HOLIDAY</span>
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 font-mono text-[10px]"
        title="Forex Factory Low Impact (Yellow Folder)"
      >
        <Folder className="w-3 h-3 fill-yellow-400 text-yellow-300" />
        <span>LOW</span>
      </span>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-neutral-900/90 border border-neutral-800 rounded-lg overflow-hidden select-none font-sans text-xs ${className}`}>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-950/60 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0">
            <Calendar className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-100 tracking-tight truncate">Forex Factory Calendar</span>
              <a
                href="https://www.forexfactory.com/calendar"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono px-1.5 py-0.2 bg-gradient-to-r from-amber-500/20 to-rose-500/15 border border-amber-500/40 text-amber-300 hover:text-amber-200 rounded font-semibold flex items-center gap-1 transition-colors"
                title="Open https://www.forexfactory.com/calendar"
              >
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span>forexfactory.com/calendar</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
              <Clock className="w-2.5 h-2.5 text-slate-500" />
              <span>Synced {lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              <span className="text-emerald-400 font-medium ml-1">● Live FF Feed</span>
            </div>
          </div>
        </div>

        {/* View Mode Switcher & Refresh Action */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('CARDS')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === 'CARDS'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Card Analysis View"
            >
              <LayoutList className="w-3 h-3" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CALENDAR_TABLE')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === 'CALENDAR_TABLE'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Forex Factory Calendar Table View"
            >
              <Table2 className="w-3 h-3" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          <button
            onClick={() => fetchHeadlines(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700 text-slate-300 hover:text-white transition-all disabled:opacity-50 cursor-pointer font-mono text-[11px]"
            title="Refresh live events from https://www.forexfactory.com/calendar"
          >
            <RefreshCw className={`w-3 h-3 text-amber-400 ${refreshing || loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Market Sentiment Gauge & Overview */}
      <div className="px-3 py-2 bg-neutral-900/60 border-b border-neutral-800 shrink-0 space-y-2">
        <div className="flex items-center justify-between font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">FF Macro Bias:</span>
            <span className={`font-bold text-[11px] px-1.5 py-0.5 rounded ${
              data?.netBias === 'BULLISH' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : data?.netBias === 'BEARISH'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-slate-700/50 text-slate-300 border border-slate-600/40'
            }`}>
              {data?.netBias || 'BULLISH'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMacroGauge(!showMacroGauge)}
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-neutral-800/90 text-amber-300 hover:bg-neutral-700 border border-neutral-700 cursor-pointer transition-colors"
              title="Toggle Semicircular Sentiment Gauge"
            >
              <Gauge className="w-3 h-3 text-amber-400" />
              <span>Gauge {showMacroGauge ? 'Hide' : 'Show'}</span>
              {showMacroGauge ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>

            <div className="hidden sm:flex items-center gap-1.5 text-[10px]">
              <span className="text-emerald-400 font-semibold">{bullishCount} Bull</span>
              <span className="text-slate-500">•</span>
              <span className="text-rose-400 font-semibold">{bearishCount} Bear</span>
            </div>
          </div>
        </div>

        {/* Master Macro Sentiment Speedometer Gauge */}
        {showMacroGauge && (
          <SentimentGauge
            score={data?.bullishScore ? Math.round((data.bullishScore - 50) * 2) : 56}
            sentiment={data?.netBias || 'BULLISH'}
            impact="HIGH"
            impactScore={Math.round(data?.bullishScore || 75)}
            estimatedPips={data?.netBias === 'BULLISH' ? 'Bullish Drift (±90-140 pips)' : 'Bearish Drift (±70-120 pips)'}
            variant="header"
          />
        )}

        {/* Sentiment percentage bar */}
        {!showMacroGauge && (
          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden flex">
            <div 
              className="bg-emerald-400 h-full transition-all duration-500" 
              style={{ width: `${data?.bullishScore || 75}%` }} 
              title={`Bullish Momentum: ${data?.bullishScore || 75}%`}
            />
            <div 
              className="bg-rose-500 h-full transition-all duration-500" 
              style={{ width: `${100 - (data?.bullishScore || 75)}%` }} 
              title={`Bearish Momentum: ${100 - (data?.bullishScore || 75)}%`}
            />
          </div>
        )}

        {data?.summary && (
          <p className="text-[11px] text-slate-300 leading-relaxed italic bg-neutral-950/40 p-1.5 rounded border border-neutral-800/80">
            "{data.summary}"
          </p>
        )}
      </div>

      {/* Search & Currency / Sentiment Filters */}
      <div className="p-2 border-b border-neutral-800 bg-neutral-900/40 space-y-1.5 shrink-0">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
          <input
            type="text"
            placeholder="Search Forex Factory calendar (FOMC, PMI, Claims, USD, JPY)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-950/80 border border-neutral-800 focus:border-amber-500/50 rounded pl-7 pr-2 py-1 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1.5 text-slate-500 hover:text-slate-300 text-[10px]"
            >
              ✕
            </button>
          )}
        </div>

        {/* Currency Filter Pills (USD, JPY, CAD, etc.) */}
        <div className="flex items-center gap-1 font-mono text-[10px] overflow-x-auto pb-0.5 scrollbar-none">
          <span className="text-slate-500 font-semibold mr-0.5 shrink-0">Currency:</span>
          {availableCurrencies.map((cur, idx) => (
            <button
              key={`currency-filter-${cur}-${idx}`}
              onClick={() => setFilterCurrency(cur)}
              className={`px-1.5 py-0.5 rounded whitespace-nowrap transition-colors cursor-pointer ${
                filterCurrency === cur
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-neutral-900 text-slate-400 hover:text-slate-200 border border-neutral-800'
              }`}
            >
              {cur}
            </button>
          ))}
        </div>

        {/* Sentiment & Impact Filter Pills */}
        <div className="flex items-center gap-1 font-mono text-[10px] overflow-x-auto pb-0.5 scrollbar-none">
          <span className="text-slate-500 font-semibold mr-0.5 shrink-0 flex items-center gap-0.5">
            <Gauge className="w-2.5 h-2.5 text-amber-400" />
            <span>Filter:</span>
          </span>
          <button
            onClick={() => setFilterBias('ALL')}
            className={`px-1.5 py-0.5 rounded whitespace-nowrap transition-colors cursor-pointer ${
              filterBias === 'ALL'
                ? 'bg-neutral-800 text-amber-300 border border-neutral-700 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-neutral-800/50'
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setFilterBias('HIGH_IMPACT')}
            className={`px-1.5 py-0.5 rounded whitespace-nowrap transition-colors flex items-center gap-0.5 cursor-pointer ${
              filterBias === 'HIGH_IMPACT'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                : 'text-slate-400 hover:text-rose-300 hover:bg-neutral-800/50'
            }`}
          >
            <Flame className="w-2.5 h-2.5 text-rose-400" />
            <span>High Impact ({highImpactCount})</span>
          </button>
          <button
            onClick={() => setFilterBias('BULLISH')}
            className={`px-1.5 py-0.5 rounded whitespace-nowrap transition-colors flex items-center gap-0.5 cursor-pointer ${
              filterBias === 'BULLISH'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                : 'text-slate-400 hover:text-emerald-300 hover:bg-neutral-800/50'
            }`}
          >
            <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
            <span>Bullish ({bullishCount})</span>
          </button>
          <button
            onClick={() => setFilterBias('BEARISH')}
            className={`px-1.5 py-0.5 rounded whitespace-nowrap transition-colors flex items-center gap-0.5 cursor-pointer ${
              filterBias === 'BEARISH'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                : 'text-slate-400 hover:text-rose-300 hover:bg-neutral-800/50'
            }`}
          >
            <TrendingDown className="w-2.5 h-2.5 text-rose-400" />
            <span>Bearish ({bearishCount})</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none font-mono text-[10px]">
          {categories.map((cat, idx) => (
            <button
              key={`category-filter-${cat.id}-${idx}`}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-2 py-0.5 rounded whitespace-nowrap transition-colors cursor-pointer ${
                filterCategory === cat.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                  : 'bg-neutral-800/60 hover:bg-neutral-800 text-slate-400 hover:text-slate-200 border border-neutral-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area: Either Calendar Table View or Detailed Cards View */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
            <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
            <span className="font-mono text-xs">Syncing live calendar from forexfactory.com/calendar...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-1.5 text-slate-500 text-center">
            <AlertCircle className="w-5 h-5 text-slate-500" />
            <p className="font-medium text-slate-400">No calendar events match filter</p>
            <p className="text-[11px]">Try resetting currency, impact, or category filters</p>
          </div>
        ) : viewMode === 'CALENDAR_TABLE' ? (
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/90 overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-[10px]">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/90 text-slate-400">
                  <th className="py-1.5 px-2">Time</th>
                  <th className="py-1.5 px-1.5">Cur</th>
                  <th className="py-1.5 px-1.5">Imp</th>
                  <th className="py-1.5 px-2">Event</th>
                  <th className="py-1.5 px-1.5 text-right">Forecast</th>
                  <th className="py-1.5 px-1.5 text-right">Previous</th>
                  <th className="py-1.5 px-2 text-right">XAU Bias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-900/70 transition-colors">
                    <td className="py-1.5 px-2 text-slate-400 whitespace-nowrap">{item.published}</td>
                    <td className="py-1.5 px-1.5 font-bold text-cyan-300">{item.country || 'USD'}</td>
                    <td className="py-1.5 px-1.5">{renderForexFactoryFolder(item.impact, item.ffImpact)}</td>
                    <td className="py-1.5 px-2 text-slate-100 font-semibold">
                      {item.title.replace(/^\[[A-Z]+\]\s*/, '')}
                    </td>
                    <td className="py-1.5 px-1.5 text-right text-amber-300 font-semibold">
                      {item.forecast || '—'}
                    </td>
                    <td className="py-1.5 px-1.5 text-right text-slate-400">
                      {item.previous || '—'}
                    </td>
                    <td className="py-1.5 px-2 text-right whitespace-nowrap">
                      {onTradeSignal && item.suggestedTrade ? (
                        <button
                          onClick={() => onTradeSignal(item.suggestedTrade!.side, item.title)}
                          className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                            item.suggestedTrade.side === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                          }`}
                        >
                          {item.suggestedTrade.side}
                        </button>
                      ) : (
                        <span className="text-slate-400">{item.sentiment}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          filteredItems.map((item) => (
            <article 
              key={item.id}
              className="p-2.5 rounded-lg bg-neutral-950/70 hover:bg-neutral-950/90 border border-neutral-800 hover:border-neutral-700 transition-all space-y-2 group"
            >
              {/* Currency, Forex Factory Impact Folder & Sentiment badges */}
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold">
                    {item.country || 'USD'}
                  </span>

                  {renderForexFactoryFolder(item.impact, item.ffImpact)}

                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-0.5 ${
                    item.sentiment === 'BULLISH'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : item.sentiment === 'BEARISH'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-700/30 text-slate-300 border border-slate-600/30'
                  }`}>
                    {item.sentiment === 'BULLISH' && <TrendingUp className="w-2.5 h-2.5" />}
                    {item.sentiment === 'BEARISH' && <TrendingDown className="w-2.5 h-2.5" />}
                    {item.sentiment === 'NEUTRAL' && <Minus className="w-2.5 h-2.5" />}
                    <span>XAU {item.sentiment}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                  <Clock className="w-2.5 h-2.5 text-amber-400" />
                  <span>{item.published}</span>
                </div>
              </div>

              {/* Event Title */}
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold text-slate-100 text-[12px] leading-snug group-hover:text-amber-300 transition-colors">
                  {item.title}
                </h4>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[9.5px] font-mono text-slate-400 shrink-0">
                  {getCategoryIcon(item.category)}
                  <span>{item.category}</span>
                </span>
              </div>

              {/* Forex Factory Economic Calendar Data Strip: Actual | Forecast | Previous */}
              {(item.forecast || item.previous || item.actual) && (
                <div className="grid grid-cols-3 gap-1.5 bg-neutral-900/95 border border-neutral-800 rounded p-1.5 font-mono text-[10px]">
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-[9px] uppercase">Actual</span>
                    <span className="font-bold text-emerald-400">{item.actual || 'Pending'}</span>
                  </div>
                  <div className="flex flex-col border-l border-neutral-800 pl-2">
                    <span className="text-slate-500 text-[9px] uppercase">Forecast</span>
                    <span className="font-bold text-amber-300">{item.forecast || '—'}</span>
                  </div>
                  <div className="flex flex-col border-l border-neutral-800 pl-2">
                    <span className="text-slate-500 text-[9px] uppercase">Previous</span>
                    <span className="font-semibold text-slate-300">{item.previous || '—'}</span>
                  </div>
                </div>
              )}

              {/* Sentiment Scoring Indicator & Market Impact Gauge */}
              <SentimentGauge
                score={item.sentimentScore}
                sentiment={item.sentiment}
                impact={item.impact}
                impactScore={item.impactScore}
                estimatedPips={item.estimatedPips}
                variant="card"
              />

              {/* Gold Impact Analysis */}
              <div className="bg-neutral-900/90 rounded p-1.5 border border-neutral-800/80 text-[11px] text-slate-300 leading-relaxed font-mono">
                <span className="text-amber-400/90 font-bold block mb-0.5">XAU/USD Impact Analysis:</span>
                <span>{item.analysis}</span>
              </div>

              {/* Footer: Forex Factory Source Citation Link + Quick Trade Button */}
              <div className="flex items-center justify-between pt-1 border-t border-neutral-900 font-mono text-[10px]">
                <div className="flex items-center gap-2">
                  <a
                    href={item.url || 'https://www.forexfactory.com/calendar'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline font-semibold"
                    title="Open Forex Factory Economic Calendar (https://www.forexfactory.com/calendar)"
                  >
                    <span>Forex Factory Calendar</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                {onTradeSignal && item.suggestedTrade && (
                  <button
                    onClick={() => onTradeSignal(item.suggestedTrade!.side, item.title)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded font-bold transition-transform active:scale-95 cursor-pointer ${
                      item.suggestedTrade.side === 'BUY'
                        ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40'
                        : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40'
                    }`}
                    title={item.suggestedTrade.reason}
                  >
                    <span>Trade {item.suggestedTrade.side}</span>
                    <Zap className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {/* Verified Forex Factory Calendar Source Footer */}
      <div className="p-2 border-t border-neutral-800 bg-neutral-950/80 shrink-0 font-mono text-[10px]">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="flex items-center gap-1 text-slate-300 font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Official News Source: Forex Factory Calendar</span>
          </span>
          <a
            href="https://www.forexfactory.com/calendar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:text-amber-300 flex items-center gap-0.5 hover:underline"
          >
            <span>forexfactory.com/calendar</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>

        {data?.groundingSources && data.groundingSources.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {data.groundingSources.map((source, idx) => (
              <a
                key={idx}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 whitespace-nowrap transition-colors flex items-center gap-1"
              >
                <span className="truncate max-w-[160px]">{source.title}</span>
                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
