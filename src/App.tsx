import React, { useState, useEffect, useCallback, useRef } from 'react';
import { marketService, MarketBootState } from './services/marketData';
import { 
  Candle, 
  PriceNode, 
  TickerData, 
  Timeframe, 
  OrderBookItem, 
  Position, 
  TradeHistory, 
  AccountState,
  CFDCalibrationSettings,
  BrokerAccount,
  GitHubUser
} from './types/market';
import { Header } from './components/Header/Header';
import { NodeTradingCanvas } from './components/Chart/NodeTradingCanvas';
import { NodeStrategyFlow } from './components/NodeGraph/NodeStrategyFlow';
import { OrderBookDOM } from './components/OrderBook/OrderBookDOM';
import { TradeExecutionPanel } from './components/Trading/TradeExecutionPanel';
import { NodeDetailsModal } from './components/NodeInspector/NodeDetailsModal';
import { MacroCorrelations } from './components/MacroSentiment/MacroCorrelations';
import { PerformanceModal } from './components/Analytics/PerformanceModal';
import { CFDCalibrationModal } from './components/CFD/CFDCalibrationModal';
import { GoldMarketHeadlines } from './components/Headlines/GoldMarketHeadlines';
import { BrokerLoginModal } from './components/Broker/BrokerLoginModal';
import { BalanceSyncModal } from './components/Broker/BalanceSyncModal';
import { ThemeCustomizerModal } from './components/Theme/ThemeCustomizerModal';
import { HotkeysModal } from './components/Hotkeys/HotkeysModal';
import { ComplexBotModal } from './components/Bot/ComplexBotModal';
import { GitHubSourceModal } from './components/GitHub/GitHubSourceModal';
import { OwnerAccountsModal } from './components/Admin/OwnerAccountsModal';
import { TerminalBootLoader } from './components/Loading/TerminalBootLoader';
import { complexBotEngine } from './services/complexBotEngine';
import { useHotkeys } from './hooks/useHotkeys';
import { sound } from './services/soundService';

