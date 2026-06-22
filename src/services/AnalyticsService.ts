/**
 * AnalyticsService.ts
 *
 * Camada de dados pura — sem I/O, sem navegação.
 * Recebe um Inventory e devolve métricas prontas para
 * ReportService, ChartService e as telas de relatório.
 */

import {
  AssetItem,
  Inventory,
  isScannedItem,
  ScannedAssetItem,
  UnexpectedItem,
} from '../types/types';
import { formatDisplayDate, formatDisplayDateTime, formatDisplayTime } from '../utils/dateUtils';

// ─── Tipos de saída

export interface OverallStats {
  total: number;
  found: number;
  pending: number;
  unexpectedCount: number;
  progressPct: number; // 0-100
  startedAt: string | null; // ISO — primeiro scan da sessão
  completedAt: string | null; // ISO — último scan (se 100%)
  durationMinutes: number | null;
}

export interface GroupStat {
  label: string;
  total: number;
  found: number;
  pending: number;
  progressPct: number;
}

export interface ScanEvent {
  code: string;
  description: string;
  location: string;
  scanDate: string; // ISO (só existe para found items)
  minutesFromStart: number; // delta desde o primeiro scan
}

export interface InventoryReport {
  inventoryName: string;
  generatedAt: string; // ISO
  overall: OverallStats;
  scanTimeline: ScanEvent[];
  notFoundItems: AssetItem[];
  foundItems: ScannedAssetItem[];
  unexpectedItems: UnexpectedItem[];
}

// ─── Serviço

export class AnalyticsService {
  /**
   * Ponto de entrada principal.
   * Computa o relatório completo a partir de um Inventory.
   */
  static compute(inventory: Inventory): InventoryReport {
    // Separa itens encontrados (found === true) e não encontrados
    const foundItems = inventory.items.filter(isScannedItem);
    const notFoundItems = inventory.items.filter((item) => !item.found);

    const overall = this.computeOverall(
      inventory,
      foundItems,
      inventory.unexpectedItems?.length ?? 0
    );
    const scanTimeline = this.computeTimeline(foundItems, overall.startedAt);

    return {
      inventoryName: inventory.metadata.name,
      generatedAt: new Date().toISOString(),
      overall,

      scanTimeline,
      notFoundItems,
      foundItems,
      unexpectedItems: inventory.unexpectedItems ?? [],
    };
  }

  // ─── Overall ───────────────────────────────────────────────────────────────

  private static computeOverall(
    inventory: Inventory,
    foundItems: ScannedAssetItem[],
    unexpectedCount: number
  ): OverallStats {
    const total = inventory.items.length;
    const found = foundItems.length;
    const pending = total - found;
    const progressPct = total > 0 ? Math.round((found / total) * 100) : 0;

    const dates = foundItems.map((i) => new Date(i.scanDate).getTime()).sort((a, b) => a - b);

    const startedAt = dates.length > 0 ? new Date(dates[0]).toISOString() : null;
    const completedAt =
      progressPct === 100 && dates.length > 0
        ? new Date(dates[dates.length - 1]).toISOString()
        : null;

    const durationMinutes =
      startedAt && dates.length > 1
        ? Math.round((dates[dates.length - 1] - dates[0]) / 60000)
        : null;

    return {
      total,
      found,
      pending,
      unexpectedCount,
      progressPct,
      startedAt,
      completedAt,
      durationMinutes,
    };
  }

  // Agrupamento por campo

  private static computeByGroup(inventory: Inventory, field: 'location'): GroupStat[] {
    const groups = new Map<string, { total: number; found: number }>();

    for (const item of inventory.items) {
      const key = item[field]?.trim() || '(não informado)';
      const existing = groups.get(key) ?? { total: 0, found: 0 };
      existing.total++;

      // Verificação direta, sem necessidade de Set adicional
      if (item.found) existing.found++;

      groups.set(key, existing);
    }

    return Array.from(groups.entries())
      .map(([label, { total, found }]) => ({
        label,
        total,
        found,
        pending: total - found,
        progressPct: total > 0 ? Math.round((found / total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  // Timeline

  private static computeTimeline(
    foundItems: (AssetItem & { found: true; scanDate: string })[],
    startedAt: string | null
  ): ScanEvent[] {
    const startMs = startedAt ? new Date(startedAt).getTime() : null;

    return foundItems
      .slice()
      .sort((a, b) => new Date(a.scanDate).getTime() - new Date(b.scanDate).getTime())
      .map((item) => {
        const scanMs = new Date(item.scanDate).getTime();
        return {
          code: item.code,
          description: item.description ?? '',
          location: item.location ?? '',
          scanDate: item.scanDate,
          minutesFromStart: startMs !== null ? Math.round((scanMs - startMs) / 60000) : 0,
        };
      });
  }

  // ─── Helpers de formatação (wrappers dos utilitários)

  static formatDate(iso: string): string {
    return formatDisplayDate(iso);
  }

  static formatTime(iso: string): string {
    return formatDisplayTime(iso);
  }

  static formatDateTime(iso: string): string {
    return formatDisplayDateTime(iso);
  }
}
