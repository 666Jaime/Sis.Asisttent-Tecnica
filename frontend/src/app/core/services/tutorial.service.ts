import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tutorial } from '../models/tutorial.model';
import { API_URL } from '../tokens/api.token';

@Injectable({
  providedIn: 'root'
})
export class TutorialService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_URL);

  private get apiUrl(): string {
    return `${this.baseUrl}/tutorials`;
  }

  /**
   * Obtiene la lista completa de tutoriales con sus categorías asociadas.
   */
  getAll(activeOnly: boolean = false): Observable<Tutorial[]> {
    const params = new HttpParams().set('active_only', activeOnly.toString());
    return this.http.get<Tutorial[]>(`${this.apiUrl}/`, { params });
  }

  /**
   * Obtiene los detalles y la categoría de un tutorial por su UUID.
   */
  getById(id: string): Observable<Tutorial> {
    return this.http.get<Tutorial>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crea un nuevo registro de video tutorial.
   */
  create(tutorial: Tutorial): Observable<Tutorial> {
    return this.http.post<Tutorial>(`${this.apiUrl}/`, tutorial);
  }

  /**
   * Actualiza parcialmente un tutorial existente.
   */
  update(id: string, tutorial: Partial<Tutorial>): Observable<Tutorial> {
    return this.http.put<Tutorial>(`${this.apiUrl}/${id}`, tutorial);
  }

  /**
   * Elimina permanentemente un tutorial.
   */
  delete(id: string): Observable<{ message: string; id: string }> {
    return this.http.delete<{ message: string; id: string }>(`${this.apiUrl}/${id}`);
  }
}
