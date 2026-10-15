import {Contagem} from '../../domain/entities/Contagem';

export interface ContagemRow {
  id: string;
  image_uri: string;
  total_detectado: number;
  total_confirmado: number;
  por_classe: string;
  modelo_versao: string;
  criado_em: number;
  sincronizado: number;
  justificativa?: string | null;
}

export const toRow = (c: Contagem): ContagemRow => ({
  id: c.id,
  image_uri: c.imageUri,
  total_detectado: c.totalDetectado,
  total_confirmado: c.totalConfirmado,
  por_classe: JSON.stringify(c.porClasse),
  modelo_versao: c.modeloVersao,
  criado_em: c.criadoEm,
  sincronizado: c.sincronizado ? 1 : 0,
  justificativa: c.justificativa ?? null,
});

export const fromRow = (r: ContagemRow): Contagem => ({
  id: r.id,
  imageUri: r.image_uri,
  totalDetectado: r.total_detectado,
  totalConfirmado: r.total_confirmado,
  porClasse: JSON.parse(r.por_classe),
  modeloVersao: r.modelo_versao,
  criadoEm: r.criado_em,
  sincronizado: r.sincronizado === 1,
  justificativa: r.justificativa ?? undefined,
});