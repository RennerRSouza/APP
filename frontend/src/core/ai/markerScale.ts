/**
 * POS-S3-13 — Escala dinâmica dos Pontos Centrais pelo Ângulo da Câmera.
 *
 * Convenção (mesma de useCameraAngle.ts):
 *   pitch = atan2(y, sqrt(x² + z²))
 *   - celular deitado, câmera apontando p/ baixo (visão de topo) -> pitch ≈ 0°
 *   - celular em pé, câmera apontando p/ o horizonte (visão oblíqua) -> |pitch| ≈ 90°
 *
 * Logo, o desvio da vertical (nadir) é |pitch|. Quanto maior o desvio, mais os
 * objetos ficam pequenos/amontoados na imagem (perspectiva), então o marcador
 * diminui para não sobrepor os vizinhos.
 */

export interface MarkerScaleConfig {
  /** Tamanho do ponto (px) em visão de topo. */
  baseSize: number;
  /** Até este ângulo o ponto mantém 100% do tamanho. */
  flatAngleDeg: number;
  /** A partir deste ângulo o ponto fica no tamanho mínimo. */
  obliqueAngleDeg: number;
  /** Fator mínimo (0-1) aplicado em visão muito oblíqua. */
  minFactor: number;
  /** Limites absolutos em px. */
  minSizePx: number;
  maxSizePx: number;
}

export const DEFAULT_MARKER_SCALE_CONFIG: MarkerScaleConfig = {
  baseSize: 14,
  flatAngleDeg: 15,
  obliqueAngleDeg: 75,
  minFactor: 0.5,
  minSizePx: 6,
  maxSizePx: 24,
};

/**
 * Fator de escala (0-1) a partir do pitch. Interpolação linear entre
 * flatAngleDeg (fator 1) e obliqueAngleDeg (fator minFactor).
 * Sem sensor (galeria / pitch null) -> fator 1 (comportamento atual).
 */
export function calcularFatorEscala(
  pitch: number | null | undefined,
  cfg: MarkerScaleConfig = DEFAULT_MARKER_SCALE_CONFIG,
): number {
  if (pitch == null || !Number.isFinite(pitch)) {
    return 1;
  }
  const desvio = Math.min(Math.abs(pitch), 90);
  if (desvio <= cfg.flatAngleDeg) {
    return 1;
  }
  if (desvio >= cfg.obliqueAngleDeg) {
    return cfg.minFactor;
  }
  const t = (desvio - cfg.flatAngleDeg) / (cfg.obliqueAngleDeg - cfg.flatAngleDeg);
  return 1 - t * (1 - cfg.minFactor);
}

/** Tamanho final do ponto central em px, já com clamp. */
export function calcularTamanhoMarcador(
  pitch: number | null | undefined,
  cfg: MarkerScaleConfig = DEFAULT_MARKER_SCALE_CONFIG,
): number {
  const size = cfg.baseSize * calcularFatorEscala(pitch, cfg);
  return Math.round(Math.min(cfg.maxSizePx, Math.max(cfg.minSizePx, size)));
}
