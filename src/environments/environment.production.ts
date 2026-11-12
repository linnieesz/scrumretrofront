// Produção: substitui environment.ts via fileReplacements (angular.json -> configurations.production).
// Troque o placeholder pela URL real do backend no Render (sem barra final, terminando em /api).
export const environment = {
  production: true,
  apiUrl: 'https://SEU-APP.onrender.com/api'
};
