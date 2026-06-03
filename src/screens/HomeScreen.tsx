/**
 * HomeScreen.tsx
 *
 * Tela inicial com lista de todos os bens patrimoniais de todos os inventários.
 * Compatível com os tipos atuais do PATRISCAN (AssetItem com união discriminada,
 * StorageService baseado em Result, navegação por inventoryId).
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StorageService } from '../services/StorageService';
import { colors, commonStyles, homeStyles } from '../styles/theme';
import { AssetItem, AssetStatus, Inventory, RootStackParamList } from '../types/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type FlatAsset = AssetItem & {
  inventoryName: string;
  inventoryId: string;
  isScanned: boolean;
};

interface ActiveFilters {
  tipo: string;
  local: string;
}

const PAGE_SIZE = 20;

// Mapa de rótulos legíveis para os valores internos de AssetStatus.
const STATUS_LABELS: Record<AssetStatus, string> = {
  good: 'Bom estado',
  damaged: 'Danificado',
  missing: 'Extraviado',
  in_repair: 'Em manutenção',
};

export const HomeScreen = () => {
  const navigation = useNavigation<NavProp>();

  const [allAssets, setAllAssets] = useState<FlatAsset[]>([]);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [page, setPage] = useState(0);
  const [isEndReached, setIsEndReached] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchRaw, setSearchRaw] = useState('');
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filters, setFilters] = useState<ActiveFilters>({ tipo: '', local: '' });
  const [pendingFilters, setPendingFilters] = useState<ActiveFilters>({ tipo: '', local: '' });

  // Ref para manter o valor mais recente de page sem incluí-lo nas dependências
  const pageRef = useRef(page);
  pageRef.current = page;

  // Debounce de busca
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchRaw), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchRaw]);

  const loadInventories = useCallback(async (): Promise<Inventory[]> => {
    const idsResult = await StorageService.getInventories();
    if (!idsResult.ok) {
      console.error('Erro ao listar inventários:', idsResult.error.message);
      Alert.alert('Erro', 'Não foi possível carregar os inventários.');
      return [];
    }

    const ids = idsResult.value;
    const loaded = await Promise.all(
      ids.map(async (id) => {
        const invResult = await StorageService.loadInventory(id);
        return invResult.ok ? invResult.value : null;
      })
    );

    return loaded.filter((inv): inv is Inventory => inv !== null);
  }, []);

  const buildFlatAssets = useCallback((invs: Inventory[]): FlatAsset[] => {
    return invs.flatMap((inv) =>
      inv.items.map((item) => ({
        ...item,
        inventoryName: inv.metadata.name,
        inventoryId: inv.metadata.id,
        isScanned: item.found === true,
      }))
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const run = async () => {
        setIsLoading(true);
        const invs = await loadInventories();
        if (!active) return;
        const flat = buildFlatAssets(invs);
        setInventories(invs);
        setAllAssets(flat);
        setPage(1);
        setIsEndReached(flat.length <= PAGE_SIZE);
        setIsLoading(false);
      };
      run();
      return () => {
        active = false;
      };
    }, [loadInventories, buildFlatAssets])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const invs = await loadInventories();
    const flat = buildFlatAssets(invs);
    setInventories(invs);
    setAllAssets(flat);
    setPage(1);
    setIsEndReached(flat.length <= PAGE_SIZE);
    setIsRefreshing(false);
  }, [loadInventories, buildFlatAssets]);

  const availableLocals = useMemo(
    () => [...new Set(allAssets.map((a) => a.location).filter(Boolean))].sort(),
    [allAssets]
  );

  // availableTipos retorna objetos { value, label } para exibir rótulos legíveis na UI
  const availableTipos = useMemo(
    () =>
      [...new Set(allAssets.map((a) => a.status).filter((s): s is AssetStatus => Boolean(s)))]
        .sort()
        .map((value) => ({ value, label: STATUS_LABELS[value] ?? value })),
    [allAssets]
  );

  const filteredAssets = useMemo(() => {
    let list = allAssets;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.code?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q) ||
          a.location?.toLowerCase().includes(q)
      );
    }
    if (filters.tipo) list = list.filter((a) => a.status === filters.tipo);
    if (filters.local) list = list.filter((a) => a.location === filters.local);
    return list;
  }, [allAssets, search, filters]);

  const visibleAssets = useMemo(
    () => filteredAssets.slice(0, page * PAGE_SIZE),
    [filteredAssets, page]
  );

  const isLoadingMoreRef = useRef(false);

  // CORREÇÃO: handleLoadMore sem requestAnimationFrame, usando pageRef para valor atual e setPage direto.
  const handleLoadMore = useCallback(() => {
    if (isLoadingMoreRef.current || isEndReached) return;
    const nextPage = pageRef.current + 1;
    const nextCount = nextPage * PAGE_SIZE;
    if (nextCount >= filteredAssets.length) {
      setIsEndReached(true);
      return;
    }

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    setPage(nextPage);
    setIsLoadingMore(false);
    isLoadingMoreRef.current = false;
  }, [filteredAssets.length, isEndReached]);

  // Reset de página quando busca ou filtros mudam
  useEffect(() => {
    setPage(1);
    setIsEndReached(filteredAssets.length <= PAGE_SIZE);
  }, [search, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // ==================== NAVEGAÇÃO ====================

  const handleGoToInventory = useCallback(
    (asset: FlatAsset) => {
      navigation.navigate('InventoryDetail', {
        inventoryId: asset.inventoryId,
        inventoryName: asset.inventoryName,
      });
    },
    [navigation]
  );

  const handleGoToScanner = useCallback(() => {
    const activeInventories = inventories.filter((inv) => inv.items.some((item) => !item.found));

    if (activeInventories.length === 0) {
      if (inventories.length > 0) {
        navigation.navigate('Scanner', {
          inventoryId: inventories[inventories.length - 1].metadata.id,
        });
      } else {
        navigation.navigate('ImportInventory');
      }
      return;
    }

    if (activeInventories.length === 1) {
      navigation.navigate('Scanner', { inventoryId: activeInventories[0].metadata.id });
      return;
    }

    Alert.alert(
      'Selecionar inventário',
      'Há mais de um inventário em andamento. Qual deseja escanear?',
      [
        ...activeInventories.map((inv) => ({
          text: inv.metadata.name,
          onPress: () => navigation.navigate('Scanner', { inventoryId: inv.metadata.id }),
        })),
        { text: 'Cancelar', style: 'cancel' as const },
      ]
    );
  }, [inventories, navigation]);

  const handleImportCSV = useCallback(() => {
    navigation.navigate('ImportInventory');
  }, [navigation]);

  const handleManualInventory = useCallback(() => {
    navigation.navigate('ManualInventory');
  }, [navigation]);

  const handleGoToReports = useCallback(() => {
    navigation.navigate('Reports');
  }, [navigation]);

  const handleGoToSettings = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  // ==================== FILTROS ====================

  const applyFilters = useCallback(() => {
    setFilters(pendingFilters);
    setIsFilterOpen(false);
  }, [pendingFilters]);

  const clearFilters = useCallback(() => {
    const empty: ActiveFilters = { tipo: '', local: '' };
    setFilters(empty);
    setPendingFilters(empty);
    setIsFilterOpen(false);
  }, []);

  const hasActiveFilters = filters.tipo !== '' || filters.local !== '';

  if (isLoading) {
    return (
      <View style={commonStyles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={commonStyles.loadingText}>Carregando patrimônio…</Text>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={homeStyles.header}>
        <View>
          <Text style={homeStyles.headerTitle}>PatriScan</Text>
          <Text style={homeStyles.headerSub}>{allAssets.length} bens patrimoniais</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={homeStyles.addBtn}
            onPress={handleGoToReports}
            accessibilityRole="button"
            accessibilityLabel="Relatórios"
          >
            <Ionicons name="bar-chart-outline" size={20} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={homeStyles.addBtn}
            onPress={handleGoToSettings}
            accessibilityRole="button"
            accessibilityLabel="Configurações"
          >
            <Ionicons name="settings" size={20} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Busca e filtro */}
      <View style={homeStyles.searchRow}>
        <View style={homeStyles.searchBar}>
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.textDim}
            style={{ marginRight: 6 }}
          />
          <TextInput
            style={homeStyles.searchInput}
            value={searchRaw}
            onChangeText={setSearchRaw}
            placeholder="Buscar patrimônio ou descrição…"
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        <TouchableOpacity
          style={[homeStyles.filterBtn, hasActiveFilters && homeStyles.filterBtnActive]}
          onPress={() => {
            setPendingFilters(filters);
            setIsFilterOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Filtros"
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={hasActiveFilters ? colors.accent : colors.textDim}
          />
          {hasActiveFilters && <View style={homeStyles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Chips de filtro ativos */}
      {hasActiveFilters && (
        <View style={homeStyles.activeFiltersRow}>
          {filters.tipo && (
            <View style={homeStyles.chip}>
              <Text style={homeStyles.chipText}>
                Tipo: {STATUS_LABELS[filters.tipo as AssetStatus] ?? filters.tipo}
              </Text>
            </View>
          )}
          {filters.local && (
            <View style={homeStyles.chip}>
              <Text style={homeStyles.chipText}>Local: {filters.local}</Text>
            </View>
          )}
          <TouchableOpacity style={homeStyles.chipClear} onPress={clearFilters}>
            <Text style={homeStyles.chipClearText}>✕ Limpar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Botões de ação */}
      <View style={homeStyles.actionRow}>
        <TouchableOpacity
          style={[homeStyles.actionBtn, homeStyles.actionBtnPrimary]}
          onPress={handleGoToScanner}
          disabled={inventories.length === 0}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Escanear inventário"
        >
          <View style={homeStyles.actionBtnIconContainer}>
            <Ionicons name="barcode-outline" size={22} color="#000" />
          </View>
          <Text style={homeStyles.actionBtnText}>Escanear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[homeStyles.actionBtn, homeStyles.actionBtnSecondary]}
          onPress={handleImportCSV}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Importar arquivo CSV"
        >
          <View style={homeStyles.actionBtnIconContainer}>
            <Ionicons name="document-attach-outline" size={22} color={colors.accent} />
          </View>
          <Text style={[homeStyles.actionBtnText, { color: colors.accent }]}>Importar CSV</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[homeStyles.actionBtn, homeStyles.actionBtnSecondary]}
          onPress={handleManualInventory}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Cadastrar manualmente"
        >
          <View style={homeStyles.actionBtnIconContainer}>
            <Ionicons name="create-outline" size={22} color={colors.accent} />
          </View>
          <Text style={[homeStyles.actionBtnText, { color: colors.accent }]}>Cadastrar</Text>
        </TouchableOpacity>
      </View>

      {/* Contador */}
      <View style={homeStyles.counterRow}>
        <Text style={homeStyles.counterText}>
          <Text style={homeStyles.counterNum}>{filteredAssets.length}</Text>{' '}
          {filteredAssets.length === 1 ? 'item' : 'itens'} encontrado
          {filteredAssets.length === 1 ? '' : 's'}
          {hasActiveFilters || search ? ` (de ${allAssets.length})` : ''}
        </Text>
      </View>

      {/* Lista paginada */}
      <FlatList
        data={visibleAssets}
        keyExtractor={(item) => `${item.inventoryId}-${item.code}`}
        renderItem={({ item }) => (
          <AssetRow asset={item} onPress={() => handleGoToInventory(item)} />
        )}
        contentContainerStyle={[
          homeStyles.listContent,
          visibleAssets.length === 0 && homeStyles.listContentEmpty,
        ]}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={homeStyles.footerLoader}>
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={homeStyles.footerLoaderText}>Carregando mais itens…</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={homeStyles.emptyContainer}>
            <Ionicons
              name={search || hasActiveFilters ? 'search-outline' : 'cube-outline'}
              size={48}
              color={colors.textDim}
              style={{ marginBottom: 12 }}
            />
            <Text style={homeStyles.emptyTitle}>
              {search || hasActiveFilters ? 'Nenhum item encontrado' : 'Nenhum bem patrimonial'}
            </Text>
            <Text style={homeStyles.emptyDesc}>
              {search || hasActiveFilters
                ? 'Tente ajustar a busca ou os filtros.'
                : 'Importe um CSV ou cadastre manualmente para começar.'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Modal de filtros */}
      <FilterModal
        visible={isFilterOpen}
        filters={pendingFilters}
        availableTipos={availableTipos}
        availableLocals={availableLocals}
        onChange={setPendingFilters}
        onApply={applyFilters}
        onClear={clearFilters}
        onClose={() => setIsFilterOpen(false)}
      />
    </View>
  );
};

