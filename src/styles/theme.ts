import { Platform, StyleSheet } from 'react-native';
import { ThemeMode } from '../types/types';

export type { ThemeMode };

// Cores do sistema — tema escuro (padrao historico do PatriScan)
export const darkColors = {
  // Cores de destaque (uso geral)
  accent: '#00E5A0',
  accentWarn: '#FFB830',
  accentErr: '#FF4D6D',
  accentText: '#000',
  primary: '#534AB7',

  // Cores semanticas (feedback ao usuario)
  success: '#4CAF50',
  warning: '#FFB830',
  error: '#FF4D6D',
  info: '#2196F3',

  // Fundo e superficies
  bg: '#0A0A0F',
  bgLight: '#FFFFFF',
  surface: '#14141C',
  surface2: '#1E1E2A',
  transparent: '#0000000d',

  // Texto
  text: '#F8F8FA',
  textDim: '#8888A0',
  textMuted: '#55556A',

  // Bordas
  border: '#ffffff0A',

  // Tokens semanticos derivados (overlays, hairlines, tracks)
  hairline: '#ffffff0A',
  hairlineFaint: '#ffffff08',
  borderSubtle: '#ffffff15',
  borderSubtle2: '#ffffff10',
  handleBar: '#ffffff22',
  trackBg: '#ffffff0F',
  overlayStrong: '#00000088',
  overlayStrong2: '#00000077',
  overlayMedium: '#00000066',
  iconBoxBg: 'rgba(255,255,255,0.05)',
  hairlineFaint2: '#ffffff06',
  rowStripe: '#ffffff03',

  sucessIcon: '#0F6E56',
  waringIcon: '#854F0B',
} as const;

// 1. CRIAR O TIPO MAPEANDO AS CHAVES PARA STRINGS GENÉRICAS
export type ThemeColors = Record<keyof typeof darkColors, string>;

// 2. APLICAR O NOVO TIPO AO TEMA CLARO
export const lightColors: ThemeColors = {
  accent: '#00B87F',
  accentWarn: '#B3720E',
  accentText: '#000',
  accentErr: '#D5304F',
  primary: '#534AB7',

  success: '#2E8B46',
  warning: '#B3720E',
  error: '#D5304F',
  info: '#1976D2',

  bg: '#F7F7FA',
  bgLight: '#FFFFFF',
  surface: '#FFFFFF',
  surface2: '#F0F0F5',
  transparent: '#0000000d',

  text: '#14141C',
  textDim: '#5B5B70',
  textMuted: '#8C8CA0',

  border: '#00000012',

  hairline: '#00000012',
  hairlineFaint: '#0000000A',
  borderSubtle: '#00000020',
  borderSubtle2: '#00000018',
  handleBar: '#00000030',
  trackBg: '#00000014',
  overlayStrong: '#00000066',
  overlayStrong2: '#00000055',
  overlayMedium: '#00000044',
  iconBoxBg: 'rgba(0,0,0,0.04)',
  hairlineFaint2: '#00000008',
  rowStripe: '#00000005',

  sucessIcon: '#0F6E56',
  waringIcon: '#854F0B',
} as const;

// Mantido por compatibilidade com codigo legado - sempre o tema escuro.
// Prefira usar `useTheme()` para obter as cores do tema ativo.
export const colors = darkColors;

export function getColorsForMode(mode: ThemeMode): ThemeColors {
  return mode === 'light' ? lightColors : darkColors;
}

// ... Restante dos seus criadores de StyleSheet continuam iguais

// Estilos comuns (reutilizáveis)
export const createCommonStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.bg,
    },
    loadingText: {
      marginTop: 16,
      color: colors.textDim,
      fontSize: 16,
    },
    errorText: {
      color: colors.accentErr,
      fontSize: 18,
      marginBottom: 20,
    },
    errorButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
    },
    errorButtonText: {
      color: '#000',
      fontWeight: '700',
    },
  });

