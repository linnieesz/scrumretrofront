/**
 * CNPJ numérico e alfanumérico (julho/2026): 12 posições [0-9A-Z] + 2 dígitos numéricos.
 * Módulo 11; valor do caractere = código ASCII - 48. O backend é quem decide; aqui é só feedback imediato.
 */
const W1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const W2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function normalizeCnpj(value: string | null | undefined): string {
  return (value ?? '').replace(/[.\-/\s]/g, '').toUpperCase();
}

function checkDigit(chars: string, weights: number[]): number {
  let sum = 0;
  for (let i = 0; i < chars.length; i++) sum += (chars.charCodeAt(i) - 48) * weights[i];
  const r = sum % 11;
  return r < 2 ? 0 : 11 - r;
}

export function isValidCnpj(value: string | null | undefined): boolean {
  const c = normalizeCnpj(value);
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(c) || new Set(c).size === 1) return false;
  return c.charCodeAt(12) - 48 === checkDigit(c.slice(0, 12), W1) && c.charCodeAt(13) - 48 === checkDigit(c.slice(0, 13), W2);
}

/** XX.XXX.XXX/XXXX-XX (serve para os dois formatos). */
export function formatCnpj(value: string | null | undefined): string {
  const c = normalizeCnpj(value);
  return c.length === 14 ? `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}` : (value ?? '');
}
