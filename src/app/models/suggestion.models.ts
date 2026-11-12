/** Espelha SuggestionTrackingDto (anônimo). isUseful: null = ainda não avaliada. */
export interface SuggestionTracking {
  trackingId: string;
  content: string;
  originSprintNumber: number;
  isTaken: boolean;
  isUseful: boolean | null;
  updatedAt: string;
}

/** Espelha UpdateSuggestionStatusRequest (ao menos um campo). */
export interface UpdateSuggestionStatusRequest {
  isTaken?: boolean;
  isUseful?: boolean;
}
