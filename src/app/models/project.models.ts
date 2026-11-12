import { UserRole } from './user.models';

/** Espelha ProjectDto. */
export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  ownerName: string;
  isOwner: boolean;
  isMember: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Espelha ProjectMemberDto. */
export interface ProjectMemberResponse {
  userId: string;
  fullName: string;
  role: UserRole;
  isOwner: boolean;
  isActive: boolean;
  addedAt: string;
}

/** Espelha CreateProjectRequest. */
export interface CreateProjectRequest {
  name: string;
  description: string | null;
  ownerId?: string | null;
  memberIds?: string[];
}

/** Espelha UpdateProjectRequest. */
export interface UpdateProjectRequest {
  name: string;
  description: string | null;
  ownerId?: string | null;
}

/** Espelha AddProjectMemberRequest (informe email OU userId). */
export interface AddProjectMemberRequest {
  email?: string;
  userId?: string;
}
