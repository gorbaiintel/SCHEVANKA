import React, { useState } from 'react';
import { 
  X, 
  Palette, 
  Sparkles, 
  Check, 
  Layers, 
  Sliders, 
  Eye, 
  Sun, 
  Moon, 
  RotateCcw,
  Zap,
  Flame,
  Award
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { 
  AVAILABLE_THEMES, 
  CANDLE_THEMES, 
  AppTheme, 
  CandleThemeId, 
  BorderCandleStyle, 
  BorderCandleWidth 
} from '../../types/theme';
import { sound } from '../../services/soundService';

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { 
    theme, 
    setTheme, 
    themeConfig, 
    borderSettings, 
    updateBorderSettings, 
    candleTheme, 
    setCandleTheme 
  } = useTheme();

  const [activeTab, setActiveTab] = useState<'ui' | 'candle' | 'borders'>('ui');

  if (!isOpen) return null;

  const handleSelectTheme = (tId: AppTheme) => {
    setTheme(tId);
    sound.playNodeTrigger();
  };

  const handleSelectCandleTheme = (cId: CandleThemeId) => {
    setCandleTheme(cId);
    sound.playNodeTrigger();
  };

  const handleResetDefaults = () => {
    setTheme('obsidian');
    updateBorderSettings({
      enabled: true,
      style: 'matching',
      width: '1px',
      fillOpacity: 1,
      candleTheme: 'tradingview',
    });
    sound.playNodeTrigger();
  };

  // Filter themes by category
  const aestheticThemes = AVAILABLE_THEMES.filter(t => t.category === 'AESTHETIC');
  const proThemes = AVAILABLE_THEMES.filter(t => t.category === 'PRO');
  const lightThemes = AVAILABLE_THEMES.filter(t => t.category === 'LIGHT');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150 select-none overflow-y-auto">
      <div className="bg-[#0b0e14] border border-neutral-700/90 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden text-xs flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-[#0f141c]/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-pink-500/20 border border-amber-500/40 text-amber-300">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 tracking-tight">
                  Studio Tema UI & Candle Estetik
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500/20 to-cyan-500/20 border border-pink-500/30 text-pink-300 font-mono text-[10px] font-bold">
                  11 UI · 10 Candle Themes
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Kustomisasi tampilan terminal, warna candlestick, border, dan palet estetik real-time
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
        <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-neutral-800 bg-[#0d121a] shrink-0 font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('ui')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ui'
                  ? 'bg-neutral-800 text-amber-300 shadow-sm border border-neutral-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-neutral-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>Tema Terminal ({AVAILABLE_THEMES.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('candle')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'candle'
                  ? 'bg-neutral-800 text-cyan-300 shadow-sm border border-neutral-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-neutral-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Warna Candle ({CANDLE_THEMES.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('borders')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'borders'
                  ? 'bg-neutral-800 text-pink-300 shadow-sm border border-neutral-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-neutral-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-pink-400" />
              <span>Gaya Border & Hollow</span>
            </button>
          </div>

          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-neutral-800 px-2 py-1 rounded transition-colors cursor-pointer"
            title="Reset seluruh pengaturan ke default"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset Default</span>
          </button>
        </div>

        {/* Tab 1: Terminal UI Themes */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {activeTab === 'ui' && (
            <div className="space-y-4">
              {/* Aesthetic Themes Section */}
              <div>
                <div className="flex items-center gap-2 mb-2 font-mono">
                  <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
                  <span className="text-xs font-bold text-pink-300 uppercase tracking-wider">
                    Tema Estetik & Modern
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    (Tokyo Synthwave, Sakura, Nordic Frost, Nebula, Mocha)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {aestheticThemes.map((t) => {
                    const isSelected = theme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSelectTheme(t.id)}
                        className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer group relative overflow-hidden ${
                          isSelected
                            ? 'bg-neutral-800/90 border-amber-500/70 shadow-lg text-white ring-1 ring-amber-500/30'
                            : 'bg-neutral-900/60 border-neutral-800 text-slate-300 hover:bg-neutral-800/40 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-4 h-4 rounded-full border border-white/20 shadow-sm flex items-center justify-center shrink-0"
                              style={{ backgroundColor: t.previewBg }}
                            >
                              <span 
                                className="w-1.5 h-1.5 rounded-full" 
                                style={{ backgroundColor: t.accentColor }} 
                              />
                            </span>
                            <span className="font-bold text-xs text-slate-100">{t.name}</span>
                          </div>
                          {isSelected ? (
                            <span className="p-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                              <Check className="w-3 h-3" />
                            </span>
                          ) : (
                            <span 
                              className="w-2 h-2 rounded-full border border-black/30"
                              style={{ backgroundColor: t.accentColor }}
                            />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                          {t.subtitle}
                        </p>
                        {/* Mini UI color preview strip */}
                        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-neutral-800/80">
                          <div className="h-2 w-8 rounded-full border border-white/10" style={{ backgroundColor: t.previewBg }} />
                          <div className="h-2 w-8 rounded-full" style={{ backgroundColor: t.accentColor }} />
                          <div className="h-2 w-8 rounded-full" style={{ backgroundColor: t.previewBorder }} />
                          <span className="ml-auto text-[9px] font-mono text-pink-400 font-bold px-1.5 py-0.2 bg-pink-500/10 rounded border border-pink-500/20">
                            {t.badge}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pro / Interbank Themes */}
              <div>
                <div className="flex items-center gap-2 mb-2 font-mono">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Tema Profesional Interbank & CFD
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {proThemes.map((t) => {
                    const isSelected = theme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSelectTheme(t.id)}
                        className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer group ${
                          isSelected
                            ? 'bg-neutral-800/90 border-amber-500/70 shadow-lg text-white ring-1 ring-amber-500/30'
                            : 'bg-neutral-900/60 border-neutral-800 text-slate-300 hover:bg-neutral-800/40 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-3.5 h-3.5 rounded-full border border-white/20"
                              style={{ backgroundColor: t.previewBg }}
                            />
                            <span className="font-bold text-xs text-slate-100">{t.name}</span>
                          </div>
                          {isSelected && <Check className="w-3 h-3 text-amber-400" />}
                        </div>
                        <p className="text-[10px] text-slate-400">{t.subtitle}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Light Themes */}
              <div>
                <div className="flex items-center gap-2 mb-2 font-mono">
                  <Sun className="w-3 h-3 text-amber-400" />
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Tema Terang (Light Mode)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {lightThemes.map((t) => {
                    const isSelected = theme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSelectTheme(t.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-neutral-800/90 border-amber-500/70 shadow-lg text-white'
                            : 'bg-neutral-900/60 border-neutral-800 text-slate-300 hover:bg-neutral-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-white border border-slate-300 shadow-sm flex items-center justify-center">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.accentColor }} />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-100">{t.name}</div>
                            <div className="text-[10px] text-slate-400">{t.subtitle}</div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Candlestick Palettes */}
          {activeTab === 'candle' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Pilih Palet Warna Candlestick</h3>
                  <p className="text-[11px] text-slate-400">
                    Warna candle akan diterapkan langsung pada chart real-time
                  </p>
                </div>
                <span className="font-mono text-[10px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                  Aktif: {CANDLE_THEMES.find(c => c.id === borderSettings.candleTheme)?.name}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CANDLE_THEMES.map((c) => {
                  const isSelected = borderSettings.candleTheme === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelectCandleTheme(c.id)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-neutral-800/90 border-cyan-500/70 shadow-lg ring-1 ring-cyan-500/30'
                          : 'bg-neutral-900/60 border-neutral-800 text-slate-300 hover:bg-neutral-800/40 hover:border-neutral-700'
                      }`}
                    >
                      <div className="space-y-1 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-100 group-hover:text-cyan-300 transition-colors">
                            {c.name}
                          </span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                            c.category === 'AESTHETIC' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-neutral-800 text-slate-400'
                          }`}>
                            {c.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug">
                          {c.description}
                        </p>
                      </div>

                      {/* Visual Mini Candlestick Preview */}
                      <div className="flex items-center gap-3 bg-neutral-950/80 px-3 py-2 rounded-lg border border-neutral-800 shrink-0">
                        {/* Bull Candle */}
                        <div className="flex flex-col items-center">
                          <div className="w-[1.5px] h-2" style={{ backgroundColor: c.bullWick }} />
                          <div 
                            className="w-3.5 h-6 rounded-xs" 
                            style={{ 
                              backgroundColor: c.isHollow ? 'transparent' : c.bullColor, 
                              borderColor: c.bullBorder,
                              borderWidth: '1.5px',
                              borderStyle: 'solid'
                            }} 
                          />
                          <div className="w-[1.5px] h-2" style={{ backgroundColor: c.bullWick }} />
                        </div>

                        {/* Bear Candle */}
                        <div className="flex flex-col items-center">
                          <div className="w-[1.5px] h-2" style={{ backgroundColor: c.bearWick }} />
                          <div 
                            className="w-3.5 h-6 rounded-xs" 
                            style={{ 
                              backgroundColor: c.bearColor, 
                              borderColor: c.bearBorder,
                              borderWidth: '1.5px',
                              borderStyle: 'solid'
                            }} 
                          />
                          <div className="w-[1.5px] h-2" style={{ backgroundColor: c.bearWick }} />
                        </div>

                        {isSelected && (
                          <div className="ml-1 text-cyan-400">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Borders & Hollow Styling */}
          {activeTab === 'borders' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-bold text-slate-100 text-sm mb-1">Gaya Border & Struktur Candlestick</h3>
                <p className="text-[11px] text-slate-400">
                  Sesuaikan ketajaman garis tepi, hollow body, dan kontras visual pada grafik
                </p>
              </div>

              {/* Border Styles */}
              <div className="space-y-2">
                <label className="text-slate-300 font-semibold block text-xs">
                  Gaya Border Garis Tepi
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'matching', label: 'Matching Tone', desc: 'Border serasi dengan warna body' },
                    { id: 'contrast', label: 'High Contrast', desc: 'Garis tepi kontras tajam' },
                    { id: 'hollow', label: 'Japanese Hollow', desc: 'Body bull berongga transparan' },
                    { id: 'neon', label: 'Neon Cyber Glow', desc: 'Border cyan & magenta menyala' },
                    { id: 'gold', label: '24K Gold Accent', desc: 'Border beraksen emas mulia' },
                    { id: 'monochrome', label: 'Monochrome Edge', desc: 'Border putih / abu-abu tegas' },
                  ].map((styleItem) => {
                    const isSelected = borderSettings.style === styleItem.id;
                    return (
                      <button
                        key={styleItem.id}
                        onClick={() => {
                          updateBorderSettings({ style: styleItem.id as BorderCandleStyle });
                          sound.playNodeTrigger();
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-neutral-800/90 border-pink-500/70 text-white shadow-md'
                            : 'bg-neutral-900/60 border-neutral-800 text-slate-400 hover:bg-neutral-800/40 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-slate-100">{styleItem.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-pink-400" />}
                        </div>
                        <p className="text-[10px] text-slate-400">{styleItem.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Border Width Selection */}
              <div className="space-y-2">
                <label className="text-slate-300 font-semibold block text-xs">
                  Ketebalan Garis Tepi (Stroke Width)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['1px', '1.5px', '2px'] as BorderCandleWidth[]).map((w) => {
                    const isSelected = borderSettings.width === w;
                    return (
                      <button
                        key={w}
                        onClick={() => {
                          updateBorderSettings({ width: w });
                          sound.playNodeTrigger();
                        }}
                        className={`py-2 px-3 rounded-lg border text-center font-mono font-bold text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-neutral-800 border-pink-500/60 text-pink-300 shadow-sm'
                            : 'bg-neutral-900/60 border-neutral-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {w} {w === '1px' ? '(Crisp Ultra-HD)' : w === '1.5px' ? '(Optimal)' : '(Tebal / Bold)'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fill Opacity Slider */}
              <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold text-xs">
                    Opasitas Isi Body Candle (Fill Opacity)
                  </label>
                  <span className="font-mono text-xs text-amber-400 font-bold">
                    {(borderSettings.fillOpacity * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={borderSettings.fillOpacity}
                  onChange={(e) => updateBorderSettings({ fillOpacity: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>20% (Semi-Hollow)</span>
                  <span>60% (Medium)</span>
                  <span>100% (Solid Tajam)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-[#0f141c]/90 shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Semua perubahan langsung tersimpan di preferensi browser Anda</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Tutup Studio Tema
          </button>
        </div>
      </div>
    </div>
  );
};
