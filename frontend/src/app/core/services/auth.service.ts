import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../tokens/api.token';

export interface UserSession {
  id: string;
  email: string;
  admin: boolean;
}

export interface LoginResponse {
  success: boolean;
  user: UserSession;
  session: {
    access_token: string;
    token_type: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_URL);

  // Signals para estados reactivos modernos
  currentUser = signal<UserSession | null>(null);
  isAuthenticated = signal<boolean>(false);

  private get apiUrl(): string {
    return `${this.baseUrl}/auth`;
  }

  constructor() {
    this.loadSessionFromStorage();
  }

  /**
   * Intenta iniciar sesión contra el backend de Supabase.
   */
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(res => {
        if (res.success && res.user) {
          this.currentUser.set(res.user);
          this.isAuthenticated.set(true);
          
          // Guardar tokens y sesión de forma local
          localStorage.setItem('fiscalia_token', res.session.access_token);
          localStorage.setItem('fiscalia_user', JSON.stringify(res.user));
        }
      })
    );
  }

  /**
   * Cierra la sesión activa del usuario y limpia todo el almacenamiento local.
   */
  logout() {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    localStorage.removeItem('fiscalia_token');
    localStorage.removeItem('fiscalia_user');
  }

  /**
   * Recupera de forma proactiva la sesión desde localStorage al inicializar la app.
   */
  private loadSessionFromStorage() {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('fiscalia_token');
      const userStr = localStorage.getItem('fiscalia_user');
      
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr) as UserSession;
          this.currentUser.set(user);
          this.isAuthenticated.set(true);
        } catch (e) {
          this.logout();
        }
      }
    }
  }
}
