import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ChatService } from '../../core/services/chat.service';
import { SystemStats } from '../../core/models/stats.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-wrapper animate-fade-in">
      <div class="dashboard-welcome">
        <h1>Bienvenido al Panel de Control</h1>
        <p>Monitoreo y administración de la base de conocimiento vectorial e institucional.</p>
      </div>

      <!-- Alerta si hay error de conexión al backend -->
      @if (connectionError()) {
        <div class="alert-banner">
          <span class="material-symbols-rounded">warning</span>
          <div class="alert-content">
            <h4>Advertencia de Conexión</h4>
            <p>No se pudo conectar con el Backend. Mostrando datos locales offline. Asegúrese de iniciar su servidor FastAPI.</p>
          </div>
        </div>
      }

      <!-- Grid de Métricas Generales -->
      <div class="metrics-grid">
        <div class="metric-card glass-card">
          <div class="metric-header">
            <span class="material-symbols-rounded icon-purple">description</span>
            <span class="metric-title">Documentos Activos</span>
          </div>
          <div class="metric-value">{{ stats().documents }}</div>
          <p class="metric-description">Resoluciones, reglamentos e instructivos oficiales indexados.</p>
        </div>

        <div class="metric-card glass-card">
          <div class="metric-header">
            <span class="material-symbols-rounded icon-gold">video_library</span>
            <span class="metric-title">Video Tutoriales</span>
          </div>
          <div class="metric-value">{{ stats().tutorials }}</div>
          <p class="metric-description">Guías multimedia y explicativos de soporte técnico.</p>
        </div>

        <div class="metric-card glass-card" [class.animate-pulse]="stats().status === 'connected'">
          <div class="metric-header">
            <span class="material-symbols-rounded icon-green">database</span>
            <span class="metric-title">Fragmentos ChromaDB</span>
          </div>
          <div class="metric-value">{{ stats().total_fragments }}</div>
          <p class="metric-description">Vectores indexados disponibles en la colección: '{{ stats().collection_name }}'</p>
        </div>
      </div>

      <!-- Accesos Rápidos a la Gestión -->
      <div class="quick-actions-section">
        <h3>Accesos Rápidos a la Gestión de Conocimiento</h3>
        <div class="actions-grid">
          <a routerLink="/admin/documents" class="action-btn glass-card" id="btnGoDocs">
            <span class="material-symbols-rounded">upload_file</span>
            <div>
              <h4>Subir e Indexar Documentos</h4>
              <p>Carga nuevos instructivos PDF/DOCX al cerebro vectorial.</p>
            </div>
          </a>
          <a routerLink="/admin/tutorials" class="action-btn glass-card" id="btnGoTuts">
            <span class="material-symbols-rounded">add_to_queue</span>
            <div>
              <h4>Agregar Video Tutorial</h4>
              <p>Sube y categoriza contenido audiovisual de capacitación.</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-wrapper {
      display: flex;
      flex-direction: column;
      gap: 30px;
    }
    .dashboard-welcome h1 {
      font-size: 28px;
      margin-bottom: 5px;
      color: var(--text-primary);
    }
    .dashboard-welcome p {
      color: var(--text-secondary);
    }

    /* Banners */
    .alert-banner {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      gap: 15px;
      align-items: center;
      color: var(--color-warning);
    }
    .alert-banner span {
      font-size: 32px;
    }
    .alert-content h4 {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .alert-content p {
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
    }
    .metric-card {
      padding: 25px;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    .metric-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .metric-header span {
      font-size: 32px;
      padding: 8px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.03);
    }
    .icon-purple { color: #a855f7; }
    .icon-gold { color: var(--color-gold); }
    .icon-blue { color: var(--color-accent); }
    .icon-green { color: var(--color-success); }
    
    .metric-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary);
    }
    .metric-value {
      font-family: var(--font-family-title);
      font-size: 36px;
      font-weight: 800;
      color: var(--text-primary);
    }
    .metric-description {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.4;
    }
    
    /* Quick Actions */
    .quick-actions-section {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-top: 20px;
    }
    .quick-actions-section h3 {
      font-size: 18px;
      color: var(--text-primary);
    }
    .actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .action-btn {
      display: flex;
      align-items: center;
      padding: 20px;
      gap: 20px;
      text-decoration: none;
      transition: all var(--transition-fast);
      cursor: pointer;
    }
    .action-btn:hover {
      border-color: var(--color-accent);
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(59, 130, 246, 0.1);
    }
    .action-btn span {
      font-size: 36px;
      color: var(--color-accent);
      background: rgba(59, 130, 246, 0.08);
      padding: 12px;
      border-radius: 12px;
    }
    .action-btn h4 {
      font-size: 16px;
      color: var(--text-primary);
      margin-bottom: 4px;
    }
    .action-btn p {
      font-size: 13px;
      color: var(--text-secondary);
    }
    @media (max-width: 768px) {
      .actions-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly chatService = inject(ChatService);

  // Stats reactivo con datos locales por defecto en caso de desconexión
  stats = signal<SystemStats>({
    documents: 12,
    tutorials: 8,
    categories: 4,
    total_fragments: 146,
    collection_name: 'fiscalia_documentos',
    status: 'offline'
  });

  connectionError = signal(false);

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.chatService.getStats().subscribe({
      next: (res) => {
        this.stats.set(res);
        this.connectionError.set(false);
      },
      error: (err) => {
        console.warn('Error al obtener estadísticas del servidor. Utilizando datos offline de auditoría.', err);
        this.connectionError.set(true);
      }
    });
  }
}
