/**
 * HTTP API client with automatic auth token injection, JSON serialisation,
 * and typed error handling.
 *
 * The API is served by the same Next.js app under `/api`, so the base URL
 * is empty (same origin) unless overridden via NEXT_PUBLIC_API_URL.
 *
 * @module api-client
 */

/** Base URL for the REST API — same origin by default. */
export const API_URL =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : "";

/** Generic envelope returned by the API for every response. */
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * Core request helper — builds headers, injects the auth token if available,
 * serialises JSON bodies (but passes FormData through), and throws an
 * `ApiError` on non-OK responses.
 *
 * @typeParam T - The expected shape of `response.data`.
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${endpoint}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(data.message || "Request failed", res.status, data.errors);
  }

  return data;
}

/**
 * Typed error for API failures, exposing the HTTP status and optional
 * per-field validation errors.
 */
export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

/**
 * Convenience object exposing `get`, `post`, `put`, and `delete` HTTP
 * methods with automatic typing.
 */
export const api = {
  get: <T>(endpoint: string, opts?: { headers?: Record<string, string> }) =>
    request<T>(endpoint, { headers: opts?.headers }),
  post: <T>(endpoint: string, body?: unknown, opts?: { headers?: Record<string, string> }) =>
    request<T>(endpoint, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: opts?.headers,
    }),
  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),
};
