import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-inscription-concours',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './inscription-concours.component.html',
    styleUrl: './inscription-concours.component.scss'
})
export class InscriptionConcoursComponent {
    currentStep = 1;

    nextStep() {
        if (this.currentStep < 3) {
            this.currentStep++;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    submitForm() {
        // Mock submission
        console.log('Form submitted');
    }
}
