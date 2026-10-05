import React, { useState } from 'react';
import { Smartphone, Download, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  onOpenModal: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ onOpenModal }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isInstalling, setIsInstalling] = useState(false);

  // If already installed in standalone mode, display a subtle indicator badge that can still open modal for details
  if (isInstalled) {
    return (
      <button
        onClick={onOpenModal}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition"
        title="Terminal terpasang sebagai Android App / PWA"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline font-mono">APK Installed</span>
      </button>
    );
  }

  // If browser fired beforeinstallprompt
  if (isInstallable) {
    return (
      <button
        onClick={async () => {
          setIsInstalling(true);
          const success = await install();
          if (!success) {
            onOpenModal();
          }
          setIsInstalling(false);
        }}
        disabled={isInstalling}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition transform active:scale-95 animate-pulse"
        title="Pasang SCHEVANKA di Android sekarang"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install APK</span>
      </button>
    );
  }

  // Standard Android / PWA modal trigger button in Header
  return (
    <button
      onClick={onOpenModal}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-amber-400 text-xs font-medium transition"
      title="Buka Pusat Instalasi Android APK & WebAPK"
    >
      <Smartphone className="w-3.5 h-3.5 text-amber-400" />
      <span className="hidden sm:inline">Install Android</span>
    </button>
  );
};
