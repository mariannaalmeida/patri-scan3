/**
 * Contexto de tema (claro/escuro) do PatriScan.
 *
 * Fornece as cores ativas e todas as folhas de estilo (memoizadas) já
 * resolvidas para o tema atual, além de uma função para alternar o tema.
 * A preferência é persistida via StorageService (AppSettings.theme).
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StorageService } from '../services/StorageService';
import {
  createAboutStyles,
  createCommonStyles,
  createCreateInventoryStyles,
  createHomeStyles,
  createInventoryDetailStyles,
  createInventoryListStyles,
  createItemDetailStyles,
  createLocalStyles,
  createManualInventoryStyles,
  createReportDetailStyles,
  createReportsStyles,
  createScannerStyles,
  createSettingsStyles,
  darkColors,
  getColorsForMode,
  lightColors,
  ThemeColors,
  ThemeMode,
} from '../styles/theme';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  isLoading: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;

  // Folhas de estilo já resolvidas para o tema ativo
  commonStyles: ReturnType<typeof createCommonStyles>;
  scannerStyles: ReturnType<typeof createScannerStyles>;
  inventoryListStyles: ReturnType<typeof createInventoryListStyles>;
  inventoryDetailStyles: ReturnType<typeof createInventoryDetailStyles>;
  homeStyles: ReturnType<typeof createHomeStyles>;
  reportDetailStyles: ReturnType<typeof createReportDetailStyles>;
  createInventoryStyles: ReturnType<typeof createCreateInventoryStyles>;
  reportsStyles: ReturnType<typeof createReportsStyles>;
  manualInventoryStyles: ReturnType<typeof createManualInventoryStyles>;
  aboutStyles: ReturnType<typeof createAboutStyles>;
  localStyles: ReturnType<typeof createLocalStyles>;
  itemDetailStyles: ReturnType<typeof createItemDetailStyles>;
  settingsStyles: ReturnType<typeof createSettingsStyles>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [isLoading, setIsLoading] = useState(true);

  // Carrega a preferência salva ao iniciar o app
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await StorageService.getSettings();
        if (mounted && result.ok && result.value.theme) {
          setModeState(result.value.theme);
        }
      } catch (error) {
        console.error('Erro ao carregar preferência de tema:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    // Persiste mesclando com as configurações atuais para não sobrescrever
    // outras preferências (ex.: vibração).
    (async () => {
      const current = await StorageService.getSettings();
      const base = current.ok ? current.value : StorageService.DEFAULT_SETTINGS;
      await StorageService.saveSettings({ ...base, theme: newMode });
    })();
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const colors = useMemo(() => getColorsForMode(mode), [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      colors,
      isLoading,
      setMode,
      toggleTheme,
      commonStyles: createCommonStyles(colors),
      scannerStyles: createScannerStyles(colors),
      inventoryListStyles: createInventoryListStyles(colors),
      inventoryDetailStyles: createInventoryDetailStyles(colors),
      homeStyles: createHomeStyles(colors),
      reportDetailStyles: createReportDetailStyles(colors),
      createInventoryStyles: createCreateInventoryStyles(colors),
      reportsStyles: createReportsStyles(colors),
      manualInventoryStyles: createManualInventoryStyles(colors),
      aboutStyles: createAboutStyles(colors),
      localStyles: createLocalStyles(colors),
      itemDetailStyles: createItemDetailStyles(colors),
      settingsStyles: createSettingsStyles(colors),
    }),
    [mode, colors, isLoading, setMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme() deve ser usado dentro de um <ThemeProvider>.');
  }
  return ctx;
}

// Reexporta paletas estáticas para casos pontuais (ex.: fora de componentes)
export { darkColors, lightColors };
