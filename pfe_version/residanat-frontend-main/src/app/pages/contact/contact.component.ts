import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-contact',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule],
    templateUrl: './contact.component.html',
    styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
    private translate = inject(TranslateService);

    nom = '';
    email = '';
    sujet = '';
    message = '';

    get contactInfo() {
        return [
            {
                icon: 'mail',
                title: this.translate.instant('INFO_PAGES.CONTACT.INFO.0.TITLE'),
                value: this.translate.instant('INFO_PAGES.CONTACT.INFO.0.VALUE'),
                description: this.translate.instant('INFO_PAGES.CONTACT.INFO.0.DESC'),
            },
            {
                icon: 'phone',
                title: this.translate.instant('INFO_PAGES.CONTACT.INFO.1.TITLE'),
                value: this.translate.instant('INFO_PAGES.CONTACT.INFO.1.VALUE'),
                description: this.translate.instant('INFO_PAGES.CONTACT.INFO.1.DESC'),
            },
            {
                icon: 'map-pin',
                title: this.translate.instant('INFO_PAGES.CONTACT.INFO.2.TITLE'),
                value: this.translate.instant('INFO_PAGES.CONTACT.INFO.2.VALUE'),
                description: this.translate.instant('INFO_PAGES.CONTACT.INFO.2.DESC'),
            },
            {
                icon: 'clock',
                title: this.translate.instant('INFO_PAGES.CONTACT.INFO.3.TITLE'),
                value: this.translate.instant('INFO_PAGES.CONTACT.INFO.3.VALUE'),
                description: this.translate.instant('INFO_PAGES.CONTACT.INFO.3.DESC'),
            },
        ];
    }

    onSubmit() {
        console.log('Contact form submitted:', {
            nom: this.nom,
            email: this.email,
            sujet: this.sujet,
            message: this.message
        });

        Swal.fire({
            title: this.translate.instant('INFO_PAGES.CONTACT.FORM.SUCCESS_TITLE'),
            text: this.translate.instant('INFO_PAGES.CONTACT.FORM.SUCCESS_TEXT'),
            icon: 'success',
            confirmButtonColor: '#14b8a6',
            heightAuto: false
        });

        this.nom = '';
        this.email = '';
        this.sujet = '';
        this.message = '';
    }
}