// Estilos específicos da tela de scanner
export const createScannerStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    homeBtn: {
      backgroundColor: colors.accent + '22',
      borderWidth: 1,
      borderColor: colors.accent + '55',
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    homeBtnText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '600',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: Platform.OS === 'ios' ? 56 : 36,
      paddingBottom: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
    },
    backBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backBtnText: {
      fontSize: 22,
      color: colors.text,
    },
    headerCenter: {
      flex: 1,
      marginHorizontal: 12,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: 0.2,
    },
    headerSub: {
      fontSize: 11,
      color: colors.textDim,
      marginTop: 1,
    },
    finishBtn: {
      backgroundColor: colors.accent + '22',
      borderWidth: 1,
      borderColor: colors.accent + '55',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
    },
    finishBtnText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '600',
    },
    progressSection: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairlineFaint,
    },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 6,
    },
    progressLabel: {
      fontSize: 12,
      color: colors.textDim,
      fontWeight: '500',
    },
    progressCount: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.accent,
    },
    progressTotal: {
      fontSize: 14,
      fontWeight: '400',
      color: colors.textDim,
    },
    progressTrack: {
      height: 6,
      backgroundColor: colors.trackBg,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.accent,
      borderRadius: 3,
    },
    progressFillComplete: {
      backgroundColor: '#00FF99',
    },
    progressPct: {
      fontSize: 11,
      color: colors.textDim,
      textAlign: 'right',
      marginTop: 4,
    },
    alertsContainer: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 160 : 140,
      left: 16,
      right: 16,
      zIndex: 100,
      gap: 6,
    },
    alertBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      borderLeftWidth: 4,
    },
    alert_success: {
      backgroundColor: colors.accent + '22',
      borderLeftColor: colors.accent,
    },
    alert_warning: {
      backgroundColor: colors.warning + '22',
      borderLeftColor: colors.warning,
    },
    alert_error: {
      backgroundColor: colors.accentErr + '22',
      borderLeftColor: colors.accentErr,
    },
    alertText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '500',
    },
    tabs: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingBottom: 0,
      gap: 4,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: colors.accent,
    },
    tabText: {
      fontSize: 13,
      color: colors.textDim,
      fontWeight: '500',
    },
    tabTextActive: {
      color: colors.accent,
      fontWeight: '700',
    },
    mainArea: {
      flex: 1,
    },
    cameraWrapper: {
      flex: 1,
      backgroundColor: '#000',
      overflow: 'hidden',
    },
    cameraPlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
      gap: 12,
    },
    cameraPlaceholderIcon: {
      fontSize: 48,
    },
    cameraPlaceholderText: {
      color: colors.textDim,
      fontSize: 15,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
    permissionBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
      marginTop: 8,
    },
    permissionBtnText: {
      color: '#000',
      fontWeight: '700',
      fontSize: 14,
    },
    viewfinder: {
      position: 'absolute',
      top: '20%',
      left: '12%',
      right: '12%',
      bottom: '25%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    corner: {
      position: 'absolute',
      width: 28,
      height: 28,
      borderColor: colors.accent,
      borderWidth: 3,
    },
    cornerTL: {
      top: 0,
      left: 0,
      borderRightWidth: 0,
      borderBottomWidth: 0,
    },
    cornerTR: {
      top: 0,
      right: 0,
      borderLeftWidth: 0,
      borderBottomWidth: 0,
    },
    cornerBL: {
      bottom: 0,
      left: 0,
      borderRightWidth: 0,
      borderTopWidth: 0,
    },
    cornerBR: {
      bottom: 0,
      right: 0,
      borderLeftWidth: 0,
      borderTopWidth: 0,
    },
    scanLine: {
      width: '80%',
      height: 2,
      backgroundColor: colors.accent,
      opacity: 0.6,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 6,
    },
    cameraHint: {
      position: 'absolute',
      bottom: 24,
      alignSelf: 'center',
      color: colors.textDim,
      fontSize: 13,
      backgroundColor: colors.overlayMedium,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      overflow: 'hidden',
    },
    manualArea: {
      flex: 1,
      backgroundColor: colors.surface,
      padding: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    manualIcon: {
      fontSize: 52,
      marginBottom: 16,
    },
    manualTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    manualDesc: {
      fontSize: 14,
      color: colors.textDim,
      textAlign: 'center',
      marginBottom: 28,
      lineHeight: 20,
    },
    manualInput: {
      width: '100%',
      backgroundColor: colors.surface2,
      borderWidth: 1.5,
      borderColor: colors.borderSubtle,
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 16,
      fontSize: 18,
      color: colors.text,
      fontWeight: '600',
      textAlign: 'center',
      letterSpacing: 2,
      marginBottom: 16,
    },
    manualSubmitBtn: {
      width: '100%',
      backgroundColor: colors.accent,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    manualSubmitDisabled: {
      opacity: 0.35,
    },
    manualSubmitText: {
      color: '#000',
      fontSize: 16,
      fontWeight: '800',
    },
    lastScannedCard: {
      marginHorizontal: 16,
      marginBottom: 16,
      backgroundColor: colors.surface2,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.accent + '33',
    },
    lastScannedLabel: {
      fontSize: 10,
      color: colors.accent,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: 4,
    },
    lastScannedCode: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    lastScannedDesc: {
      fontSize: 13,
      color: colors.textDim,
      marginBottom: 2,
    },
    lastScannedMeta: {
      fontSize: 12,
      color: colors.textDim,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: colors.overlayStrong,
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: Platform.OS === 'ios' ? 40 : 24,
      maxHeight: '80%',
      borderTopWidth: 1,
      borderColor: colors.hairline,
    },
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.handleBar,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 4,
    },
    modalSubtitle: {
      fontSize: 13,
      color: colors.textDim,
      marginBottom: 20,
    },
    modalDetails: {
      maxHeight: 300,
    },
    modalDetailsContent: {
      gap: 2,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairlineFaint,
      gap: 12,
    },
    detailIcon: {
      fontSize: 18,
      width: 24,
      textAlign: 'center',
      marginTop: 1,
    },
    detailContent: {
      flex: 1,
    },
    detailLabel: {
      fontSize: 11,
      color: colors.textDim,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 2,
    },
    detailValue: {
      fontSize: 15,
      color: colors.text,
      fontWeight: '500',
    },
    detailValueHighlight: {
      color: colors.accent,
      fontSize: 17,
      fontWeight: '800',
      letterSpacing: 1,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    cancelBtn: {
      flex: 1,
      backgroundColor: colors.surface2,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderSubtle2,
    },
    cancelBtnText: {
      color: colors.textDim,
      fontSize: 15,
      fontWeight: '600',
    },
    confirmBtn: {
      flex: 2,
      backgroundColor: colors.accent,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    confirmBtnText: {
      color: '#000',
      fontSize: 15,
      fontWeight: '800',
    },
  });

// Estilos específicos da tela de lista de inventários
export const createInventoryListStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backBtnText: {
      fontSize: 22,
      color: colors.text,
    },
    headerCenter: {
      flex: 1,
      marginHorizontal: 12,
    },
    iconBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.accent + '22',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.accent + '44',
    },
    iconBtnText: {
      fontSize: 16,
      color: colors.accent,
    },
    emptyBtn: {
      backgroundColor: colors.accent + '22',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.accent + '44',
    },
    emptyBtnText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '600',
    },
    header: {
      paddingTop: Platform.OS === 'ios' ? 56 : 36,
      paddingBottom: 16,
      paddingHorizontal: 20,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
    },
    headerSub: {
      fontSize: 13,
      color: colors.textDim,
      marginTop: 2,
    },
    listContent: {
      padding: 16,
      paddingBottom: 110,
    },
    listContentEmpty: {
      flex: 1,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    cardHeaderLeft: {
      flex: 1,
      marginRight: 12,
    },
    cardName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 3,
    },
    cardDate: {
      fontSize: 12,
      color: colors.textDim,
    },
    cardHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    completeBadge: {
      backgroundColor: colors.accent + '22',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: colors.accent + '44',
    },
    completeBadgeText: {
      fontSize: 11,
      color: colors.accent,
      fontWeight: '700',
    },
    deleteBtn: {
      padding: 4,
    },
    deleteBtnText: {
      fontSize: 16,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 6,
    },
    statsLabel: {
      fontSize: 12,
      color: colors.textDim,
    },
    statsCount: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.accent,
    },
    statsCountComplete: {
      color: '#00FF99',
    },
    statsTotal: {
      fontSize: 13,
      fontWeight: '400',
      color: colors.textDim,
    },
    progressTrack: {
      height: 6,
      backgroundColor: colors.trackBg,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.accent,
      borderRadius: 3,
    },
    progressFillComplete: {
      backgroundColor: '#00FF99',
    },
    pctLabel: {
      fontSize: 11,
      color: colors.textDim,
      textAlign: 'right',
      marginTop: 4,
    },
    pctLabelComplete: {
      color: '#00FF99',
    },
    statsError: {
      fontSize: 13,
      color: colors.accentErr,
    },
    fab: {
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 36 : 24,
      right: 20,
      left: 20,
      backgroundColor: colors.accent,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    fabIcon: {
      fontSize: 20,
      color: '#000',
      fontWeight: '800',
      lineHeight: 22,
    },
    fabLabel: {
      fontSize: 16,
      color: '#000',
      fontWeight: '800',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
    },
    emptyIcon: {
      fontSize: 52,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    emptyDesc: {
      fontSize: 14,
      color: colors.textDim,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
  });

// Estilos específicos da tela de detalhe do inventário
export const createInventoryDetailStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    reportBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.accent + '22',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.accent + '44',
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    loadingText: {
      color: colors.textDim,
      fontSize: 15,
      marginTop: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: Platform.OS === 'ios' ? 56 : 36,
      paddingBottom: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
    },
    backBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backBtnText: {
      fontSize: 22,
      color: colors.text,
    },
    headerCenter: {
      flex: 1,
      marginHorizontal: 10,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    headerSub: {
      fontSize: 11,
      color: colors.textDim,
      marginTop: 2,
    },
    resetBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statsSection: {
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairlineFaint,
    },
    statsCards: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 14,
      marginTop: 14,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface2,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
    },
    statCardLabel: {
      fontSize: 10,
      color: colors.textDim,
      fontWeight: '600',
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statCardValue: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
    },
    statCardValueAccent: {
      color: colors.accent,
    },
    statCardValueWarn: {
      color: colors.warning,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    progressTrack: {
      flex: 1,
      height: 6,
      backgroundColor: colors.trackBg,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.accent,
      borderRadius: 3,
    },
    progressFillComplete: {
      backgroundColor: '#00FF99',
    },
    progressPct: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.accent,
      minWidth: 38,
      textAlign: 'right',
    },
    progressPctComplete: {
      color: '#00FF99',
    },
    completeBanner: {
      marginTop: 12,
      backgroundColor: colors.accent + '18',
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.accent + '33',
    },
    completeBannerText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    searchSection: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.bg,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.hairline,
      gap: 8,
    },
    searchIcon: {
      // fontSize: 14,
      // Se precisar, mas geralmente não é necessário com alignItems: 'center'
      // lineHeight: 20
    },
    searchInput: {
      flex: 1,
      paddingVertical: 11,
      fontSize: 14,
      color: colors.text,
    },
    filterTabs: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginBottom: 8,
      gap: 8,
    },
    filterTab: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    filterTabActive: {
      backgroundColor: colors.accent + '22',
      borderColor: colors.accent + '55',
    },
    filterTabText: {
      fontSize: 12,
      color: colors.textDim,
      fontWeight: '500',
    },
    filterTabTextActive: {
      color: colors.accent,
      fontWeight: '700',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 110,
    },
    listContentEmpty: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
      gap: 12,
    },
    emptyIcon: {
      fontSize: 40,
      marginBottom: 12,
    },
    emptyText: {
      color: colors.textDim,
      fontSize: 14,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
    itemRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    itemRowScanned: {
      borderColor: colors.accent + '22',
    },
    itemIndicator: {
      width: 4,
      backgroundColor: colors.borderSubtle2,
    },
    itemIndicatorScanned: {
      backgroundColor: colors.accent,
    },
    itemContent: {
      flex: 1,
      padding: 12,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    itemCode: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    scannedBadgeText: {
      fontSize: 10,
      color: colors.accent,
      fontWeight: '700',
    },
    pendingBadge: {
      backgroundColor: colors.hairline,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    pendingBadgeText: {
      fontSize: 10,
      color: colors.textDim,
      fontWeight: '600',
    },
    itemDesc: {
      fontSize: 13,
      color: colors.textDim,
      marginBottom: 6,
    },
    itemMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    itemMetaText: {
      fontSize: 11,
      color: colors.textDim,
    },
    scanFab: {
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 36 : 24,
      right: 20,
      left: 20,
      backgroundColor: colors.accent,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 10,
      zIndex: 1000, // ✅ Adicionar zIndex alto
      elevation: 5, // ✅ Para Android (sombra)
      shadowColor: '#000', // ✅ Sombra para destacar
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    scanFabComplete: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.accent + '55',
    },
    scanFabLabel: {
      fontSize: 16,
      color: '#000',
      fontWeight: '800',
    },
    scanFabLabelComplete: {
      color: colors.accent, // texto verde sobre fundo escuro
    },
    scannedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(76, 175, 80, 0.15)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
    },

    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 12,
    },
    customFieldsContainer: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    customFieldRow: {
      flexDirection: 'row',
      marginBottom: 2,
    },
    customFieldKey: {
      fontWeight: '600',
      color: colors.textDim,
      marginRight: 4,
    },
    customFieldValue: {
      color: colors.text,
    },
  });
