/** Datas "yyyy-MM-dd" (DateOnly do backend). Não usar new Date('yyyy-MM-dd'): é UTC e mostra o dia anterior no Brasil. */
export function parseDateOnly(value: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export function formatDateOnly(value: string | null | undefined): string {
  const d = parseDateOnly(value);
  return d ? d.toLocaleDateString('pt-BR') : '';
}

export function isFutureDateOnly(value: string | null | undefined): boolean {
  const d = parseDateOnly(value);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() > today.getTime();
}
