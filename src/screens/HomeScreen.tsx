/**
 * HomeScreen.tsx
 *
 * Tela inicial com lista de todos os bens patrimoniais de todos os inventários.
 * Agora compatível com os tipos atuais do PATRISCAN (AssetItem com união discriminada,
 * StorageService baseado em Result, navegação por inventoryId).
 */

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
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
import { Ionicons } from '@expo/vector-icons';
import { StorageService } from '../services/StorageService';
import { colors, commonStyles, homeStyles } from '../styles/theme';
import { AssetItem, Inventory, RootStackParamList } from '../types/types';

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

  // Debounce de busca
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchRaw), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchRaw]);

  // Carregar inventários (usando Result do StorageService)
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

  // Achata todos os itens com flag isScanned (baseada em found)
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

  // Carga inicial e ao focar a tela
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

  // Pull-to-refresh
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

  // Opções de filtro derivadas dos dados
  const availableLocals = useMemo(
    () => [...new Set(allAssets.map((a) => a.location).filter(Boolean))].sort(),
    [allAssets]
  );
  const availableTipos = useMemo(
    () => [...new Set(allAssets.map((a) => a.status).filter(Boolean))].sort(),
    [allAssets]
  );

  // Lista filtrada (busca + filtros)
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

  // Paginação
  const visibleAssets = useMemo(
    () => filteredAssets.slice(0, page * PAGE_SIZE),
    [filteredAssets, page]
  );

  const isLoadingMoreRef = useRef(false);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMoreRef.current || isEndReached) return;
    const nextPage = page + 1;
    const nextCount = nextPage * PAGE_SIZE;
    if (nextCount >= filteredAssets.length) {
      setIsEndReached(true);
      return;
    }

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    // Use requestAnimationFrame ou apenas setPage diretamente;  o importante é resetar após a renderização.
    requestAnimationFrame(() => {
      setPage(nextPage);
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
    });
  }, [page, filteredAssets.length, isLoadingMore, isEndReached]);

  useEffect(() => {
    setPage(1);
    setIsEndReached(filteredAssets.length <= PAGE_SIZE);
  }, [search, filters, filteredAssets.length]);

  // ==================== NAVEGAÇÃO ====================

  // Navegação para detalhe do item (InventoryDetail)
  const handleOpenAsset = useCallback(
    (asset: FlatAsset) => {
      navigation.navigate('InventoryDetail', {
        inventoryId: asset.inventoryId,
        inventoryName: asset.inventoryName,
      });
    },
    [navigation]
  );

  // Navegação para Scanner
  const handleGoToScanner = useCallback(() => {
    const activeInventory = inventories.find((inv) => inv.items.some((item) => !item.found));
    if (activeInventory) {
      navigation.navigate('Scanner', { inventoryId: activeInventory.metadata.id });
    } else if (inventories.length > 0) {
      navigation.navigate('Scanner', {
        inventoryId: inventories[inventories.length - 1].metadata.id,
      });
    } else {
      navigation.navigate('ImportInventory');
    }
  }, [inventories, navigation]);

  // Navegação para Importar CSV
  const handleImportCSV = useCallback(() => {
    navigation.navigate('ImportInventory');
  }, [navigation]);

  // Navegação para Cadastro Manual
  const handleManualInventory = useCallback(() => {
    navigation.navigate('ManualInventory');
  }, [navigation]);

  // Navegação para Relatórios
  const handleGoToReports = useCallback(() => {
    navigation.navigate('Reports');
  }, [navigation]);

  // Navegação para Configurações
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

  // Loading inicial
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

      {/* Header com botões de Relatórios e Configurações */}
      <View style={homeStyles.header}>
        <View>
          <Text style={homeStyles.headerTitle}>PatriScan</Text>
          <Text style={homeStyles.headerSub}>{allAssets.length} bens patrimoniais</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* Botão de Relatórios */}
          <TouchableOpacity style={homeStyles.addBtn} onPress={handleGoToReports}>
            <Ionicons name="bar-chart-outline" size={20} color={colors.accent} />
          </TouchableOpacity>
          {/* Botão de Configurações */}
          <TouchableOpacity style={homeStyles.addBtn} onPress={handleGoToSettings}>
            <Ionicons name="settings-outline" size={20} color={colors.accent} />
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
              <Text style={homeStyles.chipText}>Tipo: {filters.tipo}</Text>
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

      {/* Botões de ação - Três opções */}
      <View style={homeStyles.actionRow}>
        <TouchableOpacity
          style={[homeStyles.actionBtn, homeStyles.actionBtnPrimary]}
          onPress={handleGoToScanner}
          disabled={inventories.length === 0}
        >
          <Ionicons name="barcode-outline" size={18} color="#000" style={{ marginRight: 4 }} />
          <Text style={homeStyles.actionBtnText}>Escanear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[homeStyles.actionBtn, homeStyles.actionBtnSecondary]}
          onPress={handleImportCSV}
        >
          <Ionicons
            name="document-attach-outline"
            size={18}
            color={colors.accent}
            style={{ marginRight: 4 }}
          />
          <Text style={[homeStyles.actionBtnText, { color: colors.accent }]}>Importar CSV</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[homeStyles.actionBtn, homeStyles.actionBtnSecondary]}
          onPress={handleManualInventory}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={colors.accent}
            style={{ marginRight: 4 }}
          />
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
        keyExtractor={(item, index) => `${item.code}-${item.inventoryId}-${index}`}
        renderItem={({ item }) => <AssetRow asset={item} onPress={() => handleOpenAsset(item)} />}
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
  availableTipos: string[];
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
      <TouchableOpacity style={homeStyles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={homeStyles.modalSheet}>
        <View style={homeStyles.modalHandle} />
        <Text style={homeStyles.modalTitle}>Filtros</Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={homeStyles.filterGroupLabel}>Tipo / Status</Text>
          <View style={homeStyles.filterOptions}>
            {['', ...availableTipos].map((val) => (
              <TouchableOpacity
                key={val || '__all_tipo'}
                style={[
                  homeStyles.filterOption,
                  filters.tipo === val && homeStyles.filterOptionActive,
                ]}
                onPress={() => onChange({ ...filters, tipo: val })}
              >
                <Text
                  style={[
                    homeStyles.filterOptionText,
                    filters.tipo === val && homeStyles.filterOptionTextActive,
                  ]}
                >
                  {val || 'Todos'}
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
