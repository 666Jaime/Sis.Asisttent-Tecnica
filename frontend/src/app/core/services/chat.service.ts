import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatRequest, ChatResponse, ChatMessage, StreamEvent } from '../models/chat.model';
import { SystemStats } from '../models/stats.model';
import { API_URL } from '../tokens/api.token';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_URL);

  private get apiUrl(): string {
    return `${this.baseUrl}/chat`;
  }

  /**
   * Envía una pregunta al asistente inteligente (RAG Pipeline) — respuesta completa JSON.
   * Usar askStream() para experiencia de streaming token a token.
   */
  askQuestion(request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.apiUrl}/ask`, request);
  }

  /**
   * Streaming SSE: recibe la respuesta token a token.
   * Retorna un ReadableStream nativo usando fetch.
   * El frontend escucha eventos con el formato: { token, done, sources?, fragments_found? }
   */
  askStream(question: string, topic?: string, keywords?: string[]): Promise<ReadableStreamDefaultReader<string>> {
    const params = new URLSearchParams({ question });
    if (topic) params.set('topic', topic);
    if (keywords && keywords.length) params.set('keywords', keywords.join(','));

    const url = `${this.apiUrl}/ask-stream?${params.toString()}`;
    return fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'text/event-stream' }
    }).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.body!.pipeThrough(new TextDecoderStream()).getReader();
    });
  }

  /**
   * Obtiene las estadísticas de la base de conocimiento y diagnóstico del sistema
   * (documentos, tutoriales, categorías, total de fragmentos y estado).
   */
  getStats(): Observable<SystemStats> {
    return this.http.get<SystemStats>(`${this.apiUrl}/stats`);
  }

  /* 
   * NOTA: Los siguientes métodos están comentados porque apuntan a endpoints inexistentes en el backend actual (/chat/sessions/...).
   * Descomentar o implementar cuando el backend incorpore la base de datos de auditoría de sesiones.
   *
   * getMessagesBySession(sessionId: string): Observable<ChatMessage[]> {
   *   return this.http.get<ChatMessage[]>(`${this.apiUrl}/sessions/${sessionId}/messages`);
   * }
   *
   * getAuditSessions(): Observable<any[]> {
   *   return this.http.get<any[]>(`${this.apiUrl}/sessions/audit`);
   * }
   */
}
