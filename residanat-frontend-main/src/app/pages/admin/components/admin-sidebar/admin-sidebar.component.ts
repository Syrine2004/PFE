import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service'; // Ajuste le chemin selon ton arborescence
import { SidebarService } from '../../../../core/services/sidebar.service';
import Swal from 'sweetalert2';

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
    private sidebarService = inject(SidebarService);

    // 2. État de la Sidebar
    get collapsed() { return this.sidebarService.isCollapsed; }
    mobileOpen = false;

    userRole: string = '';

    ngOnInit() {
        this.userRole = sessionStorage.getItem('role') || '';
    }

    // 3. Éléments de navigation
    navItems = [
        { label: 'Accueil Site', icon: 'home', href: '/', disabled: false },
        { label: 'Concours', icon: 'award', href: '/admin/concours', disabled: false },
        { label: 'Candidats', icon: 'users', href: '/admin/candidats', disabled: false },
        { label: 'Affectations (Ministère)', icon: 'file-import', href: '/admin/import-ministere', disabled: false },
        { label: 'Résultats', icon: 'bar-chart-3', href: '/admin/resultats', disabled: true },
        { label: 'Réclamations', icon: 'message-circle', href: '/admin/reclamations', disabled: true },
        { label: 'Paramètres', icon: 'settings', href: '/admin/parametres', disabled: true },
    ];

    // 4. Logique d'affichage
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

    // 5. FONCTION DE DÉCONNEXION FIXÉE
    onLogout() {
        Swal.fire({
            title: 'Déconnexion Admin',
            text: "Voulez-vous vraiment vous déconnecter de l'espace Admin ?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#007bff', // Bleu
            cancelButtonColor: '#64748b',   // Slate
            confirmButtonText: 'Oui, quitter',
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