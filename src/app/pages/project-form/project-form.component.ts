import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/companies.service';
import { ProjectService } from '../../core/services/projects.service';
import { errorMessage } from '../../core/utils/http-error';
import { initialsOf, roleClass, roleLabel } from '../../core/utils/role.utils';
import { CompanyMember, CreateProjectRequest, ProjectMemberResponse } from '../../models';
import { MemberSearchComponent } from '../../shared/components/member-search/member-search.component';

/** Membro exibido na lista (na edição vem do projeto; na criação, da busca na empresa). */
type SelectedMember = CompanyMember & { isOwner?: boolean };

/**
 * Cria (/projects/new) ou edita (/projects/:id/edit) um projeto.
 * Na edição, adicionar/remover membros é aplicado na hora pela API; "Salvar" grava nome, descrição e dono.
 * Os membros são escolhidos por busca DENTRO da empresa: não há lista de e-mails em lugar nenhum.
 */
@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MemberSearchComponent],
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.css']
})
export class ProjectFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private companyService = inject(CompanyService);

  readonly roleLabel = roleLabel;
  readonly roleClass = roleClass;
  readonly initialsOf = initialsOf;

  /** Preenchido na rota de edição. */
  projectId: string | null = null;
  get isEdit(): boolean {
    return this.projectId !== null;
  }

  readonly isAdmin = computed(() => this.authService.currentUser()?.role === 'Admin');
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly busyUserId = signal<string | null>(null);

  readonly selectedMembers = signal<SelectedMember[]>([]);
  /** Dono atual (edição), para ele continuar na lista de donos mesmo fora da empresa selecionada. */
  private readonly currentOwner = signal<SelectedMember | null>(null);
  private readonly loadedOwners = signal<CompanyMember[]>([]);
  readonly ownerOptions = computed(() => {
    const current = this.currentOwner();
    const loaded = this.loadedOwners();
    return current && !loaded.some(o => o.id === current.id) ? [current, ...loaded] : loaded;
  });

  /** Ids que não devem aparecer na busca: quem já está na lista (e, na criação, o próprio usuário, que entra como dono). */
  readonly excludedIds = computed(() => {
    const ids = this.selectedMembers().map(m => m.id);
    const me = this.authService.currentUser()?.id;
    return !this.isEdit && me ? [...ids, me] : ids;
  });

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.maxLength(2000)]],
    ownerId: ['']
  });

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id');
    if (this.isEdit) this.loadProject();
  }

  private loadProject(): void {
    this.isLoading.set(true);
    forkJoin({
      project: this.projectService.getProjectById(this.projectId!),
      members: this.projectService.getMembers(this.projectId!)
    }).subscribe({
      next: ({ project, members }) => {
        this.form.patchValue({
          name: project.name,
          description: project.description ?? '',
          ownerId: project.ownerId
        });
        this.selectedMembers.set(members.map(m => this.toSelected(m)));
        const owner = members.find(m => m.isOwner);
        if (owner) this.currentOwner.set(this.toSelected(owner));
        this.isLoading.set(false);
      },
      error: err => {
        this.errorMessage.set(errorMessage(err, 'Não foi possível carregar o projeto.'));
        this.isLoading.set(false);
      }
    });
  }

  private toSelected(m: ProjectMemberResponse): SelectedMember {
    return { id: m.userId, fullName: m.fullName, department: null, role: m.role, isOwner: m.isOwner };
  }

  /** Admin: ao trocar a empresa da busca, carrega os Managers dela como candidatos a dono. */
  onSearchCompanyChange(companyId: string | null): void {
    if (!this.isAdmin() || !companyId) {
      this.loadedOwners.set([]);
      return;
    }
    this.companyService.searchMembers(companyId, undefined, 'Manager')
      .pipe(catchError(() => of([] as CompanyMember[])))
      .subscribe(list => this.loadedOwners.set(list));
  }

  addMember(user: CompanyMember): void {
    if (!this.isEdit) {
      this.selectedMembers.update(list => [...list, user]);
      return;
    }

    // Edição: a API insere pelo id escolhido na busca; a lista é atualizada com a resposta.
    this.busyUserId.set(user.id);
    this.errorMessage.set('');
    this.projectService.addMember(this.projectId!, { userId: user.id }).subscribe({
      next: member => {
        this.selectedMembers.update(list => [...list, this.toSelected(member)]);
        this.busyUserId.set(null);
      },
      error: err => {
        this.busyUserId.set(null);
        this.errorMessage.set(errorMessage(err, 'Não foi possível adicionar o membro.'));
      }
    });
  }

  removeMember(user: SelectedMember): void {
    if (user.isOwner) return; // o dono não pode ser removido enquanto for o dono

    if (!this.isEdit) {
      this.selectedMembers.update(list => list.filter(m => m.id !== user.id));
      return;
    }

    this.busyUserId.set(user.id);
    this.errorMessage.set('');
    this.projectService.removeMember(this.projectId!, user.id).subscribe({
      next: () => {
        this.selectedMembers.update(list => list.filter(m => m.id !== user.id));
        this.busyUserId.set(null);
      },
      error: err => {
        this.busyUserId.set(null);
        this.errorMessage.set(errorMessage(err, 'Não foi possível remover o membro.'));
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.isSubmitting()) return;

    const v = this.form.getRawValue();
    this.errorMessage.set('');
    this.isSubmitting.set(true);

    if (this.isEdit) {
      this.projectService.updateProject(this.projectId!, {
        name: v.name.trim(),
        description: v.description.trim() || null,
        // Só o Admin transfere a propriedade; para os demais o campo nem é enviado.
        ...(this.isAdmin() && v.ownerId ? { ownerId: v.ownerId } : {})
      }).subscribe({
        next: project => {
          this.isSubmitting.set(false);
          this.router.navigate(['/projects', project.id]);
        },
        error: err => {
          this.isSubmitting.set(false);
          this.errorMessage.set(errorMessage(err, 'Não foi possível salvar o projeto.'));
        }
      });
      return;
    }

    const payload: CreateProjectRequest = {
      name: v.name.trim(),
      description: v.description.trim() || null,
      memberIds: this.selectedMembers().map(m => m.id)
    };
    // ownerId vazio = o dono é quem está logado (só o Admin pode informar outra pessoa).
    if (this.isAdmin() && v.ownerId) payload.ownerId = v.ownerId;

    this.projectService.createProject(payload).subscribe({
      next: project => {
        this.isSubmitting.set(false);
        this.router.navigate(['/projects', project.id]);
      },
      error: err => {
        this.isSubmitting.set(false);
        this.errorMessage.set(errorMessage(err, 'Não foi possível criar o projeto.'));
      }
    });
  }
}
