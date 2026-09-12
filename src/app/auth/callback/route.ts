import { NextResponse, type NextRequest } from "next/server";
import { safeInternalPath } from "@/lib/auth/safe-redirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function withAuthError(path: string): string {
  const url = new URL(path, "https://indie-hackers-city-admin.invalid");
  url.searchParams.set("authError", "oauth");
  return `${url.pathname}${url.search}${url.hash}`;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeInternalPath(request.nextUrl.searchParams.get("next"));

  if (code && isSupabaseConfigured()) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // A successful exchange only proves the person has a Google account. Whether that account may
    // see anything is decided by the console layout, which is where the allow-list lives.
    if (!error) return NextResponse.redirect(new URL(next, request.nextUrl.origin));
  }

  return NextResponse.redirect(new URL(withAuthError("/login"), request.nextUrl.origin));
}
