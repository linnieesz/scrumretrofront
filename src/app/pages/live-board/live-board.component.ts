import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap, timer } from 'rxjs';
import { ProjectService } from '../../core/services/projects.service';
import { SprintService } from '../../core/services/sprints.service';
import { CardService } from '../../core/services/cards.service';
import { errorMessage } from '../../core/utils/http-error';
import { BoardCard, BoardResponse, CardType, ProjectResponse, SprintResponse } from '../../models';

interface ColumnDef {
  type: CardType;
  title: string;
  icon: string;
  colorClass: string;
}

interface RetroColumn extends ColumnDef {
  cards: BoardCard[];
}

const COLUMNS: ColumnDef[] = [
  { type: 'WentWell', title: 'O que foi bom', icon: '🌟', colorClass: 'col-green' },
  { type: 'WentBad', title: 'O que foi ruim', icon: '⚡', colorClass: 'col-red' },
  { type: 'CanImprove', title: 'O que pode melhorar', icon: '🔧', colorClass: 'col-yellow' },
  { type: 'Praise', title: 'Parabenizações', icon: '🎉', colorClass: 'col-purple' },
  { type: 'ImprovementSuggestion', title: 'Sugestões', icon: '💡', colorClass: 'col-blue' }
];

const POLL_INTERVAL_MS = 5000;

@Component({
  selector: 'app-live-board',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './live-board.component.html',
  styleUrls: ['./live-board.component.css']
})
export class LiveBoardComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectService);
  private sprintService = inject(SprintService);
  private cardService = inject(CardService);
  private destroyRef = inject(DestroyRef);

  projectId = '';

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly project = signal<ProjectResponse | null>(null);
  readonly sprint = signal<SprintResponse | null>(null);
  readonly board = signal<BoardResponse | null>(null);

  readonly participantsCount = computed(() => this.project()?.memberCount ?? 0);

  readonly columns = computed<RetroColumn[]>(() => {
    const cards = this.board()?.cards ?? [];
    return COLUMNS.map(c => ({ ...c, cards: cards.filter(card => card.type === c.type) }));
  });

  /**
   * O backend embaralha a ordem a cada consulta (anonimato). Para o quadro não "pular" a cada
   * atualização, guardamos a ordem de chegada local: cards já vistos mantêm a posição.
   */
  private order = new Map<string, number>();
  private nextOrder = 0;

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') ?? '';

    forkJoin({
      project: this.projectService.getProjectById(this.projectId),
      sprint: this.sprintService.getCurrent(this.projectId)
    }).subscribe({
      next: ({ project, sprint }) => {
        this.project.set(project);
        this.sprint.set(sprint);
        this.isLoading.set(false);
        if (sprint) this.startPolling(sprint.id);
      },
      error: err => {
        this.errorMessage.set(errorMessage(err, 'Não foi possível carregar o quadro.'));
        this.isLoading.set(false);
      }
    });
  }

  /** "Ao vivo" por polling; para sozinho ao sair da tela. O quadro mostra somente a Retrospectiva. */
  private startPolling(sprintId: string): void {
    timer(0, POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => this.cardService.board(sprintId, 'Retrospective').pipe(
          catchError(err => {
            this.errorMessage.set(errorMessage(err, 'Falha ao atualizar o quadro.'));
            return of(null);
          })
        )),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(board => {
        if (!board) return;
        this.errorMessage.set('');
        this.board.set({ ...board, cards: this.stableOrder(board.cards) });
      });
  }

  private stableOrder(cards: BoardCard[]): BoardCard[] {
    for (const c of cards) {
      if (!this.order.has(c.id)) this.order.set(c.id, this.nextOrder++);
    }
    return [...cards].sort((a, b) => this.order.get(a.id)! - this.order.get(b.id)!);
  }
}
