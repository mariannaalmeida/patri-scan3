/**
 *
 * Tela de configurações globais do aplicativo.
 * Permite alternar preferências de scanner (som, vibração)
 * e oferece ações de gerenciamento de dados (limpeza total).
 */

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StorageService } from '../services/StorageService';
import { colors, commonStyles } from '../styles/theme';
import { AppSettings, RootStackParamList } from '../types/types';


type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const SettingsScreen = () => {
  const navigation = useNavigation<NavProp>();

  // Estado local – apenas vibração (sem modo escuro, sem flash)
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  // Carregar configuração real do banco ao abrir a tela
  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (typeof StorageService.getSettings === 'function') {
          const result = await StorageService.getSettings();
          if (result.ok && result.value) {
            setVibrationEnabled(result.value.vibrationEnabled ?? true);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar configurações', error);
      }
    };
    loadSettings();
  }, []);

  // Atualizar e salvar vibração
  const toggleVibration = async () => {
    const newValue = !vibrationEnabled;
    setVibrationEnabled(newValue);

    try {
      if (typeof StorageService.saveSettings === 'function') {
        // Monta um AppSettings completo (campos obsoletos com valores padrão)
        const newSettings: AppSettings = {
          vibrationEnabled: newValue,
          flashEnabled: false,
          theme: 'light',
        };
        await StorageService.saveSettings(newSettings);
      }
    } catch (_) {
      Alert.alert('Erro', 'Não foi possível salvar a configuração.');
      setVibrationEnabled(!newValue); // reverte em caso de erro
    }
  };

  // ─── Botão do Pânico (Zerar App) ───
  const handleClearAllData = () => {
    Alert.alert(
      'ZERAR APLICATIVO',
      'Tem certeza absoluta? Isso apagará TODOS os inventários, itens e relatórios. Essa ação NÃO pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Apagar Tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.clearAllData();
              Alert.alert('Sucesso', 'Todos os dados foram apagados.');
              navigation.replace('Home');
            } catch (_) {
              Alert.alert('Erro', 'Não foi possível apagar os dados.');
            }
          },
        },
      ]
    );
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <View style={commonStyles.container}>
      {/* StatusBar fixo – tema claro sempre (sem modo escuro) */}
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Seção: Scanner ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ESCANEAMENTO</Text>
          <View style={styles.card}>
            <SettingToggle
              icon="phone-portrait-outline"
              label="Vibração"
              description="Vibrar ao ler um código de barras"
              value={vibrationEnabled}
              onValueChange={toggleVibration}
            />
          </View>
        </View>

        {/* ── Seção: Dados e Armazenamento ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GERENCIAMENTO DE DADOS</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.dangerRow} onPress={handleClearAllData}>
              <View style={styles.dangerIconBox}>
                <Ionicons name="trash-outline" size={20} color={colors.warning} />
              </View>
              <View style={styles.dangerTextCol}>
                <Text style={styles.dangerTitle}>Apagar todos os dados</Text>
                <Text style={styles.dangerDesc}>Exclui permanentemente todos os inventários</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Sobre ── */}
        <View style={styles.aboutSection}>
          <Ionicons name="cube-outline" size={40} color={colors.accent} style={{ opacity: 0.5 }} />
          <Text style={styles.appName}>PatriScan</Text>
          <Text style={styles.appVersion}>Versão 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Subcomponentes ──────────────────────────────────────────────────────────

interface SettingToggleProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onValueChange: () => void;
}

export const SettingToggle = ({
  icon,
  label,
  description,
  value,
  onValueChange,
}: SettingToggleProps) => (
  <View style={styles.settingRow}>
    <View style={styles.iconBox}>
      <Ionicons name={icon} size={20} color={colors.text} />
    </View>
    <View style={styles.textCol}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingDesc}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#3E3E55', true: colors.accent }}
      thumbColor="#fff"
      ios_backgroundColor="#3E3E55"
    />
  </View>
);

// ─── Estilos Locais ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(255,255,255,0.05)',
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
