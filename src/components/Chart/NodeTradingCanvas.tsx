import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Candle, 
  PriceNode, 
  ChartType, 
  Timeframe, 
  OrderBookItem, 
  ICTKillzone,
  HTFTimeframe,
  HTFCandleProfile
} from '../../types/market';
import { 
  RotateCcw, 
  Layers, 
  GitFork, 
  TrendingUp, 
  TrendingDown, 
  BarChart2, 
  Flame,
  Clock,
  Box,
  Target,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  ZoomIn,
  ZoomOut,
  Zap,
  Crosshair,
  Globe,
  Sparkles,
  SlidersHorizontal,
  Check,
  Eye,
  Palette,
  Maximize2,
  Minimize2,
  Droplets,
  ExternalLink,
  Ruler,
  Percent,
  Trash2,
  ArrowUpDown,
  Grid,
  CircleDot,
  Activity,
  Compass
} from 'lucide-react';
import { LiquidityDensityOverlay } from './LiquidityDensityOverlay';
import { DeltaVolumeBubbleOverlay } from './DeltaVolumeBubbleOverlay';
import { BloombergChannelModal } from './BloombergChannelModal';
import {
  calculateBloombergSmartChannel,
  BloombergChannelConfig,
  BloombergChannelResult,
  DEFAULT_BLOOMBERG_CHANNEL_CONFIG,
} from '../../services/bloombergChannelService';
import { 
  getCandleKillzone, 
  getCurrentKillzones, 
  ICT_KILLZONES, 
  buildHTFCandleProfiles 
} from '../../services/structuralNodeDetector';
import { 
  BigBelugaLiquidityZone, 
  BigBelugaConfig, 
  DEFAULT_BIG_BELUGA_CONFIG, 
  detectBigBelugaLiquidityZones 
} from '../../services/bigBelugaLiquidityZones';
import {
  calculateDeltaVolumeBubbles,
  DeltaBubble,
  DeltaBubbleConfig,
  DEFAULT_DELTA_BUBBLE_CONFIG,
  DeltaBubbleMetrics
} from '../../services/deltaVolumeBubbleService';
import {
  FibDrawingState,
  calculateFibLevels,
  autoFindBestFibNodes
} from '../../services/fibonacciService';
import { useTheme } from '../../context/ThemeContext';
import { BorderCandleStyle, BorderCandleWidth } from '../../types/theme';

interface NodeTradingCanvasProps {
  candles: Candle[];
  nodes: PriceNode[];
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  onSelectNode: (node: PriceNode) => void;
  selectedNode: PriceNode | null;
  bids?: OrderBookItem[];
  asks?: OrderBookItem[];
  spread?: number;
  onPrefillPrice?: (price: number) => void;
  onOpenOrder?: (side: 'BUY' | 'SELL', lots: number, sl?: number, tp?: number, limitPrice?: number) => void;
  onOpenPerformance?: () => void;
  onOpenCfdCalibration?: () => void;
  onOpenThemeStudio?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  syncedCrosshairPrice?: number | null;
  crosshairSyncSource?: 'chart' | 'dom' | null;
  crosshairSyncEnabled?: boolean;
  onCrosshairPriceChange?: (price: number | null) => void;
  onToggleCrosshairSync?: () => void;
}

