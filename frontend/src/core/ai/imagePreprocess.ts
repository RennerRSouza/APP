import ImageResizer from '@bam.tech/react-native-image-resizer';
import { toByteArray } from 'base64-js';
import jpeg from 'jpeg-js';
import RNFS from 'react-native-fs';

export async function preprocessImage(uri: string, size: number, isNHWC: boolean): Promise<Float32Array> {
  const resized = await ImageResizer.createResizedImage(
    uri, size, size, 'JPEG', 100, 0, undefined, false, 
    { mode: 'contain', onlyScaleDown: false }
  );

  try {
    const b64 = await RNFS.readFile(resized.path, 'base64');
    
    // Pegamos a largura e altura REAIS da imagem após o 'contain'
    const { data, width, height } = jpeg.decode(toByteArray(b64), { useTArray: true, formatAsRGBA: true });
    
    // O Float32Array nasce automaticamente preenchido com 0.0 (Pixels Pretos)
    const floatArray = new Float32Array(size * size * 3);
    
    // Calculamos a margem para centralizar a imagem menor dentro do quadrado 640x640
    const offsetX = Math.floor((size - width) / 2);
    const offsetY = Math.floor((size - height) / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Posição do pixel na imagem menor
        const srcPixelIdx = (y * width + x) * 4;
        
        const r = data[srcPixelIdx] / 255.0;
        const g = data[srcPixelIdx + 1] / 255.0;
        const b = data[srcPixelIdx + 2] / 255.0;
        
        // Posição final dentro do nosso tensor 640x640 (Letterbox)
        const destX = x + offsetX;
        const destY = y + offsetY;
        const destPixelIdx = destY * size + destX;
        
        if (isNHWC) {
          floatArray[destPixelIdx * 3 + 0] = r;
          floatArray[destPixelIdx * 3 + 1] = g;
          floatArray[destPixelIdx * 3 + 2] = b;
        } else {
          floatArray[destPixelIdx] = r;
          floatArray[destPixelIdx + size * size] = g;
          floatArray[destPixelIdx + size * size * 2] = b;
        }
      }
    }
    
    return floatArray;
  } finally {
    RNFS.unlink(resized.path).catch(() => undefined);
  }
}