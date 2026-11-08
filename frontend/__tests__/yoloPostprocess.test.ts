import {decodeYolo, iou, nms} from '../src/core/ai/yoloPostprocess';

const cfg = {
  classNames: ['Black-Fold-Table', 'Brown-Fold-Table', 'Gradil', 'table_joint'],
  scoreThreshold: 0.25,
  iouThreshold: 0.45,
  inputSize: 640,
  normalizedCoords: true,
};

/** Monta saída channel-first [cx,cy,w,h,s0..s3] x N */
function build(anchors: number[][]): Float32Array {
  const n = anchors.length;
  const out = new Float32Array(8 * n);
  anchors.forEach((a, i) => a.forEach((v, r) => (out[r * n + i] = v)));
  return out;
}

describe('decodeYolo', () => {
  it('filtra por score e decodifica caixa', () => {
    const out = build([
      [0.5, 0.5, 0.2, 0.2, 0.9, 0.1, 0.05, 0.01],
      [0.1, 0.1, 0.1, 0.1, 0.05, 0.05, 0.05, 0.05],
    ]);
    const dets = decodeYolo(out, cfg, [1, 8, 2]);
    expect(dets).toHaveLength(1);
    expect(dets[0].label).toBe('Black-Fold-Table');
    expect(dets[0].box.x).toBeCloseTo(0.4);
  });

  it('NMS remove duplicatas da mesma classe mas preserva classes distintas', () => {
    const out = build([
      [0.5, 0.5, 0.2, 0.2, 0.9, 0.0, 0.0, 0.0],
      [0.51, 0.5, 0.2, 0.2, 0.8, 0.0, 0.0, 0.0], // duplicata
      [0.5, 0.5, 0.2, 0.2, 0.0, 0.7, 0.0, 0.0], // outra classe, mesma posição
    ]);
    expect(decodeYolo(out, cfg, [1, 8, 3])).toHaveLength(2);
  });

  it('falha explicitamente se o shape não tem quatro coordenadas mais quatro classes', () => {
    expect(() => decodeYolo(new Float32Array(8), cfg, [1, 7, 1])).toThrow(/incompatible/);
  });

  it('mapeia o id 2 como Gradil e aplica threshold específico quando calibrado', () => {
    const output = build([[0.5, 0.5, 0.2, 0.2, 0.1, 0.1, 0.7, 0.1]]);
    const detections = decodeYolo(output, {
      ...cfg,
      classScoreThresholds: {Gradil: 0.8},
    }, [1, 8, 1]);
    expect(detections).toHaveLength(0);

    const accepted = decodeYolo(output, cfg, [1, 8, 1]);
    expect(accepted[0].label).toBe('Gradil');
    expect(accepted[0].classId).toBe(2);
  });
});

describe('iou/nms', () => {
  it('iou de caixas idênticas é 1 e de disjuntas é 0', () => {
    const a = {x: 0, y: 0, width: 0.5, height: 0.5};
    expect(iou(a, a)).toBeCloseTo(1);
    expect(iou(a, {x: 0.6, y: 0.6, width: 0.2, height: 0.2})).toBe(0);
  });
  it('nms vazio retorna vazio', () => expect(nms([], 0.5)).toEqual([]));
});
