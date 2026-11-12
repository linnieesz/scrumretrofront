import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CompanyService } from '../../core/services/companies.service';
import { formatCnpj, isValidCnpj } from '../../core/utils/cnpj';
import { errorMessage, parseHttpError } from '../../core/utils/http-error';
import { CompanyResponse } from '../../models';

function cnpjValidator(control: AbstractControl): ValidationErrors | null {
  return !control.value || isValidCnpj(control.value) ? null : { cnpj: true };
}

/** Somente Admin (rota protegida pelo roleGuard): cria empresas e ativa/inativa. */
@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './companies.component.html',
  styleUrls: ['./companies.component.css']
})
export class CompaniesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private companyService = inject(CompanyService);

  readonly formatCnpj = formatCnpj;

  readonly companies = signal<CompanyResponse[]>([]);
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly busyId = signal<string | null>(null);
  readonly errorMessage = signal('');
  readonly formError = signal('');
  readonly showForm = signal(false);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    legalName: ['', [Validators.maxLength(200)]],
    cnpj: ['', [Validators.required, cnpjValidator]]
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.companyService.list().subscribe({
      next: list => {
        this.companies.set(list);
        this.isLoading.set(false);
      },
      error: err => {
        this.errorMessage.set(errorMessage(err, 'Não foi possível carregar as empresas.'));
        this.isLoading.set(false);
      }
    });
  }

  toggleForm(): void {
    this.showForm.update(v => !v);
    this.formError.set('');
  }

  fieldInvalid(name: 'name' | 'legalName' | 'cnpj'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.isSubmitting()) return;

    const v = this.form.getRawValue();
    this.isSubmitting.set(true);
    this.formError.set('');

    this.companyService.create({
      name: v.name.trim(),
      legalName: v.legalName.trim() || null,
      cnpj: v.cnpj.trim()
    }).subscribe({
      next: company => {
        this.companies.update(list => [...list, company].sort((a, b) => a.name.localeCompare(b.name)));
        this.form.reset();
        this.showForm.set(false);
        this.isSubmitting.set(false);
      },
      error: err => {
        this.isSubmitting.set(false);
        this.formError.set(parseHttpError(err, 'Não foi possível criar a empresa.').message);
      }
    });
  }

  toggleActive(company: CompanyResponse): void {
    this.busyId.set(company.id);
    this.errorMessage.set('');
    this.companyService.update(company.id, {
      name: company.name,
      legalName: company.legalName,
      cnpj: company.cnpj,
      isActive: !company.isActive
    }).subscribe({
      next: updated => {
        this.companies.update(list => list.map(c => (c.id === updated.id ? updated : c)));
        this.busyId.set(null);
      },
      error: err => {
        this.busyId.set(null);
        this.errorMessage.set(errorMessage(err, 'Não foi possível atualizar a empresa.'));
      }
    });
  }
}
