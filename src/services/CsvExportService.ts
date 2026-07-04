/**
 * CSVExportService.ts
 *
 * Gera e compartilha CSVs do inventário via expo-sharing.
 * Três exports disponíveis:
 * - exportFound()    → itens escaneados com timestamps
 * - exportPending()  → itens não encontrados
 * - exportFull()     → relatório completo (todos os itens + status)
 */

import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { InventoryReport } from '../services/AnalyticsService';
import { AssetItem, InventorySchema, isScannedItem, Result, UnexpectedItem } from '../types/types';
import { formatDisplayDate, formatDisplayTime } from '../utils/dateUtils';
import { handleServiceError } from '../utils/errorUtils';

// ─── Tipagem Auxiliar ─────────────────────────────────────────────────────────

// Tipo unificado para o exportador lidar com itens originais e sobras na mesma lista
type ExportableItem = AssetItem & {
  isUnexpected?: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Escapa campo para CSV (RFC 4180) */
function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // Se contém caracteres especiais, encapsular entre aspas
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(csvField).join(',');
}

/**
 * Helper para extrair apenas os nomes dos campos customizados (dinâmicos) do schema
 */
function getCustomFieldNames(schema?: InventorySchema): string[] {
  if (!schema || !schema.fields) return [];
  return schema.fields.filter((f) => !f.fixed).map((f) => f.name);
}

/**
 * Normaliza a lista de itens não listados para o formato de ExportableItem,
 * permitindo que a lógica existente de isScannedItem continue funcionando.
 */
function normalizeUnexpectedItems(unexpectedItems: UnexpectedItem[]): ExportableItem[] {
  return unexpectedItems.map((u) => ({
    ...u,
    found: true,
    isUnexpected: true,
    scanDate: u.scannedAt, // Mapeia o timestamp para o padrão do AssetItem
  })) as ExportableItem[];
}

/**
 * Determina dinamicamente quais colunas (entre os campos base e customizados) serão incluídas,
 * com base na presença de pelo menos um valor não vazio nos itens.
 */
function resolveColumns(
  items: AssetItem[],
  schema?: InventorySchema
): {
  columns: string[]; // nomes das colunas para o header
  getRow: (item: AssetItem, scanDateObj?: Date | null) => (string | number | undefined | null)[];
} {
  const customFieldNames = getCustomFieldNames(schema);

  // Mapeamento dos campos base que queremos condicionais
  const baseFields = [
    { key: 'code', label: 'Código', required: true }, // código sempre incluído
    { key: 'description', label: 'Descrição', required: false },
    { key: 'location', label: 'Localização', required: false },
    { key: 'value', label: 'Valor', required: false },
  ];

  // Verifica quais campos base (não obrigatórios) possuem ao menos um valor não vazio
  const baseColumns = baseFields
    .filter((field) => {
      if (field.required) return true;
      return items.some((item) => {
        const val = (item as any)[field.key];
        return val !== null && val !== undefined && String(val).trim() !== '';
      });
    })
    .map((f) => f.label);

  // Campos customizados: incluir apenas se existe ao menos um item com valor para aquele campo
  const activeCustomFields = customFieldNames.filter((fieldName) =>
    items.some((item) => {
      const val = item.customFields?.[fieldName];
      return val !== null && val !== undefined && String(val).trim() !== '';
    })
  );

  const columns = [...baseColumns, ...activeCustomFields];

  const getRow = (item: AssetItem, scanDateObj?: Date | null) => {
    const row: (string | number | undefined | null)[] = [];
    // Preenche na ordem das colunas selecionadas
    baseFields.forEach((field) => {
      if (baseColumns.includes(field.label)) {
        if (field.key === 'code') row.push(item.code);
        else if (field.key === 'description') row.push(item.description);
        else if (field.key === 'location') row.push(item.location);
        else if (field.key === 'value') row.push(item.value);
      }
    });
    activeCustomFields.forEach((fieldName) => {
      row.push(item.customFields?.[fieldName] || '');
    });
    // Se houver dados de scan, são sempre incluídos se passados
    return row;
  };

  return { columns, getRow };
}

/**
 * Escreve o arquivo usando a nova API do FileSystem e compartilha
 */
