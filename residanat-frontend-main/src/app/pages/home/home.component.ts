import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private sub = new Subscription();
  isLoggedIn = signal(false);

  ngOnInit() {
    this.sub = this.authService.isLoggedIn$.subscribe(loggedIn => {
      this.isLoggedIn.set(loggedIn);
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  slideUrl(n: number): string {
    const ext = n === 3 ? 'jpg' : 'png';
    return `url('assets/images/hero-${n}.${ext}')`;
  }

  readonly flashItems = [
    { date: '15 Mars 2026', title: 'Ouverture des inscriptions en ligne', urgent: true },
    { date: '30 Avril 2026', title: 'Date limite de depot des dossiers', urgent: true },
    { date: '15 Juin 2026', title: 'Publication des convocations', urgent: false },
    { date: '01 Juillet 2026', title: 'Date du concours national', urgent: false },
  ];

  readonly features = [
    {
      icon: 'book-open',
      title: 'Concours unifie',
      description: 'Un concours national unique garantissant equite et transparence pour tous les candidats medecins.',
      gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(35, 137, 168, 0.1) 100%)'
    },
    {
      icon: 'users',
      title: '48 Specialites',
      description: 'Large choix de specialites medicales et chirurgicales reparties sur differentes durees de formation.',
      gradient: 'linear-gradient(135deg, rgba(35, 137, 168, 0.1) 0%, rgba(14, 165, 233, 0.1) 100%)'
    },
    {
      icon: 'award',
      title: 'Excellence academique',
      description: 'Formation de qualite assuree par les meilleurs colleges de specialites et CHU du pays.',
      gradient: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(35, 137, 168, 0.1) 100%)'
    },
    {
      icon: 'building',
      title: '4 Facultes partenaires',
      description: 'Tunis, Sfax, Sousse et Monastir contribuent a la formation des futurs specialistes.',
      gradient: 'linear-gradient(135deg, rgba(35, 137, 168, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)'
    }
  ];

  readonly steps = [
    { number: '01', title: 'Inscription', description: 'Creez votre compte et remplissez le formulaire d\'inscription en ligne.', icon: 'clipboard' },
    { number: '02', title: 'Depot du dossier', description: 'Telechargez vos documents et soumettez votre dossier pour validation.', icon: 'file-check' },
    { number: '03', title: 'Convocation', description: 'Telechargez votre convocation avec QR code de verification.', icon: 'calendar-check' },
    { number: '04', title: 'Resultats', description: 'Consultez vos notes, classement et statut d\'admission.', icon: 'bar-chart' },
    { number: '05', title: 'Reclamation', description: 'Deposez une reclamation si necessaire et suivez son traitement.', icon: 'message-circle' }
  ];

  readonly stats = [
    { value: '25+', label: 'Annees d\'experience' },
    { value: '48', label: 'Specialites disponibles' },
    { value: '1,250', label: 'Postes ouverts / an' },
    { value: '15,000+', label: 'Candidats / an' }
  ];
}
