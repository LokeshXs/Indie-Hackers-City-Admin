const FALLBACK_PATH = "/";

function hasUnsafePrefix(value: string): boolean {
  return !value.startsWith("/") || value.startsWith("//") || value.includes("\\");
}

/** Reduces a caller-supplied `next` value to a path inside this app, or to "/". Copied from the
 * city app deliberately: an open redirect on the OAuth callback is worth the same amount of
 * duplication here as it is there. */
export function safeInternalPath(value: string | null | undefined): string {
  if (!value || hasUnsafePrefix(value)) return FALLBACK_PATH;

  let decoded = value;
  try {
    // Decode twice so encoded protocol-relative and backslash variants cannot become
    // external-looking paths after another redirect layer decodes them.
    for (let pass = 0; pass < 2; pass += 1) decoded = decodeURIComponent(decoded);
  } catch {
    return FALLBACK_PATH;
  }
  if (hasUnsafePrefix(decoded)) return FALLBACK_PATH;

  try {
    const base = new URL("https://indie-hackers-city-admin.invalid");
    const resolved = new URL(value, base);
    if (resolved.origin !== base.origin) return FALLBACK_PATH;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return FALLBACK_PATH;
  }
}