// estilo da tela de Home
export const createHomeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: Platform.OS === 'ios' ? 56 : 36,
      paddingBottom: 14,
      paddingHorizontal: 20,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
    },
    headerSub: {
      fontSize: 13,
      color: colors.textDim,
      marginTop: 2,
    },
    addBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accent + '22',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.accent + '44',
    },
    addBtnText: {
      fontSize: 20,
      color: colors.accent,
      lineHeight: 24,
    },
    searchRow: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.hairline,
      gap: 8,
    },
    searchIcon: {
      fontSize: 14,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 11,
      fontSize: 14,
      color: colors.text,
    },
    filterBtn: {
      width: 46,
      backgroundColor: colors.surface,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    filterBtnActive: {
      borderColor: colors.accent + '55',
      backgroundColor: colors.accent + '15',
    },
    filterBtnText: {
      fontSize: 18,
    },
    filterDot: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
    activeFiltersRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    chip: {
      backgroundColor: colors.accent + '18',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: colors.accent + '44',
    },
    chipText: {
      fontSize: 12,
      color: colors.accent,
      fontWeight: '600',
    },
    chipClear: {
      backgroundColor: '#FF4D6D18',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: '#FF4D6D44',
    },
    chipClearText: {
      fontSize: 12,
      color: '#FF4D6D',
      fontWeight: '600',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    actionBtn: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      minHeight: 70,
    },
    actionBtnPrimary: {
      backgroundColor: colors.accent,
    },
    actionBtnSecondary: {
      backgroundColor: colors.surface2,
      borderWidth: 1.5,
      borderColor: colors.accent + '44',
    },
    actionBtnIconContainer: {
      marginBottom: 4,
    },
    actionBtnIcon: {
      fontSize: 15,
      color: '#000',
      fontWeight: '800',
    },
    actionBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#000',
    },
    counterRow: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    counterText: {
      fontSize: 13,
      color: colors.textDim,
    },
    counterNum: {
      fontWeight: '700',
      color: colors.text,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    listContentEmpty: {
      flex: 1,
    },
    footerLoader: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    footerLoaderText: {
      fontSize: 13,
      color: colors.textDim,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingTop: 60,
    },
    emptyIcon: {
      fontSize: 40,
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    emptyDesc: {
      fontSize: 14,
      color: colors.textDim,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
    itemRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    itemRowScanned: {
      borderColor: colors.accent + '22',
    },
    itemIndicator: {
      width: 4,
      backgroundColor: colors.borderSubtle2,
    },
    itemIndicatorScanned: {
      backgroundColor: colors.accent,
    },
    itemBody: {
      flex: 1,
      padding: 12,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    itemCode: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    badgeOk: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.accent + '22',
      justifyContent: 'center',
      alignItems: 'center',
    },
    badgeOkText: {
      fontSize: 11,
      color: colors.accent,
      fontWeight: '800',
    },
    badgePending: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.hairline,
      justifyContent: 'center',
      alignItems: 'center',
    },
    badgePendingText: {
      fontSize: 11,
      color: colors.textDim,
    },
    itemDesc: {
      fontSize: 13,
      color: colors.textDim,
      marginBottom: 6,
    },
    itemMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    itemMetaText: {
      fontSize: 11,
      color: colors.textDim,
    },
    itemMetaInv: {
      fontSize: 11,
      color: colors.accent + 'AA',
    },
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.overlayStrong2,
    },
    modalSheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: Platform.OS === 'ios' ? 40 : 24,
      maxHeight: '75%',
      borderTopWidth: 1,
      borderColor: colors.hairline,
    },
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.handleBar,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 18,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 16,
    },
    filterGroupLabel: {
      fontSize: 11,
      color: colors.textDim,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 10,
      marginTop: 4,
    },
    filterOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 20,
    },
    filterOption: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    filterOptionActive: {
      backgroundColor: colors.accent + '22',
      borderColor: colors.accent + '55',
    },
    filterOptionText: {
      fontSize: 13,
      color: colors.textDim,
      fontWeight: '500',
    },
    filterOptionTextActive: {
      color: colors.accent,
      fontWeight: '700',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
    },
    btnClear: {
      flex: 1,
      backgroundColor: colors.surface2,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderSubtle2,
    },
    btnClearText: {
      color: colors.textDim,
      fontSize: 14,
      fontWeight: '600',
    },
    btnApply: {
      flex: 2,
      backgroundColor: colors.accent,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    btnApplyText: {
      color: '#000',
      fontSize: 14,
      fontWeight: '800',
    },
  });

