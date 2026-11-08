import { useEffect, useRef } from 'react';
import { accelerometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';

// Atualiza a cada 300ms (rápido o suficiente para o clique, leve o suficiente para a CPU)
setUpdateIntervalForType(SensorTypes.accelerometer, 300);

export function useCameraAngle() {
  // useRef armazena o valor silenciosamente, sem causar re-renderizações na interface da câmera
  const angleRef = useRef({ pitch: null as number | null, roll: null as number | null });

  useEffect(() => {
    const subscription = accelerometer.subscribe(({ x, y, z }) => {
      // Conversão trigonométrica da força da gravidade para graus (-180 a 180)
      const pitch = Math.round(Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI));
      const roll = Math.round(Math.atan2(-x, z) * (180 / Math.PI));
      
      angleRef.current = { pitch, roll };
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return angleRef;
}