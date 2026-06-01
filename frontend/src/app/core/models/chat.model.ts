export interface ChatSource {
  content: string;
  file_name?: string;
  page?: number;
}

export interface ChatRequest {
  question: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
  model_used: string;
  fragments_found: number;
}

export interface ChatMessage {
  id?: string;
  sesion_id?: string;
  rol: 'user' | 'assistant';
  contenido: string;
  fuentes_usadas?: ChatSource[];
  creado_at?: string | Date;
}

/** Evento SSE recibido del endpoint /chat/ask-stream */
export interface StreamEvent {
  token: string;
  done: boolean;
  sources?: ChatSource[];
  fragments_found?: number;
}
