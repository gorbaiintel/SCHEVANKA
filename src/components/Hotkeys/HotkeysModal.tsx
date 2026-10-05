import React from 'react';
import { X, Keyboard, Zap, Layout, TrendingUp, TrendingDown, Maximize2, ShieldCheck, Check } from 'lucide-react';

interface HotkeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerAction?: (actionKey: string) => void;
}

interface ShortcutItem {
  key: string;
  altKey?: string;
  label: string;
  description: string;
  badgeColor?: 'emerald' | 'rose';
  actionKey: string;
}

interface ShortcutSection {
  category: string;
  icon: React.ReactNode;
  items: ShortcutItem[];
}

export const HotkeysModal: React.FC<HotkeysModalProps> = ({
  isOpen,
  onClose,
  onTriggerAction,
}) => {
  if (!isOpen) return null;

  const shortcutSections: ShortcutSection[] = [
    {
      category: 'Workspace Views (Instant Switch)',
      icon: <Layout className="w-4 h-4 text-amber-400" />,
      items: [
        {
          key: '1',
          label: 'Node Price Chart',
          description: 'Switch to primary XAU/USD structural candlestick chart, liquidity pools & dynamic DOM overlay',
          actionKey: 'view_chart',
        },
        {
          key: '2',
          label: 'Strategy Node Graph',
          description: 'Switch to algorithmic strategy flow visualizer with real-time signal conditions & filters',
          actionKey: 'view_strategy',
        },
        {
          key: '3',
          label: 'Split View Workspace',
          description: 'Simultaneously view the live Node Price Chart and Strategy Flow side-by-side',
          actionKey: 'view_split',
        },
      ],
    },
    {
      category: 'High-Speed Market Execution',
      icon: <Zap className="w-4 h-4 text-emerald-400" />,
      items: [
        {
          key: 'B',
          altKey: 'Shift + B',
          label: 'Quick Market BUY',
          description: 'Instant market buy order execution at live Ask price via low-latency STP routing',
          badgeColor: 'emerald',
          actionKey: 'buy_market',
        },
        {
          key: 'S',
          altKey: 'Shift + S',
          label: 'Quick Market SELL',
          description: 'Instant market sell order execution at live Bid price via low-latency STP routing',
          badgeColor: 'rose',
          actionKey: 'sell_market',
        },
      ],
    },
    {
      category: 'Navigation & Terminal Controls',
      icon: <Keyboard className="w-4 h-4 text-cyan-400" />,
      items: [
        {
          key: 'R',
          label: 'Fibonacci Retracement Tool',
          description: 'Toggle interactive click & drag Fibonacci Retracement overlay with swing node magnetic snapping',
          actionKey: 'toggle_fib',
        },
        {
          key: 'C',
          label: 'Auto Smart Channel Bloomberg',
          description: 'Toggle Bloomberg automated linear regression & standard deviation volatility channel',
          actionKey: 'toggle_bloomberg_channel',
        },
        {
          key: 'F',
          label: 'Toggle Fullscreen Chart',
          description: 'Expand chart area to maximum viewport focus mode',
          actionKey: 'toggle_fullscreen',
        },
        {
          key: '?',
          altKey: 'Shift + /',
          label: 'Keyboard Shortcuts Help',
          description: 'Open or close this global hotkey cheatsheet overview',
          actionKey: 'toggle_help',
        },
        {
          key: 'Esc',
          label: 'Close Active Overlay / Modal',
          description: 'Dismiss any open inspector modal, settings dialog, or exit fullscreen',
          actionKey: 'close_modal',
        },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-150 select-none">
      <div className="bg-[#0b0e14] border border-neutral-700/90 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-[#0f141c]/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 tracking-tight">
                  Global Keyboard Shortcuts & Hotkeys
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold">
                  Active
                </span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Low-latency terminal hotkeys for rapid view switching and instant order execution
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {shortcutSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-2">
              <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs tracking-wide">
                {section.icon}
                <span>{section.category}</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {section.items.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (onTriggerAction) {
                        onTriggerAction(item.actionKey);
                      }
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 font-mono">
                        <kbd className="min-w-7 px-2 py-1 bg-neutral-950 border border-neutral-700 rounded-md text-amber-400 font-bold text-xs text-center shadow-inner group-hover:border-amber-500/60 transition-colors">
                          {item.key}
                        </kbd>
                        {item.altKey && (
                          <>
                            <span className="text-slate-500 text-[10px]">or</span>
                            <kbd className="px-2 py-1 bg-neutral-950 border border-neutral-700 rounded-md text-slate-300 font-semibold text-[11px] shadow-inner">
                              {item.altKey}
                            </kbd>
                          </>
                        )}
                      </div>

                      <div>
                        <div className="font-semibold text-slate-100 flex items-center gap-2">
                          <span>{item.label}</span>
                          {item.badgeColor === 'emerald' && (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                              <TrendingUp className="w-3 h-3" /> BUY
                            </span>
                          )}
                          {item.badgeColor === 'rose' && (
                            <span className="flex items-center gap-1 text-[10px] text-rose-400 font-mono font-bold px-1.5 py-0.2 rounded bg-rose-500/10 border border-rose-500/20">
                              <TrendingDown className="w-3 h-3" /> SELL
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          {item.description}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-slate-500 group-hover:text-amber-400 transition-colors shrink-0 pl-2">
                      Click to test ↵
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Safety & Input Protection Notice */}
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-2.5 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="text-amber-300 font-semibold">Safe Input Protection: </span>
              Hotkeys are automatically suppressed when typing inside form inputs (such as lot volume, limit price, search inputs, or broker credentials) to protect against accidental triggers.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-[#0f141c]/90 shrink-0 font-mono text-[11px]">
          <span className="text-slate-400">
            Press <kbd className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-700 rounded text-amber-300">Esc</kbd> or <kbd className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-700 rounded text-amber-300">?</kbd> anytime to dismiss
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-slate-200 font-semibold transition-colors font-sans cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
