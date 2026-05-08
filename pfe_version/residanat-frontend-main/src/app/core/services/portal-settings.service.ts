import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';

export interface PortalSettings {
  isClosed: boolean;
  closingDate: string | null;
  maintenanceMessage: string;
}

const DEFAULT_SETTINGS: PortalSettings = {
  isClosed: false,
  closingDate: null,
  maintenanceMessage: 'Le portail des examens est désormais clôturé pour cette session. Merci pour votre participation.'
};

@Injectable({
  providedIn: 'root'
})
export class PortalSettingsService {
  private http = inject(HttpClient);
  private baseHost = window.location.hostname === 'localhost'
    ? 'http://localhost:8080'
    : `${window.location.protocol}//${window.location.hostname}`;
  private apiUrl = `${this.baseHost}/api/portal-settings`;

  private settingsSubject = new BehaviorSubject<PortalSettings>(
    this.loadFromStorage()
  );

  settings$ = this.settingsSubject.asObservable();

  private loadFromStorage(): PortalSettings {
    try {
      const stored = localStorage.getItem('portalSettings');
      return stored ? JSON.parse(stored) : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private saveToStorage(settings: PortalSettings): void {
    localStorage.setItem('portalSettings', JSON.stringify(settings));
  }

  /** Synchronous read — used by the Guard */
  getCurrentSettings(): PortalSettings {
    return this.settingsSubject.value;
  }

  getSettings(): Observable<PortalSettings> {
    // In production, replace with: return this.http.get<PortalSettings>(this.apiUrl);
    return of(this.settingsSubject.value);
  }

  updateSettings(settings: PortalSettings): Observable<any> {
    this.settingsSubject.next(settings);
    this.saveToStorage(settings);
    // In production, replace with: return this.http.put(this.apiUrl, settings);
    return of({ success: true });
  }
}
