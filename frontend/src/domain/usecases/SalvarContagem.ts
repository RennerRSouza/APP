import { Contagem } from '../entities/Contagem';
import { ContagemRepository } from '../repositories/ContagemRepository';
import { ResultadoContagem } from './ContarObjetos';

export class SalvarContagem {
  constructor(
    private readonly repo: ContagemRepository,
    private readonly gerarId: () => string,
    private readonly modeloVersao: string
  ) {}

  async execute(params: {
    imageUri: string;
    resultado: ResultadoContagem;
    totalConfirmado: number;
    justificativa?: string;
    cameraPitch?: number | null;
    cameraRoll?: number | null;
  }): Promise<void> {
    const contagem: Contagem = {
      id: this.gerarId(),
      imageUri: params.imageUri,
      totalDetectado: params.resultado.total,
      totalConfirmado: params.totalConfirmado,
      porClasse: params.resultado.porClasse,
      modeloVersao: this.modeloVersao,
      criadoEm: Date.now(),
      sincronizado: false,
      justificativa: params.justificativa,
      cameraPitch: params.cameraPitch ?? null,
      cameraRoll: params.cameraRoll ?? null,
    };
    
    await this.repo.salvar(contagem);
  }
}