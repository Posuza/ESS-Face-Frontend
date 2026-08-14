export type JobStatus =
  | "NEW"
  | "ASSIGNED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "COMPLETED"
  | "CLOSED"
  | "REJECTED";

export type JobPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type JobAction =
  | "ASSIGN"
  | "REASSIGN"
  | "ACCEPT"
  | "REJECT"
  | "START"
  | "HOLD"
  | "RESUME"
  | "COMPLETE"
  | "CLOSE"
  | "REOPEN";

export interface Job {
  id: number;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  workflow_status: JobStatus;
  priority: JobPriority;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateJobInput {
  title: string;
  description?: string;
  assigned_to?: string;
  priority: JobPriority;
  due_date?: string;
}

export interface JobEvent {
  type: "connected" | "job.created" | "job.updated" | "job.removed";
  job?: Job;
  job_id?: number;
}
