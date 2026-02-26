import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ConcoursService, Concours } from '../../../../core/services/concours.service';

@Component({
    selector: 'app-inscription-concours',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './inscription-concours.component.html',
    styleUrl: './inscription-concours.component.scss'
})
export class InscriptionConcoursComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private concoursService = inject(ConcoursService);

    concours: Concours | null = null;
    currentStep = 1;

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            const concoursId = params['concoursId'];
            if (concoursId) {
                this.concoursService.getConcoursById(concoursId).subscribe({
                    next: (res) => this.concours = res,
                    error: (err) => console.error(err)
                });
            } else {
                this.concoursService.getConcours(0, 1, undefined, undefined, 'PUBLIE').subscribe({
                    next: (res) => {
                        if (res.content.length > 0) {
                            this.concours = res.content[0];
                        }
                    },
                    error: (err) => console.error(err)
                });
            }
        });
    }

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
