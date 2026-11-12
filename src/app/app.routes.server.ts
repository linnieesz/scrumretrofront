import { RenderMode, ServerRoute } from '@angular/ssr';

// O app é autenticado via localStorage + rotas parametrizadas (projects/:id): não há o que pré-renderizar.
// Renderizar no cliente evita erro de prerender (falta getPrerenderParams) e hydration mismatch.
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
