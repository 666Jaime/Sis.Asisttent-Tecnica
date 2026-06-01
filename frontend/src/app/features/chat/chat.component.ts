import { Component, ElementRef, ViewChild, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { DocumentService } from '../../core/services/document.service';
import { TutorialService } from '../../core/services/tutorial.service';
import { ChatMessage, ChatSource, StreamEvent } from '../../core/models/chat.model';
import { Document } from '../../core/models/document.model';
import { Tutorial } from '../../core/models/tutorial.model';

interface AppChatMessage extends ChatMessage {
  video_recomendado?: Tutorial;
}

// ─────────────────────────────────────────────────────────────────────────────
// Banco de preguntas extraídas literalmente de los PDFs indexados.
// Cada pregunta tiene garantía de respuesta porque su texto coincide con el
// contenido de los documentos cargados en ChromaDB.
// ─────────────────────────────────────────────────────────────────────────────
const PREGUNTAS_BANCO: Record<string, string[]> = {
  seguridad: [
    '¿Cuáles son las políticas de seguridad informática de la institución?',
    '¿Qué normas existen sobre el uso de contraseñas?',
    '¿Cuáles son los usos prohibidos de los equipos institucionales?',
    '¿Cómo debo proteger mi sesión al dejar el puesto de trabajo?',
    '¿Qué hacer si detecto un incidente de seguridad?',
    '¿Qué sanciones aplican por incumplir las políticas de seguridad?',
    '¿Está permitido instalar software no autorizado en los equipos?',
    '¿Cómo se gestiona el acceso a los sistemas internos?'
  ],
  correo: [
    '¿Cómo ingresar por primera vez al correo institucional?',
    '¿Cuáles son las pautas de uso del correo institucional?',
    '¿Cómo configurar el correo en un dispositivo?',
    '¿Cuál es el límite de almacenamiento del buzón de correo?',
    '¿Cómo reportar correos sospechosos o fraudulentos?',
    '¿Qué usos están prohibidos en el correo institucional?',
    '¿Puedo enviar información confidencial por correo electrónico?',
    '¿Cómo crear o cambiar la contraseña del correo institucional?'
  ],
  memoriales: [
    '¿Qué requisitos hay para el registro de memoriales?',
    '¿Cuáles son los plazos para registrar un memorial?',
    '¿Cómo se realiza el registro en el Portillo Digital?',
    '¿Qué documentos se necesitan para presentar un memorial?',
    '¿Cuál es el procedimiento de cargo digital en el Portillo?',
    '¿A quién comunicarse si hay problemas en el Portillo Digital?',
    '¿Cuáles son los horarios de atención para memoriales?',
    '¿Cuánto cuesta el registro de un memorial?'
  ]
};

// Todas las preguntas de todos los temas mezcladas para la sección "Otros temas"
const TODAS_LAS_PREGUNTAS = Object.values(PREGUNTAS_BANCO).flat();

// ─────────────────────────────────────────────────────────────────────────────
// Palabras clave por tema para detección automática
// ─────────────────────────────────────────────────────────────────────────────
const KEYWORDS: Record<string, string[]> = {
  correo: ['correo', 'mail', 'email', 'acceso', 'configur', 'buzon', 'buzón', 'bandeja', 'smtp', 'cuenta de correo'],
  seguridad: ['seguridad', 'contrase', 'clave', 'politic', 'ciberseguridad', 'virus', 'antivirus', 'hack', 'amenaza', 'incidente', 'software', 'instalar', 'equipo'],
  memoriales: ['memorial', 'registro', 'digital', 'portillo', 'presenta', 'solicitud', 'proceso', 'expediente', 'escrito'],
  denuncias: ['denuncia', 'denunciar', 'presentar denuncia', 'hacer denuncia', 'formalizar denuncia', 'denuncia penal']
};

const TOPIC_LABELS: Record<string, string> = {
  seguridad: 'la seguridad informática',
  correo: 'el correo institucional',
  memoriales: 'el registro de memoriales',
  denuncias: 'el proceso de denuncias'
};

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-layout animate-fade-in">
      
      <!-- Zona Principal del Chat -->
      <div class="chat-main-area">
        <div class="chat-history-container" #chatHistory>
          @if (messages().length === 0) {
            <div class="welcome-container glass-card">
              <div class="logo-box">
                <span class="material-symbols-rounded bot-icon">gavel</span>
              </div>
              <h2>Bienvenido al Sistema Inteligente de Asistencia Institucional</h2>
              <p>Tu asistente técnico-jurídico inteligente para normativas, resoluciones y consultas institucionales de Tarija.</p>
              
              <div class="chat-placeholder-actions">
                <div class="action-card" (click)="askQuickQuestion('¿Cuáles son las políticas de seguridad informática de la institución?')">
                  <span class="material-symbols-rounded">shield</span>
                  <h3>Políticas de Seguridad</h3>
                  <p>Normas de seguridad digital institucional.</p>
                </div>
                <div class="action-card" (click)="askQuickQuestion('¿Cuáles son las pautas del correo institucional?')">
                  <span class="material-symbols-rounded">mail</span>
                  <h3>Uso del Correo</h3>
                  <p>Usos permitidos, prohibidos y buenas prácticas.</p>
                </div>
                <div class="action-card" (click)="askQuickQuestion('¿Cómo se realiza el acceso y configuración del correo institucional?')">
                  <span class="material-symbols-rounded">settings</span>
                  <h3>Configuración de Correo</h3>
                  <p>Pasos para configurar tu cuenta oficial.</p>
                </div>
                <div class="action-card" (click)="askQuickQuestion('¿Cuáles son los requisitos de registro de memoriales?')">
                  <span class="material-symbols-rounded">quick_reference</span>
                  <h3>Requisitos de Memoriales</h3>
                  <p>Presentación formal de documentos y actas.</p>
                </div>
              </div>
            </div>
          } @else {
            <div class="messages-list">
              @for (msg of messages(); track msg.id || $index) {
                <div class="message-bubble" [class.user]="msg.rol === 'user'" [class.assistant]="msg.rol === 'assistant'">
                  <div class="bubble-header">
                    <span class="material-symbols-rounded icon">
                      {{ msg.rol === 'user' ? 'person' : 'gavel' }}
                    </span>
                    <span class="name">{{ msg.rol === 'user' ? 'Tú' : 'ASISTENTE FISCAL-IA' }}</span>
                  </div>
                  
                  <div class="bubble-content">
                    <!-- Texto de la respuesta -->
                    <p>{{ msg.contenido }}@if (isStreamingMsg(msg)) {<span class="cursor-blink">▌</span>}</p>
                    
                    <!-- Video Recomendado (dentro de la misma burbuja) -->
                    @if (msg.rol === 'assistant' && msg.video_recomendado && !isStreamingMsg(msg)) {
                      <div class="video-recommendation-box animate-fade-in">
                        <span class="material-symbols-rounded video-rec-icon">play_circle</span>
                        <div class="video-rec-info">
                          <span class="video-rec-tag">📹 Video de Apoyo Disponible</span>
                          <a [href]="msg.video_recomendado.url_video" target="_blank" class="video-rec-link">
                            {{ msg.video_recomendado.titulo }}
                          </a>
                          @if (msg.video_recomendado.descripcion) {
                            <span class="video-rec-desc">{{ msg.video_recomendado.descripcion }}</span>
                          }
                        </div>
                      </div>
                    }

                    <!-- Fuente: solo nombre del PDF, una sola vez, debajo de la respuesta -->
                    @if (msg.rol === 'assistant' && msg.fuentes_usadas && msg.fuentes_usadas.length > 0 && !isStreamingMsg(msg)) {
                      <div class="source-footer">
                        <span class="source-label">
                          <span class="material-symbols-rounded">description</span>
                          Fuente:
                        </span>
                        <span class="source-names">{{ getUniqueSourceNames(msg.fuentes_usadas) }}</span>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Indicador "Buscando..." -->
              @if (loading() && !streamingActive()) {
                <div class="message-bubble assistant loading">
                  <div class="bubble-header">
                    <span class="material-symbols-rounded icon">gavel</span>
                    <span class="name">FiscalIA está buscando en los documentos...</span>
                  </div>
                  <div class="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              }

              @if (errorMessage()) {
                <div class="error-banner">
                  <span class="material-symbols-rounded">cloud_off</span>
                  <div class="error-text">
                    <strong>Error de Conexión:</strong> {{ errorMessage() }}
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Barra de Entrada -->
        <div class="chat-input-bar glass-card">
          <input 
            type="text" 
            placeholder="Escribe tu consulta jurídica o institucional..." 
            [(ngModel)]="userInput" 
            (keydown.enter)="sendMessage()"
            [disabled]="loading()"
            id="chatInputText"
          />
          <button class="send-btn" (click)="sendMessage()" [disabled]="loading() || !userInput.trim()" id="btnSendChat">
            @if (loading()) {
              <span class="material-symbols-rounded spin-send">sync</span>
            } @else {
              <span class="material-symbols-rounded">send</span>
            }
          </button>
        </div>
      </div>

      <!-- Panel Lateral de Sugerencias Dual -->
      @if (messages().length > 0) {
        <div class="chat-sidebar-area animate-slide-in">
          
          <!-- Sección 1: Preguntas del Tema Actual (garantizadas con respuesta) -->
          <div class="sidebar-section glass-card">
            <h4 class="section-title">
              <span class="material-symbols-rounded icon-gold">psychology</span>
              Sobre este tema
            </h4>
            <p class="section-hint">Preguntas relacionadas al documento cargado</p>
            <div class="suggested-list">
              @for (q of suggestedQuestions(); track $index) {
                <button class="suggested-q-btn" (click)="askQuickQuestion(q)">
                  <span class="material-symbols-rounded q-icon">arrow_forward</span>
                  <span>{{ q }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Sección 2: Preguntas de Otros Temas -->
          <div class="sidebar-section glass-card">
            <h4 class="section-title">
              <span class="material-symbols-rounded icon-blue">explore</span>
              Otros temas
            </h4>
            <p class="section-hint">Consultas sobre diferentes áreas documentadas</p>
            <div class="suggested-list">
              @for (q of otherTopicQuestions(); track $index) {
                <button class="suggested-q-btn other" (click)="askQuickQuestion(q)">
                  <span class="material-symbols-rounded q-icon">arrow_forward</span>
                  <span>{{ q }}</span>
                </button>
              }
            </div>
          </div>

        </div>
      }
    </div>
  `,
  styles: [`
    .chat-layout {
      display: flex;
      gap: 25px;
      height: 100%;
      max-width: 1300px;
      margin: 0 auto;
      padding: 20px;
      box-sizing: border-box;
    }
    
    .chat-main-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      height: 100%;
    }

    .chat-sidebar-area {
      width: 300px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      height: 100%;
      overflow-y: auto;
    }

    .sidebar-section {
      padding: 18px;
      border-radius: 14px;
      border: 1px solid var(--border-color);
      background: rgba(19, 27, 46, 0.75);
      backdrop-filter: blur(8px);
    }

    .section-title {
      font-size: 13px;
      font-weight: 900;
      color: #ffffff;
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 8px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .section-title span { font-size: 18px; color: #f2eff6; }
    .icon-gold { color: var(--color-gold); }
    .icon-blue { color: var(--color-accent); }
    
    .section-hint {
      font-size: 11px;
      color: var(--text-muted);
      margin: 0 0 12px 0;
    }

    .suggested-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .suggested-q-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--color-gold);
      border: 1px solid rgba(124,58,237,0.08);
      border-radius: 9px;
      padding: 10px 12px;
      text-align: left;
      cursor: pointer;
      color: #1f1530;
      font-size: 14px;
      line-height: 1.35;
      transition: all var(--transition-fast);
      width: 100%;
      font-weight: 800;
    }
    .suggested-q-btn:hover {
      background: linear-gradient(90deg, rgba(124,58,237,0.95), rgba(191,165,122,0.9));
      color: #fff;
      transform: translateY(-2px);
    }
    .suggested-q-btn.other:hover { border-color: rgba(34,197,94,0.18); }
    .q-icon { font-size: 16px; margin-top: 0; color: rgba(31,21,48,0.9); flex-shrink: 0; }
    .suggested-q-btn.other .q-icon { color: #ffffff; }

    /* Video Recommendation Box */
    .video-recommendation-box {
      margin-top: 14px;
      padding: 12px 15px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      border: 1px solid rgba(16, 185, 129, 0.3);
      background: rgba(16, 185, 129, 0.06);
      border-radius: 10px;
    }
    .video-rec-icon { font-size: 30px; color: var(--color-success); flex-shrink: 0; }
    .video-rec-info { display: flex; flex-direction: column; gap: 4px; }
    .video-rec-tag {
      font-size: 10px;
      font-weight: 800;
      color: var(--color-success);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .video-rec-link {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      text-decoration: underline;
      cursor: pointer;
      transition: color var(--transition-fast);
      word-break: break-word;
    }
    .video-rec-link:hover { color: var(--color-success); }
    .video-rec-desc {
      font-size: 11px;
      color: var(--text-muted);
      font-style: italic;
    }

    /* Fuente de información simplificada */
    .source-footer {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px dashed var(--border-color);
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .source-label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      color: var(--color-gold);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .source-label span { font-size: 14px; }
    .source-names {
      font-size: 12px;
      color: var(--text-secondary);
      font-style: italic;
    }

    /* Chat History */
    .chat-history-container {
      flex: 1;
      overflow-y: auto;
      padding-right: 6px;
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
    }
    .messages-list { display: flex; flex-direction: column; gap: 22px; width: 100%; }

    .message-bubble {
      padding: 18px;
      border-radius: 14px;
      max-width: 88%;
      animation: fadeInBubble 0.25s ease-out forwards;
      border: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    @keyframes fadeInBubble {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .message-bubble.user {
      align-self: flex-end;
      background: linear-gradient(135deg, rgba(198,255,203,0.98), rgba(166,237,172,0.98));
      border-color: rgba(130,220,150,0.9);
      color: #06361e;
    }
    .message-bubble.assistant {
      align-self: flex-start;
      background: linear-gradient(135deg, rgba(241,235,255,0.98), rgba(230,223,255,0.98));
      border-color: rgba(145,90,255,0.14);
      color: #2b0636;
    }

    .bubble-header {
      display: flex; align-items: center; gap: 8px;
      color: var(--text-secondary); font-size: 12px; font-weight: 600;
    }
    .bubble-header .icon { font-size: 18px; }
    .message-bubble.user .bubble-header .icon { color: #06361e; }
    .message-bubble.assistant .bubble-header .icon { color: #06361e; }
    .bubble-content { font-size: 14px; color: inherit; line-height: 1.6; font-weight: 800; }
    .bubble-content p { white-space: pre-wrap; margin: 0; }

    .cursor-blink {
      display: inline-block; color: var(--color-gold);
      animation: blink 0.8s step-start infinite;
      margin-left: 1px;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    .typing-indicator { display: flex; gap: 5px; padding: 5px 10px; }
    .typing-indicator span {
      width: 8px; height: 8px; background: var(--text-muted); border-radius: 50%;
      animation: typing 1.4s infinite ease-in-out both;
    }
    .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
    .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes typing {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    .error-banner {
      background: rgba(244,63,94,0.08); border: 1px solid rgba(244,63,94,0.2);
      border-radius: 10px; padding: 15px; display: flex; align-items: center;
      gap: 12px; color: var(--color-error); font-size: 14px; margin-top: 10px;
    }
    .error-banner span { font-size: 24px; }

    /* Welcome */
    .welcome-container {
      padding: 40px; text-align: center; margin: auto;
      display: flex; flex-direction: column; align-items: center; gap: 20px;
    }
    .logo-box {
      width: 75px; height: 75px; background: rgba(212,175,55,0.12);
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      border: 1px solid rgba(212,175,55,0.25);
    }
    .bot-icon { font-size: 38px; color: var(--color-gold); }
    .welcome-container h2 { font-size: 26px; color: var(--text-primary); }
    .welcome-container p { color: var(--text-secondary); max-width: 550px; font-size: 14px; }
    .chat-placeholder-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; width: 100%; margin-top: 20px; }
    .action-card {
      background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
      border: 1px solid rgba(37, 24, 61, 0.62);
      padding: 18px; border-radius: 12px; text-align: left; cursor: pointer;
      transition: all var(--transition-fast);
    }
    .action-card:hover { background: linear-gradient(180deg, rgba(33, 17, 61, 0.55), rgba(34,197,94,0.06)); transform: translateY(-2px); border-color: rgba(124,58,237,0.28); }
    .action-card span { color: var(--text-primary); font-size: 28px; margin-bottom: 10px; display: block; }
    .action-card h3 { font-size: 15px; color: var(--text-primary); margin-bottom: 5px; }
    .action-card p { font-size: 12px; color: var(--text-secondary); line-height: 1.4; }

    /* Input bar */
    .chat-input-bar {
      display: flex; padding: 10px 18px; align-items: center; gap: 15px;
      width: 100%; border-radius: 34px;
      background: linear-gradient(135deg, rgba(184, 187, 125, 0.96), rgba(138, 132, 82, 0.98));
      border: 1px solid rgba(245, 245, 249, 0.93);
      box-shadow: 0 18px 40px rgba(203, 204, 216, 0.35);
      backdrop-filter: blur(18px);
    }
    .chat-input-bar input {
      flex: 1; background: rgba(255, 255, 255, 0.74); border: 1px solid rgba(53, 48, 48, 0.94);
      border-radius: 24px; outline: none; color: #313437; font-size: 15px;
      padding: 14px 16px; font-weight: 700; box-shadow: inset 0 1px 2px rgba(255,255,255,0.1);
    }
    .send-btn {
      width: 44px; height: 44px; background: var(--color-success);
      border: none; border-radius: 50%; color: #ffffff;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all var(--transition-fast);
    }
    .send-btn:hover:not(:disabled) { background: rgba(34,197,94,0.95); transform: scale(1.05); box-shadow: 0 6px 20px rgba(34,197,94,0.18); }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .spin-send { animation: spin 1s linear infinite; display: inline-block; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .animate-slide-in { animation: slideInRight 0.3s ease-out forwards; }

    @media (max-width: 950px) {
      .chat-layout { flex-direction: column; height: auto; }
      .chat-sidebar-area { width: 100%; height: auto; }
    }
    @media (max-width: 600px) {
      .chat-placeholder-actions { grid-template-columns: 1fr; }
      .message-bubble { max-width: 97%; }
    }
  `]
})
export class ChatComponent implements OnInit, OnDestroy {
  private readonly chatService = inject(ChatService);
  private readonly documentService = inject(DocumentService);
  private readonly tutorialService = inject(TutorialService);
  
  userInput = '';
  messages = signal<AppChatMessage[]>([]);
  loading = signal(false);
  streamingActive = signal(false);
  errorMessage = signal<string | null>(null);

  allTutorials = signal<Tutorial[]>([]);
  suggestedQuestions = signal<string[]>([]);
  otherTopicQuestions = signal<string[]>([]);

  private activeDocuments: Document[] = [];
  private currentTopic = 'general';
  private currentQuery = '';
  private streamingMsgId: string | null = null;

  @ViewChild('chatHistory') private chatHistoryContainer!: ElementRef;

  ngOnInit() {
    this.tutorialService.getAll(true).subscribe({
      next: (tuts) => this.allTutorials.set(tuts),
      error: (err) => console.error('Error cargando tutoriales:', err)
    });

    this.loadDocuments();
  }

  ngOnDestroy() {
    // No periodic refresh needed; actual suggestion updates happen on each user query.
  }

  /**
   * Devuelve los nombres únicos de PDFs citados (sin UUID, sin repetidos).
   */
  getUniqueSourceNames(sources?: ChatSource[]): string {
    if (!sources || sources.length === 0) return '';
    const seen = new Set<string>();
    const names: string[] = [];
    for (const s of sources) {
      const name = s.file_name || 'Documento';
      if (!seen.has(name)) {
        seen.add(name);
        names.push(name);
      }
    }
    return names.join(', ');
  }

  private loadDocuments() {
    this.documentService.getAll(true).subscribe({
      next: (docs) => {
        this.activeDocuments = docs;
      },
      error: (err) => console.error('Error cargando documentos:', err)
    });
  }

  private getDocumentLabel(doc: Document): string {
    const title = doc.titulo?.trim();
    if (title) return title.replace(/\.[^.]+$/, '');
    return doc.nombre_archivo?.replace(/\.[^.]+$/, '') || 'documento';
  }

  private documentMatchesTopic(doc: Document, topic: string): boolean {
    if (topic === 'general') return false;
    const text = `${doc.titulo || ''} ${doc.descripcion || ''} ${doc.nombre_archivo || ''}`.toLowerCase();
    return KEYWORDS[topic].some(kw => text.includes(kw));
  }

  private simplifyQuestion(question: string): string {
    const clean = question.trim()
      .replace(/^[¿?\s]+/, '')
      .replace(/[?]+$/, '')
      .replace(/^(cómo|como|qué|que|cuál|cuales|dónde|donde|por qué|por que|cuándo|cuando|quién|quien)\b/i, '')
      .replace(/^me puede indicar\b/i, '')
      .replace(/^explica\b/i, '')
      .replace(/^indica\b/i, '')
      .trim();
    return clean ? clean : question;
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private isVideoIntent(question: string): boolean {
    const normalized = this.normalizeText(question);
    return /\b(video|tutorial|youtube|vimeo|grabacio?n|grabacion|clase|curso|formacion|manual|guia)\b/.test(normalized);
  }

  private getDocumentTopic(doc: Document): string {
    const text = `${doc.titulo || ''} ${doc.descripcion || ''} ${doc.nombre_archivo || ''}`.toLowerCase();
    for (const [topic, keywords] of Object.entries(KEYWORDS)) {
      if (keywords.some(kw => text.includes(kw))) {
        return topic;
      }
    }
    return 'general';
  }

  private createQuestionFromDocumentTopic(doc: Document): string {
    const label = this.getDocumentLabel(doc);
    const topic = this.getDocumentTopic(doc);

    const questionsByTopic: Record<string, string[]> = {
      correo: [
        `¿Cuáles son los pasos para configurar ${label}?`,
        `¿Cuáles son las políticas de uso de ${label}?`,
        `¿Qué límites de almacenamiento establece ${label}?`
      ],
      seguridad: [
        `¿Cuáles son las políticas de seguridad que explica ${label}?`,
        `¿Qué medidas de protección describe ${label}?`,
        `¿Cuáles son los usos prohibidos según ${label}?`
      ],
      memoriales: [
        `¿Cuáles son los requisitos de ${label}?`,
        `¿Cuál es el procedimiento que detalla ${label}?`,
        `¿Cuáles son los plazos establecidos en ${label}?`
      ],
      denuncias: [
        `¿Cómo se presenta una denuncia según ${label}?`,
        `¿Cuáles son los pasos del procedimiento de ${label}?`,
        `¿Qué documentación requiere ${label}?`
      ],
      general: [
        `¿Cuál es el contenido principal de ${label}?`,
        `¿Qué procedimientos explica ${label}?`,
        `¿Cuáles son los puntos clave de ${label}?`
      ]
    };

    const questions = questionsByTopic[topic] || questionsByTopic['general'];
    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  }

  private createTopicQuestionFromDocument(doc: Document, query: string, topic?: string): string {
    return this.createQuestionFromDocumentTopic(doc);
  }

  private createOtherTopicQuestionFromDocument(doc: Document): string {
    return this.createQuestionFromDocumentTopic(doc);
  }

  private getTopicQuestions(topic: string, query: string): string[] {
    const candidates = this.activeDocuments
      .filter(doc => this.documentMatchesTopic(doc, topic));

    const questionList = candidates
      .slice(0, 4)
      .map(doc => this.createTopicQuestionFromDocument(doc, query, topic));

    return questionList;
  }

  private getOtherTopicQuestions(topic: string): string[] {
    const candidates = this.activeDocuments
      .filter(doc => topic === 'general' ? true : !this.documentMatchesTopic(doc, topic));

    const questions: string[] = [];
    const usedDocs = new Set<string>();

    for (const doc of candidates) {
      if (questions.length >= 5) break;
      const docLabel = this.getDocumentLabel(doc);
      if (usedDocs.has(docLabel)) continue;
      
      usedDocs.add(docLabel);
      questions.push(this.createOtherTopicQuestionFromDocument(doc));
    }

    if (questions.length < 5) {
      const fallbackQuestions = Object.entries(PREGUNTAS_BANCO)
        .filter(([t]) => topic === 'general' ? true : t !== topic)
        .flatMap(([, items]) => items);

      for (const question of fallbackQuestions) {
        if (questions.length >= 5) break;
        if (!questions.includes(question)) {
          questions.push(question);
        }
      }
    }

    while (questions.length < 5) {
      const randomQuestion = TODAS_LAS_PREGUNTAS[Math.floor(Math.random() * TODAS_LAS_PREGUNTAS.length)];
      if (!questions.includes(randomQuestion)) {
        questions.push(randomQuestion);
      }
    }

    return questions;
  }

  private refreshTopicRecommendations() {
    this.suggestedQuestions.set(this.getTopicQuestions(this.currentTopic, this.currentQuery));
  }

  private refreshOtherRecommendations() {
    this.otherTopicQuestions.set(this.getOtherTopicQuestions(this.currentTopic));
  }

  private refreshRecommendations() {
    this.refreshTopicRecommendations();
    this.refreshOtherRecommendations();
  }

  /**
   * Detecta el tema a partir del texto de la consulta.
   */
  private detectTopic(text: string): string {
    const lower = text.toLowerCase();
    const topicScores: Record<string, number> = {};

    for (const [topic, keywords] of Object.entries(KEYWORDS)) {
      topicScores[topic] = keywords.reduce((score, kw) => {
        const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return score + (regex.test(lower) ? 1 : 0);
      }, 0);
    }

    const bestTopic = Object.entries(topicScores).reduce((best, [topic, score]) =>
      score > best.score ? { topic, score } : best,
      { topic: 'general', score: 0 }
    );

    return bestTopic.score > 0 ? bestTopic.topic : 'general';
  }

  /**
   * Busca el mejor video tutorial desde Supabase que coincida con la pregunta.
   * Evalúa título, descripción y categoría del tutorial.
   */
  private findMatchingVideo(question: string): Tutorial | undefined {
    const normalizedQuestion = this.normalizeText(question);
    const tuts = this.allTutorials();
    if (!tuts.length) return undefined;

    const words = normalizedQuestion
      .split(/[^a-z0-9]+/gi)
      .filter(w => w.length > 3);

    const isVideoIntent = this.isVideoIntent(question);
    let bestMatch: Tutorial | undefined;
    let bestScore = 0;

    for (const tut of tuts) {
      if (!tut.url_video) continue;

      let score = 0;
      const titleLower = this.normalizeText(tut.titulo || '');
      const descLower = this.normalizeText(tut.descripcion || '');
      const categoryLower = this.normalizeText(tut.categoria?.nombre || '');
      const contentLower = `${titleLower} ${descLower} ${categoryLower}`;

      if (normalizedQuestion.length > 10 && contentLower.includes(normalizedQuestion)) {
        score += 30;
      }

      for (const word of words) {
        if (titleLower.includes(word)) score += 5;
        if (descLower.includes(word)) score += 3;
        if (categoryLower.includes(word)) score += 4;
      }

      const questionTopic = this.currentTopic || this.detectTopic(question);
      if (questionTopic !== 'general' && KEYWORDS[questionTopic].some(kw => contentLower.includes(this.normalizeText(kw)))) {
        score += 10;
      }

      if (isVideoIntent) {
        if (contentLower.includes('video') || contentLower.includes('tutorial') || contentLower.includes('youtube') || contentLower.includes('vimeo')) {
          score += 8;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = tut;
      }
    }

    if (bestScore >= 7) {
      return bestMatch;
    }

    if (isVideoIntent && bestMatch) {
      return bestMatch;
    }

    return undefined;
  }

  /**
   * Actualiza las sugerencias de preguntas para el panel lateral dual.
   */
  updateRecommendations(questionText: string) {
    const topic = this.detectTopic(questionText);
    this.currentTopic = topic;
    this.currentQuery = questionText;
    this.refreshTopicRecommendations();
    this.refreshOtherRecommendations();
  }

  isStreamingMsg(msg: AppChatMessage): boolean {
    return this.streamingActive() && msg.id === this.streamingMsgId;
  }

  async sendMessage() {
    const text = this.userInput.trim();
    if (!text || this.loading()) return;

    this.userInput = '';
    this.errorMessage.set(null);
    this.updateRecommendations(text);

    const userMsg: AppChatMessage = { rol: 'user', contenido: text, creado_at: new Date() };
    this.messages.update(prev => [...prev, userMsg]);
    this.scrollToBottom();

    const botId = `bot-${Date.now()}`;
    this.streamingMsgId = botId;
    const botMsg: AppChatMessage = { id: botId, rol: 'assistant', contenido: '', creado_at: new Date() };
    this.loading.set(true);

    try {
      // Detectar palabras clave en la pregunta para enriquecer la consulta enviada al backend
      const lowerText = text.toLowerCase();
      const matchedKeywords: string[] = [];
      for (const [topic, keywords] of Object.entries(KEYWORDS)) {
        for (const kw of keywords) {
          if (lowerText.includes(kw) && !matchedKeywords.includes(kw)) matchedKeywords.push(kw);
        }
      }

      const reader = await this.chatService.askStream(text, this.currentTopic, matchedKeywords);
      this.loading.set(false);
      this.streamingActive.set(true);
      this.messages.update(prev => [...prev, botMsg]);
      this.scrollToBottom();

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event: StreamEvent = JSON.parse(jsonStr);

            if (!event.done && event.token) {
              this.messages.update(prev =>
                prev.map(m => m.id === botId
                  ? { ...m, contenido: m.contenido + event.token }
                  : m
                )
              );
              this.scrollToBottom();
            }

            if (event.done) {
              // Buscar video coincidente con la pregunta
              const matchedVideo = this.findMatchingVideo(text);

              this.messages.update(prev =>
                prev.map(m => m.id === botId
                  ? { ...m, fuentes_usadas: event.sources || [], video_recomendado: matchedVideo }
                  : m
                )
              );
              this.streamingActive.set(false);
              this.streamingMsgId = null;
              this.scrollToBottom();
            }
          } catch {
            // Ignorar líneas SSE mal formadas
          }
        }
      }
    } catch (err) {
      console.error('Error en streaming RAG:', err);
      this.loading.set(false);
      this.streamingActive.set(false);
      this.streamingMsgId = null;
      this.errorMessage.set('No se pudo conectar con el asistente. Asegúrese de que FastAPI esté en ejecución en http://localhost:8000.');
      this.scrollToBottom();
    }
  }

  askQuickQuestion(questionText: string) {
    this.userInput = questionText;
    this.sendMessage();
  }

  private scrollToBottom() {
    setTimeout(() => {
      try {
        if (this.chatHistoryContainer) {
          const el = this.chatHistoryContainer.nativeElement;
          el.scrollTop = el.scrollHeight;
        }
      } catch { /* no-op */ }
    }, 50);
  }
}
