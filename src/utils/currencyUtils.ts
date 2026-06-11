/**
 * Converte uma string de valor monetário para número, lidando com sujeira
 * (ex: "R$", espaços) e suportando tanto formato BR quanto US.
 *
 * @param value - String representando o valor monetário
 * @returns O número correspondente, ou NaN se a string for inválida.
 */

/**
 * Converte valores monetários ou numéricos em formato BR ou US.
 *
 * Exemplos:
 * "1.500,50"   -> 1500.50
 * "1,500.50"   -> 1500.50
 * "1500,50"    -> 1500.50
 * "1500.50"    -> 1500.50
 * "1.500"      -> 1500
 * "1,500"      -> 1500
 * "-1.500,50"  -> -1500.50
 * "R$ 1.500"   -> 1500
 */
export function parseBrazilianCurrency(value: string): number {
  if (!value || typeof value !== 'string') {
    return NaN;
  }

  const isNegative = value.includes('-');

  let sanitized = value.replace(/[^\d.,-]/g, '').replace(/-/g, '');

  if (!sanitized) {
    return NaN;
  }

  const hasComma = sanitized.includes(',');
  const hasDot = sanitized.includes('.');

  if (hasComma && hasDot) {
    const lastComma = sanitized.lastIndexOf(',');
    const lastDot = sanitized.lastIndexOf('.');

    if (lastComma > lastDot) {
      // BR: 1.500,50
      sanitized = sanitized.replace(/\./g, '').replace(',', '.');
    } else {
      // US: 1,500.50
      sanitized = sanitized.replace(/,/g, '');
    }
  } else if (hasComma) {
    const parts = sanitized.split(',');

    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      // 1,500 ou 1,234,567
      sanitized = sanitized.replace(/,/g, '');
    } else {
      // 1500,50
      sanitized = sanitized.replace(',', '.');
    }
  } else if (hasDot) {
    const parts = sanitized.split('.');

    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      // 1.500 ou 1.234.567
      sanitized = sanitized.replace(/\./g, '');
    }
  }

  const parsed = Number(sanitized);

  if (Number.isNaN(parsed)) {
    return NaN;
  }

  return isNegative ? -parsed : parsed;
}

export function parseBrazilianCurrencySafe(value?: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = parseBrazilianCurrency(value);

  return Number.isNaN(parsed) ? undefined : parsed;
}

// Instancia o formatador uma única vez em memória para melhor performance
const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBrazilianCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '';
  }

  return brlFormatter.format(value);
}
