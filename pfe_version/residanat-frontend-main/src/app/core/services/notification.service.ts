import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Notification {
  id: number;
  candidatId: number;
  message: string;
  type: 'SUCCESS' | 'ERROR' | 'INFO';
  createdAt: string;
  read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  
  private baseHost = window.location.hostname === 'localhost' ? 'http://localhost:8080' : `${window.location.protocol}//${window.location.hostname}`;
  private apiUrl = `${this.baseHost}/api/notifications`;

  getNotifications(candidatId: number, concoursId?: string): Observable<Notification[]> {
    let url = `${this.apiUrl}/candidat/${candidatId}`;
    if (concoursId) {
      url += `?concoursId=${concoursId}`;
    }
    return this.http.get<Notification[]>(url);
  }

  getUnreadCount(candidatId: number, concoursId?: string): Observable<number> {
    let url = `${this.apiUrl}/candidat/${candidatId}/unread-count`;
    if (concoursId) {
      url += `?concoursId=${concoursId}`;
    }
    return this.http.get<number>(url);
  }

  markAsRead(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/read`, {});
  }

  markAllAsRead(candidatId: number, concoursId?: string): Observable<void> {
    let url = `${this.apiUrl}/candidat/${candidatId}/read-all`;
    if (concoursId) {
      url += `?concoursId=${concoursId}`;
    }
    return this.http.patch<void>(url, {});
  }
}
