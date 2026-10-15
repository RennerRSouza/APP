import {Detection} from '../entities/Detection';

export interface ObjectDetector {
  detect(imageUri: string): Promise<Detection[]>;
}