// ─── Componente de linha de bem ───────────────────────────────────────────────

interface AssetRowProps {
  asset: FlatAsset;
  onPress: () => void;
}

const AssetRow = React.memo(({ asset, onPress }: AssetRowProps) => (
  <TouchableOpacity
    style={[homeStyles.itemRow, asset.isScanned && homeStyles.itemRowScanned]}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={`${asset.code} ${asset.description || ''}, ${
      asset.isScanned ? 'escaneado' : 'pendente'
    }`}
  >
    <View style={[homeStyles.itemIndicator, asset.isScanned && homeStyles.itemIndicatorScanned]} />
    <View style={homeStyles.itemBody}>
      <View style={homeStyles.itemHeader}>
        <Text style={homeStyles.itemCode}>{asset.code}</Text>
        <View style={asset.isScanned ? homeStyles.badgeOk : homeStyles.badgePending}>
          {asset.isScanned ? (
            <Ionicons name="checkmark" size={12} color="#0F6E56" />
          ) : (
            <Ionicons name="time-outline" size={12} color="#854F0B" />
          )}
        </View>
      </View>
      {asset.description && (
        <Text style={homeStyles.itemDesc} numberOfLines={1}>
          {asset.description}
        </Text>
      )}
      <View style={homeStyles.itemMeta}>
        {asset.location && (
          <Text style={homeStyles.itemMetaText}>
            <Ionicons name="location-outline" size={11} /> {asset.location}
          </Text>
        )}
        {asset.department && (
          <Text style={homeStyles.itemMetaText}>
            <Ionicons name="business-outline" size={11} /> {asset.department}
          </Text>
        )}
        <Text style={homeStyles.itemMetaInv}>
          <Ionicons name="folder-outline" size={11} /> {asset.inventoryName}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
));

