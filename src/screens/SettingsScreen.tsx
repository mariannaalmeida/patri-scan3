// SettingsScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StatusBar, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext'; // ajuste o caminho se necessário
import { StorageService } from '../services/StorageService';
import { RootStackParamList } from '../types/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const SettingsScreen = () => {
  const navigation = useNavigation<NavProp>();
  const { colors, mode, toggleTheme, settingsStyles, commonStyles } = useTheme();

  // Estado local para a vibração (já existente)
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  // Carregar configuração real do banco ao abrir a tela
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await StorageService.getSettings();
        if (result.ok && result.value) {
          setVibrationEnabled(result.value.vibrationEnabled ?? true);
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
      const result = await StorageService.getSettings();
      const base = result.ok ? result.value : StorageService.DEFAULT_SETTINGS;
      await StorageService.saveSettings({ ...base, vibrationEnabled: newValue });
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a configuração.');
      setVibrationEnabled(!newValue);
    }
  };

  // Limpeza total dos dados
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
            } catch {
              Alert.alert('Erro', 'Não foi possível apagar os dados.');
            }
          },
        },
      ]
    );
  };

  const handleGoBack = () => navigation.goBack();

  // Define o estilo da barra de status baseado no tema
  const barStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  return (
    <View style={commonStyles.container}>
      <StatusBar barStyle={barStyle} backgroundColor={colors.bg} />

      {/* Header */}
      <View style={settingsStyles.header}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={settingsStyles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={settingsStyles.headerTitle}>Configurações</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={settingsStyles.content} showsVerticalScrollIndicator={false}>
        {/* Seção: Scanner */}
        <View style={settingsStyles.section}>
          <Text style={settingsStyles.sectionTitle}>ESCANEAMENTO</Text>
          <View style={settingsStyles.card}>
            {/* Vibração (já existente) */}
            <View style={settingsStyles.settingRow}>
              <View style={settingsStyles.iconBox}>
                <Ionicons name="phone-portrait-outline" size={20} color={colors.text} />
              </View>
              <View style={settingsStyles.textCol}>
                <Text style={settingsStyles.settingLabel}>Vibração</Text>
                <Text style={settingsStyles.settingDesc}>Vibrar ao ler um código de barras</Text>
              </View>
              <Switch
                value={vibrationEnabled}
                onValueChange={toggleVibration}
                trackColor={{ false: '#3E3E55', true: colors.accent }}
                thumbColor="#fff"
                ios_backgroundColor="#3E3E55"
              />
            </View>

            {/* Separador sutil (opcional) */}
            <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />

            {/* Tema (novo) */}
            <View style={settingsStyles.settingRow}>
              <View style={settingsStyles.iconBox}>
                <Ionicons
                  name={mode === 'dark' ? 'moon-outline' : 'sunny-outline'}
                  size={20}
                  color={colors.text}
                />
              </View>
              <View style={settingsStyles.textCol}>
                <Text style={settingsStyles.settingLabel}>
                  {mode === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                </Text>
                <Text style={settingsStyles.settingDesc}>
                  {mode === 'dark' ? 'Tema escuro ativado' : 'Tema claro ativado'}
                </Text>
              </View>
              <Switch
                value={mode === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: '#3E3E55', true: colors.accent }}
                thumbColor="#fff"
                ios_backgroundColor="#3E3E55"
              />
            </View>
          </View>
        </View>

        {/* Seção: Dados */}
        <View style={settingsStyles.section}>
          <Text style={settingsStyles.sectionTitle}>GERENCIAMENTO DE DADOS</Text>
          <View style={settingsStyles.card}>
            <TouchableOpacity style={settingsStyles.dangerRow} onPress={handleClearAllData}>
              <View style={settingsStyles.dangerIconBox}>
                <Ionicons name="trash-outline" size={20} color={colors.warning} />
              </View>
              <View style={settingsStyles.dangerTextCol}>
                <Text style={settingsStyles.dangerTitle}>Apagar todos os dados</Text>
                <Text style={settingsStyles.dangerDesc}>
                  Exclui permanentemente todos os inventários
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sobre */}
        <View style={settingsStyles.aboutSection}>
          <Ionicons name="cube-outline" size={40} color={colors.accent} style={{ opacity: 0.5 }} />
          <Text style={settingsStyles.appName}>PatriScan</Text>
          <Text style={settingsStyles.appVersion}>Versão 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};
