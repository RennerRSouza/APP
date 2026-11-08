import { z } from 'zod';
import type { InventoryContract, NullableNumber } from './inventoryContractTypes';

const NullableNumberSchema = z.number().nonnegative().nullable();
const ConfidenceThresholdSchema = z.number().min(0).max(1).nullable();

const ExecutionSchema = z.object({
  mode: z.literal('offline'),
  input_type: z.literal('single_photo'),
  tracking_enabled: z.literal(false),
  network_required: z.literal(false),
});

const ModelSchema = z.object({
  runtime: z.literal('tflite'),
  source_model: z.string(),
  source_version: z.number().int().positive(),
  asset_path: z.string().nullable(),
  input_specification: z.string(),
  output_decoder: z.string(),
  class_id_mapping: z.record(z.string(), z.enum([
    'Black-Fold-Table',
    'Brown-Fold-Table',
    'Gradil',
    'table_joint',
  ])),
  confidence_thresholds: z.record(z.string(), ConfidenceThresholdSchema),
});

const ClassesSchema = z.object({
  table_objects: z.array(z.string()),
  primary_counting_evidence: z.string(),
  direct_count_objects: z.array(z.string()),
});

const CoordinatesSchema = z.object({
  reference: z.string(),
  normalized_range: z.tuple([z.number(), z.number()]),
  detection_anchor: z.string(),
  preserve_crop_to_original_transform: z.boolean(),
  crop_edge_is_original_image_edge: z.boolean(),
});

const RowDetectionSchema = z.object({
  method: z.string(),
  apply_to_classes: z.array(z.string()),
  separate_axis_per_row: z.boolean(),
  longitudinal_axis: z.string(),
  transverse_axis: z.string(),
  orientation_tolerance_degrees: NullableNumberSchema,
  minimum_supporting_detections: z.number().int().positive().nullable(),
  maximum_longitudinal_gap_in_local_row_widths: NullableNumberSchema,
  on_insufficient_evidence: z.string(),
});

const RowRefinementSchema = z.object({
  enabled: z.boolean(),
  operation: z.string(),
  crop_margin_in_local_row_widths: NullableNumberSchema,
  maximum_additional_inference_passes_per_row: z.number().int().nonnegative(),
  preserve_aspect_ratio: z.boolean(),
  preserve_original_image_boundaries: z.boolean(),
});

const EvidenceMatchingRuleSchema = z.object({
  method: z.string(),
  maximum_center_distance_in_joint_sizes: NullableNumberSchema.optional(),
  minimum_iou: z.number().min(0).max(1).nullable().optional(),
  maximum_center_distance_in_object_sizes: NullableNumberSchema.optional(),
});

const EvidenceMergingSchema = z.object({
  merge_full_photo_and_crop_detections: z.boolean(),
  matching_space: z.string(),
  same_class_required: z.boolean(),
  retain_detection_provenance: z.boolean(),
  matching_rules: z.object({
    table_joint: EvidenceMatchingRuleSchema,
    table_objects: EvidenceMatchingRuleSchema,
    Gradil: EvidenceMatchingRuleSchema,
  }),
});

const JointPairingSchema = z.object({
  class_name: z.string(),
  pair_size: z.number().int().positive(),
  tables_per_pair: z.number().int().positive(),
  method: z.string(),
  geometry: z.object({
    same_longitudinal_position_required: z.boolean(),
    transverse_separation_required: z.boolean(),
    perspective_aware: z.boolean(),
    maximum_longitudinal_offset_in_local_row_widths: NullableNumberSchema,
    minimum_transverse_separation_in_local_row_widths: NullableNumberSchema,
    maximum_transverse_separation_in_local_row_widths: NullableNumberSchema,
  }),
  constraints: z.object({
    same_row_required: z.boolean(),
    each_joint_used_at_most_once: z.boolean(),
    reject_ambiguous_matches: z.boolean(),
    minimum_match_score_margin: z.number().min(0).max(1).nullable(),
  }),
});

const PartialTablesSchema = z.object({
  enabled: z.boolean(),
  tables_per_supported_single_joint: z.number().int().positive(),
  requirements: z.object({
    joint_is_unpaired: z.boolean(),
    row_membership_is_supported: z.boolean(),
    table_truncation_at_original_boundary_is_supported: z.boolean(),
  }),
  original_boundary_margin_normalized: z.number().min(0).max(1).nullable(),
  truncation_evidence_method: z.string().nullable(),
  unpaired_joint_alone_is_sufficient: z.boolean(),
  interior_unpaired_joint_policy: z.string(),
});

const TableAssociationSchema = z.object({
  associate_whole_table_detections_with_joint_hypotheses: z.boolean(),
  count_associated_evidence_once: z.boolean(),
  whole_table_without_joint_policy: z.string(),
  type_assignment: z.string(),
  type_without_supporting_detection: z.string(),
  conflicting_type_policy: z.string(),
});

