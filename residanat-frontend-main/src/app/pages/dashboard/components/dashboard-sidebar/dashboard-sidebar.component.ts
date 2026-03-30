import { Component, inject } from '@angular/core'; // Nettoyé Input, Output, EventEmitter
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { SidebarService } from '../../../../core/services/sidebar.service';
import { DossierService } from '../../../../core/services/dossier.service';
import { ConcoursService } from '../../../../core/services/concours.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import Swal from 'sweetalert2';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-sidebar.component.html',
  styleUrl: './dashboard-sidebar.component.scss'
})
export class DashboardSidebarComponent {
  // 1. Injection du service d'authentification et SidebarService
  private authService = inject(AuthService);
  private sidebarService = inject(SidebarService);
  private dossierService = inject(DossierService);
  private concoursService = inject(ConcoursService);

  get collapsed() { return this.sidebarService.isCollapsed; }
  mobileOpen = false;

  userRole: string = '';
  userName: string = '';
  userEmail: string = '';
  hasDossier: boolean = false;
  dossierStatus: string | null = null;

  ngOnInit() {
    this.userRole = sessionStorage.getItem('role') || '';
    
    // Charger le profil pour les infos d'affichage (nom, email)
    this.authService.getProfile().subscribe({
      next: (profile) => {
        if (profile) {
          this.userName = `${profile.prenom || ''} ${profile.nom || ''}`.trim() || 'Utilisateur';
          this.userEmail = profile.email || '';
          
          if (this.userRole !== 'ADMIN') {
            this.checkUserDossier(profile.id);
          }
        }
      },
      error: (err) => {
        console.error('Erreur profil sidebar', err);
        this.userName = 'Utilisateur';
      }
    });
  }

  private checkUserDossier(candidatId?: number) {
    if (!candidatId) {
      this.hasDossier = false;
      this.dossierStatus = null;
      return;
    }

    this.concoursService.getConcours(0, 100, undefined, undefined, 'PUBLIE').subscribe({
      next: (response) => {
        const concoursIds = (response.content || [])
          .map(c => c.id)
          .filter((id): id is string => !!id);

        if (concoursIds.length === 0) {
          this.hasDossier = false;
          this.dossierStatus = null;
          return;
        }

        const checks = concoursIds.map(concoursId =>
          this.dossierService.getDossierByCandidat(candidatId, concoursId).pipe(
            catchError(() => of(null))
          )
        );

        forkJoin(checks)
          .pipe(
            map(results => results.find(d => !!d) || null)
          )
          .subscribe(found => {
            this.hasDossier = !!found;
            this.dossierStatus = found?.statut || null;
          });
      },
      error: () => {
        this.hasDossier = false;
        this.dossierStatus = null;
      }
    });
  }

  canModifyDossier(): boolean {
    return this.dossierStatus === 'EN_ATTENTE' || this.dossierStatus === 'REJETE';
  }

  getInscriptionLabel(): string {
    return this.hasDossier && this.canModifyDossier() ? 'Modifier dossier' : 'Inscription au concours';
  }

  getCandidatId() {
    const token = sessionStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || '';
      } catch (e) {
        return '';
      }
    }
    return '';
  }

  navItems: NavItem[] = [
    { href: '/', label: 'Accueil Site', icon: 'home' },
    { href: '/dashboard/home', label: 'Tableau de bord', icon: 'layout-dashboard' },
    // Section MA CANDIDATURE
    { href: '/dashboard/creer-dossier', label: 'Inscription au concours', icon: 'file-plus' },
    { href: '/dashboard/dossier', label: 'Consulter mon dossier', icon: 'folder-open' },
    // Section SERVICES
    { href: '/dashboard/specialites', label: 'Spécialités', icon: 'stethoscope' },
    { href: '/dashboard/centre-3d', label: 'Visualisation 3D', icon: 'map-pin' },
    { href: '/dashboard/convocation', label: 'Convocation', icon: 'file-text' },
    { href: '/dashboard/resultat', label: 'Résultats', icon: 'bar-chart-3' },
    { href: '/dashboard/reclamation', label: 'Réclamation', icon: 'message-circle' },
    { href: '/dashboard/parametres', label: 'Paramètres', icon: 'settings' },
  ];

  adminNavItems: NavItem[] = [
    { href: '/', label: 'Accueil Site', icon: 'home' },
    { href: '/dashboard/home', label: 'Tableau de bord', icon: 'layout-dashboard' },
    { href: '/dashboard/candidats', label: 'Candidats', icon: 'users' },
    { href: '/dashboard/specialites', label: 'Spécialités', icon: 'stethoscope' },
    { href: '/dashboard/parametres', label: 'Paramètres', icon: 'settings' },
  ];

  get currentNavItems() {
    return this.userRole === 'ADMIN' ? this.adminNavItems : this.navItems;
  }

  toggleSidebar() {
    this.sidebarService.toggleCollapsed();
  }

  toggleMobile() {
    this.mobileOpen = !this.mobileOpen;
  }

  closeMobile() {
    this.mobileOpen = false;
  }

  onMockClick(event: Event, label: string) {
    event.preventDefault();
    console.log(`Mock click for ${label}`);
  }

  // 2. Méthode de déconnexion sécurisée pour le candidat
  onLogout() {
    Swal.fire({
      title: 'Déconnexion',
      text: 'Voulez-vous vraiment vous déconnecter de votre espace candidat ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#007bff', // Bleu
      cancelButtonColor: '#64748b',   // Slate
      confirmButtonText: 'Oui, me déconnecter',
      cancelButtonText: 'Annuler',
      heightAuto: false,
      customClass: {
        popup: 'rounded-20'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.logout();
      }
    });
  }
}