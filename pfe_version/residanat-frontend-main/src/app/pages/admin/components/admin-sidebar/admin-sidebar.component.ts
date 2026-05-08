import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../../core/services/auth.service';
import { SidebarService } from '../../../../core/services/sidebar.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-admin-sidebar',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslateModule],
    templateUrl: './admin-sidebar.component.html',
    styleUrl: './admin-sidebar.component.scss'
})
export class AdminSidebarComponent {
    // 1. Injections
    private authService = inject(AuthService);
    private sidebarService = inject(SidebarService);
    private translate = inject(TranslateService);

    // 2. État de la Sidebar
    get collapsed() { return this.sidebarService.isCollapsed; }
    mobileOpen = false;

    userRole: string = '';

    ngOnInit() {
        this.userRole = sessionStorage.getItem('role') || '';
    }

    // 3. Éléments de navigation
    navItems = [
        { label: 'SIDEBAR.DASHBOARD', icon: 'layout-dashboard', href: '/admin/dashboard', disabled: false },
        { label: 'SIDEBAR.ADMIN_CONCOURS', icon: 'award', href: '/admin/concours', disabled: false },
        { label: 'SIDEBAR.ADMIN_CANDIDATS', icon: 'users', href: '/admin/candidats', disabled: false },
        { label: 'SIDEBAR.ADMIN_IMPORT_MINISTERE', icon: 'file-import', href: '/admin/import-ministere', disabled: false },
        { label: 'SIDEBAR.ADMIN_IMPORT_RESULTATS', icon: 'bar-chart-3', href: '/admin/import-resultats', disabled: false },
        { label: 'SIDEBAR.RECLAMATION', icon: 'message-circle', href: '/admin/reclamations', disabled: false },
        { label: 'SIDEBAR.SETTINGS', icon: 'settings', href: '/admin/settings', disabled: false },
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
            title: this.translate.instant('SIDEBAR.LOGOUT_TITLE'),
            text: this.translate.instant('SIDEBAR.LOGOUT_DESC'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#007bff',
            cancelButtonColor: '#64748b',
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