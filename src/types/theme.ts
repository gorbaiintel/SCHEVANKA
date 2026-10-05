export type AppTheme = 
  | 'obsidian' 
  | 'white' 
  | 'gold' 
  | 'cyber' 
  | 'emerald' 
  | 'light'
  | 'tokyo_neon'
  | 'sakura'
  | 'nordic_ice'
  | 'midnight_violet'
  | 'warm_mocha';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  subtitle: string;
  badge: string;
  category: 'PRO' | 'AESTHETIC' | 'LIGHT';
  accentColor: string;
  previewBg: string;
  previewBorder: string;
  isLight?: boolean;
}

export type BorderCandleStyle = 'matching' | 'contrast' | 'hollow' | 'gold' | 'neon' | 'monochrome';
export type BorderCandleWidth = '1px' | '1.5px' | '2px';

export type CandleThemeId = 
  | 'tradingview'
  | 'mt5'
  | 'tokyo_neon'
  | 'gold_luxury'
  | 'nordic_ice'
  | 'sakura_dream'
  | 'violet_aurora'
  | 'emerald_mint'
  | 'monochrome_ghost'
  | 'hollow_pro';

export interface CandleThemePreset {
  id: CandleThemeId;
  name: string;
  category: 'CLASSIC' | 'AESTHETIC' | 'PRO';
  description: string;
  bullColor: string;
  bullBorder: string;
  bullWick: string;
  bearColor: string;
  bearBorder: string;
  bearWick: string;
  isHollow?: boolean;
}

export interface BorderCandleSettings {
  enabled: boolean;
  style: BorderCandleStyle;
  width: BorderCandleWidth;
  fillOpacity: number; // 0 to 1 (0 for fully hollow candles)
  candleTheme: CandleThemeId;
}

export const AVAILABLE_THEMES: ThemeConfig[] = [
  {
    id: 'obsidian',
    name: 'Obsidian Dark',
    subtitle: 'Classic Interbank Gold',
    badge: 'DEFAULT',
    category: 'PRO',
    accentColor: '#f59e0b', // Amber 500
    previewBg: '#0b0e14',
    previewBorder: '#1e293b',
  },
  {
    id: 'gold',
    name: 'Schevanka 24K Gold',
    subtitle: 'Bullion Luxe & Amber',
    badge: 'LUXURY',
    category: 'PRO',
    accentColor: '#fbbf24', // Amber 400
    previewBg: '#100d07',
    previewBorder: '#382a13',
  },
  {
    id: 'cyber',
    name: 'Cyber Navy',
    subtitle: 'Reuters / Institutional Blue',
    badge: 'PRO',
    category: 'PRO',
    accentColor: '#38bdf8', // Sky 400
    previewBg: '#070e1b',
    previewBorder: '#162947',
  },
  {
    id: 'emerald',
    name: 'Emerald Matrix',
    subtitle: 'Hedge Fund Tape & Mint',
    badge: 'ALPHA',
    category: 'PRO',
    accentColor: '#10b981', // Emerald 500
    previewBg: '#05130f',
    previewBorder: '#13392b',
  },
  {
    id: 'tokyo_neon',
    name: 'Tokyo Synthwave',
    subtitle: 'Aesthetic Cyberpunk Neon & Magenta',
    badge: 'AESTHETIC',
    category: 'AESTHETIC',
    accentColor: '#06b6d4', // Cyan 500
    previewBg: '#0d0919',
    previewBorder: '#2e1d52',
  },
  {
    id: 'sakura',
    name: 'Sakura Blossom',
    subtitle: 'Aesthetic Dark Plum & Soft Rose',
    badge: 'AESTHETIC',
    category: 'AESTHETIC',
    accentColor: '#f472b6', // Pink 400
    previewBg: '#140d16',
    previewBorder: '#3b2041',
  },
  {
    id: 'nordic_ice',
    name: 'Nordic Frost',
    subtitle: 'Aesthetic Arctic Ice & Deep Navy',
    badge: 'AESTHETIC',
    category: 'AESTHETIC',
    accentColor: '#38bdf8', // Sky 400
    previewBg: '#070f18',
    previewBorder: '#1a334e',
  },
  {
    id: 'midnight_violet',
    name: 'Midnight Nebula',
    subtitle: 'Deep Cosmos & Electric Purple',
    badge: 'AESTHETIC',
    category: 'AESTHETIC',
    accentColor: '#a855f7', // Purple 500
    previewBg: '#0a0614',
    previewBorder: '#28184c',
  },
  {
    id: 'warm_mocha',
    name: 'Espresso Mocha',
    subtitle: 'Dark Roast & Velvet Caramel',
    badge: 'AESTHETIC',
    category: 'AESTHETIC',
    accentColor: '#f59e0b', // Amber 500
    previewBg: '#110c08',
    previewBorder: '#38271a',
  },
  {
    id: 'white',
    name: 'Theme White',
    subtitle: 'Pure Clean TradingView Light',
    badge: 'WHITE',
    category: 'LIGHT',
    accentColor: '#d97706', // Amber 600
    previewBg: '#ffffff',
    previewBorder: '#cbd5e1',
    isLight: true,
  },
  {
    id: 'light',
    name: 'Titanium Slate',
    subtitle: 'Soft High-Contrast Day Mode',
    badge: 'DAYLIGHT',
    category: 'LIGHT',
    accentColor: '#ea580c', // Orange 600
    previewBg: '#f8fafc',
    previewBorder: '#cbd5e1',
    isLight: true,
  },
];