// Adicione após  reportDetailStyles
export const createReportDetailStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scanRowUnexpected: {
      backgroundColor: '#FFF3E0',
      borderLeftColor: colors.warning,
      borderLeftWidth: 3,
    },
    itemRowUnexpected: {
      backgroundColor: '#FFF3E0', // fundo levemente alaranjado
    },
    itemIndUnexpected: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#FF9800', // laranja para itens inesperados
      marginRight: 10,
      marginTop: 4,
    },
    iconBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.accent + '22',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.accent + '44',
    },
    iconBtnText: {
      fontSize: 16,
      color: colors.accent,
    },
    exportHeader: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
      alignItems: 'flex-end',
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    loadingText: {
      color: colors.textDim,
      fontSize: 15,
    },
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: Platform.OS === 'ios' ? 56 : 36,
      paddingBottom: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
    },
    backBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backBtnText: {
      fontSize: 22,
      color: colors.text,
    },
    headerCenter: {
      flex: 1,
      marginHorizontal: 10,
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    headerSub: {
      fontSize: 11,
      color: colors.textDim,
      marginTop: 2,
    },
    exportBtns: {
      flexDirection: 'row',
      gap: 6,
    },
    exportBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.borderSubtle2,
    },
    exportBtnPDF: {
      borderColor: colors.warning + '33',
    },
    exportBtnText: {
      fontSize: 12,
      color: colors.textDim,
      fontWeight: '700',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 48,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    sectionAccent: {
      width: 3,
      height: 16,
      backgroundColor: colors.accent,
      borderRadius: 2,
      marginRight: 8,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    overviewRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 14,
    },
    pieWrapper: {
      backgroundColor: '#0A0A0F',
      borderRadius: 12,
      padding: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsColumn: {
      flex: 1,
      gap: 8,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface2,
      borderRadius: 10,
      padding: 10,
    },
    statLabel: {
      fontSize: 9,
      color: colors.textDim,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 3,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
    },
    statValueAccent: {
      color: colors.accent,
    },
    statValueWarn: {
      color: colors.warning,
    },
    progressSection: {
      marginBottom: 12,
    },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    progressLabel: {
      fontSize: 12,
      color: colors.textDim,
    },
    progressPct: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.accent,
    },
    progressPctComplete: {
      color: '#00FF99',
    },
    progressTrack: {
      height: 6,
      backgroundColor: colors.trackBg,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.accent,
      borderRadius: 3,
    },
    progressFillComplete: {
      backgroundColor: '#00FF99',
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    metaItem: {},
    metaLabel: {
      fontSize: 9,
      color: colors.textDim,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    metaValue: {
      fontSize: 12,
      color: colors.text,
      fontWeight: '600',
      marginTop: 2,
    },
    chartDark: {
      backgroundColor: colors.bg,
      borderRadius: 10,
      padding: 8,
      marginBottom: 10,
    },
    chartCaption: {
      fontSize: 11,
      color: colors.textDim,
      textAlign: 'center',
    },

    groupTableHeaderCell: {
      flex: 1,
      fontSize: 9,
      color: colors.textDim,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    groupRow: {
      flexDirection: 'row',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairlineFaint2,
    },
    groupRowEven: {
      backgroundColor: colors.rowStripe,
    },
    groupCell: {
      flex: 1,
      fontSize: 12,
      color: colors.text,
    },
    allFoundBanner: {
      backgroundColor: colors.accent + '18',
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.accent + '33',
    },
    allFoundText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '700',
    },
    itemRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface2,
      borderRadius: 10,
      marginBottom: 6,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    itemRowPending: {
      borderColor: colors.warning + '22',
    },
    itemInd: {
      width: 3,
      backgroundColor: colors.borderSubtle2,
    },
    itemIndPending: {
      backgroundColor: colors.warning,
    },
    itemBody: {
      flex: 1,
      padding: 10,
    },
    itemCode: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    itemDesc: {
      fontSize: 12,
      color: colors.textDim,
      marginBottom: 4,
    },
    itemMeta: {
      flexDirection: 'row',
      gap: 10,
    },
    itemMetaTxt: {
      fontSize: 11,
      color: colors.textDim,
    },
    scanRow: {
      flexDirection: 'row',
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairlineFaint2,
    },
    scanIndex: {
      fontSize: 11,
      color: colors.textDim,
      width: 24,
      textAlign: 'right',
      marginTop: 2,
    },
    scanBody: {
      flex: 1,
    },
    scanHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    scanCode: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    scanTime: {
      fontSize: 11,
      color: colors.accent,
    },
    scanDelta: {
      color: colors.textDim,
    },
    scanDesc: {
      fontSize: 12,
      color: colors.textDim,
      marginBottom: 2,
    },
    scanMeta: {
      fontSize: 11,
      color: colors.textDim,
    },
    emptyText: {
      fontSize: 12,
      color: colors.textDim,
      textAlign: 'center',
      paddingVertical: 12,
    },
    itemIndScanned: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.success, // verde
      marginRight: 10,
      marginTop: 4,
    },
  });

