import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Detection } from '../../domain/entities/Detection';
import {
  RAIO_TOQUE_PX,
  encontrarMarcadorNoToque,
  normalizarToque,
} from '../../core/utils/marcadores';
import { calcularTamanhoMarcador } from '../../core/ai/markerScale';


interface DetectionOverlayProps {
  uri: string;
  detections: Detection[];
  cameraPitch?: number | null;
  cameraRoll?: number | null;
  /** Toque em área vazia: coordenadas normalizadas [0,1]. */
  onAdicionarMarcador?: (x: number, y: number) => void;
  /** Toque em marcador existente: índice na lista `detections`. */
  onRemoverMarcador?: (index: number) => void;
}

const COLOR_MAP: Record<string, string> = {
  'table_joint': '#32CD32',
  'Black-Fold-Table': '#FF3B30',
  'Brown-Fold-Table': '#007AFF',
  'Gradil': '#FF9500',
  'manual': '#AF52DE',
};

const DEFAULT_COLOR = '#FFD700';

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  uri,
  detections,
  onAdicionarMarcador,
  onRemoverMarcador,
  cameraPitch,
}) => {
  // POS-S3-13: tamanho do ponto central depende da inclinação do celular
  const markerSize = useMemo(() => calcularTamanhoMarcador(cameraPitch), [cameraPitch]);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const [imgLayout, setImgLayout] = useState({ width: 0, height: 0 });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) scale.value = 1;
      if (scale.value > 4) scale.value = 4;
      savedScale.value = scale.value;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const scaleX = imgLayout.width > 0 ? imgLayout.width : 400;
  const scaleY = imgLayout.height > 0 ? imgLayout.height : 400;

  // Toque simples: remove o marcador sob o dedo ou, em área vazia, adiciona um novo.
  // Race com o pinch: se dois dedos entram e o zoom ativa, o toque é cancelado.
  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .maxDuration(250)
    .maxDistance(12)
    .onEnd((e, success) => {
      if (!success) {
        return;
      }
      // Com zoom, o mesmo dedo cobre menos pixels da imagem: reduz o raio de acerto.
      const raio = RAIO_TOQUE_PX / Math.max(scale.value, 1);
      const indice = encontrarMarcadorNoToque(detections, e.x, e.y, scaleX, scaleY, raio);
      if (indice >= 0) {
        onRemoverMarcador?.(indice);
        return;
      }
      const ponto = normalizarToque(e.x, e.y, scaleX, scaleY);
      if (ponto) {
        onAdicionarMarcador?.(ponto.x, ponto.y);
      }
    });

  const gesture = Gesture.Race(pinchGesture, tapGesture);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View 
        style={[styles.container, animatedStyle]}
        onLayout={(e) => {
          setImgLayout({ 
            width: e.nativeEvent.layout.width, 
            height: e.nativeEvent.layout.height 
          });
        }}
      >
        <Image 
          source={{ uri }} 
          style={StyleSheet.absoluteFill} 
          resizeMode="contain"
        />
        
        {/* Camada exclusiva para os marcadores coloridos, acima da imagem */}
        <View style={StyleSheet.absoluteFill}>
          {detections.map((det, index) => {
            const color = COLOR_MAP[det.label] || DEFAULT_COLOR;
            const centerX = (det.box.x + det.box.width / 2) * scaleX;
            const centerY = (det.box.y + det.box.height / 2) * scaleY;

            return (
              <View
                key={index}
                style={[
                  styles.detectionMarker,
                  {
                    width: markerSize,
                    height: markerSize,
                    borderRadius: markerSize / 2,
                    left: centerX - markerSize / 2,
                    top: centerY - markerSize / 2,
                    backgroundColor: color,
                  }
                ]}
              />
            );
          })}
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1, 
    backgroundColor: '#000',
    overflow: 'hidden',
    borderRadius: 8,
  },
  detectionMarker: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 999, 
    elevation: 10,
  }
});