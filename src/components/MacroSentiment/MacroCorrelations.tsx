import React from 'react';
import { MacroIndicator } from '../../types/market';
import { TrendingUp, TrendingDown, Minus, Globe, Landmark } from 'lucide-react';

export const MacroCorrelations: React.FC = () => {
  const macroData: MacroIndicator[] = [
    {
      name: 'US Dollar Index',
      symbol: 'DXY',
      value: '100.82',
      change: '-0.34%',
      impactOnGold: 'BULLISH',
      description: 'Weaker dollar lowers gold acquisition cost for foreign reserve banks.',
    },
    {
      name: 'US 10Y Real Yield',
      symbol: 'US10Y',
      value: '1.74%',
      change: '-4.2 bps',
      impactOnGold: 'BULLISH',
      description: 'Lower real opportunity cost boosts non-yielding bullion appeal.',
    },
    {
      name: 'Central Bank Inflows',
      symbol: 'CB-GOLD',
      value: '+84.2 T',
      change: '+14.6%',
      impactOnGold: 'BULLISH',
      description: 'Sovereign de-dollarization purchases from PBoC, RBI, and Gulf funds.',
    },
    {
      name: 'Safe-Haven Risk Index',
      symbol: 'GEORISK',
      value: '72.4',
      change: '+2.8 pts',
      impactOnGold: 'BULLISH',
      description: 'Elevated geopolitical hedging supporting structural floor above $4,100.',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0b0e14] border border-neutral-800 rounded-lg overflow-hidden text-xs select-none">
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-[#0f141c]">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-slate-100">Gold Macro Drivers</span>
          <span className="text-[10px] font-mono text-slate-500">· Sovereign & Yield Factors</span>
        </div>
      </div>

      <div className="flex-1 p-2 grid grid-cols-2 gap-1.5 overflow-y-auto">
        {macroData.map((item) => (
          <div
            key={item.symbol}
            className="p-2 bg-neutral-950/70 rounded border border-neutral-800/80 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold text-slate-300 text-[11px] truncate max-w-[90px]">{item.name}</span>
                <span className="font-mono text-[9px] text-slate-500">{item.symbol}</span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-1 font-mono">
                <span className="text-xs font-bold text-slate-100">{item.value}</span>
                <span className={`text-[10px] font-semibold ${item.change.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {item.change}
                </span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-neutral-900 flex items-center justify-between text-[9px]">
              <span className="text-slate-500">Gold Bias</span>
              <span className="font-semibold text-emerald-400 font-mono flex items-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5" />
                {item.impactOnGold}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
