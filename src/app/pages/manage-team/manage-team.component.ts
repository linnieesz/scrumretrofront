import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProjectService } from '../../core/services/projects.service';
import { errorMessage } from '../../core/utils/http-error';
import { initialsOf, roleClass, roleLabel } from '../../core/utils/role.utils';
import { CompanyMember, ProjectMemberResponse, ProjectResponse } from '../../models';
import { MemberSearchComponent } from '../../shared/components/member-search/member-search.component';

@Component({
  selector: 'app-manage-team',
  standalone: true,
  imports: [MemberSearchComponent],
  templateUrl: './manage-team.component.html',
  styleUrls: ['./manage-team.component.css']
})
export class ManageTeamComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectService);

  readonly roleLabel = roleLabel;
  readonly roleClass = roleClass;
  readonly initialsOf = initialsOf;

  projectId = '';
  readonly projectIcon = '📁';

  readonly project = signal<ProjectResponse | null>(null);
  readonly members = signal<ProjectMemberResponse[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly actionError = signal('');
  readonly busyUserId = signal<string | null>(null);

  readonly memberIds = computed(() => this.members().map(m => m.userId));

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    forkJoin({
      project: this.projectService.getProjectById(this.projectId),
      members: this.projectService.getMembers(this.projectId)
    }).subscribe({
      next: ({ project, members }) => {
        this.project.set(project);
        this.members.set(members);
        this.isLoading.set(false);
      },
      error: err => {
        this.errorMessage.set(errorMessage(err, 'Não foi possível carregar a equipe.'));
        this.isLoading.set(false);
      }
    });
  }

  /** A pessoa é escolhida na busca da empresa (sem e-mail); a API recebe o id. */
  addMember(user: CompanyMember): void {
    this.busyUserId.set(user.id);
    this.actionError.set('');
    this.projectService.addMember(this.projectId, { userId: user.id }).subscribe({
      next: member => {
        this.members.update(list => [...list, member]);
        this.busyUserId.set(null);
      },
      error: err => {
        this.busyUserId.set(null);
        this.actionError.set(errorMessage(err, 'Não foi possível adicionar o membro.'));
      }
    });
  }

  removeMember(member: ProjectMemberResponse): void {
    if (member.isOwner) return; // o dono não pode ser removido enquanto for o dono
    this.busyUserId.set(member.userId);
    this.actionError.set('');
    this.projectService.removeMember(this.projectId, member.userId).subscribe({
      next: () => {
        this.members.update(list => list.filter(m => m.userId !== member.userId));
        this.busyUserId.set(null);
      },
      error: err => {
        this.busyUserId.set(null);
        this.actionError.set(errorMessage(err, 'Não foi possível remover o membro.'));
      }
    });
  }
}
