import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryService } from '../../../core/services/category.service';
import { Category } from '../../../core/models/category.model';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="knowledge-wrapper animate-fade-in">
      <div class="knowledge-header">
        <div>
          <h1>Gestión de Categorías</h1>
          <p>Organiza temáticamente tus documentos y tutoriales institucionales.</p>
        </div>
        <button class="add-btn" id="btnAddCategoryMock">
          <span class="material-symbols-rounded">category</span>
          <span>Nueva Categoría</span>
        </button>
      </div>

      <!-- Mensaje si el backend está desconectado -->
      @if (connectionError()) {
        <div class="offline-warning">
          <span class="material-symbols-rounded">cloud_off</span>
          <div>
            <strong>Modo Lectura Local (Offline):</strong> Mostrando catálogo local. Asegúrese de que FastAPI y Supabase estén en funcionamiento.
          </div>
        </div>
      }

      @if (loading()) {
        <div class="loading-container">
          <span class="material-symbols-rounded spinner">sync</span>
          <p>Cargando categorías oficiales...</p>
        </div>
      } @else {
        <!-- Listado de Categorías Dinámicas -->
        <div class="categories-grid">
          @for (cat of categories(); track cat.id || $index) {
            <div class="category-card glass-card">
              <div class="card-top">
                <span class="material-symbols-rounded cat-icon">gavel</span>
                <h3>{{ cat.nombre }}</h3>
              </div>
              <p class="description">
                {{ cat.descripcion || 'Sin descripción disponible para esta categoría.' }}
              </p>
              <div class="card-footer">
                <span class="items-count">Verificado en Tarija</span>
                <div class="actions">
                  <button class="action-icon" title="Editar"><span class="material-symbols-rounded">edit</span></button>
                  <button class="action-icon danger" title="Eliminar"><span class="material-symbols-rounded">delete</span></button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .knowledge-wrapper {
      display: flex;
      flex-direction: column;
      gap: 25px;
    }
    .knowledge-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .knowledge-header h1 {
      font-size: 26px;
      color: var(--text-primary);
    }
    .knowledge-header p {
      color: var(--text-secondary);
    }
    .add-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--color-accent);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: not-allowed;
      opacity: 0.8;
    }

    /* Warning */
    .offline-warning {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.2);
      color: var(--color-warning);
      padding: 12px 18px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;
    }
    .offline-warning span {
      font-size: 20px;
    }
    
    /* Loading state */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
      gap: 15px;
      color: var(--text-secondary);
    }
    .spinner {
      font-size: 40px;
      animation: spin 1.2s linear infinite;
      color: var(--color-accent);
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Grid */
    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    .category-card {
      padding: 25px;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    .card-top {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .cat-icon {
      font-size: 24px;
      color: var(--color-gold);
      background: rgba(212, 175, 55, 0.1);
      padding: 8px;
      border-radius: 8px;
      border: 1px solid rgba(212, 175, 55, 0.2);
    }
    .card-top h3 {
      font-size: 18px;
      color: var(--text-primary);
    }
    .description {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
      flex: 1;
    }
    .card-footer {
      border-top: 1px solid var(--border-color);
      padding-top: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .items-count {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
    }
    .actions {
      display: flex;
      gap: 8px;
    }
    .action-icon {
      background: none;
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      border-radius: 6px;
      padding: 6px;
      cursor: not-allowed;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
    }
    .action-icon:hover {
      color: var(--text-primary);
      background: var(--bg-tertiary);
    }
    .action-icon.danger:hover {
      color: var(--color-error);
      background: rgba(244, 63, 94, 0.1);
      border-color: rgba(244, 63, 94, 0.2);
    }
  `]
})
export class CategoriesComponent implements OnInit {
  private readonly categoryService = inject(CategoryService);

  categories = signal<Category[]>([]);
  loading = signal(true);
  connectionError = signal(false);

  // Fallback local en caso de error
  private mockCategories: Category[] = [
    { nombre: 'Plataforma Justicia', descripcion: 'Normativas, directrices y guías referentes a la plataforma judicial digital y memoriales.' },
    { nombre: 'Sistemas Internos', descripcion: 'Manuales de usuario y videos de soporte para el portillo digital y sistemas internos de la fiscalía.' },
    { nombre: 'Procedimientos', descripcion: 'Instructivos técnicos de procedimiento legal y guías operativas de fiscales de materia.' }
  ];

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.loading.set(true);
    this.categoryService.getAll().subscribe({
      next: (res) => {
        this.categories.set(res);
        this.loading.set(false);
        this.connectionError.set(false);
      },
      error: (err) => {
        console.warn('Error al conectar al servicio de categorías. Cargando modo offline.', err);
        this.categories.set(this.mockCategories);
        this.loading.set(false);
        this.connectionError.set(true);
      }
    });
  }
}
