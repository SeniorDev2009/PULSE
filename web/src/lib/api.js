const DEFAULT_BASE = "http://localhost:4000";
const BASE =
  typeof window !== "undefined"
    ? import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:4000`
    : DEFAULT_BASE;

export async function api(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "REQUEST_FAILED");
  return data;
}

export async function uploadImage(file, token) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${BASE}/api/posts/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
    body: fd
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "UPLOAD_FAILED");
  return data;
}

export function absoluteUrl(maybeRelative) {
  if (!maybeRelative) return "";
  if (maybeRelative.startsWith("http")) return maybeRelative;
  return `${BASE}${maybeRelative}`;
}
