import ImageResizer from '@bam.tech/react-native-image-resizer';
import { toByteArray } from 'base64-js';
import jpeg from 'jpeg-js';
import RNFS from 'react-native-fs';

export async function preprocessImage(uri: string, size: number): Promise<Float32Array> {
  // TSK-09: Letterbox nativo garantido via "contain"
  const resized = await ImageResizer.createResizedImage(
    uri, size, size, 'JPEG', 85, 0, undefined, false, 
    { mode: 'contain', onlyScaleDown: false }
  );

  try {
    const b64 = await RNFS.readFile(resized.path, 'base64');
    const { data } = jpeg.decode(toByteArray(b64), { useTArray: true, formatAsRGBA: true });
    
    const out = new Float32Array(size * size * 3);
    
    // ⚡ REVERSÃO TÉCNICA: Tensor NHWC [1, 640, 640, 3].
    // Entregamos os canais R, G e B agrupados por pixel para bater com a arquitetura do modelo.
    for (let i = 0, j = 0; i < data.length; i += 4) {
      out[j++] = data[i] / 255.0;       // R
      out[j++] = data[i + 1] / 255.0;   // G
      out[j++] = data[i + 2] / 255.0;   // B
      // O canal Alpha (i + 3) é descartado
    }
    
    return out;
  } finally {
    RNFS.unlink(resized.path).catch(() => undefined);
  }
}