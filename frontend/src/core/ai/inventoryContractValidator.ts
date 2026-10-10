import { z } from 'zod';
import type { NullableNumber } from './inventoryContractTypes';

// Zod schema (recommended). Note: project may need `zod` installed to use this at runtime.
const NullableNumberSchema = z.number().nullable();

const ExecutionSchema = z.object({
  mode: z.string(),
  input_type: z.string(),
  tracking_enabled: z.boolean(),
  network_required: z.boolean(),
});

const ModelSchema = z.object({
  runtime: z.string(),
  source_model: z.string(),
  source_version: z.number(),
  asset_path: z.string().nullable(),
  input_specification: z.string(),
  output_decoder: z.string(),
  class_id_mapping: z.string(),
  confidence_thresholds: z.record(NullableNumberSchema),
});

const AlternativeEvidenceSchema = z.object({
  class_name: z.string().nullable(),
  enabled: z.boolean(),
  requires_validated_model: z.boolean(),
});

const ClassesSchema = z.object({
  table_objects: z.array(z.string()),
  primary_counting_evidence: z.string(),
  alternative_evidence: AlternativeEvidenceSchema,
});

const CoordinatesSchema = z.object({
  reference: z.string(),
  normalized_range: z.tuple([z.number(), z.number()]),
  detection_anchor: z.string(),
  preserve_crop_to_original_transform: z.boolean(),
  crop_edge_is_original_image_edge: z.boolean(),
});

const JointPairingSchema = z.object({
  class_name: z.string(),
  pair_size: z.number(),
  tables_per_pair: z.number(),
  method: z.string(),
  geometry: z.record(z.any()),
  constraints: z.record(z.any()),
}).partial();

const PartialTablesSchema = z.object({
  enabled: z.boolean(),
}).partial();

const RootSchema = z.object({
  schema_version: z.string(),
  id: z.string(),
  configuration_status: z.string(),
  execution: ExecutionSchema,
  model: ModelSchema,
  classes: ClassesSchema,
  coordinates: CoordinatesSchema,
  pipeline: z.array(z.string()),
  row_detection: z.any().optional(),
  row_refinement: z.any().optional(),
  evidence_merging: z.any().optional(),
  joint_pairing: JointPairingSchema.optional(),
  partial_tables: PartialTablesSchema.optional(),
  table_association: z.any().optional(),
  counting: z.any().optional(),
  output: z.any().optional(),
  validation: z.object({
    require_calibration_before_production: z.boolean(),
    reject_missing_required_parameters: z.boolean(),
    require_valid_model_asset: z.boolean(),
    require_matching_class_metadata: z.boolean(),
  }),
}).superRefine((cfg, ctx) => {
  // conditional: if alternative_evidence enabled, require class_name
  if (cfg.classes?.alternative_evidence?.enabled && !cfg.classes.alternative_evidence.class_name) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'alternative_evidence.class_name required when enabled' });
  }
  // if require_calibration_before_production is true we surface a warning via issue
  if (cfg.validation?.require_calibration_before_production && cfg.configuration_status === 'production') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'configuration_status is production but calibration is required' });
  }
});

export function validateWithZod(obj: unknown) {
  const res = RootSchema.safeParse(obj);
  if (res.success) return { success: true as const, value: res.data };
  return { success: false as const, errors: res.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
}

// Lightweight runtime checks that avoid adding dependencies. Returns array of error messages (empty => ok).
export function basicValidate(obj: any): string[] {
  const errs: string[] = [];
  if (!obj || typeof obj !== 'object') {
    errs.push('config must be an object');
    return errs;
  }
  if (typeof obj.schema_version !== 'string') errs.push('schema_version must be string');
  if (typeof obj.id !== 'string') errs.push('id must be string');
  if (!obj.classes || !Array.isArray(obj.classes.table_objects)) errs.push('classes.table_objects must be an array of strings');
  else if (obj.classes.table_objects.length === 0) errs.push('classes.table_objects should not be empty');

  if (!obj.model || typeof obj.model !== 'object') errs.push('model section missing');
  else {
    const cts = obj.model.confidence_thresholds || {};
    const tableObjects: string[] = (obj.classes && Array.isArray(obj.classes.table_objects)) ? obj.classes.table_objects : [];
    // Ensure confidence_thresholds keys are subset or superset warning
    const missing = tableObjects.filter((t: string) => !(t in cts));
    if (missing.length > 0) errs.push(`confidence_thresholds missing entries for: ${missing.join(', ')}`);
  }

  if (!Array.isArray(obj.pipeline)) errs.push('pipeline must be an array');

  // conditional alternative evidence
  if (obj.classes && obj.classes.alternative_evidence && obj.classes.alternative_evidence.enabled && !obj.classes.alternative_evidence.class_name) {
    errs.push('classes.alternative_evidence.class_name required when enabled');
  }

  // validation section
  if (!obj.validation || typeof obj.validation !== 'object') errs.push('validation section missing');

  return errs;
}

export type { NullableNumber };
