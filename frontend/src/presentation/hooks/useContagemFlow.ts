import {useCallback, useEffect, useState} from 'react';
import {container} from '../../core/di/container';
import {criarMarcadorManual} from '../../core/utils/marcadores';
import {Detection} from '../../domain/entities/Detection';
import {ResultadoContagem} from '../../domain/usecases/ContarObjetos';

type State =
  | {status: 'processing'}
  | {status: 'done'; resultado: ResultadoContagem}
  | {status: 'error'; message: string};

export function useContagemFlow(imageUri: string) {
  const [state, setState] = useState<State>({status: 'processing'});
  const [confirmado, setConfirmado] = useState(0);
  const [justificativa, setJustificativa] = useState('');
  const [saving, setSaving] = useState(false);
  // Marcadores editáveis na tela (começam com o que o YOLO detectou)
  const [detections, setDetections] = useState<Detection[]>([]);

  useEffect(() => {
    let cancelled = false; // evita setState após desmontar
    setState({status: 'processing'});
    setDetections([]);
    container.contarObjetos
      .execute(imageUri)
      .then(resultado => {
        if (cancelled) {
          return;
        }
        setDetections(resultado.detections);
        setConfirmado(resultado.total);
        setState({status: 'done', resultado});
      })
      .catch(e => !cancelled && setState({status: 'error', message: String(e?.message ?? e)}));
    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  const ajustar = useCallback((delta: number) => setConfirmado(v => Math.max(0, v + delta)), []);

  // Toque em área vazia (falso negativo): +1 marcador e +1 no total confirmado
  const adicionarMarcador = useCallback((x: number, y: number) => {
    setDetections(prev => [...prev, criarMarcadorManual(x, y)]);
    setConfirmado(v => v + 1);
  }, []);

  // Toque em marcador existente (falso positivo): -1 marcador e -1 no total confirmado
  const removerMarcador = useCallback((index: number) => {
    setDetections(prev => prev.filter((_, i) => i !== index));
    setConfirmado(v => Math.max(0, v - 1));
  }, []);

  // Cálculo da divergência percentual entre IA e operador
  const totalIA = state.status === 'done' ? state.resultado.total : 0;
  const delta = Math.abs(confirmado - totalIA);
  const divergenciaPercentual = totalIA > 0 ? (delta / totalIA) * 100 : (confirmado > 0 ? 100 : 0);
  const exigeJustificativa = divergenciaPercentual > 10.0;

  const salvar = useCallback(async (cameraPitch?: number | null, cameraRoll?: number | null, latitude?: number | null,
    longitude?: number | null, endereco?: string | null) => {
    if (state.status !== 'done') {
      return;
    }
    if (exigeJustificativa && !justificativa.trim()) {
      throw new Error('O ajuste manual supera a margem para auditoria de 10%. Justificativa obrigatória.');
    }
    setSaving(true);
    try {
      await container.salvarContagem.execute({
        imageUri,
        resultado: state.resultado,
        totalConfirmado: confirmado,
        justificativa: justificativa.trim() || undefined,
        cameraPitch,
        cameraRoll,
        latitude,
        longitude,
        endereco,
      });
    } finally {
      setSaving(false);
    }
  }, [state, imageUri, confirmado, justificativa, exigeJustificativa]);

  return {
    state,
    confirmado,
    ajustar,
    salvar,
    saving,
    justificativa,
    setJustificativa,
    divergenciaPercentual,
    exigeJustificativa,
    detections,
    adicionarMarcador,
    removerMarcador,
  };
}