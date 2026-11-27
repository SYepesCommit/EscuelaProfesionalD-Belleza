'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type UiDisplayMode = 'desktop' | 'touch';
export type UiThemeMode = 'light' | 'dark';

interface UiModeContextValue {
  mode: UiDisplayMode;
  isTouchMode: boolean;
  setMode: (mode: UiDisplayMode) => void;
  toggleMode: () => void;
  theme: UiThemeMode;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const DISPLAY_STORAGE_KEY = 'epb_terminal_display_mode';
const THEME_STORAGE_KEY = 'epb_terminal_theme_mode';

const UiModeContext = createContext<UiModeContextValue>({
  mode: 'desktop',
  isTouchMode: false,
  setMode: () => {},
  toggleMode: () => {},
  theme: 'light',
  isDarkMode: false,
  toggleTheme: () => {},
});

export function UiModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<UiDisplayMode>('desktop');
  const [theme, setThemeState] = useState<UiThemeMode>('light');

  useEffect(() => {
    try {
      const savedMode = window.localStorage.getItem(
        DISPLAY_STORAGE_KEY
      ) as UiDisplayMode | null;
      if (savedMode === 'touch' || savedMode === 'desktop') {
        setModeState(savedMode);
        document.documentElement.classList.toggle('pos-touch-mode', savedMode === 'touch');
      }

      const savedTheme = window.localStorage.getItem(
        THEME_STORAGE_KEY
      ) as UiThemeMode | null;
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setThemeState(savedTheme);
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const setMode = (newMode: UiDisplayMode) => {
    setModeState(newMode);
    try {
      window.localStorage.setItem(DISPLAY_STORAGE_KEY, newMode);
      document.documentElement.classList.toggle('pos-touch-mode', newMode === 'touch');
    } catch {
      // ignore
    }
  };

  const toggleMode = () => {
    setMode(mode === 'desktop' ? 'touch' : 'desktop');
  };

  const toggleTheme = () => {
    const nextTheme: UiThemeMode = theme === 'light' ? 'dark' : 'light';
    setThemeState(nextTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    } catch {
      // ignore
    }
  };

  return (
    <UiModeContext.Provider
      value={{
        mode,
        isTouchMode: mode === 'touch',
        setMode,
        toggleMode,
        theme,
        isDarkMode: theme === 'dark',
        toggleTheme,
      }}
    >
      {children}
    </UiModeContext.Provider>
  );
}

export function useUiMode(): UiModeContextValue {
  return useContext(UiModeContext);
}
