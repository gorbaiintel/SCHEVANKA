import { Candle, PriceNode } from '../types/market';

export interface FibLevelDef {
  level: number;
  ratio: number;
  label: string;
  name: string;
  color: string;
  bgColor: string;
  isKeyZone?: boolean; // 0.5 to 0.618 Golden Pocket
}

export const FIBONACCI_LEVELS: FibLevelDef[] = [
  { level: 0.0, ratio: 0.0, label: '0.0%', name: 'Target', color: '#94a3b8', bgColor: 'rgba(148, 163, 184, 0.05)' },
  { level: 0.236, ratio: 0.236, label: '23.6%', name: 'Shallow', color: '#38bdf8', bgColor: 'rgba(56, 189, 248, 0.08)' },
  { level: 0.382, ratio: 0.382, label: '38.2%', name: 'Pullback', color: '#34d399', bgColor: 'rgba(52, 211, 153, 0.09)' },
  { level: 0.5, ratio: 0.5, label: '50.0%', name: 'Equilibrium (EQ)', color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.14)', isKeyZone: true },
  { level: 0.618, ratio: 0.618, label: '61.8%', name: 'Golden Pocket (OTE)', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.18)', isKeyZone: true },
  { level: 0.786, ratio: 0.786, label: '78.6%', name: 'Deep Retrace', color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.09)' },
  { level: 1.0, ratio: 1.0, label: '100.0%', name: 'Origin', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.06)' },
  { level: 1.272, ratio: 1.272, label: '127.2%', name: 'Extension 1', color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.06)' },
  { level: 1.618, ratio: 1.618, label: '161.8%', name: 'Golden Target', color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.08)' },
];

export interface FibDrawingState {
  startX: number;
  startY: number;
  startPrice: number;
  startTime: number;
  currentX: number;
  currentY: number;
  currentPrice: number;
  currentTime: number;
  isComplete: boolean;
  snappedStartNodeId?: string;
  snappedEndNodeId?: string;
}

export interface CalculatedFibLevel {
  level: number;
  label: string;
  name: string;
  price: number;
  color: string;
  bgColor: string;
  isKeyZone?: boolean;
}

/**
 * Calculates price values for all standard Fibonacci ratios
 */
export function calculateFibLevels(startPrice: number, endPrice: number): CalculatedFibLevel[] {
  const delta = endPrice - startPrice;

  return FIBONACCI_LEVELS.map(def => {
    const price = +(startPrice + def.ratio * delta).toFixed(2);
    return {
      level: def.level,
      label: def.label,
      name: def.name,
      price,
      color: def.color,
      bgColor: def.bgColor,
      isKeyZone: def.isKeyZone,
    };
  });
}

/**
 * Automatically finds the most prominent Swing High and Swing Low in visible structural nodes
 * to instantly snap the Fibonacci Retracement tool.
 */
export function autoFindBestFibNodes(
  nodes: PriceNode[],
  visibleCandles: Candle[]
): { highNode: PriceNode; lowNode: PriceNode } | null {
  if (nodes.length < 2 || visibleCandles.length === 0) return null;

  const minTime = visibleCandles[0].time;
  const maxTime = visibleCandles[visibleCandles.length - 1].time;

  const visibleNodes = nodes.filter(n => n.time >= minTime && n.time <= maxTime);
  if (visibleNodes.length < 2) return null;

  // Find swing highs and swing lows
  const highNodes = visibleNodes.filter(n => 
    n.type === 'SWING_HIGH' || n.type === 'EQH' || n.swingType === 'HH' || n.swingType === 'LH'
  );
  const lowNodes = visibleNodes.filter(n => 
    n.type === 'SWING_LOW' || n.type === 'EQL' || n.swingType === 'LL' || n.swingType === 'HL'
  );

  let highNode: PriceNode | undefined = highNodes.sort((a, b) => b.price - a.price)[0];
  let lowNode: PriceNode | undefined = lowNodes.sort((a, b) => a.price - b.price)[0];

  // Fallback to highest and lowest nodes overall
  if (!highNode) {
    highNode = [...visibleNodes].sort((a, b) => b.price - a.price)[0];
  }
  if (!lowNode) {
    lowNode = [...visibleNodes].sort((a, b) => a.price - b.price)[0];
  }

  if (highNode && lowNode && highNode.id !== lowNode.id) {
    return { highNode, lowNode };
  }

  return null;
}
