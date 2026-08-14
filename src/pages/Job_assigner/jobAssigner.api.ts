import { API_CONFIG, API_URL } from "@/config/api.config";
import type {
  CreateJobInput,
  Job,
  JobAction,
  JobEvent,
} from "./jobAssigner.types";

async function readResponse<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;

  const body = await response.json().catch(() => null);
  const detail = body?.detail;
  throw new Error(
    typeof detail === "string"
      ? detail
      : detail?.message || "ไม่สามารถดำเนินการได้",
  );
}

function request(path: string, init?: RequestInit) {
  return fetch(`${API_URL}/job-assigner${path}`, {
    ...init,
    headers: {
      ...API_CONFIG.headers,
      ...API_CONFIG.getAuthHeader(),
      ...init?.headers,
    },
  });
}

export const jobAssignerApi = {
  async list(): Promise<Job[]> {
    return readResponse<Job[]>(await request("/"));
  },

  async create(payload: CreateJobInput): Promise<Job> {
    return readResponse<Job>(
      await request("/", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          assigned_to: payload.assigned_to || null,
          description: payload.description || null,
          due_date: payload.due_date
            ? new Date(payload.due_date).toISOString()
            : null,
        }),
      }),
    );
  },

  async transition(
    jobId: number,
    action: JobAction,
    assignedTo?: string,
  ): Promise<Job> {
    return readResponse<Job>(
      await request(`/${jobId}/actions`, {
        method: "POST",
        body: JSON.stringify({
          action,
          assigned_to: assignedTo || null,
        }),
      }),
    );
  },
};

function websocketUrl(employeeCode: string): string {
  const apiBase = API_URL.startsWith("http")
    ? API_URL
    : `${window.location.origin}${API_URL.startsWith("/") ? "" : "/"}${API_URL}`;
  const url = new URL(`${apiBase}/job-assigner/ws`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("employee_code", employeeCode);
  return url.toString();
}

export function subscribeToJobUpdates(
  employeeCode: string,
  onEvent: (event: JobEvent) => void,
  onConnectionChange: (connected: boolean) => void,
) {
  let socket: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let stopped = false;

  const connect = () => {
    if (stopped) return;
    socket = new WebSocket(websocketUrl(employeeCode));
    socket.onopen = () => onConnectionChange(true);
    socket.onmessage = (message) => {
      try {
        onEvent(JSON.parse(message.data) as JobEvent);
      } catch {
        // Ignore non-JSON heartbeat responses.
      }
    };
    socket.onerror = () => socket?.close();
    socket.onclose = () => {
      onConnectionChange(false);
      if (!stopped) reconnectTimer = window.setTimeout(connect, 2500);
    };
  };

  connect();
  return () => {
    stopped = true;
    if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
    socket?.close();
  };
}
