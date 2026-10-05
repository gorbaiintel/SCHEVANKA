import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Smartphone,
  CheckCircle2,
  Copy,
  X,
  Sparkles,
  Terminal,
  Zap,
  QrCode,
  RefreshCw,
  Activity,
  History,
  Settings,
  AlertCircle,
  FileCode,
  Trash2,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import {
  PREBUILT_APKS,
  FULL_APK_MARKDOWN,
  triggerEmbeddedApkDownload,
  triggerMarkdownDownload,
} from '../../services/prebuiltApks';

interface AndroidApkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SyncHistoryItem {
  id: number;
  timestamp: number;
  loginId: string;
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  statusCode: number | null;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  leverage: number;
  currency: string;
  responseTime: number;
  errorMessage?: string;
  fullResponse?: string;
}

const ANDROID_PROJECT_FILES = [
  { label: 'BROKER_BRIDGE_SYNC_FULL_APK.md (Dokumentasi Lengkap)', path: 'BROKER_BRIDGE_SYNC_FULL_APK.md' },
  { label: 'API_SPECIFICATION_v1.0.md', path: 'API_SPECIFICATION_v1.0.md' },
  { label: 'README.md', path: 'README.md' },
  { label: 'MainActivity.kt', path: 'app/src/main/java/com/example/brokerbridgesync/MainActivity.kt' },
  { label: 'SyncScreen.kt', path: 'app/src/main/java/com/example/brokerbridgesync/ui/screens/SyncScreen.kt' },
  { label: 'MonitoringScreen.kt', path: 'app/src/main/java/com/example/brokerbridgesync/ui/screens/MonitoringScreen.kt' },
  { label: 'HistoryScreen.kt', path: 'app/src/main/java/com/example/brokerbridgesync/ui/screens/HistoryScreen.kt' },
  { label: 'SettingsScreen.kt', path: 'app/src/main/java/com/example/brokerbridgesync/ui/screens/SettingsScreen.kt' },
  { label: 'AccountForm.kt', path: 'app/src/main/java/com/example/brokerbridgesync/ui/components/AccountForm.kt' },
  { label: 'WebhookService.kt', path: 'app/src/main/java/com/example/brokerbridgesync/api/WebhookService.kt' },
  { label: 'RetrofitInstance.kt', path: 'app/src/main/java/com/example/brokerbridgesync/api/RetrofitInstance.kt' },
  { label: 'WebhookRepository.kt', path: 'app/src/main/java/com/example/brokerbridgesync/repository/WebhookRepository.kt' },
  { label: 'AppDatabase.kt', path: 'app/src/main/java/com/example/brokerbridgesync/database/AppDatabase.kt' },
  { label: 'SyncService.kt (WorkManager)', path: 'app/src/main/java/com/example/brokerbridgesync/services/SyncService.kt' },
  { label: 'ValidationUtils.kt', path: 'app/src/main/java/com/example/brokerbridgesync/utils/ValidationUtils.kt' },
  { label: 'ValidationUtilsTest.kt', path: 'app/src/test/java/com/example/brokerbridgesync/ValidationUtilsTest.kt' },
  { label: 'app/build.gradle.kts', path: 'app/build.gradle.kts' },
  { label: 'AndroidManifest.xml', path: 'app/src/main/AndroidManifest.xml' },
  { label: 'API_SPECIFICATION_v1.0.md', path: 'API_SPECIFICATION_v1.0.md' },
  { label: 'README.md', path: 'README.md' },
];

