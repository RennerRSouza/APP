import {Contagem} from '../../domain/entities/Contagem';
import {ContagemRepository} from '../../domain/repositories/ContagemRepository';
import {SqliteContagemDataSource} from '../datasources/SqliteContagemDataSource';
import {DjangoSyncDataSource} from '../datasources/DjangoSyncDataSource';
import {fromRow, toRow} from '../models/ContagemDto';

export class ContagemRepositoryImpl implements ContagemRepository {
  constructor(
    private readonly ds: SqliteContagemDataSource,
    private readonly persistImage: (uri: string, id: string) => Promise<string>,
    private readonly api?: DjangoSyncDataSource,
  ) {}

  async salvar(c: Contagem): Promise<void> {
    const imageUri = await this.persistImage(c.imageUri, c.id);
    
    // 1. Persistência offline local imediata no SQLite
    await this.ds.insert(toRow({...c, imageUri}));

    // 2. Tentativa de sincronização imediata com o backend Django
    if (this.api) {
      try {
        const res = await this.api.sincronizarContagem({...c, imageUri});
        if (res.sucesso) {
          await this.ds.marcarSincronizado(c.id);
        } else {
          console.warn('[SIGA Sync] Resposta do servidor:', res.mensagem);
        }
      } catch (err) {
        // Falha de rede não interrompe o app (estratégia offline-first)
        console.warn('[SIGA Sync] Dispositivo offline, sincronização pendente:', err);
      }
    }
  }

  async sincronizarPendentes(): Promise<{enviados: number; falhas: number}> {
    if (!this.api) {
      return {enviados: 0, falhas: 0};
    }

    const pendentes = (await this.ds.selectPendentes()).map(fromRow);
    let enviados = 0;
    let falhas = 0;

    for (const item of pendentes) {
      try {
        const res = await this.api.sincronizarContagem(item);
        if (res.sucesso) {
          await this.ds.marcarSincronizado(item.id);
          enviados++;
        } else {
          falhas++;
        }
      } catch {
        falhas++;
      }
    }

    return {enviados, falhas};
  }

  async listar(): Promise<Contagem[]> {
    return (await this.ds.selectAll()).map(fromRow);
  }
}