import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';
import { Image, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { Detection } from '../../domain/entities/Detection';
import { ObjectDetector } from '../../domain/repositories/ObjectDetector';
import { preprocessImage } from './imagePreprocess';
import {
  CLASS_NAMES,
  CLASS_SCORE_THRESHOLDS,
  INVENTORY_CONTRACT,
  IOU_THRESHOLD,
  NORMALIZED_COORDS,
  SCORE_THRESHOLD,
} from './modelConfig';
import { decodeYolo } from './yoloPostprocess';
import { getProductionReadinessErrors } from './inventoryContractValidator';

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
      } else {
        // iOS release: passa o require diretamente para a react-native-fast-tflite
        // resolver o recurso empacotado no bundle nativo do iOS.
        const modelAsset = require('../../../assets/models/yolo.tflite');
        const m = await loadTensorflowModel(modelAsset, []);
        this.model = m;
        return m;
      }

      if (!finalSource) throw new Error('Caminho do modelo vazio.');

      const m = await loadTensorflowModel({ url: finalSource }, []);
      this.model = m;
      return m;
    })();

    return this.loading;
  }


  async detect(imageUri: string): Promise<Detection[]> {
    if (!__DEV__) {
      const readinessErrors = getProductionReadinessErrors(INVENTORY_CONTRACT);
      if (readinessErrors.length > 0) {
        throw new Error(`Inventory model is not production-ready: ${readinessErrors.join(' ')}`);
      }
    }

    const model = await this.load();
    const inputTensor = model.inputs[0];
    const outputShape = model.outputs[0].shape;
    const inputShape = inputTensor.shape;
    const isNHWC = inputShape[inputShape.length - 1] === 3;
    const inputSize = inputShape[isNHWC ? 1 : inputShape.length - 1];

    const inputFloats = await preprocessImage(imageUri, inputSize, isNHWC);

    const clonedBuffer = inputFloats.buffer.slice(0) as ArrayBuffer;
    const result = model.runSync([clonedBuffer]);
    const outputBuffer = result[0] as ArrayBuffer;
    const outputFloats = new Float32Array(outputBuffer);

    const deteccoes = decodeYolo(outputFloats, {
      classNames: CLASS_NAMES,
      classScoreThresholds: CLASS_SCORE_THRESHOLDS,
      scoreThreshold: SCORE_THRESHOLD,
      iouThreshold: IOU_THRESHOLD,
      inputSize,
      normalizedCoords: NORMALIZED_COORDS,
    }, outputShape);

    return deteccoes;
  }
}