import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScannerService } from '../services/ScannerService';
import { StorageService } from '../services/StorageService';
import { colors, commonStyles, inventoryDetailStyles } from '../styles/theme';
import { AssetItem, Inventory, RootStackParamList, isScannedItem } from '../types/types';
import { formatDisplayDate, formatDisplayDateTime } from '../utils/dateUtils';

type DetailRouteProp = RouteProp<RootStackParamList, 'InventoryDetail'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

type FilterTab = 'all' | 'pending' | 'scanned' | 'unexpected';

// Tipo unificado para exibição na lista
type CombinedItem = AssetItem & {
  isUnexpected?: boolean;
  scannedAt?: string;
};

export const InventoryDetailScreen = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<DetailRouteProp>();
  const { inventoryId } = route.params;

  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  // ─── Carregamento ────────────────────────────────────────────
  const loadInventory = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const result = await StorageService.loadInventory(inventoryId);
        if (!result.ok) throw new Error(result.error.message);
        setInventory(result.value);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        Alert.alert('Erro', `Não foi possível carregar o inventário: ${message}`, [
          { text: 'Voltar', onPress: () => navigation.goBack() },
        ]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [inventoryId, navigation]
  );

  useFocusEffect(
    useCallback(() => {
      loadInventory();
    }, [loadInventory])
  );

  // ─── Progresso ───────────────────────────────────────────────
  const progress = useMemo(
    () => (inventory ? ScannerService.getProgress(inventory) : null),
    [inventory]
  );

  // ─── Consolidação dos Dados (Merge) ──────────────────────────
  const combinedItems = useMemo<CombinedItem[]>(() => {
    if (!inventory) return [];

    const regularItems: CombinedItem[] = inventory.items.map((item) => ({
      ...item,
      isUnexpected: false,
    }));

    const unexpectedItems: CombinedItem[] = (inventory.unexpectedItems || []).map((item) => ({
      ...item,
      isUnexpected: true,
      found: true,
      description: item.description || '',
      location: item.location || '',
      scanDate: item.scannedAt,
    })) as CombinedItem[];

    return [...regularItems, ...unexpectedItems];
  }, [inventory]);

  const unexpectedCount = inventory?.unexpectedItems?.length || 0;

  // ─── Itens filtrados e pesquisados ───────────────────────────
  const filteredItems = useMemo(() => {
    if (!inventory) return [];
    let result: CombinedItem[] = combinedItems;

    if (filter === 'pending') result = result.filter((i) => !i.found && !i.isUnexpected);
    if (filter === 'scanned') result = result.filter((i) => i.found && !i.isUnexpected);
    if (filter === 'unexpected') result = result.filter((i) => i.isUnexpected);

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((i) => {
        const inCustom = i.customFields
          ? Object.values(i.customFields).some((val) => val.toLowerCase().includes(q))
          : false;
        return (
          i.code.toLowerCase().includes(q) ||
          (i.description && i.description.toLowerCase().includes(q)) ||
          (i.location && i.location.toLowerCase().includes(q)) ||
          inCustom
        );
      });
    }
    return result;
  }, [combinedItems, filter, search]);

  // ─── Ações de navegação e reset ──────────────────────────────
  const handleViewReport = useCallback(() => {
    if (!inventory) return;
    navigation.navigate('ReportDetail', {
      inventoryId: inventory.metadata.id,
      inventoryName: inventory.metadata.name,
    });
  }, [inventory, navigation]);

  const handleStartScan = useCallback(() => {
    if (!inventory) return;
    navigation.navigate('Scanner', { inventoryId: inventory.metadata.id });
  }, [inventory, navigation]);

  const handleResetInventory = useCallback(() => {
    if (!inventory) return;
    Alert.alert(
      'Resetar inventário',
      'Isso marcará todos os itens como não escaneados. Os itens não listados NÃO serão apagados. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetar',
          style: 'destructive',
          onPress: async () => {
            const resetItems = inventory.items.map((item) => {
              if (!item.found) return item;
              const { scanDate: _, ...base } = item as AssetItem & { scanDate?: string };
              return { ...base, found: false as const };
            });

            const updatedInventory: Inventory = {
              ...inventory,
              items: resetItems,
            };

            const saveResult = await StorageService.saveInventory(updatedInventory);
            if (!saveResult.ok) {
              Alert.alert('Erro', 'Não foi possível resetar completamente o inventário.');
              return;
            }

            setInventory(updatedInventory);
            Alert.alert('Sucesso', 'Inventário resetado com sucesso.');
          },
        },
      ]
    );
  }, [inventory]);

  const handleDeleteInventory = useCallback(() => {
    if (!inventory) return;
    Alert.alert(
      'Excluir Inventário',
      `Tem certeza que deseja excluir "${inventory.metadata.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const result = await StorageService.deleteInventory(inventory.metadata.id);
            if (result.ok) {
              navigation.navigate('Home');
            } else {
              Alert.alert('Erro', result.error.message);
            }
          },
        },
      ]
    );
  }, [inventory, navigation]);

  const handleGoBack = () => navigation.goBack();

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadInventory(true);
  }, [loadInventory]);

  // ─── Loading e fallback ──────────────────────────────────────
  if (isLoading) {
    return (
      <View style={inventoryDetailStyles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={inventoryDetailStyles.loadingText}>Carregando inventário…</Text>
      </View>
    );
  }

  if (!inventory) return null;

  const isComplete = progress !== null && progress.percentage === 100;

  // ─── Render principal ────────────────────────────────────────
  return (
    <View style={commonStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={inventoryDetailStyles.header}>
        <TouchableOpacity onPress={handleGoBack} style={inventoryDetailStyles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={inventoryDetailStyles.headerCenter}>
          <Text
            style={inventoryDetailStyles.headerTitle}
            numberOfLines={1}
            accessibilityLabel={`Nome do inventário: ${inventory.metadata.name}`}
          >
            {inventory.metadata.name}
          </Text>
          <Text style={inventoryDetailStyles.headerSub}>
            Importado em {formatDisplayDate(inventory.metadata.importDate)}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={handleViewReport} style={inventoryDetailStyles.reportBtn}>
            <Ionicons name="bar-chart-outline" size={20} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleResetInventory} style={inventoryDetailStyles.resetBtn}>
            <Ionicons name="refresh-outline" size={20} color={colors.warning} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteInventory}
            style={[
              inventoryDetailStyles.resetBtn,
              { borderColor: colors.warning, backgroundColor: colors.warning + '20' },
            ]}
          >
            <Ionicons name="trash-outline" size={20} color={colors.warning} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progresso */}
      {progress && (
        <View style={inventoryDetailStyles.statsSection}>
          <View style={inventoryDetailStyles.statsCards}>
            <StatCard label="Total" value={progress.total} />
            <StatCard label="Escaneados" value={progress.scanned} variant="accent" />
            <StatCard label="Pendentes" value={progress.remaining} variant="warn" />
          </View>

          <View style={inventoryDetailStyles.progressRow}>
            <View style={inventoryDetailStyles.progressTrack}>
              <View
                style={[
                  inventoryDetailStyles.progressFill,
                  { width: `${progress.percentage}%` },
                  isComplete && inventoryDetailStyles.progressFillComplete,
                ]}
              />
            </View>
            <Text
              style={[
                inventoryDetailStyles.progressPct,
                isComplete && inventoryDetailStyles.progressPctComplete,
              ]}
            >
              {progress.percentage}%
            </Text>
          </View>

          {isComplete && (
            <View style={inventoryDetailStyles.completeBanner}>
              <Ionicons name="checkmark-done-outline" size={24} color={colors.success} />
              <Text style={inventoryDetailStyles.completeBannerText}>
                Inventário completo! Todos os itens foram encontrados.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Busca */}
      <View style={inventoryDetailStyles.searchSection}>
        <View style={inventoryDetailStyles.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.textDim} />
          <TextInput
            style={inventoryDetailStyles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por código, nome ou local…"
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Filtros */}
      {/* Filtros */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={inventoryDetailStyles.filterTabs}
          // Uma leve margem ou padding pode ser necessária dependendo do seu theme.ts
          style={{ flexGrow: 0 }}
        >
          {[
            { key: 'all', label: `Todos (${combinedItems.length})` },
            { key: 'pending', label: `Pendentes (${progress?.remaining ?? 0})` },
            { key: 'scanned', label: `Escaneados (${progress?.scanned ?? 0})` },
            { key: 'unexpected', label: `Não Listados (${unexpectedCount})` },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                inventoryDetailStyles.filterTab,
                filter === tab.key && inventoryDetailStyles.filterTabActive,
              ]}
              onPress={() => setFilter(tab.key as FilterTab)}
            >
              <Text
                style={[
                  inventoryDetailStyles.filterTabText,
                  filter === tab.key && inventoryDetailStyles.filterTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {/* Lista de itens */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => `${item.isUnexpected ? 'unexp-' : ''}${item.code}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              if (item.isUnexpected) {
                navigation.navigate('ItemDetail', {
                  inventoryId: inventory.metadata.id,
                  itemCode: item.code,
                  isUnexpected: true,
                });
              } else {
                navigation.navigate('ItemDetail', {
                  inventoryId: inventory.metadata.id,
                  itemCode: item.code,
                });
              }
            }}
            activeOpacity={0.7}
          >
            <ItemRow item={item} />
          </TouchableOpacity>
        )}
        contentContainerStyle={[
          inventoryDetailStyles.listContent,
          filteredItems.length === 0 && inventoryDetailStyles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          <View style={inventoryDetailStyles.emptyContainer}>
            <Ionicons
              name={
                search
                  ? 'search-outline'
                  : filter === 'pending'
                    ? 'checkmark-circle-outline'
                    : filter === 'unexpected'
                      ? 'alert-circle-outline'
                      : 'cube-outline'
              }
              size={48}
              color={
                filter === 'pending' && !search
                  ? colors.success
                  : filter === 'unexpected'
                    ? colors.warning
                    : colors.textDim
              }
            />
            <Text style={inventoryDetailStyles.emptyText}>
              {search
                ? 'Nenhum item encontrado para esta busca.'
                : filter === 'pending'
                  ? 'Nenhum item pendente. Tudo escaneado!'
                  : filter === 'unexpected'
                    ? 'Nenhum item não listado registrado.'
                    : 'Nenhum item escaneado ainda.'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB Scanner */}
      <TouchableOpacity
        style={[inventoryDetailStyles.scanFab, isComplete && inventoryDetailStyles.scanFabComplete]}
        onPress={handleStartScan}
        activeOpacity={0.85}
      >
        <Ionicons
          name={isComplete ? 'checkmark-circle' : 'play'}
          size={24}
          color={isComplete ? colors.accent : '#000'}
        />
        <Text
          style={[
            inventoryDetailStyles.scanFabLabel,
            isComplete && inventoryDetailStyles.scanFabLabelComplete,
          ]}
        >
          {isComplete ? 'Inventário completo' : 'Iniciar scanner'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Sub-componentes ─────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  variant?: 'default' | 'accent' | 'warn';
}

const StatCard = React.memo(({ label, value, variant = 'default' }: StatCardProps) => {
  const valueStyle = [
    inventoryDetailStyles.statCardValue,
    variant === 'accent' && inventoryDetailStyles.statCardValueAccent,
    variant === 'warn' && value > 0 && inventoryDetailStyles.statCardValueWarn,
  ];

  return (
    <View style={inventoryDetailStyles.statCard}>
      <Text style={inventoryDetailStyles.statCardLabel}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </View>
  );
});

interface ItemRowProps {
  item: CombinedItem;
}

const ItemRow = React.memo(({ item }: ItemRowProps) => {
  const isUnexpected = item.isUnexpected;
  const scanned = isUnexpected || isScannedItem(item as AssetItem);
  const rawScanTime = isUnexpected
    ? item.scannedAt
    : (item as AssetItem & { scanDate?: string }).scanDate;
  const scanTime = scanned && rawScanTime ? formatDisplayDateTime(rawScanTime) : null;
  const customFieldsEntries = item.customFields ? Object.entries(item.customFields) : [];

  return (
    <View
      style={[
        inventoryDetailStyles.itemRow,
        scanned && inventoryDetailStyles.itemRowScanned,
        isUnexpected && { borderColor: colors.warning, borderWidth: 1 },
      ]}
    >
      <View
        style={[
          inventoryDetailStyles.itemIndicator,
          scanned && inventoryDetailStyles.itemIndicatorScanned,
          isUnexpected && { backgroundColor: colors.warning },
        ]}
      />

      <View style={inventoryDetailStyles.itemContent}>
        <View style={inventoryDetailStyles.itemHeader}>
          <Text style={inventoryDetailStyles.itemCode}>{item.code}</Text>
          {isUnexpected ? (
            <View
              style={[
                inventoryDetailStyles.scannedBadge,
                { backgroundColor: colors.warning + '20' },
              ]}
            >
              <Ionicons name="alert-circle" size={16} color={colors.warning} />
              <Text style={[inventoryDetailStyles.scannedBadgeText, { color: colors.warning }]}>
                {' '}
                Não Listado
              </Text>
            </View>
          ) : scanned ? (
            <View style={inventoryDetailStyles.scannedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={inventoryDetailStyles.scannedBadgeText}> Escaneado</Text>
            </View>
          ) : (
            <View style={inventoryDetailStyles.pendingBadge}>
              <Ionicons name="ellipse-outline" size={16} color={colors.textDim} />
              <Text style={inventoryDetailStyles.pendingBadgeText}> Pendente</Text>
            </View>
          )}
        </View>

        {item.description ? (
          <Text style={inventoryDetailStyles.itemDesc} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}

        <ItemMeta location={item.location} scanTime={scanTime} />

        {customFieldsEntries.length > 0 && <CustomFields fields={item.customFields!} />}
      </View>
    </View>
  );
});

// ─── Sub-componentes menores ─────────────────────────────────────────────────

interface ItemMetaProps {
  location?: string;
  scanTime: string | null;
}

const ItemMeta = React.memo(({ location, scanTime }: ItemMetaProps) => (
  <View style={inventoryDetailStyles.itemMeta}>
    {location && (
      <View style={inventoryDetailStyles.metaItem}>
        <Ionicons name="location-outline" size={14} color={colors.textDim} />
        <Text style={inventoryDetailStyles.itemMetaText}> {location}</Text>
      </View>
    )}
    {scanTime && (
      <View style={inventoryDetailStyles.metaItem}>
        <Ionicons name="time-outline" size={14} color={colors.textDim} />
        <Text style={inventoryDetailStyles.itemMetaText}> {scanTime}</Text>
      </View>
    )}
  </View>
));

interface CustomFieldsProps {
  fields: Record<string, string>;
}

const CustomFields = React.memo(({ fields }: CustomFieldsProps) => (
  <View style={inventoryDetailStyles.customFieldsContainer}>
    {Object.entries(fields).map(([key, value]) => (
      <View key={key} style={inventoryDetailStyles.customFieldRow}>
        <Text style={inventoryDetailStyles.customFieldKey}>{key}:</Text>
        <Text style={inventoryDetailStyles.customFieldValue}>{value}</Text>
      </View>
    ))}
  </View>
));
