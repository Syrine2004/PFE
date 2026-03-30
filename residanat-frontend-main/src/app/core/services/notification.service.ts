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

  getNotifications(candidatId: number): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/candidat/${candidatId}`);
  }

  getUnreadCount(candidatId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/candidat/${candidatId}/unread-count`);
  }

  markAsRead(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/read`, {});
  }

  markAllAsRead(candidatId: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/candidat/${candidatId}/read-all`, {});
  }
}
