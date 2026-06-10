/**
 * Converte uma string de valor monetário para número, lidando com sujeira
 * (ex: "R$", espaços) e suportando tanto formato BR quanto US.
 *
 * Heurística de detecção:
 * - Se tem vírgula E ponto, o último separador encontrado define o decimal.
 *   Ex: "1.500,50" → vírgula é decimal (BR), "1,500.50" → ponto é decimal (US).
 * - Se tem apenas vírgula → formato BR (ex: "1500,50").
 * - Se tem apenas ponto → formato US (ex: "1500.50").
 *
 * @param value - String representando o valor monetário
 * @returns O número correspondente, ou NaN se a string for inválida.
 */
export function parseBrazilianCurrency(value: string): number {
  if (!value || typeof value !== 'string') return NaN;

  // 1. Remove TUDO que não for dígito, ponto ou vírgula (limpa "R$", letras, espaços)
  let sanitized = value.replace(/[^\d.,]/g, '');

  if (!sanitized) return NaN;

  const hasComma = sanitized.includes(',');
  const hasDot = sanitized.includes('.');

  // 2. Se tiver ambos os separadores, decidir pelo último
  if (hasComma && hasDot) {
    const lastComma = sanitized.lastIndexOf(',');
    const lastDot = sanitized.lastIndexOf('.');

    if (lastDot > lastComma) {
      // Formato inglês: 1,500.50 → vírgula é milhar, ponto é decimal
      // Remove todas as vírgulas, mantém o ponto
      sanitized = sanitized.replace(/,/g, '');
    } else {
      // Formato brasileiro: 1.500,50 → ponto é milhar, vírgula é decimal
      // Remove todos os pontos e troca a vírgula por ponto
      sanitized = sanitized.replace(/\./g, '').replace(',', '.');
    }
  } else if (hasComma) {
    // 3. Só tem vírgula → formato BR (ex: "1500,50" ou "1500,00")
    // Se tem ponto junto, já foi tratado no caso acima.
    // Troca vírgula por ponto para parseFloat
    sanitized = sanitized.replace(',', '.');
  }
  // 4. Se só tem ponto ou nenhum separador → parseFloat lida direto

  return parseFloat(sanitized);
}

/**
 * Versão segura que retorna `undefined` caso o valor seja inválido ou vazio.
 *
 * @param value - String a ser convertida
 * @returns número ou undefined
 */
export function parseBrazilianCurrencySafe(value: string): number | undefined {
  const parsed = parseBrazilianCurrency(value);
  return isNaN(parsed) ? undefined : parsed;
}
