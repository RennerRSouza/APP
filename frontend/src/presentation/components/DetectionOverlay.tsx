import React, {useEffect, useState} from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {theme} from '../../core/theme';
import {Detection} from '../../domain/entities/Detection';

/** Desenha a foto com proporção original e as boxes em % (coords normalizadas). */
export function DetectionOverlay({uri, detections}: {uri: string; detections: Detection[]}) {
  const [aspect, setAspect] = useState(4 / 3);

  useEffect(() => {
    Image.getSize(uri, (w, h) => setAspect(w / h), () => undefined);
  }, [uri]);

  return (
    <View style={[styles.container, {aspectRatio: aspect}]}>
      <Image source={{uri}} style={StyleSheet.absoluteFill} resizeMode="stretch" />
      {detections.map((d, i) => (
        <View
          key={i}
          style={[
            styles.box,
            {
              left: `${d.box.x * 100}%`,
              top: `${d.box.y * 100}%`,
              width: `${d.box.width * 100}%`,
              height: `${d.box.height * 100}%`,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {width: '100%', borderRadius: theme.radius.md, overflow: 'hidden', backgroundColor: theme.colors.surface},
  box: {position: 'absolute', borderWidth: 2, borderColor: theme.colors.box},
});
