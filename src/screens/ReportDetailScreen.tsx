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
import { AnalyticsService, InventoryReport, ScanEvent } from '../services/AnalyticsService';
import { ChartService } from '../services/ChartService';
import { CSVExportService } from '../services/CsvExportService';
import { ReportService } from '../services/ReportService';
import { StorageService } from '../services/StorageService';
import { colors, reportDetailStyles } from '../styles/theme';
import { InventorySchema, RootStackParamList } from '../types/types';

//  Navegação
type DetailRoute = RouteProp<RootStackParamList, 'ReportDetail'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

//  Estilos
const styles = reportDetailStyles;

// Tipagem para o  Modal Customizado
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

  // Loading
  if (isLoading || !report) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loadingText}>Gerando relatório…</Text>
      </View>
    );
  }

  const { overall } = report;
  const isComplete = overall.progressPct === 100;
  const hasTimeline = report.scanTimeline.length > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header com navegação completa */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.backBtn}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {report.inventoryName}
          </Text>
          <Text style={styles.headerSub}>
            Relatório · {AnalyticsService.formatDate(report.generatedAt)}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={handleGoToInventoryDetail}
            style={styles.iconBtn}
            accessibilityLabel="Ir para detalhes do inventário"
            accessibilityRole="button"
          >
            <Ionicons name="list-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleGoToReports}
            style={styles.iconBtn}
            accessibilityLabel="Ir para relatórios"
            accessibilityRole="button"
          >
            <Ionicons name="bar-chart-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleGoToHome}
            style={styles.iconBtn}
            accessibilityLabel="Ir para início"
            accessibilityRole="button"
          >
            <Ionicons name="home-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Botões de exportação abaixo do header */}
      <View style={styles.exportHeader}>
        {isExporting ? (
          <ActivityIndicator color={colors.accent} size="small" />
        ) : (
          <View style={styles.exportBtns}>
            <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
              <Text style={styles.exportBtnText}>CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportBtn, styles.exportBtnPDF]}
              onPress={handleExportPDF}
            >
              <Text style={[styles.exportBtnText, { color: colors.warning }]}>PDF</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Visão geral ── */}
        <Section title="Visão geral">
          <View style={styles.overviewRow}>
            {/* Pizza */}
            <View style={styles.pieWrapper}>
              <SvgXml xml={pieSvg} width={180} height={180} />
            </View>

            {/* Stats à direita */}
            <View style={styles.statsColumn}>
              <StatCard label="Total" value={overall.total} />
              <StatCard label="Encontrados" value={overall.found} accent />
              <StatCard label="Pendentes" value={overall.pending} warn={overall.pending > 0} />
              <StatCard
                label="Não Listados"
                value={overall.unexpectedCount}
                warn={overall.unexpectedCount > 0}
              />
            </View>
          </View>

          {/* Barra de progresso */}
          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Progresso geral</Text>
              <Text style={[styles.progressPct, isComplete && styles.progressPctComplete]}>
                {overall.progressPct}%
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${overall.progressPct}%` },
                  isComplete && styles.progressFillComplete,
                ]}
              />
            </View>
          </View>

          {/* Metadados */}
          {overall.startedAt && (
            <View style={styles.metaRow}>
              <MetaItem label="Início" value={AnalyticsService.formatDateTime(overall.startedAt)} />
              {overall.completedAt && (
                <MetaItem
                  label="Conclusão"
                  value={AnalyticsService.formatDateTime(overall.completedAt)}
                />
              )}
              {overall.durationMinutes != null && overall.durationMinutes > 0 && (
                <MetaItem label="Duração" value={`${overall.durationMinutes} min`} />
              )}
            </View>
          )}
        </Section>

        {/* ── Itens encontrados ── */}
        <Section title={`Itens encontrados (${report.foundItems.length})`}>
          {report.foundItems.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum item encontrado ainda.</Text>
          ) : (
            report.foundItems.map((item, index) => (
              <View key={`found-${item.code}-${index}`} style={styles.itemRow}>
                <View style={[styles.itemInd, styles.itemIndScanned]} />
                <View style={styles.itemBody}>
                  <Text style={styles.itemCode}>{item.code}</Text>
                  {item.description ? (
                    <Text style={styles.itemDesc}>{item.description}</Text>
                  ) : null}
                  <View style={styles.itemMeta}>
                    {item.location ? (
                      <Text style={styles.itemMetaTxt}>
                        <Ionicons name="location-outline" size={12} /> {item.location}
                      </Text>
                    ) : null}
                    <Text style={styles.itemMetaTxt}>
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
          <Section title={`Linha do tempo (${report.scanTimeline.length} scans)`}>
            <View style={styles.chartDark}>
              <SvgXml xml={timelineSvg} width="100%" height={110} />
            </View>
            {overall.durationMinutes != null &&
              overall.durationMinutes > 0 &&
              report.scanTimeline.length > 1 && (
                <Text style={styles.chartCaption}>
                  Média: {((overall.durationMinutes * 60) / report.scanTimeline.length).toFixed(0)}s
                  por item
                </Text>
              )}
          </Section>
        )}

        {/* ── Não encontrados ── */}
        <Section title={`Itens não encontrados (${report.notFoundItems.length})`}>
          {report.notFoundItems.length === 0 ? (
            <View style={styles.allFoundBanner}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.success}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.allFoundText}>Todos os itens foram localizados!</Text>
            </View>
          ) : (
            report.notFoundItems.map((item, i) => (
              <View
                key={`nf-${item.code}-${item.location ?? ''}-${i}`}
                style={[styles.itemRow, styles.itemRowPending]}
              >
                <View style={[styles.itemInd, styles.itemIndPending]} />
                <View style={styles.itemBody}>
                  <Text style={styles.itemCode}>{item.code}</Text>
                  {item.description ? (
                    <Text style={styles.itemDesc}>{item.description}</Text>
                  ) : null}
                  <View style={styles.itemMeta}>
                    {item.location ? (
                      <Text style={styles.itemMetaTxt}>
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
        <Section title={`Itens não listados (${report.unexpectedItems.length})`}>
          {report.unexpectedItems.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum item inesperado registrado.</Text>
          ) : (
            report.unexpectedItems.map((item, index) => (
              <View
                key={`unexp-${item.code}-${index}`}
                style={[styles.itemRow, styles.itemRowUnexpected]}
              >
                <View style={[styles.itemInd, styles.itemIndUnexpected]} />
                <View style={styles.itemBody}>
                  <Text style={styles.itemCode}>{item.code}</Text>
                  {item.description ? (
                    <Text style={styles.itemDesc}>{item.description}</Text>
                  ) : null}
                  <View style={styles.itemMeta}>
                    {item.location ? (
                      <Text style={styles.itemMetaTxt}>
                        <Ionicons name="location-outline" size={12} /> {item.location}
                      </Text>
                    ) : null}
                    <Text style={styles.itemMetaTxt}>
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
          <Section title="Histórico de scans">
            {report.scanTimeline.map((event, i) => (
              <ScanEventRow key={`ev-${event.code}-${i}`} event={event} index={i} />
            ))}
          </Section>
        )}
      </ScrollView>
      <CustomDialog config={dialogConfig} />
    </View>
  );
};

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const Section = React.memo(({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
));

const StatCard = React.memo(
  ({
    label,
    value,
    accent,
    warn,
  }: {
    label: string;
    value: number;
    accent?: boolean;
    warn?: boolean;
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

const MetaItem = React.memo(({ label, value }: { label: string; value: string }) => (
  <View style={styles.metaItem}>
    <Text style={styles.metaLabel}>{label}</Text>
    <Text style={styles.metaValue}>{value}</Text>
  </View>
));

const ScanEventRow = React.memo(({ event, index }: { event: ScanEvent; index: number }) => (
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
));

const CustomDialog = ({ config }: { config: DialogConfig }) => {
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
                      ? colors.accent
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
                        ? '#000'
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
