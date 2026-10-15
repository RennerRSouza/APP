import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useRef, useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {Camera, useCameraDevice, useCameraPermission} from 'react-native-vision-camera';
import {pickImage} from '../../core/gallery/pickImage';
import {toFileUri} from '../../core/media/photoUri';
import {theme} from '../../core/theme';
import {PrimaryButton} from '../components/PrimaryButton';
import {RootStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Camera'>;

export function CameraScreen({navigation}: Props) {
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  const [busy, setBusy] = useState(false);

  const capturar = async () => {
    if (!camera.current || busy) {
      return;
    }
    setBusy(true);
    try {
      const foto = await camera.current.takePhoto();
      navigation.navigate('Resultado', {imageUri: toFileUri(foto.path)});
    } catch (e) {
      Alert.alert('Erro ao capturar', String(e));
    } finally {
      setBusy(false);
    }
  };

  const galeria = async () => {
    try {
      const uri = await pickImage();
      if (uri) {
        navigation.navigate('Resultado', {imageUri: uri});
      }
    } catch (e) {
      Alert.alert('Erro', String(e));
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Precisamos da câmera para contar objetos.</Text>
        <PrimaryButton label="Permitir câmera" onPress={requestPermission} />
        <PrimaryButton label="Escolher da galeria" onPress={galeria} variant="ghost" />
      </View>
    );
  }
  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Nenhuma câmera disponível.</Text>
        <PrimaryButton label="Escolher da galeria" onPress={galeria} />
      </View>
    );
  }
  return (
    <View style={styles.flex}>
      <Camera ref={camera} style={styles.flex} device={device} isActive photo />
      <View style={styles.bar}>
        <PrimaryButton label="Galeria" onPress={galeria} variant="ghost" />
        <PrimaryButton label={busy ? '...' : 'Capturar'} onPress={capturar} disabled={busy} />
        <PrimaryButton label="Histórico" onPress={() => navigation.navigate('Historico')} variant="ghost" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  center: {flex: 1, justifyContent: 'center', padding: theme.spacing.lg, gap: theme.spacing.md},
  text: {color: theme.colors.text, fontSize: theme.font.body, textAlign: 'center'},
  bar: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    left: theme.spacing.md,
    right: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
