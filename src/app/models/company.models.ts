import { UserRole } from './user.models';

/** Espelha CompanyDto (somente Admin). cnpj vem normalizado, sem pontuação. */
export interface CompanyResponse {
  id: string;
  name: string;
  legalName: string | null;
  cnpj: string;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Espelha CompanyOptionDto (GET /api/auth/companies, público): só id e nome. */
export interface CompanyOption {
  id: string;
  name: string;
}

/** Espelha CompanyMemberDto: resultado da busca na empresa. Não existe e-mail aqui, de propósito. */
export interface CompanyMember {
  id: string;
  fullName: string;
  department: string | null;
  role: UserRole;
}

export interface CreateCompanyRequest {
  name: string;
  legalName: string | null;
  cnpj: string;
}

export interface UpdateCompanyRequest extends CreateCompanyRequest {
  isActive: boolean;
}
