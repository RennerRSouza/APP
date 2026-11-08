import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Detection } from '../../domain/entities/Detection';

interface DetectionOverlayProps {
  uri: string;
  detections: Detection[];
  cameraPitch?: number | null;
  cameraRoll?: number | null;
}

const COLOR_MAP: Record<string, string> = {
  'table_joint': '#32CD32',
  'Black-Fold-Table': '#FF3B30',
  'Brown-Fold-Table': '#007AFF',
};

const DEFAULT_COLOR = '#FFD700';

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({ 
  uri, 
  detections, 
  cameraPitch, 
  cameraRoll 
}) => {
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
  const rotacaoDeg = cameraRoll ? `${cameraRoll}deg` : '0deg';

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
        
        <View style={StyleSheet.absoluteFill}>
          {detections.map((det, index) => {
            const color = COLOR_MAP[det.label] || DEFAULT_COLOR;

            const left = det.box.x * scaleX;
            const top = det.box.y * scaleY;
            const width = det.box.width * scaleX;
            const height = det.box.height * scaleY;

            return (
              <View
                key={index}
                style={[
                  styles.linhaMarcacao,
                  {
                    left: left,
                    width: Math.max(width, 12), 
                    top: top + (height / 2), 
                    backgroundColor: color, 
                    transform: [
                      { rotateZ: rotacaoDeg }
                    ]
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
  linhaMarcacao: {
    position: 'absolute',
    height: 4, 
    borderRadius: 2,
    zIndex: 999, 
    elevation: 10,
  }
});