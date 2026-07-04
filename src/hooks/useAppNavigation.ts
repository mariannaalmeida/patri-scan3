// src/hooks/useAppNavigation.ts

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const useAppNavigation = () => {
  const navigation = useNavigation<NavigationProp>();

  // ─── Navegação principal ────────────────────────────────────────────
  const goToHome = () => navigation.navigate('Home');

  const goToInventoryDetail = (params: { inventoryId: string; inventoryName: string }) =>
    navigation.navigate('InventoryDetail', params);

  const goToScanner = (params: { inventoryId: string }) => navigation.navigate('Scanner', params);

  const goToItemDetail = (params: {
    inventoryId: string;
    itemCode: string;
    isUnexpected?: boolean;
  }) => navigation.navigate('ItemDetail', params);

  // ─── Navegação de relatórios ─────────────────────────────────────────
  const goToReports = () => navigation.navigate('Reports');

  const goToReportDetail = (params: { inventoryId: string; inventoryName?: string }) =>
    navigation.navigate('ReportDetail', params);

  // ─── Navegação de criação ────────────────────────────────────────────
  const goToImportInventory = () => navigation.navigate('ImportInventory');

  const goToManualInventory = (params?: { inventoryId?: string; inventoryName?: string }) =>
    navigation.navigate('ManualInventory', params);

  // ─── Navegação de configurações ──────────────────────────────────────
  const goToSettings = () => navigation.navigate('Settings');

  // ─── Voltar ──────────────────────────────────────────────────────────
  const goBack = () => navigation.goBack();

  return {
    goToHome,
    goToInventoryDetail,
    goToScanner,
    goToReports,
    goToReportDetail,
    goToImportInventory,
    goToManualInventory,
    goToSettings,
    goBack,
    goToItemDetail,
    navigation,
  };
};
