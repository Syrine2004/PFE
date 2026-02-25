import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-inscription',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './inscription.component.html',
  styleUrls: ['./inscription.component.scss']
})
export class InscriptionComponent {

  private authService = inject(AuthService);
  private router = inject(Router);

  // --- DONNÉES DU FORMULAIRE ---
  civilite: string = '';
  civilites = [
    { value: 'M', label: 'Monsieur' },
    { value: 'Mme', label: 'Madame' }
  ];
  nom: string = '';
  prenom: string = '';
  dateNaissance: string = '';
  lieuNaissance: string = '';
  nationalite: string = '';
  adresse: string = '';
  cin: string = '';
  telephone: string = '';
  email: string = '';
  faculte: string = '';
  facultes = [
    { value: 'tunis', label: 'Faculté de Médecine de Tunis' },
    { value: 'sfax', label: 'Faculté de Médecine de Sfax' },
    { value: 'sousse', label: 'Faculté de Médecine de Sousse' },
    { value: 'monastir', label: 'Faculté de Médecine de Monastir' },
    { value: 'etranger', label: 'Faculté Étrangère' }
  ];

  password: string = '';
  confirmPassword: string = '';
  showPassword = false;
  showConfirm = false;

  togglePassword() { this.showPassword = !this.showPassword; }
  toggleConfirm() { this.showConfirm = !this.showConfirm; }

  // --- FONCTION D'INSCRIPTION FIXÉE ---
  onSubmit() {
    if (this.password !== this.confirmPassword) {
      alert("Erreur : Les mots de passe ne correspondent pas !");
      return;
    }

    // FIX : On prépare l'objet COMPLET pour Spring Boot
    // Les clés doivent correspondre EXACTEMENT à ton AuthDto Java
    const candidat = {
      email: this.email,
      motDePasse: this.password,
      civilite: this.civilite,
      nom: this.nom,
      prenom: this.prenom,
      dateNaissance: this.dateNaissance,
      lieuNaissance: this.lieuNaissance,
      nationalite: this.nationalite,
      adresse: this.adresse,
      cin: this.cin,
      telephone: this.telephone,
      faculte: this.faculte
    };

    // On envoie maintenant le dossier complet
    this.authService.register(candidat).subscribe({
      next: (response) => {
        alert("Inscription réussie ! Bienvenue sur Résidanat TN.");
        this.router.navigate(['/connexion']);
      },
      error: (err) => {
        console.error("Erreur d'inscription :", err);
        // On affiche le message exact renvoyé par le backend (ex: "CIN déjà utilisé")
        const errorMsg = typeof err.error === 'string' ? err.error : "Vérifiez vos informations ou le serveur est injoignable.";
        alert("Erreur : " + errorMsg);
      }
    });
  }
}