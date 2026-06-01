export interface SystemStats {
  documents: number;
  tutorials: number;
  categories: number;
  total_fragments: number;
  collection_name: string;
  status: string;
  uso_rag?: number; // Indicador adicional opcional para auditoría de RAG
}
