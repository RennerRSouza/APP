import {useFocusEffect} from '@react-navigation/native';
import {useCallback, useState} from 'react';
import {container} from '../../core/di/container';
import {Contagem} from '../../domain/entities/Contagem';

export function useHistorico() {
  const [items, setItems] = useState<Contagem[]>([]);
  useFocusEffect(
    useCallback(() => {
      container.listarContagens.execute().then(setItems).catch(() => setItems([]));
    }, []),
  );
  return items;
}
