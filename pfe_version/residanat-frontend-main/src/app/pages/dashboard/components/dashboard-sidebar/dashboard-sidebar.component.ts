import { Component, inject } from '@angular/core'; // Nettoyé Input, Output, EventEmitter
import { LanguageService } from '../../../../core/services/language.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../../core/services/auth.service';
import { SidebarService } from '../../../../core/services/sidebar.service';
import { DossierService } from '../../../../core/services/dossier.service';
import { ConcoursService } from '../../../../core/services/concours.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './dashboard-sidebar.component.html',
  styleUrl: './dashboard-sidebar.component.scss'
})
export class DashboardSidebarComponent {
  // 1. Injection du service d'authentification et SidebarService
  private authService = inject(AuthService);
  private sidebarService = inject(SidebarService);
  private dossierService = inject(DossierService);
  private concoursService = inject(ConcoursService);

  // Injection du service de langue
  languageService = inject(LanguageService);
  private translate = inject(TranslateService);
  private langChangeSub?: Subscription;

  get collapsed() { return this.sidebarService.isCollapsed; }
  mobileOpen = false;

  userRole: string = '';
  userName: string = '';
  userEmail: string = '';
  hasDossier: boolean = false;
  dossierStatus: string | null = null;
  
  private destroy$ = new Subject<void>();
  private currentCandidatId: number | null = null;
  selectedConcoursId: string | null = null;

  ngOnInit() {
    this.initNavItems();
    this.langChangeSub = this.translate.onLangChange.subscribe(() => this.initNavItems());
    this.userRole = sessionStorage.getItem('role') || '';
    
    // Charger le profil pour les infos d'affichage (nom, email)
    this.authService.getProfile().subscribe({
      next: (profile) => {
        if (profile) {
          this.userName = `${profile.prenom || ''} ${profile.nom || ''}`.trim() || 'Utilisateur';
          this.userEmail = profile.email || '';
          this.currentCandidatId = profile.id;
          
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

    // Écouter les mises à jour réactives du dossier
    this.dossierService.dossierUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.currentCandidatId && this.userRole !== 'ADMIN') {
          this.checkUserDossier(this.currentCandidatId);
        }
      });

    // Écouter le concours sélectionné pour propager dans les liens
    this.concoursService.selectedConcoursId$
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => {
        this.selectedConcoursId = id;
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
    return this.hasDossier && this.canModifyDossier() 
      ? this.translate.instant('SIDEBAR.MODIF_DOSSIER') 
      : this.translate.instant('SIDEBAR.INSCRIPTION');
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

  navItems: NavItem[] = [];

  private initNavItems() {
    this.navItems = [
      { href: '/dashboard/creer-dossier', label: 'SIDEBAR.INSCRIPTION', icon: 'file-plus' },
      { href: '/dashboard/centre-3d', label: 'SIDEBAR.CENTRE_3D', icon: 'map-pin' },
      { href: '/dashboard/convocation', label: 'SIDEBAR.CONVOCATION', icon: 'file-text' },
      { href: '/dashboard/resultats-candidat', label: 'SIDEBAR.RESULTATS', icon: 'bar-chart-3' },
      { href: '/dashboard/reclamation', label: 'SIDEBAR.RECLAMATION', icon: 'message-circle' },
      { href: '/dashboard/settings', label: 'SIDEBAR.SETTINGS', icon: 'settings' },
    ];

    this.adminNavItems = [
      { href: '/admin/dashboard', label: 'SIDEBAR.HOME', icon: 'layout-dashboard' },
      { href: '/admin/candidats', label: 'Candidats', icon: 'users' },
      { href: '/admin/import-resultats', label: 'SIDEBAR.RESULTATS', icon: 'bar-chart-3' },
      { href: '/admin/settings', label: 'SIDEBAR.SETTINGS', icon: 'settings' },
    ];
  }

  adminNavItems: NavItem[] = [];

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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.langChangeSub) this.langChangeSub.unsubscribe();
  }

  // Méthode pour changer la langue
  toggleLanguage() {
    const current = this.languageService.currentLang();
    const next = current === 'ar' ? 'fr' : 'ar';
    this.languageService.setLanguage(next);
  }

  isArabic() {
    return this.languageService.currentLang() === 'ar';
  }

  onMockClick(event: Event, label: string) {
    event.preventDefault();
    console.log(`Mock click for ${label}`);
  }

  // 2. Méthode de déconnexion sécurisée pour le candidat
  onLogout() {
    Swal.fire({
      title: this.translate.instant('SIDEBAR.LOGOUT_TITLE'),
      text: this.translate.instant('SIDEBAR.LOGOUT_DESC'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#007bff', // Bleu
      cancelButtonColor: '#64748b',   // Slate
      confirmButtonText: this.translate.instant('SIDEBAR.LOGOUT_CONFIRM'),
      cancelButtonText: this.translate.instant('COMMON.CANCEL'),
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