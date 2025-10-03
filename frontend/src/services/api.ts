// src/services/api.ts
const BASE_URL =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/+$/, '') || '';

export async function postJSON<T>(path: string, body: unknown): Promise<T> {
  if (!BASE_URL) throw new Error('VITE_API_URL is not set');
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    mode: 'cors',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${txt || 'no body'}`);
  }
  return res.json();
}
