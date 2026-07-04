// ScannerService.ts
import { AssetItem, Inventory, Result, ScanResult, UnexpectedItem } from '../types/types';
import { toISODate } from '../utils/dateUtils';
import { handleServiceError } from '../utils/errorUtils';
import { StorageService } from './StorageService';

export interface ScanMatch {
  status: 'found' | 'not_found' | 'already_scanned';
  item?: AssetItem;
  code: string;
}

export class ScannerService {
  public static normalizeCode(code: string): string {
    return String(code).trim().replace(/\s+/g, '').toUpperCase();
  }

  /**
   * Busca um item no inventário pelo código escaneado.
   * Retorna o status do scan: encontrado, já escaneado (found=true) ou não encontrado.
   */
  static findItemByCode(code: string, inventory: Inventory): ScanMatch {
    const normalizedScannedCode = this.normalizeCode(code);

    const item = inventory.items.find(
      (item) => this.normalizeCode(item.code) === normalizedScannedCode
    );

    if (!item) {
      return {
        status: 'not_found',
        code,
      };
    }

    return item.found
      ? {
          status: 'already_scanned',
          item,
          code: item.code,
        }
      : {
          status: 'found',
          item,
          code: item.code,
        };
  }
  /**
   * Confirma o scan de um item: marca como encontrado e persiste.
   * Retorna o inventário atualizado e o ScanResult.
   */

  static async confirmScan(
    inventoryId: string,
    item: AssetItem,
    scanDate?: Date | string
  ): Promise<Result<{ updatedItem: AssetItem; result: ScanResult }>> {
    return handleServiceError(async () => {
      if (!StorageService.isValidInventoryId(inventoryId)) {
        throw new Error(`ID de inventário inválido ou ausente: "${inventoryId}"`);
      }

      // Fluxo A: O item já foi escaneado anteriormente (Caso de aviso/duplicidade)
      if (item.found) {
        // Para itens já escaneados, ainda precisamos recarregar para pegar dados frescos
        const loadResult = await StorageService.loadInventory(inventoryId);
        if (!loadResult.ok) throw new Error(loadResult.error.message);

        const updatedItem = loadResult.value.items.find((i) => i.code === item.code);
        if (!updatedItem) throw new Error('Item não encontrado após recarregar inventário');

        const result: ScanResult = {
          type: 'warning',
          message: `Item "${updatedItem.description || updatedItem.code}" já estava confirmado.`,
          item: updatedItem,
          code: item.code,
          timestamp: toISODate(new Date()),
        };
        return { updatedItem, result };
      }

      // Fluxo B: NOVO FLUXO OTIMIZADO (Primeiro scan do item)
      // NOVO FLUXO OTIMIZADO
      const updateResult = await StorageService.updateItemFoundStatus(
        inventoryId,
        item.code,
        true,
        scanDate
      );

      if (!updateResult.ok) {
        throw new Error(updateResult.error.message);
      }

      const updatedItem = updateResult.value.updatedItem; // Captura direta sem re-leitura do disco

      const result: ScanResult = {
        type: 'success',
        message: `Item "${updatedItem.description || updatedItem.code}" confirmado`,
        item: updatedItem,
        code: item.code,
        timestamp: toISODate(new Date()),
      };

      return { updatedItem, result };
    }, 'SCAN_CONFIRM_FAILED');
  }
  /**
   * Calcula o progresso atual do inventário baseado nos itens com found === true.
   */
  static getProgress(inventory: Inventory): {
    scanned: number;
    total: number;
    percentage: number;
    remaining: number;
  } {
    const total = inventory.items.length;
    const scanned = inventory.items.filter((item) => item.found).length;
    return {
      scanned,
      total,
      percentage: total > 0 ? Math.round((scanned / total) * 100) : 0,
      remaining: total - scanned,
    };
  }

  /**
   * Retorna os itens ainda não escaneados (found === false).
   */
  static getPendingItems(inventory: Inventory): AssetItem[] {
    return inventory.items.filter((item) => !item.found);
  }

  /**
   * Retorna os itens já escaneados (found === true).
   */
  static getScannedItems(inventory: Inventory): AssetItem[] {
    return inventory.items.filter((item) => item.found);
  }

  /**
   * Valida se um código escaneado tem formato mínimo aceitável.
   */
  static validateCode(code: string): boolean {
    return typeof code === 'string' && code.trim().length > 0;
  }

  /**
   * Retorna mensagem e tipo de feedback para cada status de scan.
   */
  static getFeedback(match: ScanMatch): ScanResult {
    const timestamp = toISODate(new Date());
    switch (match.status) {
      case 'found':
        return {
          type: 'success',
          message: 'Item encontrado! Confirme os dados abaixo.',
          item: match.item,
          code: match.code,
          timestamp,
        };
      case 'already_scanned':
        return {
          type: 'warning',
          message: 'Este item já foi escaneado neste inventário.',
          item: match.item,
          code: match.code,
          timestamp,
        };
      case 'not_found':
        return {
          type: 'error',
          message: `Código "${match.code}" não encontrado no inventário.`,
          code: match.code,
          timestamp,
        };
      default:
        return {
          type: 'error',
          message: `Status desconhecido para o código "${match.code}".`,
          code: match.code,
          timestamp,
        };
    }
  }

  /**
   * Registra um item escaneado que NÃO pertence à lista original do inventário.
   * Adiciona à lista de unexpectedItems e persiste.
   */
  static async registerUnexpectedItem(
    inventoryId: string,
    code: string,
    description?: string,
    location?: string
  ): Promise<Result<Inventory>> {
    return handleServiceError(async () => {
      // 1. Valida o ID
      if (!StorageService.isValidInventoryId(inventoryId)) {
        throw new Error(`ID de inventário inválido: "${inventoryId}"`);
      }

      // 2. Valida o código
      if (!this.validateCode(code)) {
        throw new Error('Código inválido para registro.');
      }

      // 3. Carrega o inventário atual
      const loadResult = await StorageService.loadInventory(inventoryId);
      if (!loadResult.ok) {
        throw new Error(loadResult.error.message);
      }

      const inventory = loadResult.value;

      // 4. Normaliza o código
      const normalizedCode = this.normalizeCode(code);

      // 5. Verifica se o código já existe nos itens normais
      const existsInItems = inventory.items.some(
        (item) => this.normalizeCode(item.code) === normalizedCode
      );

      if (existsInItems) {
        throw new Error(
          `O código "${code}" já existe no inventário. Use o fluxo normal de escaneamento.`
        );
      }

      // 6. Verifica se já foi registrado como inesperado (evita duplicatas)
      const alreadyUnexpected = inventory.unexpectedItems.some(
        (item) => this.normalizeCode(item.code) === normalizedCode
      );

      if (alreadyUnexpected) {
        // Retorna o inventário sem modificar (não lança erro, apenas avisa)
        return inventory;
      }

      // 7. Cria o UnexpectedItem
      const unexpectedItem: UnexpectedItem = {
        code: normalizedCode,
        scannedAt: toISODate(new Date()),
        description: description?.trim() || undefined,
        location: location?.trim() || undefined,
      };

      // 8. Adiciona ao inventário
      inventory.unexpectedItems.push(unexpectedItem);

      // 9. Salva o inventário atualizado
      const saveResult = await StorageService.saveInventory(inventory);
      if (!saveResult.ok) {
        throw new Error(saveResult.error.message);
      }

      // 10. Retorna o inventário atualizado
      return inventory;
    }, 'UNEXPECTED_ITEM_REGISTER_FAILED');
  }
}
