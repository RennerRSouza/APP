import {Detection} from '../entities/Detection';
import {ObjectDetector} from '../repositories/ObjectDetector';

export interface ResultadoContagem {
  detections: Detection[];
  porClasse: Record<string, number>;
  total: number;
  duracaoMs: number;
}

export class ContarObjetos {
  constructor(private readonly detector: ObjectDetector) {}

  async execute(imageUri: string): Promise<ResultadoContagem> {
    const inicio = Date.now();
    const detections = await this.detector.detect(imageUri);
    
    const porClasse: Record<string, number> = {};
    for (const d of detections) {
      porClasse[d.label] = (porClasse[d.label] ?? 0) + 1;
    }
    // Cada mesa possui 2 juntas. Dividimos por 2 e arredondamos para cima.
    if (porClasse['table_joint'] !== undefined) {
      porClasse['table_joint'] = Math.ceil(porClasse['table_joint'] / 2);
    }
    // Como as juntas foram divididas, o total não pode mais ser o número de caixas na tela (detections.length).
    // O novo total é a soma matemática das classes após a divisão.
    const totalAjustado = Object.values(porClasse).reduce((acc, count) => acc + count, 0);

    return {
      detections, 
      porClasse, 
      total: totalAjustado, 
      duracaoMs: Date.now() - inicio
    };
  }
}