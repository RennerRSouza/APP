// ATENÇÃO: a ordem de CLASS_NAMES DEVE ser idêntica à do data.yaml usado no treino.
export const CLASS_NAMES = [
  'Black-Fold-Table',
  'Brown-Fold-Table',
  'table_joint',
] as const;
export const MODEL_VERSION = 'event-rental-inventory-v11';
export const INPUT_SIZE = 640;
export const SCORE_THRESHOLD = 0.25;
export const IOU_THRESHOLD = 0.45;
// Ultralytics tflite exporta coords normalizadas (0..1). Se seu export vier em pixels, coloque false.
export const NORMALIZED_COORDS = true;
