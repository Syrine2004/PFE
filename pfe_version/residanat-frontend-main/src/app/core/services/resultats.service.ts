import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ResultatDto {
  numeroConvocation: string;
  cin: string;
  nomPrenom: string;
  noteEpreuve1: number;
  noteEpreuve2: number;
  moyenneGenerale: number;
  rang: number;
  statut: string;
  hashSecurise?: string;
}

export interface ImportStatsResponse {
  totalResults: number;
  totalImports: number;
  latestImport?: {
    fileName?: string;
    importedAt?: string;
    importedCount?: number;
    concoursId?: string;
  };
}

export interface ExcelPreviewResponse {
  fileName: string;
  sheetName: string;
  headers: string[];
  rows: string[][];
}

@Injectable({
  providedIn: 'root'
})
export class ResultatsService {
  private http = inject(HttpClient);

  private baseHost = window.location.hostname === 'localhost' 
    ? 'http://localhost:8080' 
    : `${window.location.protocol}//${window.location.hostname}`;
  
  private adminApiUrl = `${this.baseHost}/api/admin/resultats`;
  private candidatApiUrl = `${this.baseHost}/api/candidat/resultats`;

  constructor() {}

  // ADMIN ENDPOINTS
  
  /**
   * Import Excel file with results
   */
  importerFichierExcel(file: File, concoursId: string, rectification: boolean = false): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('concoursId', concoursId);
    formData.append('rectification', rectification.toString());

    return this.http.post(`${this.adminApiUrl}/import`, formData);
  }

  /**
   * Publish results and notify all candidates
   */
  publierResultats(concoursId: string): Observable<any> {
    return this.http.post(`${this.adminApiUrl}/publier`, {}, { 
      params: { concoursId }
    });
  }

  /**
   * Get import statistics
   */
  getStats(concoursId: string): Observable<ImportStatsResponse> {
    return this.http.get<ImportStatsResponse>(`${this.adminApiUrl}/stats`, {
      params: { concoursId }
    });
  }

  /**
   * Get paginated list of results
   */
  getResultatsList(concoursId: string, page: number = 0, size: number = 10): Observable<any> {
    return this.http.get<any>(`${this.adminApiUrl}/list`, {
      params: { 
        concoursId,
        page: page.toString(),
        size: size.toString()
      }
    });
  }

  /**
   * Get preview of imported results
   */
  getPreview(concoursId: string): Observable<ExcelPreviewResponse> {
    return this.http.get<ExcelPreviewResponse>(`${this.adminApiUrl}/preview`, {
      params: { concoursId }
    });
  }

  /**
   * Delete all results for a specific concours
   */
  viderResultats(concoursId: string): Observable<any> {
    return this.http.delete(`${this.adminApiUrl}/vider`, {
      params: { concoursId }
    });
  }

  /**
   * Get score distribution histogram data
   */
  getHistogramStats(concoursId: string): Observable<any> {
    return this.http.get(`${this.adminApiUrl}/stats/histogram`, {
      params: { concoursId }
    });
  }

  // CANDIDATE ENDPOINTS

  /**
   * Get candidate's results for all concours
   */
  getTousLesResultats(candidatId: number): Observable<ResultatDto[]> {
    return this.http.get<ResultatDto[]>(`${this.candidatApiUrl}/tous/${candidatId}`);
  }

  /**
   * Get candidate's result for current concours
   */
  getMesResultats(candidatId: number): Observable<ResultatDto> {
    return this.http.get<ResultatDto>(`${this.candidatApiUrl}/mes-resultats/${candidatId}`);
  }

  /**
   * Get candidate's result by concours ID
   */
  getResultatByConcours(candidatId: number, concoursId: string): Observable<ResultatDto> {
    return this.http.get<ResultatDto>(`${this.candidatApiUrl}/${candidatId}/concours/${concoursId}`);
  }

  /**
   * Check if results are officially published for a concours
   */
  isPublie(concoursId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.candidatApiUrl}/est-publie/${concoursId}`);
  }

  /**
   * Download candidate's result bulletin as PDF
   */
  telechargerResultatPdf(candidatId: number, concoursId?: string): Observable<Blob> {
    const params = concoursId ? { concoursId } : {};
    return this.http.get(`${this.candidatApiUrl}/telecharger-pdf/${candidatId}`, {
      params,
      responseType: 'blob'
    });
  }
}
