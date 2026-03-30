import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Concours {
    id?: string;
    titre?: string;        // Used in frontend, mapped to libelle ? Need to check
    libelle?: string;      // The actual backend field
    annee: number;
    type?: string;         // Used in frontend
    typeConcours?: string; // The actual backend field
    statut?: string;       // Used in frontend
    etat?: string; // The actual backend field
    dateDebut?: string;
    dateFin?: string;
    nbCandidats?: number;
    actif?: boolean;
    deleted?: boolean;
}

export interface PageResponse<T> {
    content: T[];
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    last: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ConcoursService {
    private http = inject(HttpClient);
    
    // URL dynamique pour s'adapter au déploiement (Local vs Cloudflare)
    private baseHost = window.location.hostname === 'localhost' ? 'http://localhost:8080' : `${window.location.protocol}//${window.location.hostname}`;
    private apiUrl = `${this.baseHost}/api/concours`;

    // --- CRUD OPERATIONS ---

    getConcours(page: number = 0, size: number = 10, annee?: number, typeConcours?: string, statutResultat?: string): Observable<PageResponse<Concours>> {
        let params: any = { page, size };
        if (annee) params['annee'] = annee;
        if (typeConcours) params['typeConcours'] = typeConcours;
        if (statutResultat) params['statutResultat'] = statutResultat;

        return this.http.get<PageResponse<Concours>>(this.apiUrl, { params: params });
    }

    getConcoursById(id: string): Observable<Concours> {
        return this.http.get<Concours>(`${this.apiUrl}/${id}`);
    }

    createConcours(concours: any): Observable<Concours> {
        // Map frontend fields (titre -> libelle)
        const payload = {
            libelle: concours.titre || concours.libelle,
            annee: concours.annee,
            typeConcours: concours.type || concours.typeConcours || 'National',
            etat: concours.statut === 'publie' ? 'PUBLIE' : 'NON_PUBLIE',
            dateDebut: concours.dateDebut,
            dateFin: concours.dateFin
        };
        return this.http.post<Concours>(this.apiUrl, payload);
    }

    updateConcours(id: string, concours: any): Observable<Concours> {
        const payload = {
            libelle: concours.titre || concours.libelle,
            annee: concours.annee,
            typeConcours: concours.type || concours.typeConcours || 'National',
            etat: concours.statut === 'publie' ? 'PUBLIE' : 'NON_PUBLIE',
            dateDebut: concours.dateDebut,
            dateFin: concours.dateFin
        };
        return this.http.put<Concours>(`${this.apiUrl}/${id}`, payload);
    }

    deleteConcours(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    publishConcours(id: string): Observable<Concours> {
        return this.http.patch<Concours>(`${this.apiUrl}/${id}/publish`, {});
    }

    unpublishConcours(id: string): Observable<Concours> {
        return this.http.patch<Concours>(`${this.apiUrl}/${id}/unpublish`, {});
    }
}
