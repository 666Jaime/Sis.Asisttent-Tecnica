import { Category } from './category.model';

export interface Tutorial {
  id?: string; // UUID generado por Supabase
  titulo: string;
  descripcion?: string;
  url_video?: string;
  categoria_id?: string; // Relación con Categoría (UUID)
  fecha_creacion?: string | Date;
  activo: boolean;
  
  // Categoría asociada embebida opcional
  categoria?: Category;
}
