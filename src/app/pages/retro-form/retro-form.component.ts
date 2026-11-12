import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { SprintService } from '../../core/services/sprints.service';
import { CardService } from '../../core/services/cards.service';
import { errorMessage } from '../../core/utils/http-error';
import { CardType, CeremonyType, CreateCardRequest, SprintResponse } from '../../models';

/** Esta tela alimenta apenas o quadro da Retrospectiva. */
const CEREMONY: CeremonyType = 'Retrospective';

/** Cada textarea vira um card do tipo correspondente (POST /api/sprints/{id}/cards). */
const FIELD_TYPES: { control: 'whatWentWell' | 'whatWentBad' | 'whatToImprove' | 'kudos' | 'suggestion'; type: CardType }[] = [
  { control: 'whatWentWell', type: 'WentWell' },
  { control: 'whatWentBad', type: 'WentBad' },
  { control: 'whatToImprove', type: 'CanImprove' },
  { control: 'kudos', type: 'Praise' },
  { control: 'suggestion', type: 'ImprovementSuggestion' }
];

@Component({
  selector: 'app-retro-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './retro-form.component.html',
  styleUrls: ['./retro-form.component.css']
})
export class RetroFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sprintService = inject(SprintService);
  private cardService = inject(CardService);

  projectId = '';

  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly sprint = signal<SprintResponse | null>(null);
  readonly myCardsCount = signal(0);
  readonly canSubmit = computed(() => this.sprint()?.status === 'Open');

  retroForm = this.fb.nonNullable.group({
    whatWentWell: ['', [Validators.maxLength(1000)]],
    whatWentBad: ['', [Validators.maxLength(1000)]],
    whatToImprove: ['', [Validators.maxLength(1000)]],
    kudos: ['', [Validators.maxLength(1000)]],
    suggestion: ['', [Validators.maxLength(1000)]]
  });

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') ?? '';

    this.sprintService.getCurrent(this.projectId).subscribe({
      next: sprint => {
        this.sprint.set(sprint);
        this.isLoading.set(false);
        this.loadMyCardsCount();
      },
      error: err => {
        this.errorMessage.set(errorMessage(err, 'Não foi possível carregar a sprint.'));
        this.isLoading.set(false);
      }
    });
  }

  private loadMyCardsCount(): void {
    const sprint = this.sprint();
    if (!sprint) return;
    this.cardService.mine(sprint.id, CEREMONY)
      .pipe(catchError(() => of([])))
      .subscribe(cards => this.myCardsCount.set(cards.length));
  }

  onSubmit(): void {
    const sprint = this.sprint();
    if (!sprint || !this.canSubmit() || this.isSubmitting()) return;

    const values = this.retroForm.getRawValue();
    const requests: CreateCardRequest[] = FIELD_TYPES
      .map(f => ({ ceremony: CEREMONY, type: f.type, content: values[f.control].trim() }))
      .filter(r => r.content.length > 0);

    if (this.retroForm.invalid || requests.length === 0) {
      this.retroForm.markAllAsTouched();
      this.errorMessage.set(requests.length === 0
        ? 'Preencha ao menos um campo (até 1000 caracteres cada).'
        : 'Algum campo ultrapassa 1000 caracteres.');
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    forkJoin(requests.map(r => this.cardService.create(sprint.id, r))).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/projects', this.projectId, 'live-board']);
      },
      error: err => {
        this.isSubmitting.set(false);
        this.errorMessage.set(errorMessage(err, 'Não foi possível enviar seus cards.'));
        this.loadMyCardsCount(); // alguns cards podem ter sido gravados antes da falha
      }
    });
  }
}
