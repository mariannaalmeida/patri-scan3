/**
 * Tela para cadastro manual de inventário, item por item.
 * Útil para pequenos inventários ou quando não há arquivo CSV.
 * Suporte completo a campos dinâmicos (EAV / Dynamic Schema)
 */

import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Toast from 'react-native-toast-message';
import { useTheme } from '../contexts/ThemeContext';
import { StorageService } from '../services/StorageService';
import { AssetItem, Inventory, RootStackParamList, UnexpectedItem } from '../types/types';
import { formatBrazilianCurrencyInput, parseBrazilianCurrencySafe } from '../utils/currencyUtils';
import { toISODate } from '../utils/dateUtils';
import { generateBasicSchema } from '../utils/schemaUtils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ManualInventoryRouteProp = RouteProp<RootStackParamList, 'ManualInventory'>;

//  Tipos internos da tela

interface CustomFieldDef {
  id: string;
  name: string;
}

interface ManualItem {
  id: string;
  code: string;
  description: string;
  location: string;
  value: string;
  customFields: Record<string, string>;
}

// Tipagem - Modal Customizado
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

// Constantes

const createEmptyItem = (): ManualItem => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  code: '',
  description: '',
  location: '',
  value: '',
  customFields: {},
});

//  Componente principal

export const ManualInventoryScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ManualInventoryRouteProp>();
  const { colors, mode, manualInventoryStyles, localStyles } = useTheme();

  // Parâmetros para identificar se estamos adicionando itens não listados a um inventário existente
  const existingInventoryId = route.params?.inventoryId;
  const existingInventoryName = route.params?.inventoryName;

  const isUnexpectedMode = !!existingInventoryId;
  const prefilledCode = route.params?.prefilledCode || '';

  const [inventoryName, setInventoryName] = useState('');
  const [schemaFields, setSchemaFields] = useState<CustomFieldDef[]>([]);
  const [newFieldName, setNewFieldName] = useState('');

  // Iniciamos a lista já injetando o código recebido!
  const [items, setItems] = useState<ManualItem[]>([
    {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      code: prefilledCode,
      description: '',
      location: '',
      value: '',
      customFields: {},
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [inventoryLocation, setInventoryLocation] = useState('');
  const [inventoryYear, setInventoryYear] = useState('');

  // Estado para controlar o Modal de Confirmação
  const [dialogConfig, setDialogConfig] = useState<DialogConfig>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  const closeDialog = () => setDialogConfig((prev) => ({ ...prev, visible: false }));

  // Navegação

  const handleGoBack = () => navigation.goBack();

  const handleGoToHome = () => {
    const hasData = isUnexpectedMode
      ? items.some((item) => item.code.trim() !== '')
      : inventoryName.trim() !== '' || items.some((item) => item.code.trim() !== '');
    if (hasData) {
      setDialogConfig({
        visible: true,
        title: 'Sair sem salvar?',
        message:
          'Você tem dados não salvos. Se voltar para a Home, perderá o que digitou. Deseja sair?',
        buttons: [
          { text: 'Cancelar', type: 'cancel', onPress: closeDialog },
          {
            text: 'Sair e Perder Dados',
            type: 'danger',
            onPress: () => {
              closeDialog();
              navigation.navigate('Home');
            },
          },
        ],
      });
    } else {
      navigation.navigate('Home');
    }
  };

  // Gerenciamento do Schema

  const addSchemaField = () => {
    const trimmed = newFieldName.trim();
    if (!trimmed) return;

    const isDuplicate = schemaFields.some((f) => f.name.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      Toast.show({ type: 'error', text1: 'Atenção', text2: 'Já existe um campo com este nome.' });
      return;
    }

    setSchemaFields((prev) => [
      ...prev,
      { id: Date.now().toString() + Math.random().toString(36).slice(2), name: trimmed },
    ]);
    setNewFieldName('');
  };

  const removeSchemaField = (id: string, name: string) => {
    setDialogConfig({
      visible: true,
      title: 'Remover campo',
      message: `Tem certeza? Todos os dados preenchidos em "${name}" serão perdidos.`,
      buttons: [
        { text: 'Cancelar', type: 'cancel', onPress: closeDialog },
        {
          text: 'Remover',
          type: 'danger',
          onPress: () => {
            setSchemaFields((prev) => prev.filter((f) => f.id !== id));
            setItems((prev) =>
              prev.map((item) => {
                const updatedCustomFields = { ...item.customFields };
                delete updatedCustomFields[name];
                return { ...item, customFields: updatedCustomFields };
              })
            );
            closeDialog();
          },
        },
      ],
    });
  };

  //  Gerenciamento de Itens
  const addItem = () => setItems((prev) => [...prev, createEmptyItem()]);

  const removeItem = (id: string) => {
    if (items.length === 1) {
      Toast.show({
        type: 'error',
        text1: 'Atenção',
        text2: 'O inventário precisa ter ao menos um item.',
      });
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const duplicateItem = (id: string) => {
    const original = items.find((item) => item.id === id);
    if (!original) return;

    const newItem: ManualItem = {
      ...original,
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      customFields: { ...original.customFields },
    };

    setItems((prev) => [...prev, newItem]);
    Toast.show({
      type: 'success',
      text1: 'Item duplicado',
      text2: `Cópia de ${original.code || 'sem código'} criada.`,
    });
  };

  const updateItem = <K extends keyof Omit<ManualItem, 'customFields' | 'id'>>(
    id: string,
    field: K,
    value: ManualItem[K]
  ) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const updateCustomField = (itemId: string, fieldName: string, value: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          customFields: { ...item.customFields, [fieldName]: value },
        };
      })
    );
  };

  // Salvar
  const handleSave = async () => {
    if (!isUnexpectedMode && !inventoryName.trim()) {
      Toast.show({ type: 'error', text1: 'Erro', text2: 'Digite um nome para o inventário.' });
      return;
    }

    const missingCode = items.find((item) => !item.code.trim());
    if (missingCode) {
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Todos os itens precisam de ter um código preenchido.',
      });
      return;
    }

    const formCodes = items.map((item) => item.code.trim().toUpperCase());
    const uniqueFormCodes = new Set(formCodes);
    if (uniqueFormCodes.size !== formCodes.length) {
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Digitou códigos duplicados neste formulário.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const now = toISODate(new Date());
      const assetItems: AssetItem[] = items.map((item) => {
        const base = {
          code: item.code.trim().toUpperCase(),
          description: item.description.trim() || undefined,
          location: item.location.trim() || inventoryLocation.trim() || undefined,
          value: parseBrazilianCurrencySafe(item.value),
          customFields: Object.keys(item.customFields).length > 0 ? item.customFields : undefined,
        };

        if (isUnexpectedMode) {
          return { ...base, found: true as const, scanDate: now };
        } else {
          return { ...base, found: false as const };
        }
      });

      if (isUnexpectedMode && existingInventoryId) {
        const loadResult = await StorageService.loadInventory(existingInventoryId);

        if (!loadResult.ok) {
          throw new Error('Não foi possível carregar o inventário existente.');
        }

        const inventory = loadResult.value;

        const existingRegularCodes = new Set(inventory.items.map((i) => i.code.toUpperCase()));
        const existingUnexpectedCodes = new Set(
          (inventory.unexpectedItems || []).map((i) => i.code.toUpperCase())
        );

        for (const code of formCodes) {
          if (existingRegularCodes.has(code)) {
            Toast.show({
              type: 'error',
              text1: 'Código já existe',
              text2: `O código ${code} pertence à lista original do inventário. Escaneie-o normalmente.`,
            });
            setIsLoading(false);
            return;
          }
          if (existingUnexpectedCodes.has(code)) {
            Toast.show({
              type: 'error',
              text1: 'Código Duplicado',
              text2: `A sobra física ${code} já foi registada anteriormente.`,
            });
            setIsLoading(false);
            return;
          }
        }

        inventory.metadata.lastModified = now;

        const unexpectedItemsToAdd: UnexpectedItem[] = items.map((item) => ({
          code: item.code.trim().toUpperCase(),
          scannedAt: now,
          description: item.description.trim() || undefined,
          location: item.location.trim() || inventoryLocation.trim() || undefined,
          customFields: Object.keys(item.customFields).length > 0 ? item.customFields : undefined,
        }));

        inventory.unexpectedItems = [...(inventory.unexpectedItems || []), ...unexpectedItemsToAdd];

        const newSchemaFields = schemaFields.filter(
          (f) => !inventory.schema.fields.some((existing) => existing.name === f.name)
        );

        if (newSchemaFields.length > 0) {
          inventory.schema.fields.push(
            ...newSchemaFields.map((f) => ({
              name: f.name,
              label: f.name,
              type: 'text' as const,
              required: false,
            }))
          );
        }

        const saveResult = await StorageService.saveInventory(inventory);

        if (saveResult.ok) {
          setDialogConfig({
            visible: true,
            title: 'Sucesso!',
            message: `${assetItems.length} itens adicionados ao inventário "${existingInventoryName}".`,
            buttons: [
              {
                text: 'Voltar ao Inventário',
                type: 'primary',
                onPress: () => {
                  closeDialog();
                  navigation.goBack();
                },
              },
            ],
          });
        } else {
          throw new Error(saveResult.error?.message ?? 'Erro desconhecido ao atualizar inventário');
        }
      } else {
        const id = StorageService.generateInventoryId();
        const schema = generateBasicSchema(
          assetItems,
          schemaFields.map((f) => f.name)
        );

        const inventory: Inventory = {
          items: assetItems,
          unexpectedItems: [],
          metadata: {
            id,
            name: inventoryName.trim(),
            location: inventoryLocation.trim() || undefined,
            year: inventoryYear.trim() ? Number(inventoryYear.trim()) : undefined,
            importDate: now,
            totalItems: assetItems.length,
            status: 'active',
            lastModified: now,
          },
          schema,
        };

        const result = await StorageService.saveInventory(inventory);
        if (result.ok) {
          setDialogConfig({
            visible: true,
            title: 'Sucesso!',
            message: `Inventário "${inventoryName}" criado com ${assetItems.length} itens.`,
            buttons: [
              {
                text: 'Ver Inventário',
                type: 'primary',
                onPress: () => {
                  closeDialog();
                  navigation.replace('InventoryDetail', {
                    inventoryId: id,
                    inventoryName: inventoryName.trim(),
                  });
                },
              },
              {
                text: 'Ir para Home',
                type: 'cancel',
                onPress: () => {
                  closeDialog();
                  navigation.navigate('Home');
                },
              },
            ],
          });
        } else {
          throw new Error(result.error?.message ?? 'Erro desconhecido');
        }
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: error instanceof Error ? error.message : 'Falha ao processar os dados',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const barStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  //  Render
  return (
    <View style={manualInventoryStyles.container}>
      <StatusBar barStyle={barStyle} backgroundColor={colors.bg} />

      {/* Header */}
      <View style={manualInventoryStyles.header}>
        <TouchableOpacity onPress={handleGoBack} style={manualInventoryStyles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={manualInventoryStyles.headerTitle}>
          {isUnexpectedMode ? 'Adicionar Não Listados' : 'Cadastro Manual'}
        </Text>
        <TouchableOpacity onPress={handleGoToHome} style={manualInventoryStyles.homeBtn}>
          <Ionicons name="home-outline" size={22} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        style={manualInventoryStyles.content}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Renderiza as opções de configuração do inventário APENAS se for uma criação nova */}
        {!isUnexpectedMode && (
          /* Nome do Inventário */
          <View style={manualInventoryStyles.section}>
            <Text style={manualInventoryStyles.label}>Nome do Inventário</Text>
            <TextInput
              style={manualInventoryStyles.input}
              value={inventoryName}
              onChangeText={setInventoryName}
              placeholder="Ex: Patrimônio 2026"
              placeholderTextColor={colors.textDim}
              accessibilityLabel="Nome do Inventário"
            />
            <Text style={manualInventoryStyles.label}>Localização do Inventário (opcional)</Text>
            <TextInput
              style={manualInventoryStyles.input}
              value={inventoryLocation}
              onChangeText={setInventoryLocation}
              placeholder="Ex: Sala 101, Prédio A"
              placeholderTextColor={colors.textDim}
              accessibilityLabel="Localização do Inventário"
            />
            <Text style={manualInventoryStyles.label}>Ano de Referência (opcional)</Text>
            <TextInput
              style={manualInventoryStyles.input}
              value={inventoryYear}
              onChangeText={setInventoryYear}
              placeholder="Ex: 2026"
              placeholderTextColor={colors.textDim}
              keyboardType="numeric"
              maxLength={4}
              accessibilityLabel="Ano de referência do inventário"
            />
          </View>
        )}

        {isUnexpectedMode && (
          <View style={manualInventoryStyles.section}>
            <Text style={{ color: colors.textDim, marginBottom: 12 }}>
              Adicionando itens não previstos ao inventário:{' '}
              <Text style={{ fontWeight: 'bold', color: colors.text }}>
                {existingInventoryName}
              </Text>
            </Text>
          </View>
        )}

        {/*  Campos Extras */}
        <View style={manualInventoryStyles.section}>
          <Text style={manualInventoryStyles.label}>Adicionar Campos Extras (Opcional)</Text>
          <Text style={localStyles.hint}>
            Adicione campos específicos do seu contexto: Marca, Modelo, Cor…
          </Text>

          {schemaFields.map((field) => (
            <View key={field.id} style={localStyles.schemaFieldRow}>
              <Text style={localStyles.schemaFieldName}>{field.name}</Text>
              <TouchableOpacity
                onPress={() => removeSchemaField(field.id, field.name)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color={colors.warning} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={localStyles.addFieldRow}>
            <TextInput
              style={[manualInventoryStyles.input, localStyles.addFieldInput]}
              value={newFieldName}
              onChangeText={setNewFieldName}
              placeholder="Nome do campo"
              placeholderTextColor={colors.textDim}
              onSubmitEditing={addSchemaField}
              accessibilityLabel="Nome do campo"
              returnKeyType="done"
            />
            <TouchableOpacity style={localStyles.addFieldBtn} onPress={addSchemaField}>
              <Text style={localStyles.addFieldBtnText}>+ Adicionar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/*  Itens Patrimoniais */}
        <View style={manualInventoryStyles.section}>
          <View style={manualInventoryStyles.sectionHeader}>
            <Text style={manualInventoryStyles.label}>Itens Patrimoniais</Text>
            <TouchableOpacity style={manualInventoryStyles.addButton} onPress={addItem}>
              <Text style={manualInventoryStyles.addButtonText}>+ Adicionar Item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => (
            <View key={item.id} style={manualInventoryStyles.itemCard}>
              <View style={manualInventoryStyles.itemHeader}>
                <Text style={manualInventoryStyles.itemTitle}>Item {index + 1}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {/* Botão Duplicar */}
                  <TouchableOpacity
                    onPress={() => duplicateItem(item.id)}
                    style={manualInventoryStyles.duplicateButton}
                  >
                    <Ionicons name="copy-outline" size={18} color={colors.accent} />
                    <Text
                      style={[manualInventoryStyles.removeButtonText, { color: colors.accent }]}
                    >
                      {' '}
                      Duplicar
                    </Text>
                  </TouchableOpacity>
                  {/* Botão Remover  */}
                  <TouchableOpacity
                    onPress={() => removeItem(item.id)}
                    style={manualInventoryStyles.removeButton}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.accentErr} />
                    <Text style={manualInventoryStyles.removeButtonText}> Remover</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Campos fixos */}
              <Text style={manualInventoryStyles.fieldLabel}>Código</Text>
              <TextInput
                style={manualInventoryStyles.input}
                value={item.code}
                onChangeText={(v) => updateItem(item.id, 'code', v.toUpperCase())}
                placeholder="Ex: PAT-001"
                placeholderTextColor={colors.textDim}
                accessibilityLabel="Código"
                autoCapitalize="characters"
              />

              <Text style={manualInventoryStyles.fieldLabel}>Descrição (opcional)</Text>
              <TextInput
                style={[manualInventoryStyles.input, manualInventoryStyles.textArea]}
                value={item.description}
                onChangeText={(v) => updateItem(item.id, 'description', v)}
                placeholder="Descrição do item"
                placeholderTextColor={colors.textDim}
                multiline
                numberOfLines={2}
                accessibilityLabel="Descrição"
              />

              <View style={manualInventoryStyles.row}>
                <View style={manualInventoryStyles.halfField}>
                  <Text style={manualInventoryStyles.fieldLabel}>Localização (opcional)</Text>
                  <TextInput
                    style={manualInventoryStyles.input}
                    value={item.location}
                    onChangeText={(v) => updateItem(item.id, 'location', v)}
                    placeholder="Ex: Sala 101"
                    placeholderTextColor={colors.textDim}
                    accessibilityLabel="Localização"
                  />
                </View>
              </View>

              <View style={manualInventoryStyles.row}>
                <View style={manualInventoryStyles.halfField}>
                  <Text style={manualInventoryStyles.fieldLabel}>Valor (R$) (opcional)</Text>
                  <TextInput
                    style={manualInventoryStyles.input}
                    value={item.value}
                    onChangeText={(v) => {
                      const maskedValue = formatBrazilianCurrencyInput(v);
                      updateItem(item.id, 'value', maskedValue);
                    }}
                    placeholder="Ex: 1.500,00"
                    placeholderTextColor={colors.textDim}
                    accessibilityLabel="Valor"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {schemaFields.length > 0 && (
                <View style={localStyles.customFieldsSection}>
                  <Text style={localStyles.customFieldsSectionTitle}>Campos Extras</Text>
                  {schemaFields.map((sf) => (
                    <View key={sf.id}>
                      <Text style={manualInventoryStyles.fieldLabel}>{sf.name}</Text>
                      <TextInput
                        style={manualInventoryStyles.input}
                        value={item.customFields[sf.name] ?? ''}
                        onChangeText={(v) => updateCustomField(item.id, sf.name, v)}
                        placeholder={`Digite ${sf.name.toLowerCase()}…`}
                        placeholderTextColor={colors.textDim}
                        accessibilityLabel="Campos Extras"
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            manualInventoryStyles.saveButton,
            isLoading && manualInventoryStyles.buttonDisabled,
          ]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={manualInventoryStyles.saveButtonText}>
              {isUnexpectedMode ? 'Salvar Itens Não Listados' : 'Salvar Inventário'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </KeyboardAwareScrollView>

      {/* MODAL DE CONFIRMAÇÃO CUSTOMIZADO */}
      <CustomDialog config={dialogConfig} />
    </View>
  );
};

//  Sub-componente: Custom Dialog
const CustomDialog = ({ config }: { config: DialogConfig }) => {
  const { colors } = useTheme();
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

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
            {config.buttons.map((btn, idx) => {
              let bgColor = 'transparent';
              let textColor = colors.textDim;

              if (btn.type === 'primary') {
                bgColor = colors.accent;
                textColor = '#000';
              } else if (btn.type === 'danger') {
                bgColor = colors.error + '20';
                textColor = colors.error;
              } else {
                bgColor = 'transparent';
                textColor = colors.textDim;
              }

              return (
                <TouchableOpacity
                  key={idx}
                  onPress={btn.onPress}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    backgroundColor: bgColor,
                    borderWidth: btn.type === 'cancel' ? 1 : 0,
                    borderColor: btn.type === 'cancel' ? colors.border : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: textColor }}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};
