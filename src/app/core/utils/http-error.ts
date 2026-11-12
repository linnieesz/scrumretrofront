import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../../models';

export interface ParsedHttpError {
  status: number;
  message: string;
  fieldErrors: Record<string, string[]>;
}

/** Converte qualquer erro HTTP em mensagem amigável + erros por campo (formato ApiError do backend). */
export function parseHttpError(err: unknown, fallback = 'Ocorreu um erro inesperado. Tente novamente.'): ParsedHttpError {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return { status: 0, message: 'Não foi possível conectar ao servidor. Verifique se a API está em execução.', fieldErrors: {} };
    }
    const body = err.error as Partial<ApiError> | null;
    if (body && typeof body === 'object' && typeof body.message === 'string') {
      const fieldErrors = body.errors ?? {};
      const details = Object.values(fieldErrors).flat();
      const message = details.length > 0 ? `${body.message} ${details.join(' ')}` : body.message;
      return { status: err.status, message, fieldErrors };
    }
    return { status: err.status, message: fallback, fieldErrors: {} };
  }
  return { status: -1, message: fallback, fieldErrors: {} };
}

export function errorMessage(err: unknown, fallback?: string): string {
  return parseHttpError(err, fallback).message;
}
