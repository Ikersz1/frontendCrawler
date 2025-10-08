// services/api.ts
const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function withTimeout<T>(p: Promise<T>, ms = 60000) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }).catch(e => { clearTimeout(t); reject(e); });
  });
}

export async function getJSON<T>(path: string): Promise<T> {
  if (!BASE_URL) throw new Error('VITE_API_URL is not set');
  const url = `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
  const resp = await withTimeout(fetch(url, { method: 'GET', mode: 'cors' }));
  const text = await resp.text();
  let data: any;
  try { data = text ? JSON.parse(text) : undefined; } catch {}
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText} – ${text || '(empty)'}`);
  return data as T;
}

export async function postJSON<T>(path: string, body: any): Promise<T> {
  if (!BASE_URL) throw new Error('VITE_API_URL is not set');
  const url = `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;

  // retry sencillo por cold start de Render
  let lastErr: any;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const resp = await withTimeout(fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        body: JSON.stringify(body),
      }), attempt === 1 ? 65000 : 90000);

      const text = await resp.text();
      let data: any;
      try { data = text ? JSON.parse(text) : undefined; } catch {}

      if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText} – ${text || '(empty)'}`);
      return data as T;
    } catch (e) {
      lastErr = e;
      // pequeña espera y reintento (Render free puede tardar en “despertar”)
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  throw lastErr || new Error('Load failed');
}
