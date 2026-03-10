import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';

interface NavLink {
  route: string;
  label: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private sub = new Subscription();

  open = signal(false);
  isLoggedIn = signal(false);
  navLinks: NavLink[] = [
    { route: '/', label: 'Accueil' },
    { route: '/qui-sommes-nous', label: 'Qui sommes-nous' },
    { route: '/specialites', label: 'Spécialités' },
    { route: '/textes-reglementaires', label: 'Textes réglementaires' },
    { route: '/colleges-formations', label: 'Collèges & Formations' },
    { route: '/actualites', label: 'Actualités' },
    { route: '/contact', label: 'Contact' },
  ];

  ngOnInit() {
    this.sub = this.authService.isLoggedIn$.subscribe(loggedIn => {
      this.isLoggedIn.set(loggedIn);
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  get actionLink(): string {
    if (!this.isLoggedIn()) return '/connexion';
    const role = sessionStorage.getItem('role');
    return role === 'ADMIN' ? '/admin/concours' : '/dashboard/home';
  }

  get actionLabel(): string {
    return this.isLoggedIn() ? 'Tableau de bord' : 'Concours Résidant';
  }

  toggleMenu() { this.open.update(v => !v); }
  closeMenu() { this.open.set(false); }
}
