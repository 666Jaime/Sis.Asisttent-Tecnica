export interface Document {
  id?: string; // UUID generado por Supabase
  titulo: string;
  descripcion?: string;
  nombre_archivo: string;
  tipo_archivo: string;
  fecha_subida?: string | Date;
  activo: boolean;
}

export interface DocumentUploadResponse {
  message: string;
  file_name: string;
  fragments_indexed: number;
  success: boolean;
}
