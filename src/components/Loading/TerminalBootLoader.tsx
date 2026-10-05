import React, { useEffect, useRef, useState } from 'react';
import { MarketBootState } from '../../services/marketData';
import goldenDragonLogo from '../../assets/images/golden_dragon_logo_1791111763665.jpg';

interface TerminalBootLoaderProps {
  bootState: MarketBootState;
  onFinishBoot: () => void;
}

export const TerminalBootLoader: React.FC<TerminalBootLoaderProps> = ({
  bootState,
  onFinishBoot,
}) => {
  const [displayProgress, setDisplayProgress] = useState<number>(0);
  const [isEntered, setIsEntered] = useState<boolean>(false);
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(true);
  const [isExiting, setIsExiting] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const medallionRef = useRef<HTMLDivElement | null>(null);
  const sheenRef = useRef<HTMLDivElement | null>(null);
  const targetMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const smoothMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Trigger smooth entrance on mount
  useEffect(() => {
    const enterFrame = window.requestAnimationFrame(() => {
      setIsEntered(true);
    });
    return () => window.cancelAnimationFrame(enterFrame);
  }, []);

  // Smoothly interpolate progress bar towards actual bootState.progress using rAF-like cadence
  useEffect(() => {
    const interval = window.setInterval(() => {
      setDisplayProgress((prev) => {
        const target = bootState.isReady ? 100 : Math.max(prev, bootState.progress);
        if (prev >= target) return target;
        const delta = target - prev;
        const step = Math.max(0.8, delta * 0.14);
        return Math.min(100, +(prev + step).toFixed(1));
      });
    }, 24);

    return () => clearInterval(interval);
  }, [bootState.progress, bootState.isReady]);

  // Trigger silky exit dissolve once progress hits 100% and market service is ready
  useEffect(() => {
    if (bootState.isReady && displayProgress >= 99.5 && !isExiting) {
      const exitTimer = window.setTimeout(() => {
        setIsExiting(true);
      }, 320);
      const unmountTimer = window.setTimeout(() => {
        onFinishBoot();
      }, 1250);
      return () => {
        clearTimeout(exitTimer);
        clearTimeout(unmountTimer);
      };
    }
  }, [bootState.isReady, displayProgress, isExiting, onFinishBoot]);

  // Fallback safety timeout so boot screen never hangs
  useEffect(() => {
    const safetyTimer = window.setTimeout(() => {
      setIsExiting(true);
      window.setTimeout(onFinishBoot, 900);
    }, 4200);
    return () => clearTimeout(safetyTimer);
  }, [onFinishBoot]);

  // Real-time 60FPS 3D Gyroscopic Gold Rings, Smooth Lerp Medallion Floating, & Gold Particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 400;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const fov = 480;

    type Vec3 = [number, number, number];

    const rotateX = (p: Vec3, a: number): Vec3 => {
      const c = Math.cos(a);
      const s = Math.sin(a);
      return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
    };

    const rotateY = (p: Vec3, a: number): Vec3 => {
      const c = Math.cos(a);
      const s = Math.sin(a);
      return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
    };

    const rotateZ = (p: Vec3, a: number): Vec3 => {
      const c = Math.cos(a);
      const s = Math.sin(a);
      return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
    };

    const project = (p: Vec3): { x: number; y: number; scale: number; z: number } => {
      const scale = fov / (fov + p[2] + 250);
      return {
        x: cx + p[0] * scale,
        y: cy + p[1] * scale,
        scale,
        z: p[2],
      };
    };

    const particles = Array.from({ length: 36 }, (_, i) => ({
      angle: (i / 36) * Math.PI * 2,
      radius: 120 + (i % 6) * 12,
      yOffset: ((i % 7) - 3) * 16,
      speed: 0.006 + (i % 4) * 0.003,
      size: 1.2 + (i % 3) * 0.8,
    }));

    const drawGyroRing = (
      radius: number,
      rx: number,
      ry: number,
      rz: number,
      thickness: number,
      accentAlpha: number
    ) => {
      const segments = 80;
      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;

        let p1: Vec3 = [Math.cos(a1) * radius, 0, Math.sin(a1) * radius];
        let p2: Vec3 = [Math.cos(a2) * radius, 0, Math.sin(a2) * radius];

        p1 = rotateZ(rotateY(rotateX(p1, rx), ry), rz);
        p2 = rotateZ(rotateY(rotateX(p2, rx), ry), rz);

        const proj1 = project(p1);
        const proj2 = project(p2);

        const depthFactor = Math.max(0.14, Math.min(1, (165 - p1[2]) / 290));
        ctx.beginPath();
        ctx.moveTo(proj1.x, proj1.y);
        ctx.lineTo(proj2.x, proj2.y);
        ctx.lineWidth = thickness * proj1.scale;
        ctx.strokeStyle = `rgba(251, 191, 36, ${(depthFactor * accentAlpha).toFixed(3)})`;
        ctx.stroke();
      }
    };

    let t = 0;

    const render = () => {
      t += 0.016;
      ctx.clearRect(0, 0, size, size);

      // Exponential smoothing (lerp) for silky pointer tracking + autonomous breathing motion
      const autoSwayX = Math.cos(t * 0.85) * 0.22;
      const autoSwayY = Math.sin(t * 0.65) * 0.22;
      const targetX = targetMouseRef.current.x + autoSwayX;
      const targetY = targetMouseRef.current.y + autoSwayY;

      smoothMouseRef.current.x += (targetX - smoothMouseRef.current.x) * 0.065;
      smoothMouseRef.current.y += (targetY - smoothMouseRef.current.y) * 0.065;

      const sx = smoothMouseRef.current.x;
      const sy = smoothMouseRef.current.y;

      // Apply smooth 60FPS 3D transform directly to the Dragon Medallion DOM node
      if (medallionRef.current) {
        const rxDeg = (-sy * 11).toFixed(2);
        const ryDeg = (sx * 11).toFixed(2);
        const floatY = (Math.sin(t * 1.1) * 5).toFixed(2);
        medallionRef.current.style.transform = `perspective(1000px) translate3d(0px, ${floatY}px, 18px) rotateX(${rxDeg}deg) rotateY(${ryDeg}deg)`;
      }

      if (sheenRef.current) {
        const sheenX = 50 + sx * 28;
        const sheenY = 38 + sy * 28;
        sheenRef.current.style.background = `radial-gradient(circle at ${sheenX.toFixed(1)}% ${sheenY.toFixed(1)}%, rgba(254, 243, 199, 0.24) 0%, rgba(245, 158, 11, 0.06) 42%, rgba(6, 8, 13, 0.85) 88%, #06080d 100%)`;
      }

      const tiltX = sy * 0.28;
      const tiltY = sx * 0.28;

      // Ambient Volumetric Gold Dragon Halo
      const halo = ctx.createRadialGradient(cx, cy, 20, cx, cy, 185);
      halo.addColorStop(0, 'rgba(251, 191, 36, 0.26)');
      halo.addColorStop(0.48, 'rgba(217, 119, 6, 0.09)');
      halo.addColorStop(1, 'rgba(6, 8, 13, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, 185, 0, Math.PI * 2);
      ctx.fill();

      // 3D Outer & Inner Gyroscopic Rings framing the Dragon Head
      drawGyroRing(158, 1.12 + Math.sin(t * 0.55) * 0.28 + tiltX, t * 0.45 + tiltY, t * 0.22, 2.1, 0.78);
      drawGyroRing(138, -0.92 + Math.cos(t * 0.65) * 0.32 + tiltX, -t * 0.65 + tiltY, -t * 0.34, 1.6, 0.62);
      drawGyroRing(120, Math.sin(t * 0.75) * 0.75 + tiltX, t * 0.85 + tiltY, 0.5, 1.2, 0.46);

      // Orbiting 3D Molten Gold Ember Particles
      for (const pt of particles) {
        const ang = pt.angle + t * (pt.speed * 38);
        let pos: Vec3 = [
          Math.cos(ang) * pt.radius,
          pt.yOffset + Math.sin(ang * 2) * 9,
          Math.sin(ang) * pt.radius,
        ];
        pos = rotateX(pos, 0.3 + tiltX * 0.45);
        const proj = project(pos);
        const alpha = Math.max(0.15, Math.min(0.9, (170 - pos[2]) / 290));

        ctx.beginPath();
        ctx.arc(proj.x, proj.y, pt.size * proj.scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(253, 224, 71, ${alpha.toFixed(2)})`;
        ctx.fill();
      }

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    targetMouseRef.current = { x: nx, y: ny };
  };

  const handlePointerLeave = () => {
    targetMouseRef.current = { x: 0, y: 0 };
  };

  const roundedProgress = Math.round(displayProgress);

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={() => {
        if (!isExiting) {
          setIsExiting(true);
          window.setTimeout(onFinishBoot, 850);
        }
      }}
      style={{
        transition:
          'opacity 900ms cubic-bezier(0.22, 1, 0.36, 1), transform 950ms cubic-bezier(0.22, 1, 0.36, 1), filter 900ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#06080d]/95 backdrop-blur-xl text-slate-100 select-none overflow-hidden cursor-pointer ${
        isExiting
          ? 'opacity-0 scale-[1.06] blur-md pointer-events-none'
          : isEntered
          ? 'opacity-100 scale-100 blur-0'
          : 'opacity-0 scale-[0.94] blur-sm'
      }`}
    >
      {/* Soft Volumetric Studio Lighting Backdrop */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(245, 158, 11, 0.15) 0%, rgba(180, 83, 9, 0.05) 38%, rgba(6, 8, 13, 0.98) 72%)',
        }}
      />

      {/* Interactive 3D Golden Dragon Head Centerpiece with Silky Entrance */}
      <div
        style={{
          transition:
            'opacity 950ms cubic-bezier(0.16, 1, 0.3, 1), transform 1000ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`relative z-10 flex flex-col items-center justify-center ${
          isEntered && isImageLoaded
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-3 scale-90'
        }`}
      >
        <div className="relative w-[330px] h-[330px] sm:w-[400px] sm:h-[400px] flex items-center justify-center">
          {/* 3D Orbital Gyroscopic Gold Rings Canvas */}
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 w-full h-full z-20"
          />

          {/* 3D Sculpted 24K Golden Dragon Head Medallion with Seamless Feathered Overlay */}
          <div
            ref={medallionRef}
            className="relative z-10 w-52 h-52 sm:w-60 sm:h-60 rounded-full flex items-center justify-center will-change-transform"
            style={{
              boxShadow:
                '0 0 70px rgba(245, 158, 11, 0.32), inset 0 0 32px rgba(251, 191, 36, 0.25)',
            }}
          >
            <div className="relative w-full h-full rounded-full overflow-hidden bg-[#06080d] flex items-center justify-center">
              <img
                src={goldenDragonLogo}
                alt="Schevanka 3D Golden Dragon Logo"
                referrerPolicy="no-referrer"
                onLoad={() => setIsImageLoaded(true)}
                onError={() => setIsImageLoaded(true)}
                className="w-full h-full object-cover scale-[1.12] contrast-110 brightness-105 select-none pointer-events-none transition-transform duration-1000 ease-out"
              />

              {/* Seamless Radial Feathering & Dynamic Specular Sheen Overlay */}
              <div
                ref={sheenRef}
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle at 50% 42%, rgba(254, 243, 199, 0.18) 0%, rgba(245, 158, 11, 0.05) 45%, rgba(6, 8, 13, 0.86) 86%, #06080d 100%)',
                }}
              />

              {/* Delicate Golden Inner Halo Ring */}
              <div className="pointer-events-none absolute inset-[3px] rounded-full border border-amber-400/35 shadow-[inset_0_0_24px_rgba(6,8,13,0.95)]" />
            </div>
          </div>
        </div>

        {/* Clean Brand Wordmark & Minimal 3D Gold Progress Bar */}
        <div className="mt-1 flex flex-col items-center gap-3 w-56 sm:w-64">
          <div className="flex items-center justify-between w-full px-0.5">
            <span className="font-mono text-xs tracking-[0.34em] font-semibold text-amber-300/95">
              SCHEVANKA
            </span>
            <span className="font-mono text-xs font-bold text-amber-400 tabular-nums">
              {roundedProgress}%
            </span>
          </div>

          <div className="h-1.5 w-full bg-neutral-900/90 rounded-full overflow-hidden border border-amber-500/30 p-[1px] shadow-[0_0_20px_rgba(245,158,11,0.22)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-200 transition-all duration-150 ease-out"
              style={{
                width: `${displayProgress}%`,
                boxShadow: '0 0 12px rgba(251, 191, 36, 0.85)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};



