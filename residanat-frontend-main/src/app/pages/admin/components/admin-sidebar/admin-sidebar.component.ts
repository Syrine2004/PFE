import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service'; // Ajuste le chemin selon ton arborescence

@Component({
    selector: 'app-admin-sidebar',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './admin-sidebar.component.html',
    styleUrl: './admin-sidebar.component.scss'
})
export class AdminSidebarComponent {
    // 1. Injections
    private authService = inject(AuthService);

    // 2. État de la Sidebar
    collapsed = false;
    mobileOpen = false;

    userRole: string = '';

    ngOnInit() {
        this.userRole = localStorage.getItem('role') || '';
    }

    // 3. Éléments de navigation
    navItems = [
        { label: 'Dashboard', icon: 'layout-dashboard', href: '/admin/dashboard', disabled: true },
        { label: 'Candidats', icon: 'users', href: '/admin/candidats', disabled: true },
        { label: 'Concours', icon: 'trophy', href: '/admin/concours', disabled: false },
        { label: 'Résultats', icon: 'bar-chart-3', href: '/admin/resultats', disabled: true },
        { label: 'Réclamations', icon: 'message-circle', href: '/admin/reclamations', disabled: true },
        { label: 'Paramètres', icon: 'settings', href: '/admin/parametres', disabled: true },
    ];

    // 4. Logique d'affichage
    toggleSidebar() {
        this.collapsed = !this.collapsed;
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

    // 5. FONCTION DE DÉCONNEXION FIXÉE
    onLogout() {
        if (confirm("Voulez-vous vraiment vous déconnecter de l'espace Admin ?")) {
            this.authService.logout();
        }
    }
}