export const createCreateInventoryStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backBtnText: {
      fontSize: 22,
      color: colors.text,
    },
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: Platform.OS === 'ios' ? 56 : 36,
      paddingBottom: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
    },
    stepContainer: {
      flex: 1,
      padding: 20,
    },
    label: {
      fontSize: 20,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 20,
    },
    actionButton: {
      backgroundColor: colors.accent,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginVertical: 10,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    actionButtonText: {
      color: '#000',
      fontSize: 16,
      fontWeight: '600',
    },
    hint: {
      fontSize: 14,
      color: colors.textDim,
      textAlign: 'center',
      marginTop: 20,
    },
    stepTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    stepDescription: {
      fontSize: 14,
      color: colors.textDim,
      marginBottom: 20,
    },
    mappingList: {
      flex: 1,
      marginBottom: 20,
    },
    mappingItem: {
      backgroundColor: colors.surface,
      padding: 15,
      borderRadius: 8,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    csvHeader: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 10,
    },
    mappingControls: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    fieldButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.surface2,
      marginRight: 8,
      marginBottom: 8,
    },
    fieldButtonActive: {
      backgroundColor: colors.accent,
    },
    fieldButtonText: {
      fontSize: 12,
      color: colors.textDim,
    },
    fieldButtonTextActive: {
      color: '#000',
    },
    confidenceText: {
      fontSize: 12,
      color: colors.textDim,
      marginTop: 8,
    },
    statsCard: {
      backgroundColor: colors.surface,
      padding: 15,
      borderRadius: 8,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    statsTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 10,
    },
    statsText: {
      fontSize: 14,
      color: colors.textDim,
      marginBottom: 5,
    },
    previewTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 10,
    },
    previewList: {
      flex: 1,
      marginBottom: 20,
    },
    previewItem: {
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    previewText: {
      fontSize: 14,
      color: colors.textDim,
      marginBottom: 4,
    },
    progressBar: {
      width: '100%',
      height: 8,
      backgroundColor: colors.surface2,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.accent,
      borderRadius: 4,
    },
    errorText: {
      color: colors.accentErr,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 10,
    },
    processingBox: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      marginTop: 20,
    },
    processingText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },

    progressPercent: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.accent,
    },
  });

