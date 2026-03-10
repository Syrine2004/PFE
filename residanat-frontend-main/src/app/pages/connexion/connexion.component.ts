import { Component, inject } from '@angular/core'; // Utilisation de inject
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-connexion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './connexion.component.html',
  styleUrls: ['./connexion.component.scss']
})
export class ConnexionComponent {

  // 1. Injections modernes
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // 2. Variables pour le formulaire
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

  // 3. La fonction de connexion
  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { cin, password } = this.loginForm.value;

    // IMPORTANT : On envoie 'email' (ou le champ identifiant attendu par ton API) 
    // Si ton backend attend "cin", change la clé "email" ci-dessous par "cin".
    const credentials = {
      email: cin,
      motDePasse: password
    };

    this.authService.login(credentials).subscribe({
      next: (res) => {
        console.log("Connexion réussie, rôle :", res.role);
        if (res.role === 'ADMIN') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        console.error("Détails de l'erreur :", err);
        const errorMsg = typeof err.error === 'string' ? err.error : "CIN ou mot de passe incorrect ou problème serveur.";

        Swal.fire({
          title: 'Erreur',
          text: errorMsg,
          icon: 'error',
          confirmButtonColor: '#ff4d4f',
          confirmButtonText: 'Réessayer',
          heightAuto: false
        });
      }
    });
  }
}