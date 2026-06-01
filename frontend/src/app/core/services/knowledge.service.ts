import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class KnowledgeService {
  private baseApiUrl = 'http://localhost:8000/api/v1';

  constructor(private http: HttpClient) {}

  // =====================================================================
  // GESTIÓN DE CATEGORÍAS
  // =====================================================================

  getCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseApiUrl}/categories/`);
  }

  getCategoryById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseApiUrl}/categories/${id}`);
  }

  createCategory(category: any): Observable<any> {
    return this.http.post<any>(`${this.baseApiUrl}/categories/`, category);
  }

  updateCategory(id: string, category: any): Observable<any> {
    return this.http.put<any>(`${this.baseApiUrl}/categories/${id}`, category);
  }

  deleteCategory(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseApiUrl}/categories/${id}`);
  }

  // =====================================================================
  // GESTIÓN DE DOCUMENTOS
  // =====================================================================

  getDocuments(activeOnly: boolean = false): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseApiUrl}/documents/`, {
      params: { active_only: activeOnly.toString() }
    });
  }

  getDocumentById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseApiUrl}/documents/${id}`);
  }

  createDocument(document: any): Observable<any> {
    return this.http.post<any>(`${this.baseApiUrl}/documents/`, document);
  }

  updateDocument(id: string, document: any): Observable<any> {
    return this.http.put<any>(`${this.baseApiUrl}/documents/${id}`, document);
  }

  deleteDocument(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseApiUrl}/documents/${id}`);
  }

  // =====================================================================
  // GESTIÓN DE TUTORIALES
  // =====================================================================

  getTutorials(activeOnly: boolean = false): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseApiUrl}/tutorials/`, {
      params: { active_only: activeOnly.toString() }
    });
  }

  getTutorialById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseApiUrl}/tutorials/${id}`);
  }

  createTutorial(tutorial: any): Observable<any> {
    return this.http.post<any>(`${this.baseApiUrl}/tutorials/`, tutorial);
  }

  updateTutorial(id: string, tutorial: any): Observable<any> {
    return this.http.put<any>(`${this.baseApiUrl}/tutorials/${id}`, tutorial);
  }

  deleteTutorial(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseApiUrl}/tutorials/${id}`);
  }
}
