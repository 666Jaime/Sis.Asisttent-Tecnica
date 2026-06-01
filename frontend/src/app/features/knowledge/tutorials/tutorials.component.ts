import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TutorialService } from '../../../core/services/tutorial.service';
import { Tutorial } from '../../../core/models/tutorial.model';

/** Extrae el ID del video de una URL de YouTube */
function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

@Component({
  selector: 'app-tutorials',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="knowledge-wrapper animate-fade-in">
      <div class="knowledge-header">
        <div>
          <h1>Gestión de Tutoriales</h1>
          <p>Registra videos de YouTube con descripción para que el personal de la Fiscalía los encuentre fácilmente.</p>
        </div>
        <button class="add-btn" id="btnOpenTutorialModal" (click)="openModal()">
          <span class="material-symbols-rounded">add_circle</span>
          <span>Registrar Tutorial</span>
        </button>
      </div>

      <!-- Alerta Offline -->
      @if (connectionError()) {
        <div class="offline-warning">
          <span class="material-symbols-rounded">cloud_off</span>
          <div><strong>Sin conexión:</strong> Mostrando contenido de muestra. Verifique que FastAPI esté activo.</div>
        </div>
      }

      @if (loading()) {
        <div class="loading-container">
          <span class="material-symbols-rounded spinner">sync</span>
          <p>Cargando tutoriales...</p>
        </div>
      } @else if (tutorials().length === 0) {
        <div class="empty-state glass-card">
          <span class="material-symbols-rounded empty-icon">smart_display</span>
          <h3>Sin tutoriales registrados</h3>
          <p>Agrega el primer tutorial de YouTube para que el personal pueda aprender los procedimientos institucionales.</p>
          <button class="add-btn sm" (click)="openModal()">
            <span class="material-symbols-rounded">add</span>
            <span>Añadir primer tutorial</span>
          </button>
        </div>
      } @else {
        <div class="tutorials-grid">
          @for (tut of tutorials(); track tut.id || $index) {
            <div class="tutorial-card glass-card">
              <!-- Thumbnail real de YouTube -->
              <div class="video-thumbnail">
                @if (getYouTubeId(tut.url_video)) {
                  <img
                    [src]="'https://img.youtube.com/vi/' + getYouTubeId(tut.url_video) + '/mqdefault.jpg'"
                    [alt]="tut.titulo"
                    class="yt-thumb"
                  />
                  <a [href]="tut.url_video" target="_blank" rel="noopener noreferrer" class="play-overlay">
                    <span class="material-symbols-rounded play-btn-icon">play_circle</span>
                  </a>
                } @else {
                  <div class="no-thumb">
                    <span class="material-symbols-rounded">smart_display</span>
                  </div>
                }
                <span class="yt-badge">
                  <span class="material-symbols-rounded yt-icon">play_circle</span>
                  YouTube
                </span>
              </div>
              <div class="tutorial-body">
                <h3>{{ tut.titulo }}</h3>
                <p>{{ tut.descripcion || 'Sin descripción.' }}</p>
                <div class="tutorial-meta">
                  <span class="status" [class.active]="tut.activo" [class.inactive]="!tut.activo">
                    {{ tut.activo ? '● Activo' : '○ Inactivo' }}
                  </span>
                </div>
                <div class="tutorial-actions">
                  @if (tut.url_video) {
                    <a [href]="tut.url_video" target="_blank" rel="noopener noreferrer" class="action-btn watch">
                      <span class="material-symbols-rounded">open_in_new</span> Ver Video
                    </a>
                  }
                  <button class="action-btn danger" (click)="deleteTutorial(tut)">
                    <span class="material-symbols-rounded">delete</span> Eliminar
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- ====== MODAL REGISTRAR TUTORIAL ====== -->
    @if (showModal()) {
      <div class="modal-backdrop animate-fade-in" (click)="closeModal()">
        <div class="modal-card glass-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>
              <span class="material-symbols-rounded">smart_display</span>
              Registrar Tutorial de YouTube
            </h3>
            <button class="close-btn" (click)="closeModal()">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>

          @if (saveSuccess()) {
            <div class="save-success animate-fade-in">
              <span class="material-symbols-rounded success-icon">check_circle</span>
              <div>
                <strong>Tutorial registrado correctamente</strong>
                <p>Ya está disponible en el catálogo de tutoriales.</p>
              </div>
            </div>
            <div class="modal-footer">
              <button class="add-btn" (click)="closeModal()">Aceptar</button>
            </div>
          } @else {
            <form [formGroup]="tutorialForm" (ngSubmit)="onSave()" class="tutorial-form">
              <!-- URL de YouTube -->
              <div class="form-group">
                <label for="url_video">URL de YouTube <span class="req">*</span></label>
                <div class="input-with-icon">
                  <span class="material-symbols-rounded field-icon">link</span>
                  <input type="url" id="url_video" formControlName="url_video"
                    placeholder="https://www.youtube.com/watch?v=..."
                    (input)="onUrlChange()" />
                </div>
                @if (tutorialForm.get('url_video')?.invalid && tutorialForm.get('url_video')?.touched) {
                  <span class="field-error">Ingrese una URL válida de YouTube</span>
                }
              </div>

              <!-- Preview de thumbnail -->
              @if (previewYtId()) {
                <div class="yt-preview animate-fade-in">
                  <img [src]="'https://img.youtube.com/vi/' + previewYtId() + '/mqdefault.jpg'" alt="Preview" class="preview-thumb" />
                  <div class="preview-info">
                    <span class="material-symbols-rounded preview-icon">check_circle</span>
                    <span>Video de YouTube detectado correctamente</span>
                  </div>
                </div>
              }

              <!-- Título -->
              <div class="form-group">
                <label for="titulo">Título descriptivo <span class="req">*</span></label>
                <input type="text" id="titulo" formControlName="titulo"
                  placeholder="Ej: Cómo registrar un memorial digital en el sistema" />
                @if (tutorialForm.get('titulo')?.invalid && tutorialForm.get('titulo')?.touched) {
                  <span class="field-error">El título es requerido</span>
                }
              </div>

              <!-- Descripción -->
              <div class="form-group">
                <label for="descripcion">Descripción <span class="req">*</span></label>
                <textarea id="descripcion" formControlName="descripcion" rows="3"
                  placeholder="Explica de qué trata este tutorial y para quién está dirigido..."></textarea>
                @if (tutorialForm.get('descripcion')?.invalid && tutorialForm.get('descripcion')?.touched) {
                  <span class="field-error">La descripción es requerida</span>
                }
              </div>

              <!-- Error -->
              @if (saveError()) {
                <div class="server-error">
                  <span class="material-symbols-rounded">error</span>
                  <span>{{ saveError() }}</span>
                </div>
              }

              <div class="modal-footer">
                <button type="button" class="cancel-btn" (click)="closeModal()">Cancelar</button>
                <button type="submit" class="add-btn" [disabled]="saving()">
                  @if (saving()) {
                    <span class="material-symbols-rounded spin">sync</span>
                    <span>Guardando...</span>
                  } @else {
                    <span class="material-symbols-rounded">save</span>
                    <span>Guardar Tutorial</span>
                  }
                </button>
              </div>
            </form>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .knowledge-wrapper { display: flex; flex-direction: column; gap: 25px; }
    .knowledge-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
    .knowledge-header h1 { font-size: 26px; color: var(--text-primary); }
    .knowledge-header p { color: var(--text-secondary); font-size: 14px; }

    .add-btn {
      display: flex; align-items: center; gap: 8px;
      background: var(--color-accent); color: white; border: none;
      padding: 11px 20px; border-radius: 9px; font-weight: 600; font-size: 14px;
      cursor: pointer; transition: all 0.2s; text-decoration: none;
    }
    .add-btn:hover:not(:disabled) { background: var(--color-accent-hover); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(59,130,246,0.28); }
    .add-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .add-btn.sm { margin-top: 12px; }

    .offline-warning { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); color: var(--color-warning); padding: 12px 18px; border-radius: 8px; display: flex; align-items: center; gap: 12px; font-size: 13px; }
    .loading-container { display: flex; flex-direction: column; align-items: center; padding: 60px; gap: 15px; color: var(--text-secondary); }
    .spinner { font-size: 40px; animation: spin 1.2s linear infinite; color: var(--color-accent); }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 60px 30px; text-align: center; gap: 10px; }
    .empty-icon { font-size: 52px; color: var(--text-muted); margin-bottom: 8px; }
    .empty-state h3 { font-size: 18px; color: var(--text-primary); }
    .empty-state p { color: var(--text-secondary); font-size: 14px; max-width: 380px; }

    /* GRID */
    .tutorials-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 24px; }
    .tutorial-card { overflow: hidden; display: flex; flex-direction: column; }

    .video-thumbnail { position: relative; height: 165px; overflow: hidden; background: var(--bg-tertiary); }
    .yt-thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
    .no-thumb { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 50px; }
    .play-overlay {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.35); opacity: 0; transition: opacity 0.25s;
    }
    .video-thumbnail:hover .play-overlay { opacity: 1; }
    .play-btn-icon { font-size: 56px; color: white; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5)); }
    .yt-badge {
      position: absolute; bottom: 10px; right: 10px;
      background: rgba(10,15,29,0.85); border: 1px solid var(--border-color);
      color: var(--text-primary); font-size: 11px; font-weight: 700;
      padding: 4px 9px; border-radius: 20px; display: flex; align-items: center; gap: 5px;
    }
    .yt-icon { font-size: 13px; color: #f00; }

    .tutorial-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
    .tutorial-body h3 { font-size: 15px; font-weight: 700; color: var(--text-primary); line-height: 1.35; }
    .tutorial-body p { font-size: 13px; color: var(--text-secondary); line-height: 1.45; flex: 1; }
    .tutorial-meta { border-top: 1px solid var(--border-color); padding-top: 10px; font-size: 12px; }
    .status.active { color: var(--color-success); font-weight: 600; }
    .status.inactive { color: var(--text-muted); }
    .tutorial-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .action-btn {
      background: none; border: 1px solid var(--border-color); color: var(--text-secondary);
      border-radius: 8px; padding: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      transition: all 0.2s; text-decoration: none;
    }
    .action-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
    .action-btn.watch:hover { color: var(--color-accent); border-color: var(--color-accent); }
    .action-btn.danger:hover { color: var(--color-error); background: rgba(244,63,94,0.1); border-color: rgba(244,63,94,0.2); }

    /* MODAL */
    .modal-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(5,8,18,0.75); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal-card { width: 100%; max-width: 540px; display: flex; flex-direction: column; gap: 22px; padding: 32px; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; }
    .modal-header h3 { display: flex; align-items: center; gap: 10px; font-size: 17px; color: var(--text-primary); }
    .modal-header h3 .material-symbols-rounded { color: var(--color-accent); }
    .close-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; border-radius: 6px; padding: 4px; transition: color 0.2s; }
    .close-btn:hover { color: var(--text-primary); }
    .close-btn .material-symbols-rounded { font-size: 22px; display: block; }

    .tutorial-form { display: flex; flex-direction: column; gap: 18px; }
    .form-group { display: flex; flex-direction: column; gap: 7px; }
    .form-group label { font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
    .req { color: var(--color-error); }
    .input-with-icon { position: relative; display: flex; align-items: center; }
    .field-icon { position: absolute; left: 12px; color: var(--text-muted); font-size: 19px; pointer-events: none; }
    .input-with-icon input { padding-left: 40px; }
    .form-group input, .form-group textarea {
      background: var(--bg-tertiary); border: 1px solid var(--border-color);
      border-radius: 8px; color: var(--text-primary); padding: 11px 14px;
      font-size: 14px; outline: none; transition: border-color 0.2s; resize: none;
      font-family: inherit; width: 100%; box-sizing: border-box;
    }
    .form-group input:focus, .form-group textarea:focus { border-color: var(--color-accent); }
    .field-error { font-size: 12px; color: var(--color-error); }

    .yt-preview { display: flex; gap: 16px; align-items: center; background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.2); border-radius: 10px; padding: 12px; }
    .preview-thumb { width: 100px; height: 56px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
    .preview-info { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-success); font-weight: 600; }
    .preview-icon { font-size: 18px; }

    .server-error { display: flex; align-items: center; gap: 10px; background: rgba(244,63,94,0.08); border: 1px solid rgba(244,63,94,0.2); color: var(--color-error); padding: 12px 16px; border-radius: 8px; font-size: 13px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding-top: 8px; border-top: 1px solid var(--border-color); }
    .cancel-btn { background: none; border: 1px solid var(--border-color); color: var(--text-secondary); padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; }
    .cancel-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
    .save-success { display: flex; align-items: flex-start; gap: 16px; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); color: var(--color-success); padding: 20px; border-radius: 10px; }
    .success-icon { font-size: 36px; flex-shrink: 0; }
    .save-success strong { display: block; font-size: 15px; margin-bottom: 4px; }
    .save-success p { font-size: 13px; color: var(--text-secondary); margin: 0; }
    .spin { animation: spin 1s linear infinite; display: inline-block; }
  `]
})
export class TutorialsComponent implements OnInit {
  private readonly tutorialService = inject(TutorialService);
  private readonly fb = inject(FormBuilder);

  tutorials = signal<Tutorial[]>([]);
  loading = signal(true);
  connectionError = signal(false);
  showModal = signal(false);
  saving = signal(false);
  saveSuccess = signal(false);
  saveError = signal('');
  previewYtId = signal<string | null>(null);

  tutorialForm: FormGroup = this.fb.group({
    url_video: ['', [Validators.required, Validators.pattern(/https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/)]],
    titulo: ['', Validators.required],
    descripcion: ['', Validators.required]
  });

  private mockTutorials: Tutorial[] = [
    { id: '1', titulo: 'Cómo Registrar un Memorial Digital', descripcion: 'Guía paso a paso para el registro e ingreso correcto de memoriales digitales.', url_video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', activo: true },
    { id: '2', titulo: 'Uso y Flujo del Portillo Digital', descripcion: 'Video explicativo detallando las transiciones del portillo digital para fiscales.', url_video: 'https://www.youtube.com/watch?v=9bZkp7q19f0', activo: true }
  ];

  ngOnInit() { this.loadTutorials(); }

  loadTutorials() {
    this.loading.set(true);
    this.tutorialService.getAll().subscribe({
      next: (res) => { this.tutorials.set(res); this.loading.set(false); this.connectionError.set(false); },
      error: () => { this.tutorials.set(this.mockTutorials); this.loading.set(false); this.connectionError.set(true); }
    });
  }

  getYouTubeId(url?: string): string | null {
    return url ? extractYouTubeId(url) : null;
  }

  onUrlChange() {
    const url = this.tutorialForm.get('url_video')?.value || '';
    this.previewYtId.set(extractYouTubeId(url));
  }

  openModal() {
    this.tutorialForm.reset();
    this.previewYtId.set(null);
    this.saveSuccess.set(false);
    this.saveError.set('');
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  onSave() {
    if (this.tutorialForm.invalid) { this.tutorialForm.markAllAsTouched(); return; }
    this.saving.set(true);
    this.saveError.set('');

    const payload: Tutorial = {
      ...this.tutorialForm.value,
      activo: true
    };

    this.tutorialService.create(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        this.loadTutorials();
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err?.error?.detail || 'Error al guardar el tutorial. Verifique el servidor.');
      }
    });
  }

  deleteTutorial(tut: Tutorial) {
    if (!tut.id) return;
    if (!confirm(`¿Eliminar el tutorial "${tut.titulo}"?`)) return;
    this.tutorialService.delete(tut.id).subscribe({
      next: () => this.loadTutorials(),
      error: () => alert('No se pudo eliminar el tutorial.')
    });
  }
}
