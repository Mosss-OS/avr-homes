/**
 * HTTP API client with automatic auth token injection, JSON serialisation,
 * and typed error handling.
 *
 * @module api-client
 */

/** Base URL for the REST API — falls back from Vite env to a production URL. */
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://api.avrusthomes.com" : "http://localhost:8000");

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
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),
};
