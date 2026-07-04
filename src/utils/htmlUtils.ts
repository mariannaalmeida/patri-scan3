/**
 * Escapa caracteres especiais para entidades HTML seguras.
 * Ordem das substituições é importante: '&' primeiro.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function checkIconSVG(): string {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:4px;">
    <circle cx="12" cy="12" r="11" fill="#00E5A0" stroke="none" />
    <path d="M7 13l3 3 7-7" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`;
}