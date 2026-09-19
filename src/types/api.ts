export type AdminSession = {
  employee_code: string;
  first_name: string;
  last_name: string;
  role_name: string;
};

export type AdminEmployee = {
  employee_code: string;
  role_id: number;
  role_name: string | null;
  name_prefix_id: number;
  name_prefix: string | null;
  first_name: string;
  last_name: string;
  birth_date: string;
  email: string | null;
  phone_number: string | null;
  address_id: number | null;
  field_id: number | null;
  department_id: number | null;
  division_id: number | null;
  position_id: number | null;
  routes_id: number | null;
  shift_id: number | null;
  is_active: boolean;
  start_date: string | null;
  leave_date: string | null;
  has_face_profile: boolean;
  face_profile_location: string | null;
  profile_image_updated_at: string | null;
};

export type SettingMetadata = {
  value: number;
  default: number;
  min: number;
  max: number;
  step: number;
};

export type ModelSchema = {
  id: number;
  model_key: string;
  model_name: string;
  model_role: string;
  active: boolean;
  settings_values: Record<string, SettingMetadata>;
};

export type ModelGroup = "backend_models" | "frontend_models";
export type FaceMode = "register" | "verify";

export type ModelSettingsDocument = {
  model_schemas: Record<ModelGroup, ModelSchema[]>;
};

export interface FaceVerifyRequest {
  employee_code: string;
  image_data_url: string;
}

export interface EmployeeProfile {
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role_name: string;
  name_prefix: string;
  field_id: number | null;
  field_name: string | null;
  position_id: number | null;
  position_name: string;
  department_id: number | null;
  department_name: string | null;
  division_id: number | null;
  division_name: string | null;
  route_id: number | null;
  route_name: string | null;
  has_face_profile: boolean;
}

export interface FaceEnrollRequest {
  employee_code: string;
  image_data_url: string;
  created_by?: string | null;
}

export interface FaceVerifyResult {
  success: boolean;
  is_match: boolean;
  message: string;
  score?: number;
  threshold?: number;
}

export type FrontendModel = {
  model_key: string;
  active: boolean;
  model_role: string;
  settings_values: Record<string, { value: number }>;
};
