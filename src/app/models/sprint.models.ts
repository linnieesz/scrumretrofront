/** Open = aberta, Closed = encerrada. */
export type SprintStatus = 'Open' | 'Closed';

/** Espelha SprintDto. */
export interface SprintResponse {
  id: string;
  projectId: string;
  number: number;
  status: SprintStatus;
  /** Data de início planejada, 'yyyy-MM-dd' (próximo dia útil após o encerramento da sprint anterior). */
  startDate: string;
  createdAt: string;
  closedAt: string | null;
}
