import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

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
export class NavbarComponent {
  open = signal(false);
  navLinks: NavLink[] = [
    { route: '/', label: 'Accueil' },
    { route: '/qui-sommes-nous', label: 'Qui sommes-nous' },
    { route: '/specialites', label: 'Spécialités' },
    { route: '/textes-reglementaires', label: 'Textes réglementaires' },
    { route: '/colleges-formations', label: 'Collèges & Formations' },
    { route: '/actualites', label: 'Actualités' },
    { route: '/contact', label: 'Contact' },
  ];

  toggleMenu() { this.open.update(v => !v); }
  closeMenu() { this.open.set(false); }
}
