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

// ─── Tipos de saída ──────────────────────────────────────────────────────────

export interface OverallStats {
  total: number;
  found: number;
  pending: number;
  unexpectedCount: number;
  progressPct: number; // 0-100
  startedAt: string | null; // ISO — primeiro scan da sessão (inclui sobras)
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
  scanDate: string; // ISO
  minutesFromStart: number; // delta desde o primeiro scan geral
  isUnexpected?: boolean; // Flag para UI diferenciar no histórico
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

// Serviço

export class AnalyticsService {
  /**
   * Ponto de entrada principal.
   * Computa o relatório completo a partir de um Inventory.
   */
  static compute(inventory: Inventory): InventoryReport {
    // Separa itens originais encontrados e não encontrados
    const foundItems = inventory.items.filter(isScannedItem);
    const notFoundItems = inventory.items.filter((item) => !item.found);
    const unexpectedItems = inventory.unexpectedItems ?? [];

    const overall = this.computeOverall(inventory, foundItems, unexpectedItems);

    const scanTimeline = this.computeTimeline(foundItems, unexpectedItems, overall.startedAt);

    return {
      inventoryName: inventory.metadata.name,
      generatedAt: new Date().toISOString(),
      overall,
      scanTimeline,
      notFoundItems,
      foundItems,
      unexpectedItems,
    };
  }

  // ─── Overall ───────────────────────────────────────────────────────────────

  private static computeOverall(
    inventory: Inventory,
    foundItems: ScannedAssetItem[],
    unexpectedItems: UnexpectedItem[]
  ): OverallStats {
    const total = inventory.items.length;
    const found = foundItems.length;
    const pending = total - found;
    const unexpectedCount = unexpectedItems.length;
    const progressPct = total > 0 ? Math.round((found / total) * 100) : 0;

    // Extrai e junta as datas de TODOS os escaneamentos (Originais + Sobras)
    const foundDates = foundItems.map((i) => new Date(i.scanDate).getTime());
    const unexpectedDates = unexpectedItems.map((i) => new Date(i.scannedAt).getTime());
    const allDates = [...foundDates, ...unexpectedDates].sort((a, b) => a - b);

    const startedAt = allDates.length > 0 ? new Date(allDates[0]).toISOString() : null;

    // completedAt reflete a última leitura da sessão SE a lista original atingiu 100%
    const completedAt =
      progressPct === 100 && allDates.length > 0
        ? new Date(allDates[allDates.length - 1]).toISOString()
        : null;

    const durationMinutes =
      startedAt && allDates.length > 1
        ? Math.round((allDates[allDates.length - 1] - allDates[0]) / 60000)
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

  // ─── Timeline ──────────────────────────────────────────────────────────────

  private static computeTimeline(
    foundItems: ScannedAssetItem[],
    unexpectedItems: UnexpectedItem[],
    startedAt: string | null
  ): ScanEvent[] {
    const startMs = startedAt ? new Date(startedAt).getTime() : null;

    // Normaliza os eventos de itens originais
    const foundEvents = foundItems.map((item) => ({
      code: item.code,
      description: item.description ?? '',
      location: item.location ?? '',
      scanDate: item.scanDate,
      isUnexpected: false,
    }));

    // Normaliza os eventos de sobras físicas (compatibilizando scannedAt -> scanDate)
    const unexpectedEvents = unexpectedItems.map((item) => ({
      code: item.code,
      description: item.description ?? '',
      location: item.location ?? '',
      scanDate: item.scannedAt,
      isUnexpected: true,
    }));

    // Junta tudo, ordena cronologicamente e calcula o delta em minutos
    return [...foundEvents, ...unexpectedEvents]
      .sort((a, b) => new Date(a.scanDate).getTime() - new Date(b.scanDate).getTime())
      .map((event) => {
        const scanMs = new Date(event.scanDate).getTime();
        return {
          ...event,
          minutesFromStart: startMs !== null ? Math.round((scanMs - startMs) / 60000) : 0,
        };
      });
  }

  // ─── Agrupamento por campo ─────────────────────────────────────────────────

  private static computeByGroup(inventory: Inventory, field: 'location'): GroupStat[] {
    const groups = new Map<string, { total: number; found: number }>();

    for (const item of inventory.items) {
      const key = item[field]?.trim() || '(não informado)';
      const existing = groups.get(key) ?? { total: 0, found: 0 };
      existing.total++;

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

  // ─── Helpers de formatação ─────────────────────────────────────────────────

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
