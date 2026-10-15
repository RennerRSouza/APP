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
    return {detections, porClasse, total: detections.length, duracaoMs: Date.now() - inicio};
  }
}
