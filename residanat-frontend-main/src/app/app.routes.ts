import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { AdminLayoutComponent } from './pages/admin/admin-layout.component';
import { AdminConcoursComponent } from './pages/admin/pages/admin-concours/admin-concours.component';
import { ImportMinistereComponent } from './pages/admin/pages/import-ministere/import-ministere.component';

// Importation des deux Guards
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

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
        path: 'textes-reglementaires',
        loadComponent: () => import('./pages/textes-reglementaires/textes-reglementaires.component').then(m => m.TextesReglementairesComponent)
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
  // 2. ESPACE CANDIDAT (Vérifie juste la connexion)
  // ==========================================
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard-layout.component').then(m => m.DashboardLayoutComponent),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () => import('./pages/dashboard/pages/dashboard-home/dashboard-home.component').then(m => m.DashboardHomeComponent)
      },
      {
        path: 'creer-dossier',
        loadComponent: () => import('./pages/dashboard/pages/inscription-concours/inscription-concours.component').then(m => m.InscriptionConcoursComponent)
      },
      {
        path: 'dossier/:id',
        loadComponent: () => import('./pages/dashboard/pages/dossier-detail/dossier-detail.component').then(m => m.DossierDetailComponent)
      },
      {
        path: 'convocation',
        loadComponent: () => import('./pages/dashboard/pages/convocation/convocation.component').then(m => m.ConvocationComponent)
      }
    ]
  },

  // ==========================================
  // 3. ESPACE ADMINISTRATEUR (Vérifie connexion ET rôle)
  // ==========================================
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard], // <-- DOUBLE SÉCURITÉ ICI
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'concours', pathMatch: 'full' },
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
      }
    ]
  },

  // Redirection par défaut (URL inconnue)
  { path: '**', redirectTo: '' },
];