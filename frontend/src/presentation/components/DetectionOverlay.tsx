import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Detection } from '../../domain/entities/Detection';

interface DetectionOverlayProps {
  uri: string;
  detections: Detection[];
}

const COLOR_MAP: Record<string, string> = {
  'table_joint': '#32CD32',
  'Black-Fold-Table': '#FF3B30',
  'Brown-Fold-Table': '#007AFF',
  'Gradil': '#FF9500',
};

const DEFAULT_COLOR = '#FFD700';
const MARKER_SIZE = 14;

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({ uri, detections }) => {
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

  // Seguro de layout: se o React Native ainda não calculou a tela, usamos 400 temporariamente.
  const scaleX = imgLayout.width > 0 ? imgLayout.width : 400;
  const scaleY = imgLayout.height > 0 ? imgLayout.height : 400;

  return (
    <GestureDetector gesture={pinchGesture}>
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
                    left: centerX - MARKER_SIZE / 2,
                    top: centerY - MARKER_SIZE / 2,
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
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 999, 
    elevation: 10,
  }
});