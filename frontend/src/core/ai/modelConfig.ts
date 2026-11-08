import inventoryContractJson from '../../../assets/configs/event_rental_inventory.json';
import { InventoryContractSchema } from './inventoryContractValidator';
import type { InventoryClass, InventoryContract } from './inventoryContractTypes';

export const INVENTORY_CONTRACT: InventoryContract = InventoryContractSchema.parse(inventoryContractJson) as InventoryContract;
export const MODEL_ASSET_PATH = INVENTORY_CONTRACT.model.asset_path;
export const CLASS_NAMES: readonly InventoryClass[] = Object.entries(INVENTORY_CONTRACT.model.class_id_mapping)
  .sort(([left], [right]) => Number(left) - Number(right))
  .map(([, className]) => className);
export const MODEL_VERSION = `${INVENTORY_CONTRACT.model.source_model}-v${INVENTORY_CONTRACT.model.source_version}`;
export const INPUT_SIZE = 640;
export const SCORE_THRESHOLD = 0.25;
export const IOU_THRESHOLD = 0.45;
// Ultralytics tflite exporta coords normalizadas (0..1). Se seu export vier em pixels, coloque false.
export const NORMALIZED_COORDS = true;

export const CLASS_SCORE_THRESHOLDS = Object.fromEntries(
  Object.entries(INVENTORY_CONTRACT.model.confidence_thresholds)
    .filter((entry): entry is [string, number] => entry[1] !== null),
);

if (MODEL_ASSET_PATH !== 'assets/models/yolo.tflite') {
  throw new Error(`Contract model.asset_path (${MODEL_ASSET_PATH}) does not match the statically bundled TFLite asset.`);
}
