import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, forkJoin, of, switchMap, catchError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/projects.service';
import { SprintService } from '../../core/services/sprints.service';
import { CardService } from '../../core/services/cards.service';
import { SuggestionService } from '../../core/services/suggestions.service';
import { errorMessage } from '../../core/utils/http-error';
import { initialsOf, roleClass, roleLabel } from '../../core/utils/role.utils';
import { formatDateOnly, isFutureDateOnly } from '../../core/utils/date.utils';
import {
  BoardCard, CardType, ProjectMemberResponse, ProjectResponse, SprintResponse, SuggestionTracking,
  UpdateSuggestionStatusRequest
} from '../../models';

type SuggestionAction = 'tomada' | 'util' | 'nao-tomada' | 'inutil';

const CARD_TYPE_ROWS: { type: CardType; label: string; dot: string }[] = [
  { type: 'WentWell', label: '🌟 O que foi bom', dot: 'concluído' },
  { type: 'WentBad', label: '⚡ O que foi ruim', dot: 'a-fazer' },
  { type: 'CanImprove', label: '🔧 O que pode melhorar', dot: 'em-andamento' },
  { type: 'Praise', label: '🎉 Parabenizações', dot: 'concluído' },
  { type: 'ImprovementSuggestion', label: '💡 Sugestões de melhoria', dot: 'em-andamento' }
];

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.css']
})
export class ProjectDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private sprintService = inject(SprintService);
  private cardService = inject(CardService);
  private suggestionService = inject(SuggestionService);

  readonly roleLabel = roleLabel;
  readonly roleClass = roleClass;
  readonly initialsOf = initialsOf;
  readonly formatDateOnly = formatDateOnly;

  projectId = '';

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly actionError = signal('');
  readonly isBusy = signal(false);

  readonly project = signal<ProjectResponse | null>(null);
  readonly sprints = signal<SprintResponse[]>([]);
  readonly members = signal<ProjectMemberResponse[]>([]);
  readonly boardCards = signal<BoardCard[]>([]);
  readonly suggestions = signal<SuggestionTracking[]>([]);

  readonly canManage = this.authService.isManagerOrAdmin;
  readonly currentSprint = computed(() => this.sprintService.pickCurrent(this.sprints()));
  readonly hasOpenSprint = computed(() => this.currentSprint()?.status === 'Open');
  /** Sprint aberta cujo início (próximo dia útil) ainda não chegou. */
  readonly isScheduled = computed(() => {
    const s = this.currentSprint();
    return !!s && s.status === 'Open' && isFutureDateOnly(s.startDate);
  });
  readonly sprintStatusText = computed(() =>
    !this.hasOpenSprint() ? 'Encerrada' : this.isScheduled() ? 'Agendada' : 'Em andamento');

  readonly cardRows = computed(() =>
    CARD_TYPE_ROWS.map(r => ({ ...r, count: this.boardCards().filter(c => c.type === r.type).length }))
  );

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      project: this.projectService.getProjectById(this.projectId),
      sprints: this.sprintService.list(this.projectId),
      members: this.projectService.getMembers(this.projectId)
    })
      .pipe(
        switchMap(({ project, sprints, members }) => {
          this.project.set(project);
          this.sprints.set(sprints);
          this.members.set(members);
          const sprint = this.sprintService.pickCurrent(sprints);
          if (!sprint) return of({ cards: [] as BoardCard[], suggestions: [] as SuggestionTracking[] });
          return forkJoin({
            cards: this.cardService.board(sprint.id, 'Retrospective').pipe(catchError(() => of({ cards: [] as BoardCard[] }))),
            suggestions: this.suggestionService.carriedOver(sprint.id).pipe(catchError(() => of([] as SuggestionTracking[])))
          }).pipe(switchMap(r => of({ cards: r.cards.cards, suggestions: r.suggestions })));
        })
      )
      .subscribe({
        next: ({ cards, suggestions }) => {
          this.boardCards.set(cards);
          this.suggestions.set(suggestions);
          this.isLoading.set(false);
        },
        error: err => {
          this.errorMessage.set(errorMessage(err, 'Não foi possível carregar o projeto.'));
          this.isLoading.set(false);
        }
      });
  }

  editProject(): void {
    this.router.navigate(['/projects', this.projectId, 'edit']);
  }

  goToRetro(): void {
    this.router.navigate(['/projects', this.projectId, 'retro']);
  }

  createSprint(): void {
    this.runAction(this.sprintService.create(this.projectId), () => this.load());
  }

  closeSprint(): void {
    const sprint = this.currentSprint();
    if (!sprint || !window.confirm(`Encerrar a Sprint ${sprint.number}? Não será possível criar novos cards nela.`)) return;
    this.runAction(this.sprintService.close(sprint.id), () => this.load());
  }

  isActive(s: SuggestionTracking, action: SuggestionAction): boolean {
    switch (action) {
      case 'tomada': return s.isTaken === true;
      case 'nao-tomada': return s.isTaken === false;
      case 'util': return s.isUseful === true;
      case 'inutil': return s.isUseful === false;
    }
  }

  /** Dois eixos independentes: tomada/não tomada (isTaken) e útil/inútil (isUseful). */
  selectSuggestionStatus(s: SuggestionTracking, action: SuggestionAction): void {
    if (!this.canManage() || this.isBusy()) return;
    const body: UpdateSuggestionStatusRequest =
      action === 'tomada' ? { isTaken: true } :
      action === 'nao-tomada' ? { isTaken: false } :
      action === 'util' ? { isUseful: true } : { isUseful: false };

    this.runAction(this.suggestionService.updateStatus(s.trackingId, body), updated =>
      this.suggestions.update(list => list.map(i => (i.trackingId === updated.trackingId ? updated : i)))
    );
  }

  private runAction<T>(request$: Observable<T>, onSuccess: (r: T) => void): void {
    this.isBusy.set(true);
    this.actionError.set('');
    request$.subscribe({
      next: result => {
        this.isBusy.set(false);
        onSuccess(result);
      },
      error: err => {
        this.isBusy.set(false);
        this.actionError.set(errorMessage(err, 'Não foi possível concluir a ação.'));
      }
    });
  }

  dateText(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
  }
}
