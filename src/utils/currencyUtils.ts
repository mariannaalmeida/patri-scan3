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

/**
 * Formata uma string numérica para o formato de moeda brasileiro (R$) enquanto o usuário digita.
 * Ideal para uso no onChangeText de TextInputs com keyboardType="numeric".
 * * Exemplos de digitação:
 * "1"      -> "0,01"
 * "15"     -> "0,15"
 * "1500"   -> "15,00"
 * "150000" -> "1.500,00"
 * * @param value - String capturada no input
 * @returns A string formatada com as casas decimais corretas
 */
export const formatBrazilianCurrencyInput = (value: string): string => {
  // Remove tudo que não for número da string atual
  const numericValue = value.replace(/\D/g, '');

  if (!numericValue) return '';

  // Transforma em número decimal dividindo por 100
  const amount = parseFloat(numericValue) / 100;

  // Formata devolvendo com os separadores do Brasil (ex: 1.500,00)
  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
