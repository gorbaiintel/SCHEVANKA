import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  AppTheme, 
  AVAILABLE_THEMES, 
  BorderCandleSettings, 
  ThemeConfig,
  CandleThemeId,
  CANDLE_THEMES,
  CandleThemePreset
} from '../types/theme';

interface ThemeContextType {
  theme: AppTheme;
  themeConfig: ThemeConfig;
  setTheme: (theme: AppTheme) => void;
  borderSettings: BorderCandleSettings;
  setBorderSettings: React.Dispatch<React.SetStateAction<BorderCandleSettings>>;
  updateBorderSettings: (partial: Partial<BorderCandleSettings>) => void;
  candleTheme: CandleThemeId;
  candleThemeConfig: CandleThemePreset;
  setCandleTheme: (id: CandleThemeId) => void;
}

const DEFAULT_BORDER_SETTINGS: BorderCandleSettings = {
  enabled: true,
  style: 'matching',
  width: '1px',
  fillOpacity: 1,
  candleTheme: 'tradingview',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem('aura_terminal_theme');
      const validThemes = AVAILABLE_THEMES.map(t => t.id);
      if (saved && validThemes.includes(saved as AppTheme)) {
        return saved as AppTheme;
      }
    } catch {
      // fallback
    }
    return 'obsidian';
  });

  const [borderSettings, setBorderSettings] = useState<BorderCandleSettings>(() => {
    try {
      const saved = localStorage.getItem('aura_border_candle_settings');
      if (saved) {
        return { ...DEFAULT_BORDER_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_BORDER_SETTINGS;
  });

  // Apply theme to HTML root element
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'white' || theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    try {
      localStorage.setItem('aura_terminal_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Persist border candle settings
  useEffect(() => {
    try {
      localStorage.setItem('aura_border_candle_settings', JSON.stringify(borderSettings));
    } catch {
      // ignore
    }
  }, [borderSettings]);

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
  };

  const updateBorderSettings = (partial: Partial<BorderCandleSettings>) => {
    setBorderSettings((prev) => ({ ...prev, ...partial }));
  };

  const setCandleTheme = (id: CandleThemeId) => {
    setBorderSettings((prev) => ({ ...prev, candleTheme: id }));
  };

  const currentConfig = AVAILABLE_THEMES.find((t) => t.id === theme) || AVAILABLE_THEMES[0];
  const currentCandleConfig = CANDLE_THEMES.find((c) => c.id === borderSettings.candleTheme) || CANDLE_THEMES[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeConfig: currentConfig,
        setTheme,
        borderSettings,
        setBorderSettings,
        updateBorderSettings,
        candleTheme: borderSettings.candleTheme || 'tradingview',
        candleThemeConfig: currentCandleConfig,
        setCandleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
