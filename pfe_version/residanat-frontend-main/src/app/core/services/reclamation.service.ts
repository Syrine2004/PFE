import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Reclamation {
  id: number;
  candidatId: number;
  objet: string;
  description: string;
  categorie: string;
  priorite: string;
  statut: string;
  dateSoumission: string;
  dateTraitement?: string;
  reponseAdmin?: string;
  pieceJointe?: string; // Base64 data
  attachmentName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReclamationService {
  private http = inject(HttpClient);

  private baseHost = window.location.hostname === 'localhost' 
    ? 'http://localhost:8080' 
    : `${window.location.protocol}//${window.location.hostname}`;
  
  private apiUrl = `${this.baseHost}/api/reclamations`;

  /**
   * Submit a new reclamation with optional Base64 attachment
   */
  submitReclamation(objet: string, description: string, pieceJointe?: string, attachmentName?: string, concoursId?: string): Observable<Reclamation> {
    const payload = { 
      objet, 
      description, 
      pieceJointe, 
      attachmentName,
      concoursId
    };
    return this.http.post<Reclamation>(this.apiUrl, payload);
  }

  /**
   * Get all reclamations for the current authenticated candidate
   */
  getMyReclamations(concoursId?: string): Observable<Reclamation[]> {
    let url = `${this.apiUrl}/my`;
    if (concoursId) {
      url += `?concoursId=${concoursId}`;
    }
    return this.http.get<Reclamation[]>(url);
  }
}
