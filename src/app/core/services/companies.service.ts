import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { CompanyMember, CompanyResponse, CreateCompanyRequest, UpdateCompanyRequest, UserRole } from '../../models';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private http = inject(HttpClient);
  private apiUrl = `${API_BASE_URL}/companies`;

  /** Admin. */
  list(search?: string): Observable<CompanyResponse[]> {
    let params = new HttpParams();
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<CompanyResponse[]>(this.apiUrl, { params });
  }

  /** Admin: único papel que cria empresa. */
  create(data: CreateCompanyRequest): Observable<CompanyResponse> {
    return this.http.post<CompanyResponse>(this.apiUrl, data);
  }

  /** Admin. */
  update(id: string, data: UpdateCompanyRequest): Observable<CompanyResponse> {
    return this.http.put<CompanyResponse>(`${this.apiUrl}/${id}`, data);
  }

  /** Busca de membros DENTRO da empresa (sem e-mail). Admin: qualquer empresa; Manager: a sua. */
  searchMembers(companyId: string, search?: string, role?: UserRole): Observable<CompanyMember[]> {
    let params = new HttpParams();
    if (search?.trim()) params = params.set('search', search.trim());
    if (role) params = params.set('role', role);
    return this.http.get<CompanyMember[]>(`${this.apiUrl}/${companyId}/members`, { params });
  }
}
