import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Document, DocumentUploadResponse } from '../models/document.model';
import { API_URL } from '../tokens/api.token';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_URL);

  private get apiUrl(): string {
    return `${this.baseUrl}/documents`;
  }

  /**
   * Obtiene todos los documentos registrados.
   * Permite filtrar opcionalmente solo los documentos activos.
   */
  getAll(activeOnly: boolean = false): Observable<Document[]> {
    const params = new HttpParams().set('active_only', activeOnly.toString());
    return this.http.get<Document[]>(`${this.apiUrl}/`, { params });
  }

  /**
   * Obtiene los metadatos de un documento por su ID.
   */
  getById(id: string): Observable<Document> {
    return this.http.get<Document>(`${this.apiUrl}/${id}`);
  }

  /**
   * Registra metadatos de un documento en la base de datos.
   */
  create(document: Document): Observable<Document> {
    return this.http.post<Document>(`${this.apiUrl}/`, document);
  }

  /**
   * Actualiza los datos de un documento.
   */
  update(id: string, document: Partial<Document>): Observable<Document> {
    return this.http.put<Document>(`${this.apiUrl}/${id}`, document);
  }

  /**
   * Elimina permanentemente el registro de un documento.
   */
  delete(id: string): Observable<{ message: string; id: string }> {
    return this.http.delete<{ message: string; id: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Carga un archivo físico (.pdf, .docx) para ser procesado e indexado en el pipeline RAG (ChromaDB).
   * Este método usa FormData para el envío multipart/form-data.
   * 
   * IMPORTANTE - FLUJO DE DOS PASOS:
   * 1. Este método 'upload' envía el archivo físico al backend. El backend extrae el texto,
   *    lo fragmenta y guarda los embeddings directamente en ChromaDB. Retorna el nombre de archivo
   *    procesado, número de fragmentos y estado de éxito.
   * 2. Posteriormente, para persistir el documento en el listado administrativo del panel,
   *    se debe llamar al método 'create()' de este mismo servicio, registrando el metadato
   *    del documento en Supabase.
   */
  upload(file: File): Observable<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    // El endpoint de carga suele estar bajo '/chat/upload-document' en el RAG
    return this.http.post<DocumentUploadResponse>(`${this.baseUrl}/chat/upload-document`, formData);
  }
}