// ─── Modal de filtros ─────────────────────────────────────────────────────────

interface FilterModalProps {
  visible: boolean;
  filters: ActiveFilters;
  availableTipos: { value: string; label: string }[];
  availableLocals: string[];
  onChange: (f: ActiveFilters) => void;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
}

const FilterModal = React.memo(
  ({
    visible,
    filters,
    availableTipos,
    availableLocals,
    onChange,
    onApply,
    onClear,
    onClose,
  }: FilterModalProps) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* CORREÇÃO: overlay sem flex extra, usando estilo absoluto definido em homeStyles.modalOverlay */}
      <TouchableOpacity
        style={homeStyles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
        accessibilityLabel="Fechar filtros"
      />
      <View style={homeStyles.modalSheet}>
        <View style={homeStyles.modalHandle} />
        <Text style={homeStyles.modalTitle}>Filtros</Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={homeStyles.filterGroupLabel}>Tipo / Status</Text>
          <View style={homeStyles.filterOptions}>
            <TouchableOpacity
              key="__all_tipo"
              style={[
                homeStyles.filterOption,
                filters.tipo === '' && homeStyles.filterOptionActive,
              ]}
              onPress={() => onChange({ ...filters, tipo: '' })}
              accessibilityRole="button"
              accessibilityLabel="Todos os tipos"
            >
              <Text
                style={[
                  homeStyles.filterOptionText,
                  filters.tipo === '' && homeStyles.filterOptionTextActive,
                ]}
              >
                Todos
              </Text>
            </TouchableOpacity>
            {availableTipos.map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                style={[
                  homeStyles.filterOption,
                  filters.tipo === value && homeStyles.filterOptionActive,
                ]}
                onPress={() => onChange({ ...filters, tipo: value })}
                accessibilityRole="button"
                accessibilityLabel={label}
              >
                <Text
                  style={[
                    homeStyles.filterOptionText,
                    filters.tipo === value && homeStyles.filterOptionTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={homeStyles.filterGroupLabel}>Local / Sala</Text>
          <View style={homeStyles.filterOptions}>
            {['', ...availableLocals].map((val) => (
              <TouchableOpacity
                key={val || '__all_local'}
                style={[
                  homeStyles.filterOption,
                  filters.local === val && homeStyles.filterOptionActive,
                ]}
                onPress={() => onChange({ ...filters, local: val })}
                accessibilityRole="button"
                accessibilityLabel={val || 'Todos os locais'}
              >
                <Text
                  style={[
                    homeStyles.filterOptionText,
                    filters.local === val && homeStyles.filterOptionTextActive,
                  ]}
                >
                  {val || 'Todos'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={homeStyles.modalActions}>
          <TouchableOpacity style={homeStyles.btnClear} onPress={onClear}>
            <Text style={homeStyles.btnClearText}>Limpar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={homeStyles.btnApply} onPress={onApply}>
            <Text style={homeStyles.btnApplyText}>Aplicar filtros</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
);
