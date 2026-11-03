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
    if (this.model) {
      return Promise.resolve(this.model);
    }

    this.loading ??= (async () => {
      let finalSource = '';

      if (__DEV__) {
        const modelAsset = require('../../../assets/models/yolo.tflite');
        const assetInfo = Image.resolveAssetSource(modelAsset);
        
        if (!assetInfo?.uri) {
          throw new Error('Não foi possível resolver o modelo no Debug.');
        }
        finalSource = assetInfo.uri;
      } else if (Platform.OS === 'android') {
        const destPath = `${RNFS.DocumentDirectoryPath}/yolo.tflite`;
        const exists = await RNFS.exists(destPath);
        
        if (!exists) {
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
    const input = await preprocessImage(imageUri, INPUT_SIZE);

    const inputBuffer = new ArrayBuffer(input.byteLength);
    new Float32Array(inputBuffer).set(input);

    const [raw] = await model.run([inputBuffer]);

    return decodeYolo(new Float32Array(raw), {
      classNames: CLASS_NAMES,
      scoreThreshold: SCORE_THRESHOLD,
      iouThreshold: IOU_THRESHOLD,
      inputSize: INPUT_SIZE,
      normalizedCoords: NORMALIZED_COORDS,
    });
  }
}