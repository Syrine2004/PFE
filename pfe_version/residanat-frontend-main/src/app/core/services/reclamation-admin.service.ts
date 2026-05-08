import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Reclamation {
  id: number;
  candidatId: number;
  candidateFullName?: string; // Enriched
  candidateCin?: string;      // Enriched
  candidateEmail?: string;    // Enriched
  objet: string;
  description: string;
  categorie: string;
  priorite: string;
  statut: string;
  dateSoumission: string;
  dateTraitement?: string;
  reponseAdmin?: string;
  attachmentUrl?: string; // Keep for legacy/future use
  attachmentName?: string;
  pieceJointe?: string; // Base64 data
  concoursId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReclamationAdminService {
  private http = inject(HttpClient);

  private baseHost = window.location.hostname === 'localhost' 
    ? 'http://localhost:8080' 
    : `${window.location.protocol}//${window.location.hostname}`;
  
  private apiUrl = `${this.baseHost}/api/admin/reclamations`;

  constructor() {}

  /**
   * Get filtered list of reclamations
   */
  getReclamations(statut?: string, priorite?: string, categorie?: string, concoursId?: string): Observable<Reclamation[]> {
    let params = new HttpParams();
    if (statut && statut !== 'all') params = params.set('statut', statut);
    if (priorite && priorite !== 'all') params = params.set('priorite', priorite);
    if (categorie && categorie !== 'all') params = params.set('categorie', categorie);
    if (concoursId && concoursId !== 'all') params = params.set('concoursId', concoursId);

    return this.http.get<Reclamation[]>(this.apiUrl, { params });
  }

  /**
   * Mark a reclamation as being processed (EN_COURS)
   */
  prendreEnCharge(id: number): Observable<Reclamation> {
    return this.http.put<Reclamation>(`${this.apiUrl}/${id}/prendre-en-charge`, {});
  }

  /**
   * Finalize a reclamation with a response
   */
  cloturer(id: number, statut: string, reponse: string): Observable<Reclamation> {
    return this.http.put<Reclamation>(`${this.apiUrl}/${id}/cloturer`, { statut, reponse });
  }

  /**
   * Update metadata (category or priority) manually
   */
  updateMetadata(id: number, payload: any): Observable<Reclamation> {
    return this.http.put<Reclamation>(`${this.apiUrl}/${id}/metadata`, payload);
  }
}
