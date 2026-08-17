/**
 * Relatório completo de um inventário:
 *   - Gráfico de pizza (encontrados vs. pendentes vs. achados a mais)
 *   - Barra de progresso geral
 *   - Linha do tempo de scans
 *   - Lista de itens encontrados
 *   - Lista de itens não encontrados
 *   - Itens não listados (fora da lista)
 *   - Histórico de scans
 */

import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import Toast from 'react-native-toast-message';
import { useTheme } from '../contexts/ThemeContext';
import { AnalyticsService, InventoryReport, ScanEvent } from '../services/AnalyticsService';
import { ChartService } from '../services/ChartService';
import { CSVExportService } from '../services/CsvExportService';
import { ReportService } from '../services/ReportService';
import { StorageService } from '../services/StorageService';
import { InventorySchema, RootStackParamList } from '../types/types';

//  Navegação
type DetailRoute = RouteProp<RootStackParamList, 'ReportDetail'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

// Tipagem para o Modal Customizado
interface DialogConfig {
  visible: boolean;
  title: string;
  message: string;
  buttons: {
    text: string;
    onPress: () => void;
    type: 'primary' | 'danger' | 'cancel';
  }[];
}

//  Componente principal
export const ReportDetailScreen = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<DetailRoute>();
  const { inventoryId } = route.params;

  const [report, setReport] = useState<InventoryReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const schemaRef = useRef<InventorySchema | undefined>(undefined);

  const { colors, mode, reportDetailStyles } = useTheme();

  // Estado para controlar o Modal de Confirmação/Menu
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

  //  Carregamento
  const loadReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await StorageService.loadInventory(inventoryId);
      if (!result.ok) {
        setDialogConfig({
          visible: true,
          title: 'Erro',
          message: result.error.message || 'Inventário não encontrado.',
          buttons: [
            {
              text: 'Voltar',
              type: 'primary',
              onPress: () => {
                closeDialog();
                navigation.goBack();
              },
            },
          ],
        });
        return;
      }

      const inv = result.value;
      schemaRef.current = inv.schema;
      const computedReport = AnalyticsService.compute(inv);
      setReport(computedReport);
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      Toast.show({ type: 'error', text1: 'Erro', text2: 'Não foi possível gerar o relatório.' });
    } finally {
      setIsLoading(false);
    }
  }, [inventoryId, navigation, closeDialog]);

  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [loadReport])
  );

  // SVGs dos gráficos (memoizados)
  const pieSvg = useMemo(
    () =>
      report
        ? ChartService.buildPieChart({
            found: report.overall.found,
            pending: report.overall.pending,
            unexpected: report.overall.unexpectedCount,
            size: 190,
          })
        : '',
    [report]
  );

  const timelineSvg = useMemo(
    () =>
      report && report.scanTimeline.length > 0
        ? ChartService.buildTimelineChart(report.scanTimeline, 300, 110)
        : '',
    [report]
  );

  //  Navegações
  const handleGoBack = () => navigation.goBack();

  const handleGoToInventoryDetail = () => {
    if (report) {
      navigation.navigate('InventoryDetail', {
        inventoryId,
        inventoryName: report.inventoryName,
      });
    }
  };

  const handleGoToReports = () => navigation.navigate('Reports');
  const handleGoToHome = () => navigation.navigate('Home');

  // Exportações
  const handleExportCSV = useCallback(() => {
    if (!report) return;

    const doExport = async (type: 'found' | 'pending' | 'full') => {
      closeDialog();
      setIsExporting(true);
      try {
        let result;
        if (type === 'found') {
          result = await CSVExportService.exportFound(report, schemaRef.current);
        } else if (type === 'pending') {
          result = await CSVExportService.exportPending(report, schemaRef.current);
        } else {
          result = await CSVExportService.exportFull(report, schemaRef.current);
        }

        if (!result.ok) {
          Toast.show({ type: 'error', text1: 'Erro na exportação', text2: result.error.message });
        } else {
          Toast.show({ type: 'success', text1: 'Sucesso', text2: 'Arquivo CSV exportado!' });
        }
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: 'Erro',
          text2: err instanceof Error ? err.message : 'Erro inesperado',
        });
      } finally {
        setIsExporting(false);
      }
    };

    setDialogConfig({
      visible: true,
      title: 'Exportar CSV',
      message: 'Selecione o tipo de relatório que deseja exportar:',
      buttons: [
        { text: 'Encontrados', type: 'primary', onPress: () => doExport('found') },
        { text: 'Não encontrados', type: 'primary', onPress: () => doExport('pending') },
        { text: 'Completo', type: 'primary', onPress: () => doExport('full') },
        { text: 'Cancelar', type: 'cancel', onPress: closeDialog },
      ],
    });
  }, [report, closeDialog]);

  const handleExportPDF = useCallback(() => {
    if (!report) return;

    setDialogConfig({
      visible: true,
      title: 'Exportar PDF',
      message: 'Deseja exportar o relatório completo em PDF?',
      buttons: [
        { text: 'Cancelar', type: 'cancel', onPress: closeDialog },
        {
          text: 'Exportar',
          type: 'primary',
          onPress: async () => {
            closeDialog();
            setIsExporting(true);
            try {
              const result = await ReportService.exportPDF(report);
              if (!result.ok) {
                Toast.show({
                  type: 'error',
                  text1: 'Erro na exportação',
                  text2: result.error.message,
                });
              } else {
                Toast.show({
                  type: 'success',
                  text1: 'Sucesso',
                  text2: 'PDF exportado com sucesso!',
                });
              }
            } catch {
              Toast.show({
                type: 'error',
                text1: 'Erro',
                text2: 'Falha inesperada ao exportar PDF',
              });
            } finally {
              setIsExporting(false);
            }
          },
        },
      ],
    });
  }, [report, closeDialog]);

  const barStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  // Loading
  if (isLoading || !report) {
    return (
      <View style={reportDetailStyles.loadingContainer}>
        <StatusBar barStyle={barStyle} backgroundColor={colors.bg} />
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={reportDetailStyles.loadingText}>Gerando relatório…</Text>
      </View>
    );
  }

  const { overall } = report;
  const isComplete = overall.progressPct === 100;
  const hasTimeline = report.scanTimeline.length > 0;

  return (
    <View style={reportDetailStyles.container}>
      <StatusBar barStyle={barStyle} backgroundColor={colors.bg} />

      {/* Header com navegação completa */}
      <View style={reportDetailStyles.header}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={reportDetailStyles.backBtn}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={reportDetailStyles.headerCenter}>
          <Text style={reportDetailStyles.headerTitle} numberOfLines={1}>
            {report.inventoryName}
          </Text>
          <Text style={reportDetailStyles.headerSub}>
            Relatório · {AnalyticsService.formatDate(report.generatedAt)}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={handleGoToInventoryDetail}
            style={reportDetailStyles.iconBtn}
            accessibilityLabel="Ir para detalhes do inventário"
            accessibilityRole="button"
          >
            <Ionicons name="list-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleGoToReports}
            style={reportDetailStyles.iconBtn}
            accessibilityLabel="Ir para relatórios"
            accessibilityRole="button"
          >
            <Ionicons name="bar-chart-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleGoToHome}
            style={reportDetailStyles.iconBtn}
            accessibilityLabel="Ir para início"
            accessibilityRole="button"
          >
            <Ionicons name="home-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Botões de exportação abaixo do header */}
      <View style={reportDetailStyles.exportHeader}>
        {isExporting ? (
          <ActivityIndicator color={colors.accent} size="small" />
        ) : (
          <View style={reportDetailStyles.exportBtns}>
            <TouchableOpacity style={reportDetailStyles.exportBtn} onPress={handleExportCSV}>
              <Text style={reportDetailStyles.exportBtnText}>CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[reportDetailStyles.exportBtn, reportDetailStyles.exportBtnPDF]}
              onPress={handleExportPDF}
            >
              <Text style={[reportDetailStyles.exportBtnText, { color: colors.warning }]}>PDF</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        style={reportDetailStyles.scroll}
        contentContainerStyle={reportDetailStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Visão geral ── */}
        <Section title="Visão geral" styles={reportDetailStyles}>
          <View style={reportDetailStyles.overviewRow}>
            {/* Pizza */}
            <View style={reportDetailStyles.pieWrapper}>
              <SvgXml xml={pieSvg} width={180} height={180} />
            </View>

            {/* Stats à direita */}
            <View style={reportDetailStyles.statsColumn}>
              <StatCard
                label="Total"
                value={overall.total}
                styles={reportDetailStyles}
                colors={colors}
              />
              <StatCard
                label="Encontrados"
                value={overall.found}
                accent
                styles={reportDetailStyles}
                colors={colors}
              />
              <StatCard
                label="Pendentes"
                value={overall.pending}
                warn={overall.pending > 0}
                styles={reportDetailStyles}
                colors={colors}
              />
              <StatCard
                label="Não Listados"
                value={overall.unexpectedCount}
                warn={overall.unexpectedCount > 0}
                styles={reportDetailStyles}
                colors={colors}
              />
            </View>
          </View>

          {/* Barra de progresso */}
          <View style={reportDetailStyles.progressSection}>
            <View style={reportDetailStyles.progressRow}>
              <Text style={reportDetailStyles.progressLabel}>Progresso geral</Text>
              <Text
                style={[
                  reportDetailStyles.progressPct,
                  isComplete && reportDetailStyles.progressPctComplete,
                ]}
              >
                {overall.progressPct}%
              </Text>
            </View>
            <View style={reportDetailStyles.progressTrack}>
              <View
                style={[
                  reportDetailStyles.progressFill,
                  { width: `${overall.progressPct}%` },
                  isComplete && reportDetailStyles.progressFillComplete,
                ]}
              />
            </View>
          </View>

          {/* Metadados */}
          {overall.startedAt && (
            <View style={reportDetailStyles.metaRow}>
              <MetaItem
                label="Início"
                value={AnalyticsService.formatDateTime(overall.startedAt)}
                styles={reportDetailStyles}
              />
              {overall.completedAt && (
                <MetaItem
                  label="Conclusão"
                  value={AnalyticsService.formatDateTime(overall.completedAt)}
                  styles={reportDetailStyles}
                />
              )}
              {overall.durationMinutes != null && overall.durationMinutes > 0 && (
                <MetaItem
                  label="Duração"
                  value={`${overall.durationMinutes} min`}
                  styles={reportDetailStyles}
                />
              )}
            </View>
          )}
        </Section>

        {/* ── Itens encontrados ── */}
        <Section
          title={`Itens encontrados (${report.foundItems.length})`}
          styles={reportDetailStyles}
        >
          {report.foundItems.length === 0 ? (
            <Text style={reportDetailStyles.emptyText}>Nenhum item encontrado ainda.</Text>
          ) : (
            report.foundItems.map((item, index) => (
              <View key={`found-${item.code}-${index}`} style={reportDetailStyles.itemRow}>
                <View style={[reportDetailStyles.itemInd, reportDetailStyles.itemIndScanned]} />
                <View style={reportDetailStyles.itemBody}>
                  <Text style={reportDetailStyles.itemCode}>{item.code}</Text>
                  {item.description ? (
                    <Text style={reportDetailStyles.itemDesc}>{item.description}</Text>
                  ) : null}
                  <View style={reportDetailStyles.itemMeta}>
                    {item.location ? (
                      <Text style={reportDetailStyles.itemMetaTxt}>
                        <Ionicons name="location-outline" size={12} /> {item.location}
                      </Text>
                    ) : null}
                    <Text style={reportDetailStyles.itemMetaTxt}>
                      <Ionicons name="time-outline" size={12} />{' '}
                      {AnalyticsService.formatDateTime(item.scanDate)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </Section>

        {/* ── Linha do tempo ── */}
        {hasTimeline && timelineSvg && (
          <Section
            title={`Linha do tempo (${report.scanTimeline.length} scans)`}
            styles={reportDetailStyles}
          >
            <View style={reportDetailStyles.chartDark}>
              <SvgXml xml={timelineSvg} width="100%" height={110} />
            </View>
            {overall.durationMinutes != null &&
              overall.durationMinutes > 0 &&
              report.scanTimeline.length > 1 && (
                <Text style={reportDetailStyles.chartCaption}>
                  Média: {((overall.durationMinutes * 60) / report.scanTimeline.length).toFixed(0)}s
                  por item
                </Text>
              )}
          </Section>
        )}

        {/* ── Não encontrados ── */}
        <Section
          title={`Itens não encontrados (${report.notFoundItems.length})`}
          styles={reportDetailStyles}
        >
          {report.notFoundItems.length === 0 ? (
            <View style={reportDetailStyles.allFoundBanner}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.success}
                style={{ marginRight: 6 }}
              />
              <Text style={reportDetailStyles.allFoundText}>Todos os itens foram localizados!</Text>
            </View>
          ) : (
            report.notFoundItems.map((item, i) => (
              <View
                key={`nf-${item.code}-${item.location ?? ''}-${i}`}
                style={[reportDetailStyles.itemRow, reportDetailStyles.itemRowPending]}
              >
                <View style={[reportDetailStyles.itemInd, reportDetailStyles.itemIndPending]} />
                <View style={reportDetailStyles.itemBody}>
                  <Text style={reportDetailStyles.itemCode}>{item.code}</Text>
                  {item.description ? (
                    <Text style={reportDetailStyles.itemDesc}>{item.description}</Text>
                  ) : null}
                  <View style={reportDetailStyles.itemMeta}>
                    {item.location ? (
                      <Text style={reportDetailStyles.itemMetaTxt}>
                        <Ionicons name="location-outline" size={12} /> {item.location}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ))
          )}
        </Section>

        {/* ── Itens não listados (fora da lista) ── */}
        <Section
          title={`Itens não listados (${report.unexpectedItems.length})`}
          styles={reportDetailStyles}
        >
          {report.unexpectedItems.length === 0 ? (
            <Text style={reportDetailStyles.emptyText}>Nenhum item inesperado registrado.</Text>
          ) : (
            report.unexpectedItems.map((item, index) => (
              <View
                key={`unexp-${item.code}-${index}`}
                style={[reportDetailStyles.itemRow, reportDetailStyles.itemRowUnexpected]}
              >
                <View style={[reportDetailStyles.itemInd, reportDetailStyles.itemIndUnexpected]} />
                <View style={reportDetailStyles.itemBody}>
                  <Text style={reportDetailStyles.itemCode}>{item.code}</Text>
                  {item.description ? (
                    <Text style={reportDetailStyles.itemDesc}>{item.description}</Text>
                  ) : null}
                  <View style={reportDetailStyles.itemMeta}>
                    {item.location ? (
                      <Text style={reportDetailStyles.itemMetaTxt}>
                        <Ionicons name="location-outline" size={12} /> {item.location}
                      </Text>
                    ) : null}
                    <Text style={reportDetailStyles.itemMetaTxt}>
                      <Ionicons name="time-outline" size={12} />{' '}
                      {AnalyticsService.formatDateTime(item.scannedAt)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </Section>

        {/* ── Histórico de scans ── */}
        {hasTimeline && (
          <Section title="Histórico de scans" styles={reportDetailStyles}>
            {report.scanTimeline.map((event, i) => (
              <ScanEventRow
                key={`ev-${event.code}-${i}`}
                event={event}
                index={i}
                styles={reportDetailStyles}
                colors={colors}
              />
            ))}
          </Section>
        )}
      </ScrollView>
      <CustomDialog config={dialogConfig} colors={colors} />
    </View>
  );
};

// Sub-componentes

const Section = React.memo(
  ({ title, children, styles }: { title: string; children: React.ReactNode; styles: any }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  )
);

const StatCard = React.memo(
  ({
    label,
    value,
    accent,
    warn,
    styles,
    colors,
  }: {
    label: string;
    value: number;
    accent?: boolean;
    warn?: boolean;
    styles: any;
    colors: any;
  }) => (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          accent && styles.statValueAccent,
          warn && value > 0 && styles.statValueWarn,
        ]}
      >
        {value}
      </Text>
    </View>
  )
);

const MetaItem = React.memo(
  ({ label, value, styles }: { label: string; value: string; styles: any }) => (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  )
);

const ScanEventRow = React.memo(
  ({
    event,
    index,
    styles,
    colors,
  }: {
    event: ScanEvent;
    index: number;
    styles: any;
    colors: any;
  }) => (
    <View style={[styles.scanRow, event.isUnexpected && styles.scanRowUnexpected]}>
      <Text style={styles.scanIndex}>{index + 1}</Text>
      <View style={styles.scanBody}>
        <View style={styles.scanHeader}>
          <Text style={styles.scanCode}>
            {event.code}
            {event.isUnexpected ? (
              <Text style={{ color: colors.warning, fontSize: 10 }}> (Não Listado)</Text>
            ) : null}
          </Text>
          <Text style={styles.scanTime}>
            {AnalyticsService.formatDateTime(event.scanDate)}
            <Text style={styles.scanDelta}> +{event.minutesFromStart}min</Text>
          </Text>
        </View>
        {event.description ? (
          <Text style={styles.scanDesc} numberOfLines={1}>
            {event.description}
          </Text>
        ) : null}
        {event.location ? (
          <Text style={styles.scanMeta}>
            <Ionicons name="location-outline" size={11} /> {event.location}
          </Text>
        ) : null}
      </View>
    </View>
  )
);

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
