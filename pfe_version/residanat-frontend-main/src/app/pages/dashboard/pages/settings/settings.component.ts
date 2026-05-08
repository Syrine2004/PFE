import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { LanguageService } from '../../../../core/services/language.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PortalSettingsService } from '../../../../core/services/portal-settings.service';
import { TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  activeTab: 'profile' | 'security' | 'preferences' = 'profile';
  

  languageService = inject(LanguageService);
  private authService = inject(AuthService);
  private portalService = inject(PortalSettingsService);
  private fb = inject(FormBuilder);
  private translate = inject(TranslateService);

  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  portalForm!: FormGroup;
  minClosingDate: string = '';

  isAdmin = false;
  portalSettings: any = null;

  // Validateur pour vérifier que la date n'est pas dans le passé
  notPastDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const selectedDate = new Date(control.value);
    const now = new Date();
    if (selectedDate < now) {
      return { 'pastDate': true };
    }
    return null;
  }

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

  ngOnInit() {
    this.isAdmin = this.authService.getRole() === 'ADMIN';
    this.setMinClosingDate();
    this.initForms();
    this.loadUserProfile();
    if (this.isAdmin) {
      this.loadPortalSettings();
    }
  }

  private setMinClosingDate() {
    const now = new Date();
    // Format ISO datetime-local: YYYY-MM-DDTHH:mm
    this.minClosingDate = now.toISOString().slice(0, 16);
  }

  private loadPortalSettings() {
    this.portalService.getSettings().subscribe(settings => {
      this.portalSettings = settings;
      this.portalForm.patchValue({
        isClosed: settings.isClosed,
        closingDate: settings.closingDate,
        maintenanceMessage: settings.maintenanceMessage ||
          'Le portail des examens est désormais clôturé pour cette session. Merci pour votre participation.'
      });
    });
  }

  private initForms() {
    this.profileForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['']
    });

    this.passwordForm = this.fb.group({
      oldPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, this.passwordStrengthValidator.bind(this)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    this.portalForm = this.fb.group({
      isClosed: [false],
      closingDate: [null, this.notPastDateValidator.bind(this)],
      maintenanceMessage: ['', Validators.required]
    });
  }

  /** Auto-save quand le toggle ON/OFF change — sans popup */
  onPortalToggleChange(): void {
    const current = this.portalForm.value;
    // Force save with maintenanceMessage fallback
    const toSave = {
      ...current,
      maintenanceMessage: current.maintenanceMessage ||
        'Le portail des examens est désormais clôturé pour cette session. Merci pour votre participation.'
    };
    this.portalService.updateSettings(toSave).subscribe();
  }

  /** Save from the submit button — shows success popup */
  onUpdatePortalSettings() {
    const current = this.portalForm.value;
    const toSave = {
      ...current,
      maintenanceMessage: current.maintenanceMessage ||
        'Le portail des examens est désormais clôturé pour cette session. Merci pour votre participation.'
    };
    this.portalService.updateSettings(toSave).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('COMMON.SUCCESS'),
          text: 'Paramètres du portail mis à jour',
          timer: 2000,
          showConfirmButton: false
        });
      }
    });
  }

  private passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  loadUserProfile() {
    this.authService.getProfile().subscribe({
      next: (user) => {
        this.profileForm.patchValue(user);
      },
      error: (err) => console.error('Error loading profile', err)
    });
  }

  onUpdateProfile() {
    if (this.profileForm.valid) {
      this.authService.updateProfile(this.profileForm.value).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: this.translate.instant('COMMON.SUCCESS'),
            text: this.translate.instant('SETTINGS.PROFILE.SUCCESS'),
            timer: 2000,
            showConfirmButton: false
          });
        },
        error: (err) => {
          Swal.fire(this.translate.instant('COMMON.ERROR'), this.translate.instant('COMMON.ERROR_DESC'), 'error');
        }
      });
    }
  }

  onChangePassword() {
    if (this.passwordForm.valid) {
      const { oldPassword, newPassword } = this.passwordForm.value;
      this.authService.changePassword({ oldPassword, newPassword }).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: this.translate.instant('COMMON.SUCCESS'),
            text: this.translate.instant('SETTINGS.SECURITY.SUCCESS'),
            timer: 2000,
            showConfirmButton: false
          });
          this.passwordForm.reset();
        },
        error: (err) => {
          const errMsg = typeof err.error === 'string' ? err.error : this.translate.instant('COMMON.ERROR_DESC');
          Swal.fire(this.translate.instant('COMMON.ERROR'), errMsg, 'error');
        }
      });
    }
  }

  switchLanguage(lang: string) {
    this.languageService.setLanguage(lang);
  }


}
