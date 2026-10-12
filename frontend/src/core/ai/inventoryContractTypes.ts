// Tipagens geradas a partir do contrato JSON de inventário de mesas
export type NullableNumber = number | null;

export interface Execution {
  mode: 'offline' | 'online' | string;
  input_type: 'single_photo' | 'batch' | string;
  tracking_enabled: boolean;
  network_required: boolean;
}

export interface ModelConfig {
  runtime: string;
  source_model: string;
  source_version: number;
  asset_path: string | null;
  input_specification: string;
  output_decoder: string;
  class_id_mapping: string;
  confidence_thresholds: Record<string, NullableNumber>;
}

export interface AlternativeEvidence {
  class_name: string | null;
  enabled: boolean;
  requires_validated_model: boolean;
}

export interface ClassesConfig {
  table_objects: string[];
  primary_counting_evidence: string;
  alternative_evidence: AlternativeEvidence;
}

export interface CoordinatesConfig {
  reference: string;
  normalized_range: [number, number];
  detection_anchor: string;
  preserve_crop_to_original_transform: boolean;
  crop_edge_is_original_image_edge: boolean;
}

export interface JointPairingGeometry {
  same_longitudinal_position_required: boolean;
  transverse_separation_required: boolean;
  perspective_aware: boolean;
  maximum_longitudinal_offset_in_local_row_widths: NullableNumber;
  minimum_transverse_separation_in_local_row_widths: NullableNumber;
  maximum_transverse_separation_in_local_row_widths: NullableNumber;
}

export interface JointPairingConstraints {
  same_row_required: boolean;
  each_joint_used_at_most_once: boolean;
  reject_ambiguous_matches: boolean;
  minimum_match_score_margin: NullableNumber;
}

export interface JointPairing {
  class_name: string;
  pair_size: number;
  tables_per_pair: number;
  method: string;
  geometry: JointPairingGeometry;
  constraints: JointPairingConstraints;
}

export interface PartialTables {
  enabled: boolean;
  tables_per_supported_single_joint: number;
  requirements: Record<string, boolean>;
  original_boundary_margin_normalized: NullableNumber;
  truncation_evidence_method: string | null;
  unpaired_joint_alone_is_sufficient: boolean;
  interior_unpaired_joint_policy: string;
}

export interface TableAssociation {
  associate_whole_table_detections_with_joint_hypotheses: boolean;
  count_associated_evidence_once: boolean;
  whole_table_without_joint_policy: string;
  type_assignment: string;
  type_without_supporting_detection: string;
  conflicting_type_policy: string;
}

export interface Counting {
  unit: string;
  count_unique_table_hypotheses: boolean;
  include_valid_joint_pairs: boolean;
  include_supported_boundary_partial_tables: boolean;
  infer_tables_from_empty_spacing: boolean;
  fractional_table_counts: boolean;
  uncertain_candidates_in_identified_total: boolean;
  missing_evidence_result: string;
}

export interface OutputConfig {
  include_total_identified: boolean;
  include_counts_by_row: boolean;
  include_counts_by_type: boolean;
  include_unknown_type_count: boolean;
  include_uncertain_candidates: boolean;
  include_evidence_per_table: boolean;
  display_boxes: boolean;
  optional_debug_geometry: boolean;
  claim_complete_inventory: boolean;
}

export interface ValidationConfig {
  require_calibration_before_production: boolean;
  reject_missing_required_parameters: boolean;
  require_valid_model_asset: boolean;
  require_matching_class_metadata: boolean;
}

export interface InventoryContract {
  schema_version: string;
  id: string;
  configuration_status: string;
  execution: Execution;
  model: ModelConfig;
  classes: ClassesConfig;
  coordinates: CoordinatesConfig;
  pipeline: string[];
  row_detection?: Record<string, any>;
  row_refinement?: Record<string, any>;
  evidence_merging?: Record<string, any>;
  joint_pairing?: JointPairing;
  partial_tables?: PartialTables;
  table_association?: TableAssociation;
  counting?: Counting;
  output?: OutputConfig;
  validation: ValidationConfig;
}

export default InventoryContract;
