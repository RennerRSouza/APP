import {Contagem} from '../entities/Contagem';

export interface ContagemRepository {
  salvar(contagem: Contagem): Promise<void>;
  listar(): Promise<Contagem[]>;
}
