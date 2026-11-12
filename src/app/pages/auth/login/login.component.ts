import { Component, inject, isDevMode, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { errorMessage } from '../../../core/utils/http-error';
import { roleLabel } from '../../../core/utils/role.utils';

interface DemoUser {
  initials: string;
  name: string;
  role: string;
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signals: o app é zoneless, então mensagens/estados precisam ser reativos para aparecer na tela.
  readonly showPassword = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  readonly roleLabel = roleLabel;

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  /**
   * Acesso rápido só em desenvolvimento, usando o admin criado pelo seed do backend
   * (Seed:Admin no appsettings.json). Os usuários fictícios antigos não existiam na API.
   */
  demoUsers: DemoUser[] = isDevMode()
    ? [{ initials: 'AD', name: 'Admin (seed)', role: 'Admin', email: 'admin@scrumretro.local', password: 'Admin@12345' }]
    : [];

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  fillDemoUser(user: DemoUser): void {
    this.loginForm.patchValue({ email: user.email, password: user.password });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    if (this.isSubmitting()) return;

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    const { email, password } = this.loginForm.getRawValue();
    this.authService.login({ email: email.trim(), password }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/projects']);
      },
      error: err => {
        this.isSubmitting.set(false);
        // 401 = credenciais inválidas; 403 = conta desativada; 0 = API fora do ar. A mensagem vem do backend.
        this.errorMessage.set(errorMessage(err, 'Não foi possível entrar. Tente novamente.'));
      }
    });
  }
}
