import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View, Image } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';
import { pickImage } from '../../core/gallery/pickImage';
import { theme } from '../../core/theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Camera'>;

export function CameraScreen({ navigation }: Props) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const photoOutput = usePhotoOutput({});

  const [busy, setBusy] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const capturar = async () => {
    if (busy) return;

    setBusy(true);

    try {
      const foto = await photoOutput.capturePhotoToFile(
        {
          flashMode: 'off',
          enableShutterSound: false,
        },
        {}
      );

      setPreviewImage(`file://${foto.filePath}`);

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
        // Envia direto para a tela de pré-visualização
        setPreviewImage(uri);
      }
    } catch (e) {
      Alert.alert('Erro', String(e));
    }
  };

  const descartarFoto = () => {
    setPreviewImage(null);
  };

  const analisarFoto = () => {
    if (previewImage) {
      // Envia para o processamento de imagem
      navigation.navigate('Resultado', { imageUri: previewImage });
    }
  }

  // TELA DE PRÉ-VISUALIZAÇÃO (TSK-08)
  if (previewImage) {
    return (
      <View style={styles.previewContainer}>
        <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />
        <View style={styles.bar}>
          <PrimaryButton label="Descartar" onPress={descartarFoto} variant="ghost" />
          <PrimaryButton label="Analisar Imagem" onPress={analisarFoto} />
        </View>
      </View>
    )
  }

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

  // TELA DA CÂMERA
  return (
    <View style={styles.flex}>
      <Camera style={styles.flex} device={device} isActive outputs={[photoOutput]} />
      <View style={styles.bar}>
        <PrimaryButton label="Galeria" onPress={galeria} variant="ghost" />
        <PrimaryButton label={busy ? '...' : 'Capturar'} onPress={capturar} disabled={busy} />
        <PrimaryButton label="Histórico" onPress={() => navigation.navigate('Historico')} variant="ghost" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', padding: theme.spacing.lg, gap: theme.spacing.md },
  text: { color: theme.colors.text, fontSize: theme.font.body, textAlign: 'center' },
  bar: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    left: theme.spacing.md,
    right: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
    padding: 8
  },
  previewContainer: { flex: 1, backgroundColor: '#000' },
  previewImage: { flex: 1, width: '100%' }
});