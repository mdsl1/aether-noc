import type {
  ForceCheckResponse,
  IslandsResponse,
  LoginRequest,
  LoginResponse,
  TotemLogsResponse,
} from '../types/aether';

const rawApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      message?: string | string[];
      error?: string;
    };
    if (Array.isArray(body.message)) {
      return body.message.join(', ');
    }
    if (typeof body.message === 'string' && body.message.trim().length > 0) {
      return body.message;
    }
    if (typeof body.error === 'string' && body.error.trim().length > 0) {
      return body.error;
    }
  } catch {
    // Fallback to HTTP status text when response is not JSON
  }
  return response.statusText || `HTTP ${response.status}`;
}

export async function loginRequest(
  credentials: LoginRequest,
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as LoginResponse;
}

export async function fetchIslands(
  token: string,
  signal?: AbortSignal,
): Promise<IslandsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/islands`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as IslandsResponse;
}

export async function fetchTotemLogs(
  token: string,
  totemId: string,
  page = 1,
  limit = 20,
  signal?: AbortSignal,
): Promise<TotemLogsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const encodedId = encodeURIComponent(totemId);
  const response = await fetch(
    `${API_BASE_URL}/api/totems/${encodedId}/logs?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    },
  );

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as TotemLogsResponse;
}

export async function triggerForceCheck(
  token: string,
  totemId: string,
): Promise<ForceCheckResponse> {
  const encodedId = encodeURIComponent(totemId);
  const response = await fetch(
    `${API_BASE_URL}/api/totems/${encodedId}/check`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as ForceCheckResponse;
}
