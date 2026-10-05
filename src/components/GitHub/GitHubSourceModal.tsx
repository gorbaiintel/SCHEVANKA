import React, { useState, useEffect } from 'react';
import { 
  X, 
  Github, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  Download, 
  Key, 
  RefreshCw, 
  ShieldCheck, 
  Cpu, 
  LogOut,
  FolderGit2,
  Terminal,
  Layers,
  ArrowRight,
  Radio,
  Zap,
  Star,
  Code
} from 'lucide-react';
import { GitHubUser } from '../../types/market';
import { sound } from '../../services/soundService';
import { 
  GITHUB_MT5_REPOSITORIES, 
  MQL5_REALTIME_BRIDGE_CODE, 
  PYTHON_WEBSOCKET_BRIDGE_CODE 
} from '../../services/eaBridgeCode';

interface GitHubSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: GitHubUser | null;
  onConnectUser: (user: GitHubUser) => void;
  onDisconnectUser: () => void;
  onOpenBrokerLogin?: () => void;
}

export const GitHubSourceModal: React.FC<GitHubSourceModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onConnectUser,
  onDisconnectUser,
  onOpenBrokerLogin,
}) => {
  const [activeTab, setActiveTab] = useState<'DROP_ALL' | 'GITHUB_PROJECTS' | 'EA_BRIDGE' | 'AUTH' | 'REPO_SYNC'>('DROP_ALL');
  const [patToken, setPatToken] = useState<string>('');
  const [repoInput, setRepoInput] = useState<string>('schevanka-gold-terminal');
  const [isPrivateRepo, setIsPrivateRepo] = useState<boolean>(false);
  const [commitMessage, setCommitMessage] = useState<string>(
    'feat: drop full SCHEVANKA Gold Terminal build, overlay indicators, HFM MT4 & signed APKs'
  );
  const [isDroppingAll, setIsDroppingAll] = useState<boolean>(false);
  const [dropResult, setDropResult] = useState<any | null>(null);
  const [manifestInfo, setManifestInfo] = useState<{ filesCount: number; totalSizeBytes: number; hasTokenConfigured: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [reposList, setReposList] = useState<any[]>([]);
  const [isSendingTestTick, setIsSendingTestTick] = useState<boolean>(false);
  const [liveStreamStatus, setLiveStreamStatus] = useState<string>('Standby');

  // Current app origin for webhook URL
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-oj2gpgwetvago2t5xyvcxe-232925187258.asia-southeast1.run.app';
  const webhookUrl = `${appOrigin}/api/broker/bridge/webhook`;
  const streamUrl = `${appOrigin}/api/broker/stream`;

  // Fetch connected user & drop manifest from server session on mount/open
  useEffect(() => {
    if (isOpen) {
      checkExistingSession();
      fetch('/api/github/drop-manifest')
        .then((r) => r.json())
        .then((d) => {
          if (d && d.success) {
            setManifestInfo({
              filesCount: d.filesCount,
              totalSizeBytes: d.totalSizeBytes,
              hasTokenConfigured: Boolean(d.hasTokenConfigured),
            });
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleDropAllToGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDroppingAll(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setDropResult(null);
    sound.playNodeTrigger();

    try {
      const res = await fetch('/api/github/drop-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: patToken.trim() || undefined,
          repoName: repoInput.trim() || 'schevanka-gold-terminal',
          isPrivate: isPrivateRepo,
          commitMessage: commitMessage.trim() || 'feat: drop full SCHEVANKA Gold Terminal build & source',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal melakukan Drop All ke GitHub.');
      }

      sound.playOrderExecuted();
      setDropResult(data);
      if (data.user) {
        onConnectUser(data.user);
      }
      setSuccessMessage(
        `✓ Berhasil Drop ${data.filesCount} file (${(data.totalSizeBytes / (1024 * 1024)).toFixed(2)} MB) ke GitHub ${data.fullName}!`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal melakukan Drop All ke GitHub.');
    } finally {
      setIsDroppingAll(false);
    }
  };

  const checkExistingSession = async () => {
    try {
      const res = await fetch('/api/auth/github/user');
      const data = await res.json();
      if (data.connected && data.user) {
        onConnectUser(data.user);
        loadUserRepos(data.user.login);
      }
    } catch {
      // ignore
    }
  };

  const loadUserRepos = async (username: string) => {
    try {
      const res = await fetch(`/api/github/repos?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (data.repos) {
        setReposList(data.repos);
      }
    } catch {
      // ignore
    }
  };

  // Popup-based GitHub OAuth Flow complying with oauth-integration skill
  const handleConnectOAuth = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    sound.playNodeTrigger();

    try {
      const res = await fetch('/api/auth/github/url');
      const data = await res.json();

      if (!data.configured) {
        setErrorMessage(
          'GitHub OAuth Client ID belum disetel di secrets. Silakan gunakan opsi Personal Access Token (PAT) di tab Akun untuk terhubung instan!'
        );
        setIsLoading(false);
        return;
      }

      const authWindow = window.open(
        data.url,
        'github_oauth_popup',
        'width=600,height=720,menubar=no,toolbar=no,location=no,status=no'
      );

      if (!authWindow) {
        setErrorMessage('Popup terblokir oleh browser. Izinkan popup untuk melanjutkan koneksi GitHub.');
        setIsLoading(false);
        return;
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal membuka otorisasi GitHub');
      setIsLoading(false);
    }
  };

  // Connect via GitHub Personal Access Token (PAT)
  const handleConnectPAT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patToken.trim()) {
      setErrorMessage('Masukkan GitHub Personal Access Token Anda.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    sound.playNodeTrigger();

    try {
      const res = await fetch('/api/auth/github/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: patToken.trim(),
          repo: repoInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Token tidak valid.');
      }

      sound.playOrderExecuted();
      onConnectUser(data.user);
      setSuccessMessage(`Terhubung dengan GitHub @${data.user.login}!`);
      loadUserRepos(data.user.login);
      setPatToken('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memverifikasi token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/auth/github/disconnect', { method: 'POST' });
    } catch {
      // ignore
    }
    onDisconnectUser();
    setSuccessMessage(null);
    setReposList([]);
    sound.playNodeTrigger();
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    sound.playNodeTrigger();
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadMql5 = () => {
    const element = document.createElement('a');
    const file = new Blob([MQL5_REALTIME_BRIDGE_CODE], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'SchevankaBridge.mq5';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    sound.playOrderExecuted();
  };

  // Test firing a real-time live telemetry tick to demonstrate sub-second SSE streaming
  const handleTestRealtimeTick = async () => {
    setIsSendingTestTick(true);
    sound.playNodeTrigger();
    setLiveStreamStatus('Mengirim tick simulasi...');

    try {
      const sampleLogin = '43129521';
      const sampleBal = 2500.00;
      const sampleEq = +(sampleBal + (Math.random() * 10 - 4)).toFixed(2);

      const res = await fetch('/api/broker/bridge/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginId: sampleLogin,
          server: 'Exness-Real20',
          company: 'Exness Global',
          balance: sampleBal,
          equity: sampleEq,
          margin: 45.20,
          freeMargin: +(sampleEq - 45.20).toFixed(2),
          leverage: 500,
          currency: 'USD',
        }),
      });

      const data = await res.json();
      if (data.success) {
        sound.playOrderExecuted();
        setLiveStreamStatus(`✓ Real-Time Stream Berhasil! Balance: $${sampleBal.toFixed(2)} | Equity: $${sampleEq.toFixed(2)}`);
      }
    } catch (e: any) {
      setLiveStreamStatus(`Gagal: ${e.message}`);
    } finally {
      setIsSendingTestTick(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150 select-none overflow-y-auto">
      <div className="bg-[#0b0e14] border border-neutral-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden text-xs flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-[#0f141c]/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 tracking-tight">
                  Source GitHub: Real-Time Broker Bridge
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Real-Time Streaming</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pilih source repository GitHub untuk menghubungkan MetaTrader 5/4 secara real-time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-950 px-4 pt-2 gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('DROP_ALL')}
            className={`pb-2 px-3 font-semibold text-xs transition border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'DROP_ALL'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>🚀 Drop All to GitHub</span>
          </button>
          <button
            onClick={() => setActiveTab('GITHUB_PROJECTS')}
            className={`pb-2 px-3 font-semibold text-xs transition border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'GITHUB_PROJECTS'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span>Rekomendasi Repo MT5 Real-Time</span>
          </button>
          <button
            onClick={() => setActiveTab('EA_BRIDGE')}
            className={`pb-2 px-3 font-semibold text-xs transition border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'EA_BRIDGE'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Source EA MQL5 (Sub-Second)</span>
          </button>
          <button
            onClick={() => setActiveTab('AUTH')}
            className={`pb-2 px-3 font-semibold text-xs transition border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'AUTH'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>Akun GitHub Anda</span>
            {currentUser && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>
          <button
            onClick={() => setActiveTab('REPO_SYNC')}
            className={`pb-2 px-3 font-semibold text-xs transition border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'REPO_SYNC'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Sync Strategi</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 0: 1-CLICK DROP ALL TO GITHUB */}
          {activeTab === 'DROP_ALL' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-neutral-900 border border-emerald-500/40 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                    <Github className="w-4 h-4 text-emerald-400" />
                    <span>1-Click Drop All Build, Source Code, Android Studio, Signed APKs &amp; Full ZIP ke GitHub</span>
                  </div>
                  {manifestInfo && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold">
                      {manifestInfo.filesCount} FILES READY ({(manifestInfo.totalSizeBytes / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Push otomatis seluruh isi workspace (<strong>src/</strong>, <strong>dist/</strong> production build, <strong>server.ts</strong>, <strong>apk-builder.ts</strong>, <strong>BrokerBridgeSync/</strong>, <strong>android/</strong>, <strong>public/*.apk</strong>, <strong>.github/workflows/deploy.yml</strong>, serta <strong>SCHEVANKA-Gold-Terminal-Full-Build.zip</strong>) langsung ke branch <code>main</code> repository GitHub Anda.
                </p>
              </div>

              <form onSubmit={handleDropAllToGitHub} className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-3.5">
                {!currentUser && !manifestInfo?.hasTokenConfigured && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        <span>GitHub Personal Access Token (Scope: <code className="text-amber-300">repo</code>):</span>
                      </label>
                      <a
                        href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=SCHEVANKA-Gold-Terminal-DropAll"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <span>Buat Token GitHub (1-Klik)</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <input
                      type="password"
                      value={patToken}
                      onChange={(e) => setPatToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-neutral-950 border border-neutral-700 focus:border-emerald-400 rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none"
                      required={!currentUser && !manifestInfo?.hasTokenConfigured}
                    />
                  </div>
                )}

                {currentUser && (
                  <div className="p-2.5 rounded-lg bg-neutral-950 border border-emerald-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={currentUser.avatar_url} alt={currentUser.login} className="w-6 h-6 rounded-full" />
                      <span className="font-mono text-xs text-emerald-300 font-bold">
                        Terhubung sebagai @{currentUser.login}
                      </span>
                    </div>
                    <input
                      type="password"
                      value={patToken}
                      onChange={(e) => setPatToken(e.target.value)}
                      placeholder="Opsional: Override Token PAT (ghp_...)"
                      className="bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-[10px] font-mono text-slate-200 w-56 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-8 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 block">
                      Nama Repository Tujuan di GitHub (Otomatis dibuat jika belum ada):
                    </label>
                    <input
                      type="text"
                      value={repoInput}
                      onChange={(e) => setRepoInput(e.target.value)}
                      placeholder="schevanka-gold-terminal"
                      className="w-full bg-neutral-950 border border-neutral-700 focus:border-emerald-400 rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none"
                      required
                    />
                  </div>
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 block">
                      Visibilitas Repo:
                    </label>
                    <select
                      value={isPrivateRepo ? 'private' : 'public'}
                      onChange={(e) => setIsPrivateRepo(e.target.value === 'private')}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="public">Public Repository</option>
                      <option value="private">Private Repository</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">
                    Pesan Commit Git:
                  </label>
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 focus:border-emerald-400 rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isDroppingAll}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-neutral-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer transition disabled:opacity-50"
                  >
                    {isDroppingAll ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Mengunggah Semua File &amp; Build ke GitHub...</span>
                      </>
                    ) : (
                      <>
                        <Github className="w-4 h-4" />
                        <span>🚀 DROP ALL TO GITHUB SEKARANG</span>
                      </>
                    )}
                  </button>

                  <a
                    href="/api/download/full-build.zip"
                    download="SCHEVANKA-Gold-Terminal-Full-Build.zip"
                    className="py-2.5 px-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-amber-300 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
                    title="Unduh file ZIP lengkap jika ingin upload manual ke GitHub"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Full ZIP</span>
                  </a>
                </div>
              </form>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2 font-mono text-[11px]">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {dropResult && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 space-y-2.5 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>SEMUA FILE BERHASIL DI-DROP KE GITHUB!</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Branch: <strong className="text-white">{dropResult.branch}</strong>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                      <span className="text-slate-400 block text-[10px]">Repository GitHub:</span>
                      <a
                        href={dropResult.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-300 hover:underline font-bold flex items-center gap-1"
                      >
                        <span>{dropResult.fullName}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                      <span className="text-slate-400 block text-[10px]">Commit SHA ({dropResult.filesCount} Files):</span>
                      <a
                        href={dropResult.commitUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-300 hover:underline font-bold flex items-center gap-1"
                      >
                        <span>{String(dropResult.commitSha).slice(0, 12)}...</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: GITHUB REPOSITORIES RECOMMENDATIONS */}
          {activeTab === 'GITHUB_PROJECTS' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-neutral-900 to-neutral-900 border border-amber-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-amber-400" />
                    <span>Open-Source MetaTrader Real-Time Bridges di GitHub</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                    VERIFIED GITHUB SOURCES
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Berikut adalah repository open source resmi dan populer di GitHub untuk menghubungkan terminal MetaTrader 5/4 dengan aplikasi web streaming secara <strong>real-time (WebSocket / Sub-second REST)</strong>:
                </p>
              </div>

              {/* Cards for each GitHub Repo */}
              <div className="space-y-3">
                {GITHUB_MT5_REPOSITORIES.map((repo) => (
                  <div 
                    key={repo.id}
                    className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-amber-500/50 transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Github className="w-4 h-4 text-white" />
                          <a 
                            href={repo.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="font-bold text-sm text-amber-400 hover:text-amber-300 font-mono hover:underline flex items-center gap-1"
                          >
                            <span>{repo.name}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-slate-300 font-mono text-[10px] flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                            <span>{repo.stars} stars</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">
                          {repo.description}
                        </p>
                      </div>

                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-slate-100 font-medium text-xs flex items-center gap-1.5 border border-neutral-700 shrink-0 cursor-pointer"
                      >
                        <span>Buka Repo</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Features pills */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 font-mono text-[10px]">
                      {repo.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span className="text-slate-300 truncate">{feat}</span>
                        </div>
                      ))}
                    </div>

                    {/* Clone command bar */}
                    <div className="pt-2 border-t border-neutral-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="text-[10px] text-slate-500 font-mono">Clone:</span>
                        <code className="text-[10.5px] font-mono text-cyan-300 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800 truncate">
                          {repo.cloneCommand}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(repo.cloneCommand, repo.id)}
                        className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-slate-300 text-[10px] font-mono flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedKey === repo.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === repo.id ? 'Tersalin' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Real-time Stream Live Test Bar */}
              <div className="p-3.5 rounded-xl bg-neutral-900 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="font-bold text-xs text-slate-100">Live Real-Time Stream Engine Test</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestRealtimeTick}
                    disabled={isSendingTestTick}
                    className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold font-mono text-[11px] flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>{isSendingTestTick ? 'Mengirim...' : 'Kirim Tick Real-Time Uji Coba'}</span>
                  </button>
                </div>
                <div className="text-[10.5px] font-mono text-slate-400 flex items-center justify-between bg-neutral-950 p-2 rounded border border-neutral-800">
                  <span>Status Stream: <strong className="text-emerald-400">{liveStreamStatus}</strong></span>
                  <span className="text-slate-500">Endpoint: /api/broker/stream (SSE)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MQL5 REAL-TIME BRIDGE SOURCE */}
          {activeTab === 'EA_BRIDGE' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-500/10 via-neutral-900 to-neutral-900 border border-cyan-500/30 space-y-1.5">
                <div className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>SchevankaBridge.mq5 v3.0 (Sub-Second Real-Time OnTick Streaming)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  EA ini berjalan di MetaTrader 5 dan memicu pengiriman data setiap ada tick harga baru (OnTick) serta timer 500ms, sehingga saldo, equity, dan spread diperbarui secara instan tanpa lag.
                </p>
              </div>

              {/* Webhook Configuration for MT5 */}
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
                <div className="font-semibold text-slate-200 text-xs">
                  Konfigurasi Webhook MT5 Anda:
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono">1. URL Webhook Terminal:</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={webhookUrl}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 font-mono text-[11px] text-cyan-300"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(webhookUrl, 'webhook')}
                      className="px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-slate-200 border border-neutral-700 flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedKey === 'webhook' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'webhook' ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-slate-400 font-mono">2. Izinkan WebRequest di MT5:</span>
                  <div className="text-[10px] text-slate-400 bg-neutral-950 p-2 rounded border border-neutral-800 leading-relaxed">
                    Buka MT5 &rarr; <strong>Tools</strong> &rarr; <strong>Options</strong> &rarr; <strong>Expert Advisors</strong> &rarr; Centang <em>"Allow WebRequest for listed URL"</em> lalu tambahkan: <code className="text-amber-400 font-bold">{appOrigin}</code>
                  </div>
                </div>
              </div>

              {/* Code Preview & Download */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300 text-xs">Source Code SchevankaBridge.mq5:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy(MQL5_REALTIME_BRIDGE_CODE, 'mql5')}
                      className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-slate-200 border border-neutral-700 flex items-center gap-1 font-mono text-[10px] cursor-pointer"
                    >
                      {copiedKey === 'mql5' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'mql5' ? 'Tersalin' : 'Salin Kode'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadMql5}
                      className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold flex items-center gap-1 font-mono text-[10px] cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Unduh .mq5</span>
                    </button>
                  </div>
                </div>

                <pre className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-[10px] font-mono text-emerald-400 max-h-48 overflow-y-auto leading-relaxed">
                  {MQL5_REALTIME_BRIDGE_CODE}
                </pre>
              </div>

              {/* Python Bridge Alternative */}
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300 text-xs flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-amber-400" />
                    <span>Python Real-Time Bridge (aiohttp / WebSocket)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(PYTHON_WEBSOCKET_BRIDGE_CODE, 'python')}
                    className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-slate-200 border border-neutral-700 flex items-center gap-1 font-mono text-[10px] cursor-pointer"
                  >
                    {copiedKey === 'python' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'python' ? 'Tersalin' : 'Salin Python Script'}</span>
                  </button>
                </div>
                <div className="text-[10px] text-slate-400">
                  Untuk pengguna VPS Windows yang ingin menjalankan bridge background secara otomatis.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GITHUB AUTHENTICATION */}
          {activeTab === 'AUTH' && (
            <div className="space-y-4">
              {currentUser ? (
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={currentUser.avatar_url} 
                        alt={currentUser.login} 
                        className="w-10 h-10 rounded-full border border-emerald-500/50"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 text-sm">{currentUser.name || currentUser.login}</span>
                          <span className="text-slate-400 font-mono text-xs">(@{currentUser.login})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{currentUser.public_repos || 0} repositories</span>
                          <span>•</span>
                          <a 
                            href={currentUser.html_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
                          >
                            <span>Lihat Profil GitHub</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleDisconnect}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-medium transition cursor-pointer flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Putuskan</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 1-Click OAuth Connect Button */}
                  <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3 text-center">
                    <div className="font-semibold text-slate-200">
                      Login dengan GitHub OAuth
                    </div>
                    <button
                      type="button"
                      onClick={handleConnectOAuth}
                      disabled={isLoading}
                      className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold flex items-center justify-center gap-2 border border-neutral-600 transition cursor-pointer shadow-md disabled:opacity-50"
                    >
                      <Github className="w-4 h-4" />
                      <span>{isLoading ? 'Menghubungkan...' : 'Authorize dengan Akun GitHub'}</span>
                    </button>
                  </div>

                  {/* Alternative: PAT Token Input */}
                  <form onSubmit={handleConnectPAT} className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        <span>Koneksi Instan via GitHub Personal Access Token (PAT)</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-400">Token Akses GitHub (ghp_...):</label>
                      <input
                        type="password"
                        value={patToken}
                        onChange={(e) => setPatToken(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-500 rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || !patToken.trim()}
                      className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Memverifikasi Token...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Hubungkan Token PAT</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Status alerts */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}
              {successMessage && (
                <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REPOSITORY SYNC */}
          {activeTab === 'REPO_SYNC' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-500/10 via-neutral-900 to-neutral-900 border border-purple-500/30 space-y-1">
                <div className="font-bold text-xs text-purple-300 flex items-center gap-1.5">
                  <FolderGit2 className="w-4 h-4 text-purple-400" />
                  <span>Repository GitHub untuk Algoritma Trading & Node Strategi</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Tautkan repository GitHub Anda untuk mengimpor node strategi kustom atau mencadangkan riwayat trade live ke GitHub.
                </p>
              </div>

              {/* Repositories list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300 text-xs">Repository Tersedia:</span>
                  {currentUser && (
                    <button
                      type="button"
                      onClick={() => loadUserRepos(currentUser.login)}
                      className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Refresh Repos</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {reposList.map((repo: any, idx: number) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 hover:border-amber-500/40 transition flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <FolderGit2 className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-bold text-slate-200 text-xs font-mono">{repo.full_name || repo.name}</span>
                          {repo.stars > 0 && (
                            <span className="text-[10px] px-1 rounded bg-neutral-800 text-slate-400 font-mono">
                              ★ {repo.stars}
                            </span>
                          )}
                        </div>
                        <div className="text-[10.5px] text-slate-400 truncate max-w-md">
                          {repo.description}
                        </div>
                      </div>

                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-slate-200 text-[11px] font-medium flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <span>Lihat Source</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-[#0f141c]/90 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Real-time SSE active on /api/broker/stream</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-slate-200 font-medium transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
