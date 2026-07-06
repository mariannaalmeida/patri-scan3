// ScannerService.ts
import { AssetItem, Inventory, Result, ScanResult, UnexpectedItem } from '../types/types';
import { toISODate } from '../utils/dateUtils';
import { handleServiceError } from '../utils/errorUtils';
import { StorageService } from './StorageService';

export interface ScanMatch {
  status: 'found' | 'not_found' | 'already_scanned';
  item?: AssetItem;
  code: string; // código normalizado que foi escaneado
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
        code: normalizedScannedCode, // usa a versão normalizada
      };
    }

    return item.found
      ? {
          status: 'already_scanned',
          item,
          code: item.code, // mantém o código original do item (exibição)
        }
      : {
          status: 'found',
          item,
          code: item.code,
        };
  }

  /**
   * Confirma o scan de um item: marca como encontrado e persiste.
   * Agora com data de escaneamento padrão (agora) se não fornecida.
   */
  static async confirmScan(
    inventoryId: string,
    item: AssetItem,
    scanDate: Date | string = new Date()
  ): Promise<Result<{ updatedItem: AssetItem; result: ScanResult }>> {
    return handleServiceError(async () => {
      if (!StorageService.isValidInventoryId(inventoryId)) {
        throw new Error(`ID de inventário inválido ou ausente: "${inventoryId}"`);
      }

      // Se o item já foi escaneado, recarrega e retorna warning
      if (item.found) {
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

      // Primeiro scan: utiliza updateItemFoundStatus com a data fornecida
      const updateResult = await StorageService.updateItemFoundStatus(
        inventoryId,
        item.code,
        true,
        scanDate // agora sempre tem um valor (padrão ou passado)
      );

      if (!updateResult.ok) {
        throw new Error(updateResult.error.message);
      }

      const updatedItem = updateResult.value.updatedItem;

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

  static getProgress(inventory: Inventory) {
    const total = inventory.items.length;
    const scanned = inventory.items.filter((item) => item.found).length;
    return {
      scanned,
      total,
      percentage: total > 0 ? Math.round((scanned / total) * 100) : 0,
      remaining: total - scanned,
    };
  }

  static getPendingItems(inventory: Inventory): AssetItem[] {
    return inventory.items.filter((item) => !item.found);
  }

  static getScannedItems(inventory: Inventory): AssetItem[] {
    return inventory.items.filter((item) => item.found);
  }

  static validateCode(code: string): boolean {
    return typeof code === 'string' && code.trim().length > 0;
  }

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

  static async registerUnexpectedItem(
    inventoryId: string,
    code: string,
    description?: string,
    location?: string
  ): Promise<Result<Inventory>> {
    return handleServiceError(async () => {
      if (!StorageService.isValidInventoryId(inventoryId)) {
        throw new Error(`ID de inventário inválido: "${inventoryId}"`);
      }

      if (!this.validateCode(code)) {
        throw new Error('Código inválido para registro.');
      }

      const loadResult = await StorageService.loadInventory(inventoryId);
      if (!loadResult.ok) {
        throw new Error(loadResult.error.message);
      }

      const inventory = loadResult.value;
      const normalizedCode = this.normalizeCode(code);

      const existsInItems = inventory.items.some(
        (item) => this.normalizeCode(item.code) === normalizedCode
      );

      if (existsInItems) {
        throw new Error(
          `O código "${code}" já existe no inventário. Use o fluxo normal de escaneamento.`
        );
      }

      const alreadyUnexpected = inventory.unexpectedItems.some(
        (item) => this.normalizeCode(item.code) === normalizedCode
      );

      if (alreadyUnexpected) {
        // Retorna o inventário sem modificar, mas com aviso implícito (o chamador pode tratar)
        return inventory;
      }

      const unexpectedItem: UnexpectedItem = {
        code: normalizedCode,
        scannedAt: toISODate(new Date()),
        description: description?.trim() || undefined,
        location: location?.trim() || undefined,
      };

      inventory.unexpectedItems.push(unexpectedItem);

      const saveResult = await StorageService.saveInventory(inventory);
      if (!saveResult.ok) {
        throw new Error(saveResult.error.message);
      }

      return inventory;
    }, 'UNEXPECTED_ITEM_REGISTER_FAILED');
  }
}
