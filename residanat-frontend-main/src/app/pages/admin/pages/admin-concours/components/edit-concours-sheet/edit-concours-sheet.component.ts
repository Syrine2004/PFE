import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Concours {
    id?: string;
    titre?: string;
    libelle?: string;
    annee: number;
    type?: string;
    typeConcours?: string;
    statut?: string;
    statutResultat?: string;
    dateDebut?: string;
    dateFin?: string;
    nbCandidats?: number;
    actif?: boolean;
    deleted?: boolean;
}

@Component({
    selector: 'app-edit-concours-sheet',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './edit-concours-sheet.component.html',
    styleUrl: './edit-concours-sheet.component.scss'
})
export class EditConcoursSheetComponent implements OnChanges {
    @Input() concours: Concours | null = null;
    @Input() isOpen = false;
    @Output() close = new EventEmitter<void>();
    @Output() save = new EventEmitter<Concours>();

    formData: Concours | null = null;

    ngOnChanges(changes: SimpleChanges) {
        if (changes['concours'] && this.concours) {
            this.formData = { ...this.concours };
        }
    }

    onSave() {
        if (this.formData) {
            this.save.emit(this.formData);
        }
    }

    onClose() {
        this.close.emit();
    }
}