export const createReportsStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.bg, // ou colors.card
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 24,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    modalSubtitle: {
      fontSize: 14,
      color: colors.textDim,
      marginBottom: 16,
    },
    modalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalOptionText: {
      fontSize: 16,
      color: colors.text,
      marginLeft: 12,
    },
    modalCancel: {
      marginTop: 12,
      alignItems: 'center',
      paddingVertical: 12,
    },
    modalCancelText: {
      fontSize: 16,
      color: colors.accentErr,
    },
    backBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backBtnText: {
      fontSize: 22,
      color: colors.text,
    },
    headerCenter: {
      flex: 1,
      marginHorizontal: 12,
      justifyContent: 'center', // ← centraliza verticalmente os textos
      minHeight: 50, // ← garante altura mínima
      overflow: 'visible',
    },
    iconBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.accent + '22',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.accent + '44',
    },
    iconBtnText: {
      fontSize: 16,
      color: colors.accent,
    },
    emptyBtn: {
      backgroundColor: colors.accent + '22',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.accent + '44',
    },
    emptyBtnText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '600',
    },
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    loadingText: {
      color: colors.textDim,
      fontSize: 15,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: Platform.OS === 'ios' ? 56 : 36,
      paddingBottom: 14,
      paddingHorizontal: 20,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
      overflow: 'visible', // ← garante que nada seja cortado
      minHeight: 80, // ← altura mínima para o cabeçalho
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: 0,
    },
    headerSub: {
      fontSize: 13,
      color: colors.textDim,
      marginTop: 2,
    },
    listContent: {
      padding: 16,
      paddingBottom: 40,
    },
    listEmpty: {
      flex: 1,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingTop: 80,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    emptyDesc: {
      fontSize: 14,
      color: colors.textDim,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
    card: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginBottom: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    cardAccent: {
      width: 4,
      backgroundColor: '#534AB7',
    },
    cardAccentComplete: {
      backgroundColor: colors.accent,
    },
    cardBody: {
      flex: 1,
      padding: 14,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    cardName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    badgeComplete: {
      backgroundColor: colors.accent + '22',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: colors.accent + '44',
    },
    badgeCompleteText: {
      fontSize: 10,
      color: colors.accent,
      fontWeight: '700',
    },
    badgeInProgress: {
      backgroundColor: '#534AB722',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: '#534AB744',
    },
    badgeInProgressText: {
      fontSize: 10,
      color: '#AFA9EC',
      fontWeight: '700',
    },
    miniStats: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
    },
    miniStat: {
      flex: 1,
      backgroundColor: colors.surface2,
      borderRadius: 8,
      padding: 8,
      alignItems: 'center',
    },
    miniStatLabel: {
      fontSize: 9,
      color: colors.textDim,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 3,
    },
    miniStatValue: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    miniStatAccent: {
      color: colors.accent,
    },
    miniStatWarn: {
      color: colors.warning,
    },
    progressTrack: {
      height: 5,
      backgroundColor: colors.trackBg,
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#534AB7',
      borderRadius: 3,
    },
    progressFillComplete: {
      backgroundColor: colors.accent,
    },
    duration: {
      fontSize: 11,
      color: colors.textDim,
      marginBottom: 10,
    },
    durationText: {
      fontSize: 12,
      color: colors.textDim, // ou '#9B9BAA' dependendo de como está o seu arquivo
      marginLeft: 4,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionBtn: {
      flex: 1,
      backgroundColor: colors.surface2,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    actionBtnExport: {
      flex: 0,
      paddingHorizontal: 16,
    },
    actionBtnText: {
      fontSize: 12,
      color: colors.textDim,
      fontWeight: '600',
    },
  });

export const createManualInventoryStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    duplicateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 12,
    },

    backBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backBtnText: {
      fontSize: 22,
      color: colors.text,
    },
    homeBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.accent + '22',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.accent + '44',
    },
    homeBtnText: {
      fontSize: 16,
      color: colors.accent,
    },
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: Platform.OS === 'ios' ? 56 : 36,
      paddingBottom: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
    },

    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textDim,
      marginBottom: 4,
      marginTop: 8,
    },
    input: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      color: colors.text,
    },
    textArea: {
      minHeight: 60,
      textAlignVertical: 'top',
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    halfField: {
      flex: 1,
    },
    addButton: {
      backgroundColor: colors.accent + '22',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.accent + '44',
    },
    addButtonText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '600',
    },
    itemCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
    },
    itemTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.accent,
    },
    removeButton: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    removeButtonText: {
      color: colors.accentErr,
      fontSize: 12,
    },
    saveButton: {
      backgroundColor: colors.accent,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 32,
    },
    saveButtonText: {
      color: '#000',
      fontSize: 16,
      fontWeight: '700',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    statusPicker: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    statusOption: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    statusOptionActive: {
      backgroundColor: colors.accent + '22',
      borderColor: colors.accent + '55',
    },
    statusOptionText: {
      fontSize: 12,
      color: colors.textDim,
    },
    statusOptionTextActive: {
      color: colors.accent,
      fontWeight: '600',
    },
  });

