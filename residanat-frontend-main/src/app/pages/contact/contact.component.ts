import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-contact',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './contact.component.html',
    styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
    nom = '';
    email = '';
    sujet = '';
    message = '';

    readonly contactInfo = [
        {
            icon: 'mail',
            title: "Email",
            value: "contact@residanat.tn",
            description: "Reponse sous 48h ouvrables",
        },
        {
            icon: 'phone',
            title: "Telephone",
            value: "+216 71 000 000",
            description: "Lun - Ven, 8h - 17h",
        },
        {
            icon: 'map-pin',
            title: "Adresse",
            value: "Ministere de la Sante",
            description: "Tunis, Tunisie",
        },
        {
            icon: 'clock',
            title: "Horaires",
            value: "Lundi - Vendredi",
            description: "08:00 - 17:00",
        },
    ];

    onSubmit() {
        console.log('Contact form submitted:', {
            nom: this.nom,
            email: this.email,
            sujet: this.sujet,
            message: this.message
        });

        Swal.fire({
            title: 'Message Envoyé !',
            text: 'Nous vous répondrons dans les plus brefs délais.',
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
