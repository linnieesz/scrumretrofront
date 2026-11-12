import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  template: `
    <div class="layout-wrapper">
      <app-header></app-header>
      <main class="layout-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .layout-wrapper {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: var(--color-bg, #F8D16D);
    }
    .layout-content {
      flex: 1;
    }
  `]
})
export class MainLayoutComponent {}
