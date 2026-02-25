import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/auth';

  // Sujet pour suivre l'état de connexion en temps réel
  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn$ = this.isLoggedInSubject.asObservable();

  // --- LOGIN ---
  login(credentials: { email: string; motDePasse: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        // On enregistre les données si le token est présent
        if (response.token) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('role', response.role);
          this.isLoggedInSubject.next(true);
        }
      })
    );
  }

  // --- REGISTER ---
  register(candidat: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, candidat, { responseType: 'text' });
  }

  // --- LOGOUT (VERSION SÉCURISÉE) ---
  logout(): void {
    // 1. Nettoyage radical de toutes les clés de session
    localStorage.clear();

    // 2. Mise à jour de l'état
    this.isLoggedInSubject.next(false);

    // 3. Reset total de l'application (Vider la RAM et redirection)
    window.location.href = '/connexion';
  }

  // --- UTILITAIRES ---
  private hasToken(): boolean {
    // Vérifie si le badge est présent dans le coffre
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRole(): string | null {
    return localStorage.getItem('role');
  }

}