export interface Category {
  id?: string; // UUID generado por Supabase
  nombre: string;
  descripcion?: string;
  fecha_creacion?: string | Date;
}
