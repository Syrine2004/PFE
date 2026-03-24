import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export enum StatutDossier {
    EN_ATTENTE = 'EN_ATTENTE',
    VALIDE = 'VALIDE',
    REJETE = 'REJETE',
    INCOMPLET = 'INCOMPLET'
}

export enum TypeDocument {
    CIN = 'CIN',
    DIPLOME = 'DIPLOME',
    PHOTO_IDENTITE = 'PHOTO_IDENTITE',
    PASSEPORT = 'PASSEPORT'
}

export interface Document {
    id: number;
    nom: string;
    type: TypeDocument;
    dateCreation: string;
    cheminFichier: string;
}

export interface EvaluationIA {
    id: number;
    score: number | null;
    scoreCin?: number;
    scoreDiplome?: number;
    scorePhoto?: number;
    anomalies: string;
    verifie: boolean;
    dateEvaluation: string;
    analysisBatchId?: string;
    expectedChecks?: number;
    completedChecks?: number;
    analysisStatus?: string;
}

export interface DossierCandidature {
    id: number;
    candidatId: number;
    concoursId: string;
    statut: StatutDossier;
    dateSoumission: string;
    dateDiplome?: string;
    documents: Document[];
    evaluationIA?: EvaluationIA;
}

@Injectable({
    providedIn: 'root'
})
export class DossierService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:8080/api/dossiers';

    initDossier(candidatId: number, concoursId: string): Observable<DossierCandidature> {
        return this.http.post<DossierCandidature>(`${this.apiUrl}/init`, null, {
            params: { candidatId: candidatId.toString(), concoursId }
        });
    }

    uploadDocument(dossierId: number, file: File, type: TypeDocument): Observable<Document> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        return this.http.post<Document>(`${this.apiUrl}/${dossierId}/upload`, formData);
    }

    getDossier(id: number): Observable<DossierCandidature> {
        return this.http.get<DossierCandidature>(`${this.apiUrl}/${id}`);
    }

    getDossierByCandidat(candidatId: number, concoursId: string): Observable<DossierCandidature> {
        return this.http.get<DossierCandidature>(`${this.apiUrl}/search`, {
            params: { candidatId: candidatId.toString(), concoursId }
        });
    }

    updateStatut(id: number, statut: StatutDossier): Observable<DossierCandidature> {
        return this.http.patch<DossierCandidature>(`${this.apiUrl}/${id}/statut`, null, {
            params: { statut }
        });
    }

    checkIA(id: number, data?: any): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/${id}/check-ia`, data);
    }

    saveDataDiplome(dossierId: number, dateDiplome: string): Observable<DossierCandidature> {
        return this.http.patch<DossierCandidature>(`${this.apiUrl}/${dossierId}/date-diplome`, null, {
            params: { dateDiplome }
        });
    }

    getAllDossiers(): Observable<DossierCandidature[]> {
        return this.http.get<DossierCandidature[]>(this.apiUrl);
    }
}
