import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ProjectResponse } from '../../../models';
import { initialsOf } from '../../../core/utils/role.utils';

/** O card recebe direto o ProjectDto do backend (antes exigia title/icon/members[], que a API não envia). */
@Component({
  selector: 'app-project-card',
  standalone: true,
  templateUrl: './project-card.component.html',
  styleUrls: ['./project-card.component.css']
})
export class ProjectCardComponent {
  @Input({ required: true }) project!: ProjectResponse;
  @Output() cardClick = new EventEmitter<ProjectResponse>();

  readonly icon = '📁';

  get ownerInitials(): string {
    return initialsOf(this.project.ownerName);
  }

  get membersText(): string {
    const n = this.project.memberCount;
    return `${n} ${n === 1 ? 'membro' : 'membros'}`;
  }

  onSelect(): void {
    this.cardClick.emit(this.project);
  }
}
