import {
  criarMarcadorManual,
  encontrarMarcadorNoToque,
  normalizarToque,
} from '../src/core/utils/marcadores';
import {Detection} from '../src/domain/entities/Detection';

const det = (cx: number, cy: number): Detection => ({
  box: {x: cx - 0.01, y: cy - 0.01, width: 0.02, height: 0.02},
  score: 0.9,
  classId: 0,
  label: 'table_joint',
});

describe('marcadores (UX-S3-03)', () => {
  // container 400x400: marcadores em (100,100) e (200,200)
  const lista = [det(0.25, 0.25), det(0.5, 0.5)];

  it('toque em cima de um marcador devolve o índice dele', () => {
    expect(encontrarMarcadorNoToque(lista, 102, 98, 400, 400, 22)).toBe(0);
    expect(encontrarMarcadorNoToque(lista, 200, 205, 400, 400, 22)).toBe(1);
  });

  it('toque em área vazia devolve -1', () => {
    expect(encontrarMarcadorNoToque(lista, 300, 50, 400, 400, 22)).toBe(-1);
    expect(encontrarMarcadorNoToque([], 10, 10, 400, 400, 22)).toBe(-1);
  });

  it('entre dois marcadores próximos escolhe o mais perto do dedo', () => {
    const perto = [det(0.25, 0.25), det(0.27, 0.25)]; // 100px e 108px
    expect(encontrarMarcadorNoToque(perto, 107, 100, 400, 400, 22)).toBe(1);
  });

  it('o raio é respeitado (com zoom o raio diminui)', () => {
    expect(encontrarMarcadorNoToque(lista, 115, 100, 400, 400, 22)).toBe(0);
    expect(encontrarMarcadorNoToque(lista, 115, 100, 400, 400, 22 / 4)).toBe(-1);
  });

  it('normalizarToque converte px em [0,1] e rejeita fora da imagem', () => {
    expect(normalizarToque(100, 200, 400, 400)).toEqual({x: 0.25, y: 0.5});
    expect(normalizarToque(-1, 10, 400, 400)).toBeNull();
    expect(normalizarToque(10, 401, 400, 400)).toBeNull();
    expect(normalizarToque(10, 10, 0, 400)).toBeNull();
  });

  it('criarMarcadorManual centraliza a caixa no ponto tocado', () => {
    const m = criarMarcadorManual(0.4, 0.6);
    expect(m.label).toBe('manual');
    expect(m.box.x + m.box.width / 2).toBeCloseTo(0.4);
    expect(m.box.y + m.box.height / 2).toBeCloseTo(0.6);
    // e o toque no centro desse marcador o encontra
    expect(encontrarMarcadorNoToque([m], 160, 240, 400, 400, 22)).toBe(0);
  });
});
