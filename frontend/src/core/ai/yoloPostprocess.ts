import {BoundingBox, Detection} from '../../domain/entities/Detection';

export interface PostprocessConfig {
  classNames: readonly string[];
  scoreThreshold: number;
  iouThreshold: number;
  inputSize: number;
  normalizedCoords: boolean;
}

/**
 * Decodifica a saída do YOLOv8/11 no layout [1, 4+nc, N] (channel-first, achatado).
 * Linhas: cx, cy, w, h, score_classe_0..nc-1. Sem NMS embutido.
 */
export function decodeYolo(output: Float32Array, cfg: PostprocessConfig): Detection[] {
  const nc = cfg.classNames.length;
  const rows = 4 + nc;
  if (output.length === 0 || output.length % rows !== 0) {
    throw new Error(
      `Saída do modelo (${output.length}) incompatível com ${nc} classes. Verifique modelConfig.ts / export.`,
    );
  }
  const n = output.length / rows;
  const k = cfg.normalizedCoords ? 1 : 1 / cfg.inputSize;
  const out: Detection[] = [];

  for (let i = 0; i < n; i++) {
    let best = 0;
    let bestScore = -1;
    for (let c = 0; c < nc; c++) {
      const s = output[(4 + c) * n + i];
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
    if (bestScore < cfg.scoreThreshold) {
      continue;
    }
    const cx = output[i] * k;
    const cy = output[n + i] * k;
    const w = output[2 * n + i] * k;
    const h = output[3 * n + i] * k;
    out.push({
      box: clampBox({x: cx - w / 2, y: cy - h / 2, width: w, height: h}),
      score: bestScore,
      classId: best,
      label: cfg.classNames[best],
    });
  }
  return nms(out, cfg.iouThreshold);
}

function clampBox(b: BoundingBox): BoundingBox {
  const x1 = Math.max(0, b.x);
  const y1 = Math.max(0, b.y);
  const x2 = Math.min(1, b.x + b.width);
  const y2 = Math.min(1, b.y + b.height);
  return {x: x1, y: y1, width: Math.max(0, x2 - x1), height: Math.max(0, y2 - y1)};
}

export function iou(a: BoundingBox, b: BoundingBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.width * a.height + b.width * b.height - inter;
  return union <= 0 ? 0 : inter / union;
}

/** NMS por classe (objetos de classes diferentes podem se sobrepor). */
export function nms(dets: Detection[], iouThreshold: number): Detection[] {
  const sorted = [...dets].sort((a, b) => b.score - a.score);
  const kept: Detection[] = [];
  for (const d of sorted) {
    if (!kept.some(k => k.classId === d.classId && iou(k.box, d.box) > iouThreshold)) {
      kept.push(d);
    }
  }
  return kept;
}
