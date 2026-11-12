import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { BoardResponse, CardResponse, CeremonyType, CreateCardRequest } from '../../models';

@Injectable({ providedIn: 'root' })
export class CardService {
  private http = inject(HttpClient);

  create(sprintId: string, data: CreateCardRequest): Observable<CardResponse> {
    return this.http.post<CardResponse>(`${API_BASE_URL}/sprints/${sprintId}/cards`, data);
  }

  mine(sprintId: string, ceremony?: CeremonyType): Observable<CardResponse[]> {
    return this.http.get<CardResponse[]>(`${API_BASE_URL}/sprints/${sprintId}/cards/mine`, { params: this.params(ceremony) });
  }

  board(sprintId: string, ceremony?: CeremonyType): Observable<BoardResponse> {
    return this.http.get<BoardResponse>(`${API_BASE_URL}/sprints/${sprintId}/board`, { params: this.params(ceremony) });
  }

  private params(ceremony?: CeremonyType): HttpParams {
    return ceremony ? new HttpParams().set('ceremony', ceremony) : new HttpParams();
  }
}
