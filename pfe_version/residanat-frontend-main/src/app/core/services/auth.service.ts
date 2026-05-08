import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  
  // URL dynamique pour s'adapter au déploiement (Local vs Cloudflare)
  private baseHost = window.location.hostname === 'localhost' ? 'http://localhost:8080' : `${window.location.protocol}//${window.location.hostname}`;
  private apiUrl = `${this.baseHost}/api/auth`;

  // Sujet pour suivre l'état de connexion en temps réel
  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn$: Observable<boolean> = this.isLoggedInSubject;

  // --- LOGIN ---
  login(credentials: { email: string; motDePasse: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        // On enregistre les données si le token est présent
        if (response.token) {
          sessionStorage.setItem('token', response.token);
          sessionStorage.setItem('role', response.role);
          
          // Sauvegarde des infos utilisateur dans localStorage pour les composants
          const user = {
            id: response.id,
            email: response.email,
            nom: response.nom,
            prenom: response.prenom,
            role: response.role
          };
          localStorage.setItem('user', JSON.stringify(user));
          
          this.isLoggedInSubject.next(true);
        }
      })
    );
  }

  register(candidat: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, candidat, { responseType: 'text' });
  }

  // --- GET PROFILE ---
  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/me`).pipe(
      tap(profile => {
        if (profile) {
          localStorage.setItem('user', JSON.stringify(profile));
        }
      })
    );
  }

  // --- UPDATE PROFILE ---
  updateProfile(profileData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/update-profile`, profileData, { responseType: 'text' });
  }

  changePassword(data: { oldPassword: string; newPassword: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/change-password`, data, { responseType: 'text' });
  }

  // --- PASSWORD RESET ---
  forgotPassword(cin: string, email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { cin, email }, { responseType: 'text' });
  }

  resetPassword(data: { email: string; code: string; newPassword: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, data, { responseType: 'text' });
  }

  // --- LOGOUT (VERSION SÉCURISÉE) ---
  logout(): void {
    // Preserve portal settings across sessions — they must survive logout
    const portalSettings = localStorage.getItem('portalSettings');

    // 1. Nettoyage radical de toutes les clés de session
    localStorage.clear();
    sessionStorage.clear();

    // Restore portal settings so admin closure persists
    if (portalSettings) {
      localStorage.setItem('portalSettings', portalSettings);
    }

    // 2. Mise à jour de l'état
    this.isLoggedInSubject.next(false);

    // 3. Reset total de l'application (Vider la RAM et redirection)
    window.location.href = '/connexion';
  }

  // --- UTILITAIRES ---
  private hasToken(): boolean {
    return !!sessionStorage.getItem('token');
  }

  getToken(): string | null {
    return sessionStorage.getItem('token');
  }

  getRole(): string | null {
    return sessionStorage.getItem('role');
  }

  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`);
  }
}