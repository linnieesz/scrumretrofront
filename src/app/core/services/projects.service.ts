import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import {
  AddProjectMemberRequest, CreateProjectRequest, ProjectMemberResponse, ProjectResponse, UpdateProjectRequest
} from '../../models';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private http = inject(HttpClient);
  private apiUrl = `${API_BASE_URL}/projects`;

  /** Admin vê todos; os demais só os seus. onlyMine=true restringe aos projetos em que é membro. */
  getProjects(onlyMine = false): Observable<ProjectResponse[]> {
    let params = new HttpParams();
    if (onlyMine) params = params.set('onlyMine', true);
    return this.http.get<ProjectResponse[]>(this.apiUrl, { params });
  }

  getProjectById(id: string): Observable<ProjectResponse> {
    return this.http.get<ProjectResponse>(`${this.apiUrl}/${id}`);
  }

  createProject(data: CreateProjectRequest): Observable<ProjectResponse> {
    return this.http.post<ProjectResponse>(this.apiUrl, data);
  }

  updateProject(id: string, data: UpdateProjectRequest): Observable<ProjectResponse> {
    return this.http.put<ProjectResponse>(`${this.apiUrl}/${id}`, data);
  }

  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getMembers(id: string): Observable<ProjectMemberResponse[]> {
    return this.http.get<ProjectMemberResponse[]>(`${this.apiUrl}/${id}/members`);
  }

  addMember(id: string, data: AddProjectMemberRequest): Observable<ProjectMemberResponse> {
    return this.http.post<ProjectMemberResponse>(`${this.apiUrl}/${id}/members`, data);
  }

  removeMember(id: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/members/${userId}`);
  }
}