export const createAboutStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: Platform.OS === 'ios' ? 56 : 36,
      paddingBottom: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
    },
    backBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backBtnText: {
      fontSize: 22,
      color: colors.text,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    appName: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.accent,
      marginBottom: 8,
    },
    version: {
      fontSize: 14,
      color: colors.textDim,
      marginBottom: 24,
    },
    description: {
      fontSize: 16,
      color: colors.text,
      textAlign: 'center',
      lineHeight: 24,
    },
  });

export const createLocalStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    hint: {
      color: colors.textDim,
      fontSize: 12,
      marginBottom: 10,
      lineHeight: 18,
    },

    // Schema field row
    schemaFieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      padding: 10,
      borderRadius: 8,
      marginBottom: 8,
    },
    schemaFieldName: {
      flex: 1,
      color: colors.text,
      fontWeight: '600',
      fontSize: 14,
    },
    removeFieldBtn: {
      color: colors.warning,
      fontSize: 16,
      paddingHorizontal: 4,
    },

    // Add field row
    addFieldRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
      alignItems: 'center',
    },
    addFieldInput: {
      flex: 1,
      marginBottom: 0,
    },
    addFieldBtn: {
      backgroundColor: colors.accent ?? colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 8,
      justifyContent: 'center',
    },
    addFieldBtnText: {
      color: '#000',
      fontWeight: '700',
      fontSize: 13,
    },

    // Status chips
    statusRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    statusChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    statusChipActive: {
      borderColor: colors.accent ?? colors.primary,
      backgroundColor: colors.accent ?? colors.primary,
    },
    statusChipText: {
      color: colors.textDim,
      fontSize: 12,
    },
    statusChipTextActive: {
      color: '#000',
      fontWeight: '700',
    },

    // Custom fields section separator
    customFieldsSection: {
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    customFieldsSectionTitle: {
      color: colors.textDim,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 10,
    },
  });
