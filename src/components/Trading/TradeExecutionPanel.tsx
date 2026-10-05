import React, { useState } from 'react';
import { TickerData, Position, TradeHistory, AccountState, BrokerAccount } from '../../types/market';
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  History,
  ShieldCheck,
  Globe,
  RefreshCw,
  Cpu,
  ExternalLink,
  Maximize2,
  Minimize2,
  Search,
  Copy,
  Check,
  Radio,
  Layers,
  Terminal
} from 'lucide-react';
import { sound } from '../../services/soundService';
import { complexBotEngine } from '../../services/complexBotEngine';
import { useSmoothTicker } from '../../hooks/useSmoothPrice';
import { BraveLiveWebTerminalChart, BrokerWebTerminalEntry } from './BraveLiveWebTerminalChart';

export const BROKER_WEB_TERMINAL_DIRECTORY: BrokerWebTerminalEntry[] = [
  {
    id: 'hfm',
    brokerName: 'HFM (HF Markets)',
    shortName: 'HFM MT4',
    platform: 'MT4 Live',
    directWebTerminalUrl: 'https://webterminal.hfm.com/id/mt4',
    mt4WebTerminalUrl: 'https://webterminal.hfm.com/id/mt4',
    defaultServer: 'HFMarkets-LiveServer3',
    servers: [
      'HFMarkets-LiveServer1',
      'HFMarkets-LiveServer2',
      'HFMarkets-LiveServer3',
      'HFMarkets-LiveServer4',
      'HFMarkets-LiveServer5',
      'HFMarkets-LiveServer6',
      'HFMarkets-LiveServer7',
      'HFMarketsSV-LiveServer',
      'HFMarketsSV-LiveServer2',
      'HFMarketsSV-LiveServer3',
      'HFMarketsSV-LiveServer4',
      'HFMarketsSV-LiveServer5',
      'HFMarketsSV-LiveServer6',
      'HFMarketsSA-Live2',
      'HFMarketsEurope-LiveServer',
      'HFMarketsUK-LiveServer',
      'HFMarketsSeychelles-Live',
    ],
    goldSymbol: 'XAUUSD',
    typicalSpreadDollars: 0.14,
    region: 'MT4 Live / Tier-1 (17 Server)',
    badgeColor: 'text-rose-400 border-rose-500/40 bg-rose-500/15',
  },
  {
    id: 'xm',
    brokerName: 'XM Global (Trading Point)',
    shortName: 'XM MT4',
    platform: 'MT4 Live',
    directWebTerminalUrl: 'https://mt4.xmglobal.com/',
    mt4WebTerminalUrl: 'https://mt4.xmglobal.com/',
    defaultServer: 'XMGlobal-Real 1',
    servers: [
      'XMGlobal-Real 1',
      'XMGlobal-Real 2',
      'XMGlobal-Real 3',
      'XMGlobal-Real 4',
      'XMGlobal-Real 5',
      'XMGlobal-Real 6',
      'XMGlobal-Real 7',
      'XMGlobal-Real 8',
      'XMGlobal-Real 9',
      'XMGlobal-Real 10',
      'XMGlobal-Real 11',
      'XMGlobal-Real 12',
      'XMGlobal-Real 14',
      'XMGlobal-Real 15',
      'XMGlobal-Real 16',
      'XMGlobal-Real 18',
      'XMGlobal-Real 20',
      'XMGlobal-Real 22',
      'XMGlobal-Real 24',
      'XMGlobal-Real 25',
      'XMGlobal-Real 26',
      'XMGlobal-Real 27',
      'XMGlobal-Real 28',
      'XMGlobal-Real 29',
      'XMGlobal-Real 30',
      'XMGlobal-Real 31',
      'XMGlobal-Real 32',
      'XMGlobal-Real 33',
      'XMGlobal-Real 34',
      'XMGlobal-Real 35',
      'XMGlobal-Real 36',
      'XMGlobal-Real 37',
      'XMGlobal-Real 38',
      'XMGlobal-Real 39',
      'XMGlobal-Real 40',
      'XMGlobal-Real 42',
      'XMGlobal-Real 45',
      'XMGlobal-Real 48',
      'XMGlobal-Real 50',
      'XMGlobal-Real 52',
      'XMGlobal-Real 200',
      'XMGlobal-Real 251',
      'XM.COM-Real 1',
      'XM.COM-Real 5',
      'XM.COM-Real 10',
      'XM.COM-Real 15',
      'XM.COM-Real 20',
      'XM.COM-Real 25',
      'XM.COM-Real 30',
      'XMTrading-Real 1',
      'XMTrading-Real 15',
      'XMTrading-Real 30',
    ],
    goldSymbol: 'GOLD',
    typicalSpreadDollars: 0.20,
    region: 'MT4 Global STP (52 Server)',
    badgeColor: 'text-red-400 border-red-500/40 bg-red-500/15',
  },
  {
    id: 'pepperstone',
    brokerName: 'Pepperstone Razor MT4',
    shortName: 'Pepperstone MT4',
    platform: 'MT4 Live',
    directWebTerminalUrl: 'https://secure.pepperstone.com/webtrader',
    mt4WebTerminalUrl: 'https://secure.pepperstone.com/webtrader',
    defaultServer: 'Pepperstone-Edge01',
    servers: [
      'Pepperstone-Edge01',
      'Pepperstone-Edge02',
      'Pepperstone-Edge03',
      'Pepperstone-Edge04',
      'Pepperstone-Edge05',
      'Pepperstone-Edge06',
      'Pepperstone-Edge07',
      'Pepperstone-Edge08',
      'Pepperstone-Edge09',
      'Pepperstone-Edge10',
      'Pepperstone-Edge11',
      'Pepperstone-Edge12',
      'Pepperstone-Edge13',
      'Pepperstone-Edge14',
      'Pepperstone-Live01',
      'PepperstoneUK-Live',
      'PepperstoneUK-Edge01',
      'PepperstoneUK-Edge02',
      'PepperstoneEU-Live',
    ],
    goldSymbol: 'XAUUSD',
    typicalSpreadDollars: 0.10,
    region: 'MT4 Equinix LD4/NY4 (19 Server)',
    badgeColor: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/15',
  },
  {
    id: 'exness',
    brokerName: 'Exness Global MT4',
    shortName: 'Exness MT4',
    platform: 'MT4 Live',
    directWebTerminalUrl: 'https://my.exness.com/webterminal/',
    mt4WebTerminalUrl: 'https://my.exness.com/webterminal/',
    defaultServer: 'Exness-Real',
    servers: [
      'Exness-Real',
      'Exness-Real2',
      'Exness-Real3',
      'Exness-Real4',
      'Exness-Real5',
      'Exness-Real6',
      'Exness-Real7',
      'Exness-Real8',
      'Exness-Real9',
      'Exness-Real10',
      'Exness-Real11',
      'Exness-Real12',
      'Exness-Real14',
      'Exness-Real15',
      'Exness-Real16',
      'Exness-Real17',
      'Exness-Real18',
      'Exness-Real19',
      'Exness-Real20',
      'Exness-Real21',
      'Exness-Real22',
      'Exness-Real23',
      'Exness-Real24',
      'Exness-Real25',
      'Exness-Real26',
      'Exness-Real28',
      'Exness-Real30',
      'Exness-Real32',
      'Exness-Real35',
      'Exness-Real38',
    ],
    goldSymbol: 'XAUUSDm',
    typicalSpreadDollars: 0.12,
    region: 'MT4 Ultra-Low Spread (30 Server)',
    badgeColor: 'text-amber-300 border-amber-500/40 bg-amber-500/15',
  },
  {
    id: 'icmarkets',
    brokerName: 'IC Markets Global MT4',
    shortName: 'IC Markets MT4',
    platform: 'MT4 Live',
    directWebTerminalUrl: 'https://webtrader.icmarkets.com/',
    mt4WebTerminalUrl: 'https://webtrader.icmarkets.com/',
    defaultServer: 'ICMarketsSC-Live01',
    servers: [
      'ICMarketsSC-Live01',
      'ICMarketsSC-Live02',
      'ICMarketsSC-Live03',
      'ICMarketsSC-Live04',
      'ICMarketsSC-Live05',
      'ICMarketsSC-Live06',
      'ICMarketsSC-Live07',
      'ICMarketsSC-Live08',
      'ICMarketsSC-Live09',
      'ICMarketsSC-Live10',
      'ICMarketsSC-Live11',
      'ICMarketsSC-Live12',
      'ICMarketsSC-Live14',
      'ICMarketsSC-Live15',
      'ICMarketsSC-Live16',
      'ICMarketsSC-Live18',
      'ICMarketsSC-Live20',
      'ICMarketsSC-Live22',
      'ICMarketsSC-Live25',
      'ICMarkets-Live01',
      'ICMarkets-Live02',
      'ICMarkets-Live03',
      'ICMarkets-Live05',
      'ICMarkets-Live07',
      'ICMarkets-Live10',
      'ICMarketsEU-Live01',
      'ICMarketsEU-Live02',
      'ICTrading-Live01',
    ],
    goldSymbol: 'XAUUSD',
    typicalSpreadDollars: 0.10,
    region: 'MT4 Raw ECN (28 Server)',
    badgeColor: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/15',
  },
  {
    id: 'octa',
    brokerName: 'Octa (OctaFX) MT4',
    shortName: 'OctaFX MT4',
    platform: 'MT4 Live',
    directWebTerminalUrl: 'https://www.octafx.com/webtrader/',
    mt4WebTerminalUrl: 'https://www.octafx.com/webtrader/',
    defaultServer: 'OctaFX-Real',
    servers: [
      'OctaFX-Real',
      'OctaFX-Real2',
      'OctaFX-Real3',
      'OctaFX-Real4',
      'OctaFX-Real5',
      'OctaFX-Real6',
      'OctaFX-Real7',
      'OctaFX-Real8',
      'OctaFX-Real9',
      'OctaFX-Real10',
      'OctaMarkets-Real',
    ],
    goldSymbol: 'XAUUSD',
    typicalSpreadDollars: 0.18,
    region: 'MT4 Asia / Global (11 Server)',
    badgeColor: 'text-blue-300 border-blue-500/40 bg-blue-500/15',
  },
  {
    id: 'fbs',
    brokerName: 'FBS Markets MT4',
    shortName: 'FBS MT4',
    platform: 'MT4 Live',
    directWebTerminalUrl: 'https://fbs.com/trading/platforms/mt4-webtrader',
    mt4WebTerminalUrl: 'https://fbs.com/trading/platforms/mt4-webtrader',
    defaultServer: 'FBS-Real-1',
    servers: [
      'FBS-Real',
      'FBS-Real-1',
      'FBS-Real-2',
      'FBS-Real-3',
      'FBS-Real-4',
      'FBS-Real-5',
      'FBS-Real-6',
      'FBS-Real-7',
      'FBS-Real-8',
      'FBS-Real-9',
      'FBS-Real-10',
      'FBS-Real-11',
      'FBS-Real-12',
      'FBS-Real-14',
      'FBS-Real-15',
    ],
    goldSymbol: 'XAUUSD',
    typicalSpreadDollars: 0.20,
    region: 'MT4 Global ECN (15 Server)',
    badgeColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/15',
  },
  {
    id: 'vantage',
    brokerName: 'Vantage Markets MT4',
    shortName: 'Vantage MT4',
    platform: 'MT4 Live',
    directWebTerminalUrl: 'https://webtrader.vantagemarkets.com/',
    mt4WebTerminalUrl: 'https://webtrader.vantagemarkets.com/',
    defaultServer: 'VantageInternational-Live',
    servers: [
      'VantageInternational-Live',
      'VantageInternational-Live 2',
      'VantageInternational-Live 3',
      'VantageInternational-Live 4',
      'VantageInternational-Live 5',
      'VantageInternational-Live 6',
      'VantageInternational-Live 7',
      'VantageInternational-Live 8',
      'VantageInternational-Live 9',
      'VantageInternational-Live 10',
      'VantageInternational-Live 11',
      'VantageInternational-Live 12',
      'VantageGlobalPrime-Live',
    ],
    goldSymbol: 'XAUUSD',
    typicalSpreadDollars: 0.13,
    region: 'MT4 Raw ECN (13 Server)',
    badgeColor: 'text-orange-300 border-orange-500/40 bg-orange-500/15',
  },
  {
    id: 'tickmill',
    brokerName: 'Tickmill Pro MT4',
    shortName: 'Tickmill MT4',
    platform: 'MT4 Live',
    directWebTerminalUrl: 'https://www.tickmill.com/platforms/mt4-webtrader',
    mt4WebTerminalUrl: 'https://www.tickmill.com/platforms/mt4-webtrader',
    defaultServer: 'Tickmill-Live',
    servers: [
      'Tickmill-Live',
      'Tickmill-Live02',
      'Tickmill-Live03',
      'Tickmill-Live04',
      'Tickmill-Live05',
      'Tickmill-Live06',
      'Tickmill-Live07',
      'Tickmill-Live08',
      'Tickmill-Live09',
      'Tickmill-Live10',
      'TickmillEU-Live',
      'TickmillUK-Live',
    ],
    goldSymbol: 'XAUUSD',
    typicalSpreadDollars: 0.11,
    region: 'MT4 London ECN (12 Server)',
    badgeColor: 'text-rose-300 border-rose-500/40 bg-rose-500/15',
  },
  {
    id: 'eightcap',
    brokerName: 'Eightcap / PU Prime / FP MT4',
    shortName: 'Eightcap/FP MT4',
    platform: 'MT4 Live',
    directWebTerminalUrl: 'https://www.eightcap.com/en/platforms/metatrader-4/',
    mt4WebTerminalUrl: 'https://www.eightcap.com/en/platforms/metatrader-4/',
    defaultServer: 'Eightcap-Real',
    servers: [
      'Eightcap-Real',
      'Eightcap-Real-2',
      'Eightcap-Real-3',
      'EightcapGlobal-Real',
      'PuPrime-Live',
      'PuPrime-Live2',
      'PuPrime-Live3',
      'FPMarkets-Live',
      'FPMarkets-Live2',
      'FPMarketsSC-Live',
      'ThinkMarkets-Live',
      'ThinkMarkets-Live2',
    ],
    goldSymbol: 'XAUUSD',
    typicalSpreadDollars: 0.12,
    region: 'MT4 Equinix ECN (12 Server)',
    badgeColor: 'text-indigo-300 border-indigo-500/40 bg-indigo-500/15',
  },
  {
    id: 'fxpro',
    brokerName: 'FxPro / FXTM / Admirals MT4',
    shortName: 'FxPro/FXTM MT4',
    platform: 'MT4 Live',
    directWebTerminalUrl: 'https://www.fxpro.com/trading-platforms/metatrader4',
    mt4WebTerminalUrl: 'https://www.fxpro.com/trading-platforms/metatrader4',
    defaultServer: 'FxPro.com-Real01',
    servers: [
      'FxPro.com-Real01',
      'FxPro.com-Real02',
      'FxPro.com-Real03',
      'FxPro.com-Real04',
      'FxPro.com-Real05',
      'FxPro.com-Real06',
      'FxPro.com-Real07',
      'FxPro.com-Real08',
      'ForexTimeFXTM-ECN',
      'ForexTimeFXTM-ECN-Zero',
      'ForexTimeFXTM-Pro',
      'ForexTimeFXTM-Standard',
      'AdmiralsGroup-Live',
      'AdmiralMarkets-Live',
      'AdmiralMarkets-Live2',
      'InstaForex-Singapore',
      'InstaForex-USA',
      'InstaForex-UK',
      'InstaForex-Europe',
      'InstaForex-HongKong',
      'InstaForex-Cent',
      'Markets4you-Live',
      'EGlobal-Classic1',
      'EGlobal-Classic2',
      'EGlobal-Cent1',
      'EGlobal-Pro',
    ],
    goldSymbol: 'XAUUSD',
    typicalSpreadDollars: 0.14,
    region: 'MT4 London / EU ECN (26 Server)',
    badgeColor: 'text-purple-300 border-purple-500/40 bg-purple-500/15',
  },
  {
    id: 'roboforex',
    brokerName: 'RoboForex ECN MT4',
    shortName: 'RoboForex MT4',
    platform: 'MT4 Live',
    directWebTerminalUrl: 'https://webterminal.roboforex.com/',
    mt4WebTerminalUrl: 'https://webterminal.roboforex.com/',
    defaultServer: 'RoboForex-ECN',
    servers: [
      'RoboForex-ECN',
      'RoboForex-ECN-2',
      'RoboForex-ECN-3',
      'RoboForex-Pro',
      'RoboForex-Pro-2',
      'RoboForex-Pro-3',
      'RoboForex-Pro-4',
      'RoboForex-Pro-5',
      'RoboForex-Pro-6',
      'RoboForex-ProCent',
      'RoboForex-ProCent-2',
      'RoboForex-ProCent-3',
      'RoboForex-Prime',
    ],
    goldSymbol: 'XAUUSD',
    typicalSpreadDollars: 0.15,
    region: 'MT4 Prime ECN (13 Server)',
    badgeColor: 'text-sky-300 border-sky-500/40 bg-sky-500/15',
  },
  {
    id: 'justmarkets',
    brokerName: 'JustMarkets Pro MT4',
    shortName: 'JustMarkets MT4',
    platform: 'MT4 Live',
    directWebTerminalUrl: 'https://justmarkets.com/trading/metatrader-webterminal',
    mt4WebTerminalUrl: 'https://justmarkets.com/trading/metatrader-webterminal',
    defaultServer: 'JustMarkets-Live',
    servers: [
      'JustMarkets-Live',
      'JustMarkets-Live2',
      'JustMarkets-Live3',
      'JustMarkets-Live4',
      'JustMarkets-Live5',
      'JustForex-Live',
      'JustForex-Live2',
    ],
    goldSymbol: 'XAUUSD',
    typicalSpreadDollars: 0.14,
    region: 'MT4 Global Raw (7 Server)',
    badgeColor: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/15',
  },
  {
    id: 'bappebti',
    brokerName: 'Dupoin / MIFX / Finex / GKInvest MT4',
    shortName: 'Indonesia MT4',
    platform: 'MT4 Live',
    directWebTerminalUrl: 'https://www.mifx.com/',
    mt4WebTerminalUrl: 'https://www.mifx.com/',
    defaultServer: 'MonexInvestindo-Live',
    servers: [
      'MonexInvestindo-Live',
      'MIFX-Live',
      'MIFX-Real',
      'DupoinFutures-Live',
      'DupoinFutures-Real',
      'FinexBerjangka-Live',
      'FinexBerjangka-Real',
      'ValburyAsia-Live',
      'GKInvest-Live',
      'HSBInvestasi-Live',
      'HansonSemesta-Live',
      'VictoryInternational-Live',
      'DCFX-Live',
      'DidimaxBerjangka-Live',
      'TradersFamily-Live',
      'Foreximf-Live',
      'JavaGlobalFutures-Live',
      'AgrodanaFutures-Live',
      'PhillipFutures-Live',
    ],
    goldSymbol: 'XAUUSD',
    typicalSpreadDollars: 0.20,
    region: 'MT4 BAPPEBTI Indonesia (19 Server)',
    badgeColor: 'text-amber-300 border-amber-500/40 bg-amber-500/15',
  },
];

