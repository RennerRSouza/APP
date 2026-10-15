export interface Contagem {
  id: string;
  imageUri: string;
  totalDetectado: number;   // O que a IA YOLO detectou
  totalConfirmado: number;  // O que o operador confirmou/ajustou manualmente
  porClasse: Record<string, number>;
  modeloVersao: string;
  criadoEm: number;        // Timestamp (epoch ms)
  sincronizado: boolean;
  justificativa?: string;   // Obrigatória se a divergência > 10% (exigência do SIGA Django)
}