export const createItemDetailStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      backgroundColor: colors.bg,
    },
    backBtn: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      flex: 1,
      textAlign: 'center',
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
      paddingBottom: 32,
    },
    statusSection: {
      alignItems: 'center',
      marginBottom: 24,
    },
    statusBadgeScanned: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.success + '20',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 8,
    },
    statusTextScanned: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.success,
    },
    statusBadgePending: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.warning + '20',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 8,
    },
    statusTextPending: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.warning,
    },
    section: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 12,
      color: colors.textDim,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    codeValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.accent,
      letterSpacing: 1,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    fieldIcon: {
      width: 32,
      alignItems: 'center',
      marginTop: 2,
    },
    fieldContent: {
      flex: 1,
      marginLeft: 8,
    },
    fieldLabel: {
      fontSize: 12,
      color: colors.textDim,
      marginBottom: 2,
    },
    fieldValue: {
      fontSize: 16,
      color: colors.text,
    },
  });

export const createSettingsStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 50,
      paddingBottom: 20,
      backgroundColor: colors.bg,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    section: {
      marginTop: 24,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textDim,
      marginBottom: 8,
      marginLeft: 8,
      letterSpacing: 1,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.iconBoxBg,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    textCol: {
      flex: 1,
      marginRight: 12,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    settingDesc: {
      fontSize: 13,
      color: colors.textDim,
    },
    dangerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    dangerIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.warning + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    dangerTextCol: {
      flex: 1,
      marginRight: 12,
    },
    dangerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.warning,
      marginBottom: 2,
    },
    dangerDesc: {
      fontSize: 13,
      color: colors.textDim,
    },
    aboutSection: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 40,
      marginBottom: 60,
    },
    appName: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      marginTop: 12,
    },
    appVersion: {
      fontSize: 13,
      color: colors.textDim,
      marginTop: 4,
    },
  });
