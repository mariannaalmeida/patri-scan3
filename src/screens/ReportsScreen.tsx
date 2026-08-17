/**
 * ReportsScreen.tsx
 *
 * Lista todos os inventários com acesso rápido aos relatórios.
 * Permite exportar CSV ou PDF diretamente desta tela.
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useTheme } from '../contexts/ThemeContext';
import { AnalyticsService, InventoryReport } from '../services/AnalyticsService';
import { CSVExportService } from '../services/CsvExportService';
import { ReportService } from '../services/ReportService';
import { StorageService } from '../services/StorageService';
import { Inventory, Result, RootStackParamList } from '../types/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface ReportRow {
  inventory: Inventory;
  report: InventoryReport;
}

interface DialogConfig {
  visible: boolean;
  title: string;
  message: string;
  buttons: { text: string; onPress: () => void; type: 'primary' | 'danger' | 'cancel' }[];
}

export const ReportsScreen = () => {
  const navigation = useNavigation<NavProp>();
  const { colors, mode, reportsStyles } = useTheme();

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const [dialogConfig, setDialogConfig] = useState<DialogConfig>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  const closeDialog = useCallback(
    () => setDialogConfig((prev) => ({ ...prev, visible: false })),
    []
  );

  // Carregamento
  const loadReports = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const idsResult = await StorageService.getInventories();
      if (!idsResult.ok) {
        throw new Error(idsResult.error.message);
      }

      const ids = idsResult.value;

      const loaded = await Promise.all(
        ids.map(async (id) => {
          const invResult = await StorageService.loadInventory(id);
          if (!invResult.ok) return null;

          const inventory = invResult.value;
          const report = AnalyticsService.compute(inventory);

          return { inventory, report };
        })
      );

      setRows(loaded.filter((r): r is ReportRow => r !== null));
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);

      Toast.show({
        type: 'error',
        text1: 'Erro de Carregamento',
        text2: 'Não foi possível carregar os relatórios.',
        position: 'bottom',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  //  Navegações

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleGoToHome = () => {
    navigation.navigate('Home');
  };

  const handleGoToSettings = () => {
    navigation.navigate('Settings');
  };

  const handleViewReport = useCallback(
    (inventoryId: string, inventoryName: string) => {
      navigation.navigate('ReportDetail', {
        inventoryId,
        inventoryName,
      });
    },
    [navigation]
  );

  //  Exportações

  const withExportResultGuard = useCallback(async (id: string, fn: () => Promise<Result<void>>) => {
    setExportingId(id);
    try {
      const result = await fn();
      if (!result.ok) {
        // Feedback de Erro
        Toast.show({
          type: 'error',
          text1: 'Erro na exportação',
          text2: result.error.message,
          position: 'bottom', // Opcional: faz o toast aparecer por baixo
        });
      } else {
        // Feedback de Sucesso
        Toast.show({
          type: 'success',
          text1: 'Sucesso!',
          text2: 'Arquivo exportado com sucesso.',
          position: 'bottom',
        });
      }
    } catch (e) {
      // Feedback de Exceção/Crash
      Toast.show({
        type: 'error',
        text1: 'Erro inesperado',
        text2: e instanceof Error ? e.message : 'Tente novamente.',
        position: 'bottom',
      });
    } finally {
      setExportingId(null);
    }
  }, []);

  // Função ajudante para os CSVs
  // Envolvemos executeCSVExport com useCallback para estabilidade
  const executeCSVExport = useCallback(
    (row: ReportRow, type: 'found' | 'pending' | 'full') => {
      closeDialog();
      const idStr = `csv-${type}-${row.inventory.metadata.id}`;
      if (type === 'found') {
        withExportResultGuard(idStr, () =>
          CSVExportService.exportFound(row.report, row.inventory.schema)
        );
      } else if (type === 'pending') {
        withExportResultGuard(idStr, () =>
          CSVExportService.exportPending(row.report, row.inventory.schema)
        );
      } else {
        withExportResultGuard(idStr, () =>
          CSVExportService.exportFull(row.report, row.inventory.schema)
        );
      }
    },
    [closeDialog, withExportResultGuard]
  );

  // handleExportCSV depende de executeCSVExport
  const handleExportCSV = useCallback(
    (row: ReportRow) => {
      setDialogConfig({
        visible: true,
        title: 'Exportar CSV',
        message: 'Selecione o tipo de relatório que deseja exportar:',
        buttons: [
          { text: 'Encontrados', type: 'primary', onPress: () => executeCSVExport(row, 'found') },
          {
            text: 'Não encontrados',
            type: 'primary',
            onPress: () => executeCSVExport(row, 'pending'),
          },
          { text: 'Completo', type: 'primary', onPress: () => executeCSVExport(row, 'full') },
          { text: 'Cancelar', type: 'cancel', onPress: closeDialog },
        ],
      });
    },
    [executeCSVExport, closeDialog] // closeDialog agora é estável
  );

  // handleExportPDF também depende de closeDialog e withExportResultGuard
  const handleExportPDF = useCallback(
    (row: ReportRow) => {
      setDialogConfig({
        visible: true,
        title: 'Exportar PDF',
        message: 'Deseja exportar o relatório deste inventário em PDF?',
        buttons: [
          { text: 'Cancelar', type: 'cancel', onPress: closeDialog },
          {
            text: 'Exportar',
            type: 'primary',
            onPress: () => {
              closeDialog();
              withExportResultGuard(`pdf-${row.inventory.metadata.id}`, () =>
                ReportService.exportPDF(row.report)
              );
            },
          },
        ],
      });
    },
    [withExportResultGuard, closeDialog]
  );

  const barStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  //  Loading

  if (isLoading) {
    return (
      <View style={reportsStyles.loadingContainer}>
        <StatusBar barStyle={barStyle} backgroundColor={colors.bg} />
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={reportsStyles.loadingText}>Calculando relatórios…</Text>
      </View>
    );
  }

  //  Render

  return (
    <View style={reportsStyles.container}>
      <StatusBar barStyle={barStyle} backgroundColor={colors.bg} />

      {/* Header com navegação completa */}
      <View style={reportsStyles.header}>
        <TouchableOpacity onPress={handleGoBack} style={reportsStyles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={reportsStyles.headerTitle}>Relatórios</Text>
          <Text style={reportsStyles.headerSub}>
            {rows.length} inventário{rows.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={handleGoToHome}
            accessibilityRole="button"
            accessibilityLabel="Início"
            style={reportsStyles.iconBtn}
          >
            <Ionicons name="home-outline" size={20} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleGoToSettings}
            accessibilityRole="button"
            accessibilityLabel="Configurações"
            style={reportsStyles.iconBtn}
          >
            <Ionicons name="settings-outline" size={20} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Listagem dos inventários */}
      <FlatList
        data={rows}
        keyExtractor={(r) => r.inventory.metadata.id}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'} // Excelente para Android
        renderItem={({ item }) => (
          <ReportCard
            row={item}
            isExporting={exportingId?.includes(item.inventory.metadata.id) ?? false}
            onView={handleViewReport}
            onCSV={handleExportCSV}
            onPDF={handleExportPDF}
            colors={colors}
            styles={reportsStyles}
          />
        )}
        contentContainerStyle={[
          reportsStyles.listContent,
          rows.length === 0 && reportsStyles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadReports(true);
            }}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          <View style={reportsStyles.emptyContainer}>
            <Ionicons name="bar-chart-outline" size={48} color={colors.textDim} />
            <Text style={reportsStyles.emptyTitle}>Nenhum relatório disponível</Text>
            <Text style={reportsStyles.emptyDesc}>
              Importe um inventário ou cadastre manualmente para ver os relatórios.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                style={reportsStyles.emptyBtn}
                onPress={() => navigation.navigate('ImportInventory')}
              >
                <Ionicons name="document-attach-outline" size={18} color={colors.accent} />
                <Text style={reportsStyles.emptyBtnText}> Importar CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={reportsStyles.emptyBtn}
                onPress={() => navigation.navigate('ManualInventory')}
              >
                <Ionicons name="create-outline" size={18} color={colors.accent} />
                <Text style={reportsStyles.emptyBtnText}> Cadastrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
      <CustomDialog config={dialogConfig} colors={colors} />
    </View>
  );
};

