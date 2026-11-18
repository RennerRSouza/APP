import {Detection} from '../../domain/entities/Detection';

/** Raio de toque (px na tela) para considerar que o dedo acertou um marcador existente. */
export const RAIO_TOQUE_PX = 22;

/** Lado (normalizado 0-1) da caixa de um marcador manual. */
const LADO_MANUAL = 0.02;

/**
 * Procura o marcador mais próximo do toque dentro do raio.
 * Coordenadas do toque em px do container; as detecções são normalizadas [0,1].
 * Retorna o índice do marcador ou -1 se o toque caiu em área vazia.
 */
export function encontrarMarcadorNoToque(
  detections: Detection[],
  toqueX: number,
  toqueY: number,
  largura: number,
  altura: number,
  raioPx: number,
): number {
  let melhor = -1;
  let melhorDist = Infinity;
  detections.forEach((d, i) => {
    const cx = (d.box.x + d.box.width / 2) * largura;
    const cy = (d.box.y + d.box.height / 2) * altura;
    const dist = Math.hypot(cx - toqueX, cy - toqueY);
    if (dist <= raioPx && dist < melhorDist) {
      melhor = i;
      melhorDist = dist;
    }
  });
  return melhor;
}

/** Converte o toque (px) em coordenadas normalizadas; null se fora da imagem ou sem tamanho. */
export function normalizarToque(
  toqueX: number,
  toqueY: number,
  largura: number,
  altura: number,
): {x: number; y: number} | null {
  if (largura <= 0 || altura <= 0) {
    return null;
  }
  const x = toqueX / largura;
  const y = toqueY / altura;
  if (x < 0 || x > 1 || y < 0 || y > 1) {
    return null;
  }
  return {x, y};
}

/** Marcador adicionado à mão (falso negativo), centrado em (x, y) normalizados. */
export function criarMarcadorManual(x: number, y: number): Detection {
  return {
    box: {
      x: x - LADO_MANUAL / 2,
      y: y - LADO_MANUAL / 2,
      width: LADO_MANUAL,
      height: LADO_MANUAL,
    },
    score: 1,
    classId: -1,
    label: 'manual',
  };
}
