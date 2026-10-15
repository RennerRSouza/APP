import {loadTensorflowModel, TensorflowModel} from 'react-native-fast-tflite';
import {Detection} from '../../domain/entities/Detection';
import {ObjectDetector} from '../../domain/repositories/ObjectDetector';
import {preprocessImage} from './imagePreprocess';
import {
  CLASS_NAMES,
  INPUT_SIZE,
  IOU_THRESHOLD,
  NORMALIZED_COORDS,
  SCORE_THRESHOLD,
} from './modelConfig';
import {decodeYolo} from './yoloPostprocess';

export class YoloDetector implements ObjectDetector {
  private model: TensorflowModel | null = null;
  private loading: Promise<TensorflowModel> | null = null;

  private load(): Promise<TensorflowModel> {
    if (this.model) {
      return Promise.resolve(this.model);
    }
    // Promise compartilhada evita carregar o modelo duas vezes em chamadas concorrentes.
    this.loading ??= loadTensorflowModel(require('../../../assets/models/yolo.tflite')).then(m => {
      this.model = m;
      return m;
    });
    return this.loading;
  }

  async detect(imageUri: string): Promise<Detection[]> {
    const model = await this.load();
    const input = await preprocessImage(imageUri, INPUT_SIZE);
    const [raw] = await model.run([input]);
    return decodeYolo(new Float32Array(raw.buffer as ArrayBuffer), {
      classNames: CLASS_NAMES,
      scoreThreshold: SCORE_THRESHOLD,
      iouThreshold: IOU_THRESHOLD,
      inputSize: INPUT_SIZE,
      normalizedCoords: NORMALIZED_COORDS,
    });
  }
}
