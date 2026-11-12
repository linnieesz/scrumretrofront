import { Routes } from '@angular/router';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';
import { roleGuard } from './core/guards/role.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'register',
        loadComponent: () => import('./pages/auth/register/register.component').then(m => m.RegisterComponent)
    },

    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [authGuard],
        children: [
            { path: '', redirectTo: 'projects', pathMatch: 'full' },
            {
                path: 'projects',
                loadComponent: () =>
                    import('./pages/projects/projects.component').then(m => m.ProjectsComponent)
            },
            // Precisa vir ANTES de 'projects/:id', senão "new" é lido como id de projeto.
            {
                path: 'projects/new',
                loadComponent: () =>
                    import('./pages/project-form/project-form.component').then(m => m.ProjectFormComponent),
                canActivate: [roleGuard],
                data: { roles: ['Admin', 'Manager'] }
            },
            {
                path: 'projects/:id/edit',
                loadComponent: () =>
                    import('./pages/project-form/project-form.component').then(m => m.ProjectFormComponent),
                canActivate: [roleGuard],
                data: { roles: ['Admin', 'Manager'] }
            },
            {
                path: 'projects/:id',
                loadComponent: () =>
                    import('./pages/project-detail/project-detail.component').then(m => m.ProjectDetailComponent)
            },
            {
                path: 'projects/:id/retro',
                loadComponent: () =>
                    import('./pages/retro-form/retro-form.component').then(m => m.RetroFormComponent)
            },
            {
                path: 'projects/:id/live-board',
                loadComponent: () =>
                    import('./pages/live-board/live-board.component').then(m => m.LiveBoardComponent)
            },
            {
                path: 'companies',
                loadComponent: () =>
                    import('./pages/companies/companies.component').then(m => m.CompaniesComponent),
                canActivate: [roleGuard],
                data: { roles: ['Admin'] }
            },
            {
                path: 'profile',
                loadComponent: () =>
                    import('./pages/profile/profile.component').then(m => m.ProfileComponent)
            },
            {
                path: 'projects/:id/team',
                loadComponent: () =>
                    import('./pages/manage-team/manage-team.component').then(m => m.ManageTeamComponent),
                canActivate: [roleGuard],
                data: { roles: ['Admin', 'Manager'] }
            }
        ]
    },

    // Rota desconhecida: volta à raiz (o authGuard decide entre projetos e login).
    { path: '**', redirectTo: '' }
];