interface TradeExecutionPanelProps {
  ticker: TickerData;
  positions: Position[];
  tradeHistory: TradeHistory[];
  account: AccountState;
  onOpenOrder: (side: 'BUY' | 'SELL', lots: number, sl?: number, tp?: number, limitPrice?: number) => void;
  onClosePosition: (id: string) => void;
  onSetBreakEven: (id: string) => void;
  prefilledPrice?: number | null;
  onClearPrefilledPrice?: () => void;
  brokerAccount?: BrokerAccount | null;
  onOpenBrokerLogin?: () => void;
  onOpenBalanceSync?: () => void;
  onLotChange?: (lots: number) => void;
  onOpenComplexBot?: () => void;
}

export const TradeExecutionPanel: React.FC<TradeExecutionPanelProps> = ({
  ticker,
  positions,
  tradeHistory,
  account,
  onOpenOrder,
  onClosePosition,
  onSetBreakEven,
  prefilledPrice,
  onClearPrefilledPrice,
  brokerAccount,
  onOpenBrokerLogin,
  onOpenBalanceSync,
  onLotChange,
  onOpenComplexBot,
}) => {
  const [panelMode, setPanelMode] = useState<'WEB_TERMINAL_CHART' | 'DIRECTORY_LINKS' | 'ORDER_TICKET'>('WEB_TERMINAL_CHART');
  const [selectedBroker, setSelectedBroker] = useState<BrokerWebTerminalEntry>(BROKER_WEB_TERMINAL_DIRECTORY[0]); // Defaults to https://webterminal.hfm.com/id/mt4
  const [selectedServer, setSelectedServer] = useState<string>(BROKER_WEB_TERMINAL_DIRECTORY[0].defaultServer);
  const [isTerminalExpanded, setIsTerminalExpanded] = useState<boolean>(false);
  const [brokerSearch, setBrokerSearch] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isBotRunning, setIsBotRunning] = useState<boolean>(complexBotEngine.getIsArmed());
  const smoothTicker = useSmoothTicker(ticker, 200);

  React.useEffect(() => {
    return complexBotEngine.subscribe(() => {
      setIsBotRunning(complexBotEngine.getIsArmed());
    });
  }, []);

  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [lots, setLots] = useState<number>(0.1);
  const [limitPrice, setLimitPrice] = useState<string>(prefilledPrice ? prefilledPrice.toFixed(2) : '');
  const [slPips, setSlPips] = useState<number>(50);
  const [tpPips, setTpPips] = useState<number>(120);
  const [useSl, setUseSl] = useState<boolean>(true);
  const [useTp, setUseTp] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions');

  const updateLots = (newLots: number) => {
    const val = Math.max(0.01, newLots);
    setLots(val);
    if (onLotChange) onLotChange(val);
  };

  React.useEffect(() => {
    if (prefilledPrice) {
      setLimitPrice(prefilledPrice.toFixed(2));
      setOrderType('LIMIT');
    }
  }, [prefilledPrice]);

  const handleSelectBroker = (entry: BrokerWebTerminalEntry) => {
    sound.playNodeTrigger();
    setSelectedBroker(entry);
    setSelectedServer(entry.defaultServer);
  };

  const handleSelectServer = (srv: string) => {
    setSelectedServer(srv);
  };

  const handleCopyUrl = (url: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredBrokers = BROKER_WEB_TERMINAL_DIRECTORY.filter(
    (b) =>
      !brokerSearch.trim() ||
      b.brokerName.toLowerCase().includes(brokerSearch.toLowerCase()) ||
      b.directWebTerminalUrl.toLowerCase().includes(brokerSearch.toLowerCase()) ||
      b.servers.some((s) => s.toLowerCase().includes(brokerSearch.toLowerCase()))
  );

  const lotPresets = [0.01, 0.05, 0.1, 0.5, 1.0];

  const handleBuy = () => {
    const price = orderType === 'LIMIT' && limitPrice ? parseFloat(limitPrice) : ticker.ask;
    const sl = useSl ? +(price - slPips * 0.1).toFixed(2) : undefined;
    const tp = useTp ? +(price + tpPips * 0.1).toFixed(2) : undefined;

    sound.playOrderExecuted();
    onOpenOrder('BUY', lots, sl, tp, orderType === 'LIMIT' ? price : undefined);
    if (onClearPrefilledPrice) onClearPrefilledPrice();
  };

  const handleSell = () => {
    const price = orderType === 'LIMIT' && limitPrice ? parseFloat(limitPrice) : ticker.bid;
    const sl = useSl ? +(price + slPips * 0.1).toFixed(2) : undefined;
    const tp = useTp ? +(price - tpPips * 0.1).toFixed(2) : undefined;

    sound.playOrderExecuted();
    onOpenOrder('SELL', lots, sl, tp, orderType === 'LIMIT' ? price : undefined);
    if (onClearPrefilledPrice) onClearPrefilledPrice();
  };

  const slDollarEst = (slPips * 0.1 * lots * 100).toFixed(2);
  const tpDollarEst = (tpPips * 0.1 * lots * 100).toFixed(2);

  return (
    <div
      className={`${
        isTerminalExpanded
          ? 'fixed inset-2 z-[150] shadow-2xl ring-1 ring-amber-500/40'
          : 'flex flex-col h-full'
      } flex flex-col bg-[#0b0e14] border border-neutral-800 rounded-lg overflow-hidden text-xs select-none`}
    >
      {/* Top Header with https://webterminal.hfm.com/id/mt4 Switcher & Expand Button */}
      <div className="flex flex-wrap items-center justify-between px-2.5 py-2 border-b border-neutral-800 bg-[#0f141c] gap-1.5 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Terminal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <a
            href="https://webterminal.hfm.com/id/mt4"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-amber-300 hover:text-amber-200 hover:underline truncate font-mono text-[11px]"
            title="https://webterminal.hfm.com/id/mt4"
          >
            https://webterminal.hfm.com/id/mt4
          </a>
          <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded border ${selectedBroker.badgeColor}`}>
            {selectedBroker.shortName}
          </span>
        </div>

        <div className="flex items-center gap-1 font-mono">
          {/* Sub-Mode Switcher: Chart | All Links | Quick Ticket */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setPanelMode('WEB_TERMINAL_CHART')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                panelMode === 'WEB_TERMINAL_CHART'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Live Web Terminal Chart (Peramban Brave · No Demo)"
            >
              Chart Live
            </button>
            <button
              type="button"
              onClick={() => setPanelMode('DIRECTORY_LINKS')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                panelMode === 'DIRECTORY_LINKS'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Daftar Link Web Terminal Resmi Berbagai Broker"
            >
              Link Broker ({BROKER_WEB_TERMINAL_DIRECTORY.length})
            </button>
            <button
              type="button"
              onClick={() => setPanelMode('ORDER_TICKET')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                panelMode === 'ORDER_TICKET'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Quick Order Ticket & Open Positions"
            >
              <span>Order</span>
              {positions.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsTerminalExpanded((prev) => !prev)}
            className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-amber-300 cursor-pointer transition-colors"
            title={isTerminalExpanded ? 'Kecilkan Web Terminal Chart' : 'Perbesar Web Terminal Chart (Layar Penuh)'}
          >
            {isTerminalExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Quick Broker Selector Bar */}
      <div className="px-2.5 py-1.5 bg-neutral-950/80 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {BROKER_WEB_TERMINAL_DIRECTORY.map((entry) => {
            const isSelected = selectedBroker.id === entry.id;
            return (
              <button
                key={`wt-broker-${entry.id}`}
                type="button"
                onClick={() => handleSelectBroker(entry)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap border transition-all cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold shadow-sm'
                    : 'bg-neutral-900 text-slate-400 border-neutral-800 hover:text-slate-200 hover:border-neutral-700'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                <span>{entry.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN BODY: Mode 1 = Live Web Terminal Chart (Brave Engine, Zero Demo), Mode 2 = All Broker Links Directory, Mode 3 = Order Ticket */}
      {panelMode === 'WEB_TERMINAL_CHART' ? (
        <BraveLiveWebTerminalChart
          broker={selectedBroker}
          selectedServer={selectedServer}
          onSelectServer={handleSelectServer}
          ticker={ticker}
          positions={positions}
          onExecuteLiveOrder={(side, orderLots) => {
            const execPrice = side === 'BUY' ? ticker.ask : ticker.bid;
            const sl = useSl
              ? +(side === 'BUY' ? execPrice - slPips * 0.1 : execPrice + slPips * 0.1).toFixed(2)
              : undefined;
            const tp = useTp
              ? +(side === 'BUY' ? execPrice + tpPips * 0.1 : execPrice - tpPips * 0.1).toFixed(2)
              : undefined;
            onOpenOrder(side, orderLots, sl, tp);
          }}
          onOpenBrokerLogin={onOpenBrokerLogin}
        />
      ) : panelMode === 'DIRECTORY_LINKS' ? (
        /* Mode 2: Full Directory of Official Broker Web Terminal Links */
        <div className="flex-1 flex flex-col min-h-0 p-2.5 space-y-2 overflow-y-auto bg-[#080b10]">
          <div className="relative shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              value={brokerSearch}
              onChange={(e) => setBrokerSearch(e.target.value)}
              placeholder="Cari broker atau link web terminal (HFM, Exness, IC Markets, XM, FBS, Vantage)..."
              className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500/50 rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-mono text-slate-100 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            {filteredBrokers.map((broker) => {
              const isSelected = selectedBroker.id === broker.id;
              return (
                <div
                  key={`dir-card-${broker.id}`}
                  className={`p-2.5 rounded-lg border transition-all space-y-1.5 font-mono ${
                    isSelected
                      ? 'bg-neutral-900/95 border-amber-500/50 shadow-md'
                      : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-100 text-[11px]">{broker.brokerName}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${broker.badgeColor}`}>
                        {broker.platform}
                      </span>
                    </div>
                    <span className="text-[9.5px] text-slate-400">{broker.region}</span>
                  </div>

                  {/* Direct Official Web Terminal Link */}
                  <div className="p-1.5 rounded bg-neutral-900 border border-neutral-800/90 flex items-center justify-between gap-1.5 text-[10px]">
                    <a
                      href={broker.directWebTerminalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-300 hover:text-cyan-200 hover:underline truncate flex-1"
                      title={broker.directWebTerminalUrl}
                    >
                      {broker.directWebTerminalUrl}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(broker.directWebTerminalUrl, `dir-${broker.id}`)}
                      className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-slate-300 text-[9.5px] cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      {copiedId === `dir-${broker.id}` ? (
                        <>
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                          <span className="text-emerald-300">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-2.5 h-2.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Server List & Action Buttons */}
                  <div className="flex items-center justify-between gap-1.5 pt-0.5 text-[10px]">
                    <span className="text-slate-400 truncate">
                      Server: <strong className="text-emerald-400">{broker.defaultServer}</strong>
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectBroker(broker);
                          setPanelMode('WEB_TERMINAL_CHART');
                        }}
                        className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold cursor-pointer flex items-center gap-1"
                      >
                        <Layers className="w-2.5 h-2.5" />
                        <span>Muat di Chart</span>
                      </button>

                      <a
                        href={broker.directWebTerminalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1"
                      >
                        <span>Buka Web</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Mode 3: Quick Order Ticket & Open Positions */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          <div className="lg:col-span-5 p-3 border-r border-neutral-800 flex flex-col justify-between bg-neutral-950/30 overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <button
                  type="button"
                  onClick={onOpenBalanceSync || onOpenBrokerLogin}
                  className="text-emerald-400 hover:underline cursor-pointer"
                >
                  Balance: ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </button>
                <button
                  type="button"
                  onClick={onOpenBrokerLogin}
                  className="text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>{brokerAccount?.isConnected ? brokerAccount.platformName : 'Login Broker'}</span>
                </button>
              </div>

              {onOpenComplexBot && (
                <div 
                  onClick={onOpenComplexBot}
                  className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Cpu className={`w-3.5 h-3.5 ${isBotRunning ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
                    <span className="font-bold text-[11px] text-slate-200">Algo Bot Studio</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400">
                    {isBotRunning ? 'ARMED' : 'STANDBY'} →
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 p-0.5 bg-neutral-900 rounded border border-neutral-800">
                <button
                  onClick={() => setOrderType('MARKET')}
                  className={`py-1 text-center font-medium rounded transition-colors cursor-pointer ${
                    orderType === 'MARKET' ? 'bg-neutral-800 text-amber-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Market Order
                </button>
                <button
                  onClick={() => setOrderType('LIMIT')}
                  className={`py-1 text-center font-medium rounded transition-colors cursor-pointer ${
                    orderType === 'LIMIT' ? 'bg-neutral-800 text-amber-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Limit Order
                </button>
              </div>

              {orderType === 'LIMIT' && (
                <div>
                  <label className="text-slate-400 text-[11px] mb-1 block">Limit Price (USD)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder={ticker.price.toFixed(2)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Volume (Lots):</span>
                  <span className="text-slate-500 font-mono">{(lots * 100).toFixed(0)} Oz</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="50"
                  value={lots}
                  onChange={(e) => updateLots(parseFloat(e.target.value) || 0.01)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs mb-1.5"
                />
                <div className="flex items-center gap-1">
                  {lotPresets.map((val) => (
                    <button
                      key={val}
                      onClick={() => updateLots(val)}
                      className={`flex-1 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                        lots === val
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                          : 'bg-neutral-900 border-neutral-800 text-slate-400'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2 bg-neutral-900/60 rounded border border-neutral-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={useSl}
                      onChange={(e) => setUseSl(e.target.checked)}
                      className="accent-amber-500 rounded"
                    />
                    <span>SL</span>
                  </label>
                  {useSl && (
                    <div className="flex items-center gap-1 font-mono text-[10px]">
                      <input
                        type="number"
                        value={slPips}
                        onChange={(e) => setSlPips(Math.max(10, parseInt(e.target.value) || 10))}
                        className="w-12 bg-neutral-950 border border-neutral-800 rounded px-1 py-0.5 text-right text-rose-400"
                      />
                      <span className="text-rose-400/80">(-${slDollarEst})</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={useTp}
                      onChange={(e) => setUseTp(e.target.checked)}
                      className="accent-amber-500 rounded"
                    />
                    <span>TP</span>
                  </label>
                  {useTp && (
                    <div className="flex items-center gap-1 font-mono text-[10px]">
                      <input
                        type="number"
                        value={tpPips}
                        onChange={(e) => setTpPips(Math.max(10, parseInt(e.target.value) || 10))}
                        className="w-12 bg-neutral-950 border border-neutral-800 rounded px-1 py-0.5 text-right text-emerald-400"
                      />
                      <span className="text-emerald-400/80">(+${tpDollarEst})</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3">
              <button
                onClick={handleSell}
                className="flex flex-col items-center justify-center p-2 bg-rose-600/90 hover:bg-rose-500 text-white font-bold rounded shadow cursor-pointer"
              >
                <div className="flex items-center gap-1 text-xs">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>SELL</span>
                </div>
                <span className="font-mono text-[11px] tabular-nums">${smoothTicker.bid.toFixed(2)}</span>
              </button>

              <button
                onClick={handleBuy}
                className="flex flex-col items-center justify-center p-2 bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold rounded shadow cursor-pointer"
              >
                <div className="flex items-center gap-1 text-xs">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>BUY</span>
                </div>
                <span className="font-mono text-[11px] tabular-nums">${smoothTicker.ask.toFixed(2)}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col h-full bg-[#0b0e14]">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800 bg-[#0f141c]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('positions')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                    activeTab === 'positions' ? 'bg-neutral-800 text-slate-100' : 'text-slate-400'
                  }`}
                >
                  Positions ({positions.length})
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                    activeTab === 'history' ? 'bg-neutral-800 text-slate-100' : 'text-slate-400'
                  }`}
                >
                  History ({tradeHistory.length})
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {activeTab === 'positions' ? (
                positions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-36 text-slate-500 space-y-1">
                    <ShieldAlert className="w-5 h-5 text-slate-600" />
                    <span className="text-xs">No active positions</span>
                  </div>
                ) : (
                  <table className="w-full text-left font-mono text-[10px]">
                    <thead className="bg-neutral-950/60 text-slate-500 border-b border-neutral-800">
                      <tr>
                        <th className="py-1.5 px-2">Side</th>
                        <th className="py-1.5 px-2">Lots</th>
                        <th className="py-1.5 px-2">Entry</th>
                        <th className="py-1.5 px-2 text-right">PnL</th>
                        <th className="py-1.5 px-2 text-right">Act</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900">
                      {positions.map((pos) => (
                        <tr key={pos.id}>
                          <td className="py-1.5 px-2 font-bold text-slate-200">{pos.side}</td>
                          <td className="py-1.5 px-2 text-slate-300">{pos.lots}</td>
                          <td className="py-1.5 px-2 text-slate-300">${pos.entryPrice.toFixed(2)}</td>
                          <td className={`py-1.5 px-2 text-right font-bold ${pos.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${pos.pnl.toFixed(2)}
                          </td>
                          <td className="py-1.5 px-2 text-right space-x-1">
                            <button
                              onClick={() => onSetBreakEven(pos.id)}
                              className="px-1 py-0.5 bg-neutral-800 text-slate-300 rounded cursor-pointer"
                            >
                              BE
                            </button>
                            <button
                              onClick={() => onClosePosition(pos.id)}
                              className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded cursor-pointer"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : tradeHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-36 text-slate-500 space-y-1">
                  <History className="w-5 h-5 text-slate-600" />
                  <span className="text-xs">No closed trades</span>
                </div>
              ) : (
                <table className="w-full text-left font-mono text-[10px]">
                  <thead className="bg-neutral-950/60 text-slate-500 border-b border-neutral-800">
                    <tr>
                      <th className="py-1.5 px-2">Side</th>
                      <th className="py-1.5 px-2">Lots</th>
                      <th className="py-1.5 px-2 text-right">PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900">
                    {tradeHistory.map((trade, idx) => (
                      <tr key={`${trade.id}-${idx}`}>
                        <td className="py-1.5 px-2 font-bold text-slate-300">{trade.side}</td>
                        <td className="py-1.5 px-2 text-slate-400">{trade.lots}</td>
                        <td className={`py-1.5 px-2 text-right font-bold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ${trade.pnl.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

