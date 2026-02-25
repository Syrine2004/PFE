import { Component, inject } from '@angular/core'; // Utilisation de inject
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-connexion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './connexion.component.html',
  styleUrls: ['./connexion.component.scss']
})
export class ConnexionComponent {

  // 1. Injections modernes
  private authService = inject(AuthService);
  private router = inject(Router);

  // 2. Variables pour le formulaire
  email: string = '';
  password: string = ''; // Appelée 'password' ici pour ton HTML

  showPassword = false;

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  // 3. La fonction de connexion
  onSubmit() {
    if (!this.email || !this.password) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    // IMPORTANT : On envoie 'motDePasse' car c'est ce que ton AuthDto attend côté Spring Boot
    const credentials = {
      email: this.email,
      motDePasse: this.password
    };

    this.authService.login(credentials).subscribe({
      next: (res) => {
        console.log("Connexion réussie, rôle :", res.role);

        // La redirection se base sur le rôle exact renvoyé par le JWT
        if (res.role === 'ADMIN') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        console.error("Détails de l'erreur :", err);
        // On affiche le message du backend s'il existe, sinon message générique
        const errorMsg = typeof err.error === 'string' ? err.error : "Email ou mot de passe incorrect ou problème serveur.";
        alert(errorMsg);
      }
    });
  }
}