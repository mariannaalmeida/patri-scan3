import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ImportService } from '../services/ImportService';
import { colors, createInventoryStyles } from '../styles/theme';
import { ColumnMapping, MappableField, RootStackParamList } from '../types/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Step = 'initial' | 'mapping' | 'validation' | 'processing';

// Campos disponíveis para mapeamento
const MAPPABLE_FIELDS: MappableField[] = [
  'code',
  'description',
  'department',
  'location',
  'status',
  'value',
];

// Rótulos dos campos (inclui suporte a campos extras via fallback)
const FIELD_LABELS: Record<string, string> = {
  code: 'Código',
  description: 'Descrição',
  department: 'Departamento',
  location: 'Localização',
  status: 'Status',
  value: 'Valor',
};

// Helper para obter rótulo seguro, com fallback para o nome original do campo
const getFieldLabel = (field: string): string => FIELD_LABELS[field] ?? field;

export const ImportInventoryScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [currentStep, setCurrentStep] = useState<Step>('initial');
  const [inventoryName, setInventoryName] = useState('');
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping[]>([]);
  const [finalMapping, setFinalMapping] = useState<Record<string, MappableField>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Pré-visualização da validação
  const validationPreview = useMemo(() => {
    if (currentStep !== 'validation' || csvData.length === 0) return null;
    return ImportService.validateCSVData(csvData, finalMapping);
  }, [csvData, finalMapping, currentStep]);

  const styles = createInventoryStyles;

  const resetForm = useCallback(() => {
    setCurrentStep('initial');
    setInventoryName('');
    setCsvData([]);
    setCsvHeaders([]);
    setColumnMapping([]);
    setFinalMapping({});
    setProgress(0);
  }, []);

  const handleGoBack = () => {
    if (currentStep !== 'initial') {
      Alert.alert('Cancelar importação', 'Deseja cancelar a importação e voltar?', [
        { text: 'Continuar importação', style: 'cancel' },
        {
          text: 'Cancelar',
          style: 'destructive',
          onPress: () => {
            resetForm();
            navigation.goBack();
          },
        },
      ]);
    } else {
      navigation.goBack();
    }
  };

  // Etapa 1: Selecionar arquivo e nome
  const handleSelectFile = async () => {
    if (!inventoryName.trim()) {
      Alert.alert('Atenção', 'Digite um nome para o inventário');
      return;
    }

    setIsLoading(true);

    try {
      const fileResult = await ImportService.pickCSVFile();

      if (!fileResult.ok) {
        Alert.alert('Erro', fileResult.error.message);
        return;
      }

      if (!fileResult.value || !fileResult.value.assets || fileResult.value.assets.length === 0) {
        return; // Usuário cancelou a seleção
      }

      const parseResult = await ImportService.parseCSVFile(fileResult.value.assets[0].uri);

      if (!parseResult.ok) {
        throw new Error(parseResult.error.message);
      }

      const { headers, data } = parseResult.value;

      setCsvHeaders(headers);
      setCsvData(data);

      const suggestions = ImportService.suggestColumnMapping(headers);
      setColumnMapping(suggestions);

      setCurrentStep('mapping');
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro ao processar arquivo');
    } finally {
      setIsLoading(false);
    }
  };

  // Etapa 2: Configurar mapeamento
  const handleMappingComplete = () => {
    const mapping: Record<string, MappableField> = {};

    columnMapping.forEach((item) => {
      if (item.mappedField) {
        mapping[item.csvHeader] = item.mappedField;
      }
    });

    const hasCodeMapping = Object.values(mapping).some((field) => field === 'code');

    if (!hasCodeMapping) {
      Alert.alert('Campo obrigatório', 'É necessário mapear uma coluna para o Código do item');
      return;
    }

    setFinalMapping(mapping);
    setCurrentStep('validation');
  };

  // Etapa 3: Validar e processar - fluxo unificado com finally
  const handleProcessInventory = async () => {
    setIsLoading(true);
    setProgress(10);

    try {
      // Reutiliza validação pré-calculada
      const validation = validationPreview ?? ImportService.validateCSVData(csvData, finalMapping);
      setProgress(40);

      if (validation.errorRows > 0) {
        // Aguarda decisão do usuário; rejeita com 'CANCELLED' se cancelar
        await new Promise<void>((resolve, reject) => {
          Alert.alert(
            'Erros encontrados',
            `${validation.errorRows} linhas contêm erros. Deseja continuar mesmo assim?`,
            [
              {
                text: 'Cancelar',
                style: 'cancel',
                onPress: () => reject(new Error('CANCELLED')),
              },
              { text: 'Continuar', onPress: () => resolve() },
            ]
          );
        });
      }

      setProgress(60);
      const items = ImportService.convertToAssetItems(csvData, finalMapping);
      setProgress(80);

      const inventoryResult = await ImportService.createInventoryFromCSV(inventoryName, items);
      setProgress(100);

      if (inventoryResult.ok) {
        const inventory = inventoryResult.value;

        Alert.alert('Sucesso!', `Inventário "${inventoryName}" criado com ${items.length} itens.`, [
          {
            text: 'Ver Inventário',
            onPress: () => {
              resetForm();
              navigation.replace('InventoryDetail', {
                inventoryId: inventory.metadata.id,
                inventoryName: inventory.metadata.name,
              });
            },
          },
          {
            text: 'Fechar',
            style: 'cancel',
            onPress: () => {
              resetForm();
              navigation.goBack();
            },
          },
        ]);
      } else {
        throw new Error(inventoryResult.error.message);
      }
    } catch (error) {
      if (error instanceof Error && error.message !== 'CANCELLED') {
        Alert.alert('Erro', error.message || 'Falha ao processar inventário');
      }
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  // Renderizar tela de mapeamento
  const renderMappingStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Mapear Colunas</Text>

      <Text style={styles.stepDescription}>
        Associe as colunas do CSV aos campos do sistema. O campo{' '}
        <Text style={{ fontWeight: 'bold', color: colors.accent }}>Código</Text> é obrigatório.
      </Text>

      <ScrollView style={styles.mappingList} showsVerticalScrollIndicator={false}>
        {columnMapping.map((item, index) => (
          <View key={`${item.csvHeader}-${index}`} style={styles.mappingItem}>
            <Text style={styles.csvHeader}>{item.csvHeader}</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mappingControls}
            >
              {/* Ignorar */}
              <TouchableOpacity
                style={[styles.fieldButton, !item.mappedField && styles.fieldButtonActive]}
                onPress={() => {
                  const newMapping = [...columnMapping];
                  newMapping[index] = { ...newMapping[index], mappedField: undefined };
                  setColumnMapping(newMapping);
                }}
              >
                <Text
                  style={[
                    styles.fieldButtonText,
                    !item.mappedField && styles.fieldButtonTextActive,
                  ]}
                >
                  Ignorar
                </Text>
              </TouchableOpacity>

              {/* Campos fixos */}
              {MAPPABLE_FIELDS.map((field) => (
                <TouchableOpacity
                  key={field}
                  style={[
                    styles.fieldButton,
                    item.mappedField === field && styles.fieldButtonActive,
                  ]}
                  onPress={() => {
                    const newMapping = [...columnMapping];
                    newMapping[index] = { ...newMapping[index], mappedField: field };
                    setColumnMapping(newMapping);
                  }}
                >
                  <Text
                    style={[
                      styles.fieldButtonText,
                      item.mappedField === field && styles.fieldButtonTextActive,
                    ]}
                  >
                    {FIELD_LABELS[field]}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Campo Extra */}
              <TouchableOpacity
                style={[
                  styles.fieldButton,
                  item.mappedField === item.csvHeader && styles.fieldButtonActive,
                ]}
                onPress={() => {
                  const newMapping = [...columnMapping];
                  newMapping[index] = {
                    ...newMapping[index],
                    mappedField: item.csvHeader, // Agora seguro com MappableField atualizado
                  };
                  setColumnMapping(newMapping);
                }}
              >
                <Text
                  style={[
                    styles.fieldButtonText,
                    item.mappedField === item.csvHeader && styles.fieldButtonTextActive,
                  ]}
                >
                  + Extra
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {item.confidence > 0 && item.confidence < 100 && (
              <Text style={styles.confidenceText}>Confiança: {item.confidence}%</Text>
            )}
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.actionButton} onPress={handleMappingComplete}>
        <Text style={styles.actionButtonText}>Continuar</Text>
      </TouchableOpacity>
    </View>
  );

  // Renderizar tela de validação
  const renderValidationStep = () => {
    // Tela de processamento (enquanto carrega)
    if (isLoading && progress > 0) {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Processando...</Text>
          <View style={styles.processingBox}>
            <Text style={styles.processingText}>
              {progress < 60
                ? 'Validando dados...'
                : progress < 80
                  ? 'Convertendo itens...'
                  : 'Salvando inventário...'}
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
        </View>
      );
    }

    // Tela normal de validação (antes de iniciar o processamento)
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Validar Dados</Text>

        <View style={styles.statsCard}>
          <Text style={styles.statsText}>Total de linhas: {csvData.length}</Text>
          <Text style={styles.statsText}>Colunas mapeadas: {Object.keys(finalMapping).length}</Text>
          {validationPreview ? (
            <>
              <Text style={styles.statsText}>Itens válidos: {validationPreview.validRows}</Text>
              {validationPreview.errorRows > 0 && (
                <Text style={[styles.statsText, { color: colors.accentErr }]}>
                  Erros: {validationPreview.errorRows}
                </Text>
              )}
              {validationPreview.warnings.length > 0 && (
                <Text style={[styles.statsText, { color: colors.accentWarn }]}>
                  Avisos: {validationPreview.warnings.length}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.statsText}>Carregando validação…</Text>
          )}
        </View>

        <Text style={styles.previewTitle}>Preview dos dados:</Text>
        <ScrollView style={styles.previewList} showsVerticalScrollIndicator={false}>
          {csvData.slice(0, 5).map((row, index) => (
            <View key={`preview-${index}-${row.code ?? index}`} style={styles.previewItem}>
              {Object.entries(finalMapping).map(([csvHeader, field]) => (
                <Text key={field} style={styles.previewText}>
                  <Text style={{ fontWeight: 'bold', color: colors.accent }}>
                    {getFieldLabel(field)}:
                  </Text>{' '}
                  {row[csvHeader] || '—'}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.actionButton, isLoading && styles.buttonDisabled]}
          onPress={handleProcessInventory}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.actionButtonText}>Criar Inventário</Text>
          )}
        </TouchableOpacity>

        {/* Barra de progresso secundária removida para evitar duplicação */}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Importar CSV</Text>
        <View style={{ width: 36 }} />
      </View>

      {currentStep === 'initial' && (
        <View style={styles.stepContainer}>
          <Text style={styles.label}>Nome do Inventário</Text>
          <TextInput
            style={styles.input}
            value={inventoryName}
            onChangeText={setInventoryName}
            placeholder="Ex: Inventário 2024"
            placeholderTextColor={colors.textDim}
          />

          <TouchableOpacity
            style={[styles.actionButton, isLoading && styles.buttonDisabled]}
            onPress={handleSelectFile}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.actionButtonText}>Selecionar Arquivo CSV</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>
            O arquivo CSV deve conter os dados dos itens patrimoniais. Na próxima etapa você poderá
            mapear as colunas.
          </Text>
        </View>
      )}

      {currentStep === 'mapping' && renderMappingStep()}
      {currentStep === 'validation' && renderValidationStep()}
    </View>
  );
};
