import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink, Router, NavigationEnd, ActivatedRouteSnapshot } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { ProjectService } from '../../services/projects.service';
import { initialsOf, roleLabel } from '../../utils/role.utils';

interface CurrentProjectInfo {
  id: string;
  name: string;
  icon: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private destroyRef = inject(DestroyRef);

  // Estado em signals: o app é zoneless, campos comuns não atualizam a tela sozinhos.
  readonly currentUser = this.authService.currentUser;
  readonly isManagerOrAdmin = this.authService.isManagerOrAdmin;
  readonly isAdmin = computed(() => this.currentUser()?.role === 'Admin');
  readonly initials = computed(() => initialsOf(this.currentUser()?.fullName));
  readonly roleText = computed(() => roleLabel(this.currentUser()?.role));
  readonly currentProject = signal<CurrentProjectInfo | null>(null);

  private projectNames = new Map<string, string>();

  constructor() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateHeaderContext());

    this.updateHeaderContext();
  }

  /**
   * Lê o id do projeto na árvore de SNAPSHOTS do router. Não dá para usar ActivatedRoute.snapshot aqui:
   * o header nasce junto com o layout, antes de a rota filha ser ativada, e o snapshot dela ainda é undefined.
   */
  private currentProjectId(): string | null {
    let snapshot: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    while (snapshot?.firstChild) {
      snapshot = snapshot.firstChild;
    }
    return snapshot?.paramMap?.get('id') ?? null;
  }

  private updateHeaderContext(): void {
    const projectId = this.currentProjectId();
    if (!projectId) {
      this.currentProject.set(null);
      return;
    }

    this.currentProject.set({ id: projectId, name: this.projectNames.get(projectId) ?? 'Projeto', icon: '📁' });

    if (!this.projectNames.has(projectId)) {
      this.projectService.getProjectById(projectId).subscribe({
        next: project => {
          this.projectNames.set(projectId, project.name);
          if (this.currentProject()?.id === projectId) {
            this.currentProject.set({ id: projectId, name: project.name, icon: '📁' });
          }
        },
        error: () => { /* mantém o rótulo genérico; a própria página mostra o erro */ }
      });
    }
  }

  logout(event: Event): void {
    event.stopPropagation(); // não dispara o routerLink do perfil
    this.authService.logout();
  }
}