const CountingSchema = z.object({
  tables: z.object({
    unit: z.literal('table'),
    count_unique_table_hypotheses: z.boolean(),
    include_valid_joint_pairs: z.boolean(),
    include_supported_boundary_partial_tables: z.boolean(),
    infer_tables_from_empty_spacing: z.boolean(),
    fractional_table_counts: z.boolean(),
    uncertain_candidates_in_identified_total: z.boolean(),
    missing_evidence_result: z.literal('inconclusive'),
  }),
  direct_objects: z.object({
    Gradil: z.object({
      enabled: z.boolean(),
      unit: z.literal('Gradil'),
      method: z.string(),
      objects_per_detection: z.number().positive(),
      require_duplicate_reconciliation: z.boolean(),
      require_table_joints: z.boolean(),
      require_row_membership: z.boolean(),
      apply_table_pairing_rules: z.boolean(),
      infer_objects_from_empty_spacing: z.boolean(),
      ambiguous_duplicate_policy: z.string(),
      partial_object_policy: z.string(),
      uncertain_candidates_in_identified_total: z.boolean(),
      missing_evidence_result: z.literal('inconclusive'),
    }),
  }),
  aggregation: z.object({
    keep_category_counts_separate: z.boolean(),
    include_combined_item_total: z.boolean(),
    count_evidence_as_inventory_items: z.boolean(),
  }),
});

const OutputSchema = z.object({
  include_total_identified_by_category: z.boolean(),
  include_table_counts_by_row: z.boolean(),
  include_table_counts_by_type: z.boolean(),
  include_unknown_table_type_count: z.boolean(),
  include_gradil_count: z.boolean(),
  include_uncertain_candidates: z.boolean(),
  include_evidence_per_item: z.boolean(),
  display_boxes: z.boolean(),
  optional_debug_geometry: z.boolean(),
  claim_complete_inventory: z.boolean(),
});

const ValidationSchema = z.object({
  require_calibration_before_production: z.boolean(),
  reject_missing_required_parameters: z.boolean(),
  require_valid_model_asset: z.boolean(),
  require_matching_class_metadata: z.boolean(),
  require_model_version_match: z.boolean(),
  require_all_enabled_classes_in_model: z.boolean(),
});

export const InventoryContractSchema = z.object({
  schema_version: z.literal('2.0.0'),
  id: z.string(),
  configuration_status: z.enum(['requires_calibration', 'calibrated']),
  execution: ExecutionSchema,
  model: ModelSchema,
  classes: ClassesSchema,
  coordinates: CoordinatesSchema,
  pipeline: z.array(z.string()),
  row_detection: RowDetectionSchema,
  row_refinement: RowRefinementSchema,
  evidence_merging: EvidenceMergingSchema,
  joint_pairing: JointPairingSchema,
  partial_tables: PartialTablesSchema,
  table_association: TableAssociationSchema,
  counting: CountingSchema,
  output: OutputSchema,
  validation: ValidationSchema,
}).superRefine((cfg, ctx) => {
  const mappingEntries = Object.entries(cfg.model.class_id_mapping)
    .sort(([left], [right]) => Number(left) - Number(right));
  const mappingIds = mappingEntries.map(([id]) => Number(id));
  if (mappingIds.some((id, index) => id !== index)) {
    ctx.addIssue({ code: 'custom', path: ['model', 'class_id_mapping'], message: 'Class IDs must be contiguous and start at 0.' });
  }

  const mappedClasses = mappingEntries.map(([, className]) => className);
  if (new Set(mappedClasses).size !== mappedClasses.length) {
    ctx.addIssue({ code: 'custom', path: ['model', 'class_id_mapping'], message: 'Each class must have a unique model ID.' });
  }

  const requiredClasses = [
    ...cfg.classes.table_objects,
    cfg.classes.primary_counting_evidence,
    ...cfg.classes.direct_count_objects,
  ];
  for (const className of requiredClasses) {
    if (!mappedClasses.includes(className as (typeof mappedClasses)[number])) {
      ctx.addIssue({ code: 'custom', path: ['model', 'class_id_mapping'], message: `Missing model class: ${className}.` });
    }
  }

  const thresholdClasses = Object.keys(cfg.model.confidence_thresholds).sort();
  const expectedThresholdClasses = [...mappedClasses].sort();
  if (JSON.stringify(thresholdClasses) !== JSON.stringify(expectedThresholdClasses)) {
    ctx.addIssue({ code: 'custom', path: ['model', 'confidence_thresholds'], message: 'Confidence threshold keys must match the model classes.' });
  }

  if (!mappedClasses.includes('Gradil')) {
    ctx.addIssue({ code: 'custom', path: ['evidence_merging', 'matching_rules', 'Gradil'], message: 'Gradil matching rules require a Gradil model class.' });
  }
});

export function getUncalibratedParameters(contract: InventoryContract): string[] {
  const paths: string[] = [];

  function visit(value: unknown, path: string): void {
    if (value === null) {
      paths.push(path);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([key, item]) => visit(item, path ? `${path}.${key}` : key));
    }
  }

  visit(contract, '');
  return paths;
}

export function getProductionReadinessErrors(contract: InventoryContract): string[] {
  const errors: string[] = [];
  if (contract.validation.require_calibration_before_production && contract.configuration_status !== 'calibrated') {
    errors.push('Configuration requires calibration before production.');
  }
  if (contract.validation.reject_missing_required_parameters) {
    const missing = getUncalibratedParameters(contract);
    if (missing.length > 0) errors.push(`Uncalibrated parameters: ${missing.join(', ')}`);
  }
  if (contract.validation.require_valid_model_asset && !contract.model.asset_path) {
    errors.push('model.asset_path is required.');
  }
  return errors;
}

export function validateWithZod(obj: unknown) {
  const result = InventoryContractSchema.safeParse(obj);
  if (result.success) {
    return { success: true as const, value: result.data as InventoryContract };
  }
  return { success: false as const, errors: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`) };
}

export function basicValidate(obj: unknown): string[] {
  const result = validateWithZod(obj);
  return result.success ? [] : result.errors;
}

export type { NullableNumber };
