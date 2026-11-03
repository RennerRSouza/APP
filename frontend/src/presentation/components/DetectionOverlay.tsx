import React, {useEffect, useState} from 'react';
import {Image, StyleSheet, View, Text, Dimensions} from 'react-native';
import {theme} from '../../core/theme';
import {Detection} from '../../domain/entities/Detection';

// Paleta visual para distinção de classes na contagem
const CLASS_COLORS: Record<string, string> = {
  'Mesa Bistrô': '#FF3B30', 
  'Gradil': '#34C759',      
  'Default': '#007AFF'
};

export function DetectionOverlay({uri, detections}: {uri: string; detections: Detection[]}) {
  const [aspect, setAspect] = useState(4 / 3);

  useEffect(() => {
    Image.getSize(uri, (w, h) => setAspect(w / h), () => {});
  }, [uri]);

  return (
    <View style={[styles.container, {aspectRatio: aspect}]}>
      {/* TSK-09: A IA processa em letterbox, então a visualização DEVE respeitar o aspect original */}
      <Image source={{uri}} style={StyleSheet.absoluteFill} resizeMode="contain" />
      
      {detections.map((d, i) => {
        const color = CLASS_COLORS[d.label] || CLASS_COLORS['Default'];
        return (
          <View
            key={i}
            style={[
              styles.box,
              {
                borderColor: color,
                left: `${d.box.x * 100}%`,
                top: `${d.box.y * 100}%`,
                width: `${d.box.width * 100}%`,
                height: `${d.box.height * 100}%`,
              },
            ]}
          >
            {/* Rótulo de Classe e Confiança exigido pela TSK-14 */}
            <View style={[styles.labelContainer, { backgroundColor: color }]}>
              <Text style={styles.labelText}>
                {d.label} {(d.score * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {width: '100%', borderRadius: 8, overflow: 'hidden', backgroundColor: '#000'},
  box: {position: 'absolute', borderWidth: 2},
  labelContainer: {
    position: 'absolute',
    top: -20,
    left: -2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  labelText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' }
});