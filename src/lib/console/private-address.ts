import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** Address ranges a server must never reach when fetching a URL somebody else supplied.
 *
 * 169.254.169.254 is the one that matters most: it is the cloud metadata endpoint, and reaching it
 * hands over instance credentials. The rest close off the private network the server sits in.
 *
 * Kept free of `server-only` and of any I/O beyond DNS so it can be tested directly -- a guard
 * nobody can exercise is a guard nobody can trust. */
export function isBlockedIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;              // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0) return true;                // IETF protocol assignments
  if (a === 100 && b >= 64 && b <= 127) return true;    // carrier-grade NAT
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true;                            // multicast and reserved
  return false;
}

export function isBlockedIpv6(address: string): boolean {
  const value = address.toLowerCase().replace(/%.*$/, "");
  if (value === "::" || value === "::1") return true;
  if (/^f[cd]/.test(value)) return true;                // unique local
  if (/^fe[89ab]/.test(value)) return true;             // link-local
  // IPv4-mapped addresses smuggle the v4 ranges through a v6 literal.
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]);
  return false;
}

export function isBlockedAddress(address: string, family: number): boolean {
  return family === 6 ? isBlockedIpv6(address) : isBlockedIpv4(address);
}

export type UrlCheck = { url: URL } | { reason: string };

/** Refuses anything that is not a public http(s) address.
 *
 * Every A and AAAA record has to be public, not just the first: a host that resolves to one public
 * and one private address would otherwise be reachable on a retry.
 *
 * Residual risk, stated rather than hidden: this resolves and then lets fetch resolve again, so a
 * DNS entry with a very short TTL could answer differently the second time. Closing that means
 * pinning the connection to the address checked here. It is left open because the only caller is an
 * allow-listed admin, which makes the attack require an admin to be the attacker. */
export async function assertPublicUrl(raw: string): Promise<UrlCheck> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { reason: "That is not a valid URL." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { reason: "Only http and https addresses can be checked." };
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const literal = isIP(host);
  if (literal) {
    if (isBlockedAddress(host, literal)) return { reason: "That address is not reachable." };
    return { url };
  }

  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    return { reason: "That hostname does not resolve." };
  }
  if (addresses.length === 0) return { reason: "That hostname does not resolve." };
  if (addresses.some((entry) => isBlockedAddress(entry.address, entry.family))) {
    return { reason: "That address is not reachable." };
  }

  return { url };
}