export const CANDLE_THEMES: CandleThemePreset[] = [
  {
    id: 'tradingview',
    name: 'TradingView Classic',
    category: 'CLASSIC',
    description: 'Warna standar industri: Forest Emerald & Crimson Red',
    bullColor: '#089981',
    bullBorder: '#067a67',
    bullWick: '#089981',
    bearColor: '#f23645',
    bearBorder: '#cf2230',
    bearWick: '#f23645',
  },
  {
    id: 'mt5',
    name: 'MetaTrader 5 Direct',
    category: 'CLASSIC',
    description: 'Warna standar terminal MT4/MT5: Bright Lime & Scarlet Red',
    bullColor: '#22c55e',
    bullBorder: '#16a34a',
    bullWick: '#22c55e',
    bearColor: '#ef4444',
    bearBorder: '#dc2626',
    bearWick: '#ef4444',
  },
  {
    id: 'tokyo_neon',
    name: 'Tokyo Synthwave Neon',
    category: 'AESTHETIC',
    description: 'Estetik Cyberpunk: Electric Cyan & Hot Magenta Glow',
    bullColor: '#06b6d4',
    bullBorder: '#0891b2',
    bullWick: '#22d3ee',
    bearColor: '#ec4899',
    bearBorder: '#db2777',
    bearWick: '#f472b6',
  },
  {
    id: 'gold_luxury',
    name: '24K Gold Luxury',
    category: 'AESTHETIC',
    description: 'Estetik Emas Murni: Bullion Gold Amber & Deep Bronze',
    bullColor: '#fbbf24',
    bullBorder: '#d97706',
    bullWick: '#fde047',
    bearColor: '#854d0e',
    bearBorder: '#713f12',
    bearWick: '#a16207',
  },
  {
    id: 'nordic_ice',
    name: 'Nordic Frost & Coral',
    category: 'AESTHETIC',
    description: 'Estetik Skandinavia: Ice Sky Blue & Frosted Salmon',
    bullColor: '#38bdf8',
    bullBorder: '#0284c7',
    bullWick: '#7dd3fc',
    bearColor: '#fb7185',
    bearBorder: '#e11d48',
    bearWick: '#fda4af',
  },
  {
    id: 'sakura_dream',
    name: 'Sakura Pastel Dream',
    category: 'AESTHETIC',
    description: 'Estetik Lembut: Pastel Sakura Pink & Deep Wine Red',
    bullColor: '#f472b6',
    bullBorder: '#db2777',
    bullWick: '#fbcfe8',
    bearColor: '#9f1239',
    bearBorder: '#881337',
    bearWick: '#be123c',
  },
  {
    id: 'violet_aurora',
    name: 'Electric Aurora Violet',
    category: 'AESTHETIC',
    description: 'Estetik Galaksi: Neon Ultraviolet & Ember Crimson',
    bullColor: '#a855f7',
    bullBorder: '#7e22ce',
    bullWick: '#c084fc',
    bearColor: '#f43f5e',
    bearBorder: '#e11d48',
    bearWick: '#fb7185',
  },
  {
    id: 'emerald_mint',
    name: 'Mint & Ruby Hedge',
    category: 'PRO',
    description: 'Estetik Wall Street: Fresh Mint Green & Ruby Red',
    bullColor: '#10b981',
    bullBorder: '#059669',
    bullWick: '#34d399',
    bearColor: '#e11d48',
    bearBorder: '#be123c',
    bearWick: '#f43f5e',
  },
  {
    id: 'monochrome_ghost',
    name: 'Monochrome Minimalist',
    category: 'PRO',
    description: 'Estetik Zen Minimalis: Ghost White & Slate Anthracite',
    bullColor: '#f8fafc',
    bullBorder: '#e2e8f0',
    bullWick: '#ffffff',
    bearColor: '#334155',
    bearBorder: '#1e293b',
    bearWick: '#475569',
  },
  {
    id: 'hollow_pro',
    name: 'Japanese Hollow Candles',
    category: 'PRO',
    description: 'Body Bull Transparan (Rongga) dengan Border Tajam & Solid Bear',
    bullColor: 'transparent',
    bullBorder: '#089981',
    bullWick: '#089981',
    bearColor: '#f23645',
    bearBorder: '#cf2230',
    bearWick: '#f23645',
    isHollow: true,
  },
];
