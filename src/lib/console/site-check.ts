import "server-only";

import { assertPublicUrl } from "./private-address";

export const VERIFICATION_META_NAME = "ihc-verify";

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 6000;
/** The tag belongs in <head>. Reading a quarter of a megabyte finds it on any real page and caps
 * what a hostile server can make us hold in memory. */
const MAX_BYTES = 256 * 1024;

export type SiteCheck =
  | { ok: true; found: boolean; finalUrl: string }
  | { ok: false; reason: string };

async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let text = "";
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    text += decoder.decode(value, { stream: true });
    if (total >= MAX_BYTES) {
      await reader.cancel();
      break;
    }
  }
  return text;
}

function hasVerificationTag(html: string, token: string): boolean {
  // Deliberately loose about attribute order and quoting -- hand-written head tags vary, and the
  // token is the part that has to match exactly.
  const pattern = new RegExp(
    `<meta[^>]*name\\s*=\\s*["']?${VERIFICATION_META_NAME}["']?[^>]*content\\s*=\\s*["']?${token}["']?`,
    "i",
  );
  const reversed = new RegExp(
    `<meta[^>]*content\\s*=\\s*["']?${token}["']?[^>]*name\\s*=\\s*["']?${VERIFICATION_META_NAME}["']?`,
    "i",
  );
  return pattern.test(html) || reversed.test(html);
}

/** Fetches a founder's site and looks for their project's verification tag.
 *
 * Redirects are followed by hand so every hop is re-validated: a public URL that 302s to
 * 169.254.169.254 is the classic way past a check that only looks at the address it was given. */
export async function checkSiteForToken(rawUrl: string, token: string): Promise<SiteCheck> {
  if (!/^[0-9a-f]{32}$/.test(token)) return { ok: false, reason: "That project has no token." };

  let target = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const checked = await assertPublicUrl(target);
    if ("reason" in checked) return { ok: false, reason: checked.reason };

    let response: Response;
    try {
      response = await fetch(checked.url, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept: "text/html", "user-agent": "IndieHackersCity-SiteCheck/1.0" },
        cache: "no-store",
      });
    } catch {
      return { ok: false, reason: "The site could not be reached." };
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return { ok: false, reason: "The site redirected to nowhere." };
      target = new URL(location, checked.url).toString();
      continue;
    }

    if (!response.ok) {
      return { ok: false, reason: `The site answered ${response.status}.` };
    }

    const html = await readCapped(response);
    return { ok: true, found: hasVerificationTag(html, token), finalUrl: checked.url.toString() };
  }

  return { ok: false, reason: "The site redirected too many times." };
}
