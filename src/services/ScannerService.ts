// ScannerService.ts
import { AssetItem, Inventory, Result, ScanResult } from '../types/types';
import { toISODate } from '../utils/dateUtils';
import { handleServiceError } from '../utils/errorUtils';
import { StorageService } from './StorageService';

export interface ScanMatch {
  status: 'found' | 'not_found' | 'already_scanned';
  item?: AssetItem;
  code: string;
}

export class ScannerService {
  private static normalizeCode(code: string): string {
    return String(code).trim().toLowerCase().replace(/^0+/, '');
  }

  /**
   * Busca um item no inventário pelo código escaneado.
   * Retorna o status do scan: encontrado, já escaneado (found=true) ou não encontrado.
   */
  static findItemByCode(code: string, inventory: Inventory): ScanMatch {
    const normalizedScannedCode = this.normalizeCode(code);

    const item = inventory.items.find((i) => this.normalizeCode(i.code) == normalizedScannedCode);

    if (!item) {
      return { status: 'not_found', code: String(code).trim() };
    }

    // Verifica se o item já foi escaneado (found === true)
    if (item.found) {
      return { status: 'already_scanned', item, code: item.code };
    }

    return { status: 'found', item, code: item.code };
  }

  /**
   * Confirma o scan de um item: marca como encontrado e persiste.
   * Retorna o inventário atualizado e o ScanResult.
   */

  static async confirmScan(
    inventoryId: string, // Renomeado de "inventoryName" para "inventoryId"
    item: AssetItem,
    scanDate?: Date | string
  ): Promise<Result<{ updatedInventory: Inventory; result: ScanResult }>> {
    return handleServiceError(async () => {
      //  Garante que estamos lidando com um ID real
      if (!StorageService.isValidInventoryId(inventoryId)) {
        throw new Error(`ID de inventário inválido ou ausente: "${inventoryId}"`);
      }

      if (item.found) {
        const loadResult = await StorageService.loadInventory(inventoryId);
        if (!loadResult.ok) {
          throw new Error(loadResult.error.message);
        }

        const updatedInventory = loadResult.value;
        const updatedItem = updatedInventory.items.find((i) => i.code === item.code);

        if (!updatedItem) {
          throw new Error('Item não encontrado após recarregar inventário');
        }

        const result: ScanResult = {
          type: 'warning',
          message: `Item "${updatedItem.description || updatedItem.code}" já estava confirmado.`,
          item: updatedItem,
          code: item.code,
          timestamp: toISODate(new Date()),
        };
        return { updatedInventory, result };
      }

      const updateResult = await StorageService.updateItemFoundStatus(
        inventoryId, // passa o ID
        item.code,
        true,
        scanDate
      );

      if (!updateResult.ok) {
        throw new Error(updateResult.error.message);
      }

      const loadResult = await StorageService.loadInventory(inventoryId);
      if (!loadResult.ok) {
        throw new Error(loadResult.error.message);
      }

      const updatedInventory = loadResult.value;
      const updatedItem = updatedInventory.items.find((i) => i.code === item.code);

      if (!updatedItem) {
        throw new Error('Item não encontrado após atualização');
      }

      const result: ScanResult = {
        type: 'success',
        message: `Item "${updatedItem.description || updatedItem.code}" confirmado`,
        item: updatedItem,
        code: item.code,
        timestamp: toISODate(new Date()),
      };
      return { updatedInventory, result };
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
}
