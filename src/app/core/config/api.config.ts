import { environment } from '../../../environments/environment';

/** URL base da API .NET. Vem do environment (em produção, environment.production.ts via fileReplacements). */
export const API_BASE_URL = environment.apiUrl;
