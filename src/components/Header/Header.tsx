import React, { useState, useRef, useEffect } from 'react';
import { TickerData, CFDCalibrationSettings, BrokerAccount } from '../../types/market';
import { 
  Volume2, 
  VolumeX, 
  Globe, 
  BarChart2, 
  Palette, 
  Newspaper, 
  Check, 
  ChevronDown, 
  Sparkles, 
  ShieldCheck, 
  User, 
  Radio, 
  Maximize2, 
  Minimize2,
  Keyboard,
  Cpu,
  Github
} from 'lucide-react';
import { sound } from '../../services/soundService';
import { useTheme } from '../../context/ThemeContext';
import { AVAILABLE_THEMES } from '../../types/theme';
import { GitHubUser } from '../../types/market';
import { useSmoothTicker } from '../../hooks/useSmoothPrice';
import goldenDragonLogo from '../../assets/images/golden_dragon_logo_1791111763665.jpg';

interface HeaderProps {
  ticker: TickerData;
  activeView: 'chart' | 'strategy' | 'split';
  setActiveView: (view: 'chart' | 'strategy' | 'split') => void;
  onOpenPerformanceModal: () => void;
  onOpenCfdCalibration: () => void;
  onOpenHeadlines?: () => void;
  cfdSettings: CFDCalibrationSettings;
  floatingPnL?: number;
  brokerAccount?: BrokerAccount | null;
  accountBalance?: number;
  onOpenBrokerLogin: () => void;
  onOpenBalanceSync?: () => void;
  onOpenThemeStudio?: () => void;
  isChartFullscreen?: boolean;
  onToggleChartFullscreen?: () => void;
  onOpenHotkeys?: () => void;
  onOpenComplexBot?: () => void;
  isBotArmed?: boolean;
  onOpenGitHubSource?: () => void;
  githubUser?: GitHubUser | null;
  onOpenOwnerAccounts?: () => void;
  currentUserEmail?: string;
}

