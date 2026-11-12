/** Espelha o enum UserRole do backend (serializado como texto). */
export type UserRole = 'Member' | 'Manager' | 'Admin';

/** Espelha UserDto (GET /api/users/me, /api/users/{id}, user dentro de AuthResponse). */
export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  department: string | null;
  phone: string | null;
  bio: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  /** Empresa do usuário (null para Admin sem empresa ou usuários antigos ainda não vinculados). */
  companyId: string | null;
  companyName: string | null;
}

/** Espelha RoleOptionDto (GET /api/auth/roles). */
export interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  allowedOnRegistration: boolean;
}

/** Espelha UpdateProfileRequest. O backend exige fullName e email. */
export interface UpdateProfileRequest {
  fullName: string;
  email: string;
  department: string | null;
  phone: string | null;
  bio: string | null;
}

/** Espelha ChangePasswordRequest. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
