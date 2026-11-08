import contract from '../assets/configs/event_rental_inventory.json';
import {
  getProductionReadinessErrors,
  validateWithZod,
} from '../src/core/ai/inventoryContractValidator';
import {CLASS_NAMES, MODEL_VERSION} from '../src/core/ai/modelConfig';

describe('inventory contract v2', () => {
  it('validates the v2 JSON and exposes model classes in numeric ID order', () => {
    const result = validateWithZod(contract);

    expect(result.success).toBe(true);
    expect(CLASS_NAMES).toEqual([
      'Black-Fold-Table',
      'Brown-Fold-Table',
      'Gradil',
      'table_joint',
    ]);
    expect(MODEL_VERSION).toBe('event-rental-inventory-v14');
  });

  it('allows structural validation while reporting calibration is required for production', () => {
    const result = validateWithZod(contract);
    expect(result.success).toBe(true);
    if (result.success) {
      const readinessErrors = getProductionReadinessErrors(result.value);
      expect(readinessErrors.join(' ')).toContain('requires calibration');
      expect(readinessErrors.join(' ')).toContain('model.confidence_thresholds.Gradil');
    }
  });

  it('rejects a class ID map that does not match the output class count', () => {
    const invalid = {
      ...contract,
      model: {
        ...contract.model,
        class_id_mapping: {
          '0': 'Black-Fold-Table',
          '1': 'Brown-Fold-Table',
          '2': 'Gradil',
        },
      },
    };

    expect(validateWithZod(invalid).success).toBe(false);
  });
});