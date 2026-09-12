import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

/** Next 16 renamed `middleware` to `proxy`. Its only job here is keeping the admin's Supabase
 * session fresh; authorisation happens in the console layout and again in every server action,
 * because a proxy cannot safely be the only gate. */
export function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
