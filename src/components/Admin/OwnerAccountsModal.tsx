import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, CheckCircle2, User, Key, AlertCircle, X, Sparkles } from 'lucide-react';

interface OwnerAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
  onSetCurrentUserEmail: (email: string) => void;
}

export const OwnerAccountsModal: React.FC<OwnerAccountsModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail = 'eterxnighz@gmail.com',
  onSetCurrentUserEmail,
}) => {
  const [emails, setEmails] = useState<string[]>(['eterxnighz@gmail.com']);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/accounts');
      if (res.ok) {
        const data = await res.json();
        if (data.ownerEmails && Array.isArray(data.ownerEmails)) {
          setEmails(data.ownerEmails);
        }
      }
    } catch {
      // offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
      setStatusMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@') || !clean.includes('.')) {
      setErrorMessage('Format email tidak valid (contoh: akunanda@gmail.com).');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmails(data.ownerEmails);
        setNewEmail('');
        setStatusMessage(`Akun ${clean} berhasil ditambahkan dengan hak akses UNLIMITED.`);
        // Auto select this email if not currently set
        if (!currentUserEmail || currentUserEmail === '') {
          onSetCurrentUserEmail(clean);
        }
      } else {
        setErrorMessage(data.error || 'Gagal menambahkan akun.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEmail = async (emailToRemove: string) => {
    if (emails.length <= 1) {
      setErrorMessage('Minimal harus ada 1 akun owner terdaftar.');
      return;
    }
    if (!confirm(`Hapus hak akses owner untuk akun ${emailToRemove}?`)) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch('/api/admin/accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToRemove }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmails(data.ownerEmails);
        setStatusMessage(`Akun ${emailToRemove} telah dihapus.`);
        if (currentUserEmail === emailToRemove) {
          onSetCurrentUserEmail(data.ownerEmails[0] || 'eterxnighz@gmail.com');
        }
      } else {
        setErrorMessage(data.error || 'Gagal menghapus akun.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-neutral-900 border border-neutral-700/80 rounded-xl shadow-2xl overflow-hidden text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide uppercase text-neutral-100 flex items-center gap-2">
                Otorisasi Akun Owner / Developer
                <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-semibold">
                  UNLIMITED
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Kelola semua akun email Anda untuk akses tanpa batas & bebas rate limit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Active Session Badge */}
          <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[11px] text-neutral-400 uppercase font-mono tracking-wider">Akun Aktif Saat Ini</div>
                <div className="text-xs font-semibold text-neutral-200 font-mono">{currentUserEmail}</div>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Bypass Limit: ACTIVE
            </span>
          </div>

          {/* Feedback banners */}
          {statusMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{statusMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Add Email Form */}
          <form onSubmit={handleAddEmail} className="space-y-2">
            <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Tambahkan Akun Email Anda Lainnya:</span>
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="misal: akun.kedua@gmail.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={loading}
                className="flex-1 px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-400 font-mono"
              />
              <button
                type="submit"
                disabled={loading || !newEmail.trim()}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambahkan</span>
              </button>
            </div>
          </form>

          {/* Whitelisted Emails List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-medium">
              <span>Daftar Akun Terverifikasi ({emails.length})</span>
              <span className="text-[11px] font-mono text-amber-400/80">Hak Akses: Penuh / Unlimited</span>
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 divide-y divide-neutral-800/40">
              {emails.map((email) => {
                const isCurrent = email.toLowerCase() === currentUserEmail.toLowerCase();
                return (
                  <div
                    key={email}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                      isCurrent
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-xs font-mono select-all">{email}</span>
                      {isCurrent && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 font-semibold font-mono">
                          SESI AKTIF
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => {
                            onSetCurrentUserEmail(email);
                            setStatusMessage(`Sesi aktif dialihkan ke ${email}`);
                          }}
                          className="px-2 py-1 text-[11px] rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
                        >
                          Pilih Sesi
                        </button>
                      )}
                      {emails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEmail(email)}
                          className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                          title="Hapus dari daftar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between text-xs">
          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Semua email di atas dibebaskan dari batas rate limit Cloud Run.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
