import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-connexion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule],
  templateUrl: './connexion.component.html',
  styleUrls: ['./connexion.component.scss']
})
export class ConnexionComponent {

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  loginForm: FormGroup;
  showPassword = false;

  constructor() {
    this.loginForm = this.fb.group({
      cin: ['', [Validators.required, Validators.minLength(6)]],
      password: ['', [Validators.required]]
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { cin, password } = this.loginForm.value;

    const credentials = {
      email: cin,
      motDePasse: password
    };

    this.authService.login(credentials).subscribe({
      next: (res) => {
        if (res.role === 'ADMIN') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        const errorMsg = typeof err.error === 'string' ? err.error : this.translate.instant('CONNEXION.ALERTS.LOGIN_ERROR_TEXT');

        Swal.fire({
          title: this.translate.instant('CONNEXION.ALERTS.LOGIN_ERROR_TITLE'),
          text: errorMsg,
          icon: 'error',
          confirmButtonColor: '#ff4d4f',
          confirmButtonText: this.translate.instant('CONNEXION.ALERTS.LOGIN_ERROR_RETRY'),
          heightAuto: false
        });
      }
    });
  }

  async forgotPassword() {
    const cin = this.loginForm.get('cin')?.value;

    if (!cin || cin.length < 6) {
      Swal.fire({
        title: this.translate.instant('CONNEXION.ALERTS.FORGOT_INFO_TITLE'),
        text: this.translate.instant('CONNEXION.ALERTS.FORGOT_INFO_TEXT'),
        icon: 'info',
        confirmButtonColor: '#0056b3',
        heightAuto: false
      });
      return;
    }

    let verifyHtml = this.translate.instant('CONNEXION.ALERTS.FORGOT_VERIFY_HTML');
    verifyHtml = verifyHtml.replace('{{cin}}', cin);

    const { value: email } = await Swal.fire({
      title: this.translate.instant('CONNEXION.ALERTS.FORGOT_VERIFY_TITLE'),
      html: verifyHtml,
      input: 'email',
      inputPlaceholder: 'votre-email@exemple.com',
      showCancelButton: true,
      confirmButtonText: this.translate.instant('CONNEXION.ALERTS.BTN_SEND'),
      cancelButtonText: this.translate.instant('CONNEXION.ALERTS.BTN_CANCEL'),
      confirmButtonColor: '#0056b3',
      heightAuto: false
    });

    if (email) {
      Swal.showLoading();
      this.authService.forgotPassword(cin, email).subscribe({
        next: () => {
          this.showResetCodeModal(email);
        },
        error: (err) => {
          const message = typeof err.error === 'string' ? err.error : (err.error?.message || this.translate.instant('CONNEXION.ALERTS.FORGOT_ERR_SEND'));
          Swal.fire({
            title: this.translate.instant('CONNEXION.ALERTS.LOGIN_ERROR_TITLE'),
            text: message,
            icon: 'error',
            confirmButtonColor: '#ff4d4f',
            heightAuto: false
          });
        }
      });
    }
  }

  private async showResetCodeModal(email: string) {
    const htmlContent = `
        <div style="padding: 0 10px;" dir="auto">
          <p style="font-size: 15px; color: #64748b; margin-bottom: 25px; text-align: center;">
            ${this.translate.instant('CONNEXION.ALERTS.RESET_HTML_1')}
            <span style="color: #1e3a8a; font-weight: 600;">${email}</span>
          </p>

          <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">${this.translate.instant('CONNEXION.ALERTS.RESET_HTML_2')}</label>
            <div style="position: relative;">
              <input id="swal-input-code" class="swal2-input" placeholder="000 000" maxlength="6" autocomplete="off" 
                style="margin: 0; width: 100%; border-radius: 12px; border: 1.5px solid #e2e8f0; height: 55px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 8px; color: #1e3a8a; background: #f8fafc;">
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">${this.translate.instant('CONNEXION.ALERTS.RESET_HTML_3')}</label>
            <input id="swal-input-password" type="password" class="swal2-input" placeholder="••••••••" autocomplete="new-password" 
              style="margin: 0; width: 100%; border-radius: 12px; border: 1.5px solid #e2e8f0; height: 50px; font-size: 16px; padding: 0 15px; background: #ffffff;">
          </div>

          <div style="margin-bottom: 5px;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">${this.translate.instant('CONNEXION.ALERTS.RESET_HTML_4')}</label>
            <input id="swal-input-confirm" type="password" class="swal2-input" placeholder="••••••••" autocomplete="new-password" 
              style="margin: 0; width: 100%; border-radius: 12px; border: 1.5px solid #e2e8f0; height: 50px; font-size: 16px; padding: 0 15px; background: #ffffff;">
          </div>
        </div>
      `;

    const { value: formValues } = await Swal.fire({
      title: `<h2 style="color: #1e3a8a; margin-top: 10px;">${this.translate.instant('CONNEXION.ALERTS.RESET_TITLE')}</h2>`,
      width: '550px',
      padding: '2rem',
      html: htmlContent,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: this.translate.instant('CONNEXION.ALERTS.BTN_UPDATE'),
      cancelButtonText: this.translate.instant('CONNEXION.ALERTS.BTN_CANCEL'),
      confirmButtonColor: '#1e3a8a',
      cancelButtonColor: '#94a3b8',
      heightAuto: false,
      customClass: {
        popup: 'premium-swal-popup',
        confirmButton: 'premium-confirm-btn',
        cancelButton: 'premium-cancel-btn'
      },
      preConfirm: () => {
        const code = (document.getElementById('swal-input-code') as HTMLInputElement).value;
        const newPassword = (document.getElementById('swal-input-password') as HTMLInputElement).value;
        const confirmPassword = (document.getElementById('swal-input-confirm') as HTMLInputElement).value;

        if (!code || !newPassword || !confirmPassword) {
          Swal.showValidationMessage(this.translate.instant('CONNEXION.ALERTS.VAL_ALL_REQ'));
          return false;
        }
        if (newPassword !== confirmPassword) {
          Swal.showValidationMessage(this.translate.instant('CONNEXION.ALERTS.VAL_MATCH'));
          return false;
        }
        if (code.length !== 6) {
          Swal.showValidationMessage(this.translate.instant('CONNEXION.ALERTS.VAL_CODE_LEN'));
          return false;
        }
        return { code, newPassword };
      }
    });

    if (formValues) {
      Swal.showLoading();
      this.authService.resetPassword({ email, ...formValues }).subscribe({
        next: (res) => {
          Swal.fire({
            title: this.translate.instant('CONNEXION.ALERTS.SUCCESS_TITLE'),
            text: this.translate.instant('CONNEXION.ALERTS.SUCCESS_TEXT'),
            icon: 'success',
            confirmButtonColor: '#1e3a8a',
            heightAuto: false
          });
        },
        error: (err) => {
          const message = typeof err.error === 'string' ? err.error : (err.error?.message || this.translate.instant('CONNEXION.ALERTS.ERR_INVALID_CODE'));
          Swal.fire({
            title: this.translate.instant('CONNEXION.ALERTS.LOGIN_ERROR_TITLE'),
            text: message,
            icon: 'error',
            confirmButtonColor: '#ef4444',
            heightAuto: false
          });
        }
      });
    }
  }
}