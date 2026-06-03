/**
 * SettingsScreen.tsx
 *
 * Tela de configurações globais do aplicativo.
 * Permite alternar preferências de scanner (som, vibração, flash)
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

  // Estado local das configurações (com valores padrão seguros)
  const [settings, setSettings] = useState<AppSettings>({
    soundEnabled: false,
    vibrationEnabled: true,
    flashEnabled: false,
    theme: 'light',
  });

  // Carregar configurações reais do banco ao abrir a tela
  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (typeof StorageService.getSettings === 'function') {
          const result = await StorageService.getSettings();

          // Verifica se o Result deu "ok" e se trouxe um valor
          if (result.ok && result.value) {
            setSettings(result.value);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar configurações', error);
      }
    };
    loadSettings();
  }, []);

  // Atualizar e salvar configuração
  // Altere a assinatura da função para ignorar o 'theme'
  const toggleSetting = async (key: 'soundEnabled' | 'vibrationEnabled' | 'flashEnabled') => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);

    try {
      if (typeof StorageService.saveSettings === 'function') {
        await StorageService.saveSettings(newSettings);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a configuração.');
      // Usar uma função de callback no setState é mais seguro para reverter
      setSettings((prev) => ({ ...prev, [key]: !newSettings[key] }));
    }
  };

  const toggleTheme = async () => {
    const previousTheme = settings.theme;

    const newSettings: AppSettings = {
      ...settings,
      theme: previousTheme === 'dark' ? 'light' : 'dark',
    };

    setSettings(newSettings);

    try {
      await StorageService.saveSettings(newSettings);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a configuração.');

      setSettings((prev) => ({
        ...prev,
        theme: previousTheme,
      }));
    }
  };

  // ─── Botão do Pânico (Zerar App) ───
  const handleClearAllData = () => {
    Alert.alert(
      ' ZERAR APLICATIVO',
      'Tem certeza absoluta? Isso apagará TODOS os inventários, itens e relatórios. Essa ação NÃO pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Apagar Tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              // Limpa os dados via StorageService
              await StorageService.clearAllData();
              Alert.alert('Sucesso', 'Todos os dados foram apagados.');
              navigation.replace('Home'); // Volta pra Home limpa
            } catch (error) {
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
      <StatusBar
        barStyle={settings.theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />

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
              icon="volume-high-outline"
              label="Som do bipe"
              description="Tocar som ao ler um código de barras"
              value={settings.soundEnabled}
              onValueChange={() => toggleSetting('soundEnabled')}
            />
            <Divider />
            <SettingToggle
              icon="phone-portrait-outline"
              label="Vibração"
              description="Vibrar ao ler um código de barras"
              value={settings.vibrationEnabled}
              onValueChange={() => toggleSetting('vibrationEnabled')}
            />
            <Divider />
            <SettingToggle
              icon="flashlight-outline"
              label="Lanterna (Flash)"
              description="Manter a lanterna ligada no scanner"
              value={settings.flashEnabled}
              onValueChange={() => toggleSetting('flashEnabled')}
            />
          </View>
        </View>

        {/* ── Seção: Aparência ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APARÊNCIA</Text>
          <View style={styles.card}>
            <SettingToggle
              icon="moon-outline"
              label="Modo Escuro"
              description="Usar tema escuro no aplicativo"
              value={settings.theme === 'dark'}
              onValueChange={toggleTheme}
            />
          </View>
        </View>

        {/* ── Seção: Dados e Armazenamento ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GERENCIAMENTO DE DADOS</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.dangerRow} onPress={handleClearAllData}>
              <View style={styles.dangerIconBox}>
                <Ionicons name="trash-outline" size={20} color={colors.accentWarn} />
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

const Divider = () => <View style={styles.divider} />;

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
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginLeft: 64, // Alinha com o texto, ignorando o ícone
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
    backgroundColor: colors.accentWarn + '20',
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
    color: colors.accentWarn,
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