// ─── Sub-componente: card de relatório ────────────────────────────────────────

interface ReportCardProps {
  row: ReportRow;
  isExporting: boolean;
  onView: (inventoryId: string, inventoryName: string) => void;
  onCSV: (row: ReportRow) => void;
  onPDF: (row: ReportRow) => void;
  colors: any;
  styles: any;
}

const ReportCard = React.memo(
  ({ row, isExporting, onView, onCSV, onPDF, colors, styles }: ReportCardProps) => {
    const { report, inventory } = row;
    const { overall } = report;
    const isComplete = overall.progressPct === 100;
    const safePct = Number.isFinite(overall.progressPct) ? overall.progressPct : 0;

    const handlePressView = () => {
      onView(inventory.metadata.id, inventory.metadata.name);
    };

    const handlePressCSV = () => onCSV(row);
    const handlePressPDF = () => onPDF(row);

    return (
      <TouchableOpacity style={styles.card} onPress={handlePressView} activeOpacity={0.75}>
        <View style={[styles.cardAccent, isComplete && styles.cardAccentComplete]} />

        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardName} numberOfLines={1}>
              {report.inventoryName}
            </Text>
            {isComplete ? (
              <View style={styles.badgeComplete}>
                <Text style={styles.badgeCompleteText}>✓ Completo</Text>
              </View>
            ) : (
              <View style={styles.badgeInProgress}>
                <Text style={styles.badgeInProgressText}>{safePct}%</Text>
              </View>
            )}
          </View>

          <View style={styles.miniStats}>
            <MiniStat label="Total" value={overall.total} colors={colors} styles={styles} />
            <MiniStat
              label="Encontrados"
              value={overall.found}
              accent
              colors={colors}
              styles={styles}
            />
            <MiniStat
              label="Pendentes"
              value={overall.pending}
              warn={overall.pending > 0}
              colors={colors}
              styles={styles}
            />
            <MiniStat
              label="Sobras"
              value={overall.unexpectedCount}
              warn={overall.unexpectedCount > 0}
              colors={colors}
              styles={styles}
            />
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${safePct}%` },
                isComplete && styles.progressFillComplete,
              ]}
            />
          </View>

          {overall.durationMinutes !== null && (
            <View style={styles.duration}>
              <Ionicons name="time-outline" size={16} color={colors.textDim} />
              <Text style={styles.durationText}>
                {' '}
                Duração: {overall.durationMinutes} min · {report.scanTimeline.length} scans
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={handlePressView}>
              <Ionicons name="bar-chart-outline" size={20} color={colors.accent} />
              <Text style={styles.actionBtnText}> Ver detalhes</Text>
            </TouchableOpacity>

            {isExporting ? (
              <View style={[styles.actionBtn, styles.actionBtnExport]}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnExport]}
                  onPress={handlePressCSV}
                >
                  <Ionicons name="download-outline" size={20} color={colors.accent} />
                  <Text style={[styles.actionBtnText, { color: colors.accent }]}> CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnExport]}
                  onPress={handlePressPDF}
                >
                  <Ionicons name="document-text-outline" size={20} color={colors.warning} />
                  <Text style={[styles.actionBtnText, { color: colors.warning }]}> PDF</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

// ---- Sub-componente -----------------

const CustomDialog = ({ config, colors }: { config: DialogConfig; colors: any }) => {
  if (!config.visible) return null;

  return (
    <Modal visible={config.visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(10, 10, 15, 0.85)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            width: '100%',
            borderRadius: 16,
            padding: 24,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 12 }}>
            {config.title}
          </Text>
          <Text style={{ fontSize: 16, color: colors.textDim, marginBottom: 24, lineHeight: 22 }}>
            {config.message}
          </Text>
          <View
            style={{ flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 12 }}
          >
            {config.buttons.map((btn, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={btn.onPress}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor:
                    btn.type === 'primary'
                      ? '#000'
                      : btn.type === 'danger'
                        ? colors.error + '20'
                        : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color:
                      btn.type === 'primary'
                        ? colors.accent
                        : btn.type === 'danger'
                          ? colors.error
                          : colors.textDim,
                  }}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Sub-componente: mini stat ────────────────────────────────────────────────

const MiniStat = ({
  label,
  value,
  accent,
  warn,
  styles,
}: {
  label: string;
  value: number;
  accent?: boolean;
  warn?: boolean;
  colors: any;
  styles: any;
}) => {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text
        style={[
          styles.miniStatValue,
          accent && styles.miniStatAccent,
          warn && value > 0 && styles.miniStatWarn,
        ]}
      >
        {value}
      </Text>
    </View>
  );
};
