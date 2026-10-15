import {Contagem} from '../entities/Contagem';
import {ContagemRepository} from '../repositories/ContagemRepository';

export class ListarContagens {
  constructor(private readonly repo: ContagemRepository) {}
  execute(): Promise<Contagem[]> {
    return this.repo.listar();
  }
}