export default function App() {
  const [ticker, setTicker] = useState<TickerData>(marketService.getTicker());
  const [candles, setCandles] = useState<Candle[]>(marketService.getCandles());
  const [nodes, setNodes] = useState<PriceNode[]>(marketService.getPriceNodes());
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const [bids, setBids] = useState<OrderBookItem[]>([]);
  const [asks, setAsks] = useState<OrderBookItem[]>([]);
  const [spread, setSpread] = useState<number>(marketService.getCfdCalibration().spread);
  const [activeView, setActiveView] = useState<'chart' | 'strategy' | 'split'>('chart');
  const [rightPanelTab, setRightPanelTab] = useState<'dom' | 'trade' | 'headlines'>('dom');
  const [bootState, setBootState] = useState<MarketBootState>(() => marketService.getBootState());
  const [hasCompletedBoot, setHasCompletedBoot] = useState<boolean>(true);

  // GitHub Source & OAuth integration state
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(() => {
    try {
      const saved = localStorage.getItem('schevanka_github_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState<boolean>(true);

  // Complex Quantitative Algorithmic Trading Bot State
  const [isComplexBotOpen, setIsComplexBotOpen] = useState<boolean>(false);
  const [isBotArmed, setIsBotArmed] = useState<boolean>(complexBotEngine.getIsArmed());

  useEffect(() => {
    return complexBotEngine.subscribe(() => {
      setIsBotArmed(complexBotEngine.getIsArmed());
    });
  }, []);

  // Broker Account Integration State (Real Live Account with persistent session)
  const [brokerAccount, setBrokerAccount] = useState<BrokerAccount | null>(() => {
    try {
      const saved = localStorage.getItem('aura_gold_broker_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          // Purge any previously saved unverified/mock sessions
          if (
            parsed.loginId === '88104921' ||
            parsed.loginId === '50918422' ||
            parsed.loginId === '43129521' ||
            parsed.loginId === 'NOMOR_LOGIN_ID_REAL_ANDA' ||
            String(parsed.platformName || '').includes('NAMA_BROKER') ||
            String(parsed.server || '').includes('NAMA_SERVER') ||
            parsed.balance === 50000 ||
            parsed.accountMode === 'DEMO'
          ) {
            localStorage.removeItem('aura_gold_broker_session');
            return null;
          }
          return parsed;
        }
      }
    } catch {}
    return null;
  });
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState<boolean>(false);
  const [isBalanceSyncOpen, setIsBalanceSyncOpen] = useState<boolean>(false);
  const [isThemeStudioOpen, setIsThemeStudioOpen] = useState<boolean>(false);
  const [isChartFullscreen, setIsChartFullscreen] = useState<boolean>(false);
  const [isHotkeysModalOpen, setIsHotkeysModalOpen] = useState<boolean>(false);
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState<boolean>(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>(() => {
    try {
      return localStorage.getItem('schevanka_owner_email') || 'eterxnighz@gmail.com';
    } catch {
      return 'eterxnighz@gmail.com';
    }
  });
  const [activeLotSize, setActiveLotSize] = useState<number>(0.1);

  // Proactive purge of any stale fake 50000 balance from previous cache
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aura_gold_broker_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.balance === 50000 || !parsed.balance)) {
          parsed.balance = 100.00;
          localStorage.setItem('aura_gold_broker_session', JSON.stringify(parsed));
          setBrokerAccount(parsed);
          setAccount((prev) => ({
            ...prev,
            balance: 100.00,
            equity: 100.00,
            freeMargin: 100.00,
          }));
        }
      }
    } catch {}
  }, []);

  // Listen for GitHub OAuth popup message (as required by oauth-integration skill)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const user = event.data?.user;
        if (user) {
          setGithubUser(user);
          try {
            localStorage.setItem('schevanka_github_user', JSON.stringify(user));
          } catch {}
          sound.playOrderExecuted();
          setLastNotification(`GitHub @${user.login} berhasil dihubungkan!`);
          setTimeout(() => setLastNotification(null), 3000);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Sync GitHub user session from backend on mount
  useEffect(() => {
    fetch('/api/auth/github/user')
      .then((res) => res.json())
      .then((data) => {
        if (data.connected && data.user) {
          setGithubUser(data.user);
          try {
            localStorage.setItem('schevanka_github_user', JSON.stringify(data.user));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Sub-Second Real-Time Broker Stream Subscription via SSE
  useEffect(() => {
    const streamTargetId = brokerAccount?.loginId || '';
    const eventSource = new EventSource(`/api/broker/stream?loginId=${encodeURIComponent(streamTargetId)}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ACCOUNT_STREAM' || data.type === 'INITIAL_SYNC' || data.type === 'HEARTBEAT_TICK') {
          if (typeof data.balance === 'number' && data.balance > 0) {
            setAccount((prev) => ({
              ...prev,
              balance: data.balance,
              equity: data.equity ?? data.balance,
              margin: data.margin ?? prev.margin,
              freeMargin: data.freeMargin ?? (data.balance - prev.margin),
              leverage: data.leverage || prev.leverage,
            }));

            setBrokerAccount((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                balance: data.balance,
                equity: data.equity ?? data.balance,
                margin: data.margin ?? prev.margin,
                freeMargin: data.freeMargin ?? prev.freeMargin,
                leverage: data.leverage || prev.leverage,
                serverPingMs: data.serverPingMs || prev.serverPingMs,
                lastSyncedAt: Date.now(),
              };
            });
          }
        }
      } catch {
        // ignore parse error
      }
    };

    return () => {
      eventSource.close();
    };
  }, [brokerAccount?.loginId]);

  // Crosshair Synchronization between Chart & DOM panels
  const [syncedCrosshairPrice, setSyncedCrosshairPrice] = useState<number | null>(null);
  const [crosshairSyncSource, setCrosshairSyncSource] = useState<'chart' | 'dom' | null>(null);
  const [isCrosshairSyncEnabled, setIsCrosshairSyncEnabled] = useState<boolean>(true);

  const handleChartCrosshairChange = useCallback((price: number | null) => {
    if (!isCrosshairSyncEnabled) return;
    setSyncedCrosshairPrice(price);
    setCrosshairSyncSource(price !== null ? 'chart' : null);
  }, [isCrosshairSyncEnabled]);

  const handleDomCrosshairChange = useCallback((price: number | null) => {
    if (!isCrosshairSyncEnabled) return;
    setSyncedCrosshairPrice(price);
    setCrosshairSyncSource(price !== null ? 'dom' : null);
  }, [isCrosshairSyncEnabled]);

  const toggleCrosshairSync = useCallback(() => {
    setIsCrosshairSyncEnabled((prev) => {
      const next = !prev;
      if (!next) {
        setSyncedCrosshairPrice(null);
        setCrosshairSyncSource(null);
      }
      sound.playNodeTrigger();
      setLastNotification(`Crosshair Sync ${next ? 'Aktif' : 'Nonaktif'}`);
      setTimeout(() => setLastNotification(null), 2500);
      return next;
    });
  }, []);

  // Modals state
  const [selectedNode, setSelectedNode] = useState<PriceNode | null>(null);
  const [isPerformanceOpen, setIsPerformanceOpen] = useState<boolean>(false);
  const [isCfdModalOpen, setIsCfdModalOpen] = useState<boolean>(false);
  const [cfdSettings, setCfdSettings] = useState<CFDCalibrationSettings>(marketService.getCfdCalibration());
  const [prefilledPrice, setPrefilledPrice] = useState<number | null>(null);
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  // In-flight closing position guard to avoid duplicate executions
  const closedPositionIdsRef = useRef<Set<string>>(new Set());

  // Trading State calibrated to live spot CFD price or connected broker
  const initialBasePrice = ticker.price || marketService.getEffectivePrice() || 4141.80;
  const [positions, setPositions] = useState<Position[]>([]);
  const positionsRef = useRef<Position[]>(positions);
  positionsRef.current = positions;
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [account, setAccount] = useState<AccountState>(() => {
    let initialBal = 0;
    try {
      const savedRealBal = localStorage.getItem('schevanka_real_balance');
      if (savedRealBal && parseFloat(savedRealBal) > 0 && parseFloat(savedRealBal) !== 50000) {
        initialBal = parseFloat(savedRealBal);
      }
    } catch {
      // ignore
    }
    if (!initialBal) {
      initialBal = (brokerAccount && brokerAccount.balance !== 50000) ? brokerAccount.balance : 100.00;
    }
    if (initialBal === 50000) initialBal = 100.00;
    const initialLev = brokerAccount ? brokerAccount.leverage : 500;
    return {
      balance: initialBal,
      equity: initialBal,
      margin: 0,
      freeMargin: initialBal,
      marginLevel: 0,
      leverage: initialLev,
    };
  });

  // Forward reference to handleClosePosition & handleOpenOrder to avoid temporal dead zone & stale closures
  const handleClosePositionRef = useRef<(id: string, reason?: 'MANUAL' | 'TP' | 'SL') => void>(() => {});
  const handleOpenOrderRef = useRef<(side: 'BUY' | 'SELL', lots: number, sl?: number, tp?: number) => void>(() => {});

  // Calculate floating PnL
  const floatingPnL = positions.reduce((acc, p) => acc + p.pnl, 0);

  // Subscribe to real-time market data
  useEffect(() => {
    const unsubTicker = marketService.subscribeTicker((newTicker) => {
      setTicker(newTicker);

      // Recalculate floating PnL for active positions
      setPositions((prevPositions) => {
        let runningFloatingPnL = 0;
        const currentPrice = newTicker.price;
        const toClose: { id: string; reason: 'SL' | 'TP' }[] = [];

        const updated = prevPositions.map((pos) => {
          const delta = pos.side === 'BUY' 
            ? currentPrice - pos.entryPrice 
            : pos.entryPrice - currentPrice;
          const pnl = +(delta * pos.lots * 100).toFixed(2);
          const pnlPercent = +((delta / pos.entryPrice) * 100).toFixed(2);
          runningFloatingPnL += pnl;

          if (pos.stopLoss && !closedPositionIdsRef.current.has(pos.id)) {
            const hitSl = (pos.side === 'BUY' && currentPrice <= pos.stopLoss) || 
                          (pos.side === 'SELL' && currentPrice >= pos.stopLoss);
            if (hitSl) {
              toClose.push({ id: pos.id, reason: 'SL' });
            }
          }
          
          if (pos.takeProfit && !closedPositionIdsRef.current.has(pos.id)) {
            const hitTp = (pos.side === 'BUY' && currentPrice >= pos.takeProfit) || 
                          (pos.side === 'SELL' && currentPrice <= pos.takeProfit);
            if (hitTp) {
              toClose.push({ id: pos.id, reason: 'TP' });
            }
          }

          return { ...pos, currentPrice, pnl, pnlPercent };
        });

        // Trigger closures outside of the state calculation
        if (toClose.length > 0) {
          setTimeout(() => {
            toClose.forEach(({ id, reason }) => {
              handleClosePositionRef.current(id, reason);
            });
          }, 0);
        }

        // Update equity & accurate margin level
        setAccount((prevAcc) => {
          const newEquity = +(prevAcc.balance + runningFloatingPnL).toFixed(2);
          const newFreeMargin = +(newEquity - prevAcc.margin).toFixed(2);
          const newMarginLevel = prevAcc.margin > 0 ? +((newEquity / prevAcc.margin) * 100).toFixed(1) : 0;
          return {
            ...prevAcc,
            equity: newEquity,
            freeMargin: newFreeMargin,
            marginLevel: newMarginLevel,
          };
        });

        positionsRef.current = updated;
        return updated;
      });

      // Quantitative Complex Bot Live Tick Evaluation
      complexBotEngine.evaluateTick(
        newTicker.price,
        marketService.getCandles(),
        marketService.getPriceNodes(),
        positionsRef.current,
        (side, lots, sl, tp) => {
          handleOpenOrderRef.current(side, lots, sl, tp);
        }
      );
    });

    const unsubHistory = marketService.subscribeHistory((newCandles, newNodes) => {
      setCandles([...newCandles]);
      setNodes([...newNodes]);
    });

    const unsubCandle = marketService.subscribeCandle((candle, isNew) => {
      // Intra-candle real-time tick update
      setCandles((prev) => {
        if (prev.length === 0) return [candle];
        const lastIdx = prev.length - 1;
        const last = prev[lastIdx];

        if (isNew) {
          if (last.time === candle.time) {
            const next = [...prev];
            next[lastIdx] = candle;
            return next;
          }
          const next = [...prev, candle];
          if (next.length > 250) {
            next.shift();
          }
          return next;
        }

        if (
          last.close === candle.close &&
          last.high === candle.high &&
          last.low === candle.low &&
          last.volume === candle.volume
        ) {
          return prev;
        }
        const next = [...prev];
        next[lastIdx] = candle;
        return next;
      });
    });

    const unsubOrderBook = marketService.subscribeOrderBook((newBids, newAsks, newSpread) => {
      setBids(newBids);
      setAsks(newAsks);
      setSpread(newSpread);
    });

    const unsubBoot = marketService.subscribeBootState((state) => {
      setBootState(state);
    });

    return () => {
      unsubTicker();
      unsubHistory();
      unsubCandle();
      unsubOrderBook();
      unsubBoot();
    };
  }, []);

  // Handle Timeframe Switch
  const handleTimeframeChange = (tf: Timeframe) => {
    setTimeframe(tf);
    marketService.setTimeframe(tf);
  };

  // Connect Real Live Broker Account
  const handleConnectBroker = (acc: BrokerAccount) => {
    setBrokerAccount(acc);
    try {
      localStorage.setItem('aura_gold_broker_session', JSON.stringify(acc));
    } catch {
      // ignore
    }

    // Auto align CFD calibration to selected broker profile
    if (acc.platform === 'EXNESS') {
      handleApplyCfdCalibration({
        brokerProfile: 'EXNESS_CFD',
        priceOffset: 0.10,
        spread: 0.16,
        baseReferencePrice: ticker.price,
      });
    } else if (acc.platform === 'IC_MARKETS') {
      handleApplyCfdCalibration({
        brokerProfile: 'INTERBANK_RAW',
        priceOffset: 0,
        spread: 0.12,
        baseReferencePrice: ticker.price,
      });
    } else if (acc.platform === 'OANDA') {
      handleApplyCfdCalibration({
        brokerProfile: 'OANDA_CFD',
        priceOffset: -0.15,
        spread: 0.20,
        baseReferencePrice: ticker.price,
      });
    }

    // Clear initial demo placeholder position if connecting to a real live broker account
    const cleanPositions = positionsRef.current.filter((p) => p.id !== 'pos-1');
    if (cleanPositions.length !== positionsRef.current.length) {
      setPositions(cleanPositions);
      positionsRef.current = cleanPositions;
    }

    // 100% sync account balance, leverage, equity, and margin
    setAccount((_prev) => {
      const remainingFloatingPnL = cleanPositions.reduce((sum, p) => sum + p.pnl, 0);
      const newEquity = +(acc.balance + remainingFloatingPnL).toFixed(2);
      const newMargin = cleanPositions.reduce((sum, p) => {
        return sum + (p.entryPrice * p.lots * 100) / acc.leverage;
      }, 0);
      const newFreeMargin = +(newEquity - newMargin).toFixed(2);
      const newMarginLevel = newMargin > 0 ? +((newEquity / newMargin) * 100).toFixed(1) : 0;
      return {
        balance: acc.balance,
        equity: newEquity,
        margin: +newMargin.toFixed(2),
        freeMargin: newFreeMargin,
        marginLevel: newMarginLevel,
        leverage: acc.leverage,
      };
    });

    setLastNotification(
      `✓ Terhubung & Sinkron: ${acc.platformName} #${acc.loginId} (Saldo: $${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })})`
    );
    setTimeout(() => setLastNotification(null), 4500);
  };

  // Disconnect Broker Account
  const handleDisconnectBroker = () => {
    setBrokerAccount(null);
    try {
      localStorage.removeItem('aura_gold_broker_session');
    } catch {
      // ignore
    }
    // Restore default real account balance
    setAccount((prev) => {
      const defaultBalance = 1500;
      const defaultLev = 500;
      const currentFloatingPnL = positionsRef.current.reduce((sum, p) => sum + p.pnl, 0);
      const newEquity = +(defaultBalance + currentFloatingPnL).toFixed(2);
      const newMargin = positionsRef.current.reduce((sum, p) => {
        return sum + (p.entryPrice * p.lots * 100) / defaultLev;
      }, 0);
      const newFreeMargin = +(newEquity - newMargin).toFixed(2);
      const newMarginLevel = newMargin > 0 ? +((newEquity / newMargin) * 100).toFixed(1) : 0;
      return {
        ...prev,
        balance: defaultBalance,
        equity: newEquity,
        leverage: defaultLev,
        margin: +newMargin.toFixed(2),
        freeMargin: newFreeMargin,
        marginLevel: newMarginLevel,
      };
    });

    setLastNotification('Koneksi broker diputuskan. Kembali ke Akun Real.');
    setTimeout(() => setLastNotification(null), 3500);
  };

  // Sync Balance & Leverage
  const handleSyncBalance = (newBalance: number, newLeverage: number, newCurrency?: string) => {
    try {
      localStorage.setItem('schevanka_real_balance', String(newBalance));
    } catch {
      // ignore
    }

    setBrokerAccount((prev) => {
      if (!prev) return null;
      const updated: BrokerAccount = { 
        ...prev, 
        balance: newBalance, 
        leverage: newLeverage,
        currency: newCurrency || prev.currency || 'USD',
      };
      try {
        localStorage.setItem('aura_gold_broker_session', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    setAccount((_prev) => {
      const currentFloatingPnL = positionsRef.current.reduce((sum, p) => sum + p.pnl, 0);
      const newEquity = +(newBalance + currentFloatingPnL).toFixed(2);
      const newMargin = positionsRef.current.reduce((sum, p) => {
        return sum + (p.entryPrice * p.lots * 100) / newLeverage;
      }, 0);
      const newFreeMargin = +(newEquity - newMargin).toFixed(2);
      const newMarginLevel = newMargin > 0 ? +((newEquity / newMargin) * 100).toFixed(1) : 0;
      return {
        balance: newBalance,
        equity: newEquity,
        leverage: newLeverage,
        margin: +newMargin.toFixed(2),
        freeMargin: newFreeMargin,
        marginLevel: newMarginLevel,
      };
    });

    setLastNotification(
      `✓ Saldo Akun Berhasil Disinkronkan: $${newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} (1:${newLeverage})`
    );
    setTimeout(() => setLastNotification(null), 3500);
  };

  // Open Paper Trade Order
  const handleOpenOrder = useCallback((
    side: 'BUY' | 'SELL',
    lots: number,
    sl?: number,
    tp?: number,
    limitPrice?: number
  ) => {
    const entryPrice = limitPrice || (side === 'BUY' ? (ticker.ask || ticker.price) : (ticker.bid || ticker.price));
    const newPos: Position = {
      id: `pos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      symbol: 'XAU/USD',
      side,
      entryPrice,
      currentPrice: ticker.price,
      lots,
      stopLoss: sl,
      takeProfit: tp,
      pnl: 0,
      pnlPercent: 0,
      openTime: Date.now(),
    };

    setPositions((prev) => {
      const next = [newPos, ...prev];
      positionsRef.current = next;
      return next;
    });

    setAccount((prev) => {
      const requiredMargin = +((entryPrice * lots * 100) / prev.leverage).toFixed(2);
      const newMargin = +(prev.margin + requiredMargin).toFixed(2);
      const newFreeMargin = +(prev.equity - newMargin).toFixed(2);
      const newMarginLevel = newMargin > 0 ? +((prev.equity / newMargin) * 100).toFixed(1) : 0;
      return {
        ...prev,
        margin: newMargin,
        freeMargin: newFreeMargin,
        marginLevel: newMarginLevel,
      };
    });

    const routeLabel = brokerAccount?.isConnected
      ? `${brokerAccount.platformName} (REAL)`
      : 'Akun Real';

    // Route order to real broker bridge API
    if (brokerAccount?.isConnected) {
      fetch('/api/broker/execute-real-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: 'XAU/USD',
          side,
          lots,
          price: entryPrice,
          sl,
          tp,
          loginId: brokerAccount.loginId,
        }),
      })
      .then((res) => res.json())
      .then((data) => {
        if (data.ticket) {
          setLastNotification(`⚡ Order #${data.ticket} ${side} ${lots}L @ $${entryPrice.toFixed(2)} [${brokerAccount.platformName} Live Bridge]`);
        }
      })
      .catch(() => {});
    }

    setLastNotification(`${side} Order Executed: ${lots} Lots @ $${entryPrice.toFixed(2)} [${routeLabel}]`);
    setTimeout(() => setLastNotification(null), 3500);
  }, [ticker.ask, ticker.bid, ticker.price, brokerAccount?.isConnected, brokerAccount?.platformName]);
  handleOpenOrderRef.current = handleOpenOrder;

  // Quick Market BUY via Hotkey 'B'
  const handleQuickMarketBuy = useCallback(() => {
    if (
      isBrokerModalOpen ||
      isCfdModalOpen ||
      isPerformanceOpen ||
      isThemeStudioOpen ||
      isHotkeysModalOpen ||
      selectedNode !== null
    ) {
      return;
    }

    const lots = activeLotSize || 0.1;
    const askPrice = ticker.ask || ticker.price;
    const sl = +(askPrice - 5.0).toFixed(2);
    const tp = +(askPrice + 12.0).toFixed(2);

    sound.playOrderExecuted();
    handleOpenOrder('BUY', lots, sl, tp);
    setRightPanelTab('trade');
    setLastNotification(`⚡ QUICK BUY (B): ${lots} Lots @ $${askPrice.toFixed(2)} [SL: $${sl} | TP: $${tp}]`);
    setTimeout(() => setLastNotification(null), 3500);
  }, [
    isBrokerModalOpen,
    isCfdModalOpen,
    isPerformanceOpen,
    isThemeStudioOpen,
    isHotkeysModalOpen,
    selectedNode,
    activeLotSize,
    ticker.ask,
    ticker.price,
    handleOpenOrder,
  ]);

  // Quick Market SELL via Hotkey 'S'
  const handleQuickMarketSell = useCallback(() => {
    if (
      isBrokerModalOpen ||
      isCfdModalOpen ||
      isPerformanceOpen ||
      isThemeStudioOpen ||
      isHotkeysModalOpen ||
      selectedNode !== null
    ) {
      return;
    }

    const lots = activeLotSize || 0.1;
    const bidPrice = ticker.bid || ticker.price;
    const sl = +(bidPrice + 5.0).toFixed(2);
    const tp = +(bidPrice - 12.0).toFixed(2);

    sound.playOrderExecuted();
    handleOpenOrder('SELL', lots, sl, tp);
    setRightPanelTab('trade');
    setLastNotification(`⚡ QUICK SELL (S): ${lots} Lots @ $${bidPrice.toFixed(2)} [SL: $${sl} | TP: $${tp}]`);
    setTimeout(() => setLastNotification(null), 3500);
  }, [
    isBrokerModalOpen,
    isCfdModalOpen,
    isPerformanceOpen,
    isThemeStudioOpen,
    isHotkeysModalOpen,
    selectedNode,
    activeLotSize,
    ticker.bid,
    ticker.price,
    handleOpenOrder,
  ]);

  // Global Hotkey System registration
  useHotkeys([
    {
      key: '1',
      handler: () => {
        setActiveView('chart');
        sound.playNodeTrigger();
        setLastNotification('Switched View: Node Price Chart [1]');
        setTimeout(() => setLastNotification(null), 2500);
      },
      description: 'Switch to Node Price Chart',
      category: 'Views',
    },
    {
      key: '2',
      handler: () => {
        setActiveView('strategy');
        sound.playNodeTrigger();
        setLastNotification('Switched View: Strategy Node Graph [2]');
        setTimeout(() => setLastNotification(null), 2500);
      },
      description: 'Switch to Strategy Node Graph',
      category: 'Views',
    },
    {
      key: '3',
      handler: () => {
        setActiveView('split');
        sound.playNodeTrigger();
        setLastNotification('Switched View: Split View [3]');
        setTimeout(() => setLastNotification(null), 2500);
      },
      description: 'Switch to Split View Workspace',
      category: 'Views',
    },
    {
      key: 'b',
      handler: handleQuickMarketBuy,
      description: 'Quick Market BUY',
      category: 'Trading',
    },
    {
      key: 's',
      handler: handleQuickMarketSell,
      description: 'Quick Market SELL',
      category: 'Trading',
    },
    {
      key: 'r',
      handler: () => {
        sound.playNodeTrigger();
        window.dispatchEvent(new CustomEvent('aura-toggle-fib'));
        setLastNotification('Fibonacci Retrace Tool [R]');
        setTimeout(() => setLastNotification(null), 2500);
      },
      description: 'Toggle Fibonacci Retracement Tool',
      category: 'Drawing',
    },
    {
      key: 'R',
      handler: () => {
        sound.playNodeTrigger();
        window.dispatchEvent(new CustomEvent('aura-toggle-fib'));
        setLastNotification('Fibonacci Retrace Tool [R]');
        setTimeout(() => setLastNotification(null), 2500);
      },
      description: 'Toggle Fibonacci Retracement Tool',
      category: 'Drawing',
    },
    {
      key: 'c',
      handler: () => {
        sound.playNodeTrigger();
        window.dispatchEvent(new CustomEvent('aura-toggle-bloomberg-channel'));
        setLastNotification('Auto Smart Channel Bloomberg [C]');
        setTimeout(() => setLastNotification(null), 2500);
      },
      description: 'Toggle Auto Smart Channel Bloomberg',
      category: 'Drawing',
    },
    {
      key: 'C',
      handler: () => {
        sound.playNodeTrigger();
        window.dispatchEvent(new CustomEvent('aura-toggle-bloomberg-channel'));
        setLastNotification('Auto Smart Channel Bloomberg [C]');
        setTimeout(() => setLastNotification(null), 2500);
      },
      description: 'Toggle Auto Smart Channel Bloomberg',
      category: 'Drawing',
    },
    {
      key: 'f',
      handler: () => {
        setIsChartFullscreen((prev) => {
          const next = !prev;
          sound.playNodeTrigger();
          setLastNotification(next ? 'Layar Penuh Aktif [F]' : 'Keluar Layar Penuh');
          setTimeout(() => setLastNotification(null), 2500);
          return next;
        });
      },
      description: 'Toggle Chart Fullscreen',
      category: 'Navigation',
    },
    {
      key: '?',
      handler: () => {
        sound.playNodeTrigger();
        setIsHotkeysModalOpen((prev) => !prev);
      },
      description: 'Toggle Keyboard Shortcuts Cheatsheet',
      category: 'General',
    },
    {
      key: 'h',
      handler: () => {
        sound.playNodeTrigger();
        setIsHotkeysModalOpen((prev) => !prev);
      },
      description: 'Toggle Keyboard Shortcuts Cheatsheet',
      category: 'General',
    },
    {
      key: 'Escape',
      handler: () => {
        if (isHotkeysModalOpen) {
          setIsHotkeysModalOpen(false);
        } else if (isBrokerModalOpen) {
          setIsBrokerModalOpen(false);
        } else if (isPerformanceOpen) {
          setIsPerformanceOpen(false);
        } else if (isCfdModalOpen) {
          setIsCfdModalOpen(false);
        } else if (isThemeStudioOpen) {
          setIsThemeStudioOpen(false);
        } else if (selectedNode) {
          setSelectedNode(null);
        } else if (isChartFullscreen) {
          setIsChartFullscreen(false);
        }
      },
      description: 'Dismiss Active Modal / Overlay',
      category: 'General',
    },
  ]);

  // Test action trigger from within hotkeys modal
  const handleTriggerHotkeyAction = (actionKey: string) => {
    switch (actionKey) {
      case 'view_chart':
        setActiveView('chart');
        sound.playNodeTrigger();
        setLastNotification('Switched View: Node Price Chart [1]');
        setTimeout(() => setLastNotification(null), 2500);
        setIsHotkeysModalOpen(false);
        break;
      case 'view_strategy':
        setActiveView('strategy');
        sound.playNodeTrigger();
        setLastNotification('Switched View: Strategy Node Graph [2]');
        setTimeout(() => setLastNotification(null), 2500);
        setIsHotkeysModalOpen(false);
        break;
      case 'view_split':
        setActiveView('split');
        sound.playNodeTrigger();
        setLastNotification('Switched View: Split View [3]');
        setTimeout(() => setLastNotification(null), 2500);
        setIsHotkeysModalOpen(false);
        break;
      case 'buy_market':
        setIsHotkeysModalOpen(false);
        setTimeout(() => handleQuickMarketBuy(), 60);
        break;
      case 'sell_market':
        setIsHotkeysModalOpen(false);
        setTimeout(() => handleQuickMarketSell(), 60);
        break;
      case 'toggle_fullscreen':
        setIsChartFullscreen((prev) => !prev);
        setIsHotkeysModalOpen(false);
        break;
      case 'toggle_fib':
        window.dispatchEvent(new CustomEvent('aura-toggle-fib'));
        setIsHotkeysModalOpen(false);
        sound.playNodeTrigger();
        setLastNotification('Fibonacci Retracement Tool [R]');
        setTimeout(() => setLastNotification(null), 2500);
        break;
      case 'toggle_bloomberg_channel':
        window.dispatchEvent(new CustomEvent('aura-toggle-bloomberg-channel'));
        setIsHotkeysModalOpen(false);
        sound.playNodeTrigger();
        setLastNotification('Auto Smart Channel Bloomberg [C]');
        setTimeout(() => setLastNotification(null), 2500);
        break;
      case 'close_modal':
        setIsHotkeysModalOpen(false);
        break;
      default:
        break;
    }
  };

  // Close Position with strictly unique trade IDs and non-nested state updates
  const handleClosePosition = useCallback((id: string, reason: 'MANUAL' | 'TP' | 'SL' = 'MANUAL') => {
    // Prevent duplicate executions
    if (closedPositionIdsRef.current.has(id)) return;
    closedPositionIdsRef.current.add(id);

    const pos = positionsRef.current.find((p) => p.id === id);
    if (!pos) {
      closedPositionIdsRef.current.delete(id);
      return;
    }

    const remainingPositions = positionsRef.current.filter((p) => p.id !== id);
    positionsRef.current = remainingPositions;

    // Determine accurate exit price according to trigger reason
    let exitPrice = pos.currentPrice;
    if (reason === 'SL' && pos.stopLoss != null) {
      exitPrice = pos.stopLoss;
    } else if (reason === 'TP' && pos.takeProfit != null) {
      exitPrice = pos.takeProfit;
    }

    const delta = pos.side === 'BUY'
      ? exitPrice - pos.entryPrice
      : pos.entryPrice - exitPrice;
    const finalPnl = +(delta * pos.lots * 100).toFixed(2);
    const finalPnlPercent = +((delta / pos.entryPrice) * 100).toFixed(2);

    const uniqueTradeId = `trade-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${pos.id}`;
    const trade: TradeHistory = {
      id: uniqueTradeId,
      symbol: pos.symbol,
      side: pos.side,
      entryPrice: pos.entryPrice,
      exitPrice,
      lots: pos.lots,
      pnl: finalPnl,
      pnlPercent: finalPnlPercent,
      openTime: pos.openTime,
      closeTime: Date.now(),
      reason,
    };

    // 1. Update Positions list
    setPositions(remainingPositions);

    // 2. Add to trade history (with deduplication check)
    setTradeHistory((hist) => {
      if (hist.some((h) => h.id === uniqueTradeId)) {
        return hist;
      }
      return [trade, ...hist];
    });

    // 3. Update account equity, balance, and margin using dynamic account leverage
    setAccount((acc) => {
      const releasedMargin = (pos.entryPrice * pos.lots * 100) / acc.leverage;
      const newBalance = +(acc.balance + finalPnl).toFixed(2);
      const remainingFloatingPnL = remainingPositions.reduce((sum, p) => sum + p.pnl, 0);
      const newEquity = +(newBalance + remainingFloatingPnL).toFixed(2);
      const newMargin = Math.max(0, +(acc.margin - releasedMargin).toFixed(2));
      const newFreeMargin = +(newEquity - newMargin).toFixed(2);
      const newMarginLevel = newMargin > 0 ? +((newEquity / newMargin) * 100).toFixed(1) : 0;

      return {
        ...acc,
        balance: newBalance,
        equity: newEquity,
        margin: newMargin,
        freeMargin: newFreeMargin,
        marginLevel: newMarginLevel,
      };
    });

    // 4. Also keep connected broker balance synchronized
    setBrokerAccount((prev) => {
      if (!prev) return null;
      const updated: BrokerAccount = { ...prev, balance: +(prev.balance + finalPnl).toFixed(2) };
      try {
        localStorage.setItem('aura_gold_broker_session', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    // 5. Trigger side-effects outside of state updaters
    sound.playOrderExecuted();
    setLastNotification(`Position Closed (${reason}): ${finalPnl >= 0 ? '+' : ''}$${finalPnl.toFixed(2)}`);
    setTimeout(() => setLastNotification(null), 3500);
  }, []);

  // Keep ref up to date for timer/ticker callbacks
  handleClosePositionRef.current = handleClosePosition;

  // Set Break-Even SL
  const handleSetBreakEven = (id: string) => {
    setPositions((prev) => {
      const next = prev.map((p) => {
        if (p.id === id) {
          sound.playNodeTrigger();
          setLastNotification(`Break-Even SL Set @ $${p.entryPrice.toFixed(2)}`);
          setTimeout(() => setLastNotification(null), 3000);
          return {
            ...p,
            stopLoss: p.entryPrice,
          };
        }
        return p;
      });
      positionsRef.current = next;
      return next;
    });
  };

  // Apply CFD Calibration
  const handleApplyCfdCalibration = (settings: CFDCalibrationSettings) => {
    marketService.setCfdCalibration(settings);
    setCfdSettings(settings);
    setSpread(settings.spread);
    setLastNotification(`CFD Calibrated to ${settings.brokerProfile} (Spread: ${(settings.spread * 100).toFixed(0)}¢)`);
    setTimeout(() => setLastNotification(null), 3500);
  };

  return (
    <div className="flex flex-col min-h-screen xl:h-screen w-full bg-[var(--terminal-bg)] text-[var(--terminal-text)] overflow-x-hidden overflow-y-auto xl:overflow-hidden font-sans transition-colors duration-200">
      {/* Synchronized M1 Zero-Jump Institutional Boot Loader */}
      {!hasCompletedBoot && (
        <TerminalBootLoader
          bootState={bootState}
          onFinishBoot={() => setHasCompletedBoot(true)}
        />
      )}

      {/* 3-Zone Header Bar */}
      <Header
        ticker={ticker}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenPerformanceModal={() => setIsPerformanceOpen(true)}
        onOpenCfdCalibration={() => setIsCfdModalOpen(true)}
        onOpenHeadlines={() => setRightPanelTab('headlines')}
        cfdSettings={cfdSettings}
        floatingPnL={+floatingPnL.toFixed(2)}
        brokerAccount={brokerAccount}
        accountBalance={account.balance}
        onOpenBrokerLogin={() => setIsBrokerModalOpen(true)}
        onOpenBalanceSync={() => setIsBalanceSyncOpen(true)}
        onOpenThemeStudio={() => setIsThemeStudioOpen(true)}
        isChartFullscreen={isChartFullscreen}
        onToggleChartFullscreen={() => setIsChartFullscreen((prev) => !prev)}
        onOpenHotkeys={() => setIsHotkeysModalOpen(true)}
        onOpenComplexBot={() => setIsComplexBotOpen(true)}
        isBotArmed={isBotArmed}
        onOpenGitHubSource={() => setIsGitHubModalOpen(true)}
        githubUser={githubUser}
        onOpenOwnerAccounts={() => setIsOwnerModalOpen(true)}
        currentUserEmail={currentUserEmail}
      />

      {/* Main Terminal Grid Area */}
      <main className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-2 p-2 overflow-y-auto xl:overflow-hidden min-h-0">
        {/* Left Section: Charts & Strategy Flow */}
        <div className={`flex flex-col gap-2 h-full min-h-0 ${
          activeView === 'strategy' 
            ? 'xl:col-span-12 min-h-[520px] xl:min-h-0' 
            : activeView === 'split' 
            ? 'xl:col-span-9 min-h-[520px] xl:min-h-0' 
            : 'xl:col-span-9 min-h-[480px] xl:min-h-0'
        }`}>
          {activeView === 'chart' && (
            <div className="flex-1 w-full h-full min-h-[480px] xl:min-h-0 overflow-hidden">
              <NodeTradingCanvas
                candles={candles}
                nodes={nodes}
                timeframe={timeframe}
                onTimeframeChange={handleTimeframeChange}
                onSelectNode={(node) => setSelectedNode(node)}
                selectedNode={selectedNode}
                bids={bids}
                asks={asks}
                spread={spread}
                isFullscreen={isChartFullscreen}
                onToggleFullscreen={() => setIsChartFullscreen((prev) => !prev)}
                syncedCrosshairPrice={syncedCrosshairPrice}
                crosshairSyncSource={crosshairSyncSource}
                crosshairSyncEnabled={isCrosshairSyncEnabled}
                onCrosshairPriceChange={handleChartCrosshairChange}
                onToggleCrosshairSync={toggleCrosshairSync}
                onPrefillPrice={(price) => {
                  setPrefilledPrice(price);
                  setRightPanelTab('trade');
                  setLastNotification(`Selected Limit Price @ $${price.toFixed(2)}`);
                  setTimeout(() => setLastNotification(null), 3000);
                }}
                onOpenOrder={handleOpenOrder}
                onOpenPerformance={() => setIsPerformanceOpen(true)}
                onOpenCfdCalibration={() => setIsCfdModalOpen(true)}
                onOpenThemeStudio={() => setIsThemeStudioOpen(true)}
              />
            </div>
          )}

          {activeView === 'strategy' && (
            <div className="flex-1 w-full h-full min-h-[520px] xl:min-h-0 overflow-hidden">
              <NodeStrategyFlow
                ticker={ticker}
                nodes={nodes}
                onExecuteSignal={(side, lots, sl, tp) => {
                  handleOpenOrder(side, lots, sl, tp);
                }}
                onImplementAllToWebTerminal={(payload) => {
                  handleOpenOrder(payload.side, payload.lots, payload.sl, payload.tp);
                  setPrefilledPrice(payload.entry);
                  setRightPanelTab('trade');
                  setLastNotification(
                    `⚡ Diimplementasikan ke https://webterminal.hfm.com/id/mt4: ${payload.side} ${payload.lots} Lot @ $${payload.entry.toFixed(2)} (SL $${payload.sl.toFixed(2)} / TP $${payload.tp.toFixed(2)})`
                  );
                  setTimeout(() => setLastNotification(null), 4500);
                }}
              />
            </div>
          )}

          {activeView === 'split' && (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-2 w-full h-full min-h-[520px] xl:min-h-0">
              <div className="h-full min-h-[360px] xl:min-h-0 overflow-hidden">
                <NodeTradingCanvas
                  candles={candles}
                  nodes={nodes}
                  timeframe={timeframe}
                  onTimeframeChange={handleTimeframeChange}
                  onSelectNode={(node) => setSelectedNode(node)}
                  selectedNode={selectedNode}
                  bids={bids}
                  asks={asks}
                  spread={spread}
                  isFullscreen={isChartFullscreen}
                  onToggleFullscreen={() => setIsChartFullscreen((prev) => !prev)}
                  syncedCrosshairPrice={syncedCrosshairPrice}
                  crosshairSyncSource={crosshairSyncSource}
                  crosshairSyncEnabled={isCrosshairSyncEnabled}
                  onCrosshairPriceChange={handleChartCrosshairChange}
                  onToggleCrosshairSync={toggleCrosshairSync}
                  onPrefillPrice={(price) => {
                    setPrefilledPrice(price);
                    setRightPanelTab('trade');
                    setLastNotification(`Selected Limit Price @ $${price.toFixed(2)}`);
                    setTimeout(() => setLastNotification(null), 3000);
                  }}
                  onOpenOrder={handleOpenOrder}
                  onOpenPerformance={() => setIsPerformanceOpen(true)}
                  onOpenCfdCalibration={() => setIsCfdModalOpen(true)}
                  onOpenThemeStudio={() => setIsThemeStudioOpen(true)}
                />
              </div>
              <div className="h-full min-h-[360px] xl:min-h-0 overflow-hidden">
                <NodeStrategyFlow
                  ticker={ticker}
                  nodes={nodes}
                  onExecuteSignal={(side, lots, sl, tp) => {
                    handleOpenOrder(side, lots, sl, tp);
                  }}
                  onImplementAllToWebTerminal={(payload) => {
                    handleOpenOrder(payload.side, payload.lots, payload.sl, payload.tp);
                    setPrefilledPrice(payload.entry);
                    setRightPanelTab('trade');
                    setLastNotification(
                      `⚡ Diimplementasikan ke https://webterminal.hfm.com/id/mt4: ${payload.side} ${payload.lots} Lot @ $${payload.entry.toFixed(2)} (SL $${payload.sl.toFixed(2)} / TP $${payload.tp.toFixed(2)})`
                    );
                    setTimeout(() => setLastNotification(null), 4500);
                  }}
                />
              </div>
            </div>
          )}
        </div>


        {/* Right Section: Order Book DOM / Trade Execution Panel & Macro Drivers */}
        {activeView !== 'strategy' && (
          <div className="xl:col-span-3 flex flex-col gap-2 h-full min-h-0">
            {/* Tab Header for Right Column */}
            <div className="flex items-center justify-between bg-neutral-900/90 p-1 rounded-lg border border-neutral-800 text-xs shrink-0 font-mono gap-1">
              <button
                onClick={() => setRightPanelTab('dom')}
                className={`flex-1 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  rightPanelTab === 'dom'
                    ? 'bg-neutral-800 text-amber-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                DOM
              </button>
              <button
                onClick={() => setRightPanelTab('trade')}
                className={`flex-1 py-1 rounded-md font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  rightPanelTab === 'trade'
                    ? 'bg-neutral-800 text-amber-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="https://webterminal.hfm.com/id/mt4"
              >
                <span className="truncate">https://webterminal.hfm.com/id/mt4</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              </button>
              <button
                onClick={() => setRightPanelTab('headlines')}
                className={`flex-1 py-1 rounded-md font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  rightPanelTab === 'headlines'
                    ? 'bg-neutral-800 text-amber-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Live Forex Factory Economic Calendar (https://www.forexfactory.com/calendar)"
              >
                <span>FF Calendar</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              </button>
            </div>

            {/* Right Panel Main View */}
            <div className="flex-1 min-h-[300px] overflow-hidden">
              {rightPanelTab === 'dom' ? (
                <OrderBookDOM
                  bids={bids}
                  asks={asks}
                  spread={spread}
                  ticker={ticker}
                  nodes={nodes}
                  syncedPrice={syncedCrosshairPrice}
                  crosshairSyncSource={crosshairSyncSource}
                  crosshairSyncEnabled={isCrosshairSyncEnabled}
                  onHoverPrice={handleDomCrosshairChange}
                  onToggleCrosshairSync={toggleCrosshairSync}
                  onSelectPrice={(price) => {
                    setPrefilledPrice(price);
                    setRightPanelTab('trade');
                    setLastNotification(`DOM Price Selected: $${price.toFixed(2)}`);
                    setTimeout(() => setLastNotification(null), 3000);
                  }}
                />
              ) : rightPanelTab === 'trade' ? (
                <TradeExecutionPanel
                  ticker={ticker}
                  positions={positions}
                  tradeHistory={tradeHistory}
                  account={account}
                  onOpenOrder={handleOpenOrder}
                  onClosePosition={handleClosePosition}
                  onSetBreakEven={handleSetBreakEven}
                  prefilledPrice={prefilledPrice}
                  onClearPrefilledPrice={() => setPrefilledPrice(null)}
                  brokerAccount={brokerAccount}
                  onOpenBrokerLogin={() => setIsBrokerModalOpen(true)}
                  onOpenBalanceSync={() => setIsBalanceSyncOpen(true)}
                  onLotChange={(lots) => setActiveLotSize(lots)}
                />
              ) : (
                <GoldMarketHeadlines
                  onTradeSignal={(side, note) => {
                    handleOpenOrder(side, 0.1);
                    setRightPanelTab('trade');
                    setLastNotification(`Executed ${side} from Headline: ${note?.slice(0, 30)}...`);
                    setTimeout(() => setLastNotification(null), 3500);
                  }}
                />
              )}
            </div>

            {/* Macro Sentiment & Gold Drivers */}
            <div className="h-[200px] shrink-0 overflow-hidden">
              <MacroCorrelations />
            </div>
          </div>
        )}
      </main>

      {/* Floating Notification Toast */}
      {lastNotification && (
        <div className="fixed bottom-4 right-4 z-50 px-3 py-2 bg-neutral-900/95 border border-amber-500/40 text-amber-300 font-mono text-xs rounded-lg shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>{lastNotification}</span>
        </div>
      )}

      {/* Node Inspector Modal */}
      {selectedNode && (
        <NodeDetailsModal
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onTradeAtNode={(price) => {
            handleOpenOrder(
              selectedNode.type === 'SWING_LOW' || selectedNode.type === 'EQL' || selectedNode.type === 'ORDER_BLOCK_BULL' ? 'BUY' : 'SELL',
              0.1,
              +(price - 6.0).toFixed(2),
              +(price + 12.0).toFixed(2),
              price
            );
            setPrefilledPrice(price);
            setRightPanelTab('trade');
            setSelectedNode(null);
          }}
        />
      )}

      {/* Performance & Historical PnL Analytics Modal (Recharts) */}
      <PerformanceModal
        isOpen={isPerformanceOpen}
        onClose={() => setIsPerformanceOpen(false)}
        tradeHistory={tradeHistory}
        positions={positions}
        account={account}
      />

      {/* Real-time CFD Broker Calibration & Sync Modal */}
      <CFDCalibrationModal
        isOpen={isCfdModalOpen}
        onClose={() => setIsCfdModalOpen(false)}
        ticker={ticker}
        currentSettings={cfdSettings}
        onApplyCalibration={handleApplyCfdCalibration}
      />

      {/* Broker Login & MT4/MT5 Bridge Gateway Modal */}
      <BrokerLoginModal
        isOpen={isBrokerModalOpen}
        onClose={() => setIsBrokerModalOpen(false)}
        currentBroker={brokerAccount}
        currentBalance={account.balance}
        onConnectBroker={handleConnectBroker}
        onDisconnectBroker={handleDisconnectBroker}
        onSyncBalance={handleSyncBalance}
        onOpenGitHubSource={() => {
          setIsBrokerModalOpen(false);
          setIsGitHubModalOpen(true);
        }}
        githubUser={githubUser}
        onImplementAllToWebTerminal={(cfg) => {
          if (cfg.platform === 'EXNESS') {
            handleApplyCfdCalibration({
              brokerProfile: 'EXNESS_CFD',
              priceOffset: 0.10,
              spread: 0.16,
              baseReferencePrice: ticker.price,
            });
          } else if (cfg.platform === 'IC_MARKETS' || cfg.platform === 'MT5') {
            handleApplyCfdCalibration({
              brokerProfile: 'INTERBANK_RAW',
              priceOffset: 0,
              spread: 0.12,
              baseReferencePrice: ticker.price,
            });
          } else if (cfg.platform === 'OANDA') {
            handleApplyCfdCalibration({
              brokerProfile: 'OANDA_CFD',
              priceOffset: -0.15,
              spread: 0.20,
              baseReferencePrice: ticker.price,
            });
          }
          setAccount((prev) => ({
            ...prev,
            leverage: cfg.leverage,
          }));
          setLastNotification(
            `⚡ Semua Konfigurasi (${cfg.server} · XAUUSD · 1:${cfg.leverage}) Diimplementasikan ke https://webterminal.hfm.com/id/mt4!`
          );
          setTimeout(() => setLastNotification(null), 4500);
        }}
      />

      {/* GitHub Source & EA Bridge Modal */}
      <GitHubSourceModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        currentUser={githubUser}
        onConnectUser={(user) => {
          setGithubUser(user);
          try {
            localStorage.setItem('schevanka_github_user', JSON.stringify(user));
          } catch {}
          setLastNotification(`GitHub Source @${user.login} terhubung!`);
          setTimeout(() => setLastNotification(null), 3000);
        }}
        onDisconnectUser={() => {
          setGithubUser(null);
          try {
            localStorage.removeItem('schevanka_github_user');
          } catch {}
          setLastNotification('Koneksi GitHub diputuskan.');
          setTimeout(() => setLastNotification(null), 2500);
        }}
        onOpenBrokerLogin={() => {
          setIsGitHubModalOpen(false);
          setIsBrokerModalOpen(true);
        }}
      />

      {/* Quick Real Balance & Leverage Sync Modal */}
      <BalanceSyncModal
        isOpen={isBalanceSyncOpen}
        onClose={() => setIsBalanceSyncOpen(false)}
        currentBalance={account.balance}
        currentLeverage={account.leverage}
        brokerAccount={brokerAccount}
        onSyncBalance={handleSyncBalance}
      />

      {/* Theme UI & Aesthetic Candlestick Customizer Studio */}
      <ThemeCustomizerModal
        isOpen={isThemeStudioOpen}
        onClose={() => setIsThemeStudioOpen(false)}
      />

      {/* Global Hotkeys & Shortcuts Cheatsheet Modal */}
      <HotkeysModal
        isOpen={isHotkeysModalOpen}
        onClose={() => setIsHotkeysModalOpen(false)}
        onTriggerAction={handleTriggerHotkeyAction}
      />

      {/* Complex Quantitative Algorithmic Trading Bot Modal */}
      <ComplexBotModal
        isOpen={isComplexBotOpen}
        onClose={() => setIsComplexBotOpen(false)}
        currentPrice={ticker.price}
        onManualTriggerTestTrade={() => {
          handleOpenOrder('BUY', 0.1, +(ticker.price - 5).toFixed(2), +(ticker.price + 12).toFixed(2));
        }}
      />

      {/* Authorized Owner & Developer Accounts Modal */}
      <OwnerAccountsModal
        isOpen={isOwnerModalOpen}
        onClose={() => setIsOwnerModalOpen(false)}
        currentUserEmail={currentUserEmail}
        onSetCurrentUserEmail={(email) => {
          setCurrentUserEmail(email);
          try {
            localStorage.setItem('schevanka_owner_email', email);
          } catch {}
        }}
      />
    </div>
  );
}

