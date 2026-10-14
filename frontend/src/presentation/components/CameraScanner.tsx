
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';

interface CameraScannerProps {
  onClose: () => void;
  onPhotoCaptured: (imagePath: string) => void;
}

export function CameraScanner({ onClose, onPhotoCaptured }: CameraScannerProps) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const photoOutput = usePhotoOutput({});

  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleCapture = async () => {
    if (isCapturing) return;

    try {
      setIsCapturing(true);

      const photoFile = await photoOutput.capturePhotoToFile(
        {
          flashMode: 'off',
          enableShutterSound: false,
        },
        
        {}
      );

      console.log('Foto salva em:', photoFile.filePath);
      onPhotoCaptured(`file://${photoFile.filePath}`); 
      
    } catch (error) {
      console.error('Erro ao capturar foto:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0056b3" />
        <Text style={styles.text}>
          Solicitando permissão da câmera...
        </Text>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>
          Nenhuma câmera traseira encontrada.
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.button}>
          <Text style={styles.buttonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        outputs={[photoOutput]}
      />

      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
      >
        <Text style={styles.closeText}>✖ Fechar</Text>
      </TouchableOpacity>

      <View style={styles.captureContainer}>
        <TouchableOpacity
          style={[
            styles.captureButton,
            isCapturing && styles.captureButtonDisabled,
          ]}
          onPress={handleCapture}
          disabled={isCapturing}
        >
          {isCapturing && (
            <ActivityIndicator color="#0056b3" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6F9',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },
  button: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#0056b3',
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 8,
  },
  closeText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  captureContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF',
    borderWidth: 4,
    borderColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    backgroundColor: '#CCC',
  },
});