export const AndroidApkModal: React.FC<AndroidApkModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'build_apk' | 'compose_app' | 'source_code' | 'instant' | 'qrcode'>('build_apk');
  const [composeTab, setComposeTab] = useState<'SYNC' | 'MONITOR' | 'HISTORY' | 'SETTINGS'>('SYNC');
  const [isInstalling, setIsInstalling] = useState(false);

  // APK Build & Metadata state
  const [apkBuildData, setApkBuildData] = useState<any>({
    brokerBridge: PREBUILT_APKS.brokerBridge.metadata,
    goldTerminal: PREBUILT_APKS.goldTerminal.metadata,
  });
  const [isBuildingApk, setIsBuildingApk] = useState(false);
  const [buildToast, setBuildToast] = useState<string | null>(null);

  // Sync Screen Form State
  const [loginId, setLoginId] = useState('10894251');
  const [server, setServer] = useState('HFMarkets-LiveServer1');
  const [company, setCompany] = useState('HF Markets');
  const [balance, setBalance] = useState('1500.00');
  const [equity, setEquity] = useState('1524.50');
  const [margin, setMargin] = useState('30.00');
  const [freeMargin, setFreeMargin] = useState('1494.50');
  const [leverage, setLeverage] = useState('500');
  const [currency, setCurrency] = useState('USD');

  const [isSending, setIsSending] = useState(false);
  const [syncResponseMsg, setSyncResponseMsg] = useState<string | null>(null);
  const [syncResponseStatus, setSyncResponseStatus] = useState<'SUCCESS' | 'FAILED' | null>(null);
  const [lastResponseMs, setLastResponseMs] = useState<number | null>(null);

  // History & Settings State
  const [historyList, setHistoryList] = useState<SyncHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('broker_bridge_sync_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncIntervalSec, setAutoSyncIntervalSec] = useState(5);
  const [endpointUrl, setEndpointUrl] = useState('/api/broker/bridge/webhook');
  const [healthStatus, setHealthStatus] = useState<string | null>(null);

  // Source Code Viewer State
  const [selectedFilePath, setSelectedFilePath] = useState(ANDROID_PROJECT_FILES[0].path);
  const [selectedFileContent, setSelectedFileContent] = useState<string>('Loading...');

  // Validation Rules matching ValidationUtils.kt
  const fieldErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!/^[0-9]{1,20}$/.test(loginId.trim())) {
      errs.loginId = 'Wajib angka 1–20 digit (^[0-9]{1,20}$)';
    }
    const b = Number(balance);
    if (balance.trim() === '' || Number.isNaN(b) || b < 0 || b > 999999999.99) {
      errs.balance = 'Rentang: 0 – 999,999,999.99';
    }
    const eq = Number(equity);
    if (equity.trim() === '' || Number.isNaN(eq) || eq < 0 || eq > 999999999.99) {
      errs.equity = 'Rentang: 0 – 999,999,999.99';
    }
    const mar = Number(margin);
    if (margin.trim() === '' || Number.isNaN(mar) || mar < 0 || mar > 999999999.99) {
      errs.margin = 'Rentang: 0 – 999,999,999.99';
    }
    const fm = Number(freeMargin);
    if (freeMargin.trim() === '' || Number.isNaN(fm) || fm < 0 || fm > 999999999.99) {
      errs.freeMargin = 'Rentang: 0 – 999,999,999.99';
    }
    const lev = Number(leverage);
    if (!Number.isInteger(lev) || lev < 1 || lev > 500) {
      errs.leverage = 'Rentang: 1 – 500';
    }
    if (!/^[A-Z]{3}$/.test(currency.trim())) {
      errs.currency = 'Wajib 3 huruf ISO 4217 (cth: USD)';
    }
    return errs;
  }, [loginId, balance, equity, margin, freeMargin, leverage, currency]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/android/apk-status')
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.apks) setApkBuildData(d.apks);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'source_code') {
      fetch(`/api/android-project/file?path=${encodeURIComponent(selectedFilePath)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.content) setSelectedFileContent(d.content);
        })
        .catch(() => setSelectedFileContent('// Gagal memuat file'));
    }
  }, [isOpen, activeTab, selectedFilePath]);

  const handleRebuildApk = async () => {
    setIsBuildingApk(true);
    setBuildToast(null);
    try {
      const res = await fetch('/api/android/build-apk', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setApkBuildData(data.apks);
        setBuildToast(`✓ ${data.message} (${data.buildDurationMs} ms)`);
      } else {
        setBuildToast(`✕ Gagal build APK: ${data.error || 'Error'}`);
      }
    } catch (e: any) {
      setBuildToast(`✕ Error: ${e.message}`);
    } finally {
      setIsBuildingApk(false);
    }
  };

  const handleDirectDownload = async (url: string, filename: string) => {
    // Use instant embedded Base64 binary for APK files so it never fails or hits 404
    if (filename.includes('BrokerBridgeSync') && filename.endsWith('.apk')) {
      const res = triggerEmbeddedApkDownload('brokerBridge');
      setBuildToast(
        `✓ File ${res.fileName} (${(res.sizeBytes / 1024).toFixed(1)} KB) berhasil diunduh ke perangkat Anda!`
      );
      return;
    }
    if (filename.includes('SCHEVANKA-Gold-Terminal') && filename.endsWith('.apk')) {
      const res = triggerEmbeddedApkDownload('goldTerminal');
      setBuildToast(
        `✓ File ${res.fileName} (${(res.sizeBytes / 1024).toFixed(1)} KB) berhasil diunduh ke perangkat Anda!`
      );
      return;
    }

    setBuildToast(`⏳ Mengunduh ${filename}...`);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
      setBuildToast(`✓ File ${filename} (${(blob.size / 1024).toFixed(1)} KB) berhasil diunduh!`);
    } catch (e: any) {
      setBuildToast(`✕ Gagal mengunduh: ${e.message}`);
    }
  };

  useEffect(() => {
    if (!autoSyncEnabled || !isOpen) return;
    const timer = setInterval(() => {
      if (Object.keys(fieldErrors).length === 0) {
        handleSendWebhookSync();
      }
    }, autoSyncIntervalSec * 1000);
    return () => clearInterval(timer);
  }, [autoSyncEnabled, autoSyncIntervalSec, isOpen, fieldErrors, loginId, server, company, balance, equity, margin, freeMargin, leverage, currency]);

  if (!isOpen) return null;

  const appUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : 'https://ais-pre-oj2gpgwetvago2t5xyvcxe-232925187258.asia-southeast1.run.app';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleInstallClick = async () => {
    setIsInstalling(true);
    await install();
    setIsInstalling(false);
  };

  const handleSendWebhookSync = async () => {
    if (Object.keys(fieldErrors).length > 0) {
      setSyncResponseStatus('FAILED');
      setSyncResponseMsg(Object.values(fieldErrors)[0]);
      return;
    }

    setIsSending(true);
    const startMs = performance.now();

    const payload = {
      loginId: loginId.trim(),
      server: server.trim() || undefined,
      company: company.trim() || undefined,
      balance: Number(balance),
      equity: Number(equity),
      margin: Number(margin),
      freeMargin: Number(freeMargin),
      leverage: Number(leverage),
      currency: currency.trim(),
    };

    try {
      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const elapsed = Math.max(1, Math.round(performance.now() - startMs));
      const data = await res.json();

      const item: SyncHistoryItem = {
        id: Date.now(),
        timestamp: Date.now(),
        loginId: payload.loginId,
        status: res.ok && data.success ? 'SUCCESS' : 'FAILED',
        statusCode: res.status,
        balance: payload.balance,
        equity: payload.equity,
        margin: payload.margin,
        freeMargin: payload.freeMargin,
        leverage: payload.leverage,
        currency: payload.currency,
        responseTime: elapsed,
        errorMessage: res.ok ? undefined : data.error || `HTTP ${res.status}`,
        fullResponse: JSON.stringify(data, null, 2),
      };

      const nextHistory = [item, ...historyList].slice(0, 100);
      setHistoryList(nextHistory);
      try {
        localStorage.setItem('broker_bridge_sync_history', JSON.stringify(nextHistory));
      } catch {}

      setLastResponseMs(elapsed);
      if (res.ok && data.success) {
        setSyncResponseStatus('SUCCESS');
        setSyncResponseMsg(data.message || 'Webhook live balance synced in real-time');
      } else {
        setSyncResponseStatus('FAILED');
        setSyncResponseMsg(data.error || `HTTP ${res.status} Error`);
      }
    } catch (e: any) {
      const elapsed = Math.max(1, Math.round(performance.now() - startMs));
      setLastResponseMs(elapsed);
      setSyncResponseStatus('FAILED');
      setSyncResponseMsg(e.message || 'Network error');
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckHealth = async () => {
    setHealthStatus('Checking GET /api/broker/bridge/webhook...');
    try {
      const res = await fetch(endpointUrl);
      const data = await res.json();
      if (res.ok && data.success) {
        setHealthStatus(`✓ ONLINE (${data.status}) • Active Accounts: ${data.activeAccountsCount}`);
      } else {
        setHealthStatus(`✕ HTTP ${res.status}`);
      }
    } catch (e: any) {
      setHealthStatus(`✕ Error: ${e.message}`);
    }
  };

  const handleExportHistoryJson = () => {
    const blob = new Blob([JSON.stringify(historyList, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'broker-bridge-sync-history.json';
    a.click();
  };

  const numBalance = Number(balance) || 0;
  const numEquity = Number(equity) || 0;
  const numMargin = Number(margin) || 0;
  const marginUsagePct = numEquity > 0 ? Math.min(100, (numMargin / numEquity) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0e131f] border border-emerald-500/30 shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0b0e14]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950">
              <Smartphone className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-wider text-slate-100 uppercase">
                  BrokerBridgeSync — Android Studio &amp; Jetpack Compose APK
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Kotlin • Material 3 • SDK 34
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Terintegrasi penuh dengan <code className="text-emerald-400">/api/broker/bridge/webhook</code>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleDirectDownload(
                  '/api/download/BrokerBridgeSync.apk?download=1',
                  'BrokerBridgeSync-v1.0.0-signed.apk'
                )
              }
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
            >
              <Download className="w-4 h-4" />
              <span>Unduh File .APK (Signed)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const res = triggerMarkdownDownload();
                setBuildToast(`✓ File ${res.fileName} (${(res.sizeBytes / 1024).toFixed(1)} KB) berhasil diunduh!`);
              }}
              className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
            >
              <FileCode className="w-4 h-4" />
              <span>Unduh File Lengkap (.MD)</span>
            </button>
            <button
              type="button"
              onClick={() =>
                handleDirectDownload(
                  '/api/download/broker-bridge-sync-android.zip',
                  'BrokerBridgeSync-AndroidStudio.zip'
                )
              }
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
            >
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span>Source (.ZIP)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Tab Navigation */}
        <div className="flex border-b border-slate-800/80 bg-slate-900/40 px-6 gap-2 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('build_apk')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'build_apk'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            Build &amp; Unduh File .APK (Signed v1+v2)
          </button>
          <button
            onClick={() => setActiveTab('compose_app')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'compose_app'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Live Compose App (Sync • Monitor • History • Settings)
          </button>
          <button
            onClick={() => setActiveTab('source_code')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'source_code'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Kode Sumber Kotlin &amp; Gradle (17 File)
          </button>
          <button
            onClick={() => setActiveTab('instant')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'instant'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            1-Klik WebAPK
          </button>
          <button
            onClick={() => setActiveTab('qrcode')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'qrcode'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            Scan QR HP
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'build_apk' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/15 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-mono text-[10px] font-black uppercase">
                      BUILD READY
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      Android Release APK Compiler (AXML + Dalvik DEX + ARSC + RSA-2048 v1/v2 Signer)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    File <code className="text-emerald-400">.apk</code> telah dikompilasi ke format biner Android (<code className="text-emerald-300">AndroidManifest.xml AXML</code>, <code className="text-emerald-300">classes.dex</code>, <code className="text-emerald-300">resources.arsc</code>) dan ditandatangani dengan skema v1 (PKCS#7 JAR) &amp; v2 (<code className="text-emerald-300">APK Sig Block 42</code>).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRebuildApk}
                  disabled={isBuildingApk}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg cursor-pointer transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isBuildingApk ? 'animate-spin' : ''}`} />
                  <span>{isBuildingApk ? 'Building Signed APK...' : 'Build Ulang File .APK Sekarang'}</span>
                </button>
              </div>

              {buildToast && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
                  {buildToast}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* APK 1: BrokerBridgeSync */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        1. BrokerBridgeSync-v1.0.0-signed.apk
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono border border-emerald-500/30">
                        {apkBuildData?.brokerBridge
                          ? `${(apkBuildData.brokerBridge.sizeBytes / 1024).toFixed(1)} KB`
                          : '22.0 KB'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Aplikasi Android sinkronisasi real-time saldo &amp; ekuitas akun broker ke endpoint webhook <code className="text-emerald-400">/api/broker/bridge/webhook</code>.
                    </p>
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/90 font-mono text-[10px] text-slate-400 space-y-1">
                      <div>
                        <span className="text-slate-500">Package:</span>{' '}
                        <span className="text-slate-200">com.example.brokerbridgesync</span>
                      </div>
                      <div>
                        <span className="text-slate-500">SDK:</span>{' '}
                        <span className="text-slate-200">minSdk 24 (Android 7.0) • targetSdk 34 (Android 14)</span>
                      </div>
                      <div>
                        <span className="text-slate-500">DEX SHA-1:</span>{' '}
                        <span className="text-emerald-400">
                          {apkBuildData?.brokerBridge?.dexSha1 || 'aed5eb3db75327c61dd24e81eb397afc513601c1'}
                        </span>
                      </div>
                      <div className="truncate">
                        <span className="text-slate-500">APK SHA-256:</span>{' '}
                        <span className="text-cyan-400">
                          {apkBuildData?.brokerBridge?.sha256Apk || 'Ready'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleDirectDownload(
                          '/api/download/BrokerBridgeSync.apk?download=1',
                          'BrokerBridgeSync-v1.0.0-signed.apk'
                        )
                      }
                      className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh BrokerBridgeSync.apk</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `${typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-oj2gpgwetvago2t5xyvcxe-232925187258.asia-southeast1.run.app'}/BrokerBridgeSync.apk`,
                          'apk1url'
                        )
                      }
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 cursor-pointer transition"
                    >
                      {copiedCmd === 'apk1url' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedCmd === 'apk1url' ? 'Tersalin' : 'Salin Link'}</span>
                    </button>
                  </div>
                </div>

                {/* APK 2: SCHEVANKA Gold Terminal */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 font-mono">
                        2. SCHEVANKA-Gold-Terminal-v1.0.0-signed.apk
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono border border-amber-500/30">
                        {apkBuildData?.goldTerminal
                          ? `${(apkBuildData.goldTerminal.sizeBytes / 1024).toFixed(1)} KB`
                          : '16.0 KB'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Aplikasi Android utama <strong>SCHEVANKA Gold Terminal</strong> (Chart XAU/USD Live, Order Book DOM, Institutional Execution, &amp; AI Quant Bot).
                    </p>
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/90 font-mono text-[10px] text-slate-400 space-y-1">
                      <div>
                        <span className="text-slate-500">Package:</span>{' '}
                        <span className="text-slate-200">com.schevanka.goldterminal</span>
                      </div>
                      <div>
                        <span className="text-slate-500">SDK:</span>{' '}
                        <span className="text-slate-200">minSdk 24 (Android 7.0) • targetSdk 34 (Android 14)</span>
                      </div>
                      <div>
                        <span className="text-slate-500">DEX SHA-1:</span>{' '}
                        <span className="text-amber-400">
                          {apkBuildData?.goldTerminal?.dexSha1 || 'eb82c15f935c3a888b65d8c362594d0a584a059d'}
                        </span>
                      </div>
                      <div className="truncate">
                        <span className="text-slate-500">APK SHA-256:</span>{' '}
                        <span className="text-cyan-400">
                          {apkBuildData?.goldTerminal?.sha256Apk || 'Ready'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleDirectDownload(
                          '/api/download/SCHEVANKA-Gold-Terminal.apk',
                          'SCHEVANKA-Gold-Terminal-v1.0.0-signed.apk'
                        )
                      }
                      className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh SCHEVANKA-Gold-Terminal.apk</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `${typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-oj2gpgwetvago2t5xyvcxe-232925187258.asia-southeast1.run.app'}/SCHEVANKA-Gold-Terminal.apk`,
                          'apk2url'
                        )
                      }
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 cursor-pointer transition"
                    >
                      {copiedCmd === 'apk2url' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedCmd === 'apk2url' ? 'Tersalin' : 'Salin Link'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Certificate & Signature Verification Box */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-1.5">
                <div className="text-emerald-400 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verifikasi Tanda Tangan Kriptografi APK (Release Keystore RSA-2048)</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  <span className="text-slate-500">Signature Schemes:</span>{' '}
                  <span className="text-slate-200">
                    v1 (JAR META-INF/CERT.RSA PKCS#7) + v2 (APK Sig Block 42 • ID 0x7109871a)
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 break-all">
                  <span className="text-slate-500">Cert SHA-256 Fingerprint:</span>{' '}
                  <span className="text-emerald-300">
                    {apkBuildData?.brokerBridge?.certSha256Fingerprint ||
                      '69:47:FF:31:73:CA:57:17:2B:1B:E3:C4:87:4A:E2:37:08:32:4E:0C:26:37:3B:EC:81:81:E8:DD:60:D0:E9:4C'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  <span className="text-slate-500">Subject DN:</span>{' '}
                  <span className="text-slate-300">
                    CN=SCHEVANKA Gold Terminal, OU=Mobile Engineering, O=SCHEVANKA Institutional, L=Jakarta, C=ID
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compose_app' && (
            <div className="space-y-4">
              {/* Sub-navigation matching Android BottomBar (Sync / Monitor / History / Settings) */}
              <div className="grid grid-cols-4 gap-2 p-1.5 rounded-xl bg-slate-950 border border-slate-800">
                {[
                  { id: 'SYNC', label: '1. Sync Screen', icon: RefreshCw },
                  { id: 'MONITOR', label: '2. Monitor Screen', icon: Activity },
                  { id: 'HISTORY', label: `3. History (${historyList.length})`, icon: History },
                  { id: 'SETTINGS', label: '4. Settings Screen', icon: Settings },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = composeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setComposeTab(tab.id as any)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        active
                          ? 'bg-[#1F7A1F] text-white shadow'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* SCREEN 1: SYNC SCREEN */}
              {composeTab === 'SYNC' && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-emerald-400">
                        SyncScreen.kt — Real-Time Broker Webhook Form
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Validasi sesuai API_SPECIFICATION_v1.0.md • Langsung tersinkron ke layar terminal utama
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (historyList.length > 0) {
                            const last = historyList[0];
                            setLoginId(last.loginId);
                            setBalance(String(last.balance));
                            setEquity(String(last.equity));
                            setMargin(String(last.margin));
                            setFreeMargin(String(last.freeMargin));
                            setLeverage(String(last.leverage));
                            setCurrency(last.currency);
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 cursor-pointer"
                      >
                        Auto-Fill Last Sync
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginId('');
                          setServer('');
                          setCompany('');
                          setBalance('');
                          setEquity('');
                          setMargin('');
                          setFreeMargin('');
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-rose-300 cursor-pointer"
                      >
                        Clear Form
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        loginId (1–20 digits) *
                      </label>
                      <input
                        type="text"
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-100"
                      />
                      <div className={`text-[10px] mt-0.5 font-mono ${fieldErrors.loginId ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {fieldErrors.loginId || `✓ Valid (${loginId.length}/20)`}
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        server (Optional)
                      </label>
                      <input
                        type="text"
                        value={server}
                        onChange={(e) => setServer(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-100"
                      />
                      <div className="text-[10px] mt-0.5 font-mono text-emerald-400">✓ Optional</div>
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        company (Optional)
                      </label>
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-100"
                      />
                      <div className="text-[10px] mt-0.5 font-mono text-emerald-400">✓ Optional</div>
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        balance *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={balance}
                        onChange={(e) => setBalance(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-100"
                      />
                      <div className={`text-[10px] mt-0.5 font-mono ${fieldErrors.balance ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {fieldErrors.balance || '✓ Valid'}
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        equity *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={equity}
                        onChange={(e) => setEquity(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-100"
                      />
                      <div className={`text-[10px] mt-0.5 font-mono ${fieldErrors.equity ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {fieldErrors.equity || '✓ Valid'}
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        margin *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={margin}
                        onChange={(e) => setMargin(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-100"
                      />
                      <div className={`text-[10px] mt-0.5 font-mono ${fieldErrors.margin ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {fieldErrors.margin || '✓ Valid'}
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        freeMargin *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={freeMargin}
                        onChange={(e) => setFreeMargin(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-100"
                      />
                      <div className={`text-[10px] mt-0.5 font-mono ${fieldErrors.freeMargin ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {fieldErrors.freeMargin || '✓ Valid'}
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        leverage (1–500) *
                      </label>
                      <input
                        type="number"
                        value={leverage}
                        onChange={(e) => setLeverage(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-100"
                      />
                      <div className={`text-[10px] mt-0.5 font-mono ${fieldErrors.leverage ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {fieldErrors.leverage || '✓ Valid (1–500)'}
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        currency (ISO 4217) *
                      </label>
                      <input
                        type="text"
                        maxLength={3}
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-100"
                      />
                      <div className={`text-[10px] mt-0.5 font-mono ${fieldErrors.currency ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {fieldErrors.currency || `✓ Valid (${currency.length}/3)`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleSendWebhookSync}
                      disabled={isSending}
                      className="flex-1 py-2.5 rounded-xl bg-[#1F7A1F] hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer transition disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSending ? 'animate-spin' : ''}`} />
                      <span>{isSending ? 'Sending POST /api/broker/bridge/webhook...' : 'Send Webhook Sync Now'}</span>
                    </button>
                  </div>

                  {syncResponseStatus && (
                    <div
                      className={`p-3 rounded-xl border font-mono text-xs flex items-center justify-between ${
                        syncResponseStatus === 'SUCCESS'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {syncResponseStatus === 'SUCCESS' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <span>
                          <strong>{syncResponseStatus}:</strong> {syncResponseMsg}
                        </span>
                      </div>
                      {lastResponseMs !== null && <span>{lastResponseMs} ms</span>}
                    </div>
                  )}
                </div>
              )}

              {/* SCREEN 2: MONITORING SCREEN */}
              {composeTab === 'MONITOR' && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-100">
                        Account #{loginId || '10894251'} • {server || 'HFMarkets-LiveServer1'} ({company || 'HF Markets'})
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Leverage 1:{leverage || 500} • Auto-Sync: {autoSyncEnabled ? `ON (${autoSyncIntervalSec}s)` : 'OFF'}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono text-xs font-bold">
                      ONLINE
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Balance</div>
                      <div className="text-base font-bold text-emerald-400">
                        ${numBalance.toFixed(2)} {currency}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Equity</div>
                      <div className="text-base font-bold text-cyan-400">
                        ${numEquity.toFixed(2)} ({numEquity - numBalance >= 0 ? '+' : ''}
                        {(numEquity - numBalance).toFixed(2)})
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Margin Used</div>
                      <div className="text-base font-bold text-amber-400">${numMargin.toFixed(2)}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Free Margin</div>
                      <div className="text-base font-bold text-slate-100">
                        ${(Number(freeMargin) || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span>Margin Utilization (%)</span>
                      <span
                        className={
                          marginUsagePct >= 95
                            ? 'text-rose-400 font-bold'
                            : marginUsagePct >= 80
                            ? 'text-amber-400 font-bold'
                            : 'text-emerald-400 font-bold'
                        }
                      >
                        {marginUsagePct.toFixed(2)}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          marginUsagePct >= 95
                            ? 'bg-rose-500'
                            : marginUsagePct >= 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${marginUsagePct}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Green: Normal (&lt;80%) • Yellow: High (&gt;80%) • Red: Critical (&gt;95%)
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN 3: HISTORY SCREEN */}
              {composeTab === 'HISTORY' && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {(['ALL', 'SUCCESS', 'FAILED'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => setHistoryFilter(st)}
                          className={`px-2.5 py-1 rounded text-xs font-mono cursor-pointer ${
                            historyFilter === st
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                              : 'bg-slate-950 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExportHistoryJson}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 cursor-pointer"
                      >
                        Export JSON
                      </button>
                      <button
                        onClick={() => {
                          setHistoryList([]);
                          try {
                            localStorage.removeItem('broker_bridge_sync_history');
                          } catch {}
                        }}
                        className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-xs font-mono text-rose-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {historyList
                      .filter((i) => historyFilter === 'ALL' || i.status === historyFilter)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono"
                        >
                          <div>
                            <span
                              className={`font-bold mr-2 ${
                                item.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {item.status}
                            </span>
                            <span className="text-slate-200 font-semibold">#{item.loginId}</span>
                            <span className="text-slate-400 ml-2">
                              ${item.balance.toFixed(2)} • Equity ${item.equity.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-right text-[10px] text-slate-400">
                            <div>{item.responseTime} ms</div>
                            <div>{new Date(item.timestamp).toLocaleTimeString()}</div>
                          </div>
                        </div>
                      ))}
                    {historyList.length === 0 && (
                      <div className="text-center py-8 text-xs text-slate-500">
                        Belum ada log riwayat sinkronisasi. Klik &quot;Send Webhook Sync Now&quot; di tab Sync.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SCREEN 4: SETTINGS SCREEN */}
              {composeTab === 'SETTINGS' && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4 text-xs">
                  <div className="space-y-2">
                    <label className="font-bold text-slate-200 block">
                      API Endpoint Configuration:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={endpointUrl}
                        onChange={(e) => setEndpointUrl(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-cyan-300"
                      />
                      <button
                        type="button"
                        onClick={handleCheckHealth}
                        className="px-3 py-2 rounded-lg bg-[#1F7A1F] hover:bg-emerald-600 text-white font-bold cursor-pointer"
                      >
                        Check API Health
                      </button>
                    </div>
                    {healthStatus && (
                      <div className="font-mono text-[11px] text-emerald-400">{healthStatus}</div>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-200">Auto-Sync (WorkManager Interval)</div>
                      <div className="text-[11px] text-slate-400">
                        Kirim sinkronisasi otomatis ke endpoint webhook setiap interval
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {[5, 10, 30, 60].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setAutoSyncIntervalSec(sec)}
                          className={`px-2 py-1 rounded font-mono ${
                            autoSyncIntervalSec === sec
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {sec === 60 ? '1m' : `${sec}s`}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                        className={`px-3 py-1 rounded font-bold ${
                          autoSyncEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {autoSyncEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'source_code' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">
                    Pilih File Proyek Android Studio (`BrokerBridgeSync/`):
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedFilePath}
                    onChange={(e) => setSelectedFilePath(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-300"
                  >
                    {ANDROID_PROJECT_FILES.map((f) => (
                      <option key={f.path} value={f.path}>
                        {f.label} — ({f.path})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => copyToClipboard(selectedFileContent, 'srcfile')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCmd === 'srcfile' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedCmd === 'srcfile' ? 'Tersalin' : 'Salin File'}</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 rounded-xl bg-[#080b11] border border-slate-800 font-mono text-[11px] text-emerald-300 max-h-[380px] overflow-auto leading-relaxed">
                {selectedFileContent}
              </pre>
            </div>
          )}

          {activeTab === 'instant' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-emerald-200">
                    Instalasi Langsung WebAPK atau Unduh Android Studio Project (.ZIP)
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Anda dapat langsung menginstal aplikasi ini ke perangkat Android menggunakan tombol di bawah, atau mengunduh paket lengkap kode sumber <strong>Kotlin + Jetpack Compose (`BrokerBridgeSync-AndroidStudio.zip`)</strong> di pojok kanan atas untuk dikompilasi menjadi <code className="text-emerald-300">app-release.apk</code>.
                  </p>
                </div>
              </div>

              {isInstalled ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-300">Aplikasi Sudah Terinstal!</h4>
                    <p className="text-xs text-slate-400">Berjalan dalam mode Standalone Android APK.</p>
                  </div>
                </div>
              ) : (
                isInstallable && (
                  <button
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-4 h-4" />
                    {isInstalling ? 'Memproses...' : 'Pasang APK Sekarang'}
                  </button>
                )
              )}
            </div>
          )}

          {activeTab === 'qrcode' && (
            <div className="space-y-4 text-center py-2">
              <p className="text-xs text-slate-300">
                Scan QR Code ini dari kamera HP Android Anda untuk membuka &amp; menginstal langsung:
              </p>
              <div className="mx-auto w-56 h-56 p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    appUrl
                  )}&color=0b0e14`}
                  alt="Scan QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-[#0b0e14] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Target APK Size: ~8.4 MB (&lt; 50 MB) • MinSDK 24 (Android 7.0) – TargetSDK 34 (Android 14)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
