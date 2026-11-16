import contract from '../assets/configs/event_rental_inventory.json';
import {
  getProductionReadinessErrors,
  validateWithZod,
} from '../src/core/ai/inventoryContractValidator';
import {CLASS_NAMES} from '../src/core/ai/modelConfig';

describe('inventory contract v2', () => {
  it('validates the v2 JSON as production ready and exposes model classes in numeric ID order', () => {
    const result = validateWithZod(contract);

    expect(result.success).toBe(true);
    expect(CLASS_NAMES).toEqual([
      'Black-Fold-Table',
      'Brown-Fold-Table',
      'Gradil',
      'table_joint',
    ]);

    if (result.success) {
      const readinessErrors = getProductionReadinessErrors(result.value);
      expect(readinessErrors).toHaveLength(0);
    }
  });

  it('rejects an uncalibrated contract with null threshold', () => {
    const uncalibratedContract = {
      ...contract,
      configuration_status: 'calibration_required',
      model: {
        ...contract.model,
        confidence_thresholds: {
          ...contract.model.confidence_thresholds,
          Gradil: null,
        },
      },
    };

    expect(validateWithZod(uncalibratedContract).success).toBe(false);
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