import {useCallback, useEffect, useState} from 'react';
import {container} from '../../core/di/container';
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

  useEffect(() => {
    let cancelled = false; // evita setState após desmontar
    setState({status: 'processing'});
    container.contarObjetos
      .execute(imageUri)
      .then(resultado => {
        if (cancelled) {
          return;
        }
        setConfirmado(resultado.total);
        setState({status: 'done', resultado});
      })
      .catch(e => !cancelled && setState({status: 'error', message: String(e?.message ?? e)}));
    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  const ajustar = useCallback((delta: number) => setConfirmado(v => Math.max(0, v + delta)), []);

  // Cálculo da divergência percentual entre IA e operador
  const totalIA = state.status === 'done' ? state.resultado.total : 0;
  const delta = Math.abs(confirmado - totalIA);
  const divergenciaPercentual = totalIA > 0 ? (delta / totalIA) * 100 : (confirmado > 0 ? 100 : 0);
  const exigeJustificativa = divergenciaPercentual > 10.0;

  const salvar = useCallback(async () => {
    if (state.status !== 'done') {
      return;
    }
    if (exigeJustificativa && !justificativa.trim()) {
      throw new Error('A divergência supera 10% da IA. Justificativa obrigatória.');
    }
    setSaving(true);
    try {
      await container.salvarContagem.execute({
        imageUri,
        resultado: state.resultado,
        totalConfirmado: confirmado,
        justificativa: justificativa.trim() || undefined,
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
  };
}