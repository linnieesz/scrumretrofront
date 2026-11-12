import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { parseHttpError } from '../../../core/utils/http-error';
import { initialsOf } from '../../../core/utils/role.utils';
import { CompanyOption, RegisterRequest, RoleOption, UserRole } from '../../../models';

/** Tipos exibidos enquanto /api/auth/roles não responde (ou se falhar). Admin nunca é aceito no cadastro público. */
const FALLBACK_ROLES: RoleOption[] = [
  { value: 'Member', label: 'Membro', description: 'Participa das cerimônias e preenche seus cards', allowedOnRegistration: true },
  { value: 'Manager', label: 'Manager', description: 'Facilita sprints e gerencia a equipe', allowedOnRegistration: true }
];

const ROLE_ICONS: Record<UserRole, string> = { Member: '👤', Manager: '🧭', Admin: '⚡' };

// Mesmas regras do backend (InputRules): telefone e senha (8-100, letras e números).
const PHONE_PATTERN = /^[0-9\s()+\-.]{8,30}$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,100}$/;

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  readonly currentStep = signal(1);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly roles = signal<RoleOption[]>(FALLBACK_ROLES);
  readonly companies = signal<CompanyOption[]>([]);
  readonly companiesLoaded = signal(false);
  readonly roleIcons = ROLE_ICONS;

  registerForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    companyId: ['', [Validators.required]],
    department: ['', [Validators.maxLength(100)]],
    phone: ['', [Validators.pattern(PHONE_PATTERN)]],
    bio: ['', [Validators.maxLength(500)]],
    role: ['Member' as Exclude<UserRole, 'Admin'>, [Validators.required]],
    password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordsMatch });

  ngOnInit(): void {
    // Picker de empresa: lista as empresas ativas conforme o Admin as cria.
    this.authService.getCompanies().subscribe({
      next: list => {
        this.companies.set(list);
        this.companiesLoaded.set(true);
      },
      error: () => this.companiesLoaded.set(true)
    });

    // Tipos de acesso vêm da API; o backend informa quais podem ser escolhidos no cadastro público.
    this.authService.getRoles().subscribe({
      next: options => {
        const allowed = options.filter(o => o.allowedOnRegistration);
        if (allowed.length > 0) {
          this.roles.set(allowed);
          const current = this.registerForm.controls.role.value;
          if (!allowed.some(o => o.value === current)) {
            this.registerForm.controls.role.setValue(allowed[0].value as Exclude<UserRole, 'Admin'>);
          }
        }
      },
      error: () => { /* mantém os tipos padrão; o backend valida de qualquer forma */ }
    });
  }

  get initials(): string {
    return initialsOf(this.registerForm.controls.fullName.value) || 'U';
  }

  get firstName(): string {
    const name = this.registerForm.controls.fullName.value.trim();
    return name ? name.split(/\s+/)[0] : 'Usuário';
  }

  get roleDisplayName(): string {
    const role = this.registerForm.controls.role.value;
    return this.roles().find(r => r.value === role)?.label ?? role;
  }

  fieldInvalid(name: string): boolean {
    const c = this.registerForm.get(name);
    return !!c && c.invalid && c.touched;
  }

  goToStep2(): void {
    const { fullName, email, companyId, department, phone, bio, role } = this.registerForm.controls;
    const step1 = [fullName, email, companyId, department, phone, bio, role];
    if (step1.every(c => c.valid)) {
      this.errorMessage.set('');
      this.currentStep.set(2);
    } else {
      step1.forEach(c => c.markAsTouched());
    }
  }

  prevStep(): void {
    this.currentStep.set(1);
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    if (this.isSubmitting()) return;

    const v = this.registerForm.getRawValue();
    const payload: RegisterRequest = {
      fullName: v.fullName.trim(),
      email: v.email.trim(),
      department: v.department.trim() || null,
      phone: v.phone.trim() || null,
      bio: v.bio.trim() || null,
      role: v.role,
      companyId: v.companyId,
      password: v.password
    };

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    // O AuthService já guarda token + usuário ao concluir o cadastro (a API devolve o JWT).
    this.authService.register(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/projects']);
      },
      error: err => {
        this.isSubmitting.set(false);
        const parsed = parseHttpError(err, 'Não foi possível criar a conta. Verifique os dados.');
        this.errorMessage.set(parsed.message);
        // Erro em campo do passo 1 (ex.: e-mail já cadastrado): volta para corrigir.
        const step1Fields = ['fullName', 'email', 'companyId', 'department', 'phone', 'bio', 'role'];
        if (parsed.status === 409 || Object.keys(parsed.fieldErrors).some(f => step1Fields.includes(f))) {
          this.currentStep.set(1);
        }
      }
    });
  }
}
