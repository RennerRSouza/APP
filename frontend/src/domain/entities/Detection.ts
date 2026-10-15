/** Coordenadas normalizadas [0,1], origem no canto superior esquerdo. */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  box: BoundingBox;
  score: number;
  classId: number;
  label: string;
}
