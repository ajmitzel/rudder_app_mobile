import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

export class ApiAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiAuthError';
  }
}

export async function getToken(): Promise<string | null> {
  try {
    const available = await SecureStore.isAvailableAsync();
    if (available) {
      return SecureStore.getItemAsync(TOKEN_KEY);
    }
  } catch {}
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export async function setToken(token: string): Promise<void> {
  try {
    const available = await SecureStore.isAvailableAsync();
    if (available) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      return;
    }
  } catch {}
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

export async function clearToken(): Promise<void> {
  try {
    const available = await SecureStore.isAvailableAsync();
    if (available) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      return;
    }
  } catch {}
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('Missing EXPO_PUBLIC_API_BASE_URL');
  }
  const token = await getToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });
  if (res.status === 401) {
    let detail = 'Unauthorized';
    try {
      const body = await res.clone().json();
      detail = body?.detail || detail;
    } catch {}
    await clearToken();
    throw new ApiAuthError(detail);
  }
  return res;
}
