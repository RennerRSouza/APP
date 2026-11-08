import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';
import { Image, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { Detection } from '../../domain/entities/Detection';
import { ObjectDetector } from '../../domain/repositories/ObjectDetector';
import { preprocessImage } from './imagePreprocess';
import {
  CLASS_NAMES,
  INPUT_SIZE,
  IOU_THRESHOLD,
  NORMALIZED_COORDS,
  SCORE_THRESHOLD,
} from './modelConfig';
import { decodeYolo } from './yoloPostprocess';

export class YoloDetector implements ObjectDetector {
  private model: TensorflowModel | null = null;
  private loading: Promise<TensorflowModel> | null = null;

  private load(): Promise<TensorflowModel> {
    if (this.model) return Promise.resolve(this.model);

    this.loading ??= (async () => {
      let finalSource = '';

      if (__DEV__) {
        const modelAsset = require('../../../assets/models/yolo.tflite');
        const assetInfo = Image.resolveAssetSource(modelAsset);
        if (!assetInfo?.uri) throw new Error('Modelo não resolvido no Debug.');
        finalSource = assetInfo.uri;
      } else if (Platform.OS === 'android') {
        const destPath = `${RNFS.DocumentDirectoryPath}/yolo.tflite`;
        if (!(await RNFS.exists(destPath))) {
          await RNFS.copyFileAssets('yolo.tflite', destPath);
        }
        finalSource = `file://${destPath}`;
      }

      const m = await loadTensorflowModel({ url: finalSource }, []);
      this.model = m;
      return m;
    })();

    return this.loading;
  }

  async detect(imageUri: string): Promise<Detection[]> {
    const model = await this.load();
    
    const inputTensor = model.inputs[0];
    const outputShape = model.outputs[0].shape;
    const isNHWC = inputTensor.shape[inputTensor.shape.length - 1] === 3;

    // 1. Recebemos a matriz numérica das cores
    const inputFloats = await preprocessImage(imageUri, INPUT_SIZE, isNHWC);

    // 2. Extraímos a memória base (.buffer) e criamos um clone (.slice(0)).
    // Usamos 'as ArrayBuffer' para calar o TypeScript sobre o 'SharedArrayBuffer'.
    const clonedBuffer = inputFloats.buffer.slice(0) as ArrayBuffer;

    // 3. Executamos de forma sincrona
    const result = model.runSync([clonedBuffer]);

    // 4. A resposta da V3 já vem como ArrayBuffer limpo
    const outputBuffer = result[0] as ArrayBuffer;
    
    // 5. Criamos uma lente matemática para ler os números das caixas
    const outputFloats = new Float32Array(outputBuffer);

    const deteccoes = decodeYolo(outputFloats, {
      classNames: CLASS_NAMES,
      scoreThreshold: SCORE_THRESHOLD,
      iouThreshold: IOU_THRESHOLD,
      inputSize: INPUT_SIZE,
      normalizedCoords: NORMALIZED_COORDS,
    }, outputShape);

    return deteccoes;
  }
}