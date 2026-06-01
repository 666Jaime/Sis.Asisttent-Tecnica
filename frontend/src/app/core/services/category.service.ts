import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Category } from '../models/category.model';
import { API_URL } from '../tokens/api.token';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_URL);

  private get apiUrl(): string {
    return `${this.baseUrl}/categories`;
  }

  /**
   * Obtiene la lista completa de categorías ordenadas alfabéticamente.
   */
  getAll(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/`);
  }

  /**
   * Obtiene los detalles de una categoría específica por su UUID.
   */
  getById(id: string): Observable<Category> {
    return this.http.get<Category>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crea una nueva categoría con nombre único.
   */
  create(category: Category): Observable<Category> {
    return this.http.post<Category>(`${this.apiUrl}/`, category);
  }

  /**
   * Actualiza parcialmente los datos de una categoría.
   */
  update(id: string, category: Partial<Category>): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/${id}`, category);
  }

  /**
   * Elimina permanentemente una categoría si no contiene registros dependientes.
   */
  delete(id: string): Observable<{ message: string; id: string }> {
    return this.http.delete<{ message: string; id: string }>(`${this.apiUrl}/${id}`);
  }
}
