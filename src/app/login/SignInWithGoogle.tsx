"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeInternalPath } from "@/lib/auth/safe-redirect";

export function SignInWithGoogle({ next }: { next: string }) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setIsRedirecting(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", safeInternalPath(next));
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.toString() },
      });
      if (signInError) throw signInError;
    } catch {
      setError("Google sign-in could not start. Check the Supabase auth configuration.");
      setIsRedirecting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button className="w-full" disabled={isRedirecting} onClick={handleSignIn}>
        {isRedirecting ? "Opening Google…" : "Continue with Google"}
      </Button>
      {error ? <p className="text-destructive text-sm" role="alert">{error}</p> : null}
    </div>
  );
}
