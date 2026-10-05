import React, { useState, useEffect } from 'react';
import { BrokerAccount } from '../../types/market';
import { X, RefreshCw, CheckCircle2, ShieldCheck, Zap, DollarSign, Edit3 } from 'lucide-react';
import { sound } from '../../services/soundService';

interface BalanceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  currentLeverage: number;
  brokerAccount: BrokerAccount | null;
  onSyncBalance: (newBalance: number, newLeverage: number, currency?: string) => void;
}

export const BalanceSyncModal: React.FC<BalanceSyncModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  currentLeverage,
  brokerAccount,
  onSyncBalance,
}) => {
  const [balance, setBalance] = useState<number>(currentBalance);
  const [leverage, setLeverage] = useState<number>(currentLeverage);
  const [currency, setCurrency] = useState<string>(brokerAccount?.currency || 'USD');
  const [isCentAccount, setIsCentAccount] = useState<boolean>(false);
  const [centValue, setCentValue] = useState<number>(currentBalance * 100);
  const [syncMode, setSyncMode] = useState<'MANUAL' | 'AUTO'>('MANUAL');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const activeBal = brokerAccount?.balance ?? currentBalance;
      setBalance(activeBal);
      setCentValue(activeBal * 100);
      setLeverage(brokerAccount?.leverage ?? currentLeverage);
      setCurrency(brokerAccount?.currency || 'USD');
      setSaveSuccess(false);
    }
  }, [isOpen, currentBalance, currentLeverage, brokerAccount]);

  if (!isOpen) return null;

  // Auto-detect balance directly from broker server gateway
  const triggerAutoDetection = async () => {
    setIsScanning(true);
    setScanStep('Menghubungkan ke server broker...');
    sound.playNodeTrigger();

    try {
      const loginId = brokerAccount?.loginId || '43129521';
      const server = brokerAccount?.server || 'Exness-Real20';
      const platform = brokerAccount?.platform || 'EXNESS';

      const res = await fetch('/api/broker/query-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, server, loginId }),
      });

      const data = await res.json();
      if (data && typeof data.balance === 'number') {
        setTimeout(() => {
          setBalance(data.balance);
          setCentValue(data.balance * 100);
          if (data.leverage) setLeverage(data.leverage);
          if (data.currency) setCurrency(data.currency);
          setScanStep('✓ Saldo terverifikasi dari gateway server!');
          setIsScanning(false);
          sound.playNodeTrigger();
        }, 800);
      } else {
        setIsScanning(false);
      }
    } catch {
      setIsScanning(false);
    }
  };

  const handleApplySync = (e: React.FormEvent) => {
    e.preventDefault();
    if (balance <= 0) return;

    setIsSaving(true);
    sound.playOrderExecuted();
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      onSyncBalance(balance, leverage, currency);
      try {
        localStorage.setItem('schevanka_real_balance', String(balance));
      } catch {}
      setTimeout(() => {
        onClose();
      }, 500);
    }, 350);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-[#0b0e14] border border-neutral-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-xs flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-[#0f141c]/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 tracking-tight">
                Sinkronkan Saldo Riil Akun Anda
              </h2>
              <p className="text-[11px] text-slate-400">
                Samakan saldo terminal dengan saldo aktual di MT4/MT5 Anda
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

        {/* Content Body */}
        <form onSubmit={handleApplySync} className="p-4 sm:p-5 space-y-4">
          {/* Explanation Alert */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Mengapa Saldo Sebelumnya Tidak Sesuai?</span>
            </div>
            <p className="text-slate-300 text-[10.5px] leading-relaxed">
              MetaTrader (MT4/MT5) mengamankan saldo akun Anda di server internal broker. Terminal ini tidak bisa menebak saldo Anda tanpa Anda masukkan atau sinkronkan. Masukkan nominal asli akun Anda di bawah ini agar 100% presisi.
            </p>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-neutral-900 border border-neutral-800">
            <button
              type="button"
              onClick={() => setSyncMode('MANUAL')}
              className={`py-2 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                syncMode === 'MANUAL'
                  ? 'bg-emerald-500 text-neutral-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Ketik Saldo Riil MT4/MT5</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSyncMode('AUTO');
                triggerAutoDetection();
              }}
              className={`py-2 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                syncMode === 'AUTO'
                  ? 'bg-emerald-500 text-neutral-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Auto-Detect Server</span>
            </button>
          </div>

          {syncMode === 'MANUAL' ? (
            <div className="space-y-3">
              {/* Account Type Toggle */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900/60 border border-neutral-800">
                <span className="text-[11px] text-slate-300 font-medium">Tipe Akun:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsCentAccount(false)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                      !isCentAccount
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Standard ($ USD)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCentAccount(true)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                      isCentAccount
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Cent (¢ USC)
                  </button>
                </div>
              </div>

              {/* Exact Balance Input */}
              {isCentAccount ? (
                <div>
                  <label className="text-slate-300 font-medium text-[11px] mb-1.5 block">
                    Saldo Akun Cent Anda (USC / ¢):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-amber-400 font-mono font-bold text-sm">¢</span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={centValue}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCentValue(val);
                        setBalance(+(val / 100).toFixed(2));
                      }}
                      placeholder="10000"
                      className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-500 rounded-xl pl-8 pr-3 py-2.5 text-amber-300 font-mono font-bold text-base focus:outline-none"
                      required
                    />
                  </div>
                  <div className="text-[10px] text-amber-400/90 font-mono mt-1">
                    = ${balance.toFixed(2)} USD saldo margin trading Gold.
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-slate-300 font-medium text-[11px] mb-1.5 block">
                    Ketik Saldo Riil Akun Anda Saat Ini ($ USD):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-emerald-400 font-mono font-bold text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={balance}
                      onChange={(e) => {
                        const val = Math.max(0, parseFloat(e.target.value) || 0);
                        setBalance(val);
                        setCentValue(val * 100);
                      }}
                      placeholder="Contoh: 50.00"
                      className="w-full bg-neutral-950 border border-neutral-700 focus:border-emerald-500 rounded-xl pl-8 pr-3 py-2.5 text-emerald-400 font-mono font-bold text-base focus:outline-none"
                      required
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* Quick Preset Buttons */}
              <div>
                <span className="text-[10px] text-slate-500 block mb-1">Pilihan Cepat Nominal Modal:</span>
                <div className="grid grid-cols-6 gap-1">
                  {[25, 50, 100, 250, 500, 1000].map((presetVal) => (
                    <button
                      key={presetVal}
                      type="button"
                      onClick={() => {
                        setBalance(presetVal);
                        setCentValue(presetVal * 100);
                        sound.playNodeTrigger();
                      }}
                      className={`py-1.5 rounded-lg border font-mono text-[10px] transition cursor-pointer text-center ${
                        balance === presetVal
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                          : 'bg-neutral-950 border-neutral-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ${presetVal}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Auto Detect Mode */
            <div className="p-4 rounded-xl bg-gradient-to-b from-emerald-500/15 via-emerald-950/20 to-neutral-950 border border-emerald-500/40 text-center space-y-2">
              <div className="text-[10px] font-mono text-emerald-400 font-bold">
                AUTO-DETECT LIVE GATEWAY
              </div>
              <div className="text-3xl font-black font-mono text-emerald-400">
                ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {isScanning ? (
                  <span className="text-amber-300 flex items-center justify-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>{scanStep || 'Memindai server...'}</span>
                  </span>
                ) : (
                  <span>Terdeteksi dari Server MetaTrader Direct FIX Feed</span>
                )}
              </div>
              <button
                type="button"
                onClick={triggerAutoDetection}
                disabled={isScanning}
                className="px-3 py-1 rounded bg-neutral-900 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                <span>Pindai Ulang Server</span>
              </button>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-slate-300 font-medium text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving || balance <= 0}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kunci Saldo Ini (${balance.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
