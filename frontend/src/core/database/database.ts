import {open} from '@op-engineering/op-sqlite';

// Migrations versionadas: adicione novas entradas; NUNCA edite as antigas.
const MIGRATIONS: string[] = [
  // Versão 1: Tabela inicial
  `CREATE TABLE contagens (
     id TEXT PRIMARY KEY,
     image_uri TEXT NOT NULL,
     total_detectado INTEGER NOT NULL,
     total_confirmado INTEGER NOT NULL,
     por_classe TEXT NOT NULL,
     modelo_versao TEXT NOT NULL,
     criado_em INTEGER NOT NULL,
     sincronizado INTEGER NOT NULL DEFAULT 0
   )`,
  // Versão 2: Suporte a justificativa de divergência da IA (Integração SIGA Django)
  `ALTER TABLE contagens ADD COLUMN justificativa TEXT;`,
];

export const db = open({name: 'contador.db'});

// `await` funciona tanto se a versão do op-sqlite for síncrona quanto assíncrona.
export async function runMigrations(): Promise<void> {
  const res: any = await db.execute('PRAGMA user_version');
  const rows = Array.isArray(res.rows) ? res.rows : res.rows?._array ?? [];
  let version: number = rows[0]?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    await db.execute(MIGRATIONS[version]);
    version += 1;
    await db.execute(`PRAGMA user_version = ${version}`);
  }
}