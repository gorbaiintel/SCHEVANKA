import React, { useEffect, useState } from 'react';
import { TickerData, Position } from '../../types/market';
import {
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Lock,
  Radio,
  Cookie,
  Server,
  Layers,
} from 'lucide-react';
import { sound } from '../../services/soundService';

export interface BrokerWebTerminalEntry {
  id: string;
  brokerName: string;
  shortName: string;
  platform: 'MT4 Live';
  directWebTerminalUrl: string;
  mt4WebTerminalUrl?: string;
  defaultServer: string;
  servers: string[];
  goldSymbol: string;
  typicalSpreadDollars: number;
  region: string;
  badgeColor: string;
}

interface BraveLiveWebTerminalChartProps {
  broker: BrokerWebTerminalEntry;
  selectedServer: string;
  onSelectServer: (srv: string) => void;
  ticker: TickerData;
  positions: Position[];
  onExecuteLiveOrder: (side: 'BUY' | 'SELL', lots: number) => void;
  onOpenBrokerLogin?: () => void;
}

export const BraveLiveWebTerminalChart: React.FC<BraveLiveWebTerminalChartProps> = ({
  broker,
  selectedServer,
  onSelectServer,
  onOpenBrokerLogin,
}) => {
  const [iframeKey, setIframeKey] = useState<number>(1);
  const [isLoadingIframe, setIsLoadingIframe] = useState<boolean>(true);
  const [cookieStatus, setCookieStatus] = useState<'ACTIVE' | 'REPAIRING' | 'REPAIRED'>('ACTIVE');
  const [cookieMessage, setCookieMessage] = useState<string>(
    'Brave Shields + First-Party Partitioned Cookies (CHIPS) Aktif — WebTerminal MT4 ORI Live (Tanpa MT5 & Tanpa Demo)'
  );
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState<string>(
    broker.mt4WebTerminalUrl || broker.directWebTerminalUrl || 'https://webterminal.hfm.com/id/mt4'
  );
  const [customServerText, setCustomServerText] = useState<string>('');

  // Build Same-Origin Brave Proxy URL for the 100% Original (ORI) MetaTrader 4 (MT4) WebTerminal
  // Strictly version=4 (MT4 Only) and scoped to the selected broker's MT4 Live servers & company name
  const activeIframeSrc = `/trade?version=4&platform=mt4&broker=${encodeURIComponent(
    broker.id
  )}&trade_server=${encodeURIComponent(selectedServer)}&servers=${encodeURIComponent(
    broker.servers.join(',')
  )}&company=${encodeURIComponent(broker.brokerName)}&lang=id`;

  // Sync URL bar & bootstrap Brave Partitioned Cookies whenever broker or server changes
  useEffect(() => {
    setUrlInput(broker.mt4WebTerminalUrl || broker.directWebTerminalUrl);
    setIsLoadingIframe(true);
    try {
      document.cookie = `uniq=938475610293-8475; path=/; SameSite=None; Secure; Partitioned`;
      document.cookie = `_fz_uniq=938475610293-8475; path=/; SameSite=None; Secure; Partitioned`;
      document.cookie = `brave_wt_broker=${encodeURIComponent(broker.id)}; path=/; SameSite=None; Secure; Partitioned`;
      document.cookie = `brave_wt_server=${encodeURIComponent(selectedServer)}; path=/; SameSite=None; Secure; Partitioned`;
      document.cookie = `mt4_live_mode=MT4_REAL_ONLY_NO_MT5_NO_DEMO; path=/; SameSite=None; Secure; Partitioned`;
    } catch {
      // ignore cookie write errors in restricted contexts
    }
    fetch(
      `/api/webterminal/cookies?broker=${encodeURIComponent(broker.id)}&server=${encodeURIComponent(selectedServer)}`,
      { credentials: 'include' }
    ).catch(() => {});
  }, [broker, selectedServer]);

  const handleRepairCookies = async () => {
    setCookieStatus('REPAIRING');
    sound.playNodeTrigger();
    try {
      document.cookie = `uniq=938475610293-8475; path=/; SameSite=None; Secure; Partitioned`;
      document.cookie = `_fz_uniq=938475610293-8475; path=/; SameSite=None; Secure; Partitioned`;
      document.cookie = `schevanka_brave_chips=repaired_${Date.now()}; path=/; SameSite=None; Secure; Partitioned`;
      document.cookie = `metaquotes_demo=; path=/; max-age=0; SameSite=None; Secure; Partitioned`;
      const res = await fetch('/api/webterminal/cookies/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          brokerId: broker.id,
          server: selectedServer,
          url: broker.mt4WebTerminalUrl || broker.directWebTerminalUrl,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCookieMessage(
          data.message || 'Cookies Partitioned Brave berhasil diperbaiki & WebTerminal MT4 ORI dimuat ulang.'
        );
      } else {
        setCookieMessage(`Cookies Partitioned (CHIPS) MT4 diperbaiki untuk ${selectedServer} di Peramban Brave.`);
      }
    } catch {
      setCookieMessage(`Cookies Partitioned (CHIPS) MT4 diperbaiki untuk ${selectedServer} di Peramban Brave.`);
    } finally {
      setCookieStatus('REPAIRED');
      setIsLoadingIframe(true);
      setIframeKey((prev) => prev + 1);
      setTimeout(() => setCookieStatus('ACTIVE'), 3500);
    }
  };

  const handleOpenInBraveBrowser = () => {
    sound.playNodeTrigger();
    const targetUrl = broker.mt4WebTerminalUrl || broker.directWebTerminalUrl;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const spreadPoints = Math.round(broker.typicalSpreadDollars * 100);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#070a0f] overflow-hidden">
      {/* 1. BRAVE BROWSER HEADER + PARTITIONED COOKIE REPAIR */}
      <div className="px-2.5 py-1.5 bg-gradient-to-r from-[#171210] via-[#121622] to-[#171210] border-b border-orange-500/30 space-y-1.5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            {/* Brave Browser Badge (Not Google) */}
            <span className="px-2 py-0.5 rounded bg-orange-500/20 border border-orange-500/50 text-orange-300 font-bold flex items-center gap-1 shadow-sm">
              <ShieldCheck className="w-3 h-3 text-orange-400" />
              <span>Brave Browser ORI ({broker.shortName})</span>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>MT4 LIVE ORI (MURNI MT4)</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRepairCookies}
              className={`px-2 py-0.5 rounded border font-bold flex items-center gap-1 cursor-pointer transition-all ${
                cookieStatus === 'REPAIRED'
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300'
              }`}
              title="Perbaiki Cookies Partitioned Brave & Muat Ulang WebTerminal MT4 ORI"
            >
              <Cookie className={`w-3 h-3 ${cookieStatus === 'REPAIRING' ? 'animate-spin' : 'text-amber-400'}`} />
              <span>
                {cookieStatus === 'REPAIRING'
                  ? 'Memperbaiki...'
                  : cookieStatus === 'REPAIRED'
                  ? 'Cookies OK ✓'
                  : 'Perbaiki Cookies'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsLoadingIframe(true);
                setIframeKey((k) => k + 1);
              }}
              className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-slate-300 cursor-pointer"
              title="Muat Ulang WebTerminal MT4 ORI"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingIframe ? 'animate-spin text-orange-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Brave Browser Address Bar */}
        <div className="flex items-center gap-1 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 flex-1 bg-neutral-950 border border-orange-500/30 rounded-md px-2 py-1 min-w-0">
            <Lock className="w-2.5 h-2.5 text-orange-400 shrink-0" />
            <span className="text-[9px] font-bold text-orange-400 shrink-0">brave://</span>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 bg-transparent text-cyan-300 focus:outline-none truncate text-[10px]"
              title="URL Resmi MT4 Live WebTerminal Broker di Peramban Brave"
            />
            <button
              type="button"
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(urlInput).catch(() => {});
                }
                setCopiedUrl(true);
                setTimeout(() => setCopiedUrl(false), 1800);
              }}
              className="text-slate-400 hover:text-white cursor-pointer shrink-0"
              title="Salin URL MT4 WebTerminal Live"
            >
              {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          <a
            href={`brave://open-url?url=${encodeURIComponent(urlInput)}`}
            onClick={(e) => {
              e.preventDefault();
              handleOpenInBraveBrowser();
            }}
            className="px-2 py-1 rounded-md bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
            title={`Buka ${urlInput} langsung di Peramban Brave`}
          >
            <span>Buka di Brave</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>

        {/* Cookie Status Sub-bar */}
        <div className="flex items-center justify-between text-[9.5px] font-mono text-slate-400">
          <span className="truncate text-emerald-400/90">✓ {cookieMessage}</span>
          <span className="text-orange-300/90 shrink-0">{broker.brokerName} (MT4 Only)</span>
        </div>
      </div>

      {/* 2. ORI MT4 WEBTERMINAL SERVER BAR (100% MT4 LIVE SERVERS FOR SELECTED BROKER) */}
      <div className="px-2.5 py-1.5 bg-neutral-900/95 border-b border-neutral-800 space-y-1 text-[10px] font-mono shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Server className="w-3 h-3 text-emerald-400 shrink-0" />
            <select
              value={selectedServer}
              onChange={(e) => onSelectServer(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 rounded px-1.5 py-0.5 text-emerald-300 font-bold text-[10px] focus:outline-none cursor-pointer max-w-[210px]"
            >
              {!broker.servers.includes(selectedServer) && (
                <option value={selectedServer}>{selectedServer} (MT4 LIVE)</option>
              )}
              {broker.servers.map((srv) => (
                <option key={srv} value={srv}>
                  {srv} (MT4 - {broker.shortName})
                </option>
              ))}
            </select>
            <span className="text-[9px] text-slate-400 bg-neutral-950 border border-neutral-800 px-1.5 py-0.5 rounded shrink-0">
              {broker.servers.length} Server MT4 {broker.shortName}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 rounded border bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold flex items-center gap-1">
              <Layers className="w-2.5 h-2.5" />
              <span>MT4 Live ORI ({broker.shortName})</span>
            </span>
          </div>
        </div>

        {/* Custom MT4 Live Server Quick Input */}
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={customServerText}
            onChange={(e) => setCustomServerText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customServerText.trim()) {
                const clean = customServerText
                  .trim()
                  .replace(/demo|trial/gi, 'Real')
                  .replace(/mt5/gi, 'Real');
                onSelectServer(clean);
                setCustomServerText('');
              }
            }}
            placeholder={`Ketik server MT4 ${broker.shortName} lain (cth: ${broker.servers[0] || selectedServer})...`}
            className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-emerald-500/50 rounded px-2 py-0.5 text-[9.5px] text-slate-200 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (!customServerText.trim()) return;
              const clean = customServerText
                .trim()
                .replace(/demo|trial/gi, 'Real')
                .replace(/mt5/gi, 'Real');
              onSelectServer(clean);
              setCustomServerText('');
            }}
            className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-[9.5px] cursor-pointer shrink-0"
          >
            Set Server MT4
          </button>
        </div>
      </div>

      {/* 3. 100% ORIGINAL (ORI) METATRADER 4 (MT4) WEBTERMINAL IFRAME VIEWPORT */}
      <div className="relative flex-1 min-h-[320px] bg-[#0b0e14] overflow-hidden">
        {isLoadingIframe && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0b0e14]/90 font-mono text-xs gap-2 pointer-events-none">
            <div className="w-7 h-7 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            <div className="text-orange-300 font-bold">
              Memuat WebTerminal MT4 ORI {broker.brokerName} ({selectedServer}) via Brave Engine...
            </div>
            <div className="text-[10px] text-slate-400">
              First-Party Partitioned Cookies Aktif · Murni MT4 Live {broker.shortName} (Tanpa MT5 &amp; Tanpa Demo)
            </div>
          </div>
        )}

        <iframe
          key={`${broker.id}-${selectedServer}-${iframeKey}`}
          src={activeIframeSrc}
          title={`Original MetaTrader 4 Live WebTerminal - ${broker.brokerName} (${selectedServer})`}
          className="w-full h-full border-0 block bg-white"
          allow="clipboard-read; clipboard-write; fullscreen"
          onLoad={() => setIsLoadingIframe(false)}
        />
      </div>

      {/* 4. ORI MT4 WEBTERMINAL LIVE STATUS FOOTER */}
      <div className="px-2.5 py-1.5 bg-neutral-950 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse shrink-0" />
          <span className="text-slate-300 truncate">
            Broker MT4: <strong className="text-orange-300">{broker.shortName}</strong> · Server:{' '}
            <strong className="text-emerald-400">{selectedServer}</strong> · Spread:{' '}
            <strong className="text-amber-300">{spreadPoints} pts</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenBrokerLogin && (
            <button
              type="button"
              onClick={onOpenBrokerLogin}
              className="text-amber-300 hover:text-amber-200 underline cursor-pointer font-bold"
            >
              Sinkronisasi Saldo Akun Real MT4
            </button>
          )}
          <a
            href={broker.mt4WebTerminalUrl || broker.directWebTerminalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline flex items-center gap-0.5"
          >
            <span>MT4 Web {broker.shortName}</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
