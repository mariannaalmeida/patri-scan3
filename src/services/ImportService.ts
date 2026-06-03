import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import {
  AssetItem,
  AssetItemBase,
  AssetStatus,
  ColumnMapping,
  CSVValidationResult,
  Inventory,
  isStandardField,
  MappableField,
  Result,
} from '../types/types';
import { parseBrazilianCurrencySafe } from '../utils/currencyUtils';
import { toISODate } from '../utils/dateUtils';
import { handleServiceError } from '../utils/errorUtils';
import { generateBasicSchema } from '../utils/schemaUtils';
import { StorageService } from './StorageService';

export class ImportService {
  /**
   *  Selecionar o arquivo CSV do dispositivo
   */
  static async pickCSVFile(): Promise<Result<DocumentPicker.DocumentPickerResult | null>> {
    return handleServiceError(async () => {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });
      return result.canceled ? null : result;
    }, 'IMPORT_INVALID_FILE');
  }

  /**
   *  Ler e parsear o conteúdo do CSV
   */
  static async parseCSVFile(uri: string): Promise<
    Result<{
      headers: string[];
      data: Record<string, string>[];
      raw: string;
    }>
  > {
    return handleServiceError(
      async () => {
        // 1. Lê o conteúdo como Base64 (bytes crus)
        const base64Content = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        });

        // 2. Converte Base64 para Uint8Array (compatível com TextDecoder)
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // 3. Tenta decodificar como Windows-1252 (padrão Excel PT-BR)
        let textContent: string;
        try {
          textContent = new TextDecoder('windows-1252').decode(bytes);
        } catch {
          // Fallback para latin1 se windows-1252 não estiver disponível
          textContent = new TextDecoder('latin1').decode(bytes);
        }

        // 4. Heurística: se detectar caracteres típicos de UTF-8 mal interpretado,
        //    reverte para decodificação UTF-8
        if (
          textContent.includes('Ã£') ||
          textContent.includes('Ã§') ||
          textContent.includes('Ã³') ||
          textContent.includes('Ã©') ||
          textContent.includes('Ã¡')
        ) {
          textContent = new TextDecoder('utf-8').decode(bytes);
        }

        // 5. Parse com PapaParse
        return new Promise((resolve, reject) => {
          Papa.parse(textContent, {
            header: true,
            skipEmptyLines: true,
            encoding: 'UTF-8',
            complete: (results) => {
              resolve({
                headers: results.meta.fields || [],
                data: results.data as Record<string, string>[],
                raw: textContent,
              });
            },
            error: (error: { message: string }) => {
              reject(new Error(`Erro ao parsear CSV: ${error.message}`));
            },
          });
        });
      },
      'IMPORT_PARSE_FAILED',
      { fileUri: uri }
    );
  }

  /**
   *  Sugerir mapeamento de colunas baseado em heurística
   */
  static suggestColumnMapping(headers: string[]): ColumnMapping[] {
    const fieldKeywords: Partial<Record<MappableField, string[]>> = {
      code: ['código', 'codigo', 'code', 'patrimônio', 'patrimonio', 'tombo', 'id', 'registro'],
      description: ['descrição', 'descricao', 'description', 'nome', 'item', 'produto', 'bem'],
      department: ['departamento', 'departament', 'setor', 'divisão', 'divisao', 'unidade'],
      location: ['local', 'localização', 'localizacao', 'location', 'sala', 'andar', 'prédio'],
      status: ['status', 'estado', 'situação', 'situacao', 'condição', 'condicao'],
      value: ['valor', 'value', 'preço', 'preco', 'custo', 'montante'],
    };

    return headers.map((header) => {
      const lowerHeader = header.toLowerCase().trim();
      let bestField: MappableField | undefined;
      let bestConfidence = 0;

      for (const [field, keywords] of Object.entries(fieldKeywords)) {
        if (!keywords || keywords.length === 0) continue;

        if (keywords.some((kw) => lowerHeader === kw)) {
          bestField = field as MappableField;
          bestConfidence = 100;
          break;
        }
        if (keywords.some((kw) => lowerHeader.includes(kw)) && bestConfidence < 80) {
          bestField = field as MappableField;
          bestConfidence = 80;
        }
        if (bestConfidence < 60) {
          const headerWords = lowerHeader.split(/[\s_\-]+/);
          for (const word of headerWords) {
            if (keywords.some((kw) => kw.includes(word) || word.includes(kw))) {
              bestField = field as MappableField;
              bestConfidence = 60;
              break;
            }
          }
        }
      }

      return {
        csvHeader: header,
        mappedField: bestField,
        confidence: bestConfidence,
      };
    });
  }

  /**
   *  Validar os dados do CSV contra o mapeamento fornecido
   */
  static validateCSVData(
    data: Record<string, string>[],
    mapping: Record<string, MappableField>
  ): CSVValidationResult {
    const result: CSVValidationResult = {
      validRows: 0,
      errorRows: 0,
      errors: [],
      warnings: [],
    };
    const seenCodes = new Set<string>();

    const hasCodeMapping = Object.values(mapping).includes('code');
    const hasDescMapping = Object.values(mapping).includes('description');

    if (!hasCodeMapping) {
      result.errors.push({
        row: 0,
        field: 'code',
        message: 'Nenhuma coluna foi mapeada para "Código". A importação não pode continuar.',
      });
      return result;
    }
    if (!hasDescMapping) {
      result.warnings.push({
        row: 0,
        field: 'description',
        message:
          'Nenhuma coluna foi mapeada para "Descrição". Itens serão importados sem descrição.',
      });
    }

    const colCode = Object.entries(mapping).find(([_, f]) => f === 'code')![0];
    const colDesc = Object.entries(mapping).find(([_, f]) => f === 'description')?.[0];
    const colValue = Object.entries(mapping).find(([_, f]) => f === 'value')?.[0];

    data.forEach((row, idx) => {
      const rowNum = idx + 2;
      let isRowValid = true;
      const rowErrors: string[] = [];

      const codeVal = row[colCode]?.toString().trim();
      if (!codeVal) {
        rowErrors.push(`Código obrigatório (coluna: ${colCode})`);
        isRowValid = false;
      } else if (seenCodes.has(codeVal)) {
        rowErrors.push(`Código duplicado: ${codeVal}`);
        isRowValid = false;
      } else {
        seenCodes.add(codeVal);
      }

      if (colDesc) {
        const descVal = row[colDesc]?.toString().trim();
        if (!descVal) {
          result.warnings.push({
            row: rowNum,
            field: colDesc,
            message: 'Descrição não informada',
          });
        }
      }

      if (colValue && row[colValue]) {
        const rawValue = row[colValue].toString().trim();
        const numeric = parseBrazilianCurrencySafe(rawValue);
        if (numeric === undefined) {
          result.warnings.push({
            row: rowNum,
            field: colValue,
            message: 'Valor numérico inválido',
            value: rawValue,
          });
        }
      }

      if (isRowValid) {
        result.validRows++;
      } else {
        result.errorRows++;
        rowErrors.forEach((msg) => {
          result.errors.push({ row: rowNum, field: 'row', message: msg });
        });
      }
    });

    return result;
  }

  /**
   * Converter string de status para AssetStatus válido
   */
  private static normalizeStatus(status: string): AssetStatus {
    const statusMap: Record<string, AssetStatus> = {
      bom: 'good',
      good: 'good',
      ótimo: 'good',
      otimo: 'good',
      excelente: 'good',
      danificado: 'damaged',
      damaged: 'damaged',
      'danificado parcial': 'damaged',
      avariado: 'damaged',
      extraviado: 'missing',
      missing: 'missing',
      perdido: 'missing',
      desaparecido: 'missing',
      'em manutenção': 'in_repair',
      'em manutencao': 'in_repair',
      in_repair: 'in_repair',
      reparo: 'in_repair',
      conserto: 'in_repair',
    };

    const normalized = status.toLowerCase().trim();
    return statusMap[normalized] || 'good';
  }

  /**
   *  Converter dados do CSV para AssetItem (com found: false inicialmente)
   */
  static convertToAssetItems(
    data: Record<string, string>[],
    mapping: Record<string, MappableField>
  ): AssetItem[] {
    return data.map((row, index) => {
      const base: AssetItemBase = {
        code: '',
        description: '',
        department: '',
        location: '',
        status: 'good',
        value: undefined,
        importDate: undefined,
        customFields: {},
      };

      for (const [csvCol, assetField] of Object.entries(mapping)) {
        const rawValue = row[csvCol];
        if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
          const strValue = rawValue.toString().trim();
          if (isStandardField(assetField)) {
            switch (assetField) {
              case 'value': {
                const parsed = parseBrazilianCurrencySafe(strValue);
                if (parsed !== undefined) base.value = parsed;
                break;
              }
              case 'status':
                base.status = this.normalizeStatus(strValue);
                break;
              default:
                base[assetField] = strValue;
                break;
            }
          } else {
            if (base.customFields) {
              base.customFields[assetField] = strValue;
            }
          }
        }
      }

      return { ...base, found: false };
    });
  }

  /**
   *  Criar inventário a partir dos itens convertidos e salvar no Storage
   */
  static async createInventoryFromCSV(
    name: string,
    items: AssetItem[]
  ): Promise<Result<Inventory>> {
    return handleServiceError(async () => {
      const schema = generateBasicSchema(items);
      const inventory: Inventory = {
        metadata: {
          id: StorageService.generateInventoryId(),
          name,
          importDate: toISODate(new Date()),
          totalItems: items.length,
          status: 'active',
        },
        items,
        schema,
      };

      const saveResult = await StorageService.saveInventory(inventory);
      if (!saveResult.ok) {
        throw new Error(saveResult.error.message);
      }
      return inventory;
    }, 'STORAGE_WRITE_FAILED');
  }
}