export const NodeTradingCanvas: React.FC<NodeTradingCanvasProps> = ({
  candles,
  nodes,
  timeframe,
  onTimeframeChange,
  onSelectNode,
  selectedNode,
  bids = [],
  asks = [],
  spread = 0.18,
  onPrefillPrice,
  onOpenOrder,
  onOpenPerformance,
  onOpenCfdCalibration,
  onOpenThemeStudio,
  isFullscreen: propIsFullscreen,
  onToggleFullscreen,
  syncedCrosshairPrice = null,
  crosshairSyncSource = null,
  crosshairSyncEnabled = true,
  onCrosshairPriceChange,
  onToggleCrosshairSync,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fullscreen State & Controller
  const [internalIsFullscreen, setInternalIsFullscreen] = useState<boolean>(false);
  const isFullscreen = propIsFullscreen !== undefined ? propIsFullscreen : internalIsFullscreen;

  const toggleFullscreen = useCallback(() => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    } else {
      setInternalIsFullscreen(prev => !prev);
    }

    try {
      if (!document.fullscreenElement) {
        const elem = containerRef.current || document.documentElement;
        if (elem.requestFullscreen) {
          elem.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch {
      // Graceful fallback for iframe environments
    }
  }, [onToggleFullscreen]);

  // Global keydown listener for ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        if (onToggleFullscreen) {
          onToggleFullscreen();
        } else {
          setInternalIsFullscreen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, onToggleFullscreen]);

  // Viewport / Camera state
  const [visibleCount, setVisibleCount] = useState<number>(60);
  const [offsetRight, setOffsetRight] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [initialOffset, setInitialOffset] = useState<number>(0);
  
  // Interactive options
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [showNodes, setShowNodes] = useState<boolean>(true);
  const [showNodePaths, setShowNodePaths] = useState<boolean>(true);
  const [showEma, setShowEma] = useState<boolean>(true);
  const [showVolumeProfile, setShowVolumeProfile] = useState<boolean>(true);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showKillzones, setShowKillzones] = useState<boolean>(false);
  const [showFvg, setShowFvg] = useState<boolean>(true);

  // HD High-Definition Candlestick & Pro Terminal Styling
  const [hdStyle, setHdStyle] = useState<'tradingview' | 'mt5'>('tradingview');
  const [showCrispBorders, setShowCrispBorders] = useState<boolean>(true);
  const [showBidAskLines, setShowBidAskLines] = useState<boolean>(true);
  const [showCandleCountdown, setShowCandleCountdown] = useState<boolean>(true);
  const [showHdSettings, setShowHdSettings] = useState<boolean>(false);
  const [showBorderCandleMenu, setShowBorderCandleMenu] = useState<boolean>(false);

  // Price Line (Garis Harga XAU/USD) & Slowmo Smooth Motion Controller
  const [showPriceLine, setShowPriceLine] = useState<boolean>(true);
  const [priceLineStyle, setPriceLineStyle] = useState<'laser' | 'dashed' | 'solid'>('laser');
  const [showPricePulse, setShowPricePulse] = useState<boolean>(true);
  const [smoothPriceMode, setSmoothPriceMode] = useState<'slowmo' | 'smooth' | 'instant'>('slowmo');
  const [showPriceLineMenu, setShowPriceLineMenu] = useState<boolean>(false);
  const [showSlowmoMenu, setShowSlowmoMenu] = useState<boolean>(false);

  // Global Theme & Border Candle Settings
  const { theme, borderSettings, updateBorderSettings, candleThemeConfig, setCandleTheme } = useTheme();

  // MaxMaserati 3.0: Liquidity Sweep of Candle & Swing
  const [showSweeps, setShowSweeps] = useState<boolean>(true);

  // ChartPrime: HTF Candle Volume Profile & POC Matrix
  const [showHtfProfile, setShowHtfProfile] = useState<boolean>(true);
  const [htfTimeframe, setHtfTimeframe] = useState<HTFTimeframe>('1h');
  const [showHtfEnvelopes, setShowHtfEnvelopes] = useState<boolean>(true);

  // BigBeluga Liquidity Zones (https://id.tradingview.com/script/7d2zeIlZ-Liquidity-Zones-BigBeluga/)
  const [showBigBelugaZones, setShowBigBelugaZones] = useState<boolean>(true);
  const [bigBelugaConfig, setBigBelugaConfig] = useState<BigBelugaConfig>(DEFAULT_BIG_BELUGA_CONFIG);
  const [showBigBelugaMenu, setShowBigBelugaMenu] = useState<boolean>(false);

  const [hoveredNode, setHoveredNode] = useState<PriceNode | null>(null);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);
  const [nowSec, setNowSec] = useState<number>(Date.now());
  const viewportBoundsRef = useRef<{ min: number; max: number } | null>(null);
  const animatedPriceRef = useRef<number | null>(null);
  const animatedVisibleCountRef = useRef<number>(60);
  const animatedOffsetRightRef = useRef<number>(0);
  const firstCandleKeyRef = useRef<string>('');
  const animFrameIdRef = useRef<number | null>(null);
  const drawRef = useRef<() => void>(() => {});
  const [isCalibratingTimeframe, setIsCalibratingTimeframe] = useState<boolean>(false);

  useEffect(() => {
    // Reset smooth viewport bounds & animated price when timeframe changes
    viewportBoundsRef.current = null;
    animatedPriceRef.current = null;
    setIsCalibratingTimeframe(true);
    const timer = window.setTimeout(() => {
      setIsCalibratingTimeframe(false);
    }, 480);
    return () => clearTimeout(timer);
  }, [timeframe]);

  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  const timeframes: Timeframe[] = ['1s', '1m', '5m', '15m', '1h', '4h', '1D'];
  const htfTimeframes: HTFTimeframe[] = ['15m', '1h', '4h', '1D'];

  // Calculate BigBeluga Liquidity Zones
  const bigBelugaZones = useMemo(() => {
    if (!showBigBelugaZones || candles.length === 0) return [];
    return detectBigBelugaLiquidityZones(candles, bigBelugaConfig);
  }, [candles, showBigBelugaZones, bigBelugaConfig]);

  const activeBigBelugaHighs = useMemo(
    () => bigBelugaZones.filter(z => z.type === 'HIGH_ZONE' && !z.isGrabbed),
    [bigBelugaZones]
  );
  const activeBigBelugaLows = useMemo(
    () => bigBelugaZones.filter(z => z.type === 'LOW_ZONE' && !z.isGrabbed),
    [bigBelugaZones]
  );
  const grabbedBigBelugaZones = useMemo(
    () => bigBelugaZones.filter(z => z.isGrabbed),
    [bigBelugaZones]
  );

  // Background Grid Lines Controller (User brief: "hapus grid vertikal dan horizontal pada bg chart")
  const [showGridLines, setShowGridLines] = useState<boolean>(false);

  // Delta Volume Bubble [Quant / Z-Score] by tncylyv
  // https://id.tradingview.com/script/m2Z0v7Jw-Delta-Volume-Bubble-Quant-Z-Score-by-tncylyv/
  const [showDeltaBubbles, setShowDeltaBubbles] = useState<boolean>(true);
  const [deltaBubbleConfig, setDeltaBubbleConfig] = useState<DeltaBubbleConfig>(DEFAULT_DELTA_BUBBLE_CONFIG);
  const [showDeltaBubbleMenu, setShowDeltaBubbleMenu] = useState<boolean>(false);
  const [hoveredDeltaBubble, setHoveredDeltaBubble] = useState<DeltaBubble | null>(null);

  // Calculate Delta Volume Bubbles & Quant Z-Scores
  const deltaMetrics: DeltaBubbleMetrics = useMemo(() => {
    if (!showDeltaBubbles || candles.length === 0) {
      return {
        bubbles: [],
        latestDelta: 0,
        latestZScore: 0,
        latestVolZScore: 0,
        bullishCount: 0,
        bearishCount: 0,
        absorptionCount: 0,
        cvd: [],
      };
    }
    return calculateDeltaVolumeBubbles(candles, deltaBubbleConfig);
  }, [candles, showDeltaBubbles, deltaBubbleConfig]);

  const deltaBubbles = deltaMetrics.bubbles;

  // Interactive Fibonacci Retracement Tool
  const [isFibToolActive, setIsFibToolActive] = useState<boolean>(false);
  const [isFibDrawing, setIsFibDrawing] = useState<boolean>(false);
  const [fibDragAnchor, setFibDragAnchor] = useState<'start' | 'end' | 'new' | null>(null);
  const [fibState, setFibState] = useState<FibDrawingState | null>(null);
  const [showFibGoldenZoneOnly, setShowFibGoldenZoneOnly] = useState<boolean>(false);
  const [fibSnapToNodes, setFibSnapToNodes] = useState<boolean>(true);

  // Auto Smart Channel Bloomberg (Automated Linear Regression & StdDev Volatility Envelope)
  const [showBloombergChannel, setShowBloombergChannel] = useState<boolean>(true);
  const [bloombergChannelConfig, setBloombergChannelConfig] = useState<BloombergChannelConfig>(DEFAULT_BLOOMBERG_CHANNEL_CONFIG);
  const [showBloombergChannelModal, setShowBloombergChannelModal] = useState<boolean>(false);

  const bloombergChannel: BloombergChannelResult | null = useMemo(() => {
    if (!showBloombergChannel || candles.length === 0) return null;
    return calculateBloombergSmartChannel(candles, bloombergChannelConfig);
  }, [candles, showBloombergChannel, bloombergChannelConfig]);

  // Real-time 1-second ticker for candle close countdown
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowSec(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeKillzones = useMemo(() => {
    return getCurrentKillzones(nowSec);
  }, [nowSec]);

  // Timeframe duration in ms
  const timeframeDurationMs = useMemo(() => {
    switch (timeframe) {
      case '1s': return 1000;
      case '1m': return 60000;
      case '5m': return 300000;
      case '15m': return 900000;
      case '1h': return 3600000;
      case '4h': return 14400000;
      case '1D': return 86400000;
      default: return 60000;
    }
  }, [timeframe]);

  // Calculate EMA
  const calculateEMA = useCallback((data: Candle[], period: number): (number | null)[] => {
    const k = 2 / (period + 1);
    const emaArray: (number | null)[] = [];
    let prevEma: number | null = null;

    for (let i = 0; i < data.length; i++) {
      const close = data[i].close;
      if (i < period - 1) {
        emaArray.push(null);
      } else if (i === period - 1) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += data[j].close;
        }
        prevEma = sum / period;
        emaArray.push(prevEma);
      } else {
        prevEma = close * k + prevEma! * (1 - k);
        emaArray.push(prevEma);
      }
    }
    return emaArray;
  }, []);

  // Attach non-passive wheel listener supporting buttery-smooth zoom and horizontal pan
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Horizontal trackpad swipe or Shift + Wheel pans horizontally
      const isHorizontalSwipe = !e.ctrlKey && !e.metaKey && (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.15);

      if (isHorizontalSwipe) {
        const rawDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        const shift = rawDelta / 14;
        setOffsetRight(prev => Math.max(0, Math.min(Math.max(0, candles.length - 12), +(prev - shift).toFixed(3))));
      } else {
        // Proportional smooth zoom on vertical mouse wheel or pinch-zoom
        const intensity = Math.min(0.18, Math.max(0.025, Math.abs(e.deltaY) * 0.0012));
        const zoomFactor = e.deltaY > 0 ? 1 + intensity : 1 - intensity;
        setVisibleCount(prev => Math.max(12, Math.min(220, +(prev * zoomFactor).toFixed(3))));
      }
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [candles.length]);

  // Master HD Canvas Render Routine
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 100 || height <= 80) return;

    // High-DPI Retina / 4K Sharp Display Scaling
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const targetWidth = Math.floor(width * dpr);
    const targetHeight = Math.floor(height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Dynamic Theme Canvas Colors for all 11 UI Themes
    let canvasBg = '#0b0e14';
    let gridLineColor = '#141d2e';
    let axisTextColor = '#64748b';

    if (theme === 'white') {
      canvasBg = '#ffffff';
      gridLineColor = '#f1f5f9';
      axisTextColor = '#475569';
    } else if (theme === 'gold') {
      canvasBg = '#100d07';
      gridLineColor = '#241a0b';
      axisTextColor = '#b45309';
    } else if (theme === 'cyber') {
      canvasBg = '#070e1b';
      gridLineColor = '#101e33';
      axisTextColor = '#0284c7';
    } else if (theme === 'emerald') {
      canvasBg = '#05130f';
      gridLineColor = '#0b261b';
      axisTextColor = '#059669';
    } else if (theme === 'light') {
      canvasBg = '#f8fafc';
      gridLineColor = '#e2e8f0';
      axisTextColor = '#64748b';
    } else if (theme === 'tokyo_neon') {
      canvasBg = '#0d0919';
      gridLineColor = '#1a1233';
      axisTextColor = '#a78bfa';
    } else if (theme === 'sakura') {
      canvasBg = '#140d16';
      gridLineColor = '#241428';
      axisTextColor = '#f472b6';
    } else if (theme === 'nordic_ice') {
      canvasBg = '#070f18';
      gridLineColor = '#0f2338';
      axisTextColor = '#38bdf8';
    } else if (theme === 'midnight_violet') {
      canvasBg = '#0a0614';
      gridLineColor = '#170d2f';
      axisTextColor = '#c084fc';
    } else if (theme === 'warm_mocha') {
      canvasBg = '#110c08';
      gridLineColor = '#21160d';
      axisTextColor = '#d97706';
    }

    // Solid Terminal Background
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, width, height);

    // Layout Dimensions
    const paddingRight = 82; // Y-axis price scale
    const paddingBottom = 26; // X-axis time scale
    const chartWidth = Math.max(10, width - paddingRight);
    const chartHeight = Math.max(10, height - paddingBottom);
    const volumeHeight = Math.min(75, Math.max(28, chartHeight * 0.18));
    const priceChartHeight = Math.max(40, chartHeight - volumeHeight);

    // Continuous 60FPS sub-pixel interpolation for Zoom (visibleCount) & Pan (offsetRight)
    const totalCandles = candles.length;
    const targetSafeOffset = Math.max(0, Math.min(Math.max(0, totalCandles - 12), offsetRight));
    const targetSafeVisible = Math.max(12, Math.min(220, visibleCount));

    // Only reset interpolation when the underlying dataset/timeframe reloads, NEVER on zoom/pan
    const currentDatasetKey = `${timeframe}-${candles[0]?.time || 0}`;
    const isHistoryReloaded = firstCandleKeyRef.current !== currentDatasetKey;
    if (isHistoryReloaded) {
      firstCandleKeyRef.current = currentDatasetKey;
      animatedVisibleCountRef.current = targetSafeVisible;
      animatedOffsetRightRef.current = targetSafeOffset;
    }

    let needsAnimation = false;

    const zoomDiff = targetSafeVisible - animatedVisibleCountRef.current;
    const offsetDiff = targetSafeOffset - animatedOffsetRightRef.current;
    const zoomLerpRate = 0.16; // Buttery-smooth 60FPS zoom easing
    const panLerpRate = isDragging ? 0.45 : 0.20; // Fluid pan & drag glide

    if (Math.abs(zoomDiff) > 0.008) {
      animatedVisibleCountRef.current += zoomDiff * zoomLerpRate;
      needsAnimation = true;
    } else {
      animatedVisibleCountRef.current = targetSafeVisible;
    }

    if (Math.abs(offsetDiff) > 0.008) {
      animatedOffsetRightRef.current += offsetDiff * panLerpRate;
      needsAnimation = true;
    } else {
      animatedOffsetRightRef.current = targetSafeOffset;
    }

    const animVisibleCount = animatedVisibleCountRef.current;
    const animOffsetRight = animatedOffsetRightRef.current;

    const exactEndIdx = Math.max(12, Math.min(totalCandles, totalCandles - animOffsetRight));
    const exactStartIdx = Math.max(0, exactEndIdx - animVisibleCount);
    const effectiveVisibleSpan = Math.max(8, exactEndIdx - exactStartIdx);

    const startIdx = Math.max(0, Math.floor(exactStartIdx));
    const endIdx = Math.min(totalCandles, Math.ceil(exactEndIdx));
    const visibleCandles = candles.slice(startIdx, endIdx);
    const count = visibleCandles.length;

    if (count === 0) {
      ctx.restore();
      return;
    }

    // Min and Max prices for visible range
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    for (const c of visibleCandles) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    }

    if (!isFinite(minPrice) || !isFinite(maxPrice) || minPrice >= maxPrice) {
      const fallbackMid = candles[candles.length - 1]?.close || 4141.80;
      minPrice = fallbackMid - 5;
      maxPrice = fallbackMid + 5;
    }

    const rawRange = Math.max(0.5, maxPrice - minPrice);
    const priceMargin = Math.max(1.2, rawRange * 0.10);
    const targetMinPrice = +(minPrice - priceMargin).toFixed(3);
    const targetMaxPrice = +(maxPrice + priceMargin).toFixed(3);

    // Active real-time price target
    const targetCurrentPrice = candles[totalCandles - 1]?.close || 4141.80;

    // Slowmo smooth easing rate
    const lerpRate = smoothPriceMode === 'slowmo' 
      ? 0.075 // Buttery cinematic slow-mo glide (~650ms smooth transition)
      : smoothPriceMode === 'smooth'
      ? 0.20  // Responsive 60FPS fluid easing
      : 1.0;  // Instant step

    if (
      isHistoryReloaded ||
      animatedPriceRef.current === null ||
      Math.abs(animatedPriceRef.current - targetCurrentPrice) > 1.5 ||
      smoothPriceMode === 'instant'
    ) {
      animatedPriceRef.current = targetCurrentPrice;
    } else {
      animatedPriceRef.current += (targetCurrentPrice - animatedPriceRef.current) * lerpRate;
    }

    // Viewport vertical Y-axis bounds smoothing (always smooth during zoom in/out)
    if (isHistoryReloaded || !viewportBoundsRef.current) {
      viewportBoundsRef.current = { min: targetMinPrice, max: targetMaxPrice };
    } else {
      const minDiff = targetMinPrice - viewportBoundsRef.current.min;
      const maxDiff = targetMaxPrice - viewportBoundsRef.current.max;
      const boundsRate = Math.abs(zoomDiff) > 0.01 ? 0.18 : (smoothPriceMode === 'slowmo' ? 0.10 : 0.20);
      viewportBoundsRef.current.min += minDiff * boundsRate;
      viewportBoundsRef.current.max += maxDiff * boundsRate;

      if (Math.abs(minDiff) > 0.005 || Math.abs(maxDiff) > 0.005) {
        needsAnimation = true;
      } else {
        viewportBoundsRef.current.min = targetMinPrice;
        viewportBoundsRef.current.max = targetMaxPrice;
      }
    }

    if (Math.abs(targetCurrentPrice - animatedPriceRef.current) > 0.002) {
      needsAnimation = true;
    } else {
      animatedPriceRef.current = targetCurrentPrice;
    }

    // Keep continuous rAF loop for radar beacon pulse when viewing live active candle
    if (offsetRight < 0.5 && showPriceLine && showPricePulse) {
      needsAnimation = true;
    }

    const renderMinPrice = viewportBoundsRef.current.min;
    const renderMaxPrice = viewportBoundsRef.current.max;
    const renderRange = Math.max(0.2, renderMaxPrice - renderMinPrice);

    // Continuous sub-pixel coordinate conversion helpers
    const continuousStep = chartWidth / effectiveVisibleSpan;
    const subIndexOffset = exactStartIdx - startIdx;

    const getX = (indexInVisible: number) => {
      return (indexInVisible - subIndexOffset + 0.5) * continuousStep;
    };

    const getY = (price: number) => {
      return priceChartHeight - ((price - renderMinPrice) / renderRange) * priceChartHeight;
    };

    const getPriceAtY = (y: number) => {
      const clampedY = Math.max(0, Math.min(priceChartHeight, y));
      const ratio = (priceChartHeight - clampedY) / priceChartHeight;
      return renderMinPrice + ratio * renderRange;
    };

    const getNodeX = (node: PriceNode): number => {
      if (node.candleIndex >= startIdx && node.candleIndex < endIdx) {
        return getX(node.candleIndex - startIdx);
      }
      let closestIdx = -1;
      let minDiff = Infinity;
      for (let i = 0; i < count; i++) {
        const diff = Math.abs(visibleCandles[i].time - node.time);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      if (closestIdx !== -1 && minDiff <= timeframeDurationMs * 2) {
        return getX(closestIdx);
      }
      const minVisibleTime = visibleCandles[0].time;
      const maxVisibleTime = visibleCandles[count - 1].time;
      if (maxVisibleTime > minVisibleTime) {
        const ratio = (node.time - minVisibleTime) / (maxVisibleTime - minVisibleTime);
        return ratio * chartWidth;
      }
      return -100;
    };

    // 0.5. CHARTPRIME: HTF Candle Volume Profile & Candle Ghost Envelopes
    if (showHtfProfile && visibleCandles.length > 0) {
      const htfProfiles = buildHTFCandleProfiles(candles, htfTimeframe);
      const minVisibleTime = visibleCandles[0].time;
      const maxVisibleTime = visibleCandles[count - 1].time;

      for (const htf of htfProfiles) {
        if (htf.endTime < minVisibleTime || htf.startTime > maxVisibleTime + timeframeDurationMs) {
          continue;
        }

        let startX = -100;
        let endX = chartWidth + 100;

        for (let i = 0; i < count; i++) {
          if (visibleCandles[i].time >= htf.startTime && startX === -100) {
            startX = getX(i) - continuousStep / 2;
          }
          if (visibleCandles[i].time <= htf.endTime) {
            endX = getX(i) + continuousStep / 2;
          }
        }

        startX = Math.max(0, startX === -100 ? 0 : startX);
        endX = Math.min(chartWidth, endX);
        const boxWidth = Math.max(20, endX - startX);

        const yHigh = getY(htf.high);
        const yLow = getY(htf.low);
        const yOpen = getY(htf.open);
        const yClose = getY(htf.close);
        const boxHeight = Math.max(10, yLow - yHigh);

        if (showHtfEnvelopes) {
          ctx.fillStyle = htf.isBullish 
            ? 'rgba(16, 185, 129, 0.035)' 
            : 'rgba(244, 63, 94, 0.035)';
          ctx.fillRect(startX, yHigh, boxWidth, boxHeight);

          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = htf.isBullish ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)';
          ctx.lineWidth = 1;
          ctx.strokeRect(startX, yHigh, boxWidth, boxHeight);
          ctx.setLineDash([]);

          const bodyTop = Math.min(yOpen, yClose);
          const bodyBottom = Math.max(yOpen, yClose);
          ctx.fillStyle = htf.isBullish ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)';
          ctx.fillRect(startX, bodyTop, boxWidth, Math.max(2, bodyBottom - bodyTop));

          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(startX + 2, yHigh + 2, 54, 9.5);
          ctx.strokeStyle = htf.isBullish ? 'rgba(16, 185, 129, 0.6)' : 'rgba(244, 63, 94, 0.6)';
          ctx.strokeRect(startX + 2, yHigh + 2, 54, 9.5);

          ctx.fillStyle = htf.isBullish ? '#34d399' : '#fb7185';
          ctx.font = 'bold 6.5px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(`HTF ${htf.htfTimeframe} ${htf.isBullish ? 'BULL' : 'BEAR'}`, startX + 4.5, yHigh + 6.8);
        }

        const maxBinVol = Math.max(...htf.bins.map(b => b.volume), 1);
        const profileHistogramWidth = Math.min(80, boxWidth * 0.45);

        for (const bin of htf.bins) {
          if (bin.volume === 0) continue;
          const binYTop = getY(bin.priceHigh);
          const binYBottom = getY(bin.priceLow);
          const binHeight = Math.max(1.5, binYBottom - binYTop - 0.5);

          const totalBinLen = (bin.volume / maxBinVol) * profileHistogramWidth;
          const buyRatio = bin.volume > 0 ? bin.buyVolume / bin.volume : 0.5;
          const buyLen = totalBinLen * buyRatio;

          const barX = endX - totalBinLen;

          ctx.fillStyle = bin.isPoc ? 'rgba(16, 185, 129, 0.70)' : 'rgba(16, 185, 129, 0.35)';
          ctx.fillRect(barX, binYTop, buyLen, binHeight);

          ctx.fillStyle = bin.isPoc ? 'rgba(244, 63, 94, 0.70)' : 'rgba(244, 63, 94, 0.35)';
          ctx.fillRect(barX + buyLen, binYTop, totalBinLen - buyLen, binHeight);
        }

        // POC, VAH, VAL horizontal levels
        const pocY = getY(htf.pocPrice);
        const vahY = getY(htf.vahPrice);
        const valY = getY(htf.valPrice);

        ctx.setLineDash([4, 2]);
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(startX, pocY);
        ctx.lineTo(endX, pocY);
        ctx.stroke();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX, vahY);
        ctx.lineTo(endX, vahY);
        ctx.stroke();

        ctx.strokeStyle = '#818cf8';
        ctx.beginPath();
        ctx.moveTo(startX, valY);
        ctx.lineTo(endX, valY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#eab308';
        ctx.font = 'bold 6.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`POC $${htf.pocPrice.toFixed(2)}`, startX + 4, pocY - 3);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '6px "JetBrains Mono", monospace';
        ctx.fillText(`VAH $${htf.vahPrice.toFixed(2)}`, startX + 4, vahY - 2);

        ctx.fillStyle = '#818cf8';
        ctx.font = '6px "JetBrains Mono", monospace';
        ctx.fillText(`VAL $${htf.valPrice.toFixed(2)}`, startX + 4, valY + 7);
      }
    }

    // 1. HD Crisp Axis Scale & Optional Grid Lines (Grid removed on chart bg as requested)
    ctx.lineWidth = 1;
    ctx.strokeStyle = gridLineColor;

    const gridStepCount = Math.max(4, Math.min(8, Math.floor(priceChartHeight / 45)));
    for (let i = 0; i <= gridStepCount; i++) {
      const rawY = (priceChartHeight / gridStepCount) * i;
      const y = Math.floor(rawY) + 0.5;
      const priceVal = getPriceAtY(rawY);

      // Only draw horizontal grid lines across chart if explicitly enabled by user
      if (showGridLines) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();
      }

      // Crisp axis tick mark at price scale border
      ctx.beginPath();
      ctx.moveTo(chartWidth, y);
      ctx.lineTo(chartWidth + 4, y);
      ctx.strokeStyle = gridLineColor;
      ctx.stroke();

      ctx.fillStyle = axisTextColor;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(priceVal.toFixed(2), chartWidth + 8, rawY);
    }

    const timeStep = Math.max(1, Math.floor(count / 6));
    for (let i = 0; i < count; i += timeStep) {
      const rawX = getX(i);
      const x = Math.floor(rawX) + 0.5;

      // Only draw vertical grid lines across chart if explicitly enabled by user
      if (showGridLines) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, chartHeight);
        ctx.stroke();
      }

      // Crisp axis tick mark at time scale border
      ctx.beginPath();
      ctx.moveTo(x, chartHeight);
      ctx.lineTo(x, chartHeight + 4);
      ctx.strokeStyle = gridLineColor;
      ctx.stroke();

      const time = new Date(visibleCandles[i].time);
      const timeStr = time.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: timeframe === '1s' ? '2-digit' : undefined 
      });
      ctx.fillStyle = axisTextColor;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(timeStr, x, chartHeight + 6);
    }

    // 2. Order Book DOM Liquidity Heatmap Bands
    if (showHeatmap && (bids.length > 0 || asks.length > 0)) {
      const maxOrderAmount = Math.max(
        ...bids.map(b => b.amount),
        ...asks.map(a => a.amount),
        1
      );

      for (const ask of asks) {
        const y = getY(ask.price);
        if (y >= 0 && y <= priceChartHeight) {
          const ratio = Math.min(1, ask.amount / maxOrderAmount);
          const barWidth = Math.max(15, ratio * (chartWidth * 0.38));
          
          const grad = ctx.createLinearGradient(chartWidth - barWidth, y, chartWidth, y);
          grad.addColorStop(0, 'rgba(244, 63, 94, 0.0)');
          grad.addColorStop(0.4, 'rgba(244, 63, 94, 0.12)');
          grad.addColorStop(1, 'rgba(244, 63, 94, 0.32)');

          ctx.fillStyle = grad;
          ctx.fillRect(chartWidth - barWidth, y - 5, barWidth, 10);

          ctx.fillStyle = 'rgba(244, 63, 94, 0.6)';
          ctx.fillRect(chartWidth - 4, y - 1, 4, 2);

          if (ratio > 0.65) {
            ctx.fillStyle = '#fca5a5';
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${ask.amount.toFixed(0)} Oz`, chartWidth - barWidth - 4, y);
          }
        }
      }

      for (const bid of bids) {
        const y = getY(bid.price);
        if (y >= 0 && y <= priceChartHeight) {
          const ratio = Math.min(1, bid.amount / maxOrderAmount);
          const barWidth = Math.max(15, ratio * (chartWidth * 0.38));

          const grad = ctx.createLinearGradient(chartWidth - barWidth, y, chartWidth, y);
          grad.addColorStop(0, 'rgba(16, 185, 129, 0.0)');
          grad.addColorStop(0.4, 'rgba(16, 185, 129, 0.12)');
          grad.addColorStop(1, 'rgba(16, 185, 129, 0.32)');

          ctx.fillStyle = grad;
          ctx.fillRect(chartWidth - barWidth, y - 5, barWidth, 10);

          ctx.fillStyle = 'rgba(16, 185, 129, 0.6)';
          ctx.fillRect(chartWidth - 4, y - 1, 4, 2);

          if (ratio > 0.65) {
            ctx.fillStyle = '#6ee7b7';
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${bid.amount.toFixed(0)} Oz`, chartWidth - barWidth - 4, y);
          }
        }
      }
    }

    // 3. Volume Profile (HVN Nodes on right side)
    if (showVolumeProfile) {
      const profileBuckets = 20;
      const bucketSize = renderRange / profileBuckets;
      const buckets = new Float32Array(profileBuckets);

      visibleCandles.forEach(c => {
        const bIdx = Math.min(profileBuckets - 1, Math.max(0, Math.floor((c.close - renderMinPrice) / bucketSize)));
        buckets[bIdx] += c.volume;
      });

      let maxBucket = 0;
      for (let b = 0; b < profileBuckets; b++) {
        if (buckets[b] > maxBucket) maxBucket = buckets[b];
      }

      if (maxBucket > 0) {
        const profileWidth = 85;

        for (let b = 0; b < profileBuckets; b++) {
          const bPriceLow = renderMinPrice + b * bucketSize;
          const bPriceHigh = bPriceLow + bucketSize;
          const yTop = getY(bPriceHigh);
          const yBottom = getY(bPriceLow);
          const barLen = (buckets[b] / maxBucket) * profileWidth;
          const isPOC = buckets[b] === maxBucket;

          ctx.fillStyle = isPOC ? 'rgba(234, 179, 8, 0.28)' : 'rgba(56, 189, 248, 0.10)';
          ctx.fillRect(chartWidth - barLen, yTop, barLen, Math.max(1, yBottom - yTop - 1));

          if (isPOC) {
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = 'rgba(234, 179, 8, 0.65)';
            ctx.beginPath();
            ctx.moveTo(0, (yTop + yBottom) / 2);
            ctx.lineTo(chartWidth, (yTop + yBottom) / 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
    }

    // 4. Render Volume Histogram at the bottom (smooth sub-pixel width & position)
    const barStep = continuousStep;
    const barWidth = Math.max(1.8, barStep * 0.72);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, chartWidth, chartHeight);
    ctx.clip();

    for (let i = 0; i < count; i++) {
      const c = visibleCandles[i];
      const isUp = c.close >= c.open;
      const x = getX(i);
      if (x < -barWidth || x > chartWidth + barWidth) continue;
      const vRatio = maxVol > 0 ? c.volume / maxVol : 0;
      const vHeight = Math.max(2, vRatio * (volumeHeight - 8));
      const vy = chartHeight - vHeight;

      ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)';
      ctx.fillRect(x - barWidth / 2, vy, barWidth, vHeight);
    }
    ctx.restore();

    // 5. Render EMAs (EMA 20 & EMA 50)
    if (showEma) {
      const ema20 = calculateEMA(candles, 20);
      const ema50 = calculateEMA(candles, 50);

      // EMA 20 (Cyan)
      ctx.beginPath();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      let started = false;
      for (let i = 0; i < count; i++) {
        const globalIdx = startIdx + i;
        const val = ema20[globalIdx];
        if (val !== null && isFinite(val)) {
          const x = getX(i);
          const y = getY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();

      // EMA 50 (Amber)
      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      started = false;
      for (let i = 0; i < count; i++) {
        const globalIdx = startIdx + i;
        const val = ema50[globalIdx];
        if (val !== null && isFinite(val)) {
          const x = getX(i);
          const y = getY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
    }

    // 6. Fair Value Gaps (FVG)
    if (showFvg) {
      const fvgNodes = nodes.filter(n => (n.type === 'FVG_BULL' || n.type === 'FVG_BEAR') && n.fvgTop && n.fvgBottom);
      fvgNodes.forEach(fvg => {
        const nx = getNodeX(fvg);
        if (nx >= -50 && nx <= chartWidth) {
          const yTop = getY(fvg.fvgTop!);
          const yBottom = getY(fvg.fvgBottom!);
          const boxH = Math.max(2, Math.abs(yBottom - yTop));
          const boxY = Math.min(yTop, yBottom);
          const boxW = Math.min(chartWidth - nx, 85);

          const isBull = fvg.type === 'FVG_BULL';
          ctx.fillStyle = isBull 
            ? (fvg.isMitigated ? 'rgba(6, 182, 212, 0.05)' : 'rgba(6, 182, 212, 0.16)')
            : (fvg.isMitigated ? 'rgba(249, 115, 22, 0.05)' : 'rgba(249, 115, 22, 0.16)');
          ctx.fillRect(nx, boxY, boxW, boxH);

          ctx.strokeStyle = isBull ? 'rgba(6, 182, 212, 0.45)' : 'rgba(249, 115, 22, 0.45)';
          ctx.lineWidth = 1;
          ctx.strokeRect(nx, boxY, boxW, boxH);

          ctx.fillStyle = isBull ? '#38bdf8' : '#fb923c';
          ctx.font = '6px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(isBull ? '+FVG' : '-FVG', nx + 2.5, boxY + 1.5);
        }
      });
    }

    // 6.5. BigBeluga Liquidity Zones (https://id.tradingview.com/script/7d2zeIlZ-Liquidity-Zones-BigBeluga/)
    if (showBigBelugaZones && bigBelugaZones.length > 0) {
      for (const zone of bigBelugaZones) {
        // Calculate X coordinate
        const relPivotIdx = zone.pivotIndex - startIdx;
        const xStart = Math.max(0, getX(relPivotIdx));

        // Determine X end
        let xEnd = chartWidth;
        if (zone.isGrabbed && zone.grabIndex !== undefined) {
          const relGrabIdx = zone.grabIndex - startIdx;
          if (relGrabIdx < 0) {
            if (relPivotIdx < 0) continue;
            xEnd = Math.max(0, getX(0));
          } else {
            xEnd = Math.min(chartWidth, getX(relGrabIdx));
          }
        }

        if (xStart > chartWidth || xEnd < -20) continue;
        const boxW = Math.max(12, xEnd - xStart);

        const yTop = getY(zone.zoneTop);
        const yBottom = getY(zone.zoneBottom);
        const yPivot = getY(zone.pivotPrice);
        const boxH = Math.max(2, Math.abs(yBottom - yTop));
        const boxY = Math.min(yTop, yBottom);

        const isHigh = zone.type === 'HIGH_ZONE';

        ctx.save();
        if (zone.isGrabbed) {
          // Mitigated / Grabbed zone styling: dashed border, translucent fill
          ctx.fillStyle = isHigh ? 'rgba(244, 63, 94, 0.05)' : 'rgba(16, 185, 129, 0.05)';
          ctx.fillRect(xStart, boxY, boxW, boxH);

          ctx.strokeStyle = isHigh ? 'rgba(244, 63, 94, 0.40)' : 'rgba(16, 185, 129, 0.40)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(xStart, boxY, boxW, boxH);
          ctx.setLineDash([]);

          // Circle marker & text at the exact grab bar
          if (
            zone.grabPrice !== undefined &&
            zone.grabIndex !== undefined &&
            zone.grabIndex >= startIdx &&
            zone.grabIndex < endIdx
          ) {
            const grabX = getX(zone.grabIndex - startIdx);
            const grabY = getY(zone.grabPrice);

            // Circle marker
            ctx.beginPath();
            ctx.arc(grabX, grabY, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = isHigh ? '#f43f5e' : '#10b981';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Label "GRABBED"
            ctx.fillStyle = isHigh ? '#fda4af' : '#a7f3d0';
            ctx.font = 'bold 7.5px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = isHigh ? 'bottom' : 'top';
            ctx.fillText('GRABBED', grabX, isHigh ? grabY - 4 : grabY + 4);
          }
        } else {
          // Active Unmitigated Liquidity Zone: Glowing border, soft gradient fill
          const grad = ctx.createLinearGradient(xStart, boxY, xStart, boxY + boxH);
          if (isHigh) {
            grad.addColorStop(0, 'rgba(244, 63, 94, 0.20)');
            grad.addColorStop(1, 'rgba(244, 63, 94, 0.06)');
          } else {
            grad.addColorStop(0, 'rgba(16, 185, 129, 0.06)');
            grad.addColorStop(1, 'rgba(16, 185, 129, 0.20)');
          }
          ctx.fillStyle = grad;
          ctx.fillRect(xStart, boxY, boxW, boxH);

          // Solid border
          ctx.strokeStyle = isHigh ? 'rgba(244, 63, 94, 0.70)' : 'rgba(16, 185, 129, 0.70)';
          ctx.lineWidth = zone.volStrength === 'HIGH' ? 1.5 : 1;
          ctx.strokeRect(xStart, boxY, boxW, boxH);

          // Horizontal level line along pivot price
          ctx.beginPath();
          ctx.strokeStyle = isHigh ? 'rgba(244, 63, 94, 0.95)' : 'rgba(16, 185, 129, 0.95)';
          ctx.lineWidth = 1;
          ctx.moveTo(xStart, yPivot);
          ctx.lineTo(xEnd, yPivot);
          ctx.stroke();

          // Zone Tag Badge
          const tagLabel = isHigh
            ? `💧 BSL ${zone.pivotPrice.toFixed(2)} (${zone.volRatio}x Vol)`
            : `💧 SSL ${zone.pivotPrice.toFixed(2)} (${zone.volRatio}x Vol)`;

          ctx.font = 'bold 8px "JetBrains Mono", monospace';
          const textWidth = ctx.measureText(tagLabel).width;
          const badgeX = Math.max(xStart + 3, xEnd - textWidth - 8);
          const badgeY = isHigh ? boxY + 2 : boxY + boxH - 12;

          ctx.fillStyle = isHigh ? 'rgba(225, 29, 72, 0.85)' : 'rgba(5, 150, 105, 0.85)';
          ctx.fillRect(badgeX, badgeY, textWidth + 6, 10);
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(tagLabel, badgeX + 3, badgeY + 5);
        }
        ctx.restore();
      }
    }

    // 6.8. Interactive Fibonacci Retracement Tool Overlay
    if (fibState) {
      const levels = calculateFibLevels(fibState.startPrice, fibState.currentPrice);
      
      // Calculate dynamic anchor screen coordinates aligned with structural nodes/candles
      let startX = fibState.startX;
      let endX = fibState.currentX;

      if (!isFibDrawing) {
        if (fibState.snappedStartNodeId) {
          const sNode = nodes.find(n => n.id === fibState.snappedStartNodeId);
          if (sNode) {
            const sx = getNodeX(sNode);
            if (sx > -100 && sx < chartWidth + 100) {
              startX = sx;
            }
          }
        }
        if (fibState.snappedEndNodeId) {
          const eNode = nodes.find(n => n.id === fibState.snappedEndNodeId);
          if (eNode) {
            const ex = getNodeX(eNode);
            if (ex > -100 && ex < chartWidth + 100) {
              endX = ex;
            }
          }
        }
      }

      const startY = getY(fibState.startPrice);
      const endY = getY(fibState.currentPrice);

      const xMin = Math.min(startX, endX);
      const xMax = Math.max(endX, chartWidth);

      ctx.save();

      // 0. Magnetic Node Snapping Highlight Rings
      if (fibState.snappedStartNodeId) {
        const sNode = nodes.find(n => n.id === fibState.snappedStartNodeId);
        if (sNode) {
          const snX = getNodeX(sNode);
          const snY = getY(sNode.price);
          ctx.beginPath();
          ctx.arc(snX, snY, 9, 0, Math.PI * 2);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([2, 2]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      if (fibState.snappedEndNodeId) {
        const eNode = nodes.find(n => n.id === fibState.snappedEndNodeId);
        if (eNode) {
          const enX = getNodeX(eNode);
          const enY = getY(eNode.price);
          ctx.beginPath();
          ctx.arc(enX, enY, 9, 0, Math.PI * 2);
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([2, 2]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // 1. Shaded level bands
      if (!showFibGoldenZoneOnly) {
        for (let i = 0; i < levels.length - 1; i++) {
          const l1 = levels[i];
          const l2 = levels[i + 1];
          const y1 = getY(l1.price);
          const y2 = getY(l2.price);
          const bandTop = Math.min(y1, y2);
          const bandH = Math.max(1, Math.abs(y2 - y1));

          if (l1.level >= 0.0 && l2.level <= 1.0) {
            ctx.fillStyle = l1.bgColor;
            ctx.fillRect(xMin, bandTop, xMax - xMin, bandH);
          }
        }
      }

      // 2. Special Highlight: Golden Pocket (0.500 - 0.618 OTE)
      const l50 = levels.find(l => l.level === 0.5);
      const l618 = levels.find(l => l.level === 0.618);
      if (l50 && l618) {
        const y50 = getY(l50.price);
        const y618 = getY(l618.price);
        const gpTop = Math.min(y50, y618);
        const gpH = Math.max(2, Math.abs(y618 - y50));

        const gpGrad = ctx.createLinearGradient(0, gpTop, 0, gpTop + gpH);
        gpGrad.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
        gpGrad.addColorStop(1, 'rgba(251, 191, 36, 0.14)');
        ctx.fillStyle = gpGrad;
        ctx.fillRect(xMin, gpTop, xMax - xMin, gpH);

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★ GOLDEN POCKET (0.50 - 0.618 OTE)', xMin + (xMax - xMin) / 2, gpTop + gpH / 2);
      }

      // 3. Draw horizontal lines for all Fibonacci levels
      levels.forEach(lvl => {
        const y = getY(lvl.price);
        if (y < -30 || y > priceChartHeight + 30) return;

        ctx.beginPath();
        ctx.strokeStyle = lvl.color;
        ctx.lineWidth = lvl.isKeyZone ? 1.5 : 1;
        if (lvl.level === 0.0 || lvl.level === 1.0) {
          ctx.setLineDash([]);
        } else {
          ctx.setLineDash([3, 2]);
        }
        ctx.moveTo(xMin, y);
        ctx.lineTo(xMax, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Right side level pill badge
        const badgeText = `${lvl.label} ($${lvl.price.toFixed(2)}) ${lvl.name}`;
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        const txtWidth = ctx.measureText(badgeText).width;
        const badgeX = xMax - txtWidth - 8;
        const badgeY = y - 6;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fillRect(badgeX, badgeY, txtWidth + 6, 12);
        ctx.strokeStyle = lvl.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(badgeX, badgeY, txtWidth + 6, 12);

        ctx.fillStyle = lvl.color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, badgeX + 3, y);
      });

      // 4. Diagonal measurement trendline connecting Start & End
      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Start Anchor Node Circle (Origin)
      ctx.beginPath();
      ctx.arc(startX, startY, isFibToolActive ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Outer interactive grab ring if tool active
      if (isFibToolActive) {
        ctx.beginPath();
        ctx.arc(startX, startY, 10, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // End Anchor Node Circle (Target)
      ctx.beginPath();
      ctx.arc(endX, endY, isFibToolActive ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (isFibToolActive) {
        ctx.beginPath();
        ctx.arc(endX, endY, 10, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Midpoint measurement HUD
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const deltaPrice = Math.abs(fibState.currentPrice - fibState.startPrice);
      const deltaPips = (deltaPrice * 10).toFixed(0);
      const hudText = `Fib Δ $${deltaPrice.toFixed(2)} (${deltaPips} pips)`;
      ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
      const hudW = ctx.measureText(hudText).width;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(midX - hudW / 2 - 4, midY - 7, hudW + 8, 14);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.strokeRect(midX - hudW / 2 - 4, midY - 7, hudW + 8, 14);

      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hudText, midX, midY);

      ctx.restore();
    }

    // 6.8. Bloomberg Auto Smart Channel (Regression & Volatility Envelope)
    if (showBloombergChannel && bloombergChannel && bloombergChannel.points.length > 1) {
      const pts = bloombergChannel.points;
      const futPts = bloombergChannelConfig.showProjectedFuture ? bloombergChannel.futurePoints : [];
      const allPts = [...pts, ...futPts];
      
      const isBull = bloombergChannel.regime === 'BULLISH_ASCENDING';
      const isBear = bloombergChannel.regime === 'BEARISH_DESCENDING';
      const baseColor = isBull ? '#f59e0b' : isBear ? '#f43f5e' : '#06b6d4';
      const midColor = '#fbbf24';

      ctx.save();
      // Clip to chart viewing area so channel lines & fills do not bleed into the Y-axis or volume area
      ctx.beginPath();
      ctx.rect(0, 0, chartWidth, priceChartHeight);
      ctx.clip();

      // 1. Shaded Channel Fill (Between Upper & Lower Bands)
      if (bloombergChannelConfig.showFill && allPts.length > 1) {
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < allPts.length; i++) {
          const pt = allPts[i];
          const relIdx = pt.index - startIdx;
          const x = getX(relIdx);
          const y = getY(pt.upperBand);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        for (let i = allPts.length - 1; i >= 0; i--) {
          const pt = allPts[i];
          const relIdx = pt.index - startIdx;
          const x = getX(relIdx);
          const y = getY(pt.lowerBand);
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, 0, priceChartHeight);
        if (isBull) {
          grad.addColorStop(0, 'rgba(245, 158, 11, 0.12)');
          grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.05)');
          grad.addColorStop(1, 'rgba(245, 158, 11, 0.01)');
        } else if (isBear) {
          grad.addColorStop(0, 'rgba(244, 63, 94, 0.12)');
          grad.addColorStop(0.5, 'rgba(244, 63, 94, 0.05)');
          grad.addColorStop(1, 'rgba(244, 63, 94, 0.01)');
        } else {
          grad.addColorStop(0, 'rgba(6, 182, 212, 0.10)');
          grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.04)');
          grad.addColorStop(1, 'rgba(6, 182, 212, 0.01)');
        }
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // 2. Draw Historical Upper & Lower Boundaries
      // Upper Band (Solid)
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const x = getX(pts[i].index - startIdx);
        const y = getY(pts[i].upperBand);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 4;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Lower Band (Solid)
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const x = getX(pts[i].index - startIdx);
        const y = getY(pts[i].lowerBand);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 4;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Midline (Equilibrium Linear Regression - Dashed)
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const x = getX(pts[i].index - startIdx);
        const y = getY(pts[i].midline);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = midColor;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Inner Bands (±1.0σ - Subtle dotted)
      if (bloombergChannelConfig.showInnerBands) {
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = `${baseColor}70`;
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const x = getX(pts[i].index - startIdx);
          const y = getY(pts[i].upperInnerBand || pts[i].midline);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const x = getX(pts[i].index - startIdx);
          const y = getY(pts[i].lowerInnerBand || pts[i].midline);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // 3. Projected Future Rays (Dashed into the future)
      if (bloombergChannelConfig.showProjectedFuture && futPts.length > 0) {
        const lastHistPt = pts[pts.length - 1];
        const lastHistX = getX(lastHistPt.index - startIdx);

        // Future Upper
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = `${baseColor}bb`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lastHistX, getY(lastHistPt.upperBand));
        for (let f = 0; f < futPts.length; f++) {
          ctx.lineTo(getX(futPts[f].index - startIdx), getY(futPts[f].upperBand));
        }
        ctx.stroke();

        // Future Lower
        ctx.beginPath();
        ctx.moveTo(lastHistX, getY(lastHistPt.lowerBand));
        for (let f = 0; f < futPts.length; f++) {
          ctx.lineTo(getX(futPts[f].index - startIdx), getY(futPts[f].lowerBand));
        }
        ctx.stroke();

        // Future Midline
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = `${midColor}bb`;
        ctx.beginPath();
        ctx.moveTo(lastHistX, getY(lastHistPt.midline));
        for (let f = 0; f < futPts.length; f++) {
          ctx.lineTo(getX(futPts[f].index - startIdx), getY(futPts[f].midline));
        }
        ctx.stroke();
      }

      ctx.setLineDash([]);

      // 4. On-Chart Bloomberg Channel Callout Badges
      if (bloombergChannelConfig.showLabels && pts.length > 2) {
        const midPointIdx = Math.floor(pts.length * 0.65);
        const midPt = pts[midPointIdx];
        const tagX = getX(midPt.index - startIdx);

        if (tagX > 20 && tagX < chartWidth - 110) {
          ctx.font = 'bold 8px "JetBrains Mono", monospace';
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'left';

          // Upper label
          const upperY = getY(midPt.upperBand);
          ctx.fillStyle = 'rgba(11, 14, 20, 0.90)';
          ctx.fillRect(tagX + 4, upperY - 7, 116, 14);
          ctx.strokeStyle = baseColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(tagX + 4, upperY - 7, 116, 14);
          ctx.fillStyle = baseColor;
          ctx.fillText(`BBG RES +2σ: $${midPt.upperBand.toFixed(2)}`, tagX + 8, upperY);

          // Midline label
          const midY = getY(midPt.midline);
          ctx.fillStyle = 'rgba(11, 14, 20, 0.90)';
          ctx.fillRect(tagX + 4, midY - 7, 116, 14);
          ctx.strokeStyle = midColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(tagX + 4, midY - 7, 116, 14);
          ctx.fillStyle = midColor;
          ctx.fillText(`BBG MIDLINE: $${midPt.midline.toFixed(2)}`, tagX + 8, midY);

          // Lower label
          const lowerY = getY(midPt.lowerBand);
          ctx.fillStyle = 'rgba(11, 14, 20, 0.90)';
          ctx.fillRect(tagX + 4, lowerY - 7, 116, 14);
          ctx.strokeStyle = baseColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(tagX + 4, lowerY - 7, 116, 14);
          ctx.fillStyle = baseColor;
          ctx.fillText(`BBG SUP -2σ: $${midPt.lowerBand.toFixed(2)}`, tagX + 8, lowerY);
        }
      }

      ctx.restore();

      // 5. Y-Axis Price Badges for Current Upper, Mid, Lower (Drawn outside clipping)
      if (bloombergChannelConfig.showLabels && pts.length > 0) {
        ctx.save();
        const curPt = pts[pts.length - 1];

        // Midline Pill on Y-Axis
        const curMidY = getY(curPt.midline);
        if (curMidY > 15 && curMidY < priceChartHeight - 15) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(chartWidth + 2, curMidY - 7, paddingRight - 4, 14);
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1;
          ctx.strokeRect(chartWidth + 2, curMidY - 7, paddingRight - 4, 14);
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`EQ ${curPt.midline.toFixed(2)}`, chartWidth + paddingRight / 2, curMidY);
        }

        // Upper Pill on Y-Axis
        const curUpY = getY(curPt.upperBand);
        if (curUpY > 15 && curUpY < priceChartHeight - 15) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(chartWidth + 2, curUpY - 7, paddingRight - 4, 14);
          ctx.strokeStyle = baseColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(chartWidth + 2, curUpY - 7, paddingRight - 4, 14);
          ctx.fillStyle = baseColor;
          ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`RES ${curPt.upperBand.toFixed(2)}`, chartWidth + paddingRight / 2, curUpY);
        }

        // Lower Pill on Y-Axis
        const curLowY = getY(curPt.lowerBand);
        if (curLowY > 15 && curLowY < priceChartHeight - 15) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(chartWidth + 2, curLowY - 7, paddingRight - 4, 14);
          ctx.strokeStyle = baseColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(chartWidth + 2, curLowY - 7, paddingRight - 4, 14);
          ctx.fillStyle = baseColor;
          ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`SUP ${curPt.lowerBand.toFixed(2)}`, chartWidth + paddingRight / 2, curLowY);
        }
        ctx.restore();
      }
    }

    // 7. HD Candlesticks / Line Rendering Engine
    if (chartType === 'line') {
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      for (let i = 0; i < count; i++) {
        const x = getX(i);
        const y = getY(visibleCandles[i].close);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.lineTo(getX(count - 1), priceChartHeight);
      ctx.lineTo(getX(0), priceChartHeight);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, priceChartHeight);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
      ctx.fillStyle = grad;
      ctx.fill();
    } else {
      // HD High-Definition Candlestick Color Palettes from active candle theme preset
      const preset = candleThemeConfig;
      let bullColor = preset.bullColor;
      let bullBorder = preset.bullBorder;
      let bullWick = preset.bullWick;

      let bearColor = preset.bearColor;
      let bearBorder = preset.bearBorder;
      let bearWick = preset.bearWick;

      // Apply Border Candle Customizations
      const borderMode = borderSettings.style;
      const borderWidthVal = borderSettings.width === '2px' ? 2 : borderSettings.width === '1.5px' ? 1.5 : 1;
      const hasBorders = borderSettings.enabled && showCrispBorders;

      if (borderMode === 'contrast') {
        bullBorder = '#34d399';
        bearBorder = '#fb7185';
      } else if (borderMode === 'hollow' || preset.isHollow) {
        // Japanese Hollow Candlesticks Mode
        bullColor = (theme === 'white' || theme === 'light') ? '#ffffff' : canvasBg;
      } else if (borderMode === 'neon') {
        bullBorder = '#06b6d4';
        bullWick = '#22d3ee';
        bearBorder = '#ec4899';
        bearWick = '#f472b6';
      } else if (borderMode === 'gold') {
        bullBorder = '#fbbf24';
        bearBorder = '#f59e0b';
      } else if (borderMode === 'monochrome') {
        bullBorder = (theme === 'white' || theme === 'light') ? '#0f172a' : '#f8fafc';
        bearBorder = (theme === 'white' || theme === 'light') ? '#475569' : '#94a3b8';
      }

      // Sub-pixel smooth Candlesticks (Fluid 60FPS Zoom & Pan on Retina / 4K displays)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, chartWidth, priceChartHeight);
      ctx.clip();

      for (let i = 0; i < count; i++) {
        const c = visibleCandles[i];
        const isActiveLiveCandle = (startIdx + i === totalCandles - 1 && animatedPriceRef.current !== null);
        const candleClose = isActiveLiveCandle ? animatedPriceRef.current! : c.close;
        const candleHigh = isActiveLiveCandle ? Math.max(c.high, candleClose) : c.high;
        const candleLow = isActiveLiveCandle ? Math.min(c.low, candleClose) : c.low;

        const isUp = candleClose >= c.open;
        const x = getX(i);
        if (x < -barWidth || x > chartWidth + barWidth) continue;

        const openY = getY(c.open);
        const closeY = getY(candleClose);
        const highY = getY(candleHigh);
        const lowY = getY(candleLow);

        const candleTop = Math.min(openY, closeY);
        const candleBottom = Math.max(openY, closeY);

        const wickX = x;
        const bodyW = Math.max(1.8, barWidth);
        const bodyLeft = x - bodyW / 2;
        const bodyTop = candleTop;
        const bodyBottom = candleBottom;
        const bodyH = Math.max(1.2, bodyBottom - bodyTop);

        const fillColor = isUp ? bullColor : bearColor;
        const borderColor = isUp ? bullBorder : bearBorder;
        const wickColor = isUp ? bullWick : bearWick;

        // 1. Draw Wicks
        ctx.beginPath();
        ctx.strokeStyle = wickColor;
        ctx.lineWidth = 1.1;
        // Upper wick
        ctx.moveTo(wickX, highY);
        ctx.lineTo(wickX, bodyTop);
        // Lower wick
        ctx.moveTo(wickX, bodyBottom);
        ctx.lineTo(wickX, lowY);
        ctx.stroke();

        // 2. Draw Body Fill
        if (borderMode === 'hollow' || preset.isHollow) {
          ctx.fillStyle = (theme === 'white' || theme === 'light') ? '#ffffff' : canvasBg;
          ctx.fillRect(bodyLeft, bodyTop, bodyW, bodyH);
        } else {
          ctx.save();
          if (borderSettings.fillOpacity < 1) {
            ctx.globalAlpha = borderSettings.fillOpacity;
          }
          ctx.fillStyle = fillColor;
          ctx.fillRect(bodyLeft, bodyTop, bodyW, bodyH);
          ctx.restore();
        }

        // 3. Draw Crisp Border Candle Outline
        if (hasBorders && bodyW > 1.8) {
          ctx.save();
          if (borderMode === 'neon') {
            ctx.shadowColor = isUp ? '#06b6d4' : '#ec4899';
            ctx.shadowBlur = 4;
          }
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = borderWidthVal;
          ctx.strokeRect(bodyLeft, bodyTop, bodyW, Math.max(1, bodyH));
          ctx.restore();
        }
      }
      ctx.restore();

    }

    // 7.5. MAXMASERATI 3.0: Liquidity Sweep Visualizer (Candle & Swing Sweeps)
    if (showSweeps) {
      const sweepNodes = nodes.filter(n => n.liquiditySweep);

      sweepNodes.forEach(node => {
        const sweep = node.liquiditySweep!;
        const nx = getNodeX(node);
        if (nx < -40 || nx > chartWidth + 20) return;

        const sweptLevelY = getY(sweep.sweptLevel);
        const extremeY = getY(sweep.sweepExtreme);
        const isSSL = sweep.sweepSide === 'SSL';
        const sweepHeight = Math.max(3, Math.abs(extremeY - sweptLevelY));
        const sweepBoxY = isSSL ? sweptLevelY : extremeY;

        // Shaded Wick Rejection Liquidity Zone
        const sweepGrad = ctx.createLinearGradient(0, sweptLevelY, 0, extremeY);
        if (isSSL) {
          sweepGrad.addColorStop(0, 'rgba(16, 185, 129, 0.05)');
          sweepGrad.addColorStop(1, 'rgba(16, 185, 129, 0.28)');
        } else {
          sweepGrad.addColorStop(0, 'rgba(244, 63, 94, 0.05)');
          sweepGrad.addColorStop(1, 'rgba(244, 63, 94, 0.28)');
        }

        const sweepBoxWidth = Math.max(barWidth * 1.6, 12);
        ctx.fillStyle = sweepGrad;
        ctx.fillRect(nx - sweepBoxWidth / 2, sweepBoxY, sweepBoxWidth, sweepHeight);

        // Dashed border around swept liquidity pool
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = isSSL ? '#10b981' : '#f43f5e';
        ctx.lineWidth = 1;
        ctx.strokeRect(nx - sweepBoxWidth / 2, sweepBoxY, sweepBoxWidth, sweepHeight);
        ctx.setLineDash([]);

        // Horizontal Swept Level Reference Ray
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = isSSL ? 'rgba(16, 185, 129, 0.55)' : 'rgba(244, 63, 94, 0.55)';
        ctx.beginPath();
        ctx.moveTo(nx, sweptLevelY);
        ctx.lineTo(Math.min(chartWidth, nx + 70), sweptLevelY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Sweep Reversal Arrow & Badge
        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const badgeY = isSSL ? extremeY + 14 : extremeY - 14;

        ctx.fillStyle = isSSL ? '#10b981' : '#f43f5e';
        ctx.beginPath();
        if (isSSL) {
          ctx.moveTo(nx, extremeY + 2);
          ctx.lineTo(nx - 4, extremeY + 7);
          ctx.lineTo(nx + 4, extremeY + 7);
        } else {
          ctx.moveTo(nx, extremeY - 2);
          ctx.lineTo(nx - 4, extremeY - 7);
          ctx.lineTo(nx + 4, extremeY - 7);
        }
        ctx.fill();

        if (sweep.sweepType === 'SWING' || isSelected || isHovered) {
          const badgeText = sweep.sweepType === 'SWING' 
            ? `TURTLE SOUP ${isSSL ? 'SSL' : 'BSL'}` 
            : `${isSSL ? '▲ SSL' : '▼ BSL'} $${sweep.sweepDepth.toFixed(2)}`;
          ctx.font = 'bold 8px "JetBrains Mono", monospace';
          const bWidth = ctx.measureText(badgeText).width + 8;

          ctx.fillStyle = '#0f172a';
          ctx.fillRect(nx - bWidth / 2, badgeY - 6, bWidth, 12);
          ctx.strokeStyle = isSSL ? '#10b981' : '#f43f5e';
          ctx.strokeRect(nx - bWidth / 2, badgeY - 6, bWidth, 12);

          ctx.fillStyle = isSSL ? '#34d399' : '#fb7185';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(badgeText, nx, badgeY);
        }
      });
    }

    // 7.8. DELTA VOLUME BUBBLE [QUANT / Z-SCORE] by tncylyv
    // https://id.tradingview.com/script/m2Z0v7Jw-Delta-Volume-Bubble-Quant-Z-Score-by-tncylyv/
    if (showDeltaBubbles && deltaBubbles.length > 0) {
      for (const bubble of deltaBubbles) {
        if (bubble.candleIndex < startIdx || bubble.candleIndex >= endIdx) continue;
        const relIdx = bubble.candleIndex - startIdx;
        const bx = getX(relIdx);
        const by = getY(bubble.price);

        if (bx < -30 || bx > chartWidth + 30) continue;
        if (by < 0 || by > priceChartHeight) continue;

        const isBull = bubble.type === 'BULLISH';
        const isConflict = bubble.type === 'CONFLICT';
        const isHovered = hoveredDeltaBubble?.id === bubble.id;
        const isExtreme = Math.abs(bubble.zScore) >= 2.0;

        const radius = isHovered ? bubble.radius + 3 : bubble.radius;

        ctx.save();

        // 1. Unmitigated Support / Resistance VWAP Horizontal Ray
        if (deltaBubbleConfig.showUnmitigatedRay && !bubble.isMitigated) {
          ctx.beginPath();
          ctx.setLineDash([3, 3]);
          ctx.lineWidth = 1;
          ctx.strokeStyle = isConflict
            ? 'rgba(245, 158, 11, 0.40)'
            : isBull
            ? 'rgba(0, 245, 212, 0.40)'
            : 'rgba(255, 42, 133, 0.40)';
          ctx.moveTo(bx, by);
          ctx.lineTo(Math.min(chartWidth, bx + 130), by);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 2. Glowing Radial Gradient Fill
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, radius);
        if (isConflict) {
          grad.addColorStop(0, 'rgba(245, 158, 11, 0.90)');
          grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.40)');
          grad.addColorStop(1, 'rgba(245, 158, 11, 0.08)');
        } else if (isBull) {
          grad.addColorStop(0, 'rgba(0, 245, 212, 0.90)');
          grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.45)');
          grad.addColorStop(1, 'rgba(6, 182, 212, 0.08)');
        } else {
          grad.addColorStop(0, 'rgba(255, 42, 133, 0.90)');
          grad.addColorStop(0.5, 'rgba(244, 63, 94, 0.45)');
          grad.addColorStop(1, 'rgba(244, 63, 94, 0.08)');
        }

        ctx.beginPath();
        ctx.arc(bx, by, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // 3. Crisp Luminous Outer Border Ring
        ctx.beginPath();
        ctx.arc(bx, by, radius, 0, Math.PI * 2);
        ctx.strokeStyle = isConflict ? '#fbbf24' : isBull ? '#00f5d4' : '#ff2a85';
        ctx.lineWidth = isHovered ? 2.5 : isExtreme ? 2 : 1.4;
        ctx.stroke();

        // 4. Institutional Passive Absorption Ring & Badge
        if (bubble.isAbsorption) {
          ctx.beginPath();
          ctx.setLineDash([3, 2]);
          ctx.arc(bx, by, radius + 4.5, 0, Math.PI * 2);
          ctx.strokeStyle = isBull ? '#34d399' : '#fda4af';
          ctx.lineWidth = 1.3;
          ctx.stroke();
          ctx.setLineDash([]);

          const absTagY = isBull ? by - radius - 7 : by + radius + 7;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.fillRect(bx - 11, absTagY - 5, 22, 10);
          ctx.strokeStyle = isBull ? '#10b981' : '#f43f5e';
          ctx.lineWidth = 1;
          ctx.strokeRect(bx - 11, absTagY - 5, 22, 10);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 7px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('ABS', bx, absTagY);
        }

        // 5. Quant Z-Score Sigma Label
        if (deltaBubbleConfig.showLabels && radius >= 9) {
          const sign = bubble.zScore > 0 ? '+' : '';
          const sigmaText = `${sign}${bubble.zScore.toFixed(1)}σ`;
          ctx.font = `bold ${radius >= 14 ? '8.5px' : '7.5px'} "JetBrains Mono", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(sigmaText, bx, by);
        }

        ctx.restore();
      }
    }

    // 8. Real-time Node Structure Overlay
    if (showNodes && nodes.length > 0) {
      const minVisibleTime = visibleCandles[0].time;
      const maxVisibleTime = visibleCandles[count - 1].time;

      const visibleNodes = nodes.filter(n => {
        const inTime = n.time >= minVisibleTime - timeframeDurationMs * 2 && n.time <= maxVisibleTime + timeframeDurationMs * 2;
        const isPersistent = n.type === 'HVN' || n.type === 'BOS' || n.type === 'EQH' || n.type === 'EQL' || n.type === 'HTF_POC';
        return inTime || isPersistent;
      });

      const sortedVisibleNodes = [...visibleNodes].sort((a, b) => a.time - b.time);

      if (showNodePaths && sortedVisibleNodes.length > 1) {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();

        let startedPath = false;
        sortedVisibleNodes.forEach(node => {
          if (node.type === 'SWING_HIGH' || node.type === 'SWING_LOW' || node.type === 'EQH' || node.type === 'EQL') {
            const nx = getNodeX(node);
            const ny = getY(node.price);

            if (nx >= 0 && nx <= chartWidth) {
              if (!startedPath) {
                ctx.moveTo(nx, ny);
                startedPath = true;
              } else {
                ctx.lineTo(nx, ny);
              }
            }
          }
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      visibleNodes.forEach(node => {
        let nx = getNodeX(node);
        if (node.type === 'HVN') {
          nx = chartWidth - 30;
        } else if (node.type === 'BOS') {
          nx = getX(count - 1);
        } else if (node.type === 'HTF_POC' || node.type === 'HTF_VAH' || node.type === 'HTF_VAL') {
          nx = chartWidth - 65;
        }

        const ny = getY(node.price);

        if (nx >= 0 && nx <= chartWidth + 5 && ny >= 0 && ny <= priceChartHeight) {
          const isSelected = selectedNode?.id === node.id;
          const isHovered = hoveredNode?.id === node.id;
          const radius = isSelected ? 8 : isHovered ? 7 : 5.5;

          if (node.type === 'EQH' || node.type === 'EQL') {
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = node.color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nx, ny);
            ctx.lineTo(chartWidth, ny);
            ctx.stroke();
            ctx.setLineDash([]);

            const poolLabel = node.type === 'EQH' ? 'BSL POOL' : 'SSL POOL';
            ctx.fillStyle = node.color;
            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            ctx.textAlign = 'right';
            ctx.fillText(poolLabel, chartWidth - 10, ny - 4);
          }

          if (node.targetExtension && (isSelected || isHovered)) {
            const extY = getY(node.targetExtension);
            ctx.setLineDash([2, 4]);
            ctx.strokeStyle = node.color;
            ctx.beginPath();
            ctx.moveTo(nx, ny);
            ctx.lineTo(chartWidth, extY);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = node.color;
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.fillText(`Target: $${node.targetExtension.toFixed(2)}`, chartWidth - 110, extY - 6);
          }

          if (node.liquidityDensity && node.liquidityDensity.restingOz > 30) {
            ctx.beginPath();
            ctx.arc(nx, ny, radius + 8, 0, Math.PI * 2);
            ctx.fillStyle = node.liquidityDensity.wallType === 'BID_WALL' 
              ? 'rgba(16, 185, 129, 0.20)' 
              : 'rgba(244, 63, 94, 0.20)';
            ctx.fill();
          }

          ctx.beginPath();
          ctx.arc(nx, ny, radius + 4, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? 'rgba(245, 158, 11, 0.4)' : `${node.color}33`;
          ctx.fill();

          if (node.type === 'HTF_POC') {
            ctx.save();
            ctx.translate(nx, ny);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = isSelected ? '#fbbf24' : '#eab308';
            ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
            ctx.strokeStyle = '#0b0e14';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);
            ctx.restore();
          } else {
            ctx.beginPath();
            ctx.arc(nx, ny, radius, 0, Math.PI * 2);
            ctx.fillStyle = isSelected ? '#fbbf24' : node.color;
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#0b0e14';
            ctx.stroke();
          }

          ctx.font = 'bold 6.5px "JetBrains Mono", monospace';
          const labelText = node.swingType || (
            node.type === 'SWING_HIGH' ? 'HH' :
            node.type === 'SWING_LOW' ? 'LL' :
            node.type === 'HTF_POC' ? 'HTF POC' :
            node.type === 'CANDLE_SWEEP_BULL' ? 'SSL SWEEP' :
            node.type === 'CANDLE_SWEEP_BEAR' ? 'BSL SWEEP' :
            node.type === 'SWING_SWEEP_BULL' ? 'TURTLE SOUP' :
            node.type === 'SWING_SWEEP_BEAR' ? 'TURTLE SOUP' :
            node.type.replace('_', ' ')
          );
          const labelWidth = ctx.measureText(labelText).width;
          const isHighSide = node.type === 'SWING_HIGH' || node.type === 'EQH' || node.type === 'ORDER_BLOCK_BEAR' || node.type === 'CANDLE_SWEEP_BEAR';
          const labelY = isHighSide ? ny - 11.5 : ny + 13.5;
          const padX = 3.5;
          const boxHeight = 9.5;

          ctx.fillStyle = '#1e293b';
          ctx.fillRect(nx - (labelWidth + padX) / 2, labelY - boxHeight / 2, labelWidth + padX, boxHeight);
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 1;
          ctx.strokeRect(nx - (labelWidth + padX) / 2, labelY - boxHeight / 2, labelWidth + padX, boxHeight);

          ctx.fillStyle = '#f8fafc';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, nx, labelY);
        }
      });
    }

    // 9. Real-time Live Price Line (Garis Harga XAU/USD), Bid/Ask Lines & MT5/TradingView Countdown
    const lastCandle = candles[candles.length - 1];
    const currentPrice = (animatedPriceRef.current !== null && offsetRight < 0.5)
      ? animatedPriceRef.current
      : (lastCandle ? lastCandle.close : 4141.80);
    const currentPriceY = getY(currentPrice);
    const lastCandleX = (totalCandles - 1 >= startIdx && totalCandles - 1 < endIdx)
      ? getX((totalCandles - 1) - startIdx)
      : chartWidth - 30;

    const effectiveSpread = spread || 0.18;
    const askPrice = +(currentPrice + effectiveSpread / 2).toFixed(2);
    const bidPrice = +(currentPrice - effectiveSpread / 2).toFixed(2);
    const askY = Math.floor(getY(askPrice)) + 0.5;
    const bidY = Math.floor(getY(bidPrice)) + 0.5;

    const isPriceUp = currentPrice >= (lastCandle ? lastCandle.open : currentPrice);
    const liveAccentColor = isPriceUp ? '#10b981' : '#f43f5e';
    const liveGlowColor = isPriceUp ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)';

    if (showPriceLine) {
      // 1. GARIS HARGA UTAMA (MAIN SPOT PRICE LINE)
      if (priceLineStyle === 'laser') {
        // Laser Beam Glow Effect
        ctx.save();
        // Wide diffuse glow ray from live candle to right edge
        ctx.beginPath();
        ctx.moveTo(offsetRight === 0 ? lastCandleX : 0, currentPriceY);
        ctx.lineTo(chartWidth, currentPriceY);
        ctx.strokeStyle = liveGlowColor;
        ctx.lineWidth = 4;
        ctx.stroke();

        // Subtle backward trailing ray across historical candles
        if (offsetRight === 0 && lastCandleX > 0) {
          ctx.beginPath();
          ctx.setLineDash([2, 4]);
          ctx.moveTo(0, currentPriceY);
          ctx.lineTo(lastCandleX, currentPriceY);
          ctx.strokeStyle = isPriceUp ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Intense core laser line
        ctx.beginPath();
        ctx.moveTo(offsetRight === 0 ? lastCandleX : 0, currentPriceY);
        ctx.lineTo(chartWidth, currentPriceY);
        ctx.strokeStyle = liveAccentColor;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
      } else if (priceLineStyle === 'dashed') {
        // High-contrast dashed line across chart
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = liveAccentColor;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(0, currentPriceY);
        ctx.lineTo(chartWidth, currentPriceY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      } else {
        // Solid clean line
        ctx.save();
        ctx.strokeStyle = liveAccentColor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, currentPriceY);
        ctx.lineTo(chartWidth, currentPriceY);
        ctx.stroke();
        ctx.restore();
      }

      // 2. RADAR PULSING BEACON (Titik Pulse Berkedip di Ujung Candle)
      if (showPricePulse && offsetRight === 0 && lastCandleX >= 0 && lastCandleX <= chartWidth) {
        const pulseCycle = (Date.now() % 1400) / 1400; // 0 -> 1 over 1.4s
        const rippleRadius = 4 + pulseCycle * 14;
        const rippleAlpha = Math.max(0, 1 - pulseCycle);

        // Expanding outer radar wave
        ctx.beginPath();
        ctx.arc(lastCandleX, currentPriceY, rippleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isPriceUp ? `rgba(16, 185, 129, ${rippleAlpha * 0.8})` : `rgba(244, 63, 94, ${rippleAlpha * 0.8})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Secondary inner ripple
        const secondaryCycle = ((Date.now() + 700) % 1400) / 1400;
        const secRadius = 3 + secondaryCycle * 9;
        const secAlpha = Math.max(0, 1 - secondaryCycle);
        ctx.beginPath();
        ctx.arc(lastCandleX, currentPriceY, secRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isPriceUp ? `rgba(52, 211, 153, ${secAlpha * 0.6})` : `rgba(251, 113, 133, ${secAlpha * 0.6})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Glowing center dot
        ctx.beginPath();
        ctx.arc(lastCandleX, currentPriceY, 3.8, 0, Math.PI * 2);
        ctx.fillStyle = liveAccentColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // 3. PROMINENT SPOT PRICE BADGE ON Y-AXIS (Pill Harga Live)
      const badgeH = 22;
      const badgeW = paddingRight;
      ctx.save();
      ctx.fillStyle = liveAccentColor;
      ctx.fillRect(chartWidth, currentPriceY - badgeH / 2, badgeW, badgeH);

      // Outer crisp white border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(chartWidth + 0.5, currentPriceY - badgeH / 2 + 0.5, badgeW - 1, badgeH - 1);

      // Left pointer arrow on price pill
      ctx.beginPath();
      ctx.moveTo(chartWidth, currentPriceY);
      ctx.lineTo(chartWidth - 5, currentPriceY - 5);
      ctx.lineTo(chartWidth - 5, currentPriceY + 5);
      ctx.fillStyle = liveAccentColor;
      ctx.fill();

      // Text inside main badge
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const arrowIcon = isPriceUp ? '▲' : '▼';
      ctx.fillText(`${arrowIcon} ${currentPrice.toFixed(2)}`, chartWidth + badgeW / 2 + 1, currentPriceY);
      ctx.restore();
    }

    // 4. LIVE BID & ASK SPREAD CORRIDOR LINES (JIKA DIAKTIFKAN)
    if (showBidAskLines) {
      ctx.save();
      // Ask Line (Merah muda halus)
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.75)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(offsetRight === 0 ? lastCandleX : 0, askY);
      ctx.lineTo(chartWidth, askY);
      ctx.stroke();

      // Ask Pill on Y Axis (Mini tag tepat di atas spot badge)
      ctx.fillStyle = 'rgba(244, 63, 94, 0.9)';
      ctx.fillRect(chartWidth + 3, askY - 6.5, paddingRight - 6, 13);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`ASK ${askPrice.toFixed(2)}`, chartWidth + paddingRight / 2, askY);

      // Bid Line (Cyan halus)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.75)';
      ctx.beginPath();
      ctx.moveTo(offsetRight === 0 ? lastCandleX : 0, bidY);
      ctx.lineTo(chartWidth, bidY);
      ctx.stroke();

      // Bid Pill on Y Axis (Mini tag tepat di bawah spot badge)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
      ctx.fillRect(chartWidth + 3, bidY - 6.5, paddingRight - 6, 13);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`BID ${bidPrice.toFixed(2)}`, chartWidth + paddingRight / 2, bidY);
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 9.5. Real-Time Candle Close Countdown Timer (TradingView & MT5)
    if (showCandleCountdown && lastCandle) {
      const elapsed = nowSec - lastCandle.time;
      const remainingSec = Math.max(0, Math.floor((timeframeDurationMs - elapsed) / 1000));
      const min = Math.floor(remainingSec / 60);
      const sec = remainingSec % 60;
      const countdownStr = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

      const lowestPillY = showBidAskLines ? Math.max(bidY, currentPriceY) : currentPriceY;
      const tagY = lowestPillY + 18;
      if (tagY < chartHeight - 12) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(chartWidth + 4, tagY - 7, paddingRight - 8, 14);
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1;
        ctx.strokeRect(chartWidth + 4, tagY - 7, paddingRight - 8, 14);

        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`⏱ ${countdownStr}`, chartWidth + paddingRight / 2, tagY);
      }
    }

    // 10. Interactive Crosshair Cursor (Direct Chart Cursor Hover)
    if (crosshairPos && crosshairPos.x < chartWidth && crosshairPos.y < chartHeight) {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(crosshairPos.x, 0);
      ctx.lineTo(crosshairPos.x, chartHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, crosshairPos.y);
      ctx.lineTo(chartWidth, crosshairPos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const hoverPrice = getPriceAtY(crosshairPos.y);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(chartWidth, crosshairPos.y - 9, paddingRight, 18);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(chartWidth, crosshairPos.y - 9, paddingRight, 18);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hoverPrice.toFixed(2), chartWidth + paddingRight / 2, crosshairPos.y);

      const hoverCandleIdx = Math.min(count - 1, Math.max(0, Math.round(crosshairPos.x / continuousStep + subIndexOffset - 0.5)));
      if (visibleCandles[hoverCandleIdx]) {
        const hoverTime = new Date(visibleCandles[hoverCandleIdx].time).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        });
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(crosshairPos.x - 35, chartHeight, 70, 20);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(crosshairPos.x - 35, chartHeight, 70, 20);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hoverTime, crosshairPos.x, chartHeight + 10);
      }
    } else if (crosshairSyncEnabled && syncedCrosshairPrice != null && crosshairSyncSource === 'dom') {
      // 10.b Synchronized Crosshair from DOM Ladder Hover
      const domY = getY(syncedCrosshairPrice);
      if (domY >= 0 && domY <= priceChartHeight) {
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.4;

        ctx.beginPath();
        ctx.moveTo(0, domY);
        ctx.lineTo(chartWidth, domY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Right Y-axis synchronized price tag
        ctx.fillStyle = '#0891b2';
        ctx.fillRect(chartWidth, domY - 10, paddingRight, 20);
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(chartWidth, domY - 10, paddingRight, 20);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`⌖ ${syncedCrosshairPrice.toFixed(2)}`, chartWidth + paddingRight / 2, domY);

        // Left banner tag
        ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
        ctx.fillRect(4, domY - 9, 64, 18);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1;
        ctx.strokeRect(4, domY - 9, 64, 18);

        ctx.fillStyle = '#67e8f9';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DOM SYNC', 36, domY);
        ctx.restore();
      }
    }

    ctx.restore();

    if (needsAnimation) {
      if (!animFrameIdRef.current) {
        animFrameIdRef.current = requestAnimationFrame(() => {
          animFrameIdRef.current = null;
          drawRef.current();
        });
      }
    }
  }, [
    candles,
    nodes,
    timeframe,
    visibleCount,
    offsetRight,
    isDragging,
    chartType,
    hdStyle,
    showCrispBorders,
    showBidAskLines,
    showCandleCountdown,
    showPriceLine,
    priceLineStyle,
    showPricePulse,
    smoothPriceMode,
    nowSec,
    showNodes,
    showNodePaths,
    showEma,
    showVolumeProfile,
    showHeatmap,
    showKillzones,
    showFvg,
    showSweeps,
    showHtfProfile,
    htfTimeframe,
    showHtfEnvelopes,
    bids,
    asks,
    spread,
    selectedNode,
    hoveredNode,
    crosshairPos,
    syncedCrosshairPrice,
    crosshairSyncSource,
    crosshairSyncEnabled,
    calculateEMA,
    timeframeDurationMs,
    showBigBelugaZones,
    bigBelugaZones,
    fibState,
    showFibGoldenZoneOnly,
    showBloombergChannel,
    bloombergChannel,
    bloombergChannelConfig,
  ]);

  drawRef.current = draw;

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      window.requestAnimationFrame(draw);
    });
    ro.observe(container);

    return () => ro.disconnect();
  }, [draw]);

  // Helper to map mouse coordinate Y to price for crosshair synchronization
  const calculatePriceAtCoordinateY = useCallback((y: number): number | null => {
    const container = containerRef.current;
    if (!container || candles.length === 0) return null;

    const height = container.clientHeight;
    const chartHeight = Math.max(10, height - 26);
    const volumeHeight = Math.min(75, Math.max(28, chartHeight * 0.18));
    const priceChartHeight = Math.max(40, chartHeight - volumeHeight);

    const totalCandles = candles.length;
    const safeOffset = Math.max(0, Math.min(totalCandles - 15, offsetRight));
    const endIdx = Math.max(15, totalCandles - safeOffset);
    const startIdx = Math.max(0, endIdx - visibleCount);
    const visibleCandles = candles.slice(startIdx, endIdx);
    if (visibleCandles.length === 0) return null;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    for (const c of visibleCandles) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    }

    if (!isFinite(minPrice) || !isFinite(maxPrice) || minPrice >= maxPrice) {
      const fallbackMid = candles[candles.length - 1]?.close || 4141.80;
      minPrice = fallbackMid - 5;
      maxPrice = fallbackMid + 5;
    }

    const rawRange = maxPrice - minPrice;
    const priceMargin = Math.max(1.2, rawRange * 0.10);
    const renderMinPrice = Math.floor((minPrice - priceMargin) * 5) / 5;
    const renderMaxPrice = Math.ceil((maxPrice + priceMargin) * 5) / 5;
    const renderRange = renderMaxPrice - renderMinPrice || 1;

    const clampedY = Math.max(0, Math.min(priceChartHeight, y));
    const ratio = (priceChartHeight - clampedY) / priceChartHeight;
    return +(renderMinPrice + ratio * renderRange).toFixed(2);
  }, [candles, offsetRight, visibleCount]);

  // Screen coordinates helper for structural nodes
  const getNodeScreenX = useCallback((node: PriceNode): number => {
    const container = containerRef.current;
    if (!container || candles.length === 0) return 0;
    const width = container.clientWidth;
    const chartWidth = Math.max(10, width - 82);
    const safeOffset = Math.max(0, Math.min(candles.length - 15, offsetRight));
    const endIdx = Math.max(15, candles.length - safeOffset);
    const startIdx = Math.max(0, endIdx - visibleCount);
    const visibleCandles = candles.slice(startIdx, endIdx);
    const count = visibleCandles.length;
    if (count === 0) return 0;

    const step = chartWidth / count;
    if (node.candleIndex >= startIdx && node.candleIndex < endIdx) {
      return (node.candleIndex - startIdx) * step + step / 2;
    }
    for (let i = 0; i < count; i++) {
      if (Math.abs(visibleCandles[i].time - node.time) <= 120000) {
        return i * step + step / 2;
      }
    }
    return chartWidth / 2;
  }, [candles, offsetRight, visibleCount]);

  const calculateCoordinateYFromPrice = useCallback((price: number): number => {
    const container = containerRef.current;
    if (!container || candles.length === 0) return 0;
    const height = container.clientHeight;
    const chartHeight = Math.max(10, height - 26);
    const volumeHeight = Math.min(75, Math.max(28, chartHeight * 0.18));
    const priceChartHeight = Math.max(40, chartHeight - volumeHeight);

    const safeOffset = Math.max(0, Math.min(candles.length - 15, offsetRight));
    const endIdx = Math.max(15, candles.length - safeOffset);
    const startIdx = Math.max(0, endIdx - visibleCount);
    const visibleCandles = candles.slice(startIdx, endIdx);

    let minP = Infinity;
    let maxP = -Infinity;
    visibleCandles.forEach(c => {
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
    });
    const rawRange = maxP - minP;
    const priceMargin = Math.max(1.2, rawRange * 0.10);
    const renderMinPrice = Math.floor((minP - priceMargin) * 5) / 5;
    const renderMaxPrice = Math.ceil((maxP + priceMargin) * 5) / 5;
    const renderRange = renderMaxPrice - renderMinPrice || 1;

    return priceChartHeight - ((price - renderMinPrice) / renderRange) * priceChartHeight;
  }, [candles, offsetRight, visibleCount]);

  const findNearestNodeToPoint = useCallback((mouseX: number, mouseY: number): PriceNode | null => {
    if (!nodes || nodes.length === 0) return null;
    let closest: PriceNode | null = null;
    let minDistance = 28; // 28px magnetic snap radius

    for (const node of nodes) {
      const nx = getNodeScreenX(node);
      const ny = calculateCoordinateYFromPrice(node.price);
      const dist = Math.hypot(mouseX - nx, mouseY - ny);
      if (dist < minDistance) {
        minDistance = dist;
        closest = node;
      }
    }
    return closest;
  }, [nodes, getNodeScreenX, calculateCoordinateYFromPrice]);

  const handleAutoSnapFibToNodes = useCallback(() => {
    const safeOffset = Math.max(0, Math.min(candles.length - 15, offsetRight));
    const endIdx = Math.max(15, candles.length - safeOffset);
    const startIdx = Math.max(0, endIdx - visibleCount);
    const visibleCandles = candles.slice(startIdx, endIdx);

    const best = autoFindBestFibNodes(nodes, visibleCandles);
    if (best) {
      const startX = getNodeScreenX(best.highNode);
      const startY = calculateCoordinateYFromPrice(best.highNode.price);
      const endX = getNodeScreenX(best.lowNode);
      const endY = calculateCoordinateYFromPrice(best.lowNode.price);

      setFibState({
        startX,
        startY,
        startPrice: best.highNode.price,
        startTime: best.highNode.time,
        currentX: endX,
        currentY: endY,
        currentPrice: best.lowNode.price,
        currentTime: best.lowNode.time,
        isComplete: true,
        snappedStartNodeId: best.highNode.id,
        snappedEndNodeId: best.lowNode.id,
      });
      setIsFibToolActive(true);
    }
  }, [candles, nodes, offsetRight, visibleCount, getNodeScreenX, calculateCoordinateYFromPrice]);

  const handleFlipFib = () => {
    setFibState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        startX: prev.currentX,
        startY: prev.currentY,
        startPrice: prev.currentPrice,
        startTime: prev.currentTime,
        currentX: prev.startX,
        currentY: prev.startY,
        currentPrice: prev.startPrice,
        currentTime: prev.startTime,
      };
    });
  };

  const handleClearFib = () => {
    setFibState(null);
  };

  // Keyboard and event listener for interactive Fibonacci Retracement tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      );

      if (!isInput) {
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          setIsFibToolActive(prev => {
            const next = !prev;
            if (next && !fibState) {
              handleAutoSnapFibToNodes();
            }
            return next;
          });
        }
      }

      if (e.key === 'Escape') {
        if (isFibDrawing) {
          setIsFibDrawing(false);
          setFibDragAnchor(null);
        } else if (isFibToolActive) {
          setIsFibToolActive(false);
        }
      }
    };

    const handleToggleFibEvent = () => {
      setIsFibToolActive(prev => {
        const next = !prev;
        if (next && !fibState) {
          handleAutoSnapFibToNodes();
        }
        return next;
      });
    };

    const handleToggleBloombergChannelEvent = () => {
      setShowBloombergChannel(prev => !prev);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('aura-toggle-fib', handleToggleFibEvent);
    window.addEventListener('aura-toggle-bloomberg-channel', handleToggleBloombergChannelEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('aura-toggle-fib', handleToggleFibEvent);
      window.removeEventListener('aura-toggle-bloomberg-channel', handleToggleBloombergChannelEvent);
    };
  }, [isFibDrawing, isFibToolActive, fibState, handleAutoSnapFibToNodes]);

  // Mouse Interaction: Pan, Zoom, Hover Detection & Fibonacci Dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isFibToolActive) {
      // Check if user clicked near start or end anchor of existing Fibonacci drawing
      if (fibState) {
        const startY = calculateCoordinateYFromPrice(fibState.startPrice);
        const endY = calculateCoordinateYFromPrice(fibState.currentPrice);
        const sNode = fibState.snappedStartNodeId ? nodes.find(n => n.id === fibState.snappedStartNodeId) : null;
        const eNode = fibState.snappedEndNodeId ? nodes.find(n => n.id === fibState.snappedEndNodeId) : null;
        const currentStartX = sNode ? getNodeScreenX(sNode) : fibState.startX;
        const currentEndX = eNode ? getNodeScreenX(eNode) : fibState.currentX;

        if (Math.hypot(x - currentStartX, y - startY) <= 16) {
          setFibDragAnchor('start');
          setIsFibDrawing(true);
          return;
        }
        if (Math.hypot(x - currentEndX, y - endY) <= 16) {
          setFibDragAnchor('end');
          setIsFibDrawing(true);
          return;
        }
      }

      const price = calculatePriceAtCoordinateY(y);
      if (price !== null) {
        const snapped = fibSnapToNodes ? findNearestNodeToPoint(x, y) : null;
        const startPrice = snapped ? snapped.price : price;
        const startTime = snapped ? snapped.time : Date.now();

        setFibDragAnchor('new');
        setIsFibDrawing(true);
        setFibState({
          startX: x,
          startY: y,
          startPrice,
          startTime,
          currentX: x,
          currentY: y,
          currentPrice: startPrice,
          currentTime: startTime,
          isComplete: false,
          snappedStartNodeId: snapped?.id,
        });
        return;
      }
    }

    setIsDragging(true);
    setDragStartX(e.clientX);
    setInitialOffset(offsetRight);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCrosshairPos({ x, y });

    // Report hover price for crosshair synchronization with DOM ladder
    if (crosshairSyncEnabled && onCrosshairPriceChange) {
      const calculatedPrice = calculatePriceAtCoordinateY(y);
      if (calculatedPrice !== null) {
        onCrosshairPriceChange(calculatedPrice);
      }
    }

    if (isFibDrawing && fibState) {
      const price = calculatePriceAtCoordinateY(y);
      if (price !== null) {
        const snapped = fibSnapToNodes ? findNearestNodeToPoint(x, y) : null;
        const currentPrice = snapped ? snapped.price : price;
        const currentTime = snapped ? snapped.time : Date.now();

        if (fibDragAnchor === 'start') {
          setFibState(prev => prev ? {
            ...prev,
            startX: x,
            startY: y,
            startPrice: currentPrice,
            startTime: currentTime,
            snappedStartNodeId: snapped?.id,
          } : null);
        } else {
          setFibState(prev => prev ? {
            ...prev,
            currentX: x,
            currentY: y,
            currentPrice,
            currentTime,
            snappedEndNodeId: snapped?.id,
          } : null);
        }
      }
      return;
    }

    if (isDragging) {
      const deltaX = e.clientX - dragStartX;
      const stepWidth = (rect.width - 82) / Math.max(12, animatedVisibleCountRef.current);
      const candleShift = deltaX / stepWidth;
      const newOffset = Math.max(0, Math.min(Math.max(0, candles.length - 12), +(initialOffset + candleShift).toFixed(3)));
      setOffsetRight(newOffset);
    } else {
      findHoveredNode(x, y);
      findHoveredDeltaBubble(x, y);
    }
  };

  const handleMouseUp = () => {
    if (isFibDrawing) {
      setIsFibDrawing(false);
      setFibDragAnchor(null);
      setFibState(prev => prev ? { ...prev, isComplete: true } : null);
      return;
    }
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedBubble = findHoveredDeltaBubble(x, y);
    if (clickedBubble) {
      if (onPrefillPrice) {
        onPrefillPrice(clickedBubble.price);
      }
      return;
    }

    const clickedNode = findHoveredNode(x, y);
    if (clickedNode) {
      onSelectNode(clickedNode);
    }
  };

  const findHoveredDeltaBubble = (mouseX: number, mouseY: number): DeltaBubble | null => {
    if (!showDeltaBubbles || deltaBubbles.length === 0) {
      setHoveredDeltaBubble(null);
      return null;
    }
    const container = containerRef.current;
    if (!container || candles.length === 0) return null;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const chartWidth = Math.max(10, width - 82);
    const chartHeight = Math.max(10, height - 26);
    const volumeHeight = Math.min(75, Math.max(28, chartHeight * 0.18));
    const priceChartHeight = Math.max(40, chartHeight - volumeHeight);

    const safeOffset = Math.max(0, Math.min(candles.length - 15, offsetRight));
    const endIdx = Math.max(15, candles.length - safeOffset);
    const startIdx = Math.max(0, endIdx - visibleCount);
    const visibleCandles = candles.slice(startIdx, endIdx);
    const count = visibleCandles.length;
    if (count === 0) return null;

    let minP = Infinity;
    let maxP = -Infinity;
    visibleCandles.forEach(c => {
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
    });

    const rawRange = maxP - minP;
    const priceMargin = Math.max(1.2, rawRange * 0.10);
    const renderMinPrice = Math.floor((minP - priceMargin) * 5) / 5;
    const renderMaxPrice = Math.ceil((maxP + priceMargin) * 5) / 5;
    const renderRange = renderMaxPrice - renderMinPrice || 1;

    for (const b of deltaBubbles) {
      if (b.candleIndex >= startIdx && b.candleIndex < endIdx) {
        const step = chartWidth / count;
        const bx = (b.candleIndex - startIdx) * step + step / 2;
        const by = priceChartHeight - ((b.price - renderMinPrice) / renderRange) * priceChartHeight;
        const dist = Math.hypot(mouseX - bx, mouseY - by);
        if (dist <= b.radius + 6) {
          setHoveredDeltaBubble(b);
          return b;
        }
      }
    }

    setHoveredDeltaBubble(null);
    return null;
  };

  const findHoveredNode = (mouseX: number, mouseY: number): PriceNode | null => {
    const container = containerRef.current;
    if (!container || candles.length === 0) return null;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const chartWidth = Math.max(10, width - 82);
    const chartHeight = Math.max(10, height - 26);
    const volumeHeight = Math.min(75, Math.max(28, chartHeight * 0.18));
    const priceChartHeight = Math.max(40, chartHeight - volumeHeight);

    const safeOffset = Math.max(0, Math.min(candles.length - 15, offsetRight));
    const endIdx = Math.max(15, candles.length - safeOffset);
    const startIdx = Math.max(0, endIdx - visibleCount);
    const visibleCandles = candles.slice(startIdx, endIdx);
    const count = visibleCandles.length;

    let minP = Infinity;
    let maxP = -Infinity;
    visibleCandles.forEach(c => {
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
    });

    const rawRange = maxP - minP;
    const priceMargin = Math.max(1.2, rawRange * 0.10);
    const renderMinPrice = Math.floor((minP - priceMargin) * 5) / 5;
    const renderMaxPrice = Math.ceil((maxP + priceMargin) * 5) / 5;
    const renderRange = renderMaxPrice - renderMinPrice || 1;

    for (const node of nodes) {
      let nx = -100;
      if (node.candleIndex >= startIdx && node.candleIndex < endIdx) {
        const step = chartWidth / count;
        nx = (node.candleIndex - startIdx) * step + step / 2;
      } else {
        const idx = visibleCandles.findIndex(c => Math.abs(c.time - node.time) <= timeframeDurationMs);
        if (idx !== -1) {
          const step = chartWidth / count;
          nx = idx * step + step / 2;
        } else if (node.type === 'BOS' || node.type === 'HTF_POC') {
          nx = chartWidth - 30;
        }
      }

      const ny = priceChartHeight - ((node.price - renderMinPrice) / renderRange) * priceChartHeight;

      const dist = Math.hypot(mouseX - nx, mouseY - ny);
      if (dist < 18) {
        setHoveredNode(node);
        return node;
      }
    }

    setHoveredNode(null);
    return null;
  };

  const [touchStartDist, setTouchStartDist] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;

      if (isFibToolActive) {
        if (fibState) {
          const startY = calculateCoordinateYFromPrice(fibState.startPrice);
          const endY = calculateCoordinateYFromPrice(fibState.currentPrice);
          const sNode = fibState.snappedStartNodeId ? nodes.find(n => n.id === fibState.snappedStartNodeId) : null;
          const eNode = fibState.snappedEndNodeId ? nodes.find(n => n.id === fibState.snappedEndNodeId) : null;
          const currentStartX = sNode ? getNodeScreenX(sNode) : fibState.startX;
          const currentEndX = eNode ? getNodeScreenX(eNode) : fibState.currentX;

          if (Math.hypot(x - currentStartX, y - startY) <= 22) {
            setFibDragAnchor('start');
            setIsFibDrawing(true);
            return;
          }
          if (Math.hypot(x - currentEndX, y - endY) <= 22) {
            setFibDragAnchor('end');
            setIsFibDrawing(true);
            return;
          }
        }

        const price = calculatePriceAtCoordinateY(y);
        if (price !== null) {
          const snapped = fibSnapToNodes ? findNearestNodeToPoint(x, y) : null;
          const startPrice = snapped ? snapped.price : price;
          const startTime = snapped ? snapped.time : Date.now();

          setFibDragAnchor('new');
          setIsFibDrawing(true);
          setFibState({
            startX: x,
            startY: y,
            startPrice,
            startTime,
            currentX: x,
            currentY: y,
            currentPrice: startPrice,
            currentTime: startTime,
            isComplete: false,
            snappedStartNodeId: snapped?.id,
          });
          return;
        }
      }

      setIsDragging(true);
      setDragStartX(e.touches[0].clientX);
      setInitialOffset(offsetRight);
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchStartDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;

      if (isFibDrawing && fibState) {
        const price = calculatePriceAtCoordinateY(y);
        if (price !== null) {
          const snapped = fibSnapToNodes ? findNearestNodeToPoint(x, y) : null;
          const currentPrice = snapped ? snapped.price : price;
          const currentTime = snapped ? snapped.time : Date.now();

          if (fibDragAnchor === 'start') {
            setFibState(prev => prev ? {
              ...prev,
              startX: x,
              startY: y,
              startPrice: currentPrice,
              startTime: currentTime,
              snappedStartNodeId: snapped?.id,
            } : null);
          } else {
            setFibState(prev => prev ? {
              ...prev,
              currentX: x,
              currentY: y,
              currentPrice,
              currentTime,
              snappedEndNodeId: snapped?.id,
            } : null);
          }
        }
        return;
      }

      if (isDragging) {
        const deltaX = e.touches[0].clientX - dragStartX;
        const stepWidth = (canvas.clientWidth - 82) / Math.max(12, animatedVisibleCountRef.current);
        const candleShift = deltaX / stepWidth;
        const newOffset = Math.max(0, Math.min(Math.max(0, candles.length - 12), +(initialOffset + candleShift).toFixed(3)));
        setOffsetRight(newOffset);
      }
    } else if (e.touches.length === 2 && touchStartDist !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = currentDist / touchStartDist;
      if (Math.abs(factor - 1) > 0.015) {
        const zoomDelta = 1 / Math.max(0.85, Math.min(1.15, factor));
        setVisibleCount(prev => Math.max(12, Math.min(220, +(prev * zoomDelta).toFixed(3))));
        setTouchStartDist(currentDist);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isFibDrawing) {
      setIsFibDrawing(false);
      setFibDragAnchor(null);
      setFibState(prev => prev ? { ...prev, isComplete: true } : null);
      return;
    }
    setIsDragging(false);
    setTouchStartDist(null);
  };

  const resetView = () => {
    setVisibleCount(60);
    setOffsetRight(0);
  };

  const scrollLeft = () => {
    setOffsetRight(prev => Math.min(Math.max(0, candles.length - 12), +(prev + Math.max(4, visibleCount * 0.22)).toFixed(2)));
  };

  const scrollRight = () => {
    setOffsetRight(prev => Math.max(0, +(prev - Math.max(4, visibleCount * 0.22)).toFixed(2)));
  };

  const zoomIn = () => {
    setVisibleCount(prev => Math.max(12, +(prev * 0.80).toFixed(2)));
  };

  const zoomOut = () => {
    setVisibleCount(prev => Math.min(220, +(prev * 1.25).toFixed(2)));
  };

  const currentPrice = candles[candles.length - 1]?.close || 4141.80;
  const sweepNodesCount = nodes.filter(n => n.liquiditySweep).length;

  return (
    <div className={`relative flex flex-col w-full h-full bg-[#0b0e14] border border-neutral-800 rounded-lg overflow-hidden select-none transition-all ${
      isFullscreen ? 'fixed inset-0 z-[100] w-screen h-screen rounded-none border-0' : ''
    }`}>
      {/* Top Chart Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-[#0f141c]/90 backdrop-blur-sm text-xs z-20 shrink-0 gap-2 overflow-x-auto">
        {/* Interval Selector */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-slate-500 font-medium mr-1 hidden sm:inline">Interval:</span>
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2 py-1 font-mono text-xs rounded transition-colors whitespace-nowrap ${
                timeframe === tf
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-neutral-800'
              }`}
            >
              {tf}
            </button>
          ))}

          <div className="h-4 w-[1px] bg-neutral-800 mx-1 shrink-0" />

          {/* Chart Type */}
          <div className="flex items-center gap-0.5 bg-neutral-900/80 p-0.5 rounded border border-neutral-800 shrink-0">
            <button
              onClick={() => setChartType('candles')}
              title="Candlestick Chart"
              className={`p-1 rounded transition-colors ${
                chartType === 'candles' ? 'bg-neutral-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('line')}
              title="Area Line Chart"
              className={`p-1 rounded transition-colors ${
                chartType === 'line' ? 'bg-neutral-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-neutral-800 mx-1 shrink-0" />

          {/* HD Sharp Rendering Mode Control */}
          <div className="relative">
            <button
              onClick={() => setShowHdSettings(!showHdSettings)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-mono transition-all ${
                showHdSettings
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-sm'
                  : 'bg-neutral-900 border-neutral-700/80 text-amber-400 hover:bg-neutral-800'
              }`}
              title="HD High-Definition Candlestick Rendering & MT5/TradingView Settings"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold">HD Pro</span>
              <span className="text-[10px] uppercase px-1 py-0.2 bg-amber-500/20 text-amber-200 rounded font-bold">
                {hdStyle === 'tradingview' ? 'TV' : 'MT5'}
              </span>
            </button>

            {/* HD Settings Dropdown Popover */}
            {showHdSettings && (
              <div className="absolute top-8 left-0 z-50 w-64 p-3 bg-[#0d121a] border border-neutral-700 rounded-lg shadow-2xl backdrop-blur-md space-y-2.5 text-slate-200 font-sans">
                <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800 text-xs font-bold text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>HD Candlestick Engine</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">RETINA 4K</span>
                </div>

                {/* Theme Selector: TradingView vs MT5 */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-mono">Palette & Styling:</label>
                  <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
                    <button
                      onClick={() => setHdStyle('tradingview')}
                      className={`px-2 py-1.5 rounded border text-center transition-colors ${
                        hdStyle === 'tradingview'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      TradingView Pro
                    </button>
                    <button
                      onClick={() => setHdStyle('mt5')}
                      className={`px-2 py-1.5 rounded border text-center transition-colors ${
                        hdStyle === 'mt5'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      MT5 Classic
                    </button>
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-1.5 text-xs font-mono">
                  <label className="flex items-center justify-between p-1.5 bg-neutral-900/60 rounded hover:bg-neutral-900 cursor-pointer">
                    <span className="text-slate-300">Crisp Body Outlines</span>
                    <input
                      type="checkbox"
                      checked={showCrispBorders}
                      onChange={(e) => setShowCrispBorders(e.target.checked)}
                      className="accent-amber-500 w-3.5 h-3.5 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 bg-neutral-900/60 rounded hover:bg-neutral-900 cursor-pointer">
                    <span className="text-slate-300">Live Bid/Ask Lines</span>
                    <input
                      type="checkbox"
                      checked={showBidAskLines}
                      onChange={(e) => setShowBidAskLines(e.target.checked)}
                      className="accent-cyan-500 w-3.5 h-3.5 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 bg-neutral-900/60 rounded hover:bg-neutral-900 cursor-pointer">
                    <span className="text-slate-300">Candle Close Timer</span>
                    <input
                      type="checkbox"
                      checked={showCandleCountdown}
                      onChange={(e) => setShowCandleCountdown(e.target.checked)}
                      className="accent-amber-500 w-3.5 h-3.5 rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Garis Harga XAU/USD Dedicated Controller */}
          <div className="relative">
            <button
              onClick={() => setShowPriceLineMenu(!showPriceLineMenu)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-mono transition-all cursor-pointer ${
                showPriceLine
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold shadow-sm'
                  : 'bg-neutral-900 border-neutral-800 text-slate-500 hover:text-slate-300'
              }`}
              title="Pengaturan Garis Harga Live XAU/USD (Laser Beam, Dashed Pro, Solid MT5 & Titik Radar Pulse)"
            >
              <Activity className={`w-3.5 h-3.5 ${showPriceLine ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <span className="font-semibold">Garis Harga</span>
              <span className="text-[10px] uppercase px-1 py-0.2 rounded bg-neutral-950/80 border border-neutral-800 font-bold text-emerald-300">
                {showPriceLine ? priceLineStyle : 'OFF'}
              </span>
            </button>

            {/* Price Line Menu Popover */}
            {showPriceLineMenu && (
              <div className="absolute top-8 left-0 z-50 w-72 p-3 bg-[#0d121a] border border-neutral-700/80 rounded-lg shadow-2xl backdrop-blur-xl space-y-3 text-slate-200 font-sans animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800 text-xs font-bold text-emerald-300 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    <span>GARIS HARGA SPOT XAU/USD</span>
                  </span>
                  <button
                    onClick={() => setShowPriceLine(!showPriceLine)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      showPriceLine ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-slate-500'
                    }`}
                  >
                    {showPriceLine ? 'AKTIF' : 'NONAKTIF'}
                  </button>
                </div>

                {/* Gaya Garis Harga */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-mono">Gaya Tampilan Garis:</label>
                  <div className="grid grid-cols-3 gap-1 text-center font-mono text-xs">
                    {(['laser', 'dashed', 'solid'] as const).map(style => (
                      <button
                        key={style}
                        onClick={() => {
                          setPriceLineStyle(style);
                          setShowPriceLine(true);
                        }}
                        className={`py-1.5 px-1 rounded border text-xs capitalize transition-colors ${
                          priceLineStyle === style && showPriceLine
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                            : 'bg-neutral-950 border-neutral-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {style === 'laser' ? 'Laser Glow' : style === 'dashed' ? 'Dashed Pro' : 'Solid MT5'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Radar Pulse Beacon Toggle */}
                <div className="space-y-1.5 text-xs font-mono">
                  <label className="flex items-center justify-between p-1.5 bg-neutral-900/60 rounded hover:bg-neutral-900 cursor-pointer">
                    <div>
                      <div className="text-slate-200 font-semibold">Titik Pulse Radar 60FPS</div>
                      <div className="text-[9.5px] text-slate-400">Lingkaran berdenyut di ujung candle</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={showPricePulse}
                      onChange={(e) => setShowPricePulse(e.target.checked)}
                      className="accent-emerald-500 w-3.5 h-3.5 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 bg-neutral-900/60 rounded hover:bg-neutral-900 cursor-pointer">
                    <div>
                      <div className="text-slate-200 font-semibold">Garis Spread Bid / Ask</div>
                      <div className="text-[9.5px] text-slate-400">Koridor spread merah/cyan</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={showBidAskLines}
                      onChange={(e) => setShowBidAskLines(e.target.checked)}
                      className="accent-cyan-500 w-3.5 h-3.5 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 bg-neutral-900/60 rounded hover:bg-neutral-900 cursor-pointer">
                    <div>
                      <div className="text-slate-200 font-semibold">Timer Hitung Mundur Lilin</div>
                      <div className="text-[9.5px] text-slate-400">Sisa waktu penutupan timeframe</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={showCandleCountdown}
                      onChange={(e) => setShowCandleCountdown(e.target.checked)}
                      className="accent-amber-500 w-3.5 h-3.5 rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Slowmo Smooth Motion Controller */}
          <div className="relative">
            <button
              onClick={() => setShowSlowmoMenu(!showSlowmoMenu)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-mono transition-all cursor-pointer ${
                smoothPriceMode === 'slowmo'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-sm'
                  : smoothPriceMode === 'smooth'
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold shadow-sm'
                  : 'bg-neutral-900 border-neutral-800 text-slate-500 hover:text-slate-300'
              }`}
              title="Pengaturan Gerakan Halus Harga (Slowmo Sinematik, Smooth 60FPS, atau Instan)"
            >
              <Zap className={`w-3.5 h-3.5 ${smoothPriceMode !== 'instant' ? 'text-amber-400' : 'text-slate-500'}`} />
              <span className="font-semibold">Slowmo Smooth</span>
              <span className="text-[10px] uppercase px-1 py-0.2 rounded bg-neutral-950/80 border border-neutral-800 font-bold text-amber-300">
                {smoothPriceMode === 'slowmo' ? '🐢 SLOWMO' : smoothPriceMode === 'smooth' ? '⚡ 60FPS' : 'INSTAN'}
              </span>
            </button>

            {/* Slowmo Menu Popover */}
            {showSlowmoMenu && (
              <div className="absolute top-8 left-0 z-50 w-72 p-3 bg-[#0d121a] border border-neutral-700/80 rounded-lg shadow-2xl backdrop-blur-xl space-y-2.5 text-slate-200 font-sans animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800 text-xs font-bold text-amber-300 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>SLOWMO & SMOOTH MOTION ENGINE</span>
                  </span>
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  <button
                    onClick={() => {
                      setSmoothPriceMode('slowmo');
                      setShowSlowmoMenu(false);
                    }}
                    className={`w-full p-2 rounded border text-left transition-colors cursor-pointer ${
                      smoothPriceMode === 'slowmo'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-300">🐢 Slowmo Sinematik</span>
                      {smoothPriceMode === 'slowmo' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <div className="text-[9.5px] text-slate-400 font-sans mt-0.5">
                      Gerakan meluncur paling halus (~650ms easing) tanpa lag atau jitter.
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setSmoothPriceMode('smooth');
                      setShowSlowmoMenu(false);
                    }}
                    className={`w-full p-2 rounded border text-left transition-colors cursor-pointer ${
                      smoothPriceMode === 'smooth'
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-cyan-300">⚡ Smooth 60FPS</span>
                      {smoothPriceMode === 'smooth' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <div className="text-[9.5px] text-slate-400 font-sans mt-0.5">
                      Transisi fluid responsif (~200ms easing) standar TradingView Pro.
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setSmoothPriceMode('instant');
                      setShowSlowmoMenu(false);
                    }}
                    className={`w-full p-2 rounded border text-left transition-colors cursor-pointer ${
                      smoothPriceMode === 'instant'
                        ? 'bg-slate-800 border-slate-600 text-slate-200 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300">⏹ Instan (Direct Tick)</span>
                      {smoothPriceMode === 'instant' && <Check className="w-3.5 h-3.5 text-slate-300" />}
                    </div>
                    <div className="text-[9.5px] text-slate-400 font-sans mt-0.5">
                      Lompatan harga langsung tanpa animasi smoothing (MT5 tick raw).
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Border Candle Dedicated Control Button & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowBorderCandleMenu(!showBorderCandleMenu)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-mono transition-all cursor-pointer ${
                borderSettings.enabled
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                  : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Border Candle (Garis Tepi Lilin) Settings & Customization"
            >
              <Box className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold">Border Candle</span>
              <span className="text-[10px] px-1 rounded uppercase font-bold bg-neutral-800 text-amber-300 border border-neutral-700">
                {borderSettings.enabled ? borderSettings.style : 'OFF'}
              </span>
            </button>

            {showBorderCandleMenu && (
              <div className="absolute top-8 left-0 z-50 w-72 p-3 bg-neutral-900/95 border border-neutral-700/80 rounded-lg shadow-2xl backdrop-blur-xl space-y-3 text-slate-200 font-sans animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800 text-xs font-bold text-amber-300 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5" />
                    <span>BORDER CANDLE ENGINE</span>
                  </span>
                  <button
                    onClick={() => updateBorderSettings({ enabled: !borderSettings.enabled })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      borderSettings.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-slate-500'
                    }`}
                  >
                    {borderSettings.enabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>

                {/* Border Candle Style Options */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-mono">Candle Outline Style:</label>
                  <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                    <button
                      onClick={() => updateBorderSettings({ style: 'matching', enabled: true })}
                      className={`p-1.5 rounded border text-left transition-colors ${
                        borderSettings.style === 'matching' && borderSettings.enabled
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                          : 'bg-neutral-950 border-neutral-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-[11px] font-semibold">Matching</div>
                      <div className="text-[9px] text-slate-500">Sharp Pro Edges</div>
                    </button>

                    <button
                      onClick={() => updateBorderSettings({ style: 'hollow', enabled: true })}
                      className={`p-1.5 rounded border text-left transition-colors ${
                        borderSettings.style === 'hollow' && borderSettings.enabled
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                          : 'bg-neutral-950 border-neutral-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-[11px] font-semibold text-emerald-400">Hollow Candle</div>
                      <div className="text-[9px] text-slate-500">Japanese Style</div>
                    </button>

                    <button
                      onClick={() => updateBorderSettings({ style: 'contrast', enabled: true })}
                      className={`p-1.5 rounded border text-left transition-colors ${
                        borderSettings.style === 'contrast' && borderSettings.enabled
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                          : 'bg-neutral-950 border-neutral-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-[11px] font-semibold text-cyan-400">Vivid Contrast</div>
                      <div className="text-[9px] text-slate-500">Neon Scalping</div>
                    </button>

                    <button
                      onClick={() => updateBorderSettings({ style: 'gold', enabled: true })}
                      className={`p-1.5 rounded border text-left transition-colors ${
                        borderSettings.style === 'gold' && borderSettings.enabled
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                          : 'bg-neutral-950 border-neutral-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-[11px] font-semibold text-amber-400">Schevanka 24K Gold</div>
                      <div className="text-[9px] text-slate-500">Gilded Edges</div>
                    </button>
                  </div>
                </div>

                {/* Border Thickness */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-mono">Border Width / Thickness:</label>
                  <div className="grid grid-cols-3 gap-1 text-center font-mono text-xs">
                    {(['1px', '1.5px', '2px'] as BorderCandleWidth[]).map((w) => (
                      <button
                        key={w}
                        onClick={() => updateBorderSettings({ width: w, enabled: true })}
                        className={`py-1 rounded border transition-colors ${
                          borderSettings.width === w
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                            : 'bg-neutral-950 border-neutral-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Link to Full Theme Studio */}
                {onOpenThemeStudio && (
                  <button
                    onClick={() => {
                      setShowBorderCandleMenu(false);
                      onOpenThemeStudio();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-pink-300 text-xs font-mono font-bold transition-all cursor-pointer mt-1"
                  >
                    <Palette className="w-3.5 h-3.5 text-pink-400" />
                    <span>Buka 10 Palet Warna Candle Estetik &rarr;</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Dedicated Aesthetic Theme & Candle Studio Button */}
          {onOpenThemeStudio && (
            <button
              onClick={onOpenThemeStudio}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 font-mono text-xs font-semibold cursor-pointer transition-all shadow-sm"
              title="Buka Studio Tema UI & Candle Estetik (11 UI · 10 Candle Themes)"
            >
              <Palette className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden sm:inline">Tema & Candle</span>
              <span className="text-[10px] px-1 bg-pink-500/20 rounded font-bold">10+</span>
            </button>
          )}
        </div>

        {/* Feature Toggles */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Liquidity Sweeps Toggle */}
          <button
            onClick={() => setShowSweeps(!showSweeps)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-colors whitespace-nowrap ${
              showSweeps
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-semibold shadow-sm shadow-rose-500/10'
                : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Candle & Swing Liquidity Sweeps (SSL/BSL Turtle Soup)"
          >
            <Target className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-mono">Sweeps</span>
            {sweepNodesCount > 0 && (
              <span className="text-[10px] px-1 bg-rose-500/30 text-rose-200 rounded-full font-bold">
                {sweepNodesCount}
              </span>
            )}
          </button>

          {/* HTF Candle Volume Profile Toggle & Selector */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded p-0.5">
            <button
              onClick={() => setShowHtfProfile(!showHtfProfile)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors whitespace-nowrap ${
                showHtfProfile
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle HTF Candle Volume Profile & POC Matrix"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono">HTF Profile</span>
            </button>

            {showHtfProfile && (
              <div className="flex items-center pl-1 border-l border-neutral-800 gap-0.5">
                {htfTimeframes.map((htf) => (
                  <button
                    key={htf}
                    onClick={() => setHtfTimeframe(htf)}
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors ${
                      htfTimeframe === htf
                        ? 'bg-neutral-800 text-amber-300 font-bold'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {htf}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Liquidity Heatmap Toggle */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-xs transition-colors whitespace-nowrap ${
              showHeatmap
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle DOM Order Book Liquidity Density Heatmap"
          >
            <Flame className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium hidden md:inline">Heatmap</span>
          </button>

          {/* FVG Toggle */}
          <button
            onClick={() => setShowFvg(!showFvg)}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-xs transition-colors whitespace-nowrap ${
              showFvg
                ? 'bg-orange-500/15 border-orange-500/30 text-orange-300'
                : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle ICT Fair Value Gaps (FVG)"
          >
            <Box className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden lg:inline font-mono">FVG</span>
          </button>

          {/* Structural Nodes Toggle */}
          <button
            onClick={() => setShowNodes(!showNodes)}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-xs transition-colors whitespace-nowrap ${
              showNodes
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Structural Pivot Nodes (HH, HL, LH, LL, EQH, EQL)"
          >
            <GitFork className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium hidden md:inline">Nodes</span>
          </button>

          {showNodes && (
            <button
              onClick={() => setShowNodePaths(!showNodePaths)}
              className={`px-2 py-1 rounded border text-xs font-mono transition-colors whitespace-nowrap ${
                showNodePaths
                  ? 'bg-neutral-800 border-neutral-700 text-slate-200'
                  : 'bg-neutral-900/60 border-neutral-800 text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Structural Node Connecting Edges"
            >
              Paths
            </button>
          )}

          {/* EMA */}
          <button
            onClick={() => setShowEma(!showEma)}
            className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors whitespace-nowrap cursor-pointer ${
              showEma
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-slate-200'
            }`}
            title="EMA 20 & EMA 50"
          >
            <span className="font-mono">EMA</span>
          </button>

          {/* Delta Volume Bubble [Quant / Z-Score] */}
          <div className="relative flex items-center shrink-0">
            <button
              onClick={() => setShowDeltaBubbles(!showDeltaBubbles)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-l border text-xs transition-colors whitespace-nowrap cursor-pointer ${
                showDeltaBubbles
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-semibold shadow-sm shadow-cyan-500/10'
                  : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Delta Volume Bubble [Quant / Z-Score]"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono hidden sm:inline">Delta Bubble</span>
              {showDeltaBubbles && deltaBubbles.length > 0 && (
                <span className="flex items-center gap-1 text-[9px] font-mono">
                  <span className="px-1 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 font-bold" title="Bullish Delta Bubbles">
                    {deltaMetrics.bullishCount}B
                  </span>
                  <span className="px-1 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-500/30 font-bold" title="Bearish Delta Bubbles">
                    {deltaMetrics.bearishCount}S
                  </span>
                  {deltaMetrics.absorptionCount > 0 && (
                    <span className="px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-bold" title="Passive Absorption Alerts">
                      {deltaMetrics.absorptionCount}Abs
                    </span>
                  )}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowDeltaBubbleMenu(!showDeltaBubbleMenu)}
              className={`px-1.5 py-1 rounded-r border-t border-r border-b text-xs transition-colors cursor-pointer ${
                showDeltaBubbles
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30'
                  : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Delta Volume Bubble Quant Settings & Z-Score Tuning"
            >
              <SlidersHorizontal className="w-3 h-3" />
            </button>
          </div>

          {/* Bloomberg Auto Smart Channel (Automated Linear Regression & StdDev Volatility Envelope) */}
          <div className="relative flex items-center shrink-0">
            <button
              onClick={() => setShowBloombergChannel(!showBloombergChannel)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-l border text-xs transition-colors whitespace-nowrap cursor-pointer ${
                showBloombergChannel
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-semibold shadow-sm shadow-amber-500/10'
                  : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Bloomberg Auto Smart Channel (Automated Linear Regression & StdDev Volatility Envelope)"
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono hidden sm:inline">BBG Channel</span>
              {showBloombergChannel && bloombergChannel && (
                <span className="flex items-center gap-1 text-[9px] font-mono">
                  <span className={`px-1 py-0.2 rounded font-bold border ${
                    bloombergChannel.regime === 'BULLISH_ASCENDING'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                      : bloombergChannel.regime === 'BEARISH_DESCENDING'
                      ? 'bg-rose-950/80 text-rose-300 border-rose-500/30'
                      : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/30'
                  }`}>
                    {bloombergChannel.regime === 'BULLISH_ASCENDING' ? 'BULL' : bloombergChannel.regime === 'BEARISH_DESCENDING' ? 'BEAR' : 'FLAT'}
                  </span>
                  <span className="px-1 py-0.2 rounded bg-neutral-900 text-amber-300 border border-neutral-700 font-bold hidden md:inline">
                    {bloombergChannel.slopeAngleDeg}°
                  </span>
                </span>
              )}
            </button>

            <button
              onClick={() => setShowBloombergChannelModal(true)}
              className={`px-1.5 py-1 rounded-r border-t border-r border-b text-xs transition-colors cursor-pointer ${
                showBloombergChannel
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Bloomberg Channel Settings & Quantitative Metrics"
            >
              <SlidersHorizontal className="w-3 h-3" />
            </button>
          </div>

          {/* Clean Grid Toggle (Requested: hapus grid vertikal dan horizontal pada bg chart) */}
          <button
            onClick={() => setShowGridLines(!showGridLines)}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-mono transition-colors whitespace-nowrap cursor-pointer ${
              showGridLines
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-semibold'
                : 'bg-neutral-900 border-neutral-800 text-slate-500 hover:text-slate-300'
            }`}
            title={
              showGridLines
                ? 'Grid Aktif: Klik untuk menghapus grid latar belakang chart'
                : 'Grid Terhapus (Latar Belakang Bersih): Grid vertikal dan horizontal nonaktif'
            }
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{showGridLines ? 'Grid On' : 'Grid Off'}</span>
          </button>

          {/* Institutional Liquidity Zones Toggle & Settings */}
          <div className="relative flex items-center shrink-0">
            <button
              onClick={() => setShowBigBelugaZones(!showBigBelugaZones)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-l border text-xs transition-colors whitespace-nowrap cursor-pointer ${
                showBigBelugaZones
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-semibold'
                  : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Institutional Liquidity Zones (BSL / SSL)"
            >
              <Droplets className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-mono hidden sm:inline">Liq Zones</span>
              {showBigBelugaZones && bigBelugaZones.length > 0 && (
                <span className="flex items-center gap-1 text-[9px] font-mono">
                  <span className="px-1 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-500/30 font-bold" title="Active BSL Zones">
                    {activeBigBelugaHighs.length}B
                  </span>
                  <span className="px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-bold" title="Active SSL Zones">
                    {activeBigBelugaLows.length}S
                  </span>
                </span>
              )}
            </button>

            <button
              onClick={() => setShowBigBelugaMenu(!showBigBelugaMenu)}
              className={`px-1.5 py-1 rounded-r border-t border-r border-b text-xs transition-colors cursor-pointer ${
                showBigBelugaZones
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                  : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Liquidity Zones Settings & Mode"
            >
              <SlidersHorizontal className="w-3 h-3" />
            </button>

            {/* Liquidity Zones Settings Popover Dropdown */}
            {showBigBelugaMenu && (
              <div className="absolute left-0 top-full mt-1.5 w-72 bg-neutral-900/95 border border-neutral-700 rounded-xl shadow-2xl backdrop-blur-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3 font-sans">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <div className="flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-rose-400" />
                    <span className="font-bold text-xs text-slate-100">Institutional Liquidity Zones</span>
                  </div>
                </div>

                {/* Mode Selector */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                    Zone Sizing Calculation Mode
                  </label>
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-neutral-950 rounded border border-neutral-800 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setBigBelugaConfig(prev => ({ ...prev, mode: 'dynamic' }))}
                      className={`py-1 rounded text-center transition-colors cursor-pointer ${
                        bigBelugaConfig.mode === 'dynamic'
                          ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Dynamic (Vol)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBigBelugaConfig(prev => ({ ...prev, mode: 'simple' }))}
                      className={`py-1 rounded text-center transition-colors cursor-pointer ${
                        bigBelugaConfig.mode === 'simple'
                          ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Simple (ATR)
                    </button>
                  </div>
                  <span className="text-[9.5px] text-slate-500 block mt-1">
                    {bigBelugaConfig.mode === 'dynamic'
                      ? 'Zone height expands with normalized volume intensity'
                      : 'Fixed height derived from 14-period Average True Range'}
                  </span>
                </div>

                {/* Volume Filter */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                    Volume Strength Filter
                  </label>
                  <div className="grid grid-cols-3 gap-1 p-0.5 bg-neutral-950 rounded border border-neutral-800 text-[11px] font-mono">
                    {(['ALL', 'MID_HIGH', 'HIGH_ONLY'] as const).map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setBigBelugaConfig(prev => ({ ...prev, volumeFilter: f }))}
                        className={`py-1 rounded text-center transition-colors cursor-pointer ${
                          bigBelugaConfig.volumeFilter === f
                            ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {f === 'ALL' ? 'All' : f === 'MID_HIGH' ? 'Mid+' : 'High'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pivot Length */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span className="uppercase tracking-wider">Pivot Detection Length</span>
                    <span className="text-amber-300 font-bold">{bigBelugaConfig.pivotLength} bars</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[11px] font-mono">
                    {[5, 8, 10, 15].map(len => (
                      <button
                        key={len}
                        type="button"
                        onClick={() => setBigBelugaConfig(prev => ({ ...prev, pivotLength: len }))}
                        className={`py-1 rounded border text-center transition-colors cursor-pointer ${
                          bigBelugaConfig.pivotLength === len
                            ? 'bg-neutral-800 border-amber-500/40 text-amber-300 font-bold'
                            : 'bg-neutral-950 border-neutral-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {len}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle Show Grabbed Zones */}
                <div className="flex items-center justify-between pt-1 border-t border-neutral-800 text-xs text-slate-300">
                  <span className="text-[11px]">Show Grabbed / Mitigated Zones</span>
                  <input
                    type="checkbox"
                    checked={bigBelugaConfig.showGrabbed}
                    onChange={(e) => setBigBelugaConfig(prev => ({ ...prev, showGrabbed: e.target.checked }))}
                    className="accent-rose-500 cursor-pointer"
                  />
                </div>

                <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Supply & Demand Engine</span>
                  <button
                    type="button"
                    onClick={() => setShowBigBelugaMenu(false)}
                    className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-slate-200 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Fibonacci Retracement Tool */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                const next = !isFibToolActive;
                setIsFibToolActive(next);
                if (next && !fibState) {
                  // Attempt automatic snap to visible swing nodes if empty
                  handleAutoSnapFibToNodes();
                }
              }}
              className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs transition-colors whitespace-nowrap cursor-pointer ${
                isFibToolActive
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-sm'
                  : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Interactive Fibonacci Retracement: Click & Drag across chart to overlay technical levels on node structures"
            >
              <Ruler className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono">Fib Retrace</span>
              {fibState && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            {/* Quick Fibonacci Tools when active or drawn */}
            {(isFibToolActive || fibState) && (
              <div className="flex items-center gap-0.5 bg-neutral-900/90 p-0.5 rounded border border-neutral-800">
                <button
                  onClick={handleAutoSnapFibToNodes}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300 hover:text-amber-300 hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Auto Snap Fibonacci between highest visible Swing High and lowest Swing Low"
                >
                  Snap
                </button>
                <button
                  onClick={() => setFibSnapToNodes(prev => !prev)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                    fibSnapToNodes
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Toggle Magnetic Snap to Structural Swing Nodes"
                >
                  Magnet
                </button>
                {fibState && (
                  <>
                    <button
                      onClick={handleFlipFib}
                      className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Flip 0% and 100% Direction"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setShowFibGoldenZoneOnly(!showFibGoldenZoneOnly)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                        showFibGoldenZoneOnly
                          ? 'bg-amber-500/20 text-amber-300 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Toggle Golden Pocket (0.50 - 0.618 OTE) focus"
                    >
                      OTE
                    </button>
                    <button
                      onClick={handleClearFib}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Clear Fibonacci Retracement"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Zoom & Scroll Controls */}
          <div className="flex items-center gap-0.5 bg-neutral-900/90 p-0.5 rounded border border-neutral-800 shrink-0">
            <button
              onClick={scrollLeft}
              className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-neutral-800 transition-colors"
              title="Scroll/Pan Left (History)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={scrollRight}
              className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-neutral-800 transition-colors"
              title="Scroll/Pan Right (Recent)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={zoomIn}
              className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-neutral-800 transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={zoomOut}
              className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-neutral-800 transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reset View */}
          <button
            onClick={resetView}
            className="p-1 rounded bg-neutral-900 border border-neutral-800 text-slate-400 hover:text-slate-100 transition-colors"
            title="Reset View & Scale"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* CFD Sync Quick Button */}
          {onOpenCfdCalibration && (
            <button
              onClick={onOpenCfdCalibration}
              className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 text-xs transition-colors whitespace-nowrap"
              title="Calibrate Real-Time CFD Spot Price & Spread with your MT4/MT5 Broker"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xl:inline font-mono">CFD</span>
            </button>
          )}

          {/* Crosshair Sync Toggle Button */}
          {onToggleCrosshairSync && (
            <button
              onClick={onToggleCrosshairSync}
              className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                crosshairSyncEnabled
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold shadow-sm shadow-cyan-500/20'
                  : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:text-slate-200'
              }`}
              title={
                crosshairSyncEnabled
                  ? 'Sinkronisasi Crosshair Aktif: Gerakan kursor Chart dan DOM saling terhubung'
                  : 'Aktifkan Sinkronisasi Crosshair Chart ↔ DOM'
              }
            >
              <Crosshair className={`w-3.5 h-3.5 text-cyan-400 ${crosshairSyncEnabled ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">Sync DOM</span>
              <span className={`w-1.5 h-1.5 rounded-full ${crosshairSyncEnabled ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
            </button>
          )}

          {/* Performance Analytics Quick Button */}
          {onOpenPerformance && (
            <button
              onClick={onOpenPerformance}
              className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/15 border border-amber-500/35 text-amber-300 hover:bg-amber-500/25 text-xs transition-colors font-mono font-medium whitespace-nowrap"
              title="View Recharts Performance Analytics & Historical PnL Curve"
            >
              <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">PnL</span>
            </button>
          )}

          {/* Full Screen Chart Button (Layar Penuh Chart) */}
          <button
            onClick={toggleFullscreen}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
              isFullscreen
                ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400 shadow-md shadow-amber-500/25'
                : 'bg-neutral-900 border-neutral-700/80 text-amber-300 hover:bg-neutral-800 hover:text-white'
            }`}
            title={isFullscreen ? 'Keluar dari Layar Penuh (ESC)' : 'Layar Penuh Chart (Fullscreen / F11)'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="font-semibold">Keluar Layar Penuh</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="font-semibold">Layar Penuh</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div 
        ref={containerRef} 
        className="relative flex-1 w-full h-full min-h-0 cursor-crosshair overflow-hidden"
      >
        {/* Fullscreen Floating Exit Badge */}
        {isFullscreen && (
          <div className="absolute top-3 right-3 z-30 flex items-center gap-2 bg-neutral-950/90 border border-neutral-700/80 rounded-lg px-2.5 py-1.5 backdrop-blur-md shadow-2xl text-xs font-mono animate-in fade-in zoom-in-95">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 hidden sm:inline">Layar Penuh Aktif</span>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/40 transition-colors cursor-pointer text-[11px] font-semibold"
              title="Keluar dari layar penuh (atau tekan tombol ESC)"
            >
              <Minimize2 className="w-3 h-3" />
              <span>Keluar (ESC)</span>
            </button>
          </div>
        )}

        {/* Bloomberg Auto Smart Channel Floating Telemetry Badge */}
        {showBloombergChannel && bloombergChannel && !isFibToolActive && (
          <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-950/90 border border-amber-500/40 text-[10px] font-mono shadow-xl backdrop-blur-md animate-in fade-in duration-100">
            <div className="flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-amber-300">BBG AUTO CHANNEL</span>
            </div>
            <span className="text-neutral-700">|</span>
            <span className={`font-bold flex items-center gap-0.5 ${
              bloombergChannel.regime === 'BULLISH_ASCENDING' ? 'text-emerald-400' :
              bloombergChannel.regime === 'BEARISH_DESCENDING' ? 'text-rose-400' : 'text-cyan-400'
            }`}>
              {bloombergChannel.regime === 'BULLISH_ASCENDING' && <TrendingUp className="w-3 h-3" />}
              {bloombergChannel.regime === 'BEARISH_DESCENDING' && <TrendingDown className="w-3 h-3" />}
              <span>{bloombergChannel.regime === 'BULLISH_ASCENDING' ? 'BULL' : bloombergChannel.regime === 'BEARISH_DESCENDING' ? 'BEAR' : 'RANGE'}</span>
              <span>({bloombergChannel.slopeAngleDeg}°)</span>
            </span>
            <span className="text-neutral-700 hidden sm:inline">|</span>
            <span className="text-slate-300 hidden sm:inline">
              R²: <strong className="text-amber-400">{(bloombergChannel.rSquared * 100).toFixed(0)}%</strong>
            </span>
            <span className="text-neutral-700 hidden md:inline">|</span>
            <span className="text-slate-300 hidden md:inline">
              Mid: <strong className="text-amber-300">${bloombergChannel.currentMidline.toFixed(2)}</strong>
            </span>
            <span className="text-neutral-700 hidden lg:inline">|</span>
            <span className="text-slate-300 hidden lg:inline">
              Target: <strong className="text-cyan-300">${bloombergChannel.targetPrice.toFixed(2)}</strong>
            </span>
            <button
              onClick={() => setShowBloombergChannelModal(true)}
              className="ml-1 p-0.5 rounded hover:bg-neutral-800 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
              title="Configure Bloomberg Auto Smart Channel"
            >
              <SlidersHorizontal className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Interactive Fibonacci Retracement Guidance Banner */}
        {isFibToolActive && (
          <div className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-2 bg-neutral-950/95 border border-amber-500/50 rounded-lg px-3 py-1.5 backdrop-blur-md shadow-2xl text-xs font-mono text-amber-300 animate-in fade-in slide-in-from-top-2">
            <Ruler className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
            <span className="font-semibold">Fibonacci Retracement Active:</span>
            <span className="text-slate-300 hidden md:inline">Click & drag across chart or swing nodes</span>
            {fibState && (
              <span className="text-[10px] text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                ${fibState.startPrice.toFixed(2)} &rarr; ${fibState.currentPrice.toFixed(2)}
              </span>
            )}
            <button
              onClick={handleAutoSnapFibToNodes}
              className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold cursor-pointer transition-colors"
              title="Auto-snap Fibonacci between highest swing high and lowest swing low nodes"
            >
              Auto Snap
            </button>
            <button
              onClick={() => setFibSnapToNodes(prev => !prev)}
              className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer transition-colors ${
                fibSnapToNodes 
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40 font-bold' 
                  : 'bg-neutral-800 text-slate-400'
              }`}
              title="Toggle Magnetic Snap to Swing Nodes"
            >
              Magnet: {fibSnapToNodes ? 'ON' : 'OFF'}
            </button>
            {fibState && (
              <>
                <button
                  onClick={handleFlipFib}
                  className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-slate-300 text-[10px] cursor-pointer transition-colors"
                  title="Flip 0% and 100% levels"
                >
                  <ArrowUpDown className="w-3 h-3" />
                </button>
                <button
                  onClick={handleClearFib}
                  className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] cursor-pointer transition-colors"
                  title="Clear Fibonacci drawing"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </>
            )}
            <button
              onClick={() => setIsFibToolActive(false)}
              className="text-slate-400 hover:text-slate-200 text-xs ml-1 cursor-pointer font-bold"
              title="Close Fib tool (Esc)"
            >
              &times;
            </button>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsDragging(false);
            if (isFibDrawing) {
              setIsFibDrawing(false);
              setFibState(prev => prev ? { ...prev, isComplete: true } : null);
            }
            setCrosshairPos(null);
            setHoveredNode(null);
            setHoveredDeltaBubble(null);
            if (crosshairSyncEnabled && onCrosshairPriceChange) {
              onCrosshairPriceChange(null);
            }
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleClick}
          className={`absolute inset-0 block w-full h-full ${isFibToolActive ? 'cursor-crosshair' : 'cursor-default'}`}
        />

        {/* Timeframe Switch & M1 Precision Calibration Overlay */}
        {isCalibratingTimeframe && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#090d14]/88 backdrop-blur-md transition-opacity duration-200 pointer-events-none">
            <div className="flex flex-col items-center gap-3 px-6 py-4 rounded-xl bg-neutral-950/90 border border-amber-500/35 shadow-2xl">
              <div className="flex items-end gap-1.5 h-8">
                <div className="w-2 h-5 bg-emerald-400/90 rounded-[1px] animate-pulse" />
                <div className="w-2 h-7 bg-amber-400 rounded-[1px] animate-bounce" />
                <div className="w-2 h-4 bg-rose-400/90 rounded-[1px] animate-pulse" />
                <div className="w-2 h-8 bg-emerald-400 rounded-[1px] animate-bounce" />
              </div>
              <div className="text-center space-y-0.5">
                <div className="text-xs font-mono font-semibold text-amber-300 tracking-wide">
                  MENYELARASKAN CANDLE {timeframe.toUpperCase()}...
                </div>
                <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                  Mengunci Basis XAU/USD @ ${currentPrice.toFixed(2)} (Zero-Jump)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Liquidity Density & Sweeps Overlay HUD */}
        <LiquidityDensityOverlay
          nodes={nodes}
          bids={bids}
          asks={asks}
          spread={spread}
          currentPrice={currentPrice}
          activeKillzones={activeKillzones}
          onSelectNode={onSelectNode}
          onPrefillPrice={onPrefillPrice}
          showHeatmap={showHeatmap}
          onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
          showKillzones={showKillzones}
          onToggleKillzones={() => setShowKillzones(!showKillzones)}
        />

        {/* Delta Volume Bubble [Quant / Z-Score] Overlay & Settings */}
        <DeltaVolumeBubbleOverlay
          metrics={deltaMetrics}
          config={deltaBubbleConfig}
          onUpdateConfig={(partial) => setDeltaBubbleConfig(prev => ({ ...prev, ...partial }))}
          hoveredBubble={hoveredDeltaBubble}
          isOpenSettings={showDeltaBubbleMenu}
          onCloseSettings={() => setShowDeltaBubbleMenu(false)}
          showGridLines={showGridLines}
          onToggleGridLines={() => setShowGridLines(prev => !prev)}
          showDeltaBubbles={showDeltaBubbles}
          onToggleDeltaBubbles={() => setShowDeltaBubbles(prev => !prev)}
        />

        {/* Hovered Node Tooltip Callout */}
        {hoveredNode && (
          <div className="absolute top-14 right-4 z-30 p-3 bg-neutral-900/95 border border-neutral-700/80 rounded-md shadow-2xl backdrop-blur-md max-w-sm pointer-events-none text-xs animate-in fade-in duration-100">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                <span 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: hoveredNode.color }} 
                />
                {hoveredNode.label}
              </span>
              <span className="font-mono font-bold text-amber-400">
                ${hoveredNode.price.toFixed(2)}
              </span>
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed mb-2">
              {hoveredNode.description}
            </p>

            {/* Liquidity Sweep Callout */}
            {hoveredNode.liquiditySweep && (
              <div className="mb-2 p-2 bg-neutral-950 rounded border border-rose-500/30 font-mono text-[11px] space-y-1">
                <div className="flex items-center justify-between text-rose-300 font-bold">
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3 text-rose-400" />
                    <span>Institutional Liquidity Sweep</span>
                  </span>
                  <span>{hoveredNode.liquiditySweep.sweepSide === 'SSL' ? 'Sell-Side Grab' : 'Buy-Side Grab'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>Swept Depth:</span>
                  <span className="text-slate-100 font-bold">${hoveredNode.liquiditySweep.sweepDepth.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>Rejection Wick:</span>
                  <span className="text-emerald-400 font-bold">{(hoveredNode.liquiditySweep.wickRejectionRatio * 100).toFixed(0)}% absorption</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>Reversal Target:</span>
                  <span className="text-cyan-300 font-bold">${hoveredNode.liquiditySweep.targetReversalPrice.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* HTF Profile Callout */}
            {hoveredNode.htfProfileInfo && (
              <div className="mb-2 p-2 bg-neutral-950 rounded border border-amber-500/30 font-mono text-[11px] space-y-1">
                <div className="flex items-center justify-between text-amber-300 font-bold">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-amber-400" />
                    <span>HTF {hoveredNode.htfProfileInfo.htfTimeframe} Volume Profile</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>HTF POC:</span>
                  <span className="text-amber-400 font-bold">${hoveredNode.htfProfileInfo.poc.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>Value Area (70%):</span>
                  <span className="text-slate-200 font-semibold">${hoveredNode.htfProfileInfo.val.toFixed(2)} - ${hoveredNode.htfProfileInfo.vah.toFixed(2)}</span>
                </div>
              </div>
            )}

            {hoveredNode.liquidityDensity && (
              <div className="mb-2 p-1.5 bg-neutral-950/80 rounded border border-neutral-800 text-[10px] font-mono flex items-center justify-between">
                <span className="text-slate-400">Resting DOM:</span>
                <span className="text-amber-300 font-bold">
                  {hoveredNode.liquidityDensity.restingOz} Oz (${hoveredNode.liquidityDensity.restingUsd.toLocaleString()})
                </span>
                <span className={`px-1 rounded ${hoveredNode.liquidityDensity.wallType === 'BID_WALL' ? 'bg-emerald-500/20 text-emerald-400' : hoveredNode.liquidityDensity.wallType === 'ASK_WALL' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-400'}`}>
                  {hoveredNode.liquidityDensity.wallType.replace('_', ' ')}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1.5 border-t border-neutral-800">
              <span>Status: <strong className="text-slate-200">{hoveredNode.status}</strong></span>
              <span>Strength: <strong className="text-amber-300">★ {hoveredNode.strength}/5</strong></span>
              {hoveredNode.targetExtension && (
                <span>Target: <strong className="text-cyan-400">${hoveredNode.targetExtension.toFixed(2)}</strong></span>
              )}
            </div>
          </div>
        )}

        {/* Floating Quick Navigation & Zoom Controls Widget */}
        <div className="absolute bottom-6 right-24 z-30 flex items-center gap-1 bg-neutral-950/90 border border-neutral-800 rounded-lg p-1 shadow-2xl backdrop-blur-md text-xs font-mono">
          <button
            onClick={scrollLeft}
            className="p-1.5 rounded hover:bg-neutral-800 text-slate-300 hover:text-amber-400 transition-colors"
            title="Scroll/Pan Backward in Time (History)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={scrollRight}
            className="p-1.5 rounded hover:bg-neutral-800 text-slate-300 hover:text-amber-400 transition-colors"
            title="Scroll/Pan Forward in Time"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={zoomIn}
            className="p-1.5 rounded hover:bg-neutral-800 text-slate-300 hover:text-amber-400 transition-colors"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={zoomOut}
            className="p-1.5 rounded hover:bg-neutral-800 text-slate-300 hover:text-amber-400 transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="h-4 w-[1px] bg-neutral-800 mx-0.5" />
          <button
            onClick={resetView}
            className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-amber-300 font-semibold transition-colors text-[11px]"
            title="Reset Zoom to Real-Time Feed"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Bloomberg Auto Smart Channel Settings Modal */}
      <BloombergChannelModal
        isOpen={showBloombergChannelModal}
        onClose={() => setShowBloombergChannelModal(false)}
        config={bloombergChannelConfig}
        onUpdateConfig={(partial) => setBloombergChannelConfig(prev => ({ ...prev, ...partial }))}
        channelData={bloombergChannel}
        onTradeSignal={(side, price, sl, tp) => {
          if (onOpenOrder) {
            onOpenOrder(side, 0.1, sl, tp, price);
          }
          if (onPrefillPrice) onPrefillPrice(price);
        }}
      />
    </div>
  );
};
