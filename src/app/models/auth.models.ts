import { UserResponse, UserRole } from './user.models';

export interface LoginRequest {
  email: string;
  password: string;
}

/** Espelha RegisterRequest. Admin nunca é aceito no cadastro público. */
export interface RegisterRequest {
  fullName: string;
  email: string;
  department: string | null;
  phone: string | null;
  bio: string | null;
  role: Exclude<UserRole, 'Admin'>;
  /** Empresa escolhida no picker (GET /api/auth/companies). */
  companyId: string;
  password: string;
}

/** Espelha AuthResponse: { token, expiresAt, user } (NÃO é uma resposta plana). */
export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: UserResponse;
}
