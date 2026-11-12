import { Component, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, combineLatest, debounceTime, distinctUntilChanged, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { CompanyService } from '../../../core/services/companies.service';
import { errorMessage } from '../../../core/utils/http-error';
import { initialsOf, roleClass, roleLabel } from '../../../core/utils/role.utils';
import { CompanyMember, CompanyResponse } from '../../../models';

/**
 * Busca de membros DENTRO de uma empresa (GET /api/companies/{id}/members). Não existe lista global de usuários e
 * o resultado não traz e-mail. Admin escolhe a empresa; Manager busca só na própria.
 */
@Component({
  selector: 'app-member-search',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './member-search.component.html',
  styleUrls: ['./member-search.component.css']
})
export class MemberSearchComponent {
  private authService = inject(AuthService);
  private companyService = inject(CompanyService);

  /** Ids que já estão na lista e não devem aparecer nos resultados. */
  readonly excludedIds = input<string[]>([]);
  /** Id do usuário com ação em andamento (desabilita o botão). */
  readonly busyId = input<string | null>(null);

  readonly add = output<CompanyMember>();
  /** Empresa onde a busca está sendo feita (útil para quem precisa de candidatos a dono, por exemplo). */
  readonly companyChange = output<string | null>();

  readonly roleLabel = roleLabel;
  readonly roleClass = roleClass;
  readonly initialsOf = initialsOf;

  readonly isAdmin = computed(() => this.authService.currentUser()?.role === 'Admin');
  readonly companies = signal<CompanyResponse[]>([]);
  readonly companyId = signal<string | null>(null);
  readonly results = signal<CompanyMember[]>([]);
  readonly isSearching = signal(false);
  readonly error = signal('');

  readonly noCompany = computed(() =>
    this.isAdmin() ? this.companies().length === 0 : !this.authService.currentUser()?.companyId);

  readonly availableResults = computed(() => {
    const excluded = new Set(this.excludedIds());
    return this.results().filter(u => !excluded.has(u.id));
  });

  searchControl = new FormControl('', { nonNullable: true });

  constructor() {
    if (this.isAdmin()) {
      this.companyService.list().subscribe({
        next: list => {
          const active = list.filter(c => c.isActive);
          this.companies.set(active);
          if (active.length > 0) this.setCompany(active[0].id);
        },
        error: err => this.error.set(errorMessage(err, 'Não foi possível carregar as empresas.'))
      });
    } else {
      this.setCompany(this.authService.currentUser()?.companyId ?? null);
    }

    combineLatest([
      toObservable(this.companyId),
      this.searchControl.valueChanges.pipe(startWith(''), debounceTime(300), distinctUntilChanged())
    ])
      .pipe(
        switchMap(([companyId, term]) => {
          if (!companyId) {
            this.results.set([]);
            return of(null);
          }
          this.isSearching.set(true);
          this.error.set('');
          return this.companyService.searchMembers(companyId, term).pipe(
            catchError(err => {
              this.error.set(errorMessage(err, 'Não foi possível buscar os membros.'));
              return of([] as CompanyMember[]);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe(list => {
        if (list) this.results.set(list);
        this.isSearching.set(false);
      });
  }

  onCompanySelected(event: Event): void {
    this.setCompany((event.target as HTMLSelectElement).value || null);
  }

  private setCompany(id: string | null): void {
    this.companyId.set(id);
    this.companyChange.emit(id);
  }
}