export const Header: React.FC<HeaderProps> = ({
  ticker,
  activeView,
  setActiveView,
  onOpenPerformanceModal,
  onOpenCfdCalibration,
  onOpenHeadlines,
  cfdSettings,
  floatingPnL = 0,
  brokerAccount,
  accountBalance,
  onOpenBrokerLogin,
  onOpenBalanceSync,
  onOpenThemeStudio,
  isChartFullscreen = false,
  onToggleChartFullscreen,
  onOpenHotkeys,
  onOpenComplexBot,
  isBotArmed = false,
  onOpenGitHubSource,
  githubUser,
  onOpenOwnerAccounts,
  currentUserEmail,
}) => {
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState<boolean>(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme, themeConfig } = useTheme();

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    sound.setEnabled(next);
  };

  // Close theme dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    if (isThemeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isThemeMenuOpen]);

  // Animate displayed ticker price toward target price over 200ms using rAF linear interpolation (lerp)
  const smoothTicker = useSmoothTicker(ticker, 200);
  const isUp = smoothTicker.change24h >= 0;

  return (
    <header className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-neutral-800 text-xs select-none gap-2 overflow-x-auto bg-neutral-950/90 backdrop-blur-md">
      {/* Zone 1: Single text element wordmark with live gold spot metrics */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <button 
          onClick={() => setActiveView('chart')} 
          className="text-base font-bold tracking-tight text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2"
        >
          <img
            src={goldenDragonLogo}
            alt="Golden Dragon Logo"
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full object-cover border border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.35)] shrink-0"
          />
          <span>SCHEVANKA TERMINAL</span>
          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>REAL-TIME SPOT</span>
          </span>
        </button>

        {/* Ticker Live Numbers (Tabular figures with 200ms rAF lerp smoothing) */}
        <div className="flex items-center gap-2 sm:gap-3 font-mono">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-base font-bold tabular-nums tracking-tight ${
              smoothTicker.lastTickDirection === 'up' 
                ? 'text-emerald-500' 
                : smoothTicker.lastTickDirection === 'down'
                ? 'text-rose-500'
                : theme === 'white' ? 'text-slate-900' : 'text-slate-100'
            }`}>
              ${smoothTicker.price.toFixed(2)}
            </span>
            <span className={`text-xs font-semibold tabular-nums ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isUp ? '+' : ''}${smoothTicker.change24h.toFixed(2)} ({isUp ? '+' : ''}{smoothTicker.change24hPercent.toFixed(2)}%)
            </span>
          </div>

          <div className="hidden 2xl:flex items-center gap-3 text-slate-400 text-[11px] pl-2 border-l border-neutral-800">
            <div>
              <span className="text-slate-500">24h High: </span>
              <span className="text-slate-200 tabular-nums">${smoothTicker.high24h.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-500">24h Low: </span>
              <span className="text-slate-200 tabular-nums">${smoothTicker.low24h.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-500">24h Vol: </span>
              <span className="text-slate-200 tabular-nums">{smoothTicker.volume24h.toLocaleString()} Oz</span>
            </div>
          </div>
        </div>
      </div>

      {/* Zone 2: Navigation Links (View modes with hotkey shortcuts 1, 2, 3) */}
      <nav className="hidden lg:flex items-center gap-1 bg-neutral-900/90 p-1 rounded-lg border border-neutral-800 shrink-0">
        <button
          onClick={() => setActiveView('chart')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeView === 'chart'
              ? 'bg-neutral-800 text-amber-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Node Price Chart (Shortcut: 1)"
        >
          <span>Node Price Chart</span>
          <kbd className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border transition-colors ${
            activeView === 'chart'
              ? 'bg-neutral-950 border-amber-500/50 text-amber-300'
              : 'bg-neutral-950/70 border-neutral-700/80 text-slate-400'
          }`}>
            1
          </kbd>
        </button>

        <button
          onClick={() => setActiveView('strategy')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeView === 'strategy'
              ? 'bg-neutral-800 text-amber-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Strategy Node Graph (Shortcut: 2)"
        >
          <span>Strategy Node Graph</span>
          <kbd className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border transition-colors ${
            activeView === 'strategy'
              ? 'bg-neutral-950 border-amber-500/50 text-amber-300'
              : 'bg-neutral-950/70 border-neutral-700/80 text-slate-400'
          }`}>
            2
          </kbd>
        </button>

        <button
          onClick={() => setActiveView('split')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeView === 'split'
              ? 'bg-neutral-800 text-amber-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Split View (Shortcut: 3)"
        >
          <span>Split View</span>
          <kbd className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border transition-colors ${
            activeView === 'split'
              ? 'bg-neutral-950 border-amber-500/50 text-amber-300'
              : 'bg-neutral-950/70 border-neutral-700/80 text-slate-400'
          }`}>
            3
          </kbd>
        </button>
      </nav>

      {/* Zone 3: Actions & Modals */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Hotkeys Cheatsheet Button */}
        {onOpenHotkeys && (
          <button
            onClick={onOpenHotkeys}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 transition-all font-mono text-[11px] cursor-pointer"
            title="Keyboard Shortcuts Cheatsheet (Press ? or H)"
          >
            <Keyboard className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline font-semibold">Hotkeys</span>
            <kbd className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-neutral-950 border border-neutral-700/80 rounded text-amber-400">
              ?
            </kbd>
          </button>
        )}

        {/* Fullscreen Chart Button (Layar Penuh) */}
        {onToggleChartFullscreen && (
          <button
            onClick={onToggleChartFullscreen}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all font-mono text-[11px] cursor-pointer ${
              isChartFullscreen
                ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-neutral-900/90 hover:bg-neutral-800 border-neutral-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-300'
            }`}
            title={isChartFullscreen ? 'Keluar Layar Penuh (ESC)' : 'Layar Penuh Chart (Fullscreen / F11)'}
          >
            {isChartFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-semibold">Keluar Penuh</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline font-semibold">Layar Penuh</span>
              </>
            )}
          </button>
        )}

        {/* Headlines / Forex Factory Calendar Quick Button */}
        {onOpenHeadlines && (
          <button
            onClick={onOpenHeadlines}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 transition-all font-mono text-[11px] cursor-pointer"
            title="Open Forex Factory Economic Calendar & News (https://www.forexfactory.com/calendar)"
          >
            <Newspaper className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline font-semibold">FF Calendar</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </button>
        )}

        {/* Complex Bot Engine Button */}
        {onOpenComplexBot && (
          <button
            onClick={onOpenComplexBot}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all font-mono text-[11px] cursor-pointer ${
              isBotArmed
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/60 text-emerald-300 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-neutral-900/90 hover:bg-neutral-800 border-neutral-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-300'
            }`}
            title="Open Complex Quantitative Algorithmic Trading Bot Engine"
          >
            <Cpu className={`w-3.5 h-3.5 ${isBotArmed ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            <span className="hidden sm:inline font-semibold">Algo Bot</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isBotArmed ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
          </button>
        )}

        {/* Source GitHub & EA Bridge Button */}
        {onOpenGitHubSource && (
          <button
            onClick={onOpenGitHubSource}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all font-mono text-[11px] cursor-pointer ${
              githubUser
                ? 'bg-neutral-800/90 hover:bg-neutral-700 border-neutral-700 text-white'
                : 'bg-neutral-900/90 hover:bg-neutral-800 border-neutral-800 hover:border-neutral-600 text-slate-300 hover:text-white'
            }`}
            title="Open Source GitHub (MT5 EA Bridge & Strategy Repositories)"
          >
            <Github className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline font-semibold">
              {githubUser ? `@${githubUser.login}` : 'Source GitHub'}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${githubUser ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
          </button>
        )}

        {/* Theme Selector Dropdown */}
        <div className="relative" ref={themeMenuRef}>
          <button
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/40 text-slate-300 hover:text-slate-100 transition-all font-mono text-[11px] cursor-pointer"
            title="Change Trading Terminal Theme (Obsidian, 24K Gold, Cyber, Emerald, Light)"
          >
            <Palette className="w-3.5 h-3.5" style={{ color: themeConfig.accentColor }} />
            <span className="hidden sm:inline">{themeConfig.name}</span>
            <span 
              className="w-2 h-2 rounded-full border border-black/30" 
              style={{ backgroundColor: themeConfig.accentColor }} 
            />
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isThemeMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-72 bg-neutral-900/95 border border-neutral-700/80 rounded-xl shadow-2xl backdrop-blur-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1.5 max-h-[85vh] overflow-y-auto">
              <div className="px-2 py-1 text-[10px] font-mono text-slate-400 font-semibold border-b border-neutral-800 flex items-center justify-between">
                <span>PILIH TEMA TERMINAL</span>
                <span className="text-pink-400 font-bold">{AVAILABLE_THEMES.length} STYLES</span>
              </div>

              {/* Theme Studio Button */}
              {onOpenThemeStudio && (
                <button
                  onClick={() => {
                    setIsThemeMenuOpen(false);
                    onOpenThemeStudio();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-amber-500/15 hover:from-pink-500/25 hover:to-amber-500/25 border border-pink-500/30 text-pink-300 transition-all font-mono text-xs cursor-pointer group mb-1"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pink-400 group-hover:rotate-12 transition-transform" />
                    <span className="font-bold">Studio Tema & Candle Estetik</span>
                  </div>
                  <span className="text-[10px] px-1 bg-pink-500/30 text-pink-200 rounded font-bold">
                    PRO
                  </span>
                </button>
              )}

              {/* Theme list */}
              <div className="space-y-1">
                {AVAILABLE_THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id);
                      setIsThemeMenuOpen(false);
                      sound.playNodeTrigger();
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer ${
                      theme === t.id
                        ? 'bg-neutral-800 text-white font-semibold border border-neutral-700'
                        : 'hover:bg-neutral-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-4 h-4 rounded-full border border-white/20 shadow-sm flex items-center justify-center shrink-0"
                        style={{ backgroundColor: t.previewBg }}
                      >
                        <span 
                          className="w-1.5 h-1.5 rounded-full" 
                          style={{ backgroundColor: t.accentColor }} 
                        />
                      </span>
                      <div>
                        <div className="text-xs flex items-center gap-1.5">
                          <span>{t.name}</span>
                          {t.category === 'AESTHETIC' && (
                            <span className="text-[9px] px-1 rounded bg-pink-500/20 text-pink-300 font-mono">
                              AESTHETIC
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{t.subtitle}</div>
                      </div>
                    </div>
                    {theme === t.id && (
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Broker Account Direct Bridge Login Badge / Button */}
        {brokerAccount?.isConnected ? (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-[11px] bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm"
            title={`Connected to ${brokerAccount.platformName} (REAL) #${brokerAccount.loginId} on ${brokerAccount.server}`}
          >
            <button
              type="button"
              onClick={onOpenBrokerLogin}
              className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">
                REAL: {brokerAccount.platformName}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold hidden sm:inline-flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                <span>REAL-TIME</span>
              </span>
            </button>
            {typeof accountBalance === 'number' && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenBalanceSync) onOpenBalanceSync();
                  else onOpenBrokerLogin();
                }}
                className="text-emerald-400 hover:text-emerald-300 font-bold px-1.5 py-0.5 rounded bg-neutral-950 border border-emerald-500/30 hover:border-emerald-400 transition-colors cursor-pointer"
                title="Klik untuk sinkronisasi saldo akun real"
              >
                ${accountBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </button>
            )}
            <button
              type="button"
              onClick={onOpenGitHubSource || onOpenBrokerLogin}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
              title="Klik untuk melihat GitHub Source Real-Time Bridge"
            >
              <span className="hidden md:inline text-slate-400 font-semibold">
                #{brokerAccount.loginId.slice(0, 6)}..
              </span>
              <span className="hidden lg:inline text-[10px] text-cyan-400">
                ({brokerAccount.serverPingMs}ms)
              </span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenBrokerLogin}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all font-mono text-[11px] cursor-pointer bg-neutral-900/90 hover:bg-neutral-800 border-neutral-800 hover:border-amber-500/40 text-slate-300 hover:text-slate-100"
            title="Login ke Akun Broker Real (Exness, XM, IC Markets, MT4/MT5)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-amber-300">Login Broker</span>
            <span className="text-[10px] px-1 bg-amber-500/20 text-amber-300 rounded font-bold hidden sm:inline">
              REAL ID
            </span>
          </button>
        )}

        {/* Real-time CFD Broker Calibration Button */}
        <button
          onClick={onOpenCfdCalibration}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-cyan-500/40 text-slate-300 hover:text-slate-100 transition-all font-mono text-[11px]"
          title="Calibrate Real-Time Spot Price & Spread with your MT4/MT5 or TradingView Broker"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">MT5/TV Sync:</span>
          <span className="text-emerald-400 font-bold">{(cfdSettings.spread * 100).toFixed(0)}¢</span>
          {cfdSettings.priceOffset !== 0 ? (
            <span className="text-[10px] text-amber-300 font-semibold">
              ({cfdSettings.priceOffset >= 0 ? `+${cfdSettings.priceOffset.toFixed(2)}` : cfdSettings.priceOffset.toFixed(2)})
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-medium hidden md:inline">
              (Spot OTC)
            </span>
          )}
        </button>

        {/* PnL Performance Analytics Modal Button */}
        <button
          onClick={onOpenPerformanceModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/15 to-amber-600/15 hover:from-amber-500/25 hover:to-amber-600/25 border border-amber-500/35 text-amber-300 transition-all font-medium text-xs shadow-sm cursor-pointer"
          title="Open Historical Performance & Recharts PnL Analytics Modal"
        >
          <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold">PnL</span>
          {floatingPnL !== 0 && (
            <span className={`hidden sm:inline font-mono text-[10px] px-1 rounded font-bold tabular-nums ${
              floatingPnL >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {floatingPnL >= 0 ? '+' : ''}${floatingPnL.toFixed(1)}
            </span>
          )}
        </button>

        {/* Live Interbank / ECN Feed Ping */}
        <div className="hidden xl:flex items-center gap-1.5 text-slate-400 font-mono text-[11px] px-2 py-1.5 bg-neutral-900/60 rounded border border-neutral-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-300 font-semibold">LIVE TICK (12ms)</span>
        </div>

        {/* Audio Mute/Unmute */}
        <button
          onClick={toggleAudio}
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
            audioEnabled
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-slate-200'
          }`}
          title={audioEnabled ? 'Mute Terminal Chimes' : 'Enable Real-time Tick & Order Audio'}
        >
          {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