async function writeAndShare(filename: string, content: string): Promise<void> {
  const bom = '\uFEFF'; // BOM UTF-8 para compatibilidade com Excel

  try {
    // 1. Acessa a pasta de cache do sistema
    const cacheDir = new Directory(Paths.cache);

    // Garante que o diretório existe
    if (!cacheDir.exists) {
      cacheDir.create({ intermediates: true, idempotent: true });
    }

    // 2. Cria a referência do arquivo
    const file = new File(cacheDir, filename);

    // 3. Escreve o conteúdo (a nova API usa UTF-8 por padrão para strings)
    file.write(bom + content);

    // 4. Verifica se o dispositivo pode compartilhar
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      throw new Error('Compartilhamento não disponível neste dispositivo.');
    }

    // 5. Compartilha usando a URI gerada pelo novo objeto File
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: `Exportar ${filename}`,
      UTI: 'public.comma-separated-values-text',
    });
  } catch (error) {
    console.error('Erro ao escrever/compartilhar arquivo:', error);
    throw new Error(
      `Falha ao exportar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    );
  }
}

function sanitizeFileName(name: string): string {
  if (!name) return 'inventario';

  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/gi, '_') // Substitui caracteres especiais por _
    .replace(/_+/g, '_') // Remove múltiplos underscores
    .replace(/^_|_$/g, '') // Remove underscores do início/fim
    .toLowerCase()
    .substring(0, 50); // Limita tamanho do nome
}

// Serviço
export class CSVExportService {
  /**
   * Exporta todos os itens encontrados (originais) e não listados (sobras) com timestamp de scan.
   */
  static async exportFound(
    report: InventoryReport,
    schema?: InventorySchema
  ): Promise<Result<void>> {
    return handleServiceError(async () => {
      const unexpected = normalizeUnexpectedItems(report.unexpectedItems);
      const combinedFoundItems = [...report.foundItems, ...unexpected].sort((a, b) =>
        a.code.localeCompare(b.code)
      );

      if (!combinedFoundItems.length) {
        throw new Error('Não há itens encontrados para exportar.');
      }

      const { columns, getRow } = resolveColumns(combinedFoundItems, schema);

      // Colunas de data/hora são incluídas apenas se houver pelo menos um item escaneado com scanDate
      const hasScanDate = combinedFoundItems.some(
        (item) => isScannedItem(item as AssetItem) && (item as any).scanDate
      );

      // Adiciona 'Situação' para distinguir Encontrado vs Não Listado
      const headerColumns = [...columns, 'Situação'];
      if (hasScanDate) {
        headerColumns.push('Data do Scan', 'Hora do Scan');
      }
      const header = csvRow(headerColumns);

      const rows = combinedFoundItems.map((item) => {
        const exportableItem = item as ExportableItem; // Força a tipagem correta

        const scanDateObj =
          isScannedItem(exportableItem) && exportableItem.scanDate
            ? new Date(exportableItem.scanDate)
            : null;

        const row = getRow(exportableItem, scanDateObj);

        row.push(exportableItem.isUnexpected ? 'Não Listado' : 'Encontrado');

        if (hasScanDate) {
          row.push(
            scanDateObj ? formatDisplayDate(scanDateObj) : '',
            scanDateObj ? formatDisplayTime(scanDateObj) : ''
          );
        }
        return csvRow(row);
      });

      const safeName = sanitizeFileName(report.inventoryName);
      await writeAndShare(`${safeName}_encontrados.csv`, [header, ...rows].join('\r\n'));
    }, 'EXPORT_WRITE_FAILED');
  }

  /**
   * Exporta itens NÃO encontrados (pendentes ao final do inventário).
   */
  static async exportPending(
    report: InventoryReport,
    schema?: InventorySchema
  ): Promise<Result<void>> {
    return handleServiceError(async () => {
      if (!report.notFoundItems.length) {
        throw new Error('Não há itens pendentes para exportar.');
      }

      // Itens pendentes não possuem sobras físicas
      const { columns, getRow } = resolveColumns(report.notFoundItems, schema);

      const header = csvRow(columns);
      const rows = report.notFoundItems.map((item) => csvRow(getRow(item)));

      const safeName = sanitizeFileName(report.inventoryName);
      await writeAndShare(`${safeName}_nao_encontrados.csv`, [header, ...rows].join('\r\n'));
    }, 'EXPORT_WRITE_FAILED');
  }

  /**
   * Exporta relatório completo: todos os itens (originais + sobras) e coluna de situação.
   */
  static async exportFull(
    report: InventoryReport,
    schema?: InventorySchema
  ): Promise<Result<void>> {
    return handleServiceError(async () => {
      const unexpected = normalizeUnexpectedItems(report.unexpectedItems);
      const allItems = [...report.foundItems, ...report.notFoundItems, ...unexpected].sort((a, b) =>
        a.code.localeCompare(b.code)
      );

      if (!allItems.length) {
        throw new Error('Não há itens para exportar.');
      }

      const { columns, getRow } = resolveColumns(allItems, schema);

      const hasScanDate = allItems.some(
        (item) => item.found && isScannedItem(item as AssetItem) && (item as any).scanDate
      );

      const headerColumns = [...columns, 'Situação'];
      if (hasScanDate) {
        headerColumns.push('Data do Scan', 'Hora do Scan');
      }
      const header = csvRow(headerColumns);

      const rows = allItems.map((item) => {
        const exportableItem = item as ExportableItem; // Força a tipagem correta

        // Determina o status exato para a planilha
        let status = 'Pendente';
        if (exportableItem.isUnexpected) {
          status = 'Não Listado';
        } else if (exportableItem.found) {
          status = 'Encontrado';
        }

        const scanDateObj =
          exportableItem.found && isScannedItem(exportableItem) && exportableItem.scanDate
            ? new Date(exportableItem.scanDate)
            : null;

        const row = getRow(exportableItem, scanDateObj);

        row.push(status);

        if (hasScanDate) {
          row.push(
            scanDateObj ? formatDisplayDate(scanDateObj) : '',
            scanDateObj ? formatDisplayTime(scanDateObj) : ''
          );
        }
        return csvRow(row);
      });

      const safeName = sanitizeFileName(report.inventoryName);
      await writeAndShare(`${safeName}_relatorio_completo.csv`, [header, ...rows].join('\r\n'));
    }, 'EXPORT_WRITE_FAILED');
  }
}
