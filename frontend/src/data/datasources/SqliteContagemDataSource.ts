import {db} from '../../core/database/database';
import {ContagemRow} from '../models/ContagemDto';

export class SqliteContagemDataSource {
  async insert(r: ContagemRow): Promise<void> {
    await db.execute(
      `INSERT OR REPLACE INTO contagens
       (id, image_uri, total_detectado, total_confirmado, por_classe, modelo_versao, criado_em, sincronizado, justificativa)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        r.id,
        r.image_uri,
        r.total_detectado,
        r.total_confirmado,
        r.por_classe,
        r.modelo_versao,
        r.criado_em,
        r.sincronizado,
        r.justificativa ?? null,
      ],
    );
  }

  async selectAll(): Promise<ContagemRow[]> {
    const res: any = await db.execute('SELECT * FROM contagens ORDER BY criado_em DESC');
    return Array.isArray(res.rows) ? res.rows : res.rows?._array ?? [];
  }

  async selectPendentes(): Promise<ContagemRow[]> {
    const res: any = await db.execute('SELECT * FROM contagens WHERE sincronizado = 0 ORDER BY criado_em ASC');
    return Array.isArray(res.rows) ? res.rows : res.rows?._array ?? [];
  }

  async marcarSincronizado(id: string): Promise<void> {
    await db.execute('UPDATE contagens SET sincronizado = 1 WHERE id = ?', [id]);
  }
}