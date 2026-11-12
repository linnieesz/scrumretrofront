import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/projects.service';
import { ProjectCardComponent } from '../../shared/components/project-card/project-card.component';
import { errorMessage } from '../../core/utils/http-error';
import { ProjectResponse } from '../../models';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [ProjectCardComponent],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css']
})
export class ProjectsComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private projectService = inject(ProjectService);

  // Signals: sem eles o app zoneless nunca repinta o fim do "Carregando...".
  readonly projects = signal<ProjectResponse[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly isAdminOrManager = this.authService.isManagerOrAdmin;
  readonly hasProjects = computed(() => this.projects().length > 0);

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.projectService.getProjects().subscribe({
      next: data => {
        this.projects.set(data ?? []);
        this.isLoading.set(false);
      },
      error: err => {
        this.projects.set([]);
        this.errorMessage.set(errorMessage(err, 'Não foi possível carregar os projetos.'));
        this.isLoading.set(false);
      }
    });
  }

  openProject(project: ProjectResponse): void {
    this.router.navigate(['/projects', project.id]);
  }

  createProject(): void {
    this.router.navigate(['/projects/new']);
  }
}
