import { Component, inject, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-inscription',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule],
  templateUrl: './inscription.component.html',
  styleUrls: ['./inscription.component.scss']
})
export class InscriptionComponent {
  showDocTypeDropdown = false;
  selectedFaculte: string = '';
  private elementRef = inject(ElementRef);
  private translate = inject(TranslateService);
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showDocTypeDropdown = false;
    }
  }

  toggleDocTypeDropdown(event: Event) {
    event.stopPropagation();
    this.showDocTypeDropdown = !this.showDocTypeDropdown;
  }

  selectDocType(type: string) {
    this.registrationForm.get('typeDocumentIdentite')?.setValue(type);
    this.showDocTypeDropdown = false;
  }

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registrationForm: FormGroup;

  get civilites() {
    return [
      { value: 'M', label: this.translate.instant('INSCRIPTION.CIVILITE_OPTS.M') },
      { value: 'Mme', label: this.translate.instant('INSCRIPTION.CIVILITE_OPTS.MME') }
    ];
  }

  get facultes() {
    return [
      { value: 'tunis', label: this.translate.instant('INSCRIPTION.FACULTES.TUNIS') },
      { value: 'sfax', label: this.translate.instant('INSCRIPTION.FACULTES.SFAX') },
      { value: 'sousse', label: this.translate.instant('INSCRIPTION.FACULTES.SOUSSE') },
      { value: 'monastir', label: this.translate.instant('INSCRIPTION.FACULTES.MONASTIR') },
      { value: 'etranger', label: this.translate.instant('INSCRIPTION.FACULTES.ETRANGER') }
    ];
  }

  showPassword = false;
  showConfirm = false;

  // Validateur personnalisé pour la force du mot de passe
  private passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.value;

    if (!password) {
      return null;
    }

    const errors: any = {};

    // Minimum 8 caractères
    if (password.length < 8) {
      errors['minLength'] = true;
    }

    // Au moins une lettre majuscule
    if (!/[A-Z]/.test(password)) {
      errors['uppercase'] = true;
    }

    // Au moins une lettre minuscule
    if (!/[a-z]/.test(password)) {
      errors['lowercase'] = true;
    }

    // Au moins un chiffre
    if (!/[0-9]/.test(password)) {
      errors['number'] = true;
    }

    // Au moins un caractère spécial
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors['special'] = true;
    }

    return Object.keys(errors).length ? errors : null;
  }

  constructor() {
    this.registrationForm = this.fb.group({
      civilite: ['', Validators.required],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      dateNaissance: ['', Validators.required],
      lieuNaissance: ['', Validators.required],
      nationalite: ['', Validators.required],
      adresse: ['', Validators.required],
      typeDocumentIdentite: ['', Validators.required],
      cin: [{ value: '', disabled: true }, Validators.required],
      telephone: ['', [Validators.required, Validators.pattern(/^[24579][0-9]{7}$/)]],
      email: ['', [Validators.required, Validators.email]],
      faculte: ['', Validators.required],
      password: ['', [Validators.required, this.passwordStrengthValidator.bind(this)]],
      confirmPassword: ['', Validators.required]
    }, { validators: [this.passwordMatchValidator, this.ageValidator] });
    
    this.registrationForm.get('typeDocumentIdentite')?.valueChanges.subscribe(type => {
      const cinControl = this.registrationForm.get('cin');
      if (type) {
        cinControl?.enable();
        if (type === 'PASSEPORT') {
          cinControl?.setValidators([Validators.required, Validators.minLength(6)]);
        } else {
          cinControl?.setValidators([Validators.required, Validators.pattern(/^[0-9]{8}$/)]);
        }
      } else {
        cinControl?.disable();
      }
      cinControl?.updateValueAndValidity();
    });

    this.registrationForm.get('faculte')?.valueChanges.subscribe(value => {
      this.selectedFaculte = value || '';
    });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ ...confirmPassword.errors, passwordMismatch: true });
      return { passwordMismatch: true };
    } else if (confirmPassword && confirmPassword.hasError('passwordMismatch')) {
      const errors = confirmPassword.errors;
      if (errors) {
        delete errors['passwordMismatch'];
        confirmPassword.setErrors(Object.keys(errors).length ? errors : null);
      }
    }
    return null;
  }

  ageValidator(control: AbstractControl): ValidationErrors | null {
    const dateNaissance = control.get('dateNaissance')?.value;
    if (!dateNaissance) return null;
    
    const today = new Date();
    const birth = new Date(dateNaissance);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    if (age < 19) {
      control.get('dateNaissance')?.setErrors({ underAge: true });
      return { underAge: true };
    }
    return null;
  }

  togglePassword() { this.showPassword = !this.showPassword; }
  toggleConfirm() { this.showConfirm = !this.showConfirm; }

  trackByFaculte(index: number, item: any) {
    return item.value;
  }

  onSubmit() {
    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    const formValues = this.registrationForm.value;
    const candidat = {
      email: formValues.email,
      motDePasse: formValues.password,
      civilite: formValues.civilite,
      nom: formValues.nom,
      prenom: formValues.prenom,
      dateNaissance: formValues.dateNaissance,
      lieuNaissance: formValues.lieuNaissance,
      nationalite: formValues.nationalite,
      adresse: formValues.adresse,
      typeDocumentIdentite: formValues.typeDocumentIdentite,
      cin: formValues.cin,
      telephone: formValues.telephone,
      faculte: formValues.faculte
    };

    this.authService.register(candidat).subscribe({
      next: (response) => {
        Swal.fire({
          title: this.translate.instant('INSCRIPTION.ALERTS.SUCCESS_TITLE'),
          text: this.translate.instant('INSCRIPTION.ALERTS.SUCCESS_TEXT'),
          icon: 'success',
          confirmButtonColor: '#14b8a6',
          confirmButtonText: this.translate.instant('INSCRIPTION.ALERTS.SUCCESS_BTN'),
          heightAuto: false
        }).then(() => {
          this.router.navigate(['/connexion']);
        });
      },
      error: (err) => {
        const errorMsg = typeof err.error === 'string' ? err.error : this.translate.instant('INSCRIPTION.ALERTS.ERR_TEXT_DEFAULT');

        Swal.fire({
          title: this.translate.instant('INSCRIPTION.ALERTS.ERR_TITLE'),
          text: errorMsg,
          icon: 'error',
          confirmButtonColor: '#ff4d4f',
          confirmButtonText: this.translate.instant('INSCRIPTION.ALERTS.ERR_RETRY'),
          heightAuto: false
        });
      }
    });
  }
}