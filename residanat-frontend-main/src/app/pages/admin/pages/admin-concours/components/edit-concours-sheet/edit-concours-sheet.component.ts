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
    etat?: string;
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
    showTypeDropdown = false;

    toggleTypeDropdown(event: Event) {
        event.stopPropagation();
        this.showTypeDropdown = !this.showTypeDropdown;
    }

    selectType(type: string) {
        if (this.formData) {
            this.formData.type = type;
        }
        this.showTypeDropdown = false;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['concours'] && this.concours) {
            this.formData = { ...this.concours };
        }
    }

    onSave() {
        if (this.formData) {
            // Internal validation to prevent emitting invalid data
            if (this.formData.dateDebut && this.formData.dateFin) {
                if (new Date(this.formData.dateDebut) > new Date(this.formData.dateFin)) {
                    return;
                }
            }
            this.save.emit(this.formData);
        }
    }

    onClose() {
        this.close.emit();
    }
}
