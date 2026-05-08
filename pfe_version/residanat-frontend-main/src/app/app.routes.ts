import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { AdminLayoutComponent } from './pages/admin/admin-layout.component';
import { AdminConcoursComponent } from './pages/admin/pages/admin-concours/admin-concours.component';
import { ImportMinistereComponent } from './pages/admin/pages/import-ministere/import-ministere.component';

// Guards
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { portalGuard } from './core/guards/portal.guard';

export const routes: Routes = [
  // ==========================================
  // 1. ESPACE PUBLIC (Libre accès)
  // ==========================================
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', component: HomeComponent, pathMatch: 'full' },
      {
        path: 'actualites',
        loadComponent: () => import('./pages/actualites/actualites.component').then(m => m.ActualitesComponent)
      },
      {
        path: 'qui-sommes-nous',
        loadComponent: () => import('./pages/qui-sommes-nous/qui-sommes-nous.component').then(m => m.QuiSommesNousComponent)
      },
      {
        path: 'specialites',
        loadComponent: () => import('./pages/specialites/specialites.component').then(m => m.SpecialitesComponent)
      },
      {
        path: 'colleges-formations',
        loadComponent: () => import('./pages/colleges-formations/colleges-formations.component').then(m => m.CollegesFormationsComponent)
      },
      {
        path: 'contact',
        loadComponent: () => import('./pages/contact/contact.component').then(m => m.ContactComponent)
      },
      {
        path: 'connexion',
        loadComponent: () => import('./pages/connexion/connexion.component').then(m => m.ConnexionComponent)
      },
      {
        path: 'inscription',
        loadComponent: () => import('./pages/inscription/inscription.component').then(m => m.InscriptionComponent)
      },
      {
        path: 'stages-etranger',
        loadComponent: () => import('./pages/stages-etranger/stages-etranger.component').then(m => m.StagesEtrangerComponent)
      },
    ]
  },

  // ==========================================
  // Page clôture (accessible sans layout)
  // ==========================================
  {
    path: 'portail-cloture',
    loadComponent: () => import('./pages/portail-cloture/portail-cloture.component').then(m => m.PortailClotureComponent)
  },

  // ==========================================
  // 2. ESPACE CANDIDAT (Connexion + Portail ouvert)
  // ==========================================
  {
    path: 'dashboard',
    canActivate: [authGuard, portalGuard],
    loadComponent: () => import('./pages/dashboard/dashboard-layout.component').then(m => m.DashboardLayoutComponent),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        canActivate: [portalGuard],
        loadComponent: () => import('./pages/dashboard/pages/dashboard-home/dashboard-home.component').then(m => m.DashboardHomeComponent)
      },
      {
        path: 'creer-dossier',
        canActivate: [portalGuard],
        loadComponent: () => import('./pages/dashboard/pages/inscription-concours/inscription-concours.component').then(m => m.InscriptionConcoursComponent)
      },
      {
        path: 'dossier/:id',
        canActivate: [portalGuard],
        loadComponent: () => import('./pages/dashboard/pages/dossier-detail/dossier-detail.component').then(m => m.DossierDetailComponent)
      },
      {
        path: 'convocation',
        canActivate: [portalGuard],
        loadComponent: () => import('./pages/dashboard/pages/convocation/convocation.component').then(m => m.ConvocationComponent)
      },
      {
        path: 'centre-3d',
        canActivate: [portalGuard],
        loadComponent: () => import('./pages/dashboard/pages/centre-3d/centre-3d.component').then(m => m.Centre3dComponent)
      },
      {
        path: 'resultats',
        canActivate: [portalGuard],
        loadComponent: () => import('./pages/dashboard/pages/resultats-candidat/resultats-candidat.component').then(m => m.ResultatsCandidatComponent)
      },
      {
        path: 'resultats-candidat',
        canActivate: [portalGuard],
        loadComponent: () => import('./pages/dashboard/pages/resultats-candidat/resultats-candidat.component').then(m => m.ResultatsCandidatComponent)
      },
      {
        path: 'reclamation',
        canActivate: [portalGuard],
        loadComponent: () => import('./pages/dashboard/pages/candidat-reclamations/candidat-reclamations.component').then(m => m.CandidatReclamationsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/dashboard/pages/settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  },

  // ==========================================
  // 3. ESPACE ADMINISTRATEUR (Connexion + Rôle ADMIN)
  // ==========================================
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'concours',
        component: AdminConcoursComponent
      },
      {
        path: 'candidats',
        loadComponent: () => import('./pages/admin/pages/admin-candidats/admin-candidats.component').then(m => m.AdminCandidatsComponent)
      },
      {
        path: 'import-ministere',
        component: ImportMinistereComponent
      },
      {
        path: 'import-resultats',
        loadComponent: () => import('./pages/admin/pages/import-resultats/import-resultats.component').then(m => m.ImportResultatsComponent)
      },
      {
        path: 'reclamations',
        loadComponent: () => import('./pages/admin/pages/admin-reclamations/admin-reclamations.component').then(m => m.AdminReclamationsComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/dashboard/pages/settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  },

  // Redirection par défaut (URL inconnue)
  { path: '**', redirectTo: '' },
];