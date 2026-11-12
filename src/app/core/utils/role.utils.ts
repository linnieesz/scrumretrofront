import { UserRole } from '../../models';

export const ROLE_LABELS: Record<UserRole, string> = {
  Admin: 'Administrador',
  Manager: 'Manager',
  Member: 'Membro'
};

export function roleLabel(role: string | null | undefined): string {
  return ROLE_LABELS[role as UserRole] ?? role ?? '';
}

/** Classe CSS dos badges existentes (.admin, .manager, .membro). */
export function roleClass(role: string | null | undefined): string {
  return role === 'Member' ? 'membro' : (role ?? '').toLowerCase();
}

export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'US';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
