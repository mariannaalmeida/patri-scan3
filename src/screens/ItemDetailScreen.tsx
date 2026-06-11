import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StorageService } from '../services/StorageService';
import { colors, commonStyles, itemDetailStyles } from '../styles/theme';
import { AssetItem, AssetStatus, RootStackParamList, isScannedItem } from '../types/types';
import { formatBrazilianCurrency } from '../utils/currencyUtils';
import { formatDisplayDate, formatDisplayTime } from '../utils/dateUtils';
type ItemDetailRouteProp = RouteProp<RootStackParamList, 'ItemDetail'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_LABELS: Record<AssetStatus, string> = {
  good: 'Bom estado',
  damaged: 'Danificado',
  missing: 'Extraviado',
  in_repair: 'Em manutenção',
};

export const ItemDetailScreen = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ItemDetailRouteProp>();
  const { inventoryId, itemCode } = route.params;

  const [item, setItem] = useState<AssetItem | null>(null);
  const [inventoryName, setInventoryName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadItem = async () => {
      try {
        const result = await StorageService.loadInventory(inventoryId);
        if (result.ok) {
          const inventory = result.value;
          setInventoryName(inventory.metadata.name);
          const found = inventory.items.find((i) => i.code === itemCode);
          setItem(found || null);
        }
      } catch (error) {
        console.error('Erro ao carregar item:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadItem();
  }, [inventoryId, itemCode]);

  const handleGoBack = () => navigation.goBack();

  if (isLoading) {
    return (
      <View style={commonStyles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={commonStyles.loadingText}>Carregando item…</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={commonStyles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <Ionicons name="alert-circle-outline" size={48} color={colors.accentErr} />
        <Text style={commonStyles.errorText}>Item não encontrado.</Text>
        <TouchableOpacity onPress={handleGoBack} style={commonStyles.errorButton}>
          <Text style={commonStyles.errorButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const scanned = isScannedItem(item);
  const customFieldsEntries = item.customFields ? Object.entries(item.customFields) : [];

  return (
    <View style={commonStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={itemDetailStyles.header}>
        <TouchableOpacity onPress={handleGoBack} style={itemDetailStyles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={itemDetailStyles.headerTitle} numberOfLines={1}>
          Detalhes do Item
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={itemDetailStyles.content}
        contentContainerStyle={itemDetailStyles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Badge */}
        <View style={itemDetailStyles.statusSection}>
          {scanned ? (
            <View style={itemDetailStyles.statusBadgeScanned}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <Text style={itemDetailStyles.statusTextScanned}>Item Escaneado</Text>
            </View>
          ) : (
            <View style={itemDetailStyles.statusBadgePending}>
              <Ionicons name="time-outline" size={24} color={colors.accentWarn} />
              <Text style={itemDetailStyles.statusTextPending}>Pendente</Text>
            </View>
          )}
        </View>

        {/* Código */}
        <View style={itemDetailStyles.section}>
          <Text style={itemDetailStyles.sectionTitle}>Código do Patrimônio</Text>
          <Text style={itemDetailStyles.codeValue}>{item.code}</Text>
        </View>

        {/* Inventário */}
        <View style={itemDetailStyles.section}>
          <Text style={itemDetailStyles.sectionTitle}>Inventário</Text>
          <Text style={itemDetailStyles.fieldValue}>{inventoryName}</Text>
        </View>

        {/* Informações principais */}
        <View style={itemDetailStyles.card}>
          <DetailField icon="cube-outline" label="Descrição" value={item.description} />
          <DetailField icon="business-outline" label="Departamento" value={item.department} />
          <DetailField icon="location-outline" label="Localização" value={item.location} />
          <DetailField
            icon="information-circle-outline"
            label="Status"
            value={STATUS_LABELS[item.status] || item.status}
          />
          {item.value !== undefined && item.value !== null && (
            <DetailField
              icon="cash-outline"
              label="Valor"
              value={formatBrazilianCurrency(item.value)}
            />
          )}
        </View>

        {/* Campos Customizados */}
        {customFieldsEntries.length > 0 && (
          <View style={itemDetailStyles.card}>
            <Text style={itemDetailStyles.cardTitle}>Campos Extras</Text>
            {customFieldsEntries.map(([key, value]) => (
              <DetailField key={key} icon="star-outline" label={key} value={value} />
            ))}
          </View>
        )}

        {/* Informações do Scan */}
        {scanned && (
          <View style={itemDetailStyles.card}>
            <Text style={itemDetailStyles.cardTitle}>Dados do Scan</Text>
            <DetailField
              icon="calendar-outline"
              label="Data do Scan"
              value={formatDisplayDate(item.scanDate)}
            />
            <DetailField
              icon="time-outline"
              label="Hora do Scan"
              value={formatDisplayTime(item.scanDate)}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Sub-componente para campos de detalhe
interface DetailFieldProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
}

const DetailField = React.memo(({ icon, label, value }: DetailFieldProps) => {
  if (!value) return null;
  return (
    <View style={itemDetailStyles.fieldRow}>
      <View style={itemDetailStyles.fieldIcon}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <View style={itemDetailStyles.fieldContent}>
        <Text style={itemDetailStyles.fieldLabel}>{label}</Text>
        <Text style={itemDetailStyles.fieldValue}>{value}</Text>
      </View>
    </View>
  );
});
