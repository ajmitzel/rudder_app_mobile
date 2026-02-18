import { apiFetch, setToken } from './api';

export type LoginResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    name?: string | null;
    company_id?: string | null;
    role?: string | null;
  };
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Login failed');
  }
  const data = (await res.json()) as LoginResponse;
  await setToken(data.access_token);
  return data;
}
