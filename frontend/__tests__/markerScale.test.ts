import {
  calcularFatorEscala,
  calcularTamanhoMarcador,
} from '../src/core/ai/markerScale';

describe('markerScale (POS-S3-13)', () => {
  it('sem ângulo (galeria) mantém tamanho base', () => {
    expect(calcularFatorEscala(null)).toBe(1);
    expect(calcularFatorEscala(undefined)).toBe(1);
    expect(calcularTamanhoMarcador(null)).toBe(14);
  });

  it('visão de topo (pitch ~0) mantém 100%', () => {
    expect(calcularFatorEscala(0)).toBe(1);
    expect(calcularFatorEscala(15)).toBe(1);
  });

  it('visão oblíqua (pitch ~90) usa fator mínimo', () => {
    expect(calcularFatorEscala(90)).toBe(0.5);
    expect(calcularFatorEscala(-90)).toBe(0.5);
    expect(calcularTamanhoMarcador(90)).toBe(7);
  });

  it('é simétrico e decresce monotonicamente', () => {
    expect(calcularFatorEscala(-45)).toBe(calcularFatorEscala(45));
    expect(calcularFatorEscala(30)).toBeGreaterThan(calcularFatorEscala(60));
  });

  it('ignora valores inválidos', () => {
    expect(calcularFatorEscala(NaN)).toBe(1);
  });
});
