/** Normalize an Instagram @handle or URL to a full https://instagram.com/... link. */
export function normalizeInstagram(raw: string | null | undefined): string {
  const t = (raw || "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      if (!/instagram\.com$/i.test(u.hostname.replace(/^www\./, ""))) return t;
      return `https://instagram.com${u.pathname.replace(/\/+$/, "") || ""}`;
    } catch {
      return t;
    }
  }
  let handle = t.replace(/^@/, "");
  handle = handle.replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "");
  handle = handle.split(/[/?#]/)[0] || "";
  handle = handle.replace(/[^a-zA-Z0-9._]/g, "");
  if (!handle) return "";
  return `https://instagram.com/${handle}`;
}

export function instagramHref(raw: string | null | undefined): string | null {
  const url = normalizeInstagram(raw);
  return url || null;
}
