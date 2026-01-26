// DEV: default localhost
// PROD (Vercel): VITE_API_URL ni qo'yasiz, masalan: https://your-backend.onrender.com
const BASE = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");

export async function api(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    // cookie ishlatmasangiz ham qolsin — zarar qilmaydi
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined
  });

  // 204 yoki bo'sh body bo'lsa ham yiqilmasin
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return {}; } })() : {};

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

  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return {}; } })() : {};

  if (!res.ok) throw new Error(data?.error || "UPLOAD_FAILED");
  return data;
}

export function absoluteUrl(maybeRelative) {
  if (!maybeRelative) return "";
  if (maybeRelative.startsWith("http://") || maybeRelative.startsWith("https://")) return maybeRelative;
  return `${BASE}${maybeRelative}`;
}
