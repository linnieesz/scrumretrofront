import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { API_BASE_URL } from '../config/api.config';
import {
  AuthResponse, CompanyOption, LoginRequest, RegisterRequest, RoleOption, UserResponse, UserRole
} from '../../models';

const TOKEN_KEY = 'authToken';
const USER_KEY = 'currentUser';
const EXPIRES_KEY = 'tokenExpiresAt';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private apiUrl = `${API_BASE_URL}/auth`;

  /** Usuário logado (apenas o UserDto do backend). Signal: o header e as telas reagem sozinhos (app zoneless). */
  private readonly _currentUser = signal<UserResponse | null>(this.readStoredUser());
  readonly currentUser = this._currentUser.asReadonly();
  readonly isManagerOrAdmin = computed(() => {
    const role = this._currentUser()?.role;
    return role === 'Admin' || role === 'Manager';
  });

  register(data: RegisterRequest): Observable<AuthResponse> {
    // O backend já devolve o JWT no cadastro: abre a sessão imediatamente.
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(tap(res => this.startSession(res)));
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(tap(res => this.startSession(res)));
  }

  getRoles(): Observable<RoleOption[]> {
    return this.http.get<RoleOption[]>(`${this.apiUrl}/roles`);
  }

  /** Empresas ativas para o picker do cadastro (público: só id e nome). */
  getCompanies(): Observable<CompanyOption[]> {
    return this.http.get<CompanyOption[]>(`${this.apiUrl}/companies`);
  }

  logout(redirect = true): void {
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(EXPIRES_KEY);
    }
    this._currentUser.set(null);
    if (redirect) this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem(TOKEN_KEY) : null;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    const expiresAt = this.isBrowser ? localStorage.getItem(EXPIRES_KEY) : null;
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
      this.logout(false);
      return false;
    }
    return true;
  }

  getCurrentUser(): UserResponse | null {
    return this._currentUser();
  }

  hasRole(...roles: UserRole[]): boolean {
    const role = this._currentUser()?.role;
    return !!role && roles.includes(role);
  }

  /** Atualiza o usuário da sessão (ex.: depois de editar o perfil). */
  setSessionUser(user: UserResponse): void {
    if (this.isBrowser) localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._currentUser.set(user);
  }

  private startSession(res: AuthResponse): void {
    if (!res?.token || !res.user) return;
    if (this.isBrowser) {
      localStorage.setItem(TOKEN_KEY, res.token);
      localStorage.setItem(EXPIRES_KEY, res.expiresAt);
    }
    this.setSessionUser(res.user);
  }

  private readStoredUser(): UserResponse | null {
    if (!this.isBrowser) return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw || raw === 'undefined') return null;
    try {
      const parsed = JSON.parse(raw);
      // Sessões antigas guardavam a resposta inteira do login: descarta o que não é UserDto.
      return parsed && typeof parsed.fullName === 'string' ? (parsed as UserResponse) : null;
    } catch {
      return null;
    }
  }
}
