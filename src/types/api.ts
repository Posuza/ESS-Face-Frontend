export type AdminSession = {
  employee_code: string;
  first_name: string;
  last_name: string;
  role_name: string;
};

export type ClientApplication = {
  app_registration_id: number;
  app_name: string;
  public_key: string;
  allowed_callback_origin: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type PresenceSummary = {
  connections: number;
  applications: number;
  registered_applications: number;
  active_applications: number;
  registered_employees: number;
  employees: number;
  devices: number;
  clients: number;
};

export type PresenceApplication = {
  app_name: string;
  public_key: string;
  is_active: boolean;
  connections: number;
  employees: number;
  devices: number;
  clients: number;
};

export type PresenceConnection = {
  connection_id: string;
  app_name: string;
  public_key: string;
  employee_id: string;
  employee_name: string;
  device_id: string;
  latitude: number | null;
  longitude: number | null;
  client_ip: string;
  user_agent: string;
  connected_at: string;
  last_seen_at: string;
};

export type PresenceSnapshot = {
  generated_at: string;
  monitoring_enabled: boolean;
  summary: PresenceSummary;
  applications: PresenceApplication[];
  connections: PresenceConnection[];
};

export type PresenceSettings = {
  enabled: boolean;
};

export type ClientApplicationCreate = Pick<
  ClientApplication,
  "app_name" | "allowed_callback_origin"
> & {
  public_key?: string;
  private_key?: string;
};

export type ClientApplicationUpdate = Partial<
  Pick<ClientApplication, "app_name" | "allowed_callback_origin" | "is_active">
> & {
  public_key?: string;
  private_key?: string;
};

export type BlockedClientIp = {
  ip_address: string;
  failure_count: number;
  window_started_at: string;
  blocked_until: string | null;
  reason: string | null;
  updated_at: string;
  is_blocked: boolean;
  retry_after_seconds: number;
};

export type ClientIpBlockCreate = {
  ip_address: string;
  duration_minutes: number;
  reason: string;
};

export type DirectoryEmployee = {
  employee_code: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  has_face_profile: boolean;
  profile_image_updated_at: string | null;
};

export type EmployeeSummary = {
  total: number;
  registered: number;
  missing: number;
  excluded: number;
};

export type AdminEmployee = DirectoryEmployee & {
  employee_code: string;
  role_id: number;
  role_name: string | null;
  name_prefix_id: number;
  name_prefix: string | null;
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
  start_date: string | null;
  leave_date: string | null;
  face_profile_location: string | null;
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
