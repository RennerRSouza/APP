export type NullableNumber = number | null;
export type InventoryClass =
  | 'Black-Fold-Table'
  | 'Brown-Fold-Table'
  | 'Gradil'
  | 'table_joint';

export interface Execution {
  mode: 'offline';
  input_type: 'single_photo';
  tracking_enabled: false;
  network_required: false;
}

export interface ModelConfig {
  runtime: 'tflite';
  source_model: string;
  source_version: number;
  asset_path: string | null;
  input_specification: string;
  output_decoder: string;
  class_id_mapping: Record<string, InventoryClass>;
  confidence_thresholds: Record<InventoryClass, NullableNumber>;
}

export interface ClassesConfig {
  table_objects: InventoryClass[];
  primary_counting_evidence: InventoryClass;
  direct_count_objects: InventoryClass[];
}

export interface CoordinatesConfig {
  reference: string;
  normalized_range: [number, number];
  detection_anchor: string;
  preserve_crop_to_original_transform: boolean;
  crop_edge_is_original_image_edge: boolean;
}

export interface RowDetection {
  method: string;
  apply_to_classes: InventoryClass[];
  separate_axis_per_row: boolean;
  longitudinal_axis: string;
  transverse_axis: string;
  orientation_tolerance_degrees: NullableNumber;
  minimum_supporting_detections: NullableNumber;
  maximum_longitudinal_gap_in_local_row_widths: NullableNumber;
  on_insufficient_evidence: string;
}

export interface RowRefinement {
  enabled: boolean;
  operation: string;
  crop_margin_in_local_row_widths: NullableNumber;
  maximum_additional_inference_passes_per_row: number;
  preserve_aspect_ratio: boolean;
  preserve_original_image_boundaries: boolean;
}

export interface EvidenceMatchingRule {
  method: string;
  maximum_center_distance_in_joint_sizes?: NullableNumber;
  minimum_iou?: NullableNumber;
  maximum_center_distance_in_object_sizes?: NullableNumber;
}

export interface EvidenceMerging {
  merge_full_photo_and_crop_detections: boolean;
  matching_space: string;
  same_class_required: boolean;
  retain_detection_provenance: boolean;
  matching_rules: {
    table_joint: EvidenceMatchingRule;
    table_objects: EvidenceMatchingRule;
    Gradil: EvidenceMatchingRule;
  };
}

export interface JointPairing {
  class_name: InventoryClass;
  pair_size: number;
  tables_per_pair: number;
  method: string;
  geometry: {
    same_longitudinal_position_required: boolean;
    transverse_separation_required: boolean;
    perspective_aware: boolean;
    maximum_longitudinal_offset_in_local_row_widths: NullableNumber;
    minimum_transverse_separation_in_local_row_widths: NullableNumber;
    maximum_transverse_separation_in_local_row_widths: NullableNumber;
  };
  constraints: {
    same_row_required: boolean;
    each_joint_used_at_most_once: boolean;
    reject_ambiguous_matches: boolean;
    minimum_match_score_margin: NullableNumber;
  };
}

export interface PartialTables {
  enabled: boolean;
  tables_per_supported_single_joint: number;
  requirements: {
    joint_is_unpaired: boolean;
    row_membership_is_supported: boolean;
    table_truncation_at_original_boundary_is_supported: boolean;
  };
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

export interface TableCounting {
  unit: 'table';
  count_unique_table_hypotheses: boolean;
  include_valid_joint_pairs: boolean;
  include_supported_boundary_partial_tables: boolean;
  infer_tables_from_empty_spacing: boolean;
  fractional_table_counts: boolean;
  uncertain_candidates_in_identified_total: boolean;
  missing_evidence_result: 'inconclusive';
}

export interface DirectObjectCounting {
  enabled: boolean;
  unit: InventoryClass;
  method: string;
  objects_per_detection: number;
  require_duplicate_reconciliation: boolean;
  require_table_joints: boolean;
  require_row_membership: boolean;
  apply_table_pairing_rules: boolean;
  infer_objects_from_empty_spacing: boolean;
  ambiguous_duplicate_policy: string;
  partial_object_policy: string;
  uncertain_candidates_in_identified_total: boolean;
  missing_evidence_result: 'inconclusive';
}

export interface CountingConfig {
  tables: TableCounting;
  direct_objects: {Gradil: DirectObjectCounting};
  aggregation: {
    keep_category_counts_separate: boolean;
    include_combined_item_total: boolean;
    count_evidence_as_inventory_items: boolean;
  };
}

export interface OutputConfig {
  include_total_identified_by_category: boolean;
  include_table_counts_by_row: boolean;
  include_table_counts_by_type: boolean;
  include_unknown_table_type_count: boolean;
  include_gradil_count: boolean;
  include_uncertain_candidates: boolean;
  include_evidence_per_item: boolean;
  display_boxes: boolean;
  optional_debug_geometry: boolean;
  claim_complete_inventory: boolean;
}

export interface ValidationConfig {
  require_calibration_before_production: boolean;
  reject_missing_required_parameters: boolean;
  require_valid_model_asset: boolean;
  require_matching_class_metadata: boolean;
  require_model_version_match: boolean;
  require_all_enabled_classes_in_model: boolean;
}

export interface InventoryContract {
  schema_version: '2.0.0';
  id: string;
  configuration_status: 'requires_calibration' | 'calibrated';
  execution: Execution;
  model: ModelConfig;
  classes: ClassesConfig;
  coordinates: CoordinatesConfig;
  pipeline: string[];
  row_detection: RowDetection;
  row_refinement: RowRefinement;
  evidence_merging: EvidenceMerging;
  joint_pairing: JointPairing;
  partial_tables: PartialTables;
  table_association: TableAssociation;
  counting: CountingConfig;
  output: OutputConfig;
  validation: ValidationConfig;
}

export default InventoryContract;
