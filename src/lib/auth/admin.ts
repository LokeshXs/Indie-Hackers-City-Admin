import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isAdminClientConfigured } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AdminIdentity = { user: User; email: string };

export type AdminGate =
  | { status: "ok"; identity: AdminIdentity }
  | { status: "unconfigured"; detail: string }
  | { status: "signed-out" }
  | { status: "denied"; email: string | null };

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** The allow-list, parsed fresh on every call so a deploy-time env change needs no warm restart.
 * An unset or blank ADMIN_EMAILS yields an empty set, which denies everyone. */
export function adminEmailAllowlist(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map(normalizeEmail)
      .filter((entry) => entry.includes("@")),
  );
}

/** The address Google itself vouches for, or null.
 *
 * Reading `user.email` alone would not be enough: Supabase Auth also accepts email/password
 * sign-ups, so anyone who knows an admin's address could register it and inherit the console.
 * Requiring a Google identity with `email_verified` means the address on the allow-list has to have
 * been proven to Google, not merely typed into this app. */
function verifiedGoogleEmail(user: User): string | null {
  const identities = user.identities ?? [];

  for (const identity of identities) {
    if (identity.provider !== "google") continue;
    const data = (identity.identity_data ?? {}) as Record<string, unknown>;
    if (data.email_verified === false) continue;
    const email = typeof data.email === "string" ? data.email : user.email;
    if (typeof email === "string" && email.includes("@")) return normalizeEmail(email);
  }

  // Some Supabase responses omit the identities array. Fall back to the provider recorded on the
  // user, which is set by Auth rather than by the account holder, and still refuse anything that
  // did not come from Google.
  if (identities.length === 0
    && user.app_metadata?.provider === "google"
    && user.user_metadata?.email_verified !== false
    && typeof user.email === "string"
    && user.email.includes("@")
  ) {
    return normalizeEmail(user.email);
  }

  return null;
}

/** Answers "may this request see the console", with a reason when the answer is no, so the layout
 * can render a setup screen, a sign-in screen or a refusal rather than a blank redirect loop. */
export async function readAdminGate(): Promise<AdminGate> {
  if (!isSupabaseConfigured()) {
    return {
      status: "unconfigured",
      detail: "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set.",
    };
  }
  if (!isAdminClientConfigured()) {
    return { status: "unconfigured", detail: "SUPABASE_SECRET_KEY is not set." };
  }

  const allowlist = adminEmailAllowlist();
  if (allowlist.size === 0) {
    return { status: "unconfigured", detail: "ADMIN_EMAILS is empty, so no account can sign in." };
  }

  const supabase = await getSupabaseServerClient();
  // getUser, not getSession: this re-verifies the JWT with Supabase rather than trusting a cookie
  // the browser handed us.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "signed-out" };

  const email = verifiedGoogleEmail(user);
  if (!email || !allowlist.has(email)) {
    return { status: "denied", email: email ?? user.email ?? null };
  }

  return { status: "ok", identity: { user, email } };
}

/** The gate for anything that acts rather than renders. Every server action calls this first, so a
 * privileged write is refused even if a page somehow rendered without the layout's check. */
export async function requireAdmin(): Promise<AdminIdentity> {
  const gate = await readAdminGate();
  if (gate.status === "ok") return gate.identity;
  if (gate.status === "signed-out") redirect("/login");
  if (gate.status === "denied") redirect("/denied");
  throw new Error(`Admin console is not configured: ${gate.detail}`);
}
