import { DeviceStatusSchema, LoginResponseSchema, type DeviceStatus } from "./schemas";

/** A device is stale when last_seen is strictly older than this. */
export const STALE_AFTER_MS = 15 * 60 * 1000;

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export interface ClientOptions {
  baseUrl: string;
  /** Injected so tests can stub the network. Defaults to global fetch. */
  fetchFn?: FetchFn;
}

export type ApiErrorKind =
  | "bad_request"
  | "unauthorized"
  | "not_found"
  | "server_error"
  | "unexpected_status"
  | "network_error"
  | "malformed_response";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }
}

export interface DeviceStatusResult extends DeviceStatus {
  isStale: boolean;
}

async function request(opts: ClientOptions, path: string, init: RequestInit): Promise<Response> {
  const fetchFn: FetchFn = opts.fetchFn ?? fetch;
  const url = `${opts.baseUrl.replace(/\/+$/, "")}${path}`;
  try {
    return await fetchFn(url, init);
  } catch {
    throw new ApiError("network_error", "Network request failed");
  }
}

function assertOk(res: Response): void {
  if (res.ok) return;
  const { status } = res;
  if (status === 400) throw new ApiError("bad_request", "Bad request", status);
  if (status === 401) throw new ApiError("unauthorized", "Missing, invalid or expired credentials", status);
  if (status === 404) throw new ApiError("not_found", "Resource not found", status);
  if (status >= 500) throw new ApiError("server_error", "Server error", status);
  throw new ApiError("unexpected_status", `Unexpected status ${status}`, status);
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    throw new ApiError("malformed_response", "Response body is not valid JSON", res.status);
  }
}

/** POST /login -> auth token */
export async function login(
  opts: ClientOptions,
  creds: { username: string; password: string },
): Promise<string> {
  const res = await request(opts, "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creds),
  });
  assertOk(res);

  const parsed = LoginResponseSchema.safeParse(await readJson(res));
  if (!parsed.success) {
    throw new ApiError("malformed_response", "Login response failed validation", res.status);
  }
  return parsed.data.token;
}

/** GET /device/{id}/status, plus a derived isStale flag. `now` is injectable for determinism. */
export async function getDeviceStatus(
  opts: ClientOptions,
  deviceId: string,
  token: string,
  now: Date = new Date(),
): Promise<DeviceStatusResult> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await request(opts, `/device/${encodeURIComponent(deviceId)}/status`, {
    method: "GET",
    headers,
  });
  assertOk(res);

  const parsed = DeviceStatusSchema.safeParse(await readJson(res));
  if (!parsed.success) {
    throw new ApiError("malformed_response", "Status response failed validation", res.status);
  }

  const ageMs = now.getTime() - Date.parse(parsed.data.last_seen);
  return { ...parsed.data, isStale: ageMs > STALE_AFTER_MS };
}