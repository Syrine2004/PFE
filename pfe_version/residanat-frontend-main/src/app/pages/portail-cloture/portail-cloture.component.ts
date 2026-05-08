import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortalSettingsService } from '../../core/services/portal-settings.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-portail-cloture',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portail-cloture.component.html',
  styleUrl: './portail-cloture.component.scss'
})
export class PortailClotureComponent implements OnInit {

  message = 'Le portail des examens est désormais clôturé pour cette session. Merci pour votre participation.';
  closureDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  particles: { x: number; y: number; size: number; delay: string }[] = [];

  constructor(
    private portalService: PortalSettingsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const settings = this.portalService.getCurrentSettings();
    if (settings.maintenanceMessage) {
      this.message = settings.maintenanceMessage;
    }
    if (settings.closingDate) {
      this.closureDate = new Date(settings.closingDate).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    }
    this.generateParticles();
  }

  onLogout(): void {
    this.authService.logout();
  }

  private generateParticles(): void {
    this.particles = Array.from({ length: 18 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 3,
      delay: `-${(Math.random() * 6).toFixed(1)}s`
    }));
  }
}
