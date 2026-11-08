import { BoundingBox, Detection } from '../../domain/entities/Detection';

export interface PostprocessConfig {
  classNames: readonly string[];
  classScoreThresholds?: Readonly<Record<string, number>>;
  scoreThreshold: number;
  iouThreshold: number;
  inputSize: number;
  normalizedCoords: boolean;
}

export function decodeYolo(output: Float32Array, cfg: PostprocessConfig, outputShape: number[]): Detection[] {
  const nc = cfg.classNames.length;
  const elementsPerAnchor = 4 + nc;

  const dimA = outputShape[outputShape.length - 2];
  const dimB = outputShape[outputShape.length - 1];
  let numAnchors: number;
  let isTransposed: boolean;

  if (dimA === elementsPerAnchor) {
    numAnchors = dimB;
    isTransposed = false; 
  } else if (dimB === elementsPerAnchor) {
    numAnchors = dimA;
    isTransposed = true; 
  } else {
    throw new Error(
      `Output shape [${outputShape.join(', ')}] incompatible with ${nc} classes; expected an axis of ${elementsPerAnchor}.`,
    );
  }

  if (output.length !== numAnchors * elementsPerAnchor) {
    throw new Error(`Output buffer length ${output.length} does not match shape [${outputShape.join(', ')}].`);
  }

  // Se o modelo deu Pixels, dividimos por 640. Se deu %, multiplicamos por 1
  const k = cfg.normalizedCoords ? 1 : 1 / cfg.inputSize;
  const out: Detection[] = [];

  for (let i = 0; i < numAnchors; i++) {
    let best = 0;
    let bestScore = -1;
    
    for (let c = 0; c < nc; c++) {
      const s = isTransposed 
        ? output[i * elementsPerAnchor + 4 + c] 
        : output[(4 + c) * numAnchors + i];
        
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }

    const classThreshold = cfg.classScoreThresholds?.[cfg.classNames[best]] ?? cfg.scoreThreshold;
    if (bestScore < classThreshold) {
      continue;
    }

    const cx = (isTransposed ? output[i * elementsPerAnchor + 0] : output[i]) * k;
    const cy = (isTransposed ? output[i * elementsPerAnchor + 1] : output[numAnchors + i]) * k;
    const w  = (isTransposed ? output[i * elementsPerAnchor + 2] : output[2 * numAnchors + i]) * k;
    const h  = (isTransposed ? output[i * elementsPerAnchor + 3] : output[3 * numAnchors + i]) * k;

    out.push({
      box: clampBox({ x: cx - w / 2, y: cy - h / 2, width: w, height: h }),
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
  return { x: x1, y: y1, width: Math.max(0, x2 - x1), height: Math.max(0, y2 - y1) };
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

export function nms(dets: Detection[], baseIouThreshold: number): Detection[] {
  const sorted = [...dets].sort((a, b) => b.score - a.score);
  const kept: Detection[] = [];
  
  for (const d of sorted) {
    const currentThreshold = d.label.toLowerCase().includes('gradil') ? 0.60 : baseIouThreshold;
    const isSuppressed = kept.some(k => 
      k.classId === d.classId && iou(k.box, d.box) > currentThreshold
    );
    
    if (!isSuppressed) kept.push(d);
  }
  return kept;
}