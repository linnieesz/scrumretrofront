/** Formato padronizado de erro devolvido pelo backend (ApiError). */
export interface ApiError {
  status: number;
  code: string;
  message: string;
  errors?: Record<string, string[]>;
  traceId?: string;
}
