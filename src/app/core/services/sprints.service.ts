import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { SprintResponse } from '../../models';

@Injectable({ providedIn: 'root' })
export class SprintService {
  private http = inject(HttpClient);

  list(projectId: string): Observable<SprintResponse[]> {
    return this.http.get<SprintResponse[]>(`${API_BASE_URL}/projects/${projectId}/sprints`);
  }

  create(projectId: string): Observable<SprintResponse> {
    return this.http.post<SprintResponse>(`${API_BASE_URL}/projects/${projectId}/sprints`, {});
  }

  close(sprintId: string): Observable<SprintResponse> {
    return this.http.put<SprintResponse>(`${API_BASE_URL}/sprints/${sprintId}/close`, {});
  }

  /** Sprint "atual": a aberta de maior número; se não houver, a última encerrada; senão null. */
  pickCurrent(sprints: SprintResponse[]): SprintResponse | null {
    if (sprints.length === 0) return null;
    const byNumberDesc = [...sprints].sort((a, b) => b.number - a.number);
    return byNumberDesc.find(s => s.status === 'Open') ?? byNumberDesc[0];
  }

  getCurrent(projectId: string): Observable<SprintResponse | null> {
    return this.list(projectId).pipe(map(list => this.pickCurrent(list)));
  }
}
