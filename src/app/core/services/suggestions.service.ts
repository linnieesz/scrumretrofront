import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { SuggestionTracking, UpdateSuggestionStatusRequest } from '../../models';

@Injectable({ providedIn: 'root' })
export class SuggestionService {
  private http = inject(HttpClient);

  /** Sugestões de sprints anteriores do projeto ainda não tomadas (anônimas). */
  carriedOver(sprintId: string): Observable<SuggestionTracking[]> {
    return this.http.get<SuggestionTracking[]>(`${API_BASE_URL}/sprints/${sprintId}/suggestions/carried-over`);
  }

  /** Eixos independentes: isTaken (tomada) e isUseful (útil). Admin/Manager. */
  updateStatus(trackingId: string, data: UpdateSuggestionStatusRequest): Observable<SuggestionTracking> {
    return this.http.patch<SuggestionTracking>(`${API_BASE_URL}/suggestions/${trackingId}/status`, data);
  }
}
