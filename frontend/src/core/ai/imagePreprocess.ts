import ImageResizer from '@bam.tech/react-native-image-resizer';
import {toByteArray} from 'base64-js';
import jpeg from 'jpeg-js';
import RNFS from 'react-native-fs';

/**
 * URI -> Float32Array NHWC [size*size*3] normalizado 0..1.
 * DÍVIDA TÉCNICA CONSCIENTE: usa "stretch" (sem letterbox) e decodifica JPEG em JS (~0,5–1,5 s).
 * O treino do YOLO usa letterbox; se a acurácia cair em imagens não-quadradas, migrar para
 * letterbox e decodificação nativa (ex.: Skia). Meça antes de otimizar.
 */
export async function preprocessImage(uri: string, size: number): Promise<Float32Array> {
  const resized = await ImageResizer.createResizedImage(uri, size, size, 'JPEG', 90, 0, undefined, false, {
    mode: 'stretch',
    onlyScaleDown: false,
  });
  try {
    const b64 = await RNFS.readFile(resized.path, 'base64');
    const {data} = jpeg.decode(toByteArray(b64), {useTArray: true, formatAsRGBA: true});
    const out = new Float32Array(size * size * 3);
    for (let i = 0, j = 0; i < data.length; i += 4) {
      out[j++] = data[i] / 255;
      out[j++] = data[i + 1] / 255;
      out[j++] = data[i + 2] / 255;
    }
    return out;
  } finally {
    RNFS.unlink(resized.path).catch(() => undefined);
  }
}
