import {Contagem} from '../entities/Contagem';
import {ContagemRepository} from '../repositories/ContagemRepository';
import {ResultadoContagem} from './ContarObjetos';

export interface SalvarContagemInput {
  imageUri: string;
  resultado: ResultadoContagem;
  totalConfirmado: number;
  justificativa?: string;
}

export class SalvarContagem {
  constructor(
    private readonly repo: ContagemRepository,
    private readonly gerarId: () => string,
    private readonly modeloVersao: string,
  ) {}

  async execute({imageUri, resultado, totalConfirmado, justificativa}: SalvarContagemInput): Promise<Contagem> {
    if (!Number.isInteger(totalConfirmado) || totalConfirmado < 0) {
      throw new Error('totalConfirmado deve ser um inteiro >= 0');
    }

    const contagem: Contagem = {
      id: this.gerarId(),
      imageUri,
      totalDetectado: resultado.total,
      totalConfirmado,
      porClasse: resultado.porClasse,
      modeloVersao: this.modeloVersao,
      criadoEm: Date.now(),
      sincronizado: false,
      justificativa: justificativa?.trim() || undefined,
    };

    await this.repo.salvar(contagem);
    return contagem;
  }
}