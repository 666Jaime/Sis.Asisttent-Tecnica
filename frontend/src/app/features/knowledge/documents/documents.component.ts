import { Component, OnInit, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DocumentService } from '../../../core/services/document.service';
import { Document, DocumentUploadResponse } from '../../../core/models/document.model';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="knowledge-wrapper animate-fade-in">
      <div class="knowledge-header">
        <div>
          <h1>Gestión de Documentos</h1>
          <p>Indexa archivos PDF o Word para que el asistente pueda responder preguntas sobre ellos.</p>
        </div>
        <button class="add-btn" id="btnOpenUploadModal" (click)="openModal()">
          <span class="material-symbols-rounded">upload_file</span>
          <span>Cargar Documento</span>
        </button>
      </div>

      <!-- Alerta Offline -->
      @if (connectionError()) {
        <div class="offline-warning">
          <span class="material-symbols-rounded">cloud_off</span>
          <div><strong>Sin conexión al servidor:</strong> Mostrando catálogo de muestra. Verifique que FastAPI esté activo.</div>
        </div>
      }

      @if (loading()) {
        <div class="loading-container">
          <span class="material-symbols-rounded spinner">sync</span>
          <p>Cargando documentos indexados...</p>
        </div>
      } @else if (documents().length === 0) {
        <div class="empty-state glass-card">
          <span class="material-symbols-rounded empty-icon">folder_open</span>
          <h3>Sin documentos indexados</h3>
          <p>Carga tu primer archivo PDF o Word para que el chatbot pueda utilizarlo como fuente de conocimiento.</p>
          <button class="add-btn sm" (click)="openModal()">
            <span class="material-symbols-rounded">add</span>
            <span>Subir primer documento</span>
          </button>
        </div>
      } @else {
        <div class="table-container glass-card">
          <table class="knowledge-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Archivo</th>
                <th>Tipo</th>
                <th>Estado RAG</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (doc of documents(); track doc.id || $index) {
                <tr>
                  <td><strong>{{ doc.titulo }}</strong></td>
                  <td class="file-name">{{ doc.nombre_archivo }}</td>
                  <td>
                    <span class="badge" [class.pdf]="doc.tipo_archivo.toLowerCase().includes('pdf')" [class.docx]="!doc.tipo_archivo.toLowerCase().includes('pdf')">
                      {{ doc.tipo_archivo.toUpperCase() }}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge" [class.active]="doc.activo" [class.inactive]="!doc.activo">
                      <span class="material-symbols-rounded status-dot">{{ doc.activo ? 'check_circle' : 'cancel' }}</span>
                      {{ doc.activo ? 'Indexado' : 'Inactivo' }}
                    </span>
                  </td>
                  <td>
                    <div class="actions">
                      <button class="action-icon-btn danger" title="Eliminar documento" (click)="deleteDocument(doc)">
                        <span class="material-symbols-rounded">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <!-- ====== MODAL DE CARGA ====== -->
    @if (showModal()) {
      <div class="modal-backdrop animate-fade-in" (click)="closeModal()">
        <div class="modal-card glass-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>
              <span class="material-symbols-rounded">upload_file</span>
              Cargar Nuevo Documento
            </h3>
            <button class="close-btn" (click)="closeModal()">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>

          <!-- Estado de éxito post-upload -->
          @if (uploadSuccess()) {
            <div class="upload-success animate-fade-in">
              <span class="material-symbols-rounded success-icon">check_circle</span>
              <div>
                <strong>¡Documento indexado correctamente!</strong>
                <p>{{ uploadResult()?.fragments_indexed || 0 }} fragmentos añadidos a la base de conocimiento.</p>
              </div>
            </div>
            <div class="modal-footer">
              <button class="add-btn" (click)="closeModal()">Aceptar</button>
            </div>
          } @else {
            <form [formGroup]="uploadForm" (ngSubmit)="onUpload()" class="upload-form">
              <!-- Campo: Título descriptivo -->
              <div class="form-group">
                <label for="titulo">Título descriptivo <span class="req">*</span></label>
                <input type="text" id="titulo" formControlName="titulo"
                  placeholder="Ej: Manual de Procedimiento Penal 2026" />
                @if (uploadForm.get('titulo')?.invalid && uploadForm.get('titulo')?.touched) {
                  <span class="field-error">El título es requerido</span>
                }
              </div>

              <!-- Campo: Descripción -->
              <div class="form-group">
                <label for="descripcion">Descripción (opcional)</label>
                <textarea id="descripcion" formControlName="descripcion" rows="2"
                  placeholder="Breve resumen del contenido del documento..."></textarea>
              </div>

              <!-- Drop zone de archivo -->
              <div class="form-group">
                <label>Archivo <span class="req">*</span></label>
                <div class="drop-zone"
                  [class.has-file]="selectedFile()"
                  [class.dragging]="isDragging()"
                  (dragover)="onDragOver($event)"
                  (dragleave)="isDragging.set(false)"
                  (drop)="onDrop($event)"
                  (click)="fileInput.click()">
                  <input #fileInput type="file" accept=".pdf,.docx,.doc" hidden (change)="onFileSelected($event)" />
                  @if (selectedFile()) {
                    <span class="material-symbols-rounded file-ready-icon">insert_drive_file</span>
                    <span class="file-name-text">{{ selectedFile()!.name }}</span>
                    <span class="file-size">{{ (selectedFile()!.size / 1024 / 1024).toFixed(2) }} MB</span>
                  } @else {
                    <span class="material-symbols-rounded drop-icon">cloud_upload</span>
                    <span class="drop-label">Arrastra un archivo o <strong>haz clic aquí</strong></span>
                    <span class="drop-hint">PDF, DOC, DOCX — máx 20 MB</span>
                  }
                </div>
              </div>

              <!-- Error de upload -->
              @if (uploadError()) {
                <div class="server-error">
                  <span class="material-symbols-rounded">error</span>
                  <span>{{ uploadError() }}</span>
                </div>
              }

              <div class="modal-footer">
                <button type="button" class="cancel-btn" (click)="closeModal()">Cancelar</button>
                <button type="submit" class="add-btn" [disabled]="uploading() || !selectedFile()">
                  @if (uploading()) {
                    <span class="material-symbols-rounded spin">sync</span>
                    <span>Indexando...</span>
                  } @else {
                    <span class="material-symbols-rounded">upload</span>
                    <span>Subir e Indexar</span>
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
      cursor: pointer; transition: all 0.2s;
    }
    .add-btn:hover:not(:disabled) { background: var(--color-accent-hover); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(59,130,246,0.28); }
    .add-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .add-btn.sm { margin-top: 12px; }

    .offline-warning {
      background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2);
      color: var(--color-warning); padding: 12px 18px; border-radius: 8px;
      display: flex; align-items: center; gap: 12px; font-size: 13px;
    }
    .loading-container { display: flex; flex-direction: column; align-items: center; padding: 60px; gap: 15px; color: var(--text-secondary); }
    .spinner { font-size: 40px; animation: spin 1.2s linear infinite; color: var(--color-accent); }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      padding: 60px 30px; text-align: center; gap: 10px;
    }
    .empty-icon { font-size: 52px; color: var(--text-muted); margin-bottom: 8px; }
    .empty-state h3 { font-size: 18px; color: var(--text-primary); }
    .empty-state p { color: var(--text-secondary); font-size: 14px; max-width: 380px; }

    .table-container { overflow-x: auto; border-radius: 12px; }
    .knowledge-table { width: 100%; border-collapse: collapse; text-align: left; }
    .knowledge-table th {
      background: rgba(255,255,255,0.02); padding: 15px 20px;
      font-size: 12px; font-weight: 700; color: var(--text-secondary);
      border-bottom: 1px solid var(--border-color); text-transform: uppercase; letter-spacing: 0.05em;
    }
    .knowledge-table td { padding: 15px 20px; font-size: 14px; color: var(--text-primary); border-bottom: 1px solid var(--border-color); }
    .file-name { font-family: monospace; font-size: 13px; color: var(--text-secondary); }

    .badge { font-size: 11px; font-weight: 700; padding: 4px 9px; border-radius: 6px; }
    .badge.pdf { background: rgba(244,63,94,0.1); color: var(--color-error); border: 1px solid rgba(244,63,94,0.2); }
    .badge.docx { background: rgba(59,130,246,0.1); color: var(--color-accent); border: 1px solid rgba(59,130,246,0.2); }

    .status-badge { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 12px; display: inline-flex; align-items: center; gap: 5px; }
    .status-dot { font-size: 14px; }
    .status-badge.active { background: rgba(16,185,129,0.1); color: var(--color-success); }
    .status-badge.inactive { background: rgba(100,116,139,0.1); color: var(--text-secondary); }

    .actions { display: flex; gap: 10px; }
    .action-icon-btn {
      background: none; border: 1px solid var(--border-color);
      color: var(--text-secondary); border-radius: 6px; padding: 6px;
      cursor: pointer; display: flex; align-items: center; transition: all 0.2s;
    }
    .action-icon-btn.danger:hover { color: var(--color-error); background: rgba(244,63,94,0.1); border-color: rgba(244,63,94,0.2); }

    /* MODAL */
    .modal-backdrop {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(5,8,18,0.75); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .modal-card { width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: 24px; padding: 32px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; }
    .modal-header h3 { display: flex; align-items: center; gap: 10px; font-size: 17px; color: var(--text-primary); }
    .modal-header h3 .material-symbols-rounded { color: var(--color-accent); }
    .close-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; border-radius: 6px; padding: 4px; transition: color 0.2s; }
    .close-btn:hover { color: var(--text-primary); }
    .close-btn .material-symbols-rounded { font-size: 22px; display: block; }

    .upload-form { display: flex; flex-direction: column; gap: 18px; }
    .form-group { display: flex; flex-direction: column; gap: 7px; }
    .form-group label { font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
    .req { color: var(--color-error); }
    .form-group input, .form-group textarea {
      background: var(--bg-tertiary); border: 1px solid var(--border-color);
      border-radius: 8px; color: var(--text-primary); padding: 11px 14px;
      font-size: 14px; outline: none; transition: border-color 0.2s; resize: none;
      font-family: inherit;
    }
    .form-group input:focus, .form-group textarea:focus { border-color: var(--color-accent); }
    .field-error { font-size: 12px; color: var(--color-error); }

    .drop-zone {
      border: 2px dashed var(--border-color); border-radius: 10px;
      padding: 32px 20px; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 8px; cursor: pointer; transition: all 0.2s;
      background: var(--bg-tertiary);
    }
    .drop-zone:hover, .drop-zone.dragging { border-color: var(--color-accent); background: rgba(59,130,246,0.05); }
    .drop-zone.has-file { border-color: var(--color-success); border-style: solid; background: rgba(16,185,129,0.04); }
    .drop-icon { font-size: 40px; color: var(--text-muted); }
    .file-ready-icon { font-size: 40px; color: var(--color-success); }
    .drop-label { font-size: 14px; color: var(--text-secondary); text-align: center; }
    .drop-hint { font-size: 12px; color: var(--text-muted); }
    .file-name-text { font-size: 14px; font-weight: 600; color: var(--text-primary); font-family: monospace; text-align: center; }
    .file-size { font-size: 12px; color: var(--text-muted); }

    .server-error { display: flex; align-items: center; gap: 10px; background: rgba(244,63,94,0.08); border: 1px solid rgba(244,63,94,0.2); color: var(--color-error); padding: 12px 16px; border-radius: 8px; font-size: 13px; }

    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding-top: 8px; border-top: 1px solid var(--border-color); }
    .cancel-btn { background: none; border: 1px solid var(--border-color); color: var(--text-secondary); padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; }
    .cancel-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }

    .upload-success { display: flex; align-items: flex-start; gap: 16px; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); color: var(--color-success); padding: 20px; border-radius: 10px; }
    .success-icon { font-size: 36px; flex-shrink: 0; }
    .upload-success strong { display: block; font-size: 15px; margin-bottom: 4px; }
    .upload-success p { font-size: 13px; opacity: 0.8; color: var(--text-secondary); margin: 0; }
    .spin { animation: spin 1s linear infinite; display: inline-block; }
  `]
})
export class DocumentsComponent implements OnInit {
  private readonly documentService = inject(DocumentService);
  private readonly fb = inject(FormBuilder);

  documents = signal<Document[]>([]);
  loading = signal(true);
  connectionError = signal(false);
  showModal = signal(false);
  uploading = signal(false);
  uploadSuccess = signal(false);
  uploadError = signal('');
  uploadResult = signal<DocumentUploadResponse | null>(null);
  selectedFile = signal<File | null>(null);
  isDragging = signal(false);

  uploadForm: FormGroup = this.fb.group({
    titulo: ['', Validators.required],
    descripcion: ['']
  });

  private mockDocuments: Document[] = [
    { id: '1', titulo: 'Manual de Procedimiento Penal de Tarija', nombre_archivo: 'manual_procedimiento_penal.pdf', tipo_archivo: 'pdf', activo: true },
    { id: '2', titulo: 'Reglamento Interno de la Fiscalía Departamental', nombre_archivo: 'reglamento_interno_2026.docx', tipo_archivo: 'docx', activo: true },
    { id: '3', titulo: 'Instructivo Técnico para Fiscales de Materia', nombre_archivo: 'instructivo_tecnico_fiscales.pdf', tipo_archivo: 'pdf', activo: false }
  ];

  ngOnInit() { this.loadDocuments(); }

  loadDocuments() {
    this.loading.set(true);
    this.documentService.getAll().subscribe({
      next: (res) => { this.documents.set(res); this.loading.set(false); this.connectionError.set(false); },
      error: () => { this.documents.set(this.mockDocuments); this.loading.set(false); this.connectionError.set(true); }
    });
  }

  openModal() {
    this.uploadForm.reset();
    this.selectedFile.set(null);
    this.uploadSuccess.set(false);
    this.uploadError.set('');
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) this.selectedFile.set(input.files[0]);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.selectedFile.set(file);
  }

  onUpload() {
    if (this.uploadForm.invalid) { this.uploadForm.markAllAsTouched(); return; }
    const file = this.selectedFile();
    if (!file) return;

    this.uploading.set(true);
    this.uploadError.set('');

    this.documentService.upload(file).subscribe({
      next: (res) => {
        // Extraer la extensión del archivo
        const fileExtension = file.name.split('.').pop() || 'pdf';
        
        // Crear el registro de metadatos en Supabase
        const newDocMetadata: Document = {
          titulo: this.uploadForm.value.titulo,
          descripcion: this.uploadForm.value.descripcion || '',
          nombre_archivo: res.file_name || file.name,
          tipo_archivo: fileExtension,
          activo: true
        };

        this.documentService.create(newDocMetadata).subscribe({
          next: () => {
            this.uploading.set(false);
            this.uploadResult.set(res);
            this.uploadSuccess.set(true);
            this.loadDocuments();
          },
          error: (createErr) => {
            console.error('Error al registrar metadatos en base de datos:', createErr);
            this.uploading.set(false);
            this.uploadError.set('Error en la base de datos al registrar metadatos: ' + (createErr?.error?.detail || createErr?.message || 'Error de BD'));
          }
        });
      },
      error: (err) => {
        this.uploading.set(false);
        this.uploadError.set(err?.error?.detail || 'Error al subir el archivo. Verifique que el servidor esté activo.');
      }
    });
  }

  deleteDocument(doc: Document) {
    if (!doc.id) return;
    if (!confirm(`¿Eliminar "${doc.titulo}" de la base de conocimiento?`)) return;
    this.documentService.delete(doc.id).subscribe({
      next: () => this.loadDocuments(),
      error: () => alert('No se pudo eliminar el documento.')
    });
  }
}
