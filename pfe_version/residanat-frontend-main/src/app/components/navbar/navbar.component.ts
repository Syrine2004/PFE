import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';

interface NavLink {
  route: string;
  labelKey: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private sub = new Subscription();

  open = signal(false);
  isLoggedIn = signal(false);
  navLinks: NavLink[] = [
    { route: '/', labelKey: 'NAVBAR.HOME' },
    { route: '/qui-sommes-nous', labelKey: 'NAVBAR.ABOUT' },
    { route: '/specialites', labelKey: 'NAVBAR.SPECIALTIES' },
    { route: '/colleges-formations', labelKey: 'NAVBAR.COLLEGES' },
    { route: '/actualites', labelKey: 'NAVBAR.NEWS' },
    { route: '/contact', labelKey: 'NAVBAR.CONTACT' },
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
    return this.isLoggedIn() ? 'NAVBAR.DASHBOARD' : 'NAVBAR.CONCOURS';
  }

  toggleMenu() { this.open.update(v => !v); }
  closeMenu() { this.open.set(false); }
}
