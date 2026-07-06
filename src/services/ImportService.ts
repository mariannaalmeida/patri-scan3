import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import Papa from 'papaparse';
import {
  AssetItem,
  AssetItemBase,
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

// Mapa de caracteres exclusivos do Windows-1252 (faixa 0x80 a 0x9F)
const WIN1252_EXTENSIONS = [
  '\u20AC',
  '\u0081',
  '\u201A',
  '\u0192',
  '\u201E',
  '\u2026',
  '\u2020',
  '\u2021',
  '\u02C6',
  '\u2030',
  '\u0160',
  '\u2039',
  '\u0152',
  '\u008D',
  '\u017D',
  '\u008F',
  '\u0090',
  '\u2018',
  '\u2019',
  '\u201C',
  '\u201D',
  '\u2022',
  '\u2013',
  '\u2014',
  '\u02DC',
  '\u2122',
  '\u0161',
  '\u203A',
  '\u0153',
  '\u009D',
  '\u017E',
  '\u0178',
];

/**
 * Decodifica Uint8Array  para string usando as regras do Windows-1252.
 * Decodifica bytes Windows-1252
 */
function decodeWindows1252(bytes: Uint8Array): string {
  const chars = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte >= 0x80 && byte <= 0x9f) {
      chars[i] = WIN1252_EXTENSIONS[byte - 0x80];
    } else {
      chars[i] = String.fromCharCode(byte);
    }
  }
  return chars.join('');
}

/**
 * Detecta automaticamente UTF-8 ou Windows-1252
 */
function decodeCSV(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);

  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes);
  }

  try {
    return new TextDecoder('utf-8', {
      fatal: true,
    }).decode(bytes);
  } catch {
    try {
      return new TextDecoder('windows-1252').decode(bytes);
    } catch {
      return decodeWindows1252(bytes);
    }
  }
}
/**
 * Detecta o delimitador do CSV baseado na contagem de caracteres
 */
function detectDelimiter(content: string): string {
  const semicolons = (content.match(/;/g) || []).length;
  const commas = (content.match(/,/g) || []).length;

  return semicolons > commas ? ';' : ',';
}

export class ImportService {
  /**
   * Parsear o conteúdo do CSV a partir da URI do arquivo
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
        // 1. Instancia o arquivo usando a nova API
        const file = new File(uri);

        // 2. Lê diretamente como ArrayBuffer (padrão Web implementado pelo Expo)
        // Código com TextDecoder (recomendado)
        const arrayBuffer = await file.arrayBuffer();
        const textContent = decodeCSV(arrayBuffer);

        // 3. Detecta o delimitador
        const delimiter = detectDelimiter(textContent);

        // 6. Parse com PapaParse
        return new Promise((resolve, reject) => {
          Papa.parse(textContent, {
            header: true,
            delimiter,
            skipEmptyLines: true,
            transformHeader: (header: string) => header.trim(),
            complete: (results) => {
              resolve({
                headers: results.meta.fields || [],
                data: results.data as Record<string, string>[],
                raw: textContent,
              });
            },
            error: (error: Error) => {
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
   * Selecionar arquivo CSV do dispositivo
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
   * Sugerir mapeamento de colunas baseado em heurística
   */
  static suggestColumnMapping(headers: string[]): ColumnMapping[] {
    const fieldKeywords: Partial<Record<MappableField, string[]>> = {
      code: [
        'código',
        'codigo',
        'cod bem',
        'cód bem',
        'code',
        'patrimônio',
        'patrimonio',
        'tombo',
        'id',
        'registro',
      ],
      description: ['descrição', 'descricao', 'description', 'nome', 'item', 'produto', 'bem'],
      location: ['local', 'localização', 'localizacao', 'location', 'sala', 'andar', 'prédio'],
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
   * Validar os dados do CSV contra o mapeamento fornecido
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

    const codeEntry = Object.entries(mapping).find(([_, f]) => f === 'code');
    if (!codeEntry) {
      // Esse caso já é tratado no início da função, mas por segurança:
      result.errors.push({ row: 0, field: 'code', message: 'Mapeamento de código inválido.' });
      return result;
    }
    const colCode = codeEntry[0];
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
   * Converter dados do CSV para AssetItem (com found: false inicialmente)
   */
  static convertToAssetItems(
    data: Record<string, string>[],
    mapping: Record<string, MappableField>,
    inventoryLocation?: string
  ): AssetItem[] {
    return data.map((row) => {
      const base: AssetItemBase = {
        code: '',
        description: undefined,
        location: undefined,
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
                if (parsed !== undefined) {
                  base.value = parsed;
                }
                break;
              }
              default:
                (base as any)[assetField] = strValue;
                break;
            }
          } else {
            if (base.customFields) {
              base.customFields[assetField] = strValue;
            }
          }
        }
      }

      // FALLBACK: se não tiver localização, herda a do inventário
      if (!base.location && inventoryLocation) {
        base.location = inventoryLocation;
      }

      return { ...base, found: false };
    });
  }

  /**
   * Criar inventário a partir dos itens convertidos e salvar no Storage
   */
  static async createInventoryFromCSV(
    name: string,
    items: AssetItem[],
    location?: string,
    year?: number
  ): Promise<Result<Inventory>> {
    return handleServiceError(async () => {
      const schema = generateBasicSchema(items);
      const inventory: Inventory = {
        metadata: {
          id: StorageService.generateInventoryId(),
          name,
          location: location || undefined,
          year: year || undefined,
          importDate: toISODate(new Date()),
          totalItems: items.length,
          status: 'active',
        },
        items,
        schema,
        unexpectedItems: [],
      };

      const saveResult = await StorageService.saveInventory(inventory);
      if (!saveResult.ok) {
        throw new Error(saveResult.error.message);
      }
      return inventory;
    }, 'STORAGE_WRITE_FAILED');
  }
}
