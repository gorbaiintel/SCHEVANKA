import { useState, useEffect, useRef } from 'react';
import { TickerData } from '../types/market';

/**
 * requestAnimationFrame-based linear interpolation (lerp) smoothing function
 * for real-time price feed updates.
 *
 * Animates the displayed numerical price smoothly toward the target price
 * over 200ms for a jitter-free, professional high-frequency terminal feel.
 *
 * @param targetPrice Current target price received from market data feed
 * @param durationMs Animation duration in milliseconds (default: 200ms)
 * @returns Smoothly interpolated numerical price
 */
export function useSmoothPrice(targetPrice: number, durationMs: number = 200): number {
  const [displayedPrice, setDisplayedPrice] = useState<number>(targetPrice);
  const currentPriceRef = useRef<number>(targetPrice);
  const startPriceRef = useRef<number>(targetPrice);
  const targetPriceRef = useRef<number>(targetPrice);
  const startTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    // If target has not significantly changed, do nothing
    if (Math.abs(targetPrice - targetPriceRef.current) < 0.0001) {
      return;
    }

    // Cancel existing animation frame before starting a new transition
    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    startPriceRef.current = currentPriceRef.current;
    targetPriceRef.current = targetPrice;
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(1, Math.max(0, elapsed / durationMs));

      // Linear interpolation (lerp): start + (target - start) * progress
      const interpolatedPrice = startPriceRef.current + (targetPriceRef.current - startPriceRef.current) * progress;

      currentPriceRef.current = interpolatedPrice;
      setDisplayedPrice(interpolatedPrice);

      if (progress < 1) {
        animFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        currentPriceRef.current = targetPriceRef.current;
        setDisplayedPrice(targetPriceRef.current);
        animFrameIdRef.current = null;
      }
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [targetPrice, durationMs]);

  return displayedPrice;
}

/**
 * requestAnimationFrame-based smoothing hook for complete TickerData feed.
 * Synchronously lerps price, bid, and ask concurrently over 200ms
 * in a single high-performance animation frame loop.
 *
 * @param ticker Target ticker from marketService
 * @param durationMs Animation duration in milliseconds (default: 200ms)
 * @returns Smoothly interpolated TickerData object
 */
export function useSmoothTicker(ticker: TickerData, durationMs: number = 200): TickerData {
  const [displayedTicker, setDisplayedTicker] = useState<TickerData>(ticker);

  const currentRef = useRef<{ price: number; bid: number; ask: number }>({
    price: ticker.price,
    bid: ticker.bid,
    ask: ticker.ask,
  });

  const startRef = useRef<{ price: number; bid: number; ask: number }>({
    price: ticker.price,
    bid: ticker.bid,
    ask: ticker.ask,
  });

  const targetRef = useRef<{ price: number; bid: number; ask: number }>({
    price: ticker.price,
    bid: ticker.bid,
    ask: ticker.ask,
  });

  const startTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const hasPriceChanged = Math.abs(ticker.price - targetRef.current.price) >= 0.001;
    const hasBidChanged = Math.abs(ticker.bid - targetRef.current.bid) >= 0.001;
    const hasAskChanged = Math.abs(ticker.ask - targetRef.current.ask) >= 0.001;

    if (!hasPriceChanged && !hasBidChanged && !hasAskChanged) {
      // Still update static metadata like 24h high/low/volume if needed
      setDisplayedTicker(prev => ({
        ...prev,
        ...ticker,
        price: currentRef.current.price,
        bid: currentRef.current.bid,
        ask: currentRef.current.ask,
      }));
      return;
    }

    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    startRef.current = { ...currentRef.current };
    targetRef.current = {
      price: ticker.price,
      bid: ticker.bid,
      ask: ticker.ask,
    };
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(1, Math.max(0, elapsed / durationMs));

      // Linear interpolation (lerp)
      const lerpedPrice = startRef.current.price + (targetRef.current.price - startRef.current.price) * progress;
      const lerpedBid = startRef.current.bid + (targetRef.current.bid - startRef.current.bid) * progress;
      const lerpedAsk = startRef.current.ask + (targetRef.current.ask - startRef.current.ask) * progress;

      currentRef.current = {
        price: lerpedPrice,
        bid: lerpedBid,
        ask: lerpedAsk,
      };

      // Recalculate 24h change dynamically relative to baseline 24h open
      const baseOpen = ticker.price - ticker.change24h;
      const interpolatedChange = baseOpen > 0 ? +(lerpedPrice - baseOpen).toFixed(2) : ticker.change24h;
      const interpolatedChangePct = baseOpen > 0 ? +((interpolatedChange / baseOpen) * 100).toFixed(2) : ticker.change24hPercent;

      setDisplayedTicker({
        ...ticker,
        price: lerpedPrice,
        bid: lerpedBid,
        ask: lerpedAsk,
        change24h: interpolatedChange,
        change24hPercent: interpolatedChangePct,
      });

      if (progress < 1) {
        animFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        currentRef.current = { ...targetRef.current };
        setDisplayedTicker({
          ...ticker,
          price: targetRef.current.price,
          bid: targetRef.current.bid,
          ask: targetRef.current.ask,
        });
        animFrameIdRef.current = null;
      }
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [ticker, durationMs]);

  return displayedTicker;
}
