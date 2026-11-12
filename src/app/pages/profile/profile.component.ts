import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { ProjectService } from '../../core/services/projects.service';
import { errorMessage } from '../../core/utils/http-error';
import { initialsOf, roleLabel } from '../../core/utils/role.utils';
import { ProjectResponse, UserResponse } from '../../models';

interface Feedback {
  type: 'success' | 'error';
  text: string;
}

// Mesmas regras do backend.
const PHONE_PATTERN = /^[0-9\s()+\-.]{8,30}$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,100}$/;

function newPasswordsMatch(group: AbstractControl): ValidationErrors | null {
  const a = group.get('newPassword')?.value;
  const b = group.get('confirmPassword')?.value;
  return a && b && a !== b ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private projectService = inject(ProjectService);

  // Estado em signals (app zoneless): dispensa o ChangeDetectorRef.detectChanges() que existia antes.
  readonly user = signal<UserResponse | null>(this.authService.getCurrentUser());
  readonly projects = signal<ProjectResponse[]>([]);
  readonly isLoading = signal(true);
  readonly isSavingProfile = signal(false);
  readonly isSavingPassword = signal(false);
  readonly isEditingProfile = signal(false);
  readonly profileFeedback = signal<Feedback | null>(null);
  readonly passwordFeedback = signal<Feedback | null>(null);
  readonly loadError = signal('');

  readonly showCurrentPassword = signal(false);
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  /** Dados prontos para exibição (valores ausentes viram texto neutro, nunca dados fictícios). */
  readonly view = computed(() => {
    const u = this.user();
    const created = u ? new Date(u.createdAt) : null;
    return {
      initials: initialsOf(u?.fullName),
      name: u?.fullName ?? '',
      email: u?.email ?? '',
      role: roleLabel(u?.role),
      company: u?.companyName || 'Não vinculada',
      department: u?.department || 'Não informado',
      phone: u?.phone || 'Não informado',
      bio: u?.bio || 'Sem bio.',
      memberSince: created && !isNaN(created.getTime())
        ? created.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : ''
    };
  });

  profileForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    department: ['', [Validators.maxLength(100)]],
    phone: ['', [Validators.pattern(PHONE_PATTERN)]],
    bio: ['', [Validators.maxLength(500)]]
  });

  passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: newPasswordsMatch });

  ngOnInit(): void {
    this.patchForm();
    this.loadUserProfile();
    this.loadProjects();
  }

  private loadUserProfile(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.userService.getProfile().subscribe({
      next: profile => {
        this.user.set(profile);
        this.authService.setSessionUser(profile); // mantém o header sincronizado
        if (!this.isEditingProfile()) this.patchForm();
        this.isLoading.set(false);
      },
      error: err => {
        // 401 já é tratado pelo interceptor (logout + login).
        this.loadError.set(errorMessage(err, 'Não foi possível carregar o perfil.'));
        this.isLoading.set(false);
      }
    });
  }

  private loadProjects(): void {
    this.projectService.getProjects(true).subscribe({
      next: list => this.projects.set(list ?? []),
      error: () => this.projects.set([])
    });
  }

  private patchForm(): void {
    const u = this.user();
    this.profileForm.reset({
      name: u?.fullName ?? '',
      email: u?.email ?? '',
      department: u?.department ?? '',
      phone: u?.phone ?? '',
      bio: u?.bio ?? ''
    });
  }

  toggleEditProfile(): void {
    this.isEditingProfile.update(v => !v);
    this.profileFeedback.set(null);
    if (!this.isEditingProfile()) this.patchForm();
  }

  onSaveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    if (this.isSavingProfile()) return;

    const v = this.profileForm.getRawValue();
    this.isSavingProfile.set(true);
    this.profileFeedback.set(null);

    // UpdateProfileRequest exige fullName E email (antes o e-mail não era enviado e a API respondia 400).
    this.userService.updateProfile({
      fullName: v.name.trim(),
      email: v.email.trim(),
      department: v.department.trim() || null,
      phone: v.phone.trim() || null,
      bio: v.bio.trim() || null
    }).subscribe({
      next: updated => {
        this.user.set(updated);
        this.authService.setSessionUser(updated);
        this.isEditingProfile.set(false);
        this.isSavingProfile.set(false);
        this.profileFeedback.set({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      },
      error: err => {
        this.isSavingProfile.set(false);
        this.profileFeedback.set({ type: 'error', text: errorMessage(err, 'Ocorreu um erro ao salvar as alterações.') });
      }
    });
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    if (this.isSavingPassword()) return;

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.isSavingPassword.set(true);
    this.passwordFeedback.set(null);

    this.userService.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.isSavingPassword.set(false);
        this.passwordForm.reset();
        this.passwordFeedback.set({ type: 'success', text: 'Senha alterada com sucesso!' });
      },
      error: err => {
        this.isSavingPassword.set(false);
        this.passwordFeedback.set({ type: 'error', text: errorMessage(err, 'Erro ao alterar a senha.') });
      }
    });
  }
